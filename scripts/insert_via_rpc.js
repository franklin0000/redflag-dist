import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    // We cannot bypass RLS without a service key, 
    // unless there is a permissive policy or we can authenticate.
    // Let's create an auth user via the API using anon key? 
    // Yes, Supabase allows signups with anon key.
    
    console.log("Signing up demo users...");
    const names = ['Sofia', 'James', 'Elena', 'Marcus'];
    for(const name of names) {
        const email = `${name.toLowerCase()}_demo@redflag.io`;
        const { data, error } = await supabase.auth.signUp({
            email,
            password: 'password123',
            options: { data: { full_name: name } }
        });
        
        if(error) {
             console.log(`Error signing up ${name}:`, error.message);
             // Try logging in instead to get a session
             const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email, password: 'password123'
             });
             if(!signInError && signInData.user) {
                 await createProfile(signInData.user, name);
             }
        } else if (data.user) {
             await createProfile(data.user, name);
        }
    }
}

async function createProfile(user, name) {
    console.log(`Creating profile for ${name} (${user.id})...`);
    // Insert into public.users (allowed by trigger usually, or authenticated)
    await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        name: name,
        is_paid: true,
        username: name.toLowerCase() + Math.floor(Math.random()*1000)
    });
    
    // Insert into dating_profiles
    const { error } = await supabase.from('dating_profiles').upsert({
        user_id: user.id,
        age: 25,
        bio: `I am ${name}, a demo user.`,
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'],
        lat: 40.7128,
        lng: -74.0060,
        interests: ['Coffee', 'Travel'],
        safety_score: 90
    });
    
    if(error) console.error("Error creating dating profile:", error.message);
    else console.log(`Dating profile for ${name} created successfully!`);
}

run();
