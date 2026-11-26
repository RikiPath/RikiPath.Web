import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { getSession } from '@/app/auth/session.js';
import { hubEndpoint } from '@/config/backend.js';
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    markNotificationAsUnread,
} from '@/features/notifications/api/notificationApi.js';
import { queryClient } from '@/api/queryClient.js';
import { createNotificationDeduper, normalizeRealtimeNotification } from '@/features/notifications/utils/notificationDedupe.js';
import { resolveInvalidationKeysForNotification } from '@/features/notifications/utils/notificationModel.js';
import { scheduleDebouncedSidebarCounterRefresh } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

export const notificationKeys = {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
    unreadCount: ['notifications', 'unread-count'],
};

export const NOTIFICATION_EVENT = 'rikipath:notification';
const NOTIFICATION_SYNC_CHANNEL = 'rikipath:notifications:sync';
const NOTIFICATION_SYNC_STORAGE_KEY = 'rikipath:notifications:sync:event';

function broadcastNotificationSync(action, payload = {}) {
    if (typeof window === 'undefined') return;
    const userId = getSession()?.userId ?? null;
    if (!userId) return;
    const msg = { action, userId: String(userId), at: Date.now(), ...payload };
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const ch = new BroadcastChannel(NOTIFICATION_SYNC_CHANNEL);
            ch.postMessage(msg);
            ch.close();
            return;
        } catch {
            // Fall back to storage event below
        }
    }
    try {
        window.localStorage.setItem(NOTIFICATION_SYNC_STORAGE_KEY, JSON.stringify(msg));
    } catch {
        // Ignore storage errors in private mode
    }
}

function patchCachedLists(updater) {
    queryClient.setQueriesData({ queryKey: ['notifications', 'list'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return updater(old);
        if (Array.isArray(old.items)) {
            return { ...old, items: updater(old.items) };
        }
        return old;
    });
}

function patchCachedUnreadCount(updater) {
    queryClient.setQueriesData({ queryKey: notificationKeys.unreadCount }, (old) => {
        const current = typeof old === 'number' ? old : (old?.count ?? old?.unreadCount ?? 0);
        const next = Math.max(0, updater(current));
        if (typeof old === 'number') return next;
        return { ...(old || {}), count: next, unreadCount: next };
    });
}

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
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.all });
            const prevLists = queryClient.getQueriesData({ queryKey: ['notifications', 'list'] });
            const prevUnread = queryClient.getQueriesData({ queryKey: notificationKeys.unreadCount });

            let wasUnread = false;
            patchCachedLists((items) =>
                items.map((item) => {
                    if (Number(item.id) === Number(notificationId)) {
                        if (!item.isRead) wasUnread = true;
                        return { ...item, isRead: true };
                    }
                    return item;
                }),
            );
            if (wasUnread) {
                patchCachedUnreadCount((c) => c - 1);
            }
            return { prevLists, prevUnread };
        },
        onError: (_err, _id, ctx) => {
            if (ctx?.prevLists) ctx.prevLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
            if (ctx?.prevUnread) ctx.prevUnread.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSuccess: (_res, notificationId) => {
            broadcastNotificationSync('read', { notificationId });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });
}

export function useMarkAsUnreadMutation() {
    return useMutation({
        mutationFn: markNotificationAsUnread,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.all });
            const prevLists = queryClient.getQueriesData({ queryKey: ['notifications', 'list'] });
            const prevUnread = queryClient.getQueriesData({ queryKey: notificationKeys.unreadCount });

            let wasRead = false;
            patchCachedLists((items) =>
                items.map((item) => {
                    if (Number(item.id) === Number(notificationId)) {
                        if (item.isRead) wasRead = true;
                        return { ...item, isRead: false };
                    }
                    return item;
                }),
            );
            if (wasRead) {
                patchCachedUnreadCount((c) => c + 1);
            }
            return { prevLists, prevUnread };
        },
        onError: (_err, _id, ctx) => {
            if (ctx?.prevLists) ctx.prevLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
            if (ctx?.prevUnread) ctx.prevUnread.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSuccess: (_res, notificationId) => {
            broadcastNotificationSync('unread', { notificationId });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });
}

export function useMarkAllAsReadMutation() {
    return useMutation({
        mutationFn: markAllNotificationsAsRead,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.all });
            const prevLists = queryClient.getQueriesData({ queryKey: ['notifications', 'list'] });
            const prevUnread = queryClient.getQueriesData({ queryKey: notificationKeys.unreadCount });
            patchCachedLists((items) => items.map((item) => ({ ...item, isRead: true })));
            patchCachedUnreadCount(() => 0);
            return { prevLists, prevUnread };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prevLists) ctx.prevLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
            if (ctx?.prevUnread) ctx.prevUnread.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSuccess: () => {
            broadcastNotificationSync('mark-all-read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            queryClient.invalidateQueries({ queryKey: ['workspace-calendar', 'notifications'] });
        },
    });
}

// ---------------------------------------------------------------------------
// Single shared SignalR hub + cross-tab sync manager keyed by authenticated user.
// Automatically tears down and resets deduper on logout, account switch, or
// role switch so a previous account can never receive stale notifications.
// ---------------------------------------------------------------------------
let shared = null;
let shouldSurface = createNotificationDeduper();
const statusListeners = new Set();
let currentConnectionStatus = 'idle';

function setConnectionStatus(next) {
    if (currentConnectionStatus === next) return;
    currentConnectionStatus = next;
    for (const fn of statusListeners) fn(next);
}

function refreshLists() {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    queryClient.invalidateQueries({ queryKey: ['workspace-calendar'] });
}

function surface(raw) {
    refreshLists();
    scheduleDebouncedSidebarCounterRefresh(queryClient);
    const item = normalizeRealtimeNotification(raw);
    if (!item || !shouldSurface(item)) return;

    // Selectively invalidate affected domain caches so business screens & Global Calendar update live.
    const domainKeys = resolveInvalidationKeysForNotification(item);
    for (const key of domainKeys) {
        queryClient.invalidateQueries({ queryKey: key });
    }

    if (item.type === 'MentorVerification') {
        window.dispatchEvent(new CustomEvent('rikipath:mentor-verification', { detail: raw }));
    }

    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: item }));
}

function teardownShared(state) {
    if (!state) return;
    if (state.timer) window.clearInterval(state.timer);
    if (state.channel) {
        try { state.channel.close(); } catch { /* ignore */ }
    }
    if (state.onStorage) window.removeEventListener('storage', state.onStorage);
    if (state.onOnline) window.removeEventListener('online', state.onOnline);
    if (state.onOffline) window.removeEventListener('offline', state.onOffline);
    if (state.onVisibility) document.removeEventListener('visibilitychange', state.onVisibility);
    state.started.finally(() => state.connection.stop().catch(() => {}));
}

function acquireConnection(ownerKey) {
    if (shared && shared.ownerKey === ownerKey) {
        shared.refs += 1;
        return shared;
    }

    // Account or token changed: tear down the previous user's connection & clear deduper immediately.
    if (shared && shared.ownerKey !== ownerKey) {
        const previous = shared;
        shared = null;
        shouldSurface = createNotificationDeduper();
        teardownShared(previous);
    }

    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubEndpoint('/hubs/notification'), {
            accessTokenFactory: () => getSession()?.accessToken || '',
            transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    // New notifications (two event names exist on the Backend) → deduplicated surface.
    connection.on('ReceiveNotification', surface);
    connection.on('NotificationReceived', surface);

    // Read/unread state sync across tabs and devices (never re-toasts).
    connection.on('NotificationRead', refreshLists);
    connection.on('NotificationUnread', refreshLists);
    connection.on('NotificationsMarkedAllRead', refreshLists);
    connection.on('UnreadCountChanged', (nextCount) => {
        if (typeof nextCount === 'number' && Number.isFinite(nextCount)) {
            patchCachedUnreadCount(() => nextCount);
        }
        refreshLists();
    });

    // Authoritative sidebar counter invalidation signal from backend workflows.
    connection.on('SidebarCountersChanged', () => scheduleDebouncedSidebarCounterRefresh(queryClient));

    connection.onreconnecting(() => {
        setConnectionStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'reconnecting');
    });

    connection.onclose(() => {
        setConnectionStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'reconnecting');
    });

    // Reconnect: reconcile silently (never replay historical notifications as toasts).
    connection.onreconnected(() => {
        setConnectionStatus('connected');
        refreshLists();
        scheduleDebouncedSidebarCounterRefresh(queryClient);
        connection.invoke('RequestSync').catch(() => {});
    });

    // Multi-tab BroadcastChannel + storage fallback listener
    const handleCrossTab = (msg) => {
        const curUserId = getSession()?.userId;
        if (!msg || !curUserId || String(msg.userId) !== String(curUserId)) return;
        refreshLists();
        scheduleDebouncedSidebarCounterRefresh(queryClient);
    };

    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            channel = new BroadcastChannel(NOTIFICATION_SYNC_CHANNEL);
            channel.onmessage = (event) => handleCrossTab(event.data);
        } catch {
            channel = null;
        }
    }

    const onStorage = (event) => {
        if (event.key !== NOTIFICATION_SYNC_STORAGE_KEY || !event.newValue) return;
        try {
            handleCrossTab(JSON.parse(event.newValue));
        } catch {
            // ignore malformed payload
        }
    };

    const onOffline = () => setConnectionStatus('offline');
    const onOnline = () => {
        setConnectionStatus(connection.state === signalR.HubConnectionState.Connected ? 'connected' : 'reconnecting');
        refreshLists();
        scheduleDebouncedSidebarCounterRefresh(queryClient);
        if (connection.state === signalR.HubConnectionState.Disconnected) {
            connection.start()
                .then(() => {
                    setConnectionStatus('connected');
                    return connection.invoke('RequestSync').catch(() => {});
                })
                .catch(() => {});
        }
    };

    const onVisibility = () => {
        if (document.visibilityState === 'visible') {
            refreshLists();
            scheduleDebouncedSidebarCounterRefresh(queryClient);
        }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    const state = {
        ownerKey,
        connection,
        refs: 1,
        timer: null,
        started: null,
        channel,
        onStorage,
        onOnline,
        onOffline,
        onVisibility,
    };

    setConnectionStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'reconnecting');
    state.started = connection.start()
        .then(() => {
            setConnectionStatus('connected');
            return connection.invoke('RequestSync').catch(() => {});
        })
        .catch(() => {
            setConnectionStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'reconnecting');
            refreshLists();
        });

    // Fallback reconciliation only when socket is disconnected & browser is online.
    state.timer = window.setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        if (connection.state !== signalR.HubConnectionState.Connected) {
            refreshLists();
        }
    }, 60000);

    shared = state;
    return state;
}

function releaseConnection(state) {
    if (!state || shared !== state) return;
    state.refs -= 1;
    if (state.refs > 0) return;
    shared = null;
    setConnectionStatus('idle');
    teardownShared(state);
}

function subscribeConnectionStatus(listener) {
    statusListeners.add(listener);
    return () => { statusListeners.delete(listener); };
}

function getConnectionStatusSnapshot() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
    return currentConnectionStatus;
}

export function useNotificationConnectionStatus() {
    return useSyncExternalStore(
        subscribeConnectionStatus,
        getConnectionStatusSnapshot,
        () => 'idle',
    );
}

export function useNotificationSignalR() {
    const session = getSession();
    const userId = session?.userId ?? null;
    const role = session?.role ?? '';
    const token = session?.accessToken ?? '';
    const isPreview = Boolean(session?.isPreview);

    useEffect(() => {
        if (!token || isPreview || !userId) {
            // Ensure previous user's connection is cleaned up on logout
            if (shared) {
                const previous = shared;
                shared = null;
                shouldSurface = createNotificationDeduper();
                setConnectionStatus('idle');
                teardownShared(previous);
            }
            return undefined;
        }
        const ownerKey = `${userId}:${role}:${token.slice(-12)}`;
        const state = acquireConnection(ownerKey);
        return () => releaseConnection(state);
    }, [isPreview, role, token, userId]);
}
