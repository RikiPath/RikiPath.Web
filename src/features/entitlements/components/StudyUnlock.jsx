import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Headphones, LockKeyhole, NotebookPen, Sparkles } from 'lucide-react';
import { SpotArt } from '@/assets/illustrations/SpotArt.jsx';
import { Button, Modal, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { ACCESS } from '../featureAccess.js';
import { useStudyAccess } from '../useStudyAccess.js';
import { LOCK_REASON, UnlockContext, plansLinkState, unlockInfoFor, useStudyUnlock } from '../studyUnlock.js';


const BENEFITS = [
  { icon: BookOpen, text: 'Toàn bộ bài học JLPT theo cấp độ, kèm bài luyện tập' },
  { icon: Headphones, text: 'Bài nghe hiểu và đọc hiểu có câu hỏi luyện tập' },
  { icon: NotebookPen, text: 'Sổ tay từ vựng và Hán tự cá nhân' },
  { icon: Sparkles, text: 'Lượt góp ý AI đi kèm theo từng gói' },
];

// Status-specific unlock condition. Never shown for loading/error: those are not "locked".
const CONDITION = {
  [ACCESS.FREE]: 'Mở khóa khi tài khoản có gói tự học đang hiệu lực. Quyền được kích hoạt sau khi hệ thống xác nhận thanh toán PayOS.',
  [ACCESS.EXPIRED]: 'Gói tự học của bạn đã hết hạn. Gia hạn gói để tiếp tục học; tiến độ đã lưu vẫn được giữ nguyên.',
  [ACCESS.PENDING_PAYMENT]: 'Giao dịch của bạn đang chờ xác nhận. Tính năng sẽ tự mở khi hệ thống xác nhận thanh toán.',
};

/** Shared body for the dialog and the direct-URL locked state, so both say exactly the same thing. */
export function StudyUnlockContent({ featureLabel, description, status, compact = false, headingAs: Heading = 'p', children }) {
  const { tr, trf } = useLocale();
  return (
    <div className={cx('relative', compact ? '' : 'sm:flex sm:items-start sm:gap-6')}>
      <div aria-hidden="true" className={cx('relative mx-auto flex shrink-0 items-center justify-center', compact ? 'mb-3 h-[104px] w-[120px]' : 'mb-4 h-[132px] w-[150px] sm:mx-0 sm:mb-0')}>
        <span className="rp-unlock-glow absolute inset-2 rounded-full bg-[radial-gradient(closest-side,rgba(247,182,200,0.55),transparent)]" />
        <SpotArt name="locked" size={compact ? 116 : 146} className="relative" />
        <svg viewBox="0 0 20 20" className="rp-unlock-petal absolute right-1 top-2 h-4 w-4">
          <path d="M10 1.5c3.6 2.3 6 5.6 5.5 9.4-.4 3.4-3 6.1-5.5 7.6-2.5-1.5-5.1-4.2-5.5-7.6C4 7.1 6.4 3.8 10 1.5Z" fill="#F7B6C8" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-rp-brand-tint px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rp-brand-strong">
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> {tr('Cần gói tự học JLPT')}
        </p>
        <Heading className={cx('mt-2 font-bold text-rp-text', compact ? 'text-[17px] leading-6' : 'text-xl leading-7 sm:text-2xl')}>
          {trf('Mở khóa {0}', { 0: tr(featureLabel) })}
        </Heading>
        {description && <p className="mt-1.5 text-sm leading-6 text-rp-text-2">{tr(description)}</p>}
        <ul className="mt-3.5 grid gap-2 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2 rounded-xl bg-rp-bg-2 px-3 py-2 text-[13px] leading-5 text-rp-text-2">
              <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" />
              {tr(text)}
            </li>
          ))}
        </ul>
        {CONDITION[status] && (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5 text-rp-text-muted">
            {status === ACCESS.PENDING_PAYMENT
              ? <Clock3 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              : <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            {tr(CONDITION[status])}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Contextual unlock dialog. Navigates to /plans only when the learner explicitly chooses to.
 * Keyboard: focus-trapped by Modal, Escape / backdrop / "Để sau" close it. Works with touch.
 */
export function StudyUnlockDialog({ target, status, onClose }) {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const open = Boolean(target);
  const explore = () => {
    const info = target;
    onClose();
    navigate('/plans/', { state: plansLinkState(info.path, info.featureLabel) });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr('Tính năng thuộc gói tự học')}
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>{tr('Để sau')}</Button>
          <Button onClick={explore} iconRight={ArrowRight}>{tr('Khám phá gói tự học')}</Button>
        </>
      )}
    >
      {target && <StudyUnlockContent compact featureLabel={target.featureLabel} description={target.description} status={status} />}
    </Modal>
  );
}

/* ------------------------------------------------------------------ app-wide controller */

/**
 * Hosts one unlock dialog for a whole shell. Consumers call `requestUnlock(to, label)`.
 * Falls back to a local dialog when used outside a provider (e.g. a page rendered in isolation).
 */
export function StudyUnlockProvider({ children }) {
  const access = useStudyAccess();
  const [target, setTarget] = useState(null);
  const requestUnlock = useCallback((to, label) => setTarget(unlockInfoFor(to, label)), []);
  const value = useMemo(() => ({ access, requestUnlock }), [access, requestUnlock]);
  return (
    <UnlockContext.Provider value={value}>
      {children}
      <StudyUnlockDialog target={target} status={access.status} onClose={() => setTarget(null)} />
    </UnlockContext.Provider>
  );
}

/**
 * Drop-in replacement for <Link> on shortcuts that may point at a self-study route.
 * Locked → a button with the same look that opens the unlock dialog (plus a small lock glyph);
 * open / loading / error → a normal link (the route gate + Backend still protect the content).
 */
export function FeatureLink({ to, label, className, children, showLock = true, state, ...rest }) {
  const ctx = useStudyUnlock();
  const fallback = useStudyAccess();
  const { tr } = useLocale();
  const [localTarget, setLocalTarget] = useState(null);
  const access = ctx?.access ?? fallback;
  if (access.lockStateFor(to) !== 'locked') {
    return <Link to={to} state={state} className={className} {...rest}>{children}</Link>;
  }
  const open = () => (ctx ? ctx.requestUnlock(to, label) : setLocalTarget(unlockInfoFor(to, label)));
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        data-locked="true"
        aria-label={label ? `${tr(label)} — ${tr(LOCK_REASON)}` : undefined}
        title={tr(LOCK_REASON)}
        className={cx(className, 'relative text-left')}
      >
        {children}
        {showLock && (
          <span aria-hidden="true" className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-rp-surface/90 text-rp-text-muted ring-1 ring-rp-line">
            <LockKeyhole className="h-3 w-3" />
          </span>
        )}
      </button>
      {!ctx && <StudyUnlockDialog target={localTarget} status={access.status} onClose={() => setLocalTarget(null)} />}
    </>
  );
}

/** Link-styled helper for the direct-URL locked state. */
export function ExplorePlansLink({ path, featureLabel, className, children }) {
  return (
    <Link to="/plans/" state={plansLinkState(path, featureLabel)} className={className}>
      {children}
    </Link>
  );
}
