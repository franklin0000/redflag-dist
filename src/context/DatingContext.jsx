/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const DatingContext = createContext(null);

// localStorage key for unread timestamps  {matchId: ISO string}
const UNREAD_KEY = 'rf_match_read';

function getReadTimestamps() {
    try { return JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}'); } catch { return {}; }
}
function markMatchRead(matchId) {
    const ts = getReadTimestamps();
    ts[matchId] = new Date().toISOString();
    localStorage.setItem(UNREAD_KEY, JSON.stringify(ts));
}

export const DatingProvider = ({ children }) => {
    const { user } = useAuth();
    const [isDatingMode, setIsDatingMode] = useState(false);
    const [datingProfile, setDatingProfile] = useState(null);
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchedOnce = useRef(false);

    // ── Load dating profile ────────────────────────────────────────
    useEffect(() => {
        if (!user) {
            setDatingProfile(null);
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('dating_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.warn("Error fetching dating profile:", error);
                }
                if (data) setDatingProfile(data);
            } catch (err) {
                console.error("Unexpected error in fetchProfile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        const channel = supabase
            .channel(`profile:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'dating_profiles',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setDatingProfile(payload.new);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

    // ── Unread helper: count messages newer than last-read per match ──
    const computeUnread = useCallback(async (matchList) => {
        if (!user || matchList.length === 0) return matchList;
        const readTs = getReadTimestamps();

        const updated = await Promise.all(matchList.map(async (m) => {
            const since = readTs[m.matchId] || null;
            try {
                let q = supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('room_id', m.matchId)
                    .neq('sender_id', user.id);
                if (since) q = q.gt('created_at', since);
                const { count } = await q;
                return { ...m, unread: count || 0 };
            } catch {
                return { ...m, unread: 0 };
            }
        }));
        return updated;
    }, [user]);

    // ── Load matches list ─────────────────────────────────────────
    const fetchMatchesList = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('matches')
            .select(`
                id,
                last_message,
                last_message_time,
                user1:user1_id(id, name, photo_url),
                user2:user2_id(id, name, photo_url)
            `)
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .order('last_message_time', { ascending: false });

        if (data) {
            const formatted = data.map(m => {
                const other = m.user1.id === user.id ? m.user2 : m.user1;
                return {
                    id: other.id,
                    matchId: m.id,
                    name: other.name,
                    photo: other.photo_url,
                    timestamp: m.last_message_time ? new Date(m.last_message_time).getTime() : Date.now(),
                    lastMessage: m.last_message || '',
                    unread: 0
                };
            });
            // Compute unread counts asynchronously
            computeUnread(formatted).then(setMatches);
        } else {
            setMatches([]);
        }
    }, [user, computeUnread]);

    useEffect(() => {
        if (!user) { setMatches([]); return; }
        fetchMatchesList();

        const ch1 = supabase
            .channel(`matches_u1:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user1_id=eq.${user.id}` }, fetchMatchesList)
            .subscribe();
        const ch2 = supabase
            .channel(`matches_u2:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user2_id=eq.${user.id}` }, fetchMatchesList)
            .subscribe();

        return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
    }, [user, fetchMatchesList]);

    // ── Compatibility score ───────────────────────────────────────
    const calculateCompatibility = (userInterests, matchInterests) => {
        if (!userInterests?.length || !matchInterests?.length) return 50;
        const shared = userInterests.filter(i => matchInterests.includes(i));
        return Math.min(Math.round((shared.length / Math.max(userInterests.length, 1)) * 100) + 10, 100);
    };

    // ── Fetch potential matches ───────────────────────────────────
    const fetchMatches = useCallback(async (searchMode = 'local', customLat = null, customLng = null) => {
        if (!user) return;
        setLoading(true);

        try {
            const { data: mySwipes } = await supabase
                .from('swipes')
                .select('target_id')
                .eq('swiper_id', user.id);

            const swipedIds = mySwipes?.map(s => s.target_id) || [];
            swipedIds.push(user.id);

            let targetLat = customLat;
            let targetLng = customLng;

            if (!targetLat || !targetLng) {
                const { data: myProfile } = await supabase
                    .from('dating_profiles')
                    .select('lat, lng')
                    .eq('user_id', user.id)
                    .single();
                if (myProfile?.lat && myProfile?.lng) {
                    targetLat = myProfile.lat;
                    targetLng = myProfile.lng;
                }
            }

            const myInterests = datingProfile?.interests || [];
            let matchData = [];

            if (targetLat && targetLng) {
                const maxDistance = searchMode === 'global' ? null : 50000;
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_matches_by_distance', {
                    user_lat: targetLat,
                    user_lng: targetLng,
                    exclude_ids: swipedIds,
                    max_distance_meters: maxDistance,
                    limit_count: 50
                });

                if (rpcData && !rpcError) {
                    matchData = rpcData;
                } else {
                    console.warn("RPC fallback:", rpcError?.message);
                    const { data: fb } = await supabase
                        .from('dating_profiles')
                        .select(`*, users:user_id (name, is_paid, gender)`)
                        .not('user_id', 'in', `(${swipedIds.join(',')})`)
                        .limit(50);
                    matchData = fb || [];
                }
            } else {
                const { data: fb } = await supabase
                    .from('dating_profiles')
                    .select(`*, users:user_id (name, is_paid, gender)`)
                    .not('user_id', 'in', swipedIds.length > 0 ? `(${swipedIds.join(',')})` : `('')`)
                    .limit(50);
                matchData = fb || [];
            }

            if (matchData?.length > 0) {
                const enriched = matchData.map(m => {
                    const score = calculateCompatibility(myInterests, m.interests);
                    let displayDistance = m.location || 'Unknown location';
                    if (m.distance_meters != null) {
                        const km = (m.distance_meters / 1000).toFixed(1);
                        const miles = (m.distance_meters * 0.000621371).toFixed(1);
                        displayDistance = searchMode === 'global' ? `${km} km away` : `${miles} miles away`;
                    }
                    return {
                        id: m.user_id,
                        user_id: m.user_id,
                        name: m.users?.name || m.name || 'Anonymous',
                        age: m.age,
                        bio: m.bio,
                        photos: m.photos || [],
                        safety_score: m.safety_score || 50,
                        gender: m.users?.gender || m.gender || 'unknown',
                        location: displayDistance,
                        interests: m.interests || [],
                        compatibility: score,
                        sharedInterests: (m.interests || []).filter(i => myInterests.includes(i)),
                        is_paid: m.users?.is_paid || m.is_paid || false,
                    };
                });
                setPotentialMatches(enriched.sort((a, b) => b.compatibility - a.compatibility));
            } else {
                setPotentialMatches([]);
            }
        } catch (error) {
            console.error("Error fetching matches:", error);
        } finally {
            setLoading(false);
        }
    }, [user, datingProfile]);

    // ── Auto-fetch potential matches once profile is ready ────────
    useEffect(() => {
        if (!user || loading || fetchedOnce.current) return;
        fetchedOnce.current = true;
        fetchMatches();
    }, [user, loading, fetchMatches]);

    // Reset fetchedOnce on logout
    useEffect(() => {
        if (!user) fetchedOnce.current = false;
    }, [user]);

    // ── Swipe ─────────────────────────────────────────────────────
    const swipeProfile = async (targetId, direction) => {
        if (!user) return null;
        try {
            await supabase.from('swipes').insert({
                swiper_id: user.id,
                target_id: targetId,
                direction
            });

            if (direction === 'right' || direction === 'superlike') {
                const { data } = await supabase
                    .from('swipes')
                    .select('id')
                    .eq('swiper_id', targetId)
                    .eq('target_id', user.id)
                    .in('direction', ['right', 'superlike'])
                    .maybeSingle();

                if (data) {
                    const matchId = [user.id, targetId].sort().join('_');
                    await supabase.from('matches').insert({
                        id: matchId,
                        user1_id: user.id < targetId ? user.id : targetId,
                        user2_id: user.id < targetId ? targetId : user.id,
                        last_message: 'New Match! Say hi! 👋',
                        last_message_time: new Date().toISOString()
                    }).on('conflict', 'id', 'nothing');
                    return { isMatch: true, matchId };
                }
            }
            return { isMatch: false };
        } catch (error) {
            console.error("Swipe error:", error);
            return { isMatch: false, error };
        }
    };

    // ── Create / update dating profile ───────────────────────────
    const createDatingProfile = async (profileData) => {
        if (!user) return;
        const updates = {
            user_id: user.id,
            ...profileData,
            photos: Array.isArray(profileData.photos) ? profileData.photos : [],
            safety_score: profileData.safety_score ?? 50
        };
        const { data } = await supabase
            .from('dating_profiles')
            .upsert(updates)
            .select()
            .single();
        if (data) setDatingProfile(data);
    };

    const toggleMode = () => setIsDatingMode(prev => !prev);

    return (
        <DatingContext.Provider value={{
            isDatingMode,
            toggleMode,
            datingProfile,
            createDatingProfile,
            potentialMatches,
            matches,
            fetchMatches,
            swipeProfile,
            markMatchRead,   // expose so DatingChat can call it on open
            loading
        }}>
            {children}
        </DatingContext.Provider>
    );
};

export const useDating = () => useContext(DatingContext);
