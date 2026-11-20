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
});
