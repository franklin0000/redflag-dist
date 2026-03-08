/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { secureSet, secureClearAll } from '../services/secureStorage';
import { clearKeyCache } from '../services/cryptoService';
import { initSovereignIdentity } from '../services/sovereignIdentity';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) setLoading(false);
        }, 8000);
        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    const fetchProfile = React.useCallback(async (authUser) => {
        if (!mountedRef.current) return;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (data) {
                const fullUser = {
                    ...authUser,
                    ...data,
                    gender: data.gender || authUser.user_metadata?.gender,
                    isPaid: data.is_paid || false,
                    isVerified: data.is_verified || false,
                    is_verified: data.is_verified || false,
                };
                if (mountedRef.current) setUser(fullUser);
                secureSet('user_profile', fullUser).catch(console.error);
            } else if (error && error.code === 'PGRST116') {
                // Profile not found — auto-create
                const { error: insertError } = await supabase.from('users').insert([{
                    id: authUser.id,
                    email: authUser.email,
                    name: authUser.user_metadata?.full_name || 'New User',
                    gender: authUser.user_metadata?.gender,
                    username: (authUser.user_metadata?.full_name || 'user').toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 1000),
                    is_paid: false,
                    is_verified: false
                }]);
                if (!insertError) {
                    await fetchProfile(authUser);
                } else {
                    if (mountedRef.current) setUser(authUser);
                }
            } else {
                if (mountedRef.current) setUser(authUser);
            }
        } catch (err) {
            console.error("Exception in fetchProfile:", err);
            if (mountedRef.current) setUser(authUser);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initSession = async () => {
            try {
                const sessionPromise = supabase.auth.getSession();
                const { data, error } = await Promise.race([sessionPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 20000))]);
                if (error) throw error;
                if (data?.session?.user) {
                    initSovereignIdentity().catch(console.error);
                    await fetchProfile(data.session.user);
                } else {
                    if (mountedRef.current) setLoading(false);
                }
            } catch (err) {
                console.error("AuthContext: Init failed", err);
                if (mountedRef.current) setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    setLoading(true); // keep ProtectedRoute in spinner until profile loads
                    await fetchProfile(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
            }
        });

        initSession();
        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const withTimeout = (promise, ms = 30000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
        ]);
    };

    const login = async (email, password) => {
        const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
        return data;
    };

    const signup = async (name, email, password, gender) => {
        const { data, error } = await withTimeout(supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, gender } }
        }));
        if (error) throw error;
        if (data.user) {
            try {
                await supabase.from('users').insert([{
                    id: data.user.id,
                    email,
                    name,
                    username: name.toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 1000),
                    gender,
                    is_paid: false,
                    is_verified: false
                }]);
            } catch (e) {
                console.warn("Profile creation failed:", e);
            }
        }
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        secureClearAll();
        clearKeyCache();
    };

    const updateSubscription = async (status) => {
        if (!user) return;
        const isPaid = status === 'paid' || status === true;
        await supabase.from('users').update({ is_paid: isPaid }).eq('id', user.id);
        setUser(prev => ({ ...prev, isPaid }));
    };

    const updateProfile = async (updates) => {
        if (!user) return;
        // Only send real DB columns (strip camelCase aliases)
        const dbUpdates = { ...updates };
        delete dbUpdates.isVerified;
        delete dbUpdates.isPaid;
        const { error } = await supabase.from('users').update(dbUpdates).eq('id', user.id);
        if (error) throw error;
        // Map snake_case DB fields to camelCase context fields
        const contextUpdates = { ...updates };
        if ('is_verified' in updates) contextUpdates.isVerified = updates.is_verified;
        if ('is_paid' in updates) contextUpdates.isPaid = updates.is_paid;
        const updatedUser = { ...user, ...contextUpdates };
        setUser(updatedUser);
        secureSet('user_profile', updatedUser).catch(console.error);
        return { data: updatedUser, error: null };
    };

    // Re-fetch user profile from DB and update local state.
    // Call this after external DB updates (e.g. verification) to sync local state.
    const refreshProfile = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) await fetchProfile(authUser);
        } catch (e) {
            console.warn('refreshProfile failed:', e);
        }
    };

    const loginWithEthereum = async () => {
        const { data, error } = await supabase.auth.signInWithWeb3({
            chain: 'ethereum',
            statement: 'Sign in to RedFlag Dating App',
        });
        if (error) throw error;
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, loginWithEthereum, logout, updateSubscription, updateProfile, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
