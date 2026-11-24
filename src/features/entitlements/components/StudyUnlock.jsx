import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, LockKeyhole, NotebookPen, PauseCircle, Sparkles } from 'lucide-react';
import { Button, Modal, cx } from '@/components/ui';
import { LearningPathUnlockGuide } from '@/features/learning-path/components/LearningPathUnlockGuide.jsx';
import { useLocale } from '@/locales/locale.js';
import { ACCESS, ACCESS_REASON, LOCK_KIND, accessReasonForKind, featureLockKind } from '../featureAccess.js';
import { useStudyAccess } from '../useStudyAccess.js';
import FeatureAccessModal, { FeatureAccessContent } from './FeatureAccessModal.jsx';
import { LOCK_REASON, UnlockContext, plansLinkState, unlockInfoFor, useStudyUnlock } from '../studyUnlock.js';


const BENEFITS = [
  { icon: BookOpen, text: 'Toàn bộ bài học JLPT theo cấp độ, kèm bài luyện tập' },
  { icon: Headphones, text: 'Bài nghe hiểu và đọc hiểu có câu hỏi luyện tập' },
  { icon: NotebookPen, text: 'Lưu tiến độ học tập, đánh dấu & đồng bộ ôn tập SRS' },
  { icon: Sparkles, text: 'Lượt góp ý AI đi kèm theo từng gói' },
];

const PLAN_DESCRIPTION = 'Bạn cần mua gói tự học để mở khóa tính năng này và bắt đầu học tập.';
const CREDIT_DESCRIPTION = 'Bạn cần có lượt AI để sử dụng tính năng này.';
const CREDIT_NOTE = 'Lượt AI được cộng vào tài khoản sau khi thanh toán thành công.';
/** Purchase CTA: AI credits are sold as plans on /plans too, so both lock causes lead to the same page. */
const BUY_LABEL = 'Mua gói ngay';

// Status-specific unlock condition. Never shown for loading/error: those are not "locked".
const CONDITION = {
  [ACCESS.FREE]: 'Quyền truy cập sẽ được kích hoạt sau khi thanh toán thành công.',
  [ACCESS.EXPIRED]: 'Gói tự học của bạn đã hết hạn. Gia hạn gói để tiếp tục học; tiến độ đã lưu vẫn được giữ nguyên.',
  [ACCESS.PENDING_PAYMENT]: 'Giao dịch của bạn đang chờ xác nhận. Tính năng sẽ tự mở khi hệ thống xác nhận thanh toán.',
};

/** Copy for one lock cause, shared by the dialog and the direct-URL locked page. */
function accessCopy({ reason, featureLabel, description, status, tr, trf }) {
  if (reason === ACCESS_REASON.CREDIT) {
    return {
      heading: trf('Sử dụng {0}', { 0: tr(featureLabel) }),
      description: CREDIT_DESCRIPTION,
      note: CREDIT_NOTE,
      noteIcon: 'check',
    };
  }
  return {
    heading: trf('Mở khóa {0}', { 0: tr(featureLabel) }),
    description: PLAN_DESCRIPTION,
    detail: description && description !== PLAN_DESCRIPTION ? description : undefined,
    benefits: BENEFITS,
    note: CONDITION[status],
    noteIcon: status === ACCESS.PENDING_PAYMENT ? 'clock' : 'check',
  };
}

/** Direct-URL locked page body (RequireStudyPlan): same art, badge and wording as the dialog. */
export function StudyUnlockContent({ featureLabel, description, status, kind = LOCK_KIND.PLAN, icon, headingAs = 'p', children }) {
  const { tr, trf } = useLocale();
  const reason = accessReasonForKind(kind);
  const copy = accessCopy({ reason, featureLabel, description, status, tr, trf });
  return (
    <FeatureAccessContent reason={reason} icon={icon} layout="split" headingAs={headingAs} {...copy}>
      {children}
    </FeatureAccessContent>
  );
}

/**
 * Contextual unlock dialog. Navigates to /plans only when the learner explicitly chooses to.
 * Keyboard: focus-trapped by Modal, Escape / backdrop / "Để sau" close it. Works with touch.
 */
export function StudyUnlockDialog({ target, status, onClose }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const open = Boolean(target);
  const buy = () => {
    const info = target;
    onClose();
    navigate('/plans/', { state: plansLinkState(info.path, info.featureLabel) });
  };

  // An Admin suspension is not a purchase problem: no plan CTA, no "you lack a plan/credits" wording.
  if (target?.kind === LOCK_KIND.ADMIN_DISABLED) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={tr('Tính năng đang tạm ngừng cung cấp')}
        size="sm"
        footer={<Button onClick={onClose}>{tr('Đã hiểu')}</Button>}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rp-muted text-rp-text-2">
            <PauseCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-rp-text">{tr(target.featureLabel)}</p>
            <p className="mt-1 text-sm leading-6 text-rp-text-2">
              {tr('Tính năng này hiện chưa khả dụng. Bạn có thể quay lại sử dụng khi hệ thống mở lại.')}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  const reason = accessReasonForKind(target?.kind);
  const copy = target ? accessCopy({ reason, featureLabel: target.featureLabel, description: target.description, status, tr, trf }) : {};
  return (
    <FeatureAccessModal
      open={open}
      onClose={onClose}
      title={reason === ACCESS_REASON.CREDIT ? 'Tính năng cần lượt AI' : 'Tính năng thuộc gói tự học'}
      reason={reason}
      icon={target?.icon}
      {...copy}
      primaryAction={{ label: BUY_LABEL, onClick: buy }}
    />
  );
}

export function LearningPathUnlockDialog({ open, roadmapAccess, onClose }) {
  const { tr } = useLocale();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr('Lộ trình của tôi')}
      size="lg"
    >
      <LearningPathUnlockGuide
        compact
        flow={roadmapAccess}
        targetLevelName={roadmapAccess?.profile?.targetJlptLevelName}
        latestAttemptId={roadmapAccess?.placementStatus?.latestCompletedAttemptId}
        onNavigate={onClose}
        headingAs="h3"
      />
    </Modal>
  );
}

/* ------------------------------------------------------------------ app-wide controller */

/**
 * Hosts unlock dialogs for a whole shell (`[RequireFeature]` / self-study routes).
 * Consumers call `requestUnlock(to, label, icon?)`.
 */
export function StudyUnlockProvider({ children }) {
  const studyAccess = useStudyAccess();
  const [target, setTarget] = useState(null);

  const features = studyAccess.features;
  const requestUnlock = useCallback((to, label, icon) => {
    setTarget({ ...unlockInfoFor(to, label), icon, kind: featureLockKind(to, features) ?? LOCK_KIND.PLAN });
  }, [features]);

  const access = useMemo(
    () => ({
      ...studyAccess,
      lockStateFor: (to) => studyAccess.lockStateFor(to),
      lockReasonFor: (to) => studyAccess.lockReasonFor(to),
      isLocked: (to) => studyAccess.isLocked(to),
    }),
    [studyAccess],
  );

  const value = useMemo(() => ({ access, requestUnlock }), [access, requestUnlock]);
  return (
    <UnlockContext.Provider value={value}>
      {children}
      <StudyUnlockDialog target={target} status={studyAccess.status} onClose={() => setTarget(null)} />
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
  const open = () => (ctx
    ? ctx.requestUnlock(to, label)
    : setLocalTarget({ ...unlockInfoFor(to, label), kind: featureLockKind(to, access.features) ?? LOCK_KIND.PLAN }));
  const lockReason = access.lockReasonFor?.(to) || LOCK_REASON;
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        data-locked="true"
        aria-label={label ? `${tr(label)} — ${tr(lockReason)}` : undefined}
        title={tr(lockReason)}
        className={cx(className, 'group relative cursor-pointer text-left')}
      >
        {children}
        {showLock && (
          <span aria-hidden="true" className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-rp-surface/90 text-rp-text-muted ring-1 ring-rp-line transition-colors group-hover:text-rp-brand-strong group-hover:ring-rp-brand-border">
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
