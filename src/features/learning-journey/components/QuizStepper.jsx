import { useState } from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button, ProgressBar, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * One-question-at-a-time quiz runner shared by Lesson QuickCheck and roadmap checkpoints.
 * Answers are owned by the parent (survive tab switches, resizes and re-renders); grading stays on the
 * Backend — this component never knows the correct option.
 */
export default function QuizStepper({
  name,
  questions = [],
  answers = {},
  onAnswer,
  onSubmit,
  submitting = false,
  disabled = false,
  submitLabel = 'Nộp bài',
}) {
  const { tr, trf } = useLocale();
  const [index, setIndex] = useState(0);
  const total = questions.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const question = questions[safeIndex];
  const answeredCount = questions.filter((q) => answers[q.questionId] != null).length;
  const firstUnanswered = questions.findIndex((q) => answers[q.questionId] == null);
  const isLast = safeIndex === total - 1;
  const locked = disabled || submitting;

  if (!question) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          <span className="font-semibold text-rp-text">{trf('Câu {0}/{1}', { 0: safeIndex + 1, 1: total })}</span>
          <span className="text-rp-text-muted">{trf('Đã trả lời {0}/{1} câu hỏi', { 0: answeredCount, 1: total })}</span>
        </div>
        <ProgressBar value={answeredCount} max={total || 1} size="sm" label={tr('Tiến độ làm bài')} />
      </div>

      <fieldset key={question.questionId} className="rp-anim-fade min-w-0 rounded-rp-card border border-rp-line bg-white p-4 sm:p-5" disabled={locked}>
        <legend className="sr-only">{trf('Câu {0}/{1}', { 0: safeIndex + 1, 1: total })}</legend>
        <p className="whitespace-pre-wrap break-words text-[16px] font-semibold leading-7 text-rp-text">{question.questionText}</p>
        <div className="mt-4 grid gap-2">
          {(question.options ?? []).map((option) => {
            const selected = answers[question.questionId] === option.optionId;
            return (
              <label
                key={option.optionId}
                className={cx(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors duration-[var(--rp-dur-fast)]',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rp-brand-strong/30',
                  selected ? 'border-rp-brand bg-rp-brand-tint' : 'border-rp-line hover:border-rp-brand-border hover:bg-rp-brand-tint/40',
                  locked && 'cursor-not-allowed opacity-70',
                )}
              >
                <input
                  type="radio"
                  name={`${name}-${question.questionId}`}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-rp-brand)]"
                  checked={selected}
                  onChange={() => onAnswer?.(question.questionId, option.optionId)}
                />
                <span className="min-w-0 whitespace-pre-wrap break-words text-[15px] leading-6 text-rp-text">{option.optionText}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {total > 1 && (
        <nav aria-label={tr('Danh sách câu hỏi')} className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const answered = answers[q.questionId] != null;
            return (
              <button
                key={q.questionId}
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === safeIndex ? 'step' : undefined}
                aria-label={trf('Câu {0}', { 0: i + 1 }) + (answered ? ` · ${tr('Đã trả lời')}` : '')}
                className={cx(
                  'rp-focus h-8 min-w-8 rounded-lg border px-2 text-[12px] font-semibold tabular-nums',
                  i === safeIndex
                    ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white'
                    : answered
                      ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-rp-line bg-white text-rp-text-muted hover:border-rp-brand-border',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-3">
        <Button variant="secondary" size="md" icon={ArrowLeft} disabled={safeIndex === 0 || submitting} onClick={() => setIndex(safeIndex - 1)}>
          {tr('Câu trước')}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isLast && firstUnanswered >= 0 && (
            <button type="button" className="rp-link text-[12.5px]" onClick={() => setIndex(firstUnanswered)}>
              {trf('Còn {0} câu chưa trả lời', { 0: total - answeredCount })}
            </button>
          )}
          {isLast ? (
            <Button
              variant="primary"
              size="md"
              icon={Send}
              loading={submitting}
              disabled={locked || answeredCount < total}
              onClick={onSubmit}
            >
              {tr(submitLabel)}
            </Button>
          ) : (
            <Button variant="primary" size="md" iconRight={ArrowRight} disabled={submitting} onClick={() => setIndex(safeIndex + 1)}>
              {tr('Câu sau')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
