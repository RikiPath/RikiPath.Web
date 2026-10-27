import { api } from './client.js';

export async function getNotifications(params) {
    const res = await api.get('/Notification', { params });
    return res?.result ?? res;
}

export async function getUnreadNotificationCount() {
    const res = await api.get('/Notification/unread-count');
    return res?.result ?? res;
}

export async function markNotificationAsRead(id) {
    const res = await api.patch(`/Notification/${id}/read`);
    return res?.result ?? res;
}

export async function markAllNotificationsAsRead() {
    const res = await api.patch('/Notification/mark-all-read');
    return res?.result ?? res;
}