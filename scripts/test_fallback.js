import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Logging in as familiafabian@yandex.com...");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'familiafabian@yandex.com',
        password: 'password123'
    });

    if (authErr && !authData?.user) {
        console.error("Auth error:", authErr.message);
        const { error: demoAuthErr, data: demoData } = await supabase.auth.signInWithPassword({
            email: 'sofia_demo@redflag.io',
            password: 'password123'
        });
        if (demoAuthErr) return console.error(demoAuthErr);
        authData.user = demoData.user;
    }

    // Test the exact logic in DatingContext.jsx with 2 uuids
    const swipedIds = [authData.user?.id || '24560b4a-a70e-436f-b25b-5fcbf9a7b21f', '7362c01b-67c4-4bca-ac20-26a2334d0779']; // User self + another uuid

    console.log("Testing fallback query with swipedIds:", swipedIds);
    const { data: fallbackData, error } = await supabase
        .from('dating_profiles')
        .select(`*, users:user_id (name, is_paid)`)
        .limit(50)
        .not('user_id', 'in', `(${swipedIds.length > 0 ? swipedIds.join(',') : '""'})`);

    if (error) {
        console.error("Error with fetch:", error.message, error.details, error.hint);
    } else {
        console.log("Fetched matches:", fallbackData?.length || 0);
    }
}

testFetch();
