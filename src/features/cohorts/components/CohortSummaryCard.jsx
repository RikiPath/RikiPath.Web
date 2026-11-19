// Thẻ lớp dùng chung (Tìm lớp, hồ sơ Mentor công khai): cường độ học hiển thị ngay, tách biệt trạng thái ghi danh.
import { cohortCardFacts, enrollmentStatusOf, fmtDate, intensityOf } from '@/features/cohorts/utils/cohortCardModel';
import { useLocale } from '@/locales/locale.js';


export function IntensityBadge({ cohort }) {
  const { tr } = useLocale();
  const intensity = intensityOf(cohort);
  return (
    <span className={`course-badge intensity-badge ${intensity.tone}`} data-intensity={intensity.key} title={tr('Cường độ học (không phải cấp độ JLPT)')}>
      {tr(intensity.text)}
    </span>
  );
}

export default function CohortSummaryCard({ cohort, extra, children, showFullSchedule = true }) {
  const { tr, trf } = useLocale();
  const status = enrollmentStatusOf(cohort);
  return (
    <article className="course-box cohort-card" data-testid={`cohort-card-${cohort.id}`}>
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <div className="course-buttons">
          <IntensityBadge cohort={cohort} />
          {cohort.isRecommendedIntensity && <span className="course-badge ok">{tr('Khuyến nghị')}</span>}
        </div>
        <span className={`course-badge ${status.tone}`} data-enrollment-status={status.key}>{tr(status.label)}</span>
      </div>
      <h3 style={{ marginTop: 10 }}>{cohort.name}</h3>
      <dl className="cohort-facts">
        {cohortCardFacts(cohort).map(([label, value]) => (
          <div key={label}><dt>{tr(label)}</dt><dd>{label === 'Học phí trọn khóa' ? <strong>{value}</strong> : value}</dd></div>
        ))}
      </dl>
      <p className="course-meta">{trf('Khai giảng: {0} · Kết thúc: {1} · Hạn đăng ký: {2}', { 0: fmtDate(cohort.startsAt), 1: fmtDate(cohort.endsAt), 2: fmtDate(cohort.enrollmentClosesAtUtc) })}</p>
      {extra}
      {showFullSchedule && (cohort.sessions || []).length > 0 && (
        <details>
          <summary>{trf('Xem lịch đầy đủ ({0} buổi)', { 0: cohort.sessions.length })}</summary>
          <ul>
            {cohort.sessions.map((s) => <li key={s.number} className="course-meta">{trf('Buổi {0}: {1}', { 0: s.number, 1: fmtDate(s.startTime) })}</li>)}
          </ul>
        </details>
      )}
      {children}
    </article>
  );
}
