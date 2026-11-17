import { Link } from 'react-router-dom';
import { ERROR_MESSAGES, isSafeUserMessage } from '../../api/apiErrors.js';

const KIND_LABELS = {
  CohortSession: 'Lớp nhóm',
  LegacyBooking: 'Lịch tư vấn 1-1',
  IndividualCourseSession: 'Khóa kèm 1-1',
};

const conflictText = (c) =>
  isSafeUserMessage(c?.message) ? c.message : ERROR_MESSAGES[c?.code] || 'Khung giờ này đang xung đột với lịch đã có.';

/**
 * Danh sách xung đột lịch do máy chủ trả về (conflict-preview / schedule-preview / shift-preview).
 * `cohortLink(cohortId)` trả về đường dẫn tới lớp liên quan (tùy vai trò).
 */
export default function ScheduleConflictList({ conflicts = [], title, cohortLink, compact = false }) {
  if (!conflicts.length) return null;
  return (
    <div
      role="alert"
      style={{
        border: '1px solid #f1c7d3',
        background: '#fcf4f8',
        color: '#8f2948',
        borderRadius: 12,
        padding: compact ? '8px 12px' : '10px 14px',
        margin: '8px 0',
        fontSize: 13,
      }}
    >
      <strong>{title || `Phát hiện ${conflicts.length} xung đột lịch – cần chọn khung giờ khác trước khi tiếp tục`}</strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {conflicts.map((c, i) => {
          const href = c.cohortId && cohortLink ? cohortLink(c.cohortId) : null;
          return (
            <li key={`${c.code}-${c.sessionNumber ?? ''}-${c.proposedStartUtc ?? ''}-${i}`} style={{ marginTop: 4 }}>
              {c.sessionNumber ? <strong>Buổi {c.sessionNumber}: </strong> : null}
              {conflictText(c)}
              {c.commitmentKind && (
                <span style={{ opacity: 0.8 }}> · {KIND_LABELS[c.commitmentKind] || c.commitmentKind}</span>
              )}
              {href && (
                <>
                  {' '}
                  <Link to={href} style={{ color: '#ad3155', textDecoration: 'underline' }}>
                    Xem lớp {c.cohortName || `#${c.cohortId}`}
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
