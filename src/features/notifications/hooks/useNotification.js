import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { getSession } from '@/app/auth/session.js';
import { hubEndpoint } from '@/config/backend.js';
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/features/notifications/api/notificationApi.js';
import { queryClient } from '@/api/queryClient.js';
import { createNotificationDeduper, normalizeRealtimeNotification } from '@/features/notifications/utils/notificationDedupe.js';

export const notificationKeys = {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
    unreadCount: ['notifications', 'unread-count'],
};

export const NOTIFICATION_EVENT = 'rikipath:notification';

export function useNotificationsQuery(params = { page: 1, pageSize: 20, onlyUnread: false }, options = {}) {
    const session = getSession();
    const enabled = options.enabled !== undefined ? options.enabled : true;
    return useQuery({
        queryKey: [...notificationKeys.list(params), session?.userId ?? 'anon'],
        queryFn: session?.isPreview ? () => ({ items: [], totalCount: 0 }) : () => getNotifications(params),
        ...options,
        enabled: Boolean(enabled && session?.accessToken),
    });
}

export function useUnreadCountQuery() {
    const session = getSession();
    return useQuery({
        queryKey: [...notificationKeys.unreadCount, session?.userId ?? 'anon'],
        queryFn: session?.isPreview ? () => ({ unreadCount: 0, count: 0 }) : getUnreadNotificationCount,
        enabled: Boolean(session?.accessToken),
    });
}

export function useMarkAsReadMutation() {
    return useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });
}

export function useMarkAllAsReadMutation() {
    return useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });
}

// ---------------------------------------------------------------------------
// One shared hub connection for the whole tab. Every consumer increments a
// ref-count; the connection stops only when the last consumer unmounts. This
// prevents duplicate listeners (StrictMode double effects, several bells, route
// changes) and duplicate toasts after automatic reconnect.
// ---------------------------------------------------------------------------
let shared = null;
const shouldSurface = createNotificationDeduper();

function refreshLists() {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

function surface(raw) {
    refreshLists();
    const item = normalizeRealtimeNotification(raw);
    if (!item || !shouldSurface(item)) return;
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: item }));
    if (item.type === 'MentorVerification') {
        queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] });
        window.dispatchEvent(new CustomEvent('rikipath:mentor-verification', { detail: raw }));
    }
}

function acquireConnection() {
    if (shared) {
        shared.refs += 1;
        return shared;
    }
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubEndpoint('/hubs/notification'), {
            accessTokenFactory: () => getSession()?.accessToken || '',
            transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    // New notifications (two event names exist on the Backend) → toast once.
    connection.on('ReceiveNotification', surface);
    connection.on('NotificationReceived', surface);
    // Read/unread changes only refresh the lists; they never toast.
    connection.on('NotificationRead', refreshLists);
    connection.on('UnreadCountChanged', refreshLists);
    // Reconnect: resync counts silently (no replayed toasts).
    connection.onreconnected(() => {
        refreshLists();
        connection.invoke('RequestSync').catch(() => {});
    });

    const state = { connection, refs: 1, timer: null, started: null };
    state.started = connection.start()
        .then(() => connection.invoke('RequestSync').catch(() => {}))
        .catch(() => refreshLists());
    // Fallback polling while the socket is unavailable.
    state.timer = window.setInterval(() => {
        if (connection.state !== signalR.HubConnectionState.Connected) refreshLists();
    }, 60000);
    shared = state;
    return state;
}

function releaseConnection(state) {
    if (!state || shared !== state) return;
    state.refs -= 1;
    if (state.refs > 0) return;
    shared = null;
    window.clearInterval(state.timer);
    state.started.finally(() => state.connection.stop().catch(() => {}));
}

export function useNotificationSignalR() {
    useEffect(() => {
        const session = getSession();
        if (!session?.accessToken || session.isPreview) return undefined;
        const state = acquireConnection();
        return () => releaseConnection(state);
    }, []);
}
