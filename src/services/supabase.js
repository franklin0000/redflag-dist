// Point all old shim imports to the real Supabase client
import { supabase as supabaseClient } from '../lib/supabase.js';
export { supabaseClient as supabase };

export async function uploadToSupabase(bucket, path, file) {
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data: publicData } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return publicData.publicUrl;
}
