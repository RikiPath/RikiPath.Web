import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES } from '@/app/routes/routeTable.js';
import { api } from '@/api/client.js';
import { requestPasswordReset, resetPassword } from '@/features/auth/api/authApi.js';

describe('Password recovery contract', () => {
  it('keeps request and reset screens public', () => {
    assert.equal(ROUTES.find((route) => route.path === '/forgot-password')?.page, 'ForgotPassword');
    assert.equal(ROUTES.find((route) => route.path === '/reset-password')?.page, 'ResetPassword');
    assert.equal(ROUTES.find((route) => route.path === '/reset-password')?.roles, undefined);
  });

  it('submits the recovery email and reset token only in POST bodies', async () => {
    const originalAdapter = api.defaults.adapter;
    const requests = [];
    api.defaults.adapter = async (config) => {
      requests.push({ method: config.method, url: config.url, body: JSON.parse(config.data) });
      return { data: { isSuccess: true }, status: 200, statusText: 'OK', headers: {}, config };
    };
    try {
      await requestPasswordReset('learner@example.com');
      await resetPassword({ token: 'signed-token', newPassword: 'new-secret', confirmPassword: 'new-secret' });
    } finally {
      api.defaults.adapter = originalAdapter;
    }

    assert.deepEqual(requests, [
      { method: 'post', url: '/Auth/forgot-password', body: { email: 'learner@example.com' } },
      {
        method: 'post', url: '/Auth/reset-password',
        body: { token: 'signed-token', newPassword: 'new-secret', confirmPassword: 'new-secret' },
      },
    ]);
  });
});
