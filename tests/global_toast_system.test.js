import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_DURATION,
  MAX_LOADING_WAIT_MS,
  clearToasts,
  consumeFlashToast,
  dismissToast,
  getToasts,
  notify,
  pushToast,
  registerToastEngine,
  unregisterToastEngine,
} from '@/components/ui/feedbackStore.js';
import { translateText } from '@/locales/locale.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

afterEach(() => {
  clearToasts();
  unregisterToastEngine();
});

describe('feedbackStore & react-hot-toast adapter', () => {
  it('configures sensible default durations and delegates show/dismiss/dismissAll to engine', () => {
    assert.equal(DEFAULT_DURATION.success, 3000);
    assert.equal(DEFAULT_DURATION.info, 3500);
    assert.equal(DEFAULT_DURATION.warning, 4500);
    assert.equal(DEFAULT_DURATION.error, 4500);
    assert.equal(DEFAULT_DURATION.loading, Infinity);
    assert.equal(MAX_LOADING_WAIT_MS, 45_000);

    const calls = { show: [], dismiss: [], dismissAll: 0 };
    registerToastEngine({
      show: (item) => calls.show.push(item),
      dismiss: (id) => calls.dismiss.push(id),
      dismissAll: () => { calls.dismissAll += 1; },
    });

    const id = notify.success('Đã lưu cài đặt.', '', { key: 'settings-ok' });
    assert.ok(id);
    assert.equal(calls.show.length, 1);
    assert.equal(calls.show[0].tone, 'success');
    assert.equal(calls.show[0].duration, 3000);
    assert.equal(getToasts().length, 1);

    dismissToast(id);
    assert.deepEqual(calls.dismiss, [id]);
    assert.equal(getToasts().length, 0);

    notify.info('Thông tin mới');
    clearToasts();
    assert.equal(calls.dismissAll, 1);
    assert.equal(getToasts().length, 0);
  });

  it('deduplicates rapid identical toasts within 4000ms unless replace is true, and caps visible stack at 4', () => {
    const dismissed = [];
    registerToastEngine({
      show: () => {},
      dismiss: (id) => dismissed.push(id),
      dismissAll: () => {},
    });

    const id1 = pushToast({ tone: 'error', title: 'Lỗi mạng', key: 'net-err', now: 10_000 });
    const dup = pushToast({ tone: 'error', title: 'Lỗi mạng', key: 'net-err', now: 12_000 });
    assert.ok(id1);
    assert.equal(dup, null);

    // Explicitly replacing on the same key updates in place even inside the window
    const updated = pushToast({ tone: 'success', title: 'Đã kết nối lại', key: 'net-err', replace: true, now: 12_500 });
    assert.equal(updated, id1);
    assert.equal(getToasts()[0].tone, 'success');

    // Beyond 4000ms dedupe window after dismissing, same key is accepted again
    dismissToast(id1);
    const afterWindow = pushToast({ tone: 'error', title: 'Lỗi mạng', key: 'net-err', now: 16_600 });
    assert.ok(afterWindow);

    // Cap visible toasts at MAX_VISIBLE = 4 and evict oldest from engine
    const ids = [afterWindow];
    for (let i = 0; i < 4; i += 1) {
      ids.push(notify.info(`Mục ${i}`, '', { key: `cap-${i}` }));
    }
    assert.equal(getToasts().length, 4);
    assert.ok(dismissed.includes(ids[0]), 'oldest toast should be dismissed from engine on overflow');
  });

  it('transitions notify.promise from loading to success on the same toast ID', async () => {
    const shown = [];
    registerToastEngine({
      show: (item) => shown.push({ ...item }),
      dismiss: () => {},
      dismissAll: () => {},
    });

    const value = await notify.promise(
      async () => ({ saved: true }),
      { loading: 'Đang lưu…', success: 'Đã lưu xong!' },
      { key: 'save-flow' },
    );

    assert.deepEqual(value, { saved: true });
    assert.equal(shown.length, 2);
    assert.equal(shown[0].id, shown[1].id);
    assert.equal(shown[0].tone, 'loading');
    assert.equal(shown[1].tone, 'success');
    assert.equal(shown[1].title, 'Đã lưu xong!');
    assert.equal(getToasts().length, 1);
  });

  it('suppresses duplicate concurrent loading toast on identical key', async () => {
    const shown = [];
    registerToastEngine({
      show: (item) => shown.push({ ...item }),
      dismiss: () => {},
      dismissAll: () => {},
    });

    let resolveFirst;
    const p1 = notify.promise(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
      { loading: 'Đang đồng bộ…', success: 'Đã đồng bộ' },
      { key: 'sync-op' },
    );
    const p2 = notify.promise(
      async () => 'dup-result',
      { loading: 'Đang đồng bộ…', success: 'Đã đồng bộ' },
      { key: 'sync-op' },
    );

    assert.equal(await p2, 'dup-result');
    assert.equal(shown.filter((x) => x.tone === 'loading').length, 1);

    resolveFirst('first-result');
    assert.equal(await p1, 'first-result');
  });

  it('transitions soft-failed envelopes and API errors cleanly to warning/error and never claims success', async () => {
    const shown = [];
    registerToastEngine({
      show: (item) => shown.push({ ...item }),
      dismiss: () => {},
      dismissAll: () => {},
    });

    await assert.rejects(
      () => notify.promise(
        async () => ({ isSuccess: false, errorMessage: 'Hết chỗ trống' }),
        { loading: 'Đang đăng ký…', success: 'Thành công!' },
        { key: 'soft-fail-1' },
      ),
      /Hết chỗ trống/,
    );
    assert.equal(shown.at(-1).tone, 'error');
    assert.equal(shown.some((x) => x.tone === 'success'), false);

    await assert.rejects(
      () => notify.promise(
        async () => ({ success: false, error: 'Xung đột lịch dạy' }),
        { loading: 'Đang lưu…', success: 'Đã lưu' },
        { key: 'soft-fail-2' },
      ),
      /Xung đột lịch dạy/,
    );
    assert.equal(shown.at(-1).tone, 'error');

    const rateErr = Object.assign(new Error('Too many requests'), { status: 429 });
    await assert.rejects(
      () => notify.promise(Promise.reject(rateErr), { loading: 'Đang gửi…', success: 'OK' }, { key: 'rate-err' }),
    );
    assert.equal(shown.at(-1).tone, 'warning');
  });

  it('dismisses loading toast cleanly on cancelled promise or safety timeout', async () => {
    const dismissed = [];
    registerToastEngine({
      show: () => {},
      dismiss: (id) => dismissed.push(id),
      dismissAll: () => {},
    });

    const cancelErr = Object.assign(new Error('Cancelled'), { isCancelled: true });
    await assert.rejects(
      () => notify.promise(Promise.reject(cancelErr), { loading: 'Đang tải…' }, { key: 'cancel-op' }),
    );
    assert.equal(getToasts().length, 0);
    assert.equal(dismissed.length, 1);

    // Safety timer cleans up stuck loading toast
    const stuckId = notify.loading('Đang chờ lâu…', '', { key: 'stuck-op', maxWaitMs: 30 });
    assert.equal(getToasts().length, 1);
    await new Promise((resolve) => setTimeout(resolve, 65));
    assert.equal(getToasts().length, 0);
    assert.ok(dismissed.includes(stuckId));
  });

  it('persists flash toast across reload and translates shared keys cleanly for vi/en/ja', () => {
    const store = new Map();
    const prevStorage = globalThis.sessionStorage;
    globalThis.sessionStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };

    try {
      notify.flash('success', 'Bạn đã đăng xuất thành công.', '', { key: 'logout-ok' });
      const shownId = consumeFlashToast();
      assert.ok(shownId);
      assert.equal(getToasts().length, 1);
      assert.equal(consumeFlashToast(), null, 'flash toast must be consumed once');
    } finally {
      globalThis.sessionStorage = prevStorage;
    }

    assert.equal(
      translateText('Bạn đã đăng xuất thành công.', 'en'),
      'You have signed out successfully.',
    );
    assert.equal(
      translateText('Bạn đã đăng xuất thành công.', 'ja'),
      'ログアウトしました。',
    );
    assert.equal(translateText('Đã lưu thay đổi.', 'en'), 'Changes saved.');
  });
});

describe('Global toast architecture & domain safety contracts', () => {
  it('mounts exactly one react-hot-toast <HotToaster> inside FeedbackProvider at App root', () => {
    const overlaySrc = readSrc('src/components/ui/overlay.jsx');
    assert.match(overlaySrc, /Toaster as HotToaster/);
    assert.match(overlaySrc, /<HotToaster[\s\S]*containerClassName="rp-toaster-root"/);
    assert.match(overlaySrc, /consumeFlashToast\(\)/);

    const appSrc = readSrc('src/app/App.jsx');
    assert.match(appSrc, /<FeedbackProvider>[\s\S]*<RoutedApp \/>/);
    assert.match(appSrc, /<Routes>[\s\S]*<\/Routes>/);
    assert.match(appSrc, /key:\s*'session-expired'/);

    const pageFiles = listFiles(path.join(ROOT, 'src/pages'));
    for (const file of pageFiles) {
      if (!file.endsWith('.jsx')) continue;
      const content = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(content, /<HotToaster\b|<Toaster\b/, `Page ${file} must not mount its own Toaster`);
    }
  });

  it('enforces Sakura toast ARIA accessibility, non-monotone semantic styling, and reduced-motion CSS', () => {
    const sakuraSrc = readSrc('src/components/ui/SakuraToast.jsx');
    assert.match(sakuraSrc, /role=\{isError \? 'alert' : 'status'\}/);
    assert.match(sakuraSrc, /aria-live=\{isError \? 'assertive' : 'polite'\}/);
    assert.match(sakuraSrc, /aria-atomic="true"/);
    assert.match(sakuraSrc, /aria-label=\{tr\('Đóng thông báo'\)\}/);
    assert.doesNotMatch(sakuraSrc, /autoFocus/);

    // Non-pink semantic status colors for success, error, warning, info
    assert.match(sakuraSrc, /emerald-/);
    assert.match(sakuraSrc, /rose-/);
    assert.match(sakuraSrc, /amber-/);
    assert.match(sakuraSrc, /sky-/);

    const css = readSrc('src/styles/tokens.css');
    assert.match(css, /\.rp-toaster-root/);
    const overlay = readSrc('src/components/ui/overlay.jsx');
    assert.match(overlay, /TOAST_Z = 2147483000/);
    assert.match(overlay, /narrow \? 'top-center' : 'top-right'/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rp-toast-enter/);
  });

  it('rejects soft-fail { success: false } and { isSuccess: false } API envelopes centrally', () => {
    const clientSrc = readSrc('src/api/client.js');
    assert.match(clientSrc, /data\?\.isSuccess === false \|\| data\?\.success === false/);
  });

  it('verifies auth logout flash, login toast, and network vs credential auth error distinction', () => {
    const authCtx = readSrc('src/app/auth/AuthContext.jsx');
    assert.match(authCtx, /notify\.flash\([\s\S]*?'Bạn đã đăng xuất thành công\.'/);
    assert.match(authCtx, /if\s*\(\s*getSession\(\)\s*\)/);

    const signIn = readSrc('src/pages/auth/useCompleteSignIn.js');
    assert.match(signIn, /key:\s*'auth-login-success'/);

    const authPage = readSrc('src/pages/auth/Auth.jsx');
    assert.match(authPage, /key:\s*'auth-login-error'/);
    assert.match(authPage, /Không thể kết nối đến hệ thống\. Vui lòng thử lại\./);
  });

  it('never claims Paid on PayOS redirect or Pending polling in StudyPayment, Receipt, or StudyCoursesPage', () => {
    const studyPayment = readSrc('src/pages/learner/StudyPayment.jsx');
    assert.match(studyPayment, /notify\.info\(\s*tr\('Đang chuyển sang PayOS'\)/);
    assert.doesNotMatch(studyPayment, /notify\.success\([^)]*Thanh toán thành công/);

    const receipt = readSrc('src/pages/learner/StudyPaymentReceipt.jsx');
    assert.match(receipt, /announcedRef\.current === status/);
    assert.match(receipt, /status === 'Paid'[\s\S]*notify\.success\('Thanh toán thành công'/);
    assert.match(receipt, /status === 'Pending'[\s\S]*notify\.info\('Đang xác nhận thanh toán'/);

    const courses = readSrc('src/pages/shared/StudyCoursesPage.jsx');
    assert.match(courses, /Thanh toán đã được xác nhận\. Bạn đã ghi danh thành công!/);
    assert.match(courses, /paymentState === 'Confirmed' \|\| res\?\.paymentStatus === 'Paid'/);
  });
});
