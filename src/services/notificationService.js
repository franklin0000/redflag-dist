/**
 * notificationService.js — Notification CRUD via Express API + Web Push
 */
import { notificationsApi } from './api';

let subscription = null;

/**
 * Request permission and subscribe to push notifications
 */
export const requestPushPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('Push notifications not supported');
        return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('Push permission denied');
        return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // Subscribe to push
    const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    
    subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublic ? urlBase64ToUint8Array(vapidPublic) : null,
    });

    // Save subscription to server
    try {
        await notificationsApi.subscribePush(JSON.stringify(subscription));
    } catch (err) {
        console.warn('Failed to save push subscription:', err);
    }

    return subscription;
};

/**
 * Show local notification
 */
export const showLocalNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            ...options,
        });
    }
};

/**
 * Subscribe to notifications (poll-based)
 */
export const subscribeToNotifications = (userId, callback) => {
    if (!userId) return () => {};

    let cancelled = false;

    const fetchAndNotify = async () => {
        try {
            const data = await notificationsApi.getAll();
            if (!cancelled) callback(mapNotifications(data || []));
        } catch (err) {
            console.warn('Notifications fetch error:', err.message);
            if (!cancelled) callback([]);
        }
    };

    fetchAndNotify();

    // Poll every 30 seconds
    const interval = setInterval(fetchAndNotify, 30000);

    return () => {
        cancelled = true;
        clearInterval(interval);
    };
};

/**
 * Check current notification permission status
 */
export const getNotificationPermission = () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
};

/**
 * Enable push notifications (convenience function)
 */
export const enablePushNotifications = async () => {
    const permission = getNotificationPermission();
    if (permission === 'granted') return true;
    if (permission === 'denied') {
        alert('Push notifications are blocked. Please enable them in browser settings.');
        return false;
    }
    return await requestPushPermission() !== null;
};

// Helper: convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async () => {
    try {
        await notificationsApi.markAllRead(); // best we can do without single-read endpoint
    } catch (err) {
        console.error('Error marking notification read:', err);
    }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
    try {
        await notificationsApi.markAllRead();
    } catch (err) {
        console.error('Error marking all notifications read:', err);
    }
};

/**
 * Create a notification (only works if we have server-side routing)
 */
export const createNotification = async (userId, data) => {
    // Notifications are created server-side; this is a no-op from the client
    console.debug('createNotification called (server-side only):', userId, data);
};

/**
 * Delete a notification (stub)
 */
export const deleteNotification = async (notificationId) => {
    console.debug('deleteNotification called:', notificationId);
};

const mapNotifications = (data) => data.map(n => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.body,
    read: n.is_read,
    actionTarget: n.data?.match_id ? `/dating/chat/${n.data.match_id}` : null,
    actionLabel: n.type === 'message' ? 'View Chat' : 'View',
    time: new Date(n.created_at).getTime(),
}));
