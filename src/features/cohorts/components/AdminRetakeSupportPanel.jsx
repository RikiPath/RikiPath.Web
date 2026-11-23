import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Checkbox,
  ContextualEmptyState,
  CustomSelect,
  Field,
  SearchInput,
  Textarea,
} from '@/components/ui';
import { coursePost, openRetakeEvidence } from '@/features/cohorts/api/cohortApi.js';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale, translateText } from '@/locales/locale.js';

const STATUS_LABELS = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Chờ mở khóa',
  Active: 'Đang học',
  Completed: 'Đã chốt khóa',
  Published: 'Đang mở đăng ký',
  Draft: 'Bản nháp',
  Archived: 'Đã lưu trữ',
  Cancelled: 'Đã hủy',
  PaymentFailed: 'Thanh toán không thành công',
  PaymentExpired: 'Thanh toán hết hạn',
  PaymentReview: 'Đã nhận thanh toán – chờ Admin xử lý',
  Scheduled: 'Chờ học',
  Present: 'Có mặt',
  Absent: 'Vắng',
  ExcusedAbsent: 'Vắng có phép',
  CancelledByMentor: 'Giáo viên hủy',
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Transferred: 'Đã chuyển lớp',
  TransferredOut: 'Đã chuyển sang lớp khác',
  Withdrawn: 'Đã rút',
};

const showStatus = (value) => translateText(STATUS_LABELS[value] || value || '');
const fmtDate = (value) => (value ? formatVnDateTime(value, '—') : '—');

function findRoomId(session, cohort) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohort?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohort?.sessions?.[0];
  return match?.roomId || null;
}

function RetakeDecisionForm({ busy, canClaim, cohorts, excludeCohortId, onSubmit }) {
  const { tr } = useLocale();
  const [decision, setDecision] = useState('reject');
  const [nextCohortId, setNextCohortId] = useState('');
  const [verified, setVerified] = useState(false);
  const [response, setResponse] = useState('');

  return (
    <form
      className="space-y-3 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!response.trim()) return;
        onSubmit({
          approve: decision === 'approve',
          officialFailureVerified: verified,
          cohortId: nextCohortId ? Number(nextCohortId) : null,
          response: response.trim(),
        });
      }}
    >
      <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Quyết định của Admin')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr('Quyết định')}>
          <CustomSelect
            value={decision}
            aria-label={tr('Quyết định hỗ trợ')}
            onChange={setDecision}
            options={[
              { value: 'reject', label: tr('Từ chối') },
              ...(canClaim ? [{ value: 'approve', label: tr('Duyệt hỗ trợ ôn lại') }] : []),
            ]}
          />
        </Field>
        <Field label={tr('Lớp nhóm kế tiếp (nếu duyệt)')}>
          <CustomSelect
            value={nextCohortId}
            aria-label={tr('Lớp nhóm kế tiếp')}
            onChange={setNextCohortId}
            options={[
              { value: '', label: tr('Chọn lớp kế tiếp') },
              ...cohorts.filter((x) => x.id !== excludeCohortId).map((x) => ({
                value: String(x.id),
                label: `${x.name} (${x.level})`,
              })),
            ]}
          />
        </Field>
      </div>
      <Checkbox
        checked={verified}
        onChange={(e) => setVerified(e.target.checked)}
        label={tr('Đã xác minh minh chứng trượt JLPT chính thức')}
      />
      <Field label={tr('Lý do quyết định')} required>
        <Textarea
          rows={3}
          required
          maxLength={2000}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !response.trim()}>{tr('Xác nhận')}</Button>
      </div>
    </form>
  );
}

/**
 * Enrollments & JLPT Retake review console used by /admin/retake-support and deep-links.
 */
export default function AdminRetakeSupportPanel({
  courses = [],
  cohorts = [],
  selectedCourseId,
  onSelectCourse,
  busy = false,
  onRun,
}) {
  const { tr, trf } = useLocale();
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [retakeOnly, setRetakeOnly] = useState(false);

  const pendingRetakeTotal = useMemo(
    () => courses.reduce((n, c) => n + (c.requests || []).filter((r) => r.status === 'Pending').length, 0),
    [courses],
  );

  const filteredEnrollments = useMemo(() => {
    const q = enrollmentSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (retakeOnly && !(c.requests || []).some((r) => r.status === 'Pending')) return false;
      if (!q) return true;
      return (
        String(c.name || '').toLowerCase().includes(q)
        || String(c.learnerName || '').toLowerCase().includes(q)
        || String(c.mentorName || '').toLowerCase().includes(q)
        || String(c.level || '').toLowerCase().includes(q)
      );
    });
  }, [courses, enrollmentSearch, retakeOnly]);

  const currentCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || filteredEnrollments[0] || courses[0] || null,
    [courses, filteredEnrollments, selectedCourseId],
  );
  const currentCohort = useMemo(
    () => (currentCourse?.cohortId ? cohorts.find((g) => g.id === currentCourse.cohortId) || null : null),
    [cohorts, currentCourse],
  );
  const hasFilters = Boolean(enrollmentSearch.trim() || retakeOnly);

  if (courses.length === 0) {
    return (
      <section className="course-box">
        <ContextualEmptyState
          variant="compact"
          illustration="classroom"
          title={tr('Chưa có hồ sơ ghi danh lớp nhóm nào.')}
          description={tr('Khi học viên đăng ký lớp học nhóm, hồ sơ ghi danh và yêu cầu hỗ trợ ôn lại JLPT sẽ hiển thị tại đây.')}
        />
      </section>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.42fr)_minmax(0,0.58fr)] lg:items-start">
      <section className="course-box space-y-3">
        <div>
          <h2 className="m-0">
            {trf('Hồ sơ ghi danh ({0}) · {1} yêu cầu JLPT chờ duyệt', { 0: courses.length, 1: pendingRetakeTotal })}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            value={enrollmentSearch}
            onChange={(e) => setEnrollmentSearch(e.target.value)}
            onClear={() => setEnrollmentSearch('')}
            placeholder="Tìm học viên, lớp, Giáo viên…"
            aria-label={tr('Tìm hồ sơ ghi danh')}
            className="w-full sm:w-[240px]"
            inputClassName="h-9"
          />
          <Checkbox
            checked={retakeOnly}
            onChange={(e) => setRetakeOnly(e.target.checked)}
            label={tr('Chờ duyệt JLPT')}
          />
        </div>

        {filteredEnrollments.length === 0 ? (
          <ContextualEmptyState
            variant="search"
            illustration="search"
            title={tr('Không có hồ sơ ghi danh phù hợp.')}
            description={tr('Thử bỏ chọn bộ lọc hoặc tìm với từ khóa khác.')}
            action={
              hasFilters ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEnrollmentSearch('');
                    setRetakeOnly(false);
                  }}
                >
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {filteredEnrollments.map((c) => {
              const selected = currentCourse?.id === c.id;
              const pendingReqs = (c.requests || []).filter((r) => r.status === 'Pending').length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCourse?.(c.id)}
                  className={`block w-full rounded-xl border p-3 text-left transition ${selected ? 'border-rp-brand-strong bg-rp-brand-tint/35' : 'border-rp-line bg-white hover:border-rp-brand-border'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-rp-text">{c.learnerName || tr('Học viên')}</strong>
                    <span className={`course-badge ${c.status === 'Active' ? 'ok' : c.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                      {showStatus(c.status)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-rp-text-2">{c.name} ({c.level})</p>
                  <p className="mt-0.5 text-[11.5px] text-rp-text-muted">
                    {tr('Giáo viên:')} {c.mentorName || tr('Chưa phân công')}
                    {pendingReqs > 0 ? ` · ${trf('{0} yêu cầu JLPT', { 0: pendingReqs })}` : ''}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="min-w-0 space-y-4">
        {!currentCourse ? (
          <section className="course-box">
            <ContextualEmptyState variant="compact" illustration="classroom" title={tr('Chọn một hồ sơ ghi danh bên trái để xem chi tiết')} />
          </section>
        ) : (
          <>
            <section className="course-box space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="course-badge">{currentCourse.level} · {tr('Học nhóm')}</span>{' '}
                  <span className={`course-badge ${currentCourse.status === 'Active' ? 'ok' : currentCourse.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                    {showStatus(currentCourse.status)}
                  </span>
                </div>
                <span className="course-meta">{currentCohort?.name || tr('Lớp học nhóm')}</span>
              </div>
              <h2 className="m-0">{currentCourse.name}</h2>
              <p className="course-meta m-0">
                {tr('Học viên:')}{' '}<strong>{currentCourse.learnerName}</strong> · {tr('Giáo viên:')} <strong>{currentCourse.mentorName || tr('Chưa phân công')}</strong>
              </p>
              <p className="course-meta m-0">
                {trf('{0} buổi · {1} phút/buổi · Bắt đầu: {2}', { 0: currentCourse.totalSessions, 1: currentCourse.sessionMinutes, 2: fmtDate(currentCourse.startsAt) })}
              </p>
              <div>
                <h3 className="m-0">{tr('Tiến độ bài tập & điều kiện ôn lại')}</h3>
                <p className="mt-1 text-sm">
                  {tr('Bài tập đạt đúng hạn:')}{' '}<strong>{currentCourse.eligibility.passedOnTimeHomework}/{currentCourse.eligibility.requiredHomework}</strong>{' '}{tr('· Vắng:')}{' '}<strong>{currentCourse.eligibility.absentSessions}/{currentCourse.eligibility.countedSessions}</strong>{' '}{tr('buổi')}
                </p>
                <p className="course-meta m-0">
                  {currentCourse.eligibility.canClaim
                    ? tr('Đủ điều kiện nộp minh chứng trượt JLPT chính thức để Admin xem xét hỗ trợ.')
                    : currentCourse.eligibility.reasons.join(' ')}
                </p>
              </div>
              {currentCourse.status === 'Active' && (
                <form
                  className="space-y-2.5 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-3.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRun?.(() => coursePost(`/${currentCourse.id}/complete`, {}), 'Đã chốt hoàn thành khóa học.');
                  }}
                >
                  <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Chốt hoàn thành khóa')}</h3>
                  <Checkbox required label={tr('Xác nhận đủ buổi cam kết và hoàn tất kiểm tra.')} />
                  <div>
                    <Button size="sm" type="submit" disabled={busy}>{tr('Chốt dữ liệu khóa')}</Button>
                  </div>
                </form>
              )}
            </section>

            <CohortSessionsCalendar course={currentCourse} cohort={currentCohort}>
              {(currentCourse.sessions || []).length === 0 ? (
                <ContextualEmptyState
                  variant="inline"
                  size="sm"
                  illustration="calendar"
                  title={tr('Chưa có buổi học nào.')}
                />
              ) : (
                currentCourse.sessions.map((s) => {
                  const roomId = findRoomId(s, currentCohort);
                  return (
                    <article className="course-row" key={s.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong>{tr('Buổi')}{' '}{s.number}{s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}</strong> · {fmtDate(s.scheduledAt)} ·{' '}
                          <span className={`course-badge ${s.status === 'Present' ? 'ok' : s.status === 'Scheduled' ? 'warn' : 'muted'}`}>
                            {showStatus(s.status)}
                          </span>
                        </div>
                        {roomId && (
                          <Link className="course-pill-link" to={`/meeting-room/${roomId}`}>
                            {tr('Vào phòng học chung')}
                          </Link>
                        )}
                      </div>
                      {s.note && <p className="course-meta">{tr(s.note)}</p>}
                    </article>
                  );
                })
              )}
            </CohortSessionsCalendar>

            <section className="course-box space-y-3">
              <h2 className="m-0">{tr('Hỗ trợ ôn lại khi trượt JLPT chính thức')}</h2>
              {currentCourse.requests.length === 0 ? (
                <ContextualEmptyState
                  variant="inline"
                  size="sm"
                  illustration="certificate"
                  title={tr('Chưa có yêu cầu hỗ trợ JLPT nào.')}
                />
              ) : (
                currentCourse.requests.map((r) => (
                  <article className="course-row space-y-2" key={r.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3>{trf('Yêu cầu hỗ trợ · {0}', { 0: showStatus(r.status) })}</h3>
                      <span className="course-meta">{trf('Thi: {0} · Công bố: {1}', { 0: fmtDate(r.examDate), 1: fmtDate(r.resultPublishedAt) })}</span>
                    </div>
                    {r.reason && <p className="course-pre"><strong>{tr('Lý do học viên:')}</strong> {tr(r.reason)}</p>}
                    {r.response && <p className="course-pre"><strong>{tr('Quyết định của Admin:')}</strong> {r.response}</p>}
                    {r.mentorSupportPlan && (
                      <div className="course-notice">
                        <strong>{trf('Lộ trình hỗ trợ từ Giáo viên ({0}):', { 0: fmtDate(r.mentorSupportPlanAtUtc) })}</strong>
                        <p className="course-pre">{r.mentorSupportPlan}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onRun?.(() => openRetakeEvidence(currentCourse.id, r.id), 'Đã tải minh chứng riêng tư.')}
                    >
                      {tr('Tải minh chứng riêng tư')}
                    </Button>
                    {r.status === 'Pending' && (
                      <RetakeDecisionForm
                        busy={busy}
                        canClaim={currentCourse.eligibility.canClaim}
                        cohorts={cohorts}
                        excludeCohortId={currentCourse.cohortId}
                        onSubmit={(payload) =>
                          onRun?.(() => coursePost(`/${currentCourse.id}/retake/${r.id}/review`, {
                            ...payload,
                            onTimeHomeworkEvidenceVerified: currentCourse.eligibility.homeworkMet,
                          }))
                        }
                      />
                    )}
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
