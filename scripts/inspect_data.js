
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
    console.log("--- Users ---");
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) console.error(uErr);
    else console.table(users);

    console.log("\n--- Messages ---");
    const { data: msgs, error: mErr } = await supabase.from('messages').select('*').limit(5);
    if (mErr) console.error(mErr);
    else console.table(msgs);

    // If messages exist, let's see which match_id they use
    if (msgs && msgs.length > 0) {
        console.log("\n--- Unique Match IDs in Messages ---");
        const matchIds = [...new Set(msgs.map(m => m.match_id))];
        console.log(matchIds);

        // Check if these matches exist
        const { data: matches } = await supabase.from('matches').select('*').in('id', matchIds);
        console.log("Existing Matches for these IDs:", matches);
    }
}

inspect();
