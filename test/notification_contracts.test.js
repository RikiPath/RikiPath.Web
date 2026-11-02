import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '../src/api/notificationApi.js';
import { api } from '../src/api/client.js';

describe('Notification API contract endpoints', () => {
    let captured = null;

    // Mock API client methods
    const originalGet = api.get;
    const originalPut = api.put;
    const originalPatch = api.patch;

    test.beforeEach(() => {
        captured = null;
        api.get = async (url, config) => {
            captured = { method: 'GET', url, config };
            return { result: { items: [], total: 0 } };
        };
        api.put = async (url, data, config) => {
            captured = { method: 'PUT', url, data, config };
            return { isSuccess: true };
        };
        api.patch = async (url, data, config) => {
            captured = { method: 'PATCH', url, data, config };
            return { isSuccess: true };
        };
    });

    test.afterEach(() => {
        api.get = originalGet;
        api.put = originalPut;
        api.patch = originalPatch;
    });

    test('getNotifications queries /Notification with params', async () => {
        await getNotifications({ page: 2, pageSize: 10, onlyUnread: true });
        assert.equal(captured.method, 'GET');
        assert.equal(captured.url, '/Notification');
        assert.deepEqual(captured.config.params, { page: 2, pageSize: 10, onlyUnread: true });
    });

    test('getUnreadNotificationCount queries /Notification/unread-count', async () => {
        await getUnreadNotificationCount();
        assert.equal(captured.method, 'GET');
        assert.equal(captured.url, '/Notification/unread-count');
    });

    test('markNotificationAsRead calls /Notification/:id/read', async () => {
        await markNotificationAsRead(42);
        assert.equal(captured.url, '/Notification/42/read');
    });

    test('markAllNotificationsAsRead calls /Notification/read-all', async () => {
        await markAllNotificationsAsRead();
        assert.equal(captured.url, '/Notification/read-all');
    });
});
