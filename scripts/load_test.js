
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const AGENT_COUNT = 50;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAgent(id) {
    const agentName = `Agent_${id}`;
    const start = Date.now();
    let status = '✅ OK';
    let details = '';

    try {
        // 1. Fetch Matches (Simulating DatingHome)
        const { data: matches, error: matchError } = await supabase
            .from('matches')
            .select('id')
            .limit(5);

        if (matchError) throw matchError;

        // 2. Fetch Posts (Simulating Community)
        const { data: posts, error: postError } = await supabase
            .from('posts')
            .select('id')
            .limit(5);

        if (postError) throw postError;

        details = `Matches: ${matches?.length || 0}, Posts: ${posts?.length || 0}`;

    } catch (err) {
        status = '❌ FAIL';
        details = err.message;
        // Check for specific errors like 429
        if (err.message.includes('429') || (err.status === 429)) {
            status = '⚠️ RATE LIMITED (429)';
        }
    }

    const duration = Date.now() - start;
    return { id: agentName, status, duration, details };
}

async function runLoadTest() {
    console.log(`🚀 Launching ${AGENT_COUNT} concurrent agents...`);
    console.log("---------------------------------------------------");

    const promises = [];
    for (let i = 1; i <= AGENT_COUNT; i++) {
        promises.push(runAgent(i));
    }

    const results = await Promise.all(promises);

    // Summary
    const successCount = results.filter(r => r.status === '✅ OK').length;
    const failCount = results.filter(r => r.status.includes('FAIL')).length;
    const rateLimitCount = results.filter(r => r.status.includes('RATE LIMITED')).length;

    console.table(results);
    console.log("\n---------------------------------------------------");
    console.log(`Load Test Complete`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⚠️ Rate Limited: ${rateLimitCount}`);
    console.log("---------------------------------------------------");
}

runLoadTest();
