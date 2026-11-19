import { Check } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { computeWizardProgressPercent } from './onboardingWizardLogic.js';

/**
 * Reusable accessible 5-step horizontal progress stepper.
 * Mirrors Mobile `SakuraAnimatedStepProgress` smoothness while providing Desktop milestone navigation.
 */
export default function OnboardingStepper({
  steps,
  currentStepIndex,
  furthestAccessibleStep,
  stepValidity,
  onSelectStep,
  disabled = false,
  className,
}) {
  const { tr, trf } = useLocale();
  const totalSteps = steps.length;
  const progressPercent = computeWizardProgressPercent(currentStepIndex, totalSteps);
  const currentStep = steps[currentStepIndex] || steps[0];

  return (
    <div className={cx('space-y-2', className)}>
      {/* Top status bar + animated Sakura progress bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            key={currentStepIndex}
            className="rp-onboarding-reveal inline-flex items-center rounded-full bg-rp-brand-tint px-2.5 py-0.5 text-[12px] font-bold text-rp-brand-strong"
          >
            {trf('Bước {0} / {1}', { 0: currentStepIndex + 1, 1: totalSteps })}
          </span>
          <span className="truncate text-[13px] font-semibold text-rp-text sm:hidden">
            {tr(currentStep?.shortTitle || '')}
          </span>
        </div>

        <span className="text-[12px] font-semibold tabular-nums text-rp-text-muted">
          {progressPercent}%
        </span>
      </div>

      {/* Smooth interpolated Sakura bar */}
      <div
        role="progressbar"
        aria-label={tr('Tiến trình thiết lập mục tiêu')}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStepIndex + 1}
        className="h-2 w-full overflow-hidden rounded-full border border-rp-brand-border/60 bg-rp-brand-tint"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E05A7A] to-[#C24362] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Horizontal clickable step milestones */}
      <nav aria-label={tr('Các bước thiết lập mục tiêu')}>
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const canReach = !disabled && index <= furthestAccessibleStep;
            const isCompleted = !isActive && index <= furthestAccessibleStep && Boolean(stepValidity?.[index]?.valid) && index < currentStepIndex;
            const isVisitedCompleted = !isActive && !isCompleted && index < furthestAccessibleStep && Boolean(stepValidity?.[index]?.valid);
            const showDone = isCompleted || isVisitedCompleted;

            return (
              <li key={step.id} className="min-w-0">
                <button
                  type="button"
                  disabled={!canReach}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={trf('Bước {0}: {1}', { 0: step.stepNumber, 1: tr(step.shortTitle) })}
                  onClick={() => canReach && index !== currentStepIndex && onSelectStep(index)}
                  className={cx(
                    'rp-focus group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition-all duration-200 sm:px-2',
                    canReach && !isActive && 'cursor-pointer hover:bg-rp-brand-tint/65',
                    !canReach && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-bold transition-all duration-200',
                      isActive && 'border-rp-brand-pressed bg-rp-brand-pressed text-white ring-4 ring-rp-brand-tint shadow-xs',
                      !isActive && showDone && 'rp-onboarding-check-pop border-rp-success-line bg-rp-success-bg text-rp-success group-hover:border-rp-brand-border group-hover:bg-rp-brand-tint group-hover:text-rp-brand-strong',
                      !isActive && !showDone && 'border-rp-line bg-rp-muted text-rp-text-muted',
                    )}
                  >
                    {showDone ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      step.stepNumber
                    )}
                  </span>

                  <span
                    className={cx(
                      'hidden w-full truncate text-[11px] font-medium transition-colors sm:block',
                      isActive
                        ? 'font-semibold text-rp-brand-strong'
                        : showDone
                          ? 'text-rp-text-2 group-hover:text-rp-brand-strong'
                          : 'text-rp-text-muted',
                    )}
                  >
                    {tr(step.shortTitle)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
