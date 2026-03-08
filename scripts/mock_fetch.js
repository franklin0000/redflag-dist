import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const myInterests = ['Hiking', 'Coffee', 'Movies', 'Tech'];
const calculateCompatibility = (userInterests, matchInterests) => {
    if (!userInterests || !matchInterests) return 50;
    const shared = userInterests.filter(i => matchInterests.includes(i));
    const score = Math.round((shared.length / Math.max(userInterests.length, 1)) * 100);
    return Math.min(score + 10, 100);
};

async function emulateFetch(user) {
    let matchData = [];
    try {
        const { data: mySwipes } = await supabase
            .from('swipes')
            .select('target_id')
            .eq('swiper_id', user.id);

        const swipedIds = mySwipes?.map(s => s.target_id) || [];
        swipedIds.push(user.id);

        let targetLat = null;
        let targetLng = null;

        // Simulating the query since user has no location
        let query = supabase
            .from('dating_profiles')
            .select(`
                *,
                users:user_id (name, is_paid) 
            `)
            .limit(50);

        if (swipedIds.length > 0) {
            query = query.not('user_id', 'in', `(${swipedIds.join(',')})`);
        }

        const { data } = await query;
        matchData = data || [];
        console.log("MatchData length:", matchData.length);

        if (matchData && matchData.length > 0) {
            const enrichedReal = matchData.map(m => {
                const score = calculateCompatibility(myInterests, m.interests);

                let displayDistance = m.location || 'Unknown location';
                if (m.distance_meters != null) {
                    const km = (m.distance_meters / 1000).toFixed(1);
                    const miles = (m.distance_meters * 0.000621371).toFixed(1);
                    displayDistance = `${miles} miles away`; // test condition
                }

                return {
                    id: m.profile_id || m.id,
                    user_id: m.user_id,
                    name: m.users?.name || m.name || 'Anonymous',
                    age: m.age,
                    bio: m.bio,
                    photos: m.photos,
                    safety_score: m.safety_score,
                    gender: 'unknown',
                    location: displayDistance,
                    interests: m.interests,
                    compatibility: score,
                    sharedInterests: (m.interests || []).filter(i => myInterests.includes(i))
                };
            });
            console.log("Enriched items:", enrichedReal[0]);

            // Simulating Array.sort
            const sorted = enrichedReal.sort((a, b) => b.compatibility - a.compatibility);
            console.log("Sorted count:", sorted.length);
        }

    } catch (err) {
        console.error("JavaScript Error in fetchMatches:", err);
    }
}

async function run() {
    const { data } = await supabase.auth.signInWithPassword({
        email: 'sofia_demo@redflag.io',
        password: 'password123'
    });
    if (data.user) await emulateFetch(data.user);
    else console.error("Login failed");
}

run();
