
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Missing Credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpload() {
    console.log("--- Testing Storage Upload (Media Bucket) ---");

    // Create a dummy file buffer
    const buffer = Buffer.from('Hello Supabase Storage');
    const fileName = `test_upload_${Date.now()}.txt`;

    try {
        // Attempt upload
        const { data, error } = await supabase
            .storage
            .from('media')
            .upload(fileName, buffer, {
                contentType: 'text/plain',
                upsert: true
            });

        if (error) {
            console.error(`❌ Upload Failed: ${error.message}`);
            if (error.message.includes('not found')) {
                console.error("   -> Likely 'media' bucket does not exist.");
            } else if (error.message.includes('row-level security')) {
                console.error("   -> Bucket exists but RLS prevents upload (Auth required?).");
            }
        } else {
            console.log(`✅ Upload Success! Path: ${data.path}`);

            // Clean up (Delete it)
            const { error: delError } = await supabase
                .storage
                .from('media')
                .remove([fileName]);

            if (delError) console.warn("⚠️ Warning: Could not delete test file.");
            else console.log("✅ Cleanup Success (File deleted)");
        }
    } catch (e) {
        console.error(`❌ Exception: ${e.message}`);
    }
}

testUpload();
