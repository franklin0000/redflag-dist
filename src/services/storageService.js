/**
 * Storage Service — Uses Supabase Storage for all file uploads.
 * Firebase Storage is NOT used (not activated on the project).
 */
import { uploadToSupabase } from './supabase';

/**
 * Generates a unique filename for uploads
 * @param {string} prefix - Prefix for the filename
 * @param {string} extension - File extension
 * @returns {string} Unique filename
 */
export const generateUniqueFileName = (prefix = 'file', extension = 'bin') => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}.${extension}`;
};

/**
 * Uploads media for a community post (photos, audio, video, documents)
 * @param {File} file - The file to upload
 * @param {string} roomId - The community room ID
 * @returns {Promise<string>} The public URL
 */
export const uploadCommunityMedia = async (file, roomId) => {
    const extension = file.name?.split('.').pop() || 'bin';
    const fileName = generateUniqueFileName('post', extension);
    const path = `community/${roomId}/${fileName}`;
    return uploadToSupabase('media', path, file);
};

/**
 * Uploads user profile media
 * @param {File} file
 * @param {string} userId
 * @param {string} type - 'photos', 'videos', 'voice'
 * @returns {Promise<string>}
 */
export const uploadProfileMedia = async (file, userId, type) => {
    const extension = file.name?.split('.').pop() || 'webm';
    const fileName = generateUniqueFileName(type.slice(0, -1), extension);
    const path = `users/${userId}/${type}/${fileName}`;
    return uploadToSupabase('media', path, file);
};

/**
 * Uploads media for a chat message
 * @param {File} file
 * @param {string} roomId
 * @returns {Promise<string>}
 */
export const uploadChatMedia = async (file, roomId) => {
    const extension = file.name?.split('.').pop() || 'bin';
    const fileName = generateUniqueFileName('chat', extension);
    const path = `chats/${roomId}/${fileName}`;
    return uploadToSupabase('media', path, file);
};

/**
 * Uploads evidence files for reports
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<string>}
 */
export const uploadEvidence = async (file, userId) => {
    const extension = file.name?.split('.').pop() || 'bin';
    const fileName = generateUniqueFileName('evidence', extension);
    const path = `evidence/${userId}/${fileName}`;
    return uploadToSupabase('media', path, file);
};

/**
 * Uploads media for map location flags (photos, audio, doc)
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<string>}
 */
export const uploadFlagMedia = async (file, userId) => {
    const extension = file.name?.split('.').pop() || 'bin';
    const fileName = generateUniqueFileName('flag', extension);
    const path = `flags/${userId}/${fileName}`;
    return uploadToSupabase('media', path, file);
};
