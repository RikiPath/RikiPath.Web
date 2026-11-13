import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { getSession } from '../auth/session.js';
import { hubEndpoint } from '../config/backend.js';
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../api/notificationApi.js';
import { queryClient } from '../api/queryClient.js';

export const notificationKeys = {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
    unreadCount: ['notifications', 'unread-count'],
};

export function useNotificationsQuery(params = { page: 1, pageSize: 20, onlyUnread: false }) {
    return useQuery({
        queryKey: notificationKeys.list(params),
        queryFn: () => getNotifications(params),
    });
}

export function useUnreadCountQuery() {
    return useQuery({
        queryKey: notificationKeys.unreadCount,
        queryFn: getUnreadNotificationCount,
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

export function useNotificationSignalR() {
    useEffect(() => {
        const token = getSession()?.accessToken || '';
        if (!token) return;

        const hubUrl = hubEndpoint('/hubs/notification');

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => getSession()?.accessToken || '',
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        const handleRefresh = (notification) => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            const title = notification?.title || notification?.Title;
            if (title) {
                window.dispatchEvent(new CustomEvent('rikipath:notification', {
                    detail: {
                        title,
                        message: notification.message || notification.Message || '',
                        linkUrl: notification.linkUrl || notification.LinkUrl || '',
                        type: notification.type || notification.Type || '',
                    },
                }));
            }
            if (notification?.type === 'MentorVerification' || notification?.Type === 'MentorVerification') {
                queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] });
                window.dispatchEvent(new CustomEvent('rikipath:mentor-verification', { detail: notification }));
            }
        };

        connection.on('ReceiveNotification', handleRefresh);
        connection.on('NotificationReceived', handleRefresh);
        connection.on('NotificationRead', handleRefresh);
        connection.on('UnreadCountChanged', handleRefresh);
        connection.onreconnected(() => {
            handleRefresh();
            connection.invoke('RequestSync').catch(() => {});
        });

        let disposed = false;
        const started = connection.start().then(() => {
            if (disposed) return undefined;
            return connection.invoke('RequestSync').catch(() => {});
        }).catch(() => {
            if (!disposed) handleRefresh();
        });

        const refreshTimer = window.setInterval(() => {
            if (!disposed) handleRefresh();
        }, 60000);

        return () => {
            disposed = true;
            window.clearInterval(refreshTimer);
            started.finally(() => connection.stop());
        };
    }, []);
}
