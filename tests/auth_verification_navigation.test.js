import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Registration verification navigation', () => {
  it('keeps the main login footer focused on account creation', () => {
    const login = read('src/pages/auth/Auth.jsx');
    assert.doesNotMatch(login, /question:\s*tr\('Chưa xác thực tài khoản\?'\)/);
    assert.match(login, /if \(unverified\) savePendingVerify\(/);
  });

  it('requires a pending verification context that matches the URL', () => {
    const verify = read('src/pages/auth/VerifyEmail.jsx');
    assert.match(verify, /const email = pending\?\.email \|\| ''/);
    assert.match(verify, /requestedEmail\.trim\(\)\.toLowerCase\(\) === email\.trim\(\)\.toLowerCase\(\)/);
    assert.match(verify, /if \(!validSession \|\| !address/);
  });

  it('renders GoogleSignIn on both Login and Register with Hoặc divider, Tiếp tục với Google button, and safe account linking', () => {
    const login = read('src/pages/auth/Auth.jsx');
    const register = read('src/pages/auth/Register.jsx');
    const google = read('src/pages/auth/GoogleSignIn.jsx');
    const authApi = read('src/features/auth/api/authApi.js');

    assert.match(login, /<GoogleSignIn\s+mode="login"/);
    assert.match(register, /<GoogleSignIn\s+mode="register"/);
    assert.match(authApi, /export function getGoogleAuthConfig\(\)\s*\{\s*return api\.get\('\/Auth\/google-config'\);\s*\}/);
    assert.match(authApi, /export function continueWithGoogle\(credential,\s*currentPassword\)\s*\{\s*return api\.post\('\/Auth\/google'/);

    assert.ok(google.includes('data-testid="google-signin-button"'), 'GoogleSignIn must render the accessible button trigger');
    assert.ok(google.includes("tr('Hoặc')"), 'GoogleSignIn must render the Hoặc divider');
    assert.ok(google.includes("tr('Tiếp tục với Google')"), 'GoogleSignIn must display Tiếp tục với Google');
    assert.ok(google.includes('h-12 w-full'), 'Google button must match the 48px (h-12) full-width primary auth button height');
    assert.ok(google.includes('GOOGLE_LINK_PASSWORD_REQUIRED'), 'GoogleSignIn must require existing RikiPath password when email collides');
    assert.ok(google.includes('GOOGLE_LINK_PASSWORD_INVALID'), 'GoogleSignIn must keep password prompt open on invalid link password');
    assert.ok(google.includes('getGoogleAuthConfig'), 'GoogleSignIn must resolve Client ID from Backend when build env is unset');
  });
});
