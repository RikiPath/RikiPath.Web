export default function GradingFeedback({ grading, skill }) {
  if (!grading) return null;

  return <section className="mt-4 space-y-3 rounded-xl border border-[#EADFE5] bg-[#FAF4F7] p-4 text-sm">
    <h2 className="font-bold text-[#AD3155]">Điểm luyện {skill} · {grading.overallScore}/100</h2>
    <ul className="space-y-2">
      {grading.criteria?.map(criterion => <li key={criterion.name}>
        <strong>{criterion.name} · {criterion.score}/10</strong>
        <p>{criterion.comment}</p>
      </li>)}
    </ul>
    {grading.improvements?.length > 0 && <div>
      <h3 className="font-semibold">Cần cải thiện</h3>
      <ul className="list-disc pl-5">
        {grading.improvements.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>}
    {grading.corrections?.length > 0 && <div>
      <h3 className="font-semibold">Gợi ý sửa</h3>
      <ul className="list-disc pl-5">
        {grading.corrections.map((item, index) => <li key={index}>
          <span lang="ja">{item.original} → {item.suggestion}</span><p>{item.reason}</p>
        </li>)}
      </ul>
    </div>}
  </section>;
}
