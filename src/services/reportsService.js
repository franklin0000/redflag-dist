import { supabase } from './supabase';
import { uploadEvidence as uploadEvidenceToSupabase } from './storageService';
import { secureGet, secureSet } from './secureStorage';

const TABLE = 'reports';

export const reportsService = {
    /**
     * Uploads evidence to Supabase Storage and returns the download URL.
     * @param {File} file 
     * @returns {Promise<string>} Download URL
     */
    uploadEvidence: async (file) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be logged in to upload evidence.');
        return uploadEvidenceToSupabase(file, user.id);
    },

    /**
     * Creates a new report. Tries online first, falls back to offline storage.
     * @param {Object} reportData 
     */
    createReport: async (reportData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be logged in to submit a report.');

        const reportPayload = {
            user_id: user.id,
            name: reportData.name,
            handle: reportData.handle,
            description: reportData.details,
            type: reportData.selectedFlags?.[0] || 'Other',
            image: reportData.photos?.[0] || null,
            severity: reportData.severity,
            status: 'Under Review',
            verified: false
        };

        try {
            const { data, error } = await supabase
                .from(TABLE)
                .insert([reportPayload])
                .select()
                .single();

            if (error) throw error;
            return data.id;

        } catch (error) {
            console.warn("Report submission failed, saving offline:", error);

            // Create offline record
            const offlineReport = {
                id: `local_${Date.now()}`,
                ...reportPayload,
                created_at: new Date().toISOString(),
                offline: true,
                syncStatus: 'pending' // pending, synced, failed
            };

            // Save to secure storage
            const currentOffline = await secureGet('offline_reports') || [];
            await secureSet('offline_reports', [offlineReport, ...currentOffline]);

            return offlineReport.id;
        }
    },

    /**
     * Fetches recent reports from both server and local storage.
     * @param {number} limitCount 
     */
    getRecentReports: async (limitCount = 10) => {
        // 1. Fetch Online Reports
        let onlineReports = [];
        try {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limitCount);

            if (!error && data) onlineReports = data;
        } catch (e) {
            console.warn("Failed to fetch online reports:", e);
        }

        // 2. Fetch Offline Reports
        const offlineReports = await secureGet('offline_reports') || [];

        // 3. Merge and Sort
        const allReports = [...offlineReports, ...onlineReports].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        return allReports.slice(0, limitCount).map(d => ({
            id: d.id,
            ...d,
            createdAt: new Date(d.created_at),
            isOffline: !!d.offline
        }));
    }
};

