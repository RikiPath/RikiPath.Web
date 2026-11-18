import { useEffect, useMemo, useRef, useState } from 'react';
import { enrollCohort, getCohorts, getMentorCohortReviewSummary, INTENSITY_OPTIONS } from '../../api/studyCourses';
import { describeApiError } from '../../api/apiErrors';
import CohortSummaryCard, { IntensityBadge } from './CohortSummaryCard';
import { money, schedulePatternText } from './cohortCardModel';

const FILTER_DEBOUNCE_MS = 350;
const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const WEEKDAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];
const EMPTY_FILTERS = { mentorId: '', level: '', intensity: '', weekday: '', fromTime: '', toTime: '' };

function ReviewSummary({ summary }) {
  if (summary === undefined) return <p className="course-meta">Đang tải đánh giá Mentor…</p>;
  if (!summary || !summary.reviewCount) return <p className="course-meta">Đánh giá Mentor: Chưa có đánh giá</p>;
  const latest = (summary.comments || []).filter((c) => c.comment).slice(0, 2);
  return (
    <div className="course-meta">
      Đánh giá Mentor: <strong>★ {Number(summary.averageRating).toFixed(1)}/5</strong> ({summary.reviewCount} đánh giá từ học viên lớp nhóm)
      {latest.length > 0 && (
        <details>
          <summary>Nhận xét gần đây</summary>
          <ul>
            {latest.map((c, i) => <li key={`${c.createdAtUtc}-${i}`}>{'★'.repeat(c.rating)} · “{c.comment}”</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function LearnerCohortDiscoveryPanel({
  cohorts = [],
  myEntitlements = [],
  busy = false,
  onRun,
  onEnrolled,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmCohort, setConfirmCohort] = useState(null);
  const [filtered, setFiltered] = useState(null); // { key, rows, error }
  const [reviewSummaries, setReviewSummaries] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);
  const idempotencyKeys = useRef({});
  const inFlight = useRef(false);
  const requestedSummaries = useRef(new Set());

  const activeEntitlements = useMemo(() => myEntitlements.filter((e) => e.isUsable), [myEntitlements]);
  const mentorOptions = useMemo(() => {
    const map = new Map();
    cohorts.forEach((c) => c.mentorId && map.set(c.mentorId, c.mentorName || `Mentor #${c.mentorId}`));
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [cohorts]);
  const levelOptions = useMemo(() => {
    const set = new Set(['N5', 'N4', 'N3', 'N2']);
    cohorts.forEach((c) => c.level && set.add(c.level));
    return [...set];
  }, [cohorts]);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const hasServerFilter = Object.values(filters).some((v) => v !== '');
  const timeRangeInvalid = Boolean(filters.fromTime && filters.toTime && filters.fromTime >= filters.toTime);

  useEffect(() => {
    if (!hasServerFilter || timeRangeInvalid) return undefined;
    let alive = true;
    const key = `${filterKey}#${refreshTick}`;
    const timer = setTimeout(() => {
      getCohorts(JSON.parse(filterKey))
        .then((rows) => alive && setFiltered({ key, rows, error: '' }))
        .catch((err) => alive && setFiltered({ key, rows: [], error: describeApiError(err).message }));
    }, FILTER_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [filterKey, hasServerFilter, timeRangeInvalid, refreshTick]);

  const activeFiltered = hasServerFilter && filtered?.key === `${filterKey}#${refreshTick}` ? filtered : null;
  const loadingFiltered = hasServerFilter && !timeRangeInvalid && !activeFiltered;
  const baseRows = useMemo(
    () => (hasServerFilter ? (timeRangeInvalid ? [] : activeFiltered?.rows || []) : cohorts),
    [hasServerFilter, timeRangeInvalid, activeFiltered, cohorts]
  );

  const visibleCohorts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return baseRows;
    return baseRows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mentorName || '').toLowerCase().includes(q) ||
        schedulePatternText(c.schedulePattern, c.sessions).toLowerCase().includes(q)
    );
  }, [baseRows, searchTerm]);

  // Tải tóm tắt đánh giá thật cho từng Mentor đang hiển thị (không bao giờ tự tạo số liệu).
  const visibleMentorIds = useMemo(
    () => [...new Set(visibleCohorts.map((c) => c.mentorId).filter(Boolean))].join(','),
    [visibleCohorts]
  );
  useEffect(() => {
    if (!visibleMentorIds) return;
    visibleMentorIds.split(',').map(Number).forEach((id) => {
      if (requestedSummaries.current.has(id)) return;
      requestedSummaries.current.add(id);
      getMentorCohortReviewSummary(id)
        .then((s) => setReviewSummaries((cur) => ({ ...cur, [id]: s || null })))
        .catch(() => setReviewSummaries((cur) => ({ ...cur, [id]: null })));
    });
  }, [visibleMentorIds]);

  const setFilter = (key, value) => setFilters((cur) => ({ ...cur, [key]: value }));

  const handleConfirmEnroll = () => {
    if (!confirmCohort || inFlight.current) return;
    const cohort = confirmCohort;
    inFlight.current = true;
    const key = (idempotencyKeys.current[cohort.id] ||= crypto.randomUUID());
    const body = { idempotencyKey: key };
    if (cohort.hasApprovedEntitlement && cohort.entitlementReference) {
      body.entitlementReference = cohort.entitlementReference;
    }
    Promise.resolve(
      onRun(async () => {
        let res;
        try {
          res = await enrollCohort(cohort.id, body);
        } catch (err) {
          const status = err?.status ?? err?.response?.status;
          if (err?.errorCode || err?.response?.data?.errorCode || (status >= 400 && status < 500)) {
            delete idempotencyKeys.current[cohort.id];
          }
          if (['COHORT_FULL', 'COHORT_ENROLLMENT_CLOSED', 'COHORT_SCHEDULE_CONFLICT'].includes(err?.errorCode)) {
            setConfirmCohort(null);
          }
          throw err;
        }
        setConfirmCohort(null);
        // Chỉ coi là đã ghi danh khi máy chủ xác nhận; còn lại chuyển sang PayOS hoặc trang trạng thái.
        if (res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid') {
          delete idempotencyKeys.current[cohort.id];
          if (onEnrolled) onEnrolled(res.id);
        } else if (typeof res?.checkoutUrl === 'string' && res.checkoutUrl.startsWith('https://')) {
          window.location.assign(res.checkoutUrl);
        } else if (onEnrolled) {
          onEnrolled(res?.id);
        }
      }, 'Đã ghi nhận yêu cầu ghi danh và giữ chỗ trong thời gian chờ thanh toán. Ghi danh chỉ hoàn tất khi máy chủ xác nhận thanh toán.')
    ).finally(() => {
      inFlight.current = false;
      setRefreshTick((t) => t + 1);
    });
  };

  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2>Lớp ôn JLPT cố định theo nhóm</h2>
          <p className="course-meta">
            Sĩ số tối đa và quyền ghi danh được kiểm soát chặt từ máy chủ. Vé tư vấn 1-1 không tự chuyển đổi thành quyền học nhóm.
          </p>
        </div>
        <span className="course-badge">
          Quyền lớp nhóm khả dụng: {activeEntitlements.length}
        </span>
      </div>

      {myEntitlements.length > 0 && (
        <div className="course-policy" style={{ marginBottom: 14 }}>
          <strong>Quyền ghi danh lớp nhóm của bạn:</strong>
          {myEntitlements.map((e) => (
            <p key={e.id} style={{ margin: '4px 0' }}>
              • Lớp #{e.studyCohortId} ({e.cohortName}) · {e.level} · Mã: <code>{e.entitlementReference}</code> · Nguồn: {e.sourceType} · Trạng thái: <strong>{e.status}</strong>
            </p>
          ))}
        </div>
      )}

      <div className="course-buttons" style={{ marginBottom: 16, alignItems: 'flex-end' }}>
        <label className="course-field" style={{ maxWidth: 220 }}>
          <span>Mentor</span>
          <select value={filters.mentorId} onChange={(e) => setFilter('mentorId', e.target.value)}>
            <option value="">Tất cả Mentor</option>
            {mentorOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="course-field" style={{ maxWidth: 150 }}>
          <span>Cấp độ JLPT</span>
          <select value={filters.level} onChange={(e) => setFilter('level', e.target.value)}>
            <option value="">Tất cả cấp độ</option>
            {levelOptions.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
        </label>
        <label className="course-field" style={{ maxWidth: 200 }}>
          <span>Cường độ</span>
          <select value={filters.intensity} onChange={(e) => setFilter('intensity', e.target.value)}>
            <option value="">Tất cả cường độ</option>
            {INTENSITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.sessionsPerWeek} buổi/tuần)</option>)}
          </select>
        </label>
        <label className="course-field" style={{ maxWidth: 150 }}>
          <span>Thứ trong tuần</span>
          <select value={filters.weekday} onChange={(e) => setFilter('weekday', e.target.value)}>
            <option value="">Bất kỳ</option>
            {WEEKDAYS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </label>
        <label className="course-field" style={{ maxWidth: 130 }}>
          <span>Từ giờ</span>
          <input type="time" value={filters.fromTime} onChange={(e) => setFilter('fromTime', e.target.value)} />
        </label>
        <label className="course-field" style={{ maxWidth: 130 }}>
          <span>Đến giờ</span>
          <input type="time" value={filters.toTime} onChange={(e) => setFilter('toTime', e.target.value)} />
        </label>
        <label className="course-field" style={{ maxWidth: 240 }}>
          <span>Tìm theo tên lớp</span>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ví dụ: N3 tối…" />
        </label>
        {(hasServerFilter || searchTerm) && (
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setSearchTerm(''); }}>Xóa bộ lọc</button>
        )}
      </div>
      {timeRangeInvalid && <p className="course-error">Giờ bắt đầu phải sớm hơn giờ kết thúc.</p>}
      {activeFiltered?.error && <p role="alert" className="course-error">{activeFiltered.error}</p>}

      {loadingFiltered ? (
        <p className="course-meta">Đang tìm lớp phù hợp…</p>
      ) : visibleCohorts.length === 0 ? (
        <p className="course-meta">Chưa có lớp phù hợp với bộ lọc. Hãy thử thay đổi bộ lọc hoặc chọn Mentor khác.</p>
      ) : (
        <div className="course-grid">
          {visibleCohorts.map((cohort) => {
            const canEnroll = cohort.enrollmentOpen === true && !cohort.myEnrollmentCourseId;
            const awaiting = cohort.myEnrollmentPaymentState === 'AwaitingPayment' && !!cohort.myEnrollmentCourseId;
            const statusReason = cohort.myEnrollmentCourseId
              ? `Bạn đã ghi danh lớp này (#${cohort.myEnrollmentCourseId} · ${cohort.myEnrollmentStatus})`
              : cohort.seatsAvailable <= 0
                ? 'Lớp đã đủ sĩ số.'
                : cohort.enrollmentOpen === false
                  ? cohort.entitlementStatusMessage || 'Lớp đã đóng ghi danh.'
                  : cohort.entitlementStatusMessage || 'Chưa mở ghi danh trực tiếp.';

            return (
              <CohortSummaryCard
                key={cohort.id}
                cohort={cohort}
                extra={<ReviewSummary summary={cohort.mentorId ? reviewSummaries[cohort.mentorId] : null} />}
              >
                {cohort.hasApprovedEntitlement ? (
                  <p className="course-notice" style={{ padding: '6px 10px', fontSize: 12.5 }}>
                    Đã có quyền ghi danh hợp lệ ({cohort.entitlementReference})
                  </p>
                ) : (
                  <p className="course-meta" style={{ color: '#8f2948' }}>{statusReason}</p>
                )}

                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className={canEnroll ? 'course-primary' : ''}
                    disabled={busy || (!awaiting && !canEnroll)}
                    onClick={() => (awaiting ? onEnrolled?.(cohort.myEnrollmentCourseId) : setConfirmCohort(cohort))}
                  >
                    {awaiting
                      ? 'Tiếp tục thanh toán'
                      : cohort.myEnrollmentCourseId
                        ? 'Đã tham gia lớp này'
                        : !canEnroll
                          ? 'Chưa thể ghi danh'
                          : cohort.hasApprovedEntitlement
                            ? 'Ghi danh bằng quyền học'
                            : 'Đăng ký & thanh toán trọn khóa'}
                  </button>
                </div>
              </CohortSummaryCard>
            );
          })}
        </div>
      )}

      {confirmCohort && (
        <div className="course-confirm" role="dialog" aria-label="Xác nhận ghi danh lớp nhóm">
          <h3>Xác nhận ghi danh: {confirmCohort.name}</h3>
          <p>
            Cấp độ: <strong>{confirmCohort.level}</strong> · Mentor: <strong>{confirmCohort.mentorName}</strong> · Khai giảng: {fmtDate(confirmCohort.startsAt)}
          </p>
          <p className="course-meta"><IntensityBadge cohort={confirmCohort} /> · JLPT {confirmCohort.level} · {confirmCohort.sessionMinutes ?? '—'} phút/buổi · {confirmCohort.totalSessions ?? confirmCohort.sessions?.length ?? 0} buổi</p>
          <p className="course-meta">Lịch học: {schedulePatternText(confirmCohort.schedulePattern, confirmCohort.sessions)}</p>
          {confirmCohort.hasApprovedEntitlement ? (
            <p className="course-meta">
              Ghi danh bằng quyền học: <code>{confirmCohort.entitlementReference || 'Theo kiểm tra chính sách máy chủ'}</code> · Không phát sinh thanh toán.
            </p>
          ) : (
            <>
              <p>Tổng học phí trọn khóa: <strong>{money(confirmCohort.price)}</strong></p>
              <p className="course-meta">
                Thanh toán qua PayOS. Chỗ được giữ trong thời gian chờ thanh toán (mặc định 10 phút). Ghi danh chỉ được xác nhận sau khi máy chủ xác minh thanh toán với PayOS.
              </p>
            </>
          )}
          <div className="course-buttons" style={{ marginTop: 10 }}>
            <button type="button" className="course-primary" disabled={busy} onClick={handleConfirmEnroll}>
              {confirmCohort.hasApprovedEntitlement ? 'Xác nhận ghi danh' : 'Xác nhận & chuyển tới PayOS'}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirmCohort(null)}>
              Hủy bỏ
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
