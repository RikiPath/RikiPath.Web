// "Ghi nhớ đăng nhập": where the session is stored and what the login form restores.
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get size() { return map.size; },
  };
}

globalThis.window = globalThis.window || {};
window.localStorage = memoryStorage();
window.sessionStorage = memoryStorage();
window.location = window.location || { search: '', href: 'http://localhost/', pathname: '/', hash: '' };

const session = await import('@/app/auth/session.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SAMPLE = { accessToken: 'header.payload.sig', email: 'learner@example.test', role: 'Learner' };

describe('remember me', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('remembered sign-in persists in localStorage (survives closing the browser)', () => {
    session.saveSession(SAMPLE, true);
    assert.ok(window.localStorage.getItem('rikipath.auth'));
    assert.equal(window.sessionStorage.getItem('rikipath.auth'), null);
    assert.equal(session.getSession().email, SAMPLE.email);
  });

  it('unremembered sign-in lives only in sessionStorage (ends with the tab)', () => {
    session.saveSession(SAMPLE, false);
    assert.equal(window.localStorage.getItem('rikipath.auth'), null);
    assert.ok(window.sessionStorage.getItem('rikipath.auth'));
  });

  it('patching a session keeps its remember mode', () => {
    session.saveSession(SAMPLE, false);
    session.patchSession({ fullName: 'Hana' });
    assert.equal(window.localStorage.getItem('rikipath.auth'), null);
    assert.equal(JSON.parse(window.sessionStorage.getItem('rikipath.auth')).fullName, 'Hana');
  });

  it('remembers the email (never the password) and keeps it after logout', () => {
    session.saveRememberedLogin({ email: ' learner@example.test ', remember: true });
    session.clearSession();
    assert.deepEqual(session.getRememberedLogin(), { email: 'learner@example.test', remember: true });
    assert.doesNotMatch(window.localStorage.getItem('rikipath.rememberLogin'), /password/i);
  });

  it('unchecking forgets the email and restores the unchecked box', () => {
    session.saveRememberedLogin({ email: 'learner@example.test', remember: true });
    session.saveRememberedLogin({ email: 'learner@example.test', remember: false });
    assert.deepEqual(session.getRememberedLogin(), { email: '', remember: false });
  });

  it('defaults to checked with no email, and survives corrupt storage', () => {
    assert.deepEqual(session.getRememberedLogin(), { email: '', remember: true });
    window.localStorage.setItem('rikipath.rememberLogin', '{oops');
    assert.deepEqual(session.getRememberedLogin(), { email: '', remember: true });
  });

  it('login form and sign-in completion are wired to the remembered choice', () => {
    const auth = readSrc('src/pages/auth/Auth.jsx');
    assert.match(auth, /useState\(getRememberedLogin\)/);
    assert.match(auth, /useState\(remembered\.remember\)/);
    assert.match(auth, /completeSignIn\(data, remember\)/);
    const complete = readSrc('src/pages/auth/useCompleteSignIn.js');
    assert.match(complete, /login\(nextSession, remember\);\s*saveRememberedLogin\(\{ email: result\.email, remember \}\);/);
  });
});
