/**
 * 🔐 ChatService — End-to-End Encrypted Messaging
 * 
 * All messages are encrypted with AES-256-GCM before being stored in Supabase.
 * Even database admins cannot read message content (without the key).
 */

import { supabase } from "./supabase";
import { encryptMessage, decryptMessage } from "./cryptoService";
import { sanitizeMessage } from "../utils/sanitize";

/**
 * Upload a file to chat-attachments bucket
 * @param {File} file 
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export const uploadChatAttachment = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

const TABLE = 'messages';

const ADJECTIVES = ["Silent", "Mystic", "Swift", "Brave", "Calm", "Neon", "Velvet", "Onyx", "Alpha", "Luna"];
const ANIMALS = ["Fox", "Wolf", "Eagle", "Lion", "Tiger", "Ghost", "Lynx", "Raven", "Cobra", "Dragon"];
const EMOJIS = ["🦊", "🐺", "🦅", "🦁", "🐯", "👻", "🐱", "🐦", "🐍", "🐲"];

export const generateNickname = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return { name: `${adj} ${animal} ${num}`, emoji };
};

/**
 * Send a message to a community room or dating match.
 * 
 * @param {string} room - Room ID (community: 'women'/'men', dating: 'userId1_userId2')
 * @param {string} text - Message text
 * @param {string} nickname - Display name
 * @param {string} avatar - Emoji avatar
 * @param {object|string|null} attachment - Attachment data (URL string or {url, type, name} object)
 * @param {string} type - Message type: 'text', 'image', 'video', 'audio', 'document', 'sticker'
 */
export const sendMessage = async (room, text, nickname, avatar, attachment = null, type = 'text') => {
    // 1. Sanitize text
    const cleanText = sanitizeMessage(text || '');

    // 2. Encrypt the message content
    const encryptedPayload = await encryptMessage(cleanText, room);

    // 3. Set 24h expiry for community rooms
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 4. Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // 5. Serialize attachment if it's an object
    const attachmentData = attachment && typeof attachment === 'object'
        ? attachment
        : attachment
            ? { url: attachment, type: type }
            : null;

    // 6. Insert message
    const { error } = await supabase
        .from(TABLE)
        .insert([
            {
                room_id: room,
                sender_id: userId,
                content: encryptedPayload.ciphertext,
                iv: encryptedPayload.iv,
                is_encrypted: true,
                nickname,
                avatar,
                attachment: attachmentData,
                type: type,
                expires_at: expiresAt.toISOString()
            }
        ]);

    if (error) {
        console.error('chatService.sendMessage error:', error);
        throw error;
    }
};

export const subscribeToMessages = (room, callback) => {
    let cachedMessages = [];

    // 1. Initial fetch
    const fetchInitial = async () => {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('room_id', room)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            console.error('chatService.fetchMessages error:', error);
            return;
        }

        if (data) {
            const processed = await processMessages(data, room);
            cachedMessages = processed;
            callback(processed);
        }
    };

    fetchInitial();

    // 2. Realtime subscription — append only the new message, don't re-fetch all
    const channel = supabase
        .channel(`chat:${room}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: TABLE,
                filter: `room_id=eq.${room}`
            },
            async (payload) => {
                const [newMsg] = await processMessages([payload.new], room);
                // Avoid duplicates
                if (!cachedMessages.find(m => m.id === newMsg.id)) {
                    cachedMessages = [...cachedMessages, newMsg];
                    callback(cachedMessages);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Process raw Supabase messages — decrypt and normalize field names.
 * Returns all fields needed by both ChatRoom.jsx and DatingChat.jsx.
 */
const processMessages = async (messages, room) => {
    return Promise.all(
        messages.map(async (msg) => {
            let displayText = msg.content;

            // 🔐 Decrypt if message has E2E metadata
            if (msg.is_encrypted && msg.iv) {
                try {
                    displayText = await decryptMessage(
                        {
                            ciphertext: msg.content,
                            iv: msg.iv,
                            encrypted: true
                        },
                        room
                    );
                } catch (err) {
                    console.warn('Message decryption failed:', err);
                    displayText = msg.content; // Fallback to raw content
                }
            }

            return {
                id: msg.id,
                text: displayText,
                content: displayText,          // Alias for DatingChat sticker detection
                nickname: msg.nickname,
                avatar: msg.avatar,
                attachment: msg.attachment,
                type: msg.type || 'text',
                sender_id: msg.sender_id,      // Needed by DatingChat for isMe check
                user_id: msg.sender_id,        // Alias for backward compatibility
                timestamp: msg.created_at,     // ISO string — used by ChatRoom
                created_at: msg.created_at,    // ISO string — used by DatingChat
            };
        })
    );
};
