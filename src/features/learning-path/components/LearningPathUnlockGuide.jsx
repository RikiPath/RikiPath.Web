import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react';
import { errorMessage } from '@/api/apiErrors.js';
import { Badge, Banner, Button, HaruMascot, SakuraLoader, cx } from '@/components/ui';
import { SrsLoopIcon } from '@/components/ui/SakuraIcons.js';
import { WebClayIcon } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';

function isPlanOrQuotaError(error) {
  const code = error?.data?.errorCode || error?.errorCode || '';
  return (
    error?.status === 403 ||
    ['AI_CREDIT_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED', 'LEARNING_PATH_PACKAGE_REQUIRED', 'SUBSCRIPTION_REQUIRED'].includes(code)
  );
}

function isPlacementRequiredError(error) {
  const code = error?.data?.errorCode || error?.errorCode || '';
  return ['PLACEMENT_REQUIRED', 'STANDARD_ROADMAP_PLACEMENT_REQUIRED', 'PLACEMENT_TEST_REQUIRED'].includes(code);
}

/**
 * Guided lock screen & modal content for "Lộ trình của tôi" (/roadmap).
 * Never shows personalized AI roadmap content before Backend confirms status === 'ACTIVE'.
 */
export function LearningPathUnlockGuide({
  flow,
  targetLevelName,
  latestAttemptId,
  generating = false,
  generateError = null,
  onGenerateAi,
  onNavigate,
  compact = false,
  headingAs: Heading = 'h2',
}) {
  const { tr } = useLocale();
  const hasGoal = Boolean(flow?.hasGoal);
  const hasPlacement = Boolean(flow?.hasPlacementCompleted);
  const hasActive = Boolean(flow?.hasActiveAiPath);

  const steps = [
    {
      id: 'goal',
      icon3d: 'achievement',
      title: tr('Thiết lập mục tiêu JLPT'),
      detail: hasGoal && targetLevelName ? `${tr('Mục tiêu hiện tại')}: JLPT ${targetLevelName}` : tr('Chọn cấp độ JLPT và thời gian học mỗi ngày.'),
      done: hasGoal,
      current: !hasGoal,
      Icon: Target,
    },
    {
      id: 'placement',
      icon3d: 'mock',
      title: tr('Làm bài đánh giá năng lực'),
      detail: hasPlacement ? tr('Đã ghi nhận kết quả đánh giá năng lực.') : tr('Kiểm tra trình độ hiện tại để AI hiểu đúng xuất phát điểm.'),
      done: hasPlacement,
      current: hasGoal && !hasPlacement,
      Icon: ClipboardCheck,
    },
    {
      id: 'ai',
      icon3d: 'roadmap',
      title: tr('Tạo lộ trình học cá nhân hóa với AI'),
      detail: tr('Mở khóa các chặng học, lịch học theo ngày và gợi ý ôn tập riêng.'),
      done: hasActive,
      current: hasGoal && hasPlacement && !hasActive,
      Icon: Sparkles,
    },
  ];

  const quotaIssue = isPlanOrQuotaError(generateError);
  const placementIssue = isPlacementRequiredError(generateError);

  return (
    <div className="relative space-y-5">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Badge tone="brand" icon={LockKeyhole} size="sm">
            {tr('Lộ trình cá nhân hóa đang khóa')}
          </Badge>
          <Heading className={cx('font-extrabold text-rp-navy', compact ? 'text-lg leading-6' : 'text-xl leading-7 sm:text-2xl')}>
            {flow?.step === 'generate-ai'
              ? tr('Sẵn sàng mở khóa lộ trình học với AI')
              : flow?.step === 'placement'
                ? tr('Làm bài đánh giá để mở khóa lộ trình')
                : tr('Hoàn thành các bước để mở khóa lộ trình của bạn')}
          </Heading>
          <p className="text-sm leading-6 text-rp-text-2">
            {flow?.step === 'generate-ai'
              ? tr('Bạn đã hoàn thành mục tiêu và đánh giá năng lực. Hãy tạo lộ trình AI để bắt đầu hành trình học tập.')
              : tr('Để lộ trình sát với trình độ thật, RikiPath mở khóa lộ trình cá nhân hóa sau khi bạn hoàn thành đánh giá năng lực và tạo lộ trình AI.')}
          </p>
        </div>

        {!compact && (
          <div className="hidden shrink-0 items-center justify-center rounded-full border border-rp-brand-border/60 bg-rp-brand-tint/45 p-3 lg:flex">
            <HaruMascot pose="guiding" size={108} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3.5">

        {generating && (
          <div className="rounded-rp-input border border-rp-brand-border bg-white p-3.5">
            <SakuraLoader
              variant="inline"
              context="roadmap"
              label={tr('Riki đang thiết kế lộ trình cá nhân hóa từ kết quả đánh giá của bạn…')}
            />
          </div>
        )}

        {generateError && !generating && (
          <Banner
            tone="danger"
            title={tr('Chưa tạo được lộ trình học AI')}
            actions={(
              <div className="flex flex-wrap gap-2">
                {quotaIssue && (
                  <Button as={Link} to="/plans/" onClick={onNavigate} variant="primary" size="sm">
                    {tr('Mua gói ngay')}
                  </Button>
                )}
                {placementIssue && (
                  <Button as={Link} to="/app/placement-test/" onClick={onNavigate} variant="primary" size="sm">
                    {tr('Làm bài đánh giá năng lực')}
                  </Button>
                )}
                {!quotaIssue && !placementIssue && onGenerateAi && (
                  <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onGenerateAi}>
                    {tr('Thử lại')}
                  </Button>
                )}
              </div>
            )}
          >
            {errorMessage(generateError, tr('Vui lòng kiểm tra lại bài đánh giá hoặc lượt sử dụng AI rồi thử lại.'))}
          </Banner>
        )}

        {/* Horizontal Left -> Right 3-Step Branch Track */}
        <div className="overflow-x-auto pb-1">
          <ol className="flex min-w-[600px] items-stretch md:grid md:min-w-0 md:grid-cols-3">
            {steps.map((step, index) => {
              const StepIcon = step.Icon;
              const hasLeftLine = index > 0;
              const hasRightLine = index < steps.length - 1;
              return (
                <li
                  key={step.id}
                  style={{ '--rp-delay': `${index * 65}ms` }}
                  className="rp-celebrate-stagger flex min-w-[190px] flex-1 flex-col pr-3 last:pr-0"
                >
                  <div className="flex items-center">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'h-[2px] flex-1',
                        hasLeftLine
                          ? step.done || step.current
                            ? 'bg-rp-brand-border'
                            : 'bg-[#EAD7E0]'
                          : 'bg-transparent',
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className={cx(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200',
                        step.done
                          ? 'rp-onboarding-check-pop border-rp-success-line bg-rp-success text-white'
                          : step.current
                            ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white ring-4 ring-rp-brand-tint shadow-xs'
                            : 'border-rp-line bg-white text-rp-text-muted',
                      )}
                    >
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cx(
                        'h-[2px] flex-1',
                        hasRightLine
                          ? step.done
                            ? 'bg-rp-success-line'
                            : 'bg-[#EAD7E0]'
                          : 'bg-transparent',
                      )}
                    />
                  </div>

                  <div
                    className={cx(
                      'mt-2.5 flex flex-1 flex-col rounded-rp-input border px-3 py-3 transition-[border-color,box-shadow] duration-200',
                      step.done
                        ? 'border-rp-success-line/80 bg-rp-mint-bg/45'
                        : step.current
                          ? 'border-rp-brand-border bg-rp-brand-tint/45 shadow-rp-xs ring-1 ring-rp-brand-border/45'
                          : 'border-rp-line bg-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <WebClayIcon name={step.icon3d} size="xs" />
                      <StepIcon aria-hidden="true" className="hidden" />
                      <span className="text-[13px] font-bold leading-snug text-rp-text">{step.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-rp-text-2">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {!hasGoal && (
            <Button as={Link} to="/onboarding/" onClick={onNavigate} variant="primary" size="md" icon={Target} iconRight={ArrowRight} className="rp-celebrate-cta-glow">
              {tr('Thiết lập mục tiêu JLPT')}
            </Button>
          )}
          {hasGoal && !hasPlacement && (
            <Button as={Link} to="/app/placement-test/" onClick={onNavigate} variant="primary" size="md" icon={ClipboardCheck} iconRight={ArrowRight} className="rp-celebrate-cta-glow">
              {tr('Làm bài đánh giá năng lực')}
            </Button>
          )}
          {hasGoal && hasPlacement && !hasActive && (
            onGenerateAi ? (
              <Button
                variant="primary"
                size="md"
                icon={Sparkles}
                iconRight={ArrowRight}
                className="rp-celebrate-cta-glow"
                loading={generating}
                disabled={generating}
                onClick={onGenerateAi}
              >
                {tr('Tạo lộ trình học với AI')}
              </Button>
            ) : (
              <Button
                as={Link}
                to="/roadmap/?generateAi=1"
                onClick={onNavigate}
                variant="primary"
                size="md"
                icon={Sparkles}
                iconRight={ArrowRight}
                className="rp-celebrate-cta-glow"
              >
                {tr('Tạo lộ trình học với AI')}
              </Button>
            )
          )}
          {hasGoal && hasPlacement && latestAttemptId && (
            <Button as={Link} to="/app/placement-test/" onClick={onNavigate} variant="secondary" size="md">
              {tr('Xem kết quả đánh giá')}
            </Button>
          )}
          {hasGoal && !hasPlacement && (
            <Button as={Link} to="/onboarding/" onClick={onNavigate} variant="secondary" size="md">
              {tr('Đổi mục tiêu')}
            </Button>
          )}
        </div>

        <div className="border-t border-rp-line pt-3">
          <p className="text-xs font-medium text-rp-text-muted">
            {tr('Trong lúc chuẩn bị lộ trình AI, bạn vẫn có thể tự do học thử và ôn tập:')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to="/lessons/"
              onClick={onNavigate}
              className="rp-focus rp-press rp-interactive group inline-flex h-9 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <BookOpen aria-hidden="true" className="rp-icon-tilt h-3.5 w-3.5 text-rp-brand-strong" />
              {tr('Khám phá bài học')}
            </Link>
            <Link
              to="/daily-srs/"
              onClick={onNavigate}
              className="rp-focus rp-press rp-interactive group inline-flex h-9 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <SrsLoopIcon className="rp-icon-tilt h-3.5 w-3.5 text-tone-vocab" />
              {tr('Ôn tập SRS')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearningPathUnlockGuide;
