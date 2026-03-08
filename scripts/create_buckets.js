
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Missing Supabase Credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createBuckets() {
    console.log("--- Creating Storage Buckets ---");
    const buckets = ['media', 'chat-attachments', 'avatars'];

    for (const name of buckets) {
        console.log(`Attempting to create bucket: '${name}'...`);
        try {
            const { data, error } = await supabase.storage.createBucket(name, {
                public: true, // We need public buckets for this app's current design
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/*', 'video/*', 'audio/*']
            });

            if (error) {
                console.error(`❌ Failed to create '${name}': ${error.message}`);
            } else {
                console.log(`✅ Bucket '${name}' created successfully.`);
            }
        } catch (e) {
            console.error(`❌ Exception creating '${name}': ${e.message}`);
        }
    }
}

createBuckets();
