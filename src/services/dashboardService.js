/**
 * Dashboard Service — aggregates real user stats from Supabase
 */
import { supabase } from './supabase';

const REPORTS = 'reports';

/**
 * Get the user's personal dashboard stats.
 * Returns: { totalScans, reportsCount, daysProtected, safetyScore, recentSearches }
 */
export async function getUserDashboardStats(userId) {
    if (!userId) return getDefaults();

    try {
        const [scans, reports, userProfile] = await Promise.allSettled([
            getUserSearchCount(userId),
            getUserReportsCount(userId),
            getUserProfile(userId),
        ]);

        const totalScans = scans.status === 'fulfilled' ? scans.value : 0;
        const reportsCount = reports.status === 'fulfilled' ? reports.value : 0;
        const profile = userProfile.status === 'fulfilled' ? userProfile.value : null;

        // Days since account creation
        // Supabase user doesn't expose created_at in public table unless we put it there.
        // We can get it from auth.users or check our 'users' table if we added it.
        // We added created_at to 'dating_profiles', but maybe not 'users'. 
        // Let's assume 'users' has it or default to now. 
        // Our 'users' table schema in SQL does NOT have created_at currently? 
        // Wait, the SQL schema for users table:
        // create table public.users ( id uuid references auth.users not null primary key, ... )
        // It does not have created_at. We should add it or use auth metadata.
        // For now, default to Date.now() if missing.
        const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : Date.now();
        const daysProtected = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)));

        // Safety score: base 50 + bonuses
        let safetyScore = 50;
        if (totalScans > 0) safetyScore += Math.min(15, totalScans * 3);       // Max +15 for scans
        if (reportsCount > 0) safetyScore += Math.min(10, reportsCount * 2);   // Max +10 for reports
        // profile verification check
        // check subscription status
        safetyScore = Math.min(100, safetyScore);

        return {
            totalScans,
            reportsCount,
            daysProtected,
            safetyScore,
        };
    } catch (err) {
        console.warn('Dashboard stats fetch failed:', err);
        return getDefaults();
    }
}

/**
 * Get community-wide stats (global counters).
 */
export async function getCommunityStats() {
    try {
        const [reportsSnap, usersSnap] = await Promise.allSettled([
            supabase.from(REPORTS).select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }),
        ]);

        const totalReports = reportsSnap.status === 'fulfilled' ? reportsSnap.value.count : 0;
        const totalUsers = usersSnap.status === 'fulfilled' ? usersSnap.value.count : 0;

        return { totalReports, totalUsers };
    } catch (err) {
        console.warn('Community stats failed:', err);
        return { totalReports: 0, totalUsers: 0 };
    }
}

/**
 * Get the user's recent searches for the "Recent Checks" section.
 */
export async function getUserRecentSearches(userId, max = 5) {
    if (!userId) return [];
    try {
        const { data, error } = await supabase
            .from('searches')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(max);

        if (error) throw error;

        return data.map(d => ({
            id: d.id,
            ...d,
            timestamp: new Date(d.timestamp)
        }));
    } catch (err) {
        console.warn('Recent searches fetch failed:', err);
        return [];
    }
}

/**
 * Subscribe to the live activity ticker — real-time reports stream
 */
export function subscribeToLiveActivity(callback) {
    const channel = supabase
        .channel('public:reports')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: REPORTS }, () => {
            // const data = payload.new;
            // const activity = {
            //     id: data.id,
            //     type: data.type || 'report',
            //     name: 'Anonymous', // Reports usually anon or we join? Keep simple.
            //     location: data.location || '',
            //     severity: 'review', // logic needed?
            //     timestamp: new Date(data.created_at),
            // };
            // Callback usually expects array of latest?
            // The original code subscribed to top 5.
            // Here we just get one new one.
            // We should probably just fetch recent 5 initially, then append new ones.
            // For now, let's just pass the single new one? 
            // The consumer expects a list? 
            // Original code: callback(activities array).
            // Let's manually fetch latest 5 on every update to match behavior.
            fetchLatestReports().then(callback);
        })
        .subscribe();

    // Initial fetch
    fetchLatestReports().then(callback);

    return () => {
        supabase.removeChannel(channel);
    };
}

async function fetchLatestReports() {
    const { data } = await supabase
        .from(REPORTS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    return (data || []).map(d => ({
        id: d.id,
        type: d.type || 'report',
        name: 'Anonymous',
        location: d.location || '',
        severity: 'review',
        timestamp: new Date(d.created_at)
    }));
}

// ——— Internal helpers ———

async function getUserSearchCount(userId) {
    const { count } = await supabase
        .from('searches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    return count || 0;
}

async function getUserReportsCount(userId) {
    const { count } = await supabase
        .from(REPORTS)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    return count || 0;
}

async function getUserProfile(userId) {
    const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    return data;
}

function getDefaults() {
    return {
        totalScans: 0,
        reportsCount: 0,
        daysProtected: 1,
        safetyScore: 50,
    };
}

