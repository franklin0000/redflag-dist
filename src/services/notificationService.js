import { supabase } from './supabase';

const TABLE = 'notifications';

/**
 * Creates a new notification for a user
 * @param {string} userId - Target user ID (recipient)
 * @param {object} data - Notification data { type, title, message, actionTarget, ... }
 */
export const createNotification = async (userId, data) => {
    if (!userId) return;

    try {
        const { error } = await supabase
            .from(TABLE)
            .insert([
                {
                    user_id: userId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    read: false,
                    action_target: data.actionTarget,
                    action_label: data.actionLabel,
                    // created_at is default
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

/**
 * Subscribe to user's notifications
 * @param {string} userId 
 * @param {function} callback 
 * @returns {function} unsubscribe function
 */
export const subscribeToNotifications = (userId, callback) => {
    if (!userId) return () => { };

    // 1. Initial fetch
    const fetchInitial = async () => {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("Notifications fetch error (table may not exist):", error.message);
            // Still call callback with empty array so loading clears
            callback([]);
            return;
        }

        callback(mapNotifications(data || []));
    };

    fetchInitial();

    // 2. Realtime subscription
    const channel = supabase
        .channel(`public:${TABLE}:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: TABLE,
                filter: `user_id=eq.${userId}`
            },
            () => {
                // Simplified: Just re-fetch all on any change for consistency
                // Optimization: Handle INSERT/UPDATE/DELETE specifically to update local state
                fetchInitial();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Helper: map snake_case DB fields to camelCase for UI
const mapNotifications = (data) => {
    return data.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        actionTarget: n.action_target,
        actionLabel: n.action_label,
        time: new Date(n.created_at).getTime()
    }));
};

/**
 * Mark a single notification as read
 * @param {string|number} notificationId 
 */
export const markNotificationRead = async (notificationId) => {
    try {
        const { error } = await supabase
            .from(TABLE)
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    } catch (error) {
        console.error("Error marking notification read:", error);
    }
};

/**
 * Mark all notifications for a user as read
 * @param {string} userId 
 */
export const markAllNotificationsRead = async (userId) => {
    try {
        const { error } = await supabase
            .from(TABLE)
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false); // Only update unread ones

        if (error) throw error;
    } catch (error) {
        console.error("Error marking all notifications read:", error);
    }
};

/**
 * Delete a notification
 * @param {string|number} notificationId 
 */
export const deleteNotification = async (notificationId) => {
    try {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting notification:", error);
    }
};

