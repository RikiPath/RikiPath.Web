import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  LockKeyhole,
  PlayCircle,
  Route,
  Sparkles,
  Target,
} from 'lucide-react';
import { errorMessage } from '@/api/apiErrors.js';
import { Banner, Button, cx } from '@/components/ui';
import FeatureAccessModal from '@/features/entitlements/components/FeatureAccessModal.jsx';
import WebClayIcon from '@/features/learner-ui/WebClayIcon.jsx';
import { useLocale } from '@/locales/locale.js';
import { SETUP_STEP_COPY as STEP_COPY, resolveFeatureLock, resolveSetupStep, setupStepIndex } from '../learningPathFlow.js';
import './roadmapSetupFlow.css';

const STEPS = [
  { id: 'goal', label: 'Đặt mục tiêu JLPT', icon: Target },
  { id: 'placement', label: 'Đánh giá năng lực', icon: ClipboardCheck },
  { id: 'roadmap', label: 'Tạo lộ trình học', icon: Route },
];

/** Placement CTA label for the learner's real assessment situation (resuming never spends a new attempt). */
function placementCta(flow, tr) {
  if (flow?.hasPendingPlacementSubmission) return tr('Nộp bài đánh giá');
  if (flow?.isPlacementInProgress) return tr('Tiếp tục đánh giá');
  if (flow?.placementCompatibilityStatus === 'INSUFFICIENT_FOR_TARGET') return tr('Đánh giá lại');
  return tr('Đánh giá năng lực');
}

function placementDescription(flow, tr, trf, targetLevelName) {
  if (flow?.hasPendingPlacementSubmission) return tr('Bài đánh giá đã hết giờ. Hãy nộp bài để xem kết quả.');
  if (flow?.isPlacementInProgress) return tr('Bạn có bài đánh giá đang làm dở. Tiếp tục để hoàn thành.');
  if (flow?.placementCompatibilityStatus === 'INSUFFICIENT_FOR_TARGET') {
    return tr('Kết quả trước chưa phù hợp với mục tiêu mới. Hãy làm bài đánh giá cho mục tiêu hiện tại.');
  }
  return targetLevelName
    ? trf('Mục tiêu JLPT {0} đã sẵn sàng. Bước tiếp theo, hãy đánh giá năng lực để tìm ra lộ trình học phù hợp với bạn.', { 0: targetLevelName })
    : tr(STEP_COPY.placement.description);
}

/** Sequential stepper: done = green check, current = Sakura, not open yet = gray + lock. */
function SetupStepper({ currentIndex }) {
  const { tr } = useLocale();
  return (
    <ol className="grid grid-cols-3" aria-label={tr('Các bước thiết lập')}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const Icon = done ? Check : current ? step.icon : LockKeyhole;
        return (
          <li key={step.id} className="relative flex min-w-0 flex-col items-center gap-1.5 px-1 text-center" aria-current={current ? 'step' : undefined}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cx('absolute left-0 right-1/2 top-[17px] mr-5 h-[3px] rounded-full', index <= currentIndex ? 'bg-[#259D63]/55' : 'bg-rp-line')}
                style={{ left: 'calc(-50% + 1.25rem)' }}
              />
            )}
            <span
              className={cx(
                'relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border-2',
                done && 'border-[#259D63] bg-[#259D63] text-white',
                current && 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong',
                !done && !current && 'border-rp-line bg-rp-bg-2 text-rp-text-muted',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={done ? 3 : 2.2} />
            </span>
            <span className={cx('text-[12px] font-bold leading-4', done ? 'text-[#1F8453]' : current ? 'text-rp-brand-strong' : 'text-rp-text-muted')}>
              {tr(step.label)}
            </span>
            <span className="sr-only">{done ? tr('Đã hoàn thành') : current ? tr('Bước hiện tại') : tr('Chưa mở')}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Roadmap choice once goal + valid assessment are ready (AI still checks credits on the server). */
function RoadmapChoices({ flow, onActivateStandard, activatingStandard, onGenerateAi, generatingAi }) {
  const { tr } = useLocale();
  const aiEligible = Boolean(flow?.aiRoadmapEligible);
  return (
    <div className="rp-roadmap-unlock grid gap-3 sm:grid-cols-2" data-setup-card="roadmap" data-card-status="unlocked">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
        <div className="space-y-1">
          <p className="text-sm font-bold text-rp-navy">{tr('Lộ trình tiêu chuẩn')}</p>
          <p className="text-xs leading-5 text-rp-text-2">{tr('Học theo từng chặng JLPT, có thể bắt đầu ngay.')}</p>
        </div>
        {onActivateStandard ? (
          <Button type="button" variant={aiEligible ? 'secondary' : 'primary'} size="md" icon={Route} loading={activatingStandard} disabled={generatingAi} onClick={() => onActivateStandard()}>
            {tr('Tạo lộ trình tiêu chuẩn')}
          </Button>
        ) : (
          <Button as={Link} to="/roadmap/" variant={aiEligible ? 'secondary' : 'primary'} size="md" icon={Route}>
            {tr('Tạo lộ trình tiêu chuẩn')}
          </Button>
        )}
      </div>
      {aiEligible && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-rp-brand-border bg-rp-brand-tint/30 p-3.5">
          <div className="space-y-1">
            <p className="text-sm font-bold text-rp-navy">{tr('Lộ trình cá nhân hóa AI')}</p>
            <p className="text-xs leading-5 text-rp-text-2">{tr('Lịch học hằng ngày dựa trên điểm mạnh và điểm cần cải thiện của bạn.')}</p>
          </div>
          {onGenerateAi ? (
            <Button type="button" variant="primary" size="md" icon={Sparkles} loading={generatingAi} disabled={activatingStandard} onClick={() => onGenerateAi()}>
              {tr('Tạo lộ trình AI')}
            </Button>
          ) : (
            <Button as={Link} to="/roadmap/?generateAi=1" variant="primary" size="md" icon={Sparkles}>
              {tr('Tạo lộ trình AI')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Learning setup card (Dashboard variant="dashboard", Roadmap page variant="page"), strictly sequential:
 * Đặt mục tiêu JLPT → Đánh giá năng lực → Tạo lộ trình học. Only the current step has an action.
 * Everything comes from the one shared setup state (`useLearningPathAccess`). No mascot.
 */
export function RoadmapSetupState({
  flow,
  targetLevelName,
  variant = 'page',
  onActivateStandard,
  activatingStandard = false,
  activateStandardError = null,
  onGenerateAi,
  generatingAi = false,
  className,
}) {
  const { tr, trf } = useLocale();
  const isDashboard = variant === 'dashboard';
  const step = resolveSetupStep(flow);
  const currentIndex = setupStepIndex(step);
  const resolvedTarget = targetLevelName || flow?.profile?.targetJlptLevelName || flow?.setupState?.targetJlptLevelName || null;
  // Same story as the Sidebar/search guide for the roadmap in the same state (one resolver).
  const lock = resolveFeatureLock(flow, 'roadmap');
  const copy = lock ? { title: lock.title, description: lock.description } : (STEP_COPY[step] || STEP_COPY.goal);
  const titleId = isDashboard ? 'dashboard-setup-title' : 'roadmap-setup-title';

  return (
    <section
      data-section={isDashboard ? 'DashboardSetupCard' : 'RoadmapSetupState'}
      data-setup-step={step}
      data-setup-stage={flow?.setupStage || undefined}
      aria-labelledby={titleId}
      className={cx('relative overflow-hidden rounded-2xl border border-rp-line bg-white shadow-rp-xs', isDashboard ? 'p-5' : 'p-5 sm:p-7', className)}
    >
      <div className="relative space-y-5">
        <div className="flex items-start gap-3">
          <WebClayIcon name="journey" size="xs" className="rp-setup-heading-icon mt-0.5" />
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-rp-brand-strong">
              {trf('Bước {0}/3 · {1}', { 0: currentIndex + 1, 1: tr(STEPS[currentIndex].label) })}
            </p>
            <h2
              id={titleId}
              className={cx('mt-0.5 min-w-0 font-extrabold tracking-[-0.015em] text-rp-navy', isDashboard ? 'text-[18px] leading-6 sm:text-[20px]' : 'text-[22px] leading-7 sm:text-[26px] sm:leading-8')}
            >
              {tr(copy.title)}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-rp-text-2">
              {lock ? tr(copy.description) : step === 'placement' ? placementDescription(flow, tr, trf, resolvedTarget) : tr(copy.description)}
            </p>
          </div>
        </div>

        <SetupStepper currentIndex={currentIndex} />

        {step === 'goal' && (
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to="/onboarding/" variant="primary" size="md" icon={Target} iconRight={ArrowRight}>
              {tr('Đặt mục tiêu JLPT')}
            </Button>
          </div>
        )}
        {step === 'placement' && (lock ? lock.primary : true) && (
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to={lock?.primary?.to || '/app/placement-test/'} variant="primary" size="md" icon={flow?.isPlacementInProgress ? PlayCircle : ClipboardCheck} iconRight={ArrowRight}>
              {lock?.primary ? tr(lock.primary.label) : placementCta(flow, tr)}
            </Button>
          </div>
        )}
        {step === 'ready' && (
          <RoadmapChoices
            flow={flow}
            onActivateStandard={onActivateStandard}
            activatingStandard={activatingStandard}
            onGenerateAi={onGenerateAi}
            generatingAi={generatingAi}
          />
        )}

        {activateStandardError && !activatingStandard && (
          <Banner tone="danger" title={tr('Chưa tạo được lộ trình. Vui lòng thử lại.')}>
            {errorMessage(activateStandardError, tr('Vui lòng thử lại sau ít phút.'))}
          </Banner>
        )}
      </div>
    </section>
  );
}

/** Locked AI tab: one clear next step (assessment), no generation attempt, no mascot. */
export function LockedAiRoadmapCard({ targetLevelName, onBackToStandard }) {
  const { tr, trf } = useLocale();
  return (
    <section
      data-section="LockedAiRoadmapCard"
      data-gate="ai-placement-prerequisite"
      aria-labelledby="locked-ai-roadmap-title"
      className="rounded-2xl border border-rp-line bg-white p-5 shadow-rp-xs sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id="locked-ai-roadmap-title" className="text-xl font-extrabold text-rp-navy">
            {tr('Mở lộ trình cá nhân hóa AI')}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-rp-text-2">
            {targetLevelName
              ? trf('Làm bài đánh giá năng lực để RikiPath xây dựng lộ trình JLPT {0} dành riêng cho bạn.', { 0: targetLevelName })
              : tr('Làm bài đánh giá năng lực để RikiPath xây dựng lộ trình dành riêng cho bạn.')}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button as={Link} to="/app/placement-test/" variant="primary" size="md" icon={ClipboardCheck} iconRight={ArrowRight}>
              {tr('Đánh giá năng lực')}
            </Button>
            {onBackToStandard && (
              <Button type="button" variant="secondary" size="md" onClick={onBackToStandard}>
                {tr('Quay lại lộ trình tiêu chuẩn')}
              </Button>
            )}
          </div>
        </div>
        <div className="hidden shrink-0 items-center justify-center rounded-2xl border border-rp-line bg-rp-bg-2/70 p-5 sm:flex">
          <WebClayIcon name="roadmap" size="lg" />
        </div>
      </div>
    </section>
  );
}

/**
 * Guide opened from a locked Learner destination (Sidebar, quick search, collapsed rail, mobile tap).
 * The clicked feature ("placement" | "roadmap") picks the story; the shared setup state picks the step and CTA
 * (`resolveFeatureLock`). Rendered by the shared FeatureAccessModal (variant="setup"). "Để sau" / X only close.
 */
export function RoadmapSetupModal({ open, onClose, roadmapAccess, feature = 'roadmap' }) {
  const navigate = useNavigate();
  const lock = resolveFeatureLock(roadmapAccess, feature);
  const primary = lock?.primary;
  return (
    <FeatureAccessModal
      open={Boolean(open && lock)}
      onClose={onClose}
      variant="setup"
      art={lock?.art}
      category={lock?.category}
      heading={lock?.title}
      description={lock?.description}
      steps={lock?.steps}
      primaryAction={primary ? {
        label: primary.label,
        onClick: () => {
          onClose?.();
          navigate(primary.to);
        },
      } : null}
    />
  );
}

export default RoadmapSetupState;
