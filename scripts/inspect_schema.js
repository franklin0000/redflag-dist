
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
    console.log("--- Inspecting Message Schema ---");
    const { data: msgs, error } = await supabase.from('messages').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    if (msgs && msgs.length > 0) {
        console.log(JSON.stringify(msgs[0], null, 2));
    } else {
        console.log("No messages found.");
    }

    console.log("\n--- Inspecting User Schema ---");
    const { data: users } = await supabase.from('users').select('*').limit(1);
    if (users && users.length > 0) {
        console.log(JSON.stringify(users[0], null, 2));
    } else {
        console.log("No users found.");
    }
}

inspect();
