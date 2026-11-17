// Thẻ lớp dùng chung (Tìm lớp, hồ sơ Mentor công khai): cường độ học hiển thị ngay, tách biệt trạng thái ghi danh.
import { cohortCardFacts, enrollmentStatusOf, fmtDate, intensityOf } from './cohortCardModel';


export function IntensityBadge({ cohort }) {
  const intensity = intensityOf(cohort);
  return (
    <span className={`course-badge intensity-badge ${intensity.tone}`} data-intensity={intensity.key} title="Cường độ học (không phải cấp độ JLPT)">
      {intensity.text}
    </span>
  );
}

export default function CohortSummaryCard({ cohort, extra, children, showFullSchedule = true }) {
  const status = enrollmentStatusOf(cohort);
  return (
    <article className="course-box cohort-card" data-testid={`cohort-card-${cohort.id}`}>
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <div className="course-buttons">
          <IntensityBadge cohort={cohort} />
          {cohort.isRecommendedIntensity && <span className="course-badge ok">Khuyến nghị</span>}
        </div>
        <span className={`course-badge ${status.tone}`} data-enrollment-status={status.key}>{status.label}</span>
      </div>
      <h3 style={{ marginTop: 10 }}>{cohort.name}</h3>
      <dl className="cohort-facts">
        {cohortCardFacts(cohort).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{label === 'Học phí trọn khóa' ? <strong>{value}</strong> : value}</dd></div>
        ))}
      </dl>
      <p className="course-meta">Khai giảng: {fmtDate(cohort.startsAt)} · Kết thúc: {fmtDate(cohort.endsAt)} · Hạn đăng ký: {fmtDate(cohort.enrollmentClosesAtUtc)}</p>
      {extra}
      {showFullSchedule && (cohort.sessions || []).length > 0 && (
        <details>
          <summary>Xem lịch đầy đủ ({cohort.sessions.length} buổi)</summary>
          <ul>
            {cohort.sessions.map((s) => <li key={s.number} className="course-meta">Buổi {s.number}: {fmtDate(s.startTime)}</li>)}
          </ul>
        </details>
      )}
      {children}
    </article>
  );
}
