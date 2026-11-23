import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getAvatarInitials,
  isExternalAvatarUrl,
  normalizeAvatarUrl,
  resolveAvatarDimension,
} from '@/components/ui/userAvatarLogic.js';

const WEB_ROOT = process.cwd();
const BACKEND_ROOT = path.resolve(WEB_ROOT, '..', 'RikiPath.Backend');

function readWeb(relPath) {
  return fs.readFileSync(path.join(WEB_ROOT, relPath), 'utf8');
}

describe('UserAvatar & Google OAuth Profile Synchronization', () => {
  it('validates safe avatar URLs, detects external CDN URLs, and computes UTF-8 initials cleanly', () => {
    assert.equal(
      normalizeAvatarUrl('  https://lh3.googleusercontent.com/a/ACg8ocTest=s96-c  '),
      'https://lh3.googleusercontent.com/a/ACg8ocTest=s96-c',
    );
    assert.equal(normalizeAvatarUrl('/uploads/avatars/avatar-1.png'), '/uploads/avatars/avatar-1.png');
    assert.equal(normalizeAvatarUrl('   '), null);
    assert.equal(normalizeAvatarUrl('javascript:alert(1)'), null);
    assert.equal(normalizeAvatarUrl('//evil.example/a.png'), null);

    assert.equal(isExternalAvatarUrl('https://lh3.googleusercontent.com/a/test=s96-c'), true);
    assert.equal(isExternalAvatarUrl('/uploads/avatars/avatar-1.png'), false);

    assert.equal(resolveAvatarDimension('sm'), 32);
    assert.equal(resolveAvatarDimension('lg'), 56);
    assert.equal(resolveAvatarDimension(44), 44);

    assert.equal(getAvatarInitials('Lương Minh'), 'LM');
    assert.equal(getAvatarInitials('Nguyễn Văn An'), 'NA');
    assert.equal(getAvatarInitials('Minh'), 'M');
    assert.equal(getAvatarInitials('さくら 太郎'), 'さ太');
    assert.equal(getAvatarInitials('minh.qa@gmail.com'), 'MQ');
    assert.equal(getAvatarInitials('minh@gmail.com'), 'M');
    assert.equal(getAvatarInitials(''), '?');
  });

  it('enforces Google picture persistence without overwriting custom avatars or user-edited names in Backend', () => {
    const googleAuthPath = path.join(BACKEND_ROOT, 'RikiPath.Application', 'Services', 'AuthService.Google.cs');
    const src = fs.readFileSync(googleAuthPath, 'utf8');

    assert.match(src, /AvatarUrl\s*=\s*ResolveValidatedGoogleAvatarUrl\(identity\.Picture\)/);
    assert.match(src, /ApplyGoogleProfileSync\(linkedAccount,\s*identity\)/);
    assert.match(src, /ApplyGoogleProfileSync\(account,\s*identity\)/);
    assert.match(src, /IsTrustedGoogleAvatarHost/);
    assert.match(src, /!hasCustomAvatar/);
    assert.match(src, /Uri\.UriSchemeHttps/);
  });

  it('uses AuthContext as Single Source of Truth, re-syncs /Auth/me across reloads, and clears cache on switch/logout', () => {
    const authCtx = readWeb('src/app/auth/AuthContext.jsx');
    const completeSignIn = readWeb('src/pages/auth/useCompleteSignIn.js');
    const profileWorkspace = readWeb('src/features/profile/components/ProfileWorkspace.jsx');

    assert.match(authCtx, /const \[meSyncedToken,\s*setMeSyncedToken\]\s*=\s*useState\(null\)/);
    assert.match(authCtx, /getAuthMe\(\)/);
    assert.match(authCtx, /getSession\(\)\?\.accessToken !== token/);
    assert.match(authCtx, /window\.addEventListener\('storage',\s*handleStorageChange\)/);
    assert.match(authCtx, /queryClient\.clear\(\)/);
    assert.match(authCtx, /syncUserProfile/);

    assert.match(completeSignIn, /queryClient\.clear\(\)/);
    assert.match(completeSignIn, /syncUserProfile/);

    assert.match(profileWorkspace, /syncUserProfile\(profile\)/);
    assert.match(profileWorkspace, /syncUserProfile\(updatedProfile\)/);
  });

  it('renders unified UserAvatar in Header, redesigned Account Dropdown, ProfileHeader, and AvatarUploaderModal', () => {
    const userAvatarSrc = readWeb('src/components/ui/UserAvatar.jsx');
    const appShellSrc = readWeb('src/layouts/AppShell.jsx');
    const profileHeaderSrc = readWeb('src/features/profile/components/ProfileHeader.jsx');
    const modalSrc = readWeb('src/features/profile/components/AvatarUploaderModal.jsx');

    assert.match(userAvatarSrc, /referrerPolicy=\{external \? 'no-referrer' : undefined\}/);
    assert.match(userAvatarSrc, /onError=\{\(\) => setFailedSrc\(normalizedSrc\)\}/);
    assert.match(userAvatarSrc, /animate-pulse/);

    assert.match(appShellSrc, /data-testid="header-profile-trigger"[\s\S]*<UserAvatar/);
    assert.match(appShellSrc, /data-testid="account-dropdown-panel"[\s\S]*<UserAvatar[\s\S]*size=\{44\}/);
    assert.match(appShellSrc, /Hồ sơ của tôi/);
    assert.match(appShellSrc, /Đăng xuất/);
    assert.doesNotMatch(appShellSrc, /OAuth|GoogleSubject/i);

    assert.match(profileHeaderSrc, /<UserAvatar/);
    assert.match(modalSrc, /<UserAvatar/);
  });
});
