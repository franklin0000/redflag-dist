
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// We need service role key to bypass RLS for updating another user, 
// OR we just sign in as that user and update if RLS allows self-update (likely not for is_paid).
// Let's assume we need to use the service role key if available, otherwise we might be stuck.
// Checking .env content for service role... actually I can't read .env directly easily without tool.
// I'll try with anon key and login first.

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = 'familiafabian@yandex.com';
    const password = 'Chulo02@';

    console.log(`Logging in as ${email}...`);
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error("Login failed:", loginError);
        process.exit(1);
    }

    console.log("Logged in. UID:", session.user.id);

    // Try to update self (if RLS allows, which it usually shouldn't for is_paid, but worth a shot for testing)
    const { error: updateError } = await supabase
        .from('users')
        .update({ is_paid: true })
        .eq('id', session.user.id);

    if (updateError) {
        console.error("Update failed (likely RLS):", updateError);
        // If this fails, I'll need to use the service_role key if I can find it, 
        // or guide the user to do it manually. 
        // BUT, wait, I can use the triggers/functions if they exist.
        // Or I can try to insert into a 'subscriptions' table if that's how it works.
        // Looking at AuthContext, it checks 'users.is_paid'.
    } else {
        console.log("Successfully marked user as paid!");
    }
}

main();
