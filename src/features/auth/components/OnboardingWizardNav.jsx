import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Sticky bottom navigation bar for the 5-step onboarding wizard.
 */
export default function OnboardingWizardNav({
  currentStepIndex,
  totalSteps,
  canAdvance,
  busy = false,
  savingMode = null,
  hasExamDate = false,
  onPrevious,
  onNext,
  onSubmitPlanOnly,
  onSubmitWithAssessment,
  className,
}) {
  const { tr } = useLocale();
  const isFirst = currentStepIndex === 0;
  const isReview = currentStepIndex === totalSteps - 1;
  const isApproachingReview = currentStepIndex === totalSteps - 2;
  const isSaving = Boolean(savingMode);

  if (isReview) {
    return (
      <div
        className={cx(
          'flex flex-col-reverse gap-2.5 border-t border-rp-line pt-3 sm:flex-row sm:items-center sm:justify-between lg:pt-3.5',
          className,
        )}
      >
        <Button
          variant="secondary"
          size="md"
          icon={ArrowLeft}
          disabled={busy || isSaving}
          onClick={onPrevious}
          className="w-full sm:w-auto"
        >
          {tr('Quay lại')}
        </Button>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {hasExamDate ? (
            <>
              <Button
                variant="secondary"
                size="md"
                loading={savingMode === 'saveOnly'}
                disabled={busy || isSaving}
                onClick={onSubmitPlanOnly}
                className="w-full sm:w-auto"
              >
                {tr('Chỉ lưu & vào trang chủ')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                icon={Sparkles}
                loading={savingMode === 'assessment'}
                disabled={busy || isSaving || !canAdvance}
                onClick={onSubmitWithAssessment}
                className="w-full sm:w-auto"
              >
                {savingMode === 'assessment'
                  ? tr('Đang bắt đầu bài đánh giá…')
                  : tr('Bắt đầu đánh giá năng lực')}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              icon={Check}
              loading={savingMode === 'saveOnly'}
              disabled={busy || isSaving || !canAdvance}
              onClick={onSubmitPlanOnly}
              className="w-full sm:w-auto"
            >
              {savingMode === 'saveOnly'
                ? tr('Đang lưu mục tiêu…')
                : tr('Tạo kế hoạch học tập')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 border-t border-rp-line pt-3 lg:pt-3.5',
        className,
      )}
    >
      <div>
        {!isFirst && (
          <Button
            variant="secondary"
            size="md"
            icon={ArrowLeft}
            disabled={busy || isSaving}
            onClick={onPrevious}
          >
            {tr('Quay lại')}
          </Button>
        )}
      </div>

      <Button
        variant="primary"
        size="lg"
        iconRight={ArrowRight}
        disabled={busy || isSaving || !canAdvance}
        onClick={onNext}
      >
        {isApproachingReview ? tr('Xem lại kế hoạch') : tr('Tiếp tục')}
      </Button>
    </div>
  );
}
