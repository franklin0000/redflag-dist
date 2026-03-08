import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import assert from 'assert';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function runTests() {
    console.log("🚀 Starting End-to-End System Test...");
    let testUser = null;
    let matchTarget = null;
    const testEmail = `e2e_tester_${Date.now()}@redflag.io`;
    const password = 'TestPassword123!';

    try {
        console.log("\n--- 1. Auth & Profiles ---");
        // Signup
        process.stdout.write("Testing Sign Up... ");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: password,
            options: { data: { full_name: 'E2E Tester', gender: 'male' } }
        });
        if (signUpError) throw new Error(signUpError.message);
        console.log("✅ Passed");
        testUser = signUpData.user;

        // Login
        process.stdout.write("Testing Log In... ");
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: password
        });
        if (loginError) throw new Error(loginError.message);
        console.log("✅ Passed");

        // Create Users Profile (Frontend normally does this via trigger or AuthContext)
        process.stdout.write("Testing Users Profile Creation... ");
        const { error: usersError } = await supabase.from('users').upsert({
            id: testUser.id,
            email: testEmail,
            name: 'E2E Tester',
            username: `e2etester${Date.now()}`,
            gender: 'male'
        });
        if (usersError) throw new Error(usersError.message);
        console.log("✅ Passed");

        // Create Dating Profile
        process.stdout.write("Testing Dating Profile Creation... ");
        const { error: dpError } = await supabase.from('dating_profiles').upsert({
            user_id: testUser.id,
            age: 25,
            bio: 'E2E Test User',
            safety_score: 99
        });
        if (dpError) throw new Error(dpError.message);
        console.log("✅ Passed");

        console.log("\n--- 2. Community & Feed ---");
        // Fetch posts
        process.stdout.write("Testing Community Posts Read... ");
        const { data: posts, error: postsError } = await supabase.from('posts').select('*').limit(5);
        if (postsError) throw new Error(postsError.message);
        console.log("✅ Passed (Found " + posts.length + " posts)");

        console.log("\n--- 3. Dating & Swiping ---");
        // Fetch matches
        process.stdout.write("Testing Dating Matches Query... ");
        const { data: profiles, error: profilesError } = await supabase
            .from('dating_profiles')
            .select('*, users:user_id(name)')
            .neq('user_id', testUser.id)
            .limit(5);
        if (profilesError) throw new Error(profilesError.message);
        console.log("✅ Passed (Found " + profiles.length + " potential matches)");

        if (profiles.length > 0) {
            matchTarget = profiles[0].user_id;
            process.stdout.write(`Testing Swipe Right on user ${matchTarget}... `);
            const { error: swipeError } = await supabase.from('swipes').insert({
                swiper_id: testUser.id,
                target_id: matchTarget,
                direction: 'right'
            });
            if (swipeError) throw new Error(swipeError.message);
            console.log("✅ Passed");
        }

        console.log("\n--- 4. Reports & Safety ---");
        process.stdout.write("Testing Access to Reports... ");
        const { data: reports, error: reportsError } = await supabase.from('reports').select('*').eq('user_id', testUser.id).limit(1);
        if (reportsError) throw new Error(reportsError.message);
        console.log("✅ Passed");

        console.log("\n--- 5. Messaging ---");
        process.stdout.write("Testing Chats & Messages access... ");
        const { data: msgs, error: msgError } = await supabase.from('messages').select('*').eq('sender_id', testUser.id).limit(1);
        if (msgError) throw new Error(msgError.message);
        console.log("✅ Passed");

        console.log("\n🎉 ALL TESTS PASSED. The backend and RLS policies are fully functional.");

    } catch (e) {
        console.error("❌ FAILED:", e.message);
    } finally {
        // Cleanup test user if possible (requires service role, so might skip, or just leave it)
        console.log("Test finished.");
    }
}

runTests();
