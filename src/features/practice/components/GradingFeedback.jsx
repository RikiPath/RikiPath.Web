import { useLocale } from '@/locales/locale.js';
export default function GradingFeedback({ grading, skill }) {
  const { tr, trf } = useLocale();
  if (!grading) return null;

  return <section className="mt-4 space-y-3 rounded-xl border border-rp-line bg-rp-brand-tint p-4 text-sm">
    <h2 className="font-bold text-rp-brand-strong">{trf('Điểm luyện {0} · {1}/100', { 0: skill, 1: grading.overallScore })}</h2>
    <ul className="space-y-2">
      {grading.criteria?.map(criterion => <li key={criterion.name}>
        <strong>{criterion.name} · {criterion.score}/10</strong>
        <p>{criterion.comment}</p>
      </li>)}
    </ul>
    {grading.improvements?.length > 0 && <div>
      <h3 className="font-semibold">{tr('Cần cải thiện')}</h3>
      <ul className="list-disc pl-5">
        {grading.improvements.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>}
    {grading.corrections?.length > 0 && <div>
      <h3 className="font-semibold">{tr('Gợi ý sửa')}</h3>
      <ul className="list-disc pl-5">
        {grading.corrections.map((item, index) => <li key={index}>
          <span lang="ja">{item.original} → {item.suggestion}</span><p>{tr(item.reason)}</p>
        </li>)}
      </ul>
    </div>}
  </section>;
}
