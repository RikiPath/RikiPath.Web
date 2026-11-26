// Thẻ lớp dùng chung cho hồ sơ Giáo viên công khai: hiển thị tần suất học động và trạng thái tuyển sinh.
import { cohortCardFacts, enrollmentStatusOf, fmtDateOnly, frequencyLabelOf } from '@/features/cohorts/utils/cohortCardModel';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { useLocale } from '@/locales/locale.js';

export function IntensityBadge({ cohort }) {
  const { tr } = useLocale();
  return (
    <span className="course-badge intensity-badge intensity-standard" title={tr('Tần suất học mỗi tuần')}>
      {frequencyLabelOf(cohort)}
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
          {cohort.isRecommendedIntensity && <span className="course-badge ok">{tr('Phổ biến')}</span>}
        </div>
        <span data-enrollment-status={status.key}>
          <StatusBadge tone={status.tone} label={tr(status.label)} />
        </span>
      </div>
      <h3 style={{ marginTop: 10 }}>{cohort.name}</h3>
      <dl className="cohort-facts">
        {cohortCardFacts(cohort).map(([label, value]) => (
          <div key={label}><dt>{tr(label)}</dt><dd>{label === 'Học phí trọn khóa' ? <strong>{value}</strong> : value}</dd></div>
        ))}
      </dl>
      <p className="course-meta">
        {trf('Ngày bắt đầu: {0} · Ngày kết thúc: {1}', {
          0: fmtDateOnly(cohort.startsAt),
          1: fmtDateOnly(cohort.endsAt),
        })}
      </p>
      {extra}
      {showFullSchedule && (cohort.sessions || []).length > 0 && (
        <details>
          <summary>{trf('Xem lịch đầy đủ ({0} buổi)', { 0: cohort.sessions.length })}</summary>
          <ul>
            {cohort.sessions.map((s) => (
              <li key={s.number} className="course-meta">
                {trf('Buổi {0}: {1}', { 0: s.number, 1: fmtDateOnly(s.startTime) })}
              </li>
            ))}
          </ul>
        </details>
      )}
      {children}
    </article>
  );
}
