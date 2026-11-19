import { useEffect, useMemo, useRef, useState } from 'react';
import { enrollCohort, getCohorts, getMentorCohortReviewSummary, INTENSITY_OPTIONS } from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import { ContextualEmptyState, ContextualErrorState, Modal, SakuraLoader } from '@/components/ui';
import CohortSummaryCard, { IntensityBadge } from './CohortSummaryCard';
import { money, schedulePatternText } from '@/features/cohorts/utils/cohortCardModel';
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const FILTER_DEBOUNCE_MS = 350;
const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');
const ENTITLEMENT_SOURCE_LABELS = {
  AdminManualGrant: 'Admin cấp quyền',
  ScholarshipGrant: 'Học bổng / Tài trợ',
  RemediationApproved: 'Quyền ôn lại JLPT',
  PartnerSponsor: 'Đối tác tài trợ',
};
const ENTITLEMENT_STATUS_LABELS = {
  Active: 'Còn hiệu lực',
  Consumed: 'Đã sử dụng',
  Revoked: 'Đã thu hồi',
  Expired: 'Đã hết hạn',
};
const COURSE_STATUS_LABELS = {
  Active: 'Đang học',
  Ready: 'Chờ khai giảng',
  Completed: 'Đã hoàn thành',
  PendingPayment: 'Chờ thanh toán',
  Cancelled: 'Đã hủy',
};
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

function ReviewSummary({ state }) {
  const { tr } = useLocale();
  if (state === undefined) return <SakuraLoader variant="inline" size={14} context="cohort" label={tr('Đang tải đánh giá Giáo viên')} delay={160} />;
  if (state?.error) return <p className="course-meta">{tr('Đánh giá Giáo viên: Tạm chưa tải được')}</p>;
  const summary = state?.summary ?? null;
  if (!summary || !summary.reviewCount) return <p className="course-meta">{tr('Đánh giá Giáo viên: Chưa có đánh giá')}</p>;
  const latest = (summary.comments || []).filter((c) => c.comment).slice(0, 2);
  return (
    <div className="course-meta">
      {tr('Đánh giá Giáo viên:')}{' '}<strong>★ {Number(summary.averageRating).toFixed(1)}/5</strong> ({summary.reviewCount}{' '}{tr('đánh giá từ học viên lớp nhóm)')}
      {latest.length > 0 && (
        <details>
          <summary>{tr('Nhận xét gần đây')}</summary>
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
  enrolledCourses = [],
  myEntitlements = [],
  busy = false,
  onRun,
  onEnrolled,
  initialMentorId = '',
}) {
  const { tr, trf } = useLocale();
  // Arriving from a Mentor profile (/my-courses?mentorId=…) pre-filters that Mentor's cohorts.
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, mentorId: /^\d+$/.test(String(initialMentorId)) ? String(initialMentorId) : '' }));
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
    cohorts.forEach((c) => c.mentorId && map.set(c.mentorId, c.mentorName || tr('Giáo viên lớp nhóm')));
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [cohorts, tr]);
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
        .then((rows) => alive && setFiltered({ key, rows, error: '', errorObj: null }))
        .catch((err) => alive && setFiltered({ key, rows: [], error: describeApiError(err).message, errorObj: err }));
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
        .then((s) => setReviewSummaries((cur) => ({ ...cur, [id]: { error: false, summary: s || null } })))
        .catch(() => setReviewSummaries((cur) => ({ ...cur, [id]: { error: true, summary: null } })));
    });
  }, [visibleMentorIds]);

  const activeEnrolledWindows = useMemo(() => {
    const out = [];
    for (const c of enrolledCourses || []) {
      if (!c || c.status === 'Cancelled' || c.status === 'TransferredOut') continue;
      if (c.paymentStatus !== 'Paid' && c.paymentState !== 'AwaitingPayment' && c.paymentStatus !== 'Pending') continue;
      const mins = Number(c.sessionMinutes) || 90;
      for (const s of c.sessions || []) {
        if (s.status && s.status !== 'Scheduled' && s.status !== 'Confirmed' && s.status !== 'Assigned') continue;
        const start = parseUtcDate(s.scheduledAt || s.startTime);
        if (!start) continue;
        const end = parseUtcDate(s.endTime) || new Date(start.getTime() + mins * 60000);
        out.push({ cohortId: c.cohortId, name: c.cohortName || c.name || 'Lớp hiện tại', startMs: start.getTime(), endMs: end.getTime() });
      }
    }
    return out;
  }, [enrolledCourses]);

  const scheduleConflictByCohortId = useMemo(() => {
    const map = new Map();
    if (!activeEnrolledWindows.length) return map;
    for (const cohort of visibleCohorts) {
      if (!cohort?.sessions?.length || cohort.myEnrollmentCourseId) continue;
      const mins = Number(cohort.sessionMinutes) || 90;
      const conflict = cohort.sessions.find((s) => {
        const sStart = parseUtcDate(s.startTime || s.scheduledAt)?.getTime();
        const sEnd = parseUtcDate(s.endTime)?.getTime() || (sStart ? sStart + mins * 60000 : 0);
        if (!sStart || !sEnd) return false;
        return activeEnrolledWindows.some((w) => w.cohortId !== cohort.id && w.startMs < sEnd && sStart < w.endMs);
      });
      if (conflict) {
        const sStart = parseUtcDate(conflict.startTime || conflict.scheduledAt)?.getTime() || 0;
        const sEnd = parseUtcDate(conflict.endTime)?.getTime() || sStart + mins * 60000;
        const hit = activeEnrolledWindows.find((w) => w.cohortId !== cohort.id && w.startMs < sEnd && sStart < w.endMs);
        map.set(cohort.id, hit?.name || 'lớp học hiện tại');
      }
    }
    return map;
  }, [visibleCohorts, activeEnrolledWindows]);

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
        return res;
      }, (res) => (res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid'
        ? 'Ghi danh lớp học nhóm thành công!'
        : 'Đã giữ chỗ và chuyển tới PayOS. Ghi danh chỉ hoàn tất khi máy chủ xác nhận thanh toán.'))
    ).finally(() => {
      inFlight.current = false;
      setRefreshTick((t) => t + 1);
    });
  };

  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2>{tr('Lớp ôn JLPT cố định theo nhóm')}</h2>
          <p className="course-meta">
            {tr('Sĩ số tối đa (1–4 học viên), lịch 10 tuần (90 phút/buổi) và quyền ghi danh được kiểm soát chặt từ máy chủ.')}
          </p>
        </div>
        {activeEntitlements.length > 0 && (
          <span className="course-badge ok">
            {trf('Bạn có {0} quyền ghi danh chưa sử dụng', { 0: activeEntitlements.length })}
          </span>
        )}
      </div>

      {myEntitlements.length > 0 && (
        <div className="course-policy" style={{ marginBottom: 14 }}>
          <strong>{tr('Quyền ghi danh lớp nhóm của bạn')}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {/* Learner view: class name, level, source and status only — internal ids / reference codes stay in admin tools. */}
            {myEntitlements.map((e) => (
              <li key={e.id} style={{ margin: '3px 0' }}>
                {trf('{0} ({1}) · Nguồn: {2} · Trạng thái: {3}', {
                  0: e.cohortName || tr('Lớp học nhóm'),
                  1: e.level,
                  2: tr(ENTITLEMENT_SOURCE_LABELS[e.sourceType] || 'Khác'),
                  3: tr(ENTITLEMENT_STATUS_LABELS[e.status] || e.status),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 items-end">
        <label className="course-field">
          <span>{tr('Giáo viên')}</span>
          <select value={filters.mentorId} onChange={(e) => setFilter('mentorId', e.target.value)}>
            <option value="">{tr('Tất cả Giáo viên')}</option>
            {mentorOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="course-field">
          <span>{tr('Cấp độ JLPT')}</span>
          <select value={filters.level} onChange={(e) => setFilter('level', e.target.value)}>
            <option value="">{tr('Tất cả cấp độ')}</option>
            {levelOptions.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
        </label>
        <label className="course-field">
          <span>{tr('Cường độ')}</span>
          <select value={filters.intensity} onChange={(e) => setFilter('intensity', e.target.value)}>
            <option value="">{tr('Tất cả cường độ')}</option>
            {INTENSITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{trf('{0} ({1} buổi/tuần)', { 0: o.label, 1: o.sessionsPerWeek })}</option>)}
          </select>
        </label>
        <label className="course-field">
          <span>{tr('Thứ trong tuần')}</span>
          <select value={filters.weekday} onChange={(e) => setFilter('weekday', e.target.value)}>
            <option value="">{tr('Bất kỳ')}</option>
            {WEEKDAYS.map((w) => <option key={w.value} value={w.value}>{tr(w.label)}</option>)}
          </select>
        </label>
        <label className="course-field">
          <span>{tr('Từ giờ')}</span>
          <input type="time" value={filters.fromTime} onChange={(e) => setFilter('fromTime', e.target.value)} />
        </label>
        <label className="course-field">
          <span>{tr('Đến giờ')}</span>
          <input type="time" value={filters.toTime} onChange={(e) => setFilter('toTime', e.target.value)} />
        </label>
        <label className="course-field">
          <span>{tr('Tìm theo tên lớp')}</span>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={tr('Ví dụ: N3 tối…')} />
        </label>
        {(hasServerFilter || searchTerm) && (
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setSearchTerm(''); }}>{tr('Xóa bộ lọc')}</button>
        )}
      </div>
      {timeRangeInvalid && <p className="course-error">{tr('Giờ bắt đầu phải sớm hơn giờ kết thúc.')}</p>}

      {loadingFiltered ? (
        <SakuraLoader variant="section" size={32} context="cohort" label={tr('Đang tìm lớp phù hợp')} className="min-h-[120px] py-4" delay={160} />
      ) : activeFiltered?.errorObj ? (
        <ContextualErrorState
          compact
          error={activeFiltered.errorObj}
          title={tr('Chưa lọc được danh sách lớp')}
          onRetry={() => setRefreshTick((t) => t + 1)}
        />
      ) : visibleCohorts.length === 0 ? (
        <ContextualEmptyState
          compact
          art="search"
          title={tr('Chưa có lớp phù hợp với bộ lọc')}
          description={tr('Hãy thử thay đổi bộ lọc hoặc chọn Giáo viên khác.')}
        />
      ) : (
        <div className="course-grid">
          {visibleCohorts.map((cohort) => {
            const conflictCourseName = scheduleConflictByCohortId.get(cohort.id);
            const canEnroll = cohort.enrollmentOpen === true && !cohort.myEnrollmentCourseId && !conflictCourseName;
            const awaiting = cohort.myEnrollmentPaymentState === 'AwaitingPayment' && !!cohort.myEnrollmentCourseId;
            const statusReason = cohort.myEnrollmentCourseId
              ? trf('Bạn đã ghi danh lớp này ({0})', { 0: tr(COURSE_STATUS_LABELS[cohort.myEnrollmentStatus] || cohort.myEnrollmentStatus) })
              : conflictCourseName
                ? trf('Trùng lịch học hiện tại với {0}.', { 0: conflictCourseName })
                : cohort.seatsAvailable != null && cohort.seatsAvailable <= 0
                  ? 'Lớp đã đủ sĩ số.'
                  : cohort.enrollmentOpen === false
                    ? cohort.entitlementStatusMessage || 'Lớp đã đóng ghi danh.'
                    : cohort.entitlementStatusMessage || 'Chưa mở ghi danh trực tiếp.';

            return (
              <CohortSummaryCard
                key={cohort.id}
                cohort={cohort}
                extra={<ReviewSummary state={cohort.mentorId ? reviewSummaries[cohort.mentorId] : null} />}
              >
                {cohort.hasApprovedEntitlement ? (
                  <p className="course-notice" style={{ padding: '6px 10px', fontSize: 12.5 }}>
                    {tr('Đã được Admin cấp quyền ghi danh cho lớp này.')}
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
                      ? tr('Tiếp tục thanh toán')
                      : cohort.myEnrollmentCourseId
                        ? tr('Đã tham gia lớp này')
                        : !canEnroll
                          ? tr('Chưa thể ghi danh')
                          : cohort.hasApprovedEntitlement
                            ? tr('Ghi danh bằng quyền học')
                            : tr('Đăng ký & thanh toán trọn khóa')}
                  </button>
                </div>
              </CohortSummaryCard>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(confirmCohort)}
        onClose={() => { if (!busy) setConfirmCohort(null); }}
        title={confirmCohort ? trf('Xác nhận ghi danh: {0}', { 0: confirmCohort.name }) : ''}
        size="sm"
      >
        {confirmCohort && (
          <div className="space-y-3 text-[13px] text-rp-text-2">
            <p className="text-rp-text">
              {tr('Cấp độ:')}{' '}<strong>{confirmCohort.level}</strong> · {tr('Giáo viên:')} <strong>{confirmCohort.mentorName}</strong>{' '}{tr('· Khai giảng:')}{' '}{fmtDate(confirmCohort.startsAt)}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-rp-text-muted">
              <IntensityBadge cohort={confirmCohort} />
              <span>JLPT {confirmCohort.level} · {confirmCohort.sessionMinutes ?? '—'}{' '}{tr('phút/buổi ·')}{' '}{confirmCohort.totalSessions ?? confirmCohort.sessions?.length ?? 0}{' '}{tr('buổi')}</span>
            </div>
            <p className="text-xs text-rp-text-muted">{trf('Lịch học: {0}', { 0: schedulePatternText(confirmCohort.schedulePattern, confirmCohort.sessions) })}</p>
            {confirmCohort.hasApprovedEntitlement ? (
              <p className="rounded-xl border border-rp-success-line bg-rp-success-bg px-3 py-2 text-xs text-rp-success">
                {tr('Ghi danh bằng quyền học đã được Admin cấp · Không phát sinh thanh toán.')}
              </p>
            ) : (
              <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3 space-y-1.5">
                <p className="text-rp-text">{tr('Tổng học phí trọn khóa:')}{' '}<strong className="text-rp-brand-strong">{money(confirmCohort.price)}</strong></p>
                <p className="text-xs leading-relaxed text-rp-text-muted">
                  {tr('Thanh toán qua PayOS. Chỗ được giữ trong thời gian chờ thanh toán (mặc định 10 phút). Ghi danh chỉ được xác nhận sau khi máy chủ xác minh thanh toán với PayOS.')}
                </p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-rp-line">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmCohort(null)}
                className="rounded-xl border border-rp-line bg-white px-4 py-2 text-xs font-semibold text-rp-text-2 hover:bg-rp-bg-2 disabled:opacity-50 rp-press"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmEnroll}
                className="rounded-xl bg-rp-brand-strong px-4 py-2 text-xs font-semibold text-white hover:bg-rp-brand-deep disabled:opacity-50 rp-press"
              >
                {confirmCohort.hasApprovedEntitlement ? tr('Xác nhận ghi danh') : tr('Xác nhận & chuyển tới PayOS')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
