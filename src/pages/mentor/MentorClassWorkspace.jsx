import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Layers,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Users,
  Video,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  FeatureIcon,
  Modal,
  SakuraLoader,
  Tabs,
  cx,
  notify,
} from '@/components/ui';
import { getSession } from '@/app/auth/session.js';
import {
  courseGet,
  coursePost,
  getCohortComplaints,
  getCohortHomework,
  getCohorts,
  getMentorLearnerSkillProfile,
  saveRetakeSupportPlan,
} from '@/features/cohorts/api/cohortApi.js';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel.jsx';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel.jsx';
import CohortScheduleRequestPanel from '@/features/scheduling/components/CohortScheduleRequestPanel.jsx';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import { schedulePatternText } from '@/features/cohorts/utils/cohortCardModel.js';
import { displayCourseTitle, getSessionJoinState } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import '@/pages/shared/studyCourses.css';
import { useLocale, translateText } from '@/locales/locale.js';

const STATUS_LABELS = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Chờ khai giảng',
  Active: 'Đang học',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
  Open: 'Đang mở đăng ký',
  Published: 'Đang mở đăng ký',
  Draft: 'Bản nháp',
  Archived: 'Đã lưu trữ',
  Scheduled: 'Chờ học',
  Present: 'Có mặt',
  Absent: 'Vắng',
  ExcusedAbsent: 'Vắng có phép',
  CancelledByMentor: 'Giáo viên hủy',
  Transferred: 'Đã chuyển lớp',
  TransferredOut: 'Đã chuyển sang lớp khác',
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
};

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: Layers },
  { id: 'learners', label: 'Học viên & Năng lực', icon: Users },
  { id: 'schedule', label: 'Lịch học & Dời lịch', icon: CalendarDays },
  { id: 'homework', label: 'Bài tập lớp', icon: ClipboardList },
  { id: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
  { id: 'support', label: 'Khiếu nại & Hỗ trợ', icon: MessageSquareWarning },
];

const showStatus = (v) => translateText(STATUS_LABELS[v] || v || '');
const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');

function statusBadgeTone(status) {
  if (status === 'Active' || status === 'Present' || status === 'Approved' || status === 'Open') return 'ok';
  if (status === 'Ready' || status === 'Scheduled' || status === 'Pending') return 'warn';
  return 'muted';
}

function findRoomId(session, cohortObj) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohortObj?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohortObj?.sessions?.[0];
  return match?.roomId || null;
}

export default function MentorClassWorkspace() {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const { cohortId: pathCohortId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionUserId = getSession()?.userId ?? null;

  const queryCohortId = searchParams.get('cohortId');
  const activeCohortIdParam = pathCohortId || queryCohortId || '';
  const rawSection = searchParams.get('section') || 'overview';
  const activeSection = TABS.some((t) => t.id === rawSection) ? rawSection : 'overview';

  const [courses, setCourses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [cohortHomework, setCohortHomework] = useState([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState(null);
  const [homeworkTick, setHomeworkTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [selectedSessionNumber, setSelectedSessionNumber] = useState(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [supportDrafts, setSupportDrafts] = useState({});
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [skillModal, setSkillModal] = useState(null); // { learnerId, learnerName, loading, data, error }

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  async function loadAll() {
    const [coursesData, cohortsData, complaintsData] = await Promise.all([
      courseGet(),
      getCohorts(),
      getCohortComplaints().catch(() => []),
    ]);
    setCourses(Array.isArray(coursesData) ? coursesData : []);
    setCohorts(Array.isArray(cohortsData) ? cohortsData : []);
    setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
    setLoadError(null);
  }

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => loadAll())
      .catch((e) => {
        if (!alive) return;
        setLoadError(e);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Group Mentor cohorts (merging cohorts API + enrollments so empty/ready cohorts are included).
  const mentorCohortEntries = useMemo(() => {
    const byId = new Map();
    const courseCohortIds = new Set(courses.map((c) => c.cohortId).filter(Boolean));
    const cohortById = new Map(cohorts.map((g) => [Number(g.id), g]));

    for (const c of courses) {
      if (!c.cohortId) continue;
      const cid = Number(c.cohortId);
      const cohortObj = cohortById.get(cid) || null;
      const existing = byId.get(cid) || {
        cohortId: cid,
        cohortObj,
        name: cohortObj?.name || displayCourseTitle(c, tr('Lớp học nhóm')),
        level: cohortObj?.level || c.level || 'JLPT',
        intensityLabel: cohortObj?.intensityLabel || '',
        status: cohortObj?.status || c.status || 'Active',
        startsAt: cohortObj?.startsAt || c.startsAt,
        totalSessions: cohortObj?.totalSessions || c.totalSessions || 0,
        sessionMinutes: cohortObj?.sessionMinutes || c.sessionMinutes || 90,
        capacity: cohortObj?.capacity || 4,
        enrolledCourses: [],
        allCourses: [],
      };
      existing.allCourses.push(c);
      if (c.status !== 'Cancelled') existing.enrolledCourses.push(c);
      byId.set(cid, existing);
    }

    for (const ch of cohorts) {
      const cid = Number(ch.id);
      const isMine = courseCohortIds.has(cid) || (sessionUserId && String(ch.mentorId) === String(sessionUserId));
      if (!isMine || byId.has(cid)) continue;
      byId.set(cid, {
        cohortId: cid,
        cohortObj: ch,
        name: ch.name || trf('Lớp JLPT {0}', { 0: ch.level || '' }).trim(),
        level: ch.level || 'JLPT',
        intensityLabel: ch.intensityLabel || '',
        status: ch.status || 'Open',
        startsAt: ch.startsAt,
        totalSessions: ch.totalSessions || 0,
        sessionMinutes: ch.sessionMinutes || 90,
        capacity: ch.capacity || 4,
        enrolledCourses: [],
        allCourses: [],
      });
    }

    return [...byId.values()].map((entry) => {
      const repCourse = entry.enrolledCourses.find((c) => c.status === 'Active')
        || entry.enrolledCourses[0]
        || entry.allCourses[0]
        || null;

      // Build unified session schedule from representative course or cohort object
      const sessionMap = new Map();
      (entry.cohortObj?.sessions || []).forEach((s) => {
        sessionMap.set(Number(s.number), {
          id: s.id ?? s.number,
          number: s.number,
          scheduledAt: s.scheduledAt,
          roomId: s.roomId || null,
          status: 'Scheduled',
        });
      });
      (repCourse?.sessions || []).forEach((s) => {
        const cur = sessionMap.get(Number(s.number)) || {};
        sessionMap.set(Number(s.number), {
          ...cur,
          id: s.id,
          number: s.number,
          attempt: s.attempt,
          scheduledAt: s.scheduledAt || cur.scheduledAt,
          meetingUrl: s.meetingUrl,
          roomId: findRoomId(s, entry.cohortObj) || cur.roomId,
          status: s.status,
          note: s.note,
        });
      });
      const sessions = [...sessionMap.values()].sort((a, b) => Number(a.number) - Number(b.number));

      let nextSession = null;
      let liveSession = null;
      for (const s of sessions) {
        if (!s.scheduledAt) continue;
        const at = parseUtcDate(s.scheduledAt)?.getTime();
        if (!Number.isFinite(at)) continue;
        const joinState = repCourse
          ? getSessionJoinState(s, { ...repCourse, paymentStatus: 'Paid', status: 'Active' }, nowMs)
          : { canJoin: nowMs >= at - 15 * 60_000 && nowMs <= at + ((entry.sessionMinutes || 90) + 30) * 60_000 };
        const endAt = at + (entry.sessionMinutes || 90) * 60_000;
        if (joinState.canJoin && s.roomId) {
          liveSession = s;
        }
        if (!nextSession && nowMs <= endAt + 15 * 60_000 && s.status !== 'CancelledByMentor') {
          nextSession = { ...s, canJoin: Boolean(joinState.canJoin && s.roomId) };
        }
      }

      let pendingAttendanceCount = 0;
      for (const c of entry.enrolledCourses) {
        if (c.status !== 'Active') continue;
        for (const s of c.sessions || []) {
          if (s.status !== 'Scheduled' || !s.scheduledAt) continue;
          const endAt = (parseUtcDate(s.scheduledAt)?.getTime() || 0) + (c.sessionMinutes || 90) * 60_000;
          if (endAt > 0 && endAt <= nowMs) pendingAttendanceCount += 1;
        }
      }

      const approvedRetakeRequests = entry.allCourses.flatMap((c) =>
        (c.requests || [])
          .filter((r) => r.status === 'Approved')
          .map((r) => ({ ...r, courseId: c.id, learnerName: c.learnerName })),
      );
      const openComplaintsCount = complaints.filter(
        (cp) => Number(cp.cohortId) === entry.cohortId && (cp.status === 'Open' || cp.status === 'UnderReview'),
      ).length;

      return {
        ...entry,
        repCourse,
        sessions,
        nextSession,
        liveSession,
        pendingAttendanceCount,
        approvedRetakeRequests,
        openComplaintsCount,
        patternText: entry.cohortObj
          ? schedulePatternText(entry.cohortObj.schedulePattern, entry.cohortObj.sessions)
          : '',
      };
    });
  }, [courses, cohorts, complaints, sessionUserId, nowMs, tr, trf]);

  const selectedCohort = useMemo(() => {
    if (!activeCohortIdParam) return null;
    const idNum = Number(activeCohortIdParam);
    return mentorCohortEntries.find((c) => c.cohortId === idNum) || null;
  }, [activeCohortIdParam, mentorCohortEntries]);

  useEffect(() => {
    if (!selectedCohort?.cohortId) return undefined;
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setHomeworkLoading(true);
        setHomeworkError(null);
        return getCohortHomework(selectedCohort.cohortId);
      })
      .then((rows) => {
        if (!alive || !rows) return;
        setCohortHomework(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (!alive) return;
        setHomeworkError(e);
      })
      .finally(() => alive && setHomeworkLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedCohort?.cohortId, homeworkTick]);

  const effectiveSessionNumber = useMemo(() => {
    if (!selectedCohort) return null;
    if (selectedSessionNumber && selectedCohort.sessions.some((s) => Number(s.number) === Number(selectedSessionNumber))) {
      return Number(selectedSessionNumber);
    }
    if (selectedCohort.nextSession) return Number(selectedCohort.nextSession.number);
    return selectedCohort.sessions[0]?.number ?? null;
  }, [selectedCohort, selectedSessionNumber]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mentorCohortEntries.filter((entry) => {
      if (statusFilter !== 'ALL' && entry.status !== statusFilter) return false;
      if (!q) return true;
      const learnerNames = entry.enrolledCourses.map((c) => c.learnerName || '').join(' ').toLowerCase();
      return (
        String(entry.name || '').toLowerCase().includes(q) ||
        String(entry.level || '').toLowerCase().includes(q) ||
        learnerNames.includes(q)
      );
    });
  }, [mentorCohortEntries, search, statusFilter]);

  async function runAction(fn, message = 'Đã lưu thay đổi.', opts = {}) {
    if (busy) return;
    setBusy(true);
    const key = opts.key || 'mentor-class-action';
    const toastId = opts.silentLoading ? null : notify.loading(opts.loading || 'Đang xử lý…', '', { key });
    try {
      const result = await fn();
      await loadAll();
      if (selectedCohort?.cohortId) setHomeworkTick((t) => t + 1);
      const resolved = typeof message === 'function' ? message(result) : message;
      if (resolved) {
        notify.success(resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
    } catch (e) {
      notify.apiError(e, opts.errorTitle || 'Chưa thực hiện được', { id: toastId || undefined, key, replace: true });
    } finally {
      setBusy(false);
    }
  }

  function openCohort(cid, section = 'overview') {
    setSelectedSessionNumber(null);
    setScheduleDrawerOpen(false);
    navigate(`/mentor-study-courses/${cid}/?section=${section}`);
  }

  function switchSection(section) {
    if (!selectedCohort) return;
    const next = new URLSearchParams(searchParams);
    next.set('section', section);
    next.delete('cohortId');
    setSearchParams(next, { replace: true });
  }

  function openSkillModal(course) {
    if (!course?.learnerId || !selectedCohort?.cohortId) return;
    setSkillModal({
      learnerId: course.learnerId,
      learnerName: course.learnerName,
      loading: true,
      data: null,
      error: null,
    });
    getMentorLearnerSkillProfile(course.learnerId, selectedCohort.cohortId)
      .then((data) => setSkillModal((cur) => (cur && cur.learnerId === course.learnerId ? { ...cur, loading: false, data, error: null } : cur)))
      .catch((error) => setSkillModal((cur) => (cur && cur.learnerId === course.learnerId ? { ...cur, loading: false, data: null, error } : cur)));
  }

  const submittedHomeworkCount = useMemo(
    () => cohortHomework.filter((h) => String(h.status || '').toLowerCase() === 'submitted').length,
    [cohortHomework],
  );

  // Selected session attendance rows across all enrolled learners in the cohort
  const sessionRoster = useMemo(() => {
    if (!selectedCohort || effectiveSessionNumber == null) return [];
    return selectedCohort.enrolledCourses.map((course) => {
      const sess = (course.sessions || []).find((s) => Number(s.number) === Number(effectiveSessionNumber)) || null;
      return { course, session: sess };
    });
  }, [selectedCohort, effectiveSessionNumber]);

  const currentCohortSessionMeta = useMemo(() => {
    if (!selectedCohort || effectiveSessionNumber == null) return null;
    return selectedCohort.sessions.find((s) => Number(s.number) === Number(effectiveSessionNumber)) || null;
  }, [selectedCohort, effectiveSessionNumber]);

  const calendarRepresentativeCourse = useMemo(() => {
    if (!selectedCohort) return null;
    if (selectedCohort.repCourse) return selectedCohort.repCourse;
    return {
      id: selectedCohort.cohortId,
      cohortId: selectedCohort.cohortId,
      name: selectedCohort.name,
      sessionMinutes: selectedCohort.sessionMinutes,
      status: selectedCohort.status,
      paymentStatus: 'Paid',
      sessions: selectedCohort.sessions,
    };
  }, [selectedCohort]);

  return (
    <MentorShell breadcrumb={selectedCohort ? selectedCohort.name : tr('Lớp đang phụ trách')}>
      <main className="course-page space-y-5">
        {loading ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : loadError && mentorCohortEntries.length === 0 ? (
          <section className="course-box">
            <ContextualErrorState
              error={loadError}
              title={tr('Chưa tải được danh sách lớp phụ trách')}
              onRetry={() => runAction(loadAll, '', { silentLoading: true })}
              retrying={busy}
            />
          </section>
        ) : !selectedCohort ? (
          /* ====================== 1. CLASS DIRECTORY VIEW ====================== */
          <>
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-start gap-3">
                <FeatureIcon feature="mentor" size="lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rp-brand">
                    {tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
                  </p>
                  <h1 className="m-0">{tr('Lớp học nhóm đang phụ trách')}</h1>
                  <p className="course-meta m-0 mt-1">
                    {tr('Chọn một lớp học để xem danh sách học viên, điểm danh theo buổi, giao/chấm bài tập và quản lý lịch dạy.')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/work-schedule/"
                  className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> {tr('Lịch làm việc')}
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction(loadAll, 'Đã cập nhật danh sách lớp.', { silentLoading: true })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text hover:bg-rp-brand-tint"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {tr('Tải lại')}
                </button>
              </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Lớp phụ trách')}</p>
                <p className="mt-1.5 text-2xl font-bold text-rp-text">{mentorCohortEntries.length}</p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng học viên đang học')}</p>
                <p className="mt-1.5 text-2xl font-bold text-rp-text">
                  {mentorCohortEntries.reduce((n, e) => n + e.enrolledCourses.filter((c) => c.status === 'Active' || c.status === 'Ready').length, 0)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Lượt buổi chờ điểm danh')}</p>
                <p className="mt-1.5 text-2xl font-bold text-rp-brand-strong">
                  {mentorCohortEntries.reduce((n, e) => n + e.pendingAttendanceCount, 0)}
                </p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Khiếu nại cần lưu ý')}</p>
                <p className="mt-1.5 text-2xl font-bold text-rp-text">
                  {mentorCohortEntries.reduce((n, e) => n + e.openComplaintsCount, 0)}
                </p>
              </Card>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-3.5">
              <label className="relative min-w-[240px] flex-1">
                <span className="sr-only">{tr('Tìm lớp hoặc tên học viên')}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr('Tìm theo tên lớp, trình độ N5–N2 hoặc tên học viên…')}
                  className="h-9 w-full rounded-xl border border-rp-line bg-rp-bg-2 pl-9 pr-3 text-sm text-rp-text focus:border-rp-brand focus:bg-white focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'Active', label: 'Đang học' },
                  { id: 'Ready', label: 'Chờ khai giảng' },
                  { id: 'Open', label: 'Đang mở đăng ký' },
                  { id: 'Completed', label: 'Đã hoàn thành' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id)}
                    className={cx(
                      'rp-focus rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      statusFilter === chip.id
                        ? 'bg-rp-brand-strong text-white'
                        : 'border border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border',
                    )}
                  >
                    {tr(chip.label)}
                  </button>
                ))}
              </div>
            </section>

            {filteredList.length === 0 ? (
              <section className="course-box">
                <ContextualEmptyState
                  context="groupLearning"
                  title={tr('Không tìm thấy lớp học nhóm phù hợp')}
                  description={tr('Các lớp bạn phụ trách sẽ hiển thị tại đây khi được Admin mở lớp hoặc có học viên ghi danh.')}
                />
              </section>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredList.map((entry) => (
                  <Card key={entry.cohortId} className="cohort-card flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="course-badge">{entry.level}</span>
                          {entry.intensityLabel && <span className="course-badge intensity-badge intensity-standard">{tr(entry.intensityLabel)}</span>}
                        </div>
                        <span className={`course-badge ${statusBadgeTone(entry.status)}`}>{showStatus(entry.status)}</span>
                      </div>
                      <h2 className="mt-2.5 text-base font-bold text-rp-text">{entry.name}</h2>
                      <p className="mt-1 text-xs text-rp-text-muted">
                        {entry.patternText || trf('{0} buổi · {1} phút/buổi', { 0: entry.totalSessions, 1: entry.sessionMinutes })}
                      </p>

                      <dl className="cohort-facts">
                        <div>
                          <dt>{tr('Sĩ số lớp')}</dt>
                          <dd>{entry.enrolledCourses.length}/{entry.capacity} {tr('học viên')}</dd>
                        </div>
                        <div>
                          <dt>{tr('Khai giảng')}</dt>
                          <dd>{fmtDate(entry.startsAt)}</dd>
                        </div>
                      </dl>

                      {entry.nextSession && (
                        <div className={cx(
                          'mt-2 rounded-xl border px-3 py-2 text-xs',
                          entry.nextSession.canJoin ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rp-line bg-rp-bg-2 text-rp-text-2',
                        )}>
                          <p className="font-semibold">
                            {entry.nextSession.canJoin ? tr('Phòng học đang mở') : tr('Buổi sắp tới')} · {trf('Buổi {0}', { 0: entry.nextSession.number })}
                          </p>
                          <p className="mt-0.5 text-[11.5px] opacity-85">{fmtDate(entry.nextSession.scheduledAt)}</p>
                        </div>
                      )}

                      {(entry.pendingAttendanceCount > 0 || entry.openComplaintsCount > 0 || entry.approvedRetakeRequests.length > 0) && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                          {entry.pendingAttendanceCount > 0 && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800">
                              {trf('{0} lượt chờ điểm danh', { 0: entry.pendingAttendanceCount })}
                            </span>
                          )}
                          {entry.openComplaintsCount > 0 && (
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700">
                              {trf('{0} khiếu nại mở', { 0: entry.openComplaintsCount })}
                            </span>
                          )}
                          {entry.approvedRetakeRequests.length > 0 && (
                            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-800">
                              {trf('{0} hỗ trợ ôn JLPT', { 0: entry.approvedRetakeRequests.length })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-3">
                      {entry.nextSession?.canJoin && entry.nextSession?.roomId ? (
                        <Link
                          to={`/meeting-room/${entry.nextSession.roomId}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Video className="h-3.5 w-3.5" /> {tr('Vào dạy')}
                        </Link>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => openCohort(entry.cohortId, 'overview')}
                        className="course-primary !px-3.5 !py-1.5 !text-xs"
                      >
                        {tr('Mở không gian lớp')}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ====================== 2. DEDICATED COHORT WORKSPACE ====================== */
          <>
            <section className="rounded-2xl border border-rp-line bg-white p-4 shadow-rp-xs sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/mentor-study-courses/')}
                    className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> {tr('Tất cả lớp')}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="course-badge">{selectedCohort.level}</span>
                      <span className={`course-badge ${statusBadgeTone(selectedCohort.status)}`}>{showStatus(selectedCohort.status)}</span>
                      {selectedCohort.intensityLabel && (
                        <span className="course-badge intensity-badge intensity-standard">{tr(selectedCohort.intensityLabel)}</span>
                      )}
                    </div>
                    <h1 className="mt-1.5 text-xl font-bold text-rp-text sm:text-2xl">{selectedCohort.name}</h1>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mentorCohortEntries.length > 1 && (
                    <label className="min-w-[200px]">
                      <span className="sr-only">{tr('Chuyển nhanh sang lớp khác')}</span>
                      <select
                        value={selectedCohort.cohortId}
                        onChange={(e) => openCohort(Number(e.target.value), activeSection)}
                        className="h-9 w-full rounded-xl border border-rp-line bg-rp-bg-2 px-3 text-xs font-semibold text-rp-text"
                      >
                        {mentorCohortEntries.map((entry) => (
                          <option key={entry.cohortId} value={entry.cohortId}>
                            {entry.name} ({entry.level})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {selectedCohort.liveSession?.roomId && (
                    <Link
                      to={`/meeting-room/${selectedCohort.liveSession.roomId}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Video className="h-3.5 w-3.5" /> {tr('Vào phòng học chung')}
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction(loadAll, 'Đã làm mới dữ liệu lớp.', { silentLoading: true })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> {tr('Tải lại')}
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-rp-line pt-3">
                <Tabs
                  className="sm:flex-wrap"
                  value={activeSection}
                  onChange={switchSection}
                  label={tr('Điều hướng không gian lớp')}
                  tabs={TABS.map((tab) => ({
                    value: tab.id,
                    label: tr(tab.label),
                    icon: tab.icon,
                    count: tab.id === 'learners'
                      ? selectedCohort.enrolledCourses.length
                      : tab.id === 'homework'
                        ? submittedHomeworkCount || undefined
                        : tab.id === 'attendance'
                          ? selectedCohort.pendingAttendanceCount || undefined
                          : tab.id === 'support'
                            ? (selectedCohort.openComplaintsCount + selectedCohort.approvedRetakeRequests.length) || undefined
                            : undefined,
                  }))}
                />
              </div>
            </section>

            {/* ---------- TAB 1: OVERVIEW ---------- */}
            {activeSection === 'overview' && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <Card>
                  <CardHeader
                    title={tr('Thông tin lớp học')}
                    description={selectedCohort.patternText || trf('{0} buổi · {1} phút/buổi', { 0: selectedCohort.totalSessions, 1: selectedCohort.sessionMinutes })}
                    icon={<FeatureIcon feature="mentor" size="sm" />}
                  />
                  <dl className="cohort-facts">
                    <div>
                      <dt>{tr('Sĩ số hiện tại')}</dt>
                      <dd>{selectedCohort.enrolledCourses.length}/{selectedCohort.capacity} {tr('học viên')}</dd>
                    </div>
                    <div>
                      <dt>{tr('Ngày khai giảng')}</dt>
                      <dd>{fmtDate(selectedCohort.startsAt)}</dd>
                    </div>
                    <div>
                      <dt>{tr('Thời lượng chuẩn')}</dt>
                      <dd>{trf('{0} buổi · {1} phút/buổi', { 0: selectedCohort.totalSessions, 1: selectedCohort.sessionMinutes })}</dd>
                    </div>
                    <div>
                      <dt>{tr('Học viên chờ điểm danh')}</dt>
                      <dd>{selectedCohort.pendingAttendanceCount}</dd>
                    </div>
                  </dl>

                  {selectedCohort.nextSession ? (
                    <div className={cx(
                      'mt-3 rounded-xl border p-4',
                      selectedCohort.nextSession.canJoin ? 'border-emerald-200 bg-emerald-50/70' : 'border-rp-brand-border/60 bg-rp-brand-tint/35',
                    )}>
                      <p className="text-xs font-bold uppercase tracking-wide text-rp-brand-strong">
                        {selectedCohort.nextSession.canJoin ? tr('Phòng học đang mở') : tr('Buổi dạy tiếp theo')}
                      </p>
                      <p className="mt-1 text-base font-bold text-rp-text">
                        {trf('Buổi {0}', { 0: selectedCohort.nextSession.number })} · {fmtDate(selectedCohort.nextSession.scheduledAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedCohort.nextSession.roomId && (
                          <Link
                            to={`/meeting-room/${selectedCohort.nextSession.roomId}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rp-brand-strong px-3 text-xs font-semibold text-white hover:bg-rp-brand-deep"
                          >
                            <Video className="h-3.5 w-3.5" /> {tr('Vào phòng học chung')}
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => switchSection('attendance')}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text hover:bg-rp-brand-tint"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" /> {tr('Chốt điểm danh')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-rp-text-muted">{tr('Chưa có lịch buổi dạy sắp tới.')}</p>
                  )}
                </Card>

                <Card>
                  <CardHeader title={tr('Việc cần xử lý trong lớp')} description={tr('Chuyển nhanh tới đúng công việc')} />
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => switchSection('learners')}
                      className="flex w-full items-center justify-between rounded-xl border border-rp-line bg-white px-3.5 py-2.5 text-left text-sm hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                    >
                      <span><strong>{selectedCohort.enrolledCourses.length}</strong> {tr('Học viên ghi danh & hồ sơ năng lực')}</span>
                      <span className="text-xs font-semibold text-rp-brand-strong">{tr('Xem danh sách')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchSection('homework')}
                      className="flex w-full items-center justify-between rounded-xl border border-rp-line bg-white px-3.5 py-2.5 text-left text-sm hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                    >
                      <span><strong>{submittedHomeworkCount}</strong> {tr('Bài tập đã nộp chờ chấm')}</span>
                      <span className="text-xs font-semibold text-rp-brand-strong">{tr('Mở bài tập')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchSection('attendance')}
                      className="flex w-full items-center justify-between rounded-xl border border-rp-line bg-white px-3.5 py-2.5 text-left text-sm hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                    >
                      <span><strong>{selectedCohort.pendingAttendanceCount}</strong> {tr('Lượt buổi chưa chốt điểm danh')}</span>
                      <span className="text-xs font-semibold text-rp-brand-strong">{tr('Điểm danh')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchSection('support')}
                      className="flex w-full items-center justify-between rounded-xl border border-rp-line bg-white px-3.5 py-2.5 text-left text-sm hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                    >
                      <span><strong>{selectedCohort.openComplaintsCount}</strong> {tr('Khiếu nại đang mở')}</span>
                      <span className="text-xs font-semibold text-rp-brand-strong">{tr('Xử lý')}</span>
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* ---------- TAB 2: LEARNERS & SKILL PROFILE DRAWER ---------- */}
            {activeSection === 'learners' && (
              <section className="course-box space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="m-0">{trf('Danh sách học viên ({0})', { 0: selectedCohort.enrolledCourses.length })}</h2>
                    <p className="course-meta m-0 mt-0.5">
                      {tr('Theo dõi chuyên cần, tỷ lệ nộp bài tập đúng hạn và mở hồ sơ năng lực chi tiết của từng học viên.')}
                    </p>
                  </div>
                </div>

                {selectedCohort.allCourses.length === 0 ? (
                  <ContextualEmptyState
                    compact
                    title={tr('Lớp chưa có học viên ghi danh')}
                    description={tr('Khi học viên đăng ký thành công, hồ sơ học tập sẽ hiển thị tại đây.')}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="course-table">
                      <thead>
                        <tr>
                          <th>{tr('Học viên')}</th>
                          <th>{tr('Trạng thái')}</th>
                          <th>{tr('Chuyên cần')}</th>
                          <th>{tr('Bài tập đúng hạn')}</th>
                          <th>{tr('Thao tác')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCohort.allCourses.map((c) => {
                          const sessList = c.sessions || [];
                          const presentCount = sessList.filter((s) => s.status === 'Present').length;
                          const absentCount = c.eligibility?.absentSessions ?? sessList.filter((s) => s.status === 'Absent').length;
                          const hasApprovedRetake = (c.requests || []).some((r) => r.status === 'Approved');
                          return (
                            <tr key={c.id}>
                              <td>
                                <p className="font-semibold text-rp-text">{c.learnerName || tr('Học viên')}</p>
                                {c.status === 'Transferred' && (
                                  <p className="text-xs text-rp-text-muted">{tr('Đã chuyển lớp; dữ liệu cũ được giữ nguyên.')}</p>
                                )}
                              </td>
                              <td>
                                <span className={`course-badge ${statusBadgeTone(c.status)}`}>{showStatus(c.status)}</span>
                              </td>
                              <td className="text-xs text-rp-text-2">
                                {trf('{0}/{1} buổi có mặt', { 0: presentCount, 1: sessList.length || selectedCohort.totalSessions })}
                                {absentCount > 0 ? ` · ${trf('{0} vắng', { 0: absentCount })}` : ''}
                              </td>
                              <td className="text-xs text-rp-text-2">
                                {c.eligibility
                                  ? `${c.eligibility.passedOnTimeHomework}/${c.eligibility.requiredHomework}`
                                  : '—'}
                              </td>
                              <td>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openSkillModal(c)}
                                    className="rounded-lg border border-rp-line bg-white px-2.5 py-1 text-xs font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
                                  >
                                    {tr('Hồ sơ năng lực')}
                                  </button>
                                  {hasApprovedRetake && (
                                    <button
                                      type="button"
                                      onClick={() => switchSection('support')}
                                      className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                                    >
                                      {tr('Lộ trình ôn lại')}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ---------- TAB 3: SCHEDULE & RESCHEDULE DRAWER ---------- */}
            {activeSection === 'schedule' && (
              <div className="space-y-4">
                {selectedCohort.cohortObj && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-rp-text">{tr('Điều chỉnh lịch khai giảng / dời tuần học')}</p>
                      <p className="text-xs text-rp-text-muted">{tr('Yêu cầu dời lịch hoặc hủy lớp trống sẽ gửi tới Admin xem xét trước khi áp dụng.')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScheduleDrawerOpen((v) => !v)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-3.5 text-xs font-semibold text-white hover:bg-rp-brand-deep"
                    >
                      {scheduleDrawerOpen ? tr('Ẩn biểu mẫu dời lịch') : tr('Gửi yêu cầu dời/hủy lịch')}
                    </button>
                  </div>
                )}

                {scheduleDrawerOpen && selectedCohort.cohortObj && (
                  <CohortScheduleRequestPanel
                    cohorts={[selectedCohort.cohortObj]}
                    initialCohortId={selectedCohort.cohortId}
                    busy={busy}
                    onRun={runAction}
                  />
                )}

                {calendarRepresentativeCourse && (
                  <CohortSessionsCalendar course={calendarRepresentativeCourse} cohort={selectedCohort.cohortObj}>
                    <div className="space-y-2">
                      {selectedCohort.sessions.length === 0 ? (
                        <p className="course-meta">{tr('Chưa có buổi học nào.')}</p>
                      ) : (
                        selectedCohort.sessions.map((s) => (
                          <article key={s.id || s.number} className="course-row flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <strong>{trf('Buổi {0}', { 0: s.number })}{s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}</strong> · {fmtDate(s.scheduledAt)} ·{' '}
                              <span className={`course-badge ${statusBadgeTone(s.status)}`}>{showStatus(s.status)}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {s.roomId && (
                                <Link className="course-pill-link" to={`/meeting-room/${s.roomId}`}>
                                  {tr('Vào phòng học chung')}
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSessionNumber(Number(s.number));
                                  switchSection('attendance');
                                }}
                                className="rounded-lg border border-rp-line bg-white px-2.5 py-1 text-xs font-semibold text-rp-text hover:bg-rp-brand-tint"
                              >
                                {tr('Điểm danh buổi này')}
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </CohortSessionsCalendar>
                )}
              </div>
            )}

            {/* ---------- TAB 4: HOMEWORK ---------- */}
            {activeSection === 'homework' && (
              homeworkLoading && cohortHomework.length === 0 ? (
                <section className="course-box">
                  <SakuraLoader variant="section" context="homework" className="min-h-[140px]" delay={160} />
                </section>
              ) : homeworkError ? (
                <section className="course-box">
                  <ContextualErrorState
                    compact
                    error={homeworkError}
                    title={tr('Chưa tải được bài tập nhóm')}
                    onRetry={() => setHomeworkTick((t) => t + 1)}
                    retrying={homeworkLoading}
                  />
                </section>
              ) : (
                <CohortHomeworkPanel
                  cohortId={selectedCohort.cohortId}
                  cohortName={selectedCohort.name}
                  coursesInCohort={selectedCohort.enrolledCourses}
                  items={cohortHomework}
                  role="Mentor"
                  busy={busy}
                  onRun={runAction}
                />
              )
            )}

            {/* ---------- TAB 5: SESSION-CENTRIC COHORT ATTENDANCE ---------- */}
            {activeSection === 'attendance' && (
              <section className="course-box space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0">{tr('Điểm danh theo buổi học')}</h2>
                    <p className="course-meta m-0 mt-0.5">
                      {tr('Chọn buổi học để điểm danh tất cả học viên trong lớp trên một màn hình.')}
                    </p>
                  </div>
                  {currentCohortSessionMeta?.roomId && (
                    <Link
                      to={`/meeting-room/${currentCohortSessionMeta.roomId}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-3.5 text-xs font-semibold text-white hover:bg-rp-brand-deep"
                    >
                      <Video className="h-3.5 w-3.5" /> {tr('Mở phòng học chung')}
                    </Link>
                  )}
                </div>

                {selectedCohort.sessions.length === 0 ? (
                  <ContextualEmptyState compact title={tr('Lớp chưa có lịch buổi học để điểm danh')} />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCohort.sessions.map((s) => {
                        const active = Number(s.number) === Number(effectiveSessionNumber);
                        const pendingAny = selectedCohort.enrolledCourses.some(
                          (c) => c.status === 'Active' && (c.sessions || []).some((cs) => Number(cs.number) === Number(s.number) && cs.status === 'Scheduled'),
                        );
                        return (
                          <button
                            key={s.number}
                            type="button"
                            onClick={() => setSelectedSessionNumber(Number(s.number))}
                            className={cx(
                              'rp-focus inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold',
                              active
                                ? 'border-rp-brand-strong bg-rp-brand-strong text-white'
                                : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border',
                            )}
                          >
                            <span>{trf('Buổi {0}', { 0: s.number })}</span>
                            {pendingAny && !active && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                          </button>
                        );
                      })}
                    </div>

                    {currentCohortSessionMeta && (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-xs text-rp-text-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-rp-text">
                          <Clock className="h-3.5 w-3.5" /> {trf('Buổi {0}', { 0: currentCohortSessionMeta.number })}
                        </span>
                        <span>· {fmtDate(currentCohortSessionMeta.scheduledAt)}</span>
                      </div>
                    )}

                    {sessionRoster.length === 0 ? (
                      <p className="course-meta">{tr('Chưa có học viên nào ghi danh vào buổi học này.')}</p>
                    ) : (
                      <div className="space-y-2.5">
                        {sessionRoster.map(({ course, session }) => {
                          if (!session) return null;
                          const draftKey = `${course.id}-${session.id}`;
                          const draft = attendanceDrafts[draftKey] || { status: 'Present', note: '' };
                          const canMark = course.status === 'Active' && session.status === 'Scheduled';
                          return (
                            <article key={draftKey} className="course-row space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <strong className="text-sm text-rp-text">{course.learnerName || tr('Học viên')}</strong>
                                  <span className="ml-2 text-xs text-rp-text-muted">{showStatus(course.status)}</span>
                                </div>
                                <span className={`course-badge ${statusBadgeTone(session.status)}`}>{showStatus(session.status)}</span>
                              </div>
                              {session.note && <p className="course-meta m-0">{tr(session.note)}</p>}
                              {canMark && (
                                <form
                                  className="course-form"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    runAction(
                                      () => coursePost(`/${course.id}/sessions/${session.id}/attendance`, {
                                        status: draft.status,
                                        note: draft.note.trim(),
                                      }),
                                      trf('Đã lưu điểm danh cho {0}.', { 0: course.learnerName || tr('học viên') }),
                                    );
                                  }}
                                >
                                  <fieldset disabled={busy} className="flex flex-wrap items-end gap-3 border-0 p-0">
                                    <label className="course-field" style={{ minWidth: 160 }}>
                                      <span>{tr('Trạng thái')}</span>
                                      <select
                                        value={draft.status}
                                        onChange={(e) => setAttendanceDrafts((cur) => ({
                                          ...cur,
                                          [draftKey]: { ...draft, status: e.target.value },
                                        }))}
                                      >
                                        {['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'].map((x) => (
                                          <option key={x} value={x}>{showStatus(x)}</option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="course-field" style={{ flex: '1 1 240px' }}>
                                      <span>{tr('Ghi chú điểm danh (bắt buộc)')}</span>
                                      <input
                                        required
                                        maxLength={1000}
                                        value={draft.note}
                                        onChange={(e) => setAttendanceDrafts((cur) => ({
                                          ...cur,
                                          [draftKey]: { ...draft, note: e.target.value },
                                        }))}
                                        placeholder={tr('Nhận xét tình hình tham gia buổi học…')}
                                      />
                                    </label>
                                    <button type="submit" className="course-primary">
                                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> {tr('Lưu điểm danh')}
                                    </button>
                                  </fieldset>
                                </form>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* ---------- TAB 6: COMPLAINTS & JLPT RETAKE SUPPORT ---------- */}
            {activeSection === 'support' && (
              <div className="space-y-4">
                <CohortComplaintPanel
                  role="Mentor"
                  cohortId={selectedCohort.cohortId}
                  busy={busy}
                  onRun={runAction}
                />

                <section className="course-box space-y-3">
                  <div>
                    <h2 className="m-0">{tr('Lộ trình hỗ trợ ôn lại khi trượt JLPT chính thức')}</h2>
                    <p className="course-meta m-0 mt-0.5">
                      {tr('Sau khi Admin duyệt minh chứng trượt JLPT của học viên, Giáo viên lập lộ trình ôn lại tại đây.')}
                    </p>
                  </div>
                  {selectedCohort.approvedRetakeRequests.length === 0 ? (
                    <ContextualEmptyState
                      compact
                      title={tr('Chưa có học viên nào cần lập kế hoạch ôn lại trong lớp này')}
                    />
                  ) : (
                    selectedCohort.approvedRetakeRequests.map((r) => (
                      <article key={r.id} className="course-row space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>{r.learnerName || tr('Học viên')}</strong>
                          <span className="course-meta">{trf('Thi: {0} · Công bố: {1}', { 0: fmtDate(r.examDate), 1: fmtDate(r.resultPublishedAt) })}</span>
                        </div>
                        {r.reason && <p className="course-pre"><strong>{tr('Lý do học viên:')}</strong> {tr(r.reason)}</p>}
                        {r.response && <p className="course-pre"><strong>{tr('Quyết định của Admin:')}</strong> {r.response}</p>}
                        <form
                          className="course-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const val = (supportDrafts[r.id] ?? r.mentorSupportPlan ?? '').trim();
                            runAction(
                              () => saveRetakeSupportPlan(r.courseId, r.id, val),
                              'Đã lưu kế hoạch hỗ trợ ôn lại cho học viên.',
                            );
                          }}
                        >
                          <fieldset disabled={busy} className="space-y-2 border-0 p-0">
                            <label className="course-field" style={{ flexBasis: '100%' }}>
                              <span>{tr('Lộ trình hỗ trợ ôn lại JLPT của Giáo viên')}</span>
                              <textarea
                                required
                                maxLength={2000}
                                value={supportDrafts[r.id] ?? r.mentorSupportPlan ?? ''}
                                onChange={(e) => setSupportDrafts((cur) => ({ ...cur, [r.id]: e.target.value }))}
                                placeholder={tr('Nhập kế hoạch ôn luyện kỹ năng yếu và lịch đồng hành…')}
                              />
                            </label>
                            <button type="submit" className="course-primary">{tr('Lưu lộ trình hỗ trợ')}</button>
                          </fieldset>
                        </form>
                      </article>
                    ))
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {/* Learner Skill Profile Modal */}
        <Modal
          open={Boolean(skillModal)}
          onClose={() => setSkillModal(null)}
          title={skillModal ? trf('Hồ sơ năng lực: {0}', { 0: skillModal.learnerName || tr('Học viên') }) : ''}
          size="md"
        >
          {skillModal?.loading ? (
            <SakuraLoader variant="inline" context="dashboard" className="min-h-[120px]" />
          ) : skillModal?.error ? (
            <ContextualErrorState
              variant="inline"
              error={skillModal.error}
              title={tr('Chưa tải được hồ sơ năng lực học viên')}
              onRetry={() => {
                const match = selectedCohort?.allCourses.find((c) => c.learnerId === skillModal.learnerId);
                if (match) openSkillModal(match);
              }}
            />
          ) : skillModal?.data ? (
            <div className="space-y-3 text-sm">
              <p className="text-rp-text-2">
                {tr('Trình độ đánh giá:')}{' '}<strong>{skillModal.data.assessedJlptLevel || selectedCohort?.level || 'JLPT'}</strong>{' '}
                · {tr('Bài tập đúng hạn:')}{' '}<strong>{skillModal.data.homeworkStats?.onTimeCount ?? 0}/{skillModal.data.homeworkStats?.assignedCount ?? 0}</strong>
                {skillModal.data.homeworkStats?.onTimePercent != null ? ` (${skillModal.data.homeworkStats.onTimePercent}%)` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {(skillModal.data.skills || []).map((sk) => (
                  <span key={sk.skill} className="course-badge">
                    {sk.skill}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : tr('Chưa có mẫu')}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Modal>
      </main>
    </MentorShell>
  );
}
