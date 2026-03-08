
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
    const REAL_USER_ID = '68f5ed77-14d7-451a-8ce2-1c2de3a00d6f'; // Juan
    const DEMO_USER_ID = 'mock-user-123';

    // Sort IDs for room_id to match convention
    const sortedIds = [REAL_USER_ID, DEMO_USER_ID].sort();
    const roomId = `${sortedIds[0]}_${sortedIds[1]}`;
    // Oops, standard convention is often sorting. let's assume simple concat for now or check codebase.
    // Actually, DatingContext.jsx line 254: const matchId = [user.id, targetId].sort().join('_');
    // So YES, sorted.

    console.log(`Creating match for Room ID: ${roomId}`);

    // 1. Insert Match
    const { data: match, error: mErr } = await supabase.from('matches').insert([{
        id: roomId,
        user1_id: sortedIds[0],
        user2_id: sortedIds[1],
        last_message: 'This is a seeded test message',
        last_message_time: new Date().toISOString()
    }]).select();

    if (mErr) {
        console.error("Match Insert Error:", mErr.message);
    } else {
        console.log("✅ Match created:", match);
    }

    // 2. Insert Message
    const { data: msg, error: msgErr } = await supabase.from('messages').insert([{
        room_id: roomId,
        user_id: REAL_USER_ID, // Message from "Juan"
        nickname: 'Juan (Real)',
        content: 'Hello from the database!',
        is_encrypted: false // Testing plaintext fallback
    }]).select();

    if (msgErr) {
        console.error("Message Insert Error:", msgErr.message);
    } else {
        console.log("✅ Message created:", msg);
    }
}

seed();
