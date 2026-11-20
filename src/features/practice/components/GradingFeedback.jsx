import { Badge, Card, ProgressBar } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function GradingFeedback({ grading, skill }) {
  const { tr, trf } = useLocale();
  if (!grading) return null;
  const score = Math.max(0, Math.min(100, Number(grading.overallScore) || 0));

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-rp-text">
            {trf('Kết quả gợi ý đánh giá ({0})', { 0: skill })}
          </h2>
          <p className="mt-0.5 text-xs text-rp-text-muted">
            {tr('Đây là nhận xét tham khảo tự động theo tiêu chí luyện tập.')}
          </p>
        </div>
        <Badge tone={score >= 70 ? 'success' : 'brand'} icon={false}>
          {score}/100
        </Badge>
      </div>

      <ProgressBar value={score} tone={score >= 70 ? 'success' : 'brand'} label={tr('Điểm đánh giá')} />

      {Array.isArray(grading.criteria) && grading.criteria.length > 0 && (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {grading.criteria.map((criterion, idx) => (
            <li key={criterion.name || idx} className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-rp-text">{criterion.name}</strong>
                <Badge size="sm" tone="neutral" icon={false}>{criterion.score}/10</Badge>
              </div>
              {criterion.comment && <p className="mt-1.5 text-xs leading-5 text-rp-text-2">{criterion.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {Array.isArray(grading.improvements) && grading.improvements.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-rp-text">{tr('Cần cải thiện')}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-rp-text-2">
            {grading.improvements.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      )}

      {Array.isArray(grading.corrections) && grading.corrections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-rp-text">{tr('Gợi ý sửa')}</h3>
          <ul className="space-y-2">
            {grading.corrections.map((item, index) => (
              <li key={index} className="rounded-xl border border-rp-line bg-white p-3 text-sm">
                <p className="font-medium text-rp-text" lang="ja">
                  <span className="line-through text-rp-text-muted">{item.original}</span>{' '}
                  <span aria-hidden="true" className="text-rp-brand-strong">→</span>{' '}
                  <span className="text-rp-brand-strong font-semibold">{item.suggestion}</span>
                </p>
                {item.reason && <p className="mt-1 text-xs leading-5 text-rp-text-2">{item.reason}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
