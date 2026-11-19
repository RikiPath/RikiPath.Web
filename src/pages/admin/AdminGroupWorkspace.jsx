import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { AdminShell } from '@/layouts';
import {
  ContextualEmptyState,
  ContextualErrorState,
  FeatureIcon,
  SakuraLoader,
  Tabs,
  notify,
} from '@/components/ui';
import {
  courseGet,
  coursePost,
  getAdminAvailabilitySlots,
  getCohorts,
  INTENSITY_OPTIONS,
  openRetakeEvidence,
  saveCoursePlan,
} from '@/features/cohorts/api/cohortApi.js';
import { getCurrentMentorGroupPolicy } from '@/features/admin/api/adminApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import AdminCohortConsolePanel from '@/features/cohorts/components/AdminCohortConsolePanel.jsx';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import AdminMentorReplacementPanel from '@/features/cohorts/components/AdminMentorReplacementPanel.jsx';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import '@/pages/shared/studyCourses.css';
import { useLocale, currentIntlTag, translateText } from '@/locales/locale.js';

const LABELS = {
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

const WORKSPACE_TABS = [
  { id: 'cohorts', label: 'Lớp học & Quyền ghi danh' },
  { id: 'plans', label: 'Gói khóa học' },
  { id: 'enrollments', label: 'Ghi danh & Ôn lại JLPT' },
  { id: 'requests', label: 'Dời lịch & Đổi Giáo viên' },
  { id: 'cases', label: 'Chuyển lớp & Khiếu nại' },
];

const DEFAULT_COURSE_WEEKS = 10;
const DEFAULT_SESSION_MINUTES = 90;
const show = (value) => translateText(LABELS[value] || value || '');
const fmtDate = (value) => (value ? formatVnDateTime(value, '—') : '—');
const money = (value) => `${Number(value || 0).toLocaleString(currentIntlTag())} ₫`;

const blankPlan = {
  name: '',
  certificateLevelId: '',
  durationMonths: 3,
  intensity: 'Standard',
  sessionsPerWeek: 3,
  sessionMinutes: DEFAULT_SESSION_MINUTES,
  totalSessions: DEFAULT_COURSE_WEEKS * 3,
  retakeClaimDays: '',
  price: '',
  isPublished: false,
  revision: 1,
  sessionType: 'Group',
  capacity: 4,
};

function findRoomId(session, cohort) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohort?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohort?.sessions?.[0];
  return match?.roomId || null;
}

async function fetchAdminGroupSnapshot() {
  return Promise.all([
    courseGet(),
    courseGet('/plans'),
    courseGet('/catalog'),
    getCohorts(),
    courseGet('/mentors'),
    getAdminAvailabilitySlots(),
  ]);
}

export default function AdminGroupWorkspace() {
  const { tr, trf } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const courseIdParam = searchParams.get('courseId');
  const scheduleReqIdParam = searchParams.get('cohortScheduleRequestId');
  const transferReqIdParam = searchParams.get('transferRequestId');
  const complaintIdParam = searchParams.get('complaintId');
  const rawSection = searchParams.get('section');

  const activeSection = WORKSPACE_TABS.some((t) => t.id === rawSection)
    ? rawSection
    : courseIdParam
      ? 'enrollments'
      : scheduleReqIdParam
        ? 'requests'
        : transferReqIdParam || complaintIdParam
          ? 'cases'
          : 'cohorts';

  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [levels, setLevels] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [adminSlots, setAdminSlots] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(() => (courseIdParam ? Number(courseIdParam) : null));
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [retakeOnly, setRetakeOnly] = useState(false);

  const [plan, setPlan] = useState(blankPlan);
  const [groupPolicy, setGroupPolicy] = useState(null);
  const [policyError, setPolicyError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const initialAppliedRef = useRef(false);

  function applySnapshot([c, p, l, ch, m, slots]) {
    const list = Array.isArray(c) ? c : [];
    setCourses(list);
    setPlans(Array.isArray(p) ? p : []);
    setLevels(Array.isArray(l) ? l : []);
    setCohorts(Array.isArray(ch) ? ch : []);
    setMentors(Array.isArray(m) ? m : []);
    setAdminSlots(Array.isArray(slots) ? slots : []);
    setLoadError(null);

    if (!initialAppliedRef.current && courseIdParam) {
      initialAppliedRef.current = true;
      const cid = Number(courseIdParam);
      if (list.some((x) => x.id === cid)) setSelectedCourseId(cid);
    } else {
      setSelectedCourseId((cur) => (cur && list.some((x) => x.id === cur) ? cur : list[0]?.id || null));
    }
  }

  async function loadSnapshot() {
    applySnapshot(await fetchAdminGroupSnapshot());
  }

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchAdminGroupSnapshot().then((data) => { if (alive) applySnapshot(data); }),
      getCurrentMentorGroupPolicy()
        .then((p) => { if (alive) { setGroupPolicy(p || null); setPolicyError(null); } })
        .catch((e) => { if (alive) { setGroupPolicy(null); setPolicyError(e); } }),
    ])
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchSection(section) {
    const next = new URLSearchParams(searchParams);
    next.set('section', section);
    setSearchParams(next, { replace: true });
  }

  async function runAction(fn, message = 'Đã lưu thay đổi.', opts = {}) {
    if (busy) return;
    setBusy(true);
    const key = opts.key || 'admin-group-action';
    const toastId = opts.silentLoading ? null : notify.loading(opts.loading || 'Đang xử lý…', '', { key });
    try {
      const result = await fn();
      await loadSnapshot();
      const resolved = typeof message === 'function' ? message(result) : message;
      if (resolved) {
        notify.success(resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
    } catch (e) {
      const info = describeApiError(e);
      notify.apiError(e, opts.errorTitle || 'Chưa thực hiện được', { id: toastId || undefined, key, replace: true });
      if (info.code === 'CONCURRENCY_CONFLICT' || info.code === 'COHORT_SCHEDULE_REVISION_CONFLICT' || info.code === 'COHORT_FULL') {
        loadSnapshot().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  const courseWeeks = Number(groupPolicy?.courseDurationWeeks) || DEFAULT_COURSE_WEEKS;
  const policySessionMinutes = Number(groupPolicy?.sessionMinutes) || DEFAULT_SESSION_MINUTES;
  const allowedSpw = useMemo(() => {
    const parsed = String(groupPolicy?.allowedSessionsPerWeekCsv || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return parsed.length ? parsed : [2, 3, 4];
  }, [groupPolicy]);
  const intensityOptions = INTENSITY_OPTIONS.filter((o) => allowedSpw.includes(o.sessionsPerWeek));
  const recommendedSpw = Number(groupPolicy?.defaultSessionsPerWeek) || 3;

  const changePlan = (key, value) =>
    setPlan((p) => {
      if (key !== 'sessionsPerWeek') return { ...p, [key]: value };
      const match = INTENSITY_OPTIONS.find((o) => o.sessionsPerWeek === Number(value));
      return { ...p, sessionsPerWeek: value, intensity: match ? match.value : 'Custom' };
    });

  const applyIntensity = (intensity) =>
    setPlan((p) => {
      const opt = INTENSITY_OPTIONS.find((o) => o.value === intensity);
      if (!opt) return { ...p, intensity };
      return {
        ...p,
        intensity,
        sessionsPerWeek: opt.sessionsPerWeek,
        totalSessions: courseWeeks * opt.sessionsPerWeek,
        sessionMinutes: policySessionMinutes,
      };
    });

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

  return (
    <AdminShell breadcrumb={tr('Gói học, lớp & ghi danh')}>
      <main className="course-page space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <FeatureIcon feature="mentor" size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rp-brand">
                {tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
              </p>
              <h1 className="m-0">{tr('Quản lý Lớp nhóm, Quyền & Khóa JLPT')}</h1>
              <p className="course-meta m-0 mt-1">
                {tr('Tổ chức lớp học nhóm cố định, cấu hình gói khóa học, quản lý ghi danh và xử lý các yêu cầu phát sinh theo quy chuẩn.')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/mentor-group-policy/"
              className="rp-focus inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
            >
              {tr('Chính sách lớp nhóm')}
            </Link>
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => runAction(loadSnapshot, '', { silentLoading: true })}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text hover:bg-rp-brand-tint"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {tr('Tải lại')}
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-rp-line bg-white p-2.5 shadow-rp-xs">
          <Tabs
            className="sm:flex-wrap"
            value={activeSection}
            onChange={switchSection}
            label={tr('Không gian quản trị học nhóm')}
            tabs={WORKSPACE_TABS.map((t) => ({
              value: t.id,
              label: tr(t.label),
              count: t.id === 'cohorts'
                ? cohorts.length
                : t.id === 'plans'
                  ? plans.length
                  : t.id === 'enrollments'
                    ? (pendingRetakeTotal || courses.length)
                    : undefined,
            }))}
          />
        </section>

        {policyError && (
          <section className="course-box">
            <ContextualErrorState
              variant="inline"
              error={policyError}
              title={tr('Chưa tải được chính sách lớp nhóm hiện hành')}
              onRetry={() => getCurrentMentorGroupPolicy().then((p) => { setGroupPolicy(p || null); setPolicyError(null); }).catch(setPolicyError)}
            />
          </section>
        )}

        {loading ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : loadError && courses.length === 0 && cohorts.length === 0 ? (
          <section className="course-box">
            <ContextualErrorState
              error={loadError}
              title={tr('Chưa tải được dữ liệu lớp học nhóm')}
              onRetry={() => runAction(loadSnapshot, '', { silentLoading: true })}
              retrying={busy}
            />
          </section>
        ) : (
          <>
            {/* ---------- TAB 1: COHORTS & ENTITLEMENTS ---------- */}
            {activeSection === 'cohorts' && (
              <div className="space-y-5">
                <AdminCohortConsolePanel
                  plans={plans}
                  cohorts={cohorts}
                  mentors={mentors}
                  adminSlots={adminSlots}
                  busy={busy}
                  onRun={runAction}
                />
              </div>
            )}

            {/* ---------- TAB 2: PLANS ---------- */}
            {activeSection === 'plans' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
                <section className="course-box">
                  <h2>{tr('Cấu hình gói khóa học')}</h2>
                  <form
                    className="course-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runAction(async () => {
                        await saveCoursePlan({
                          ...plan,
                          intensity: plan.intensity || 'Custom',
                          certificateLevelId: Number(plan.certificateLevelId),
                          durationMonths: Number(plan.durationMonths),
                          sessionsPerWeek: Number(plan.sessionsPerWeek),
                          sessionMinutes: plan.sessionMinutes === '' ? null : Number(plan.sessionMinutes),
                          totalSessions: plan.totalSessions === '' ? null : Number(plan.totalSessions),
                          retakeClaimDays: plan.retakeClaimDays === '' ? null : Number(plan.retakeClaimDays),
                          price: Number(plan.price || 0),
                          capacity: Number(plan.capacity || 1),
                        });
                        setPlan({ ...blankPlan });
                      });
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ width: '100%' }}>
                      <h3 style={{ margin: 0 }}>{plan.id ? trf('Sửa gói #{0}', { 0: plan.id }) : tr('Tạo gói mới')}</h3>
                      {plan.id && <button type="button" onClick={() => setPlan({ ...blankPlan })}>{tr('Tạo mới')}</button>}
                    </div>
                    <fieldset disabled={busy}>
                      <label className="course-field">
                        <span>{tr('Tên gói')}</span>
                        <input required maxLength={200} value={plan.name} onChange={(e) => changePlan('name', e.target.value)} />
                      </label>
                      <label className="course-field">
                        <span>{tr('Cường độ học')}</span>
                        <select value={plan.intensity || 'Custom'} onChange={(e) => applyIntensity(e.target.value)}>
                          {intensityOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {tr(o.label)} · {o.sessionsPerWeek}{' '}{tr('buổi/tuần')}{o.sessionsPerWeek === recommendedSpw ? tr(' (khuyến nghị)') : ''}
                            </option>
                          ))}
                          <option value="Custom">{tr('Tùy chỉnh')}</option>
                        </select>
                      </label>
                      <p className="course-meta" style={{ flexBasis: '100%' }}>
                        {tr('Khóa')}{' '}{courseWeeks}{' '}{tr('tuần ·')}{' '}{plan.sessionsPerWeek || '—'}{' '}{tr('buổi/tuần ·')}{' '}{plan.totalSessions || '—'}{' '}{tr('buổi ·')}{' '}
                        {plan.sessionMinutes || '—'}{' '}{tr('phút/buổi')}
                        {plan.totalSessions && plan.sessionMinutes ? trf(' · tổng {0} giờ', { 0: Math.round((Number(plan.totalSessions) * Number(plan.sessionMinutes)) / 6) / 10 }) : ''}
                      </p>
                      <label className="course-field">
                        <span>{tr('Sĩ số tối đa')}</span>
                        <input type="number" min={1} max={20} value={plan.capacity ?? 1} onChange={(e) => changePlan('capacity', e.target.value)} />
                      </label>
                      <label className="course-field">
                        <span>{tr('Cấp độ JLPT')}</span>
                        <select required value={plan.certificateLevelId} onChange={(e) => changePlan('certificateLevelId', e.target.value)}>
                          <option value="">{tr('Chọn cấp độ')}</option>
                          {levels.map((l) => <option key={l.id} value={l.id}>{l.certificateType} · {l.code}</option>)}
                        </select>
                      </label>
                      {[
                        ['durationMonths', 'Số tháng', 1, 36],
                        ['sessionsPerWeek', 'Buổi/tuần', 1, 7],
                        ['sessionMinutes', 'Phút/buổi', 15, 240],
                        ['totalSessions', 'Tổng buổi', 1, 500],
                        ['retakeClaimDays', 'Hạn yêu cầu JLPT (ngày)', 1, 730],
                        ['price', 'Học phí (VND)', 0, 2147483647],
                      ].map(([key, title, min, max]) => (
                        <label key={key} className="course-field">
                          <span>{tr(title)}</span>
                          <input
                            type="number"
                            min={min}
                            max={max}
                            required={key === 'durationMonths' || key === 'sessionsPerWeek'}
                            value={plan[key] ?? ''}
                            onChange={(e) => changePlan(key, e.target.value)}
                          />
                        </label>
                      ))}
                      <label style={{ flexBasis: '100%' }}>
                        <input type="checkbox" checked={plan.isPublished} onChange={(e) => changePlan('isPublished', e.target.checked)} />{' '}{tr('Mở bán')}
                      </label>
                      <button className="course-primary" type="submit">{tr('Lưu')}</button>
                    </fieldset>
                  </form>
                </section>

                <section className="course-box">
                  <h2>{trf('Danh sách gói đã cấu hình ({0})', { 0: plans.length })}</h2>
                  <div className="course-grid">
                    {plans.map((p) => (
                      <article className="course-box" key={p.id}>
                        <span className="course-badge">{p.sessionType === 'Group' ? tr('Học nhóm') : p.sessionType} · {p.level}</span>{' '}
                        {p.intensityLabel && <span className="course-badge">{p.intensityLabel}</span>}{' '}
                        {p.isRecommendedIntensity && <span className="course-badge ok">{tr('Khuyến nghị')}</span>}
                        <h3 style={{ marginTop: 8 }}>{p.name}</h3>
                        <p>
                          {p.durationMonths}{' '}{tr('tháng ·')}{' '}{p.sessionsPerWeek}{' '}{tr('buổi/tuần ·')}{' '}{p.totalSessions ?? '—'}{' '}{tr('buổi')}
                          {p.totalTeachingHours != null ? trf(' · {0} giờ học', { 0: p.totalTeachingHours }) : ''}{' '}{tr('· sĩ số')}{' '}{p.capacity}
                        </p>
                        <strong>{money(p.price)}</strong>
                        <div style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setPlan({
                                ...p,
                                intensity: p.intensity || 'Custom',
                                sessionMinutes: p.sessionMinutes ?? '',
                                totalSessions: p.totalSessions ?? '',
                                retakeClaimDays: p.retakeClaimDays ?? '',
                              })
                            }
                          >
                            {p.isPublished ? tr('Đang mở') : tr('Nháp')}{' '}{tr('· Sửa')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ---------- TAB 3: ENROLLMENTS & RETAKE SUPPORT ---------- */}
            {activeSection === 'enrollments' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.42fr)_minmax(0,0.58fr)] lg:items-start">
                <section className="course-box space-y-3">
                  <div>
                    <h2 className="m-0">
                      {trf('Hồ sơ ghi danh ({0}) · {1} yêu cầu JLPT chờ duyệt', { 0: courses.length, 1: pendingRetakeTotal })}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="relative min-w-[180px] flex-1">
                      <span className="sr-only">{tr('Tìm hồ sơ ghi danh')}</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rp-text-muted" />
                      <input
                        type="search"
                        value={enrollmentSearch}
                        onChange={(e) => setEnrollmentSearch(e.target.value)}
                        placeholder={tr('Tìm học viên, lớp, Giáo viên…')}
                        className="h-9 w-full rounded-xl border border-rp-line bg-rp-bg-2 pl-8 pr-3 text-xs"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <input type="checkbox" checked={retakeOnly} onChange={(e) => setRetakeOnly(e.target.checked)} />
                      {tr('Chờ duyệt JLPT')}
                    </label>
                  </div>

                  {filteredEnrollments.length === 0 ? (
                    <ContextualEmptyState compact title={tr('Không có hồ sơ ghi danh phù hợp.')} />
                  ) : (
                    <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                      {filteredEnrollments.map((c) => {
                        const selected = currentCourse?.id === c.id;
                        const pendingReqs = (c.requests || []).filter((r) => r.status === 'Pending').length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCourseId(c.id)}
                            className={`block w-full rounded-xl border p-3 text-left transition ${selected ? 'border-rp-brand-strong bg-rp-brand-tint/35' : 'border-rp-line bg-white hover:border-rp-brand-border'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="truncate text-sm text-rp-text">{c.learnerName || tr('Học viên')}</strong>
                              <span className={`course-badge ${c.status === 'Active' ? 'ok' : c.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                                {show(c.status)}
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
                      <ContextualEmptyState compact title={tr('Chọn một hồ sơ ghi danh bên trái để xem chi tiết')} />
                    </section>
                  ) : (
                    <>
                      <section className="course-box space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="course-badge">{currentCourse.level} · {tr('Học nhóm')}</span>{' '}
                            <span className={`course-badge ${currentCourse.status === 'Active' ? 'ok' : currentCourse.status === 'Cancelled' ? 'muted' : 'warn'}`}>
                              {show(currentCourse.status)}
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
                            className="course-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              runAction(() => coursePost(`/${currentCourse.id}/complete`, {}), 'Đã chốt hoàn thành khóa học.');
                            }}
                          >
                            <h3>{tr('Chốt hoàn thành khóa')}</h3>
                            <fieldset disabled={busy}>
                              <label><input type="checkbox" required />{' '}{tr('Xác nhận đủ buổi cam kết và hoàn tất kiểm tra.')}</label>
                              <button className="course-primary" type="submit">{tr('Chốt dữ liệu khóa')}</button>
                            </fieldset>
                          </form>
                        )}
                      </section>

                      <CohortSessionsCalendar course={currentCourse} cohort={currentCohort}>
                        {(currentCourse.sessions || []).length === 0 ? (
                          <p className="course-meta">{tr('Chưa có buổi học nào.')}</p>
                        ) : (
                          currentCourse.sessions.map((s) => {
                            const roomId = findRoomId(s, currentCohort);
                            return (
                              <article className="course-row" key={s.id}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <strong>{tr('Buổi')}{' '}{s.number}{s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}</strong> · {fmtDate(s.scheduledAt)} ·{' '}
                                    <span className={`course-badge ${s.status === 'Present' ? 'ok' : s.status === 'Scheduled' ? 'warn' : 'muted'}`}>
                                      {show(s.status)}
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
                          <p className="course-meta m-0">{tr('Chưa có yêu cầu hỗ trợ JLPT nào.')}</p>
                        ) : (
                          currentCourse.requests.map((r) => (
                            <article className="course-row space-y-2" key={r.id}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3>{trf('Yêu cầu #{0} · {1}', { 0: r.id, 1: show(r.status) })}</h3>
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
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => runAction(() => openRetakeEvidence(currentCourse.id, r.id), 'Đã tải minh chứng riêng tư.')}
                              >
                                {tr('Tải minh chứng riêng tư')}
                              </button>
                              {r.status === 'Pending' && (
                                <form
                                  className="course-form"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.currentTarget);
                                    runAction(() => coursePost(`/${currentCourse.id}/retake/${r.id}/review`, {
                                      approve: f.get('decision') === 'approve',
                                      officialFailureVerified: f.get('verified') === 'on',
                                      onTimeHomeworkEvidenceVerified: currentCourse.eligibility.homeworkMet,
                                      cohortId: f.get('nextCohortId') ? Number(f.get('nextCohortId')) : null,
                                      response: f.get('response'),
                                    }));
                                  }}
                                >
                                  <h3>{tr('Quyết định của Admin')}</h3>
                                  <fieldset disabled={busy}>
                                    <label className="course-field">
                                      <span>{tr('Quyết định')}</span>
                                      <select name="decision">
                                        <option value="reject">{tr('Từ chối')}</option>
                                        <option value="approve" disabled={!currentCourse.eligibility.canClaim}>{tr('Duyệt hỗ trợ ôn lại')}</option>
                                      </select>
                                    </label>
                                    <label className="course-field">
                                      <span>{tr('Lớp nhóm kế tiếp (nếu duyệt)')}</span>
                                      <select name="nextCohortId">
                                        <option value="">{tr('Chọn lớp kế tiếp')}</option>
                                        {cohorts.filter((x) => x.id !== currentCourse.cohortId).map((x) => (
                                          <option key={x.id} value={x.id}>{x.name} ({x.level})</option>
                                        ))}
                                      </select>
                                    </label>
                                    <label><input type="checkbox" name="verified" />{' '}{tr('Đã xác minh minh chứng trượt JLPT chính thức')}</label>
                                    <label className="course-field"><span>{tr('Lý do quyết định')}</span><textarea name="response" required maxLength={2000} /></label>
                                    <button className="course-primary" type="submit">{tr('Xác nhận')}</button>
                                  </fieldset>
                                </form>
                              )}
                            </article>
                          ))
                        )}
                      </section>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ---------- TAB 4: SCHEDULE REQUESTS & MENTOR REPLACEMENT ---------- */}
            {activeSection === 'requests' && (
              <div className="space-y-5">
                <AdminCohortScheduleRequestsPanel busy={busy} initialRequestId={scheduleReqIdParam} onRun={runAction} />
                <AdminMentorReplacementPanel cohorts={cohorts} mentors={mentors} busy={busy} onRun={runAction} />
              </div>
            )}

            {/* ---------- TAB 5: TRANSFERS & COMPLAINTS ---------- */}
            {activeSection === 'cases' && (
              <div className="space-y-5">
                <AdminCohortTransferQueuePanel busy={busy} initialTransferId={transferReqIdParam} onRun={runAction} />
                <AdminCohortComplaintsPanel busy={busy} initialComplaintId={complaintIdParam} onRun={runAction} />
              </div>
            )}
          </>
        )}
      </main>
    </AdminShell>
  );
}
