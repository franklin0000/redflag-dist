/**
 * Supabase client — used for Auth and Storage.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rzczjsghbwrdtphgplpt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // HashRouter owns the URL hash; disabling prevents conflicts
    }
});

/**
 * Upload a file to Supabase Storage.
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Path within the bucket
 * @param {File|Blob} file - File to upload
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadToSupabase(bucket, path, file) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(error.message || 'Upload failed');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}
