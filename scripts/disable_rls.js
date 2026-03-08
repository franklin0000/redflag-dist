import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Need service role key to bypass RLS, anon key won't work
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking if we have service_role privileges...");
    const { data, error } = await supabase.from('dating_profiles').select('*').limit(1);
    console.log(error ? "❌ Error: " + error.message : "✅ Success!");
}
check();
