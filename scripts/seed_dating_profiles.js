import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Use SERVICE ROLE key to bypass RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MOCK_PROFILES = [
    {
        name: 'Sofia',
        age: 24,
        bio: 'Art lover and coffee enthusiast. Looking for someone to explore museums with.',
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'],
        gender: 'female',
        location: 'New York, NY',
        lat: 40.7128,
        lng: -74.0060,
        safety_score: 95,
        interests: ['Art', 'Coffee', 'Museums']
    },
    {
        name: 'James',
        age: 29,
        bio: 'Tech entrepreneur. Always building something new.',
        photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'],
        gender: 'male',
        location: 'San Francisco, CA',
        lat: 37.7749,
        lng: -122.4194,
        safety_score: 88,
        interests: ['Tech', 'Startups', 'Coffee']
    },
    {
        name: 'Elena',
        age: 26,
        bio: 'Yoga instructor and plant mom. 🌱',
        photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'],
        gender: 'female',
        location: 'Austin, TX',
        lat: 30.2672,
        lng: -97.7431,
        safety_score: 99,
        interests: ['Yoga', 'Plants', 'Wellness']
    },
    {
        name: 'Marcus',
        age: 31,
        bio: 'Chef. I make the best pasta you will ever taste.',
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'],
        gender: 'male',
        location: 'Chicago, IL',
        lat: 41.8781,
        lng: -87.6298,
        safety_score: 92,
        interests: ['Cooking', 'Food', 'Travel']
    },
    {
        name: 'Valentina',
        age: 23,
        bio: 'Travel addict. 30 countries and counting.',
        photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800'],
        gender: 'female',
        location: 'Miami, FL',
        lat: 25.7617,
        lng: -80.1918,
        safety_score: 97,
        interests: ['Travel', 'Beach', 'Photography']
    }
];

async function seedProfiles() {
    console.log(`Seeding ${MOCK_PROFILES.length} profiles...`);

    for (const profile of MOCK_PROFILES) {
        const userId = uuidv4();

        // 1. Create Public User
        const { error: userError } = await supabase.from('users').insert({
            id: userId,
            email: `${profile.name.toLowerCase()}@example.com`,
            name: profile.name,
            gender: profile.gender,
            is_paid: true,
            username: profile.name.toLowerCase() + Math.floor(Math.random() * 1000)
        });

        if (userError) {
            console.warn(`⚠️ Failed to create user for ${profile.name}: ${userError.message}`);
        }

        // 2. Insert Dating Profile
        const datingProfile = {
            user_id: userId,
            age: profile.age,
            bio: profile.bio,
            photos: profile.photos,
            safety_score: profile.safety_score,
            lat: profile.lat,
            lng: profile.lng,
            location: profile.location,
            interests: profile.interests
        };

        const { error } = await supabase
            .from('dating_profiles')
            .upsert(datingProfile, { onConflict: 'user_id' })
            .select();

        if (error) {
            console.error(`❌ Error seeding profile for ${profile.name}:`, error.message);
        } else {
            console.log(`✅ Seeded ${profile.name} (ID: ${userId})`);
        }
    }
}

seedProfiles();
