
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Missing Supabase Credentials in .env");
    process.exit(1);
}

console.log(`Testing Connection to: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
    console.log("\n--- Verifying Tables ---");
    const tables = ['users', 'matches', 'messages', 'posts', 'reports', 'dating_profiles'];

    for (const table of tables) {
        // We use head:true to just check access/existence without fetching data
        // RLS might block count, so we catch errors
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.log(`❌ Table '${table}': Error - ${error.message} (${error.code})`);
            } else {
                console.log(`✅ Table '${table}': Accessible (Rows: ${count !== null ? count : 'Hidden by RLS'})`);
            }
        } catch (e) {
            console.log(`❌ Table '${table}': Exception - ${e.message}`);
        }
    }

    console.log("\n--- Verifying Storage Buckets ---");
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error(`❌ Storage Error: ${error.message}`);
        } else {
            console.log(`✅ Storage Connected. Found ${buckets.length} buckets.`);
            buckets.forEach(b => console.log(`   - 🪣 ${b.name} (${b.public ? 'Public' : 'Private'})`));

            // Expected buckets
            const expected = ['media', 'chat-attachments', 'avatars'];
            const foundNames = buckets.map(b => b.name);
            const missing = expected.filter(e => !foundNames.includes(e));

            if (missing.length > 0) {
                console.warn(`⚠️ Missing expected buckets: ${missing.join(', ')}`);
            }
        }
    } catch (e) {
        console.error(`❌ Storage Exception: ${e.message}`);
    }
}

verify();
