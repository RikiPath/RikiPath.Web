import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { getSession } from '../auth/session.js';
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
        const token = getSession()?.accessToken || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        if (!token) return;

        const hubUrl = '/hubs/notification';

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token,
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connection.on('ReceiveNotification', () => {
            // Invalidate query để TanStack Query tự làm mới danh sách & số lượng chưa đọc
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        });

        connection
            .start()
            .catch((err) => console.error('SignalR NotificationHub error:', err));

        return () => {
            connection.stop();
        };
    }, []);
}