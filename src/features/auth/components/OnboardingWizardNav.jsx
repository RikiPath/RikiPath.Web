import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Sticky bottom navigation bar for the 5-step onboarding wizard. The review step has a single primary action,
 * "Xác nhận mục tiêu" (saves the goal and returns to the Dashboard), next to "Quay lại".
 */
export default function OnboardingWizardNav({
  currentStepIndex,
  totalSteps,
  canAdvance,
  busy = false,
  savingMode = null,
  onPrevious,
  onNext,
  onConfirm,
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
        <Button
          variant="primary"
          size="lg"
          icon={Check}
          loading={isSaving}
          disabled={busy || isSaving || !canAdvance}
          onClick={onConfirm}
          className="w-full sm:w-auto sm:min-w-[200px]"
        >
          {isSaving ? tr('Đang lưu mục tiêu…') : tr('Xác nhận mục tiêu')}
        </Button>
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
