import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge, Banner } from '@/components/ui';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';
import { useLocale } from '@/locales/locale.js';

export default function PracticeResultReview({
  result,
  sourceTitle = 'Luyện tập',
  contentPrefix = 'practice-review',
}) {
  const { tr, trf } = useLocale();
  if (!result) return null;

  const questionResults = Array.isArray(result.questionResults) ? result.questionResults : [];
  const weakAreas = Array.isArray(result.weakAreas) ? result.weakAreas : [];
  const passingPercent = result.minimumPassingScorePercent ?? result.passingScorePercent ?? 70;

  return (
    <div className="space-y-3">
      <Banner tone={result.passed ? 'success' : 'warning'} role="status">
        {result.scorePercent}% · {result.correctCount}/{result.totalQuestions}{' '}
        {tr('câu đúng')} ·{' '}
        {result.passed
          ? tr('Đã đạt yêu cầu.')
          : trf('Chưa đạt mức {0}%. Bạn có thể xem giải thích và làm lại.', { 0: passingPercent })}
      </Banner>

      {(weakAreas.length > 0 || result.nextRecommendation) && (
        <div className="rounded-xl border border-rp-line bg-rp-surface/70 p-3 text-xs space-y-1.5">
          {weakAreas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-rp-text">{tr('Điểm cần củng cố')}:</span>
              {weakAreas.map((area) => (
                <Badge key={area} tone="warning" size="sm" icon={false}>
                  {tr(area)}
                </Badge>
              ))}
            </div>
          )}
          {result.nextRecommendation && (
            <p className="text-rp-text-2">
              <span className="font-semibold text-rp-text">{tr('Gợi ý tiếp theo')}: </span>
              {tr(result.nextRecommendation)}
            </p>
          )}
        </div>
      )}

      {questionResults.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-rp-text-muted">
            {trf('Chi tiết đáp án ({0} câu)', { 0: questionResults.length })}
          </h4>
          <ol className="space-y-2.5">
            {questionResults.map((item, idx) => (
              <li
                key={item.questionId ?? idx}
                className={`rounded-xl border p-3 text-xs leading-5 ${
                  item.isCorrect
                    ? 'border-emerald-200 bg-emerald-50/45'
                    : 'border-rose-200 bg-rose-50/45'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-rp-text">
                    {idx + 1}. {item.questionText}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold">
                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {tr('Đúng')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {tr('Chưa đúng')}
                      </span>
                    )}
                  </span>
                </div>

                <div className="mt-1.5 space-y-1 text-rp-text-2">
                  <p>
                    <span className="font-semibold">{tr('Bạn chọn')}: </span>
                    {item.selectedOptionText || tr('Chưa chọn đáp án')}
                  </p>
                  {!item.isCorrect && item.correctOptionText && (
                    <p className="text-emerald-800">
                      <span className="font-semibold">{tr('Đáp án đúng')}: </span>
                      {item.correctOptionText}
                    </p>
                  )}
                  {item.explanation && (
                    <div className="mt-1.5 rounded-lg bg-white/80 px-2.5 py-2 text-rp-text">
                      <span className="font-semibold text-rp-brand-strong">{tr('Giải thích')}: </span>
                      <HighlightableText
                        text={item.explanation}
                        contentId={`${contentPrefix}-q-${item.questionId ?? idx}-exp`}
                        sourceTitle={sourceTitle}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
