import { useEffect, useMemo, useRef, useState } from 'react';
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
  Users,
  Video,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  Drawer,
  FeatureIcon,
  Field,
  Modal,
  PageContainer,
  RefreshButton,
  RefreshingIndicator,
  SakuraLoader,
  Tabs,
  Textarea,
  UnifiedToolbar,
  cx,
  notify,
} from '@/components/ui';
import { getSession } from '@/app/auth/session.js';
import { queryClient } from '@/api/queryClient.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
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
import {
  CLASS_LIFECYCLE_STATUSES,
  computeClassProgress,
  resolveClassLifecycleStatus,
} from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import { translateText, useLocale } from '@/locales/locale.js';

const STATUS_LABELS = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Sắp khai giảng',
  Active: 'Đang giảng dạy',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
  Open: 'Đang tuyển sinh',
  Published: 'Đang tuyển sinh',
  Draft: 'Bản nháp',
  Archived: 'Đã lưu trữ',
  Scheduled: 'Sắp diễn ra',
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

const ATTENDANCE_OPTIONS = ['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'];

const showStatus = (v) => translateText(STATUS_LABELS[v] || v || '');
const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');

function statusBadgeTone(status) {
  if (status === 'Active' || status === 'Present' || status === 'Approved' || status === 'Open' || status === 'Published') return 'success';
  if (status === 'Ready' || status === 'Scheduled' || status === 'Pending') return 'warning';
  if (status === 'Absent' || status === 'Cancelled' || status === 'CancelledByMentor' || status === 'Rejected') return 'danger';
  return 'neutral';
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
  const [complaintsError, setComplaintsError] = useState(false);
  const [cohortHomework, setCohortHomework] = useState([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState(null);
  const [homeworkTick, setHomeworkTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const refreshSeqRef = useRef(0);
  const inFlightRefreshRef = useRef(null);

  const [selectedSessionNumber, setSelectedSessionNumber] = useState(null);
  const [attendanceModal, setAttendanceModal] = useState(null); // { course, session, status, note }
  const [supportModal, setSupportModal] = useState(null); // { request, plan }
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [skillModal, setSkillModal] = useState(null); // { learnerId, learnerName, loading, data, error }

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  async function loadAll() {
    const [coursesData, cohortsData, complaintsRes] = await Promise.all([
      courseGet(),
      getCohorts(),
      getCohortComplaints()
        .then((res) => ({ ok: true, data: res }))
        .catch(() => ({ ok: false, data: [] })),
    ]);
    setCourses(Array.isArray(coursesData) ? coursesData : []);
    setCohorts(Array.isArray(cohortsData) ? cohortsData : []);
    setComplaintsError(!complaintsRes.ok);
    setComplaints(Array.isArray(complaintsRes.data) ? complaintsRes.data : []);
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
        totalSessions: cohortObj?.totalSessions ?? c.totalSessions ?? 0,
        sessionMinutes: cohortObj?.sessionMinutes ?? c.sessionMinutes ?? null,
        capacity: cohortObj?.capacity ?? null,
        enrolledCourses: [],
        allCourses: [],
      };
      existing.allCourses.push(c);
      if (c.status !== 'Cancelled' && c.status !== 'PendingPayment') existing.enrolledCourses.push(c);
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
        totalSessions: ch.totalSessions ?? 0,
        sessionMinutes: ch.sessionMinutes ?? null,
        capacity: ch.capacity ?? null,
        enrolledCourses: [],
        allCourses: [],
      });
    }

    return [...byId.values()].map((entry) => {
      const repCourse = entry.enrolledCourses.find((c) => c.status === 'Active')
        || entry.enrolledCourses[0]
        || entry.allCourses[0]
        || null;

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
      const durationMinutes = entry.sessionMinutes || 90;
      for (const s of sessions) {
        if (!s.scheduledAt) continue;
        const at = parseUtcDate(s.scheduledAt)?.getTime();
        if (!Number.isFinite(at)) continue;
        const joinState = repCourse
          ? getSessionJoinState(s, { ...repCourse, paymentStatus: 'Paid', status: 'Active' }, nowMs)
          : { canJoin: nowMs >= at - 15 * 60_000 && nowMs <= at + (durationMinutes + 30) * 60_000 };
        const endAt = at + durationMinutes * 60_000;
        if (joinState.canJoin && s.roomId) liveSession = s;
        if (!nextSession && nowMs <= endAt + 15 * 60_000 && s.status !== 'CancelledByMentor') {
          nextSession = { ...s, canJoin: Boolean(joinState.canJoin && s.roomId) };
        }
      }

      let pendingAttendanceCount = 0;
      for (const c of entry.enrolledCourses) {
        if (c.status !== 'Active') continue;
        for (const s of c.sessions || []) {
          if (s.status !== 'Scheduled' || !s.scheduledAt) continue;
          const endAt = (parseUtcDate(s.scheduledAt)?.getTime() || 0) + (c.sessionMinutes || durationMinutes) * 60_000;
          if (endAt > 0 && endAt <= nowMs) pendingAttendanceCount += 1;
        }
      }

      const approvedRetakeRequests = entry.allCourses.flatMap((c) =>
        (c.requests || [])
          .filter((r) => r.status === 'Approved')
          .map((r) => ({ ...r, courseId: c.id, learnerName: c.learnerName })),
      );
      const openComplaintsCount = complaintsError
        ? null
        : complaints.filter(
            (cp) => Number(cp.cohortId) === entry.cohortId && (cp.status === 'Open' || cp.status === 'UnderReview'),
          ).length;

      const progress = computeClassProgress(sessions, entry.totalSessions);
      const lifecycle = resolveClassLifecycleStatus({
        cohortStatus: entry.status,
        enrolledCount: entry.cohortObj?.enrolledCount ?? entry.enrolledCourses.length,
        startsAt: entry.startsAt,
        sessions,
        enrolledCourses: entry.enrolledCourses,
        nowMs,
      });

      return {
        ...entry,
        lifecycle,
        progress,
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
  }, [courses, cohorts, complaints, complaintsError, sessionUserId, nowMs, tr, trf]);

  const selectedCohort = useMemo(() => {
    if (!activeCohortIdParam) return null;
    const idNum = Number(activeCohortIdParam);
    return mentorCohortEntries.find((c) => c.cohortId === idNum) || null;
  }, [activeCohortIdParam, mentorCohortEntries]);

  function handleRefresh() {
    if (inFlightRefreshRef.current) return inFlightRefreshRef.current;
    const seq = ++refreshSeqRef.current;
    setRefreshing(true);
    const activeCohortId = selectedCohort?.cohortId;
    const job = Promise.all([
      loadAll(),
      activeCohortId
        ? getCohortHomework(activeCohortId)
            .then((rows) => {
              if (refreshSeqRef.current === seq) {
                setCohortHomework(Array.isArray(rows) ? rows : []);
                setHomeworkError(null);
              }
            })
            .catch(() => {})
        : Promise.resolve(),
    ])
      .catch((e) => {
        if (refreshSeqRef.current === seq) {
          if (mentorCohortEntries.length === 0) setLoadError(e);
          else notify.apiError(e, tr('Không thể làm mới dữ liệu lớp.'));
        }
      })
      .finally(() => {
        if (inFlightRefreshRef.current === job) inFlightRefreshRef.current = null;
        if (refreshSeqRef.current === seq) setRefreshing(false);
      });
    inFlightRefreshRef.current = job;
    return job;
  }

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
      if (statusFilter !== 'ALL' && entry.lifecycle.id !== statusFilter) return false;
      if (!q) return true;
      const learnerNames = entry.enrolledCourses.map((c) => c.learnerName || '').join(' ').toLowerCase();
      return (
        String(entry.name || '').toLowerCase().includes(q)
        || String(entry.level || '').toLowerCase().includes(q)
        || learnerNames.includes(q)
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
      invalidateSidebarCounters(queryClient);
      if (selectedCohort?.cohortId) setHomeworkTick((t) => t + 1);
      const resolved = typeof message === 'function' ? message(result) : message;
      if (resolved) {
        notify.success(resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
    } catch (e) {
      notify.apiError(e, opts.errorTitle || 'Chưa thực hiện được', { id: toastId || undefined, key, replace: true });
      throw e;
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

  const sessionRoster = useMemo(() => {
    if (!selectedCohort || effectiveSessionNumber == null) return [];
    return selectedCohort.enrolledCourses.map((course) => {
      const sess = (course.sessions || []).find((s) => Number(s.number) === Number(effectiveSessionNumber)) || null;
      return { course, session: sess };
    }).filter((r) => Boolean(r.session));
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

  const totalOpenComplaints = useMemo(() => {
    if (complaintsError) return '—';
    return mentorCohortEntries.reduce((n, e) => n + (e.openComplaintsCount || 0), 0);
  }, [mentorCohortEntries, complaintsError]);

  const learnerColumns = [
    {
      key: 'learner',
      header: 'Học viên',
      sortValue: (c) => c.learnerName || '',
      render: (c) => (
        <div>
          <p className="font-semibold text-rp-text">{c.learnerName || tr('Học viên')}</p>
          {c.status === 'Transferred' && (
            <p className="text-xs text-rp-text-muted">{tr('Đã chuyển lớp; dữ liệu cũ được giữ nguyên.')}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (c) => <Badge tone={statusBadgeTone(c.status)} size="sm">{showStatus(c.status)}</Badge>,
    },
    {
      key: 'attendance',
      header: 'Chuyên cần',
      render: (c) => {
        const sessList = c.sessions || [];
        const presentCount = sessList.filter((s) => s.status === 'Present').length;
        const absentCount = c.eligibility?.absentSessions ?? sessList.filter((s) => s.status === 'Absent').length;
        const total = sessList.length || selectedCohort?.totalSessions || 0;
        return (
          <span className="text-xs text-rp-text-2">
            {trf('{0}/{1} buổi có mặt', { 0: presentCount, 1: total })}
            {absentCount > 0 ? ` · ${trf('{0} vắng', { 0: absentCount })}` : ''}
          </span>
        );
      },
    },
    {
      key: 'homework',
      header: 'Bài tập đúng hạn',
      render: (c) => (
        <span className="text-xs text-rp-text-2">
          {c.eligibility ? `${c.eligibility.passedOnTimeHomework}/${c.eligibility.requiredHomework}` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      sortable: false,
      render: (c) => {
        const hasApprovedRetake = (c.requests || []).some((r) => r.status === 'Approved');
        return (
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => openSkillModal(c)}>
              {tr('Hồ sơ năng lực')}
            </Button>
            {hasApprovedRetake && (
              <Button variant="soft" size="sm" onClick={() => switchSection('support')}>
                {tr('Lộ trình ôn lại')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const attendanceColumns = [
    {
      key: 'learner',
      header: 'Học viên',
      render: ({ course }) => (
        <div>
          <p className="font-semibold text-rp-text">{course.learnerName || tr('Học viên')}</p>
          <p className="text-xs text-rp-text-muted">{showStatus(course.status)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái buổi',
      render: ({ session }) => (
        <Badge tone={statusBadgeTone(session.status)} size="sm">
          {showStatus(session.status)}
        </Badge>
      ),
    },
    {
      key: 'note',
      header: 'Ghi chú',
      render: ({ session }) => (
        <span className="text-xs text-rp-text-2">{session.note || '—'}</span>
      ),
    },
    {
      key: 'action',
      header: 'Điểm danh',
      sortable: false,
      render: ({ course, session }) => {
        const canMark = course.status === 'Active' && session.status === 'Scheduled';
        return canMark ? (
          <Button
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            disabled={busy}
            onClick={() => setAttendanceModal({
              course,
              session,
              status: 'Present',
              note: session.note || '',
            })}
          >
            {tr('Điểm danh')}
          </Button>
        ) : (
          <span className="text-xs text-rp-text-muted">{tr('Đã chốt')}</span>
        );
      },
    },
  ];

  return (
    <MentorShell breadcrumb={selectedCohort ? selectedCohort.name : tr('Lớp đang phụ trách')}>
      <PageContainer width="default" density="comfortable" className="relative space-y-[var(--rp-space-section)] text-rp-text">
        {refreshing && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : loadError && mentorCohortEntries.length === 0 ? (
          <Card>
            <ContextualErrorState
              error={loadError}
              title={tr('Chưa tải được danh sách lớp phụ trách')}
              onRetry={() => handleRefresh()}
              retrying={refreshing}
            />
          </Card>
        ) : !selectedCohort ? (
          <>
            <h1 className="sr-only">{tr('Lớp học nhóm đang phụ trách')}</h1>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button as={Link} to="/work-schedule/" variant="secondary" size="sm" icon={CalendarDays}>
                {tr('Lịch làm việc')}
              </Button>
            </div>

            {complaintsError && (
              <Banner tone="warning">
                {tr('Chưa tải được thống kê khiếu nại. Vui lòng thử tải lại sau ít phút.')}
              </Banner>
            )}

            {mentorCohortEntries.length > 0 && (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card interactive className="p-4">
                  <p className="text-xs font-medium text-rp-text-muted">{tr('Lớp phụ trách')}</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-rp-text">{mentorCohortEntries.length}</p>
                </Card>
                <Card interactive className="p-4">
                  <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng học viên đang học')}</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-rp-text">
                    {mentorCohortEntries.reduce((n, e) => n + e.enrolledCourses.filter((c) => c.status === 'Active' || c.status === 'Ready').length, 0)}
                  </p>
                </Card>
                <Card interactive className="p-4">
                  <p className="text-xs font-medium text-rp-text-muted">{tr('Lượt buổi chờ điểm danh')}</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-rp-brand-strong">
                    {mentorCohortEntries.reduce((n, e) => n + e.pendingAttendanceCount, 0)}
                  </p>
                </Card>
                <Card interactive className="p-4">
                  <p className="text-xs font-medium text-rp-text-muted">{tr('Khiếu nại cần lưu ý')}</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-rp-text">{totalOpenComplaints}</p>
                </Card>
              </section>
            )}

            {mentorCohortEntries.length > 0 && (
              <UnifiedToolbar
                tabs={{
                  label: tr('Lọc trạng thái lớp'),
                  value: statusFilter,
                  onChange: setStatusFilter,
                  tabs: [
                    { value: 'ALL', label: 'Tất cả' },
                    ...CLASS_LIFECYCLE_STATUSES.map((st) => ({ value: st.id, label: st.label })),
                  ],
                }}
                search={{
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  onClear: () => setSearch(''),
                  placeholder: 'Tìm tên lớp, JLPT, học viên…',
                  ariaLabel: tr('Tìm lớp học'),
                }}
                refresh={{
                  onRefresh: handleRefresh,
                  refreshing,
                }}
              />
            )}

            {filteredList.length === 0 ? (
              <Card>
                <ContextualEmptyState
                  context="groupLearning"
                  variant={mentorCohortEntries.length === 0 ? 'default' : 'search'}
                  illustration={mentorCohortEntries.length === 0 ? 'classroom' : 'search'}
                  title={
                    mentorCohortEntries.length === 0
                      ? tr('Bạn chưa có lớp học nhóm nào đang phụ trách')
                      : tr('Không tìm thấy lớp học nhóm phù hợp')
                  }
                  description={
                    mentorCohortEntries.length === 0
                      ? tr('Các lớp bạn phụ trách sẽ hiển thị tại đây khi được mở lớp hoặc có học viên ghi danh.')
                      : tr('Thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm.')
                  }
                  action={
                    mentorCohortEntries.length > 0 && (statusFilter !== 'ALL' || search.trim() !== '') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusFilter('ALL');
                          setSearch('');
                        }}
                      >
                        {tr('Xóa bộ lọc')}
                      </Button>
                    ) : null
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredList.map((entry) => (
                  <Card key={entry.cohortId} interactive className="flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand" icon={false} size="sm">{entry.level}</Badge>
                          {entry.intensityLabel && <Badge tone="neutral" icon={false} size="sm">{tr(entry.intensityLabel)}</Badge>}
                        </div>
                        <Badge tone={entry.lifecycle.tone} size="sm">{tr(entry.lifecycle.label)}</Badge>
                      </div>

                      <div>
                        <h2 className="text-base font-semibold text-rp-text">{entry.name}</h2>
                        <p className="mt-1 text-xs text-rp-text-muted">
                          {entry.patternText || trf('{0} buổi · {1} phút/buổi', {
                            0: entry.totalSessions || 0,
                            1: entry.sessionMinutes || 90,
                          })}
                        </p>
                      </div>

                      <dl className="grid grid-cols-2 gap-2 rounded-xl border border-rp-line bg-rp-bg-2 p-3 text-xs">
                        <div>
                          <dt className="text-rp-text-muted">{tr('Sĩ số lớp')}</dt>
                          <dd className="mt-0.5 font-semibold text-rp-text">
                            {entry.capacity != null
                              ? `${entry.enrolledCourses.length}/${entry.capacity} ${tr('học viên')}`
                              : `${entry.enrolledCourses.length} ${tr('học viên')}`}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-rp-text-muted">{tr('Khai giảng')}</dt>
                          <dd className="mt-0.5 font-semibold text-rp-text">{fmtDate(entry.startsAt)}</dd>
                        </div>
                        {entry.progress.totalSessions > 0 && (
                          <div className="col-span-2 pt-1 border-t border-rp-line/60">
                            <dt className="flex items-center justify-between text-rp-text-muted">
                              <span>{tr('Tiến độ giảng dạy')}</span>
                              <span className="font-semibold tabular-nums text-rp-text">
                                {trf('{0}/{1} buổi đã hoàn thành', {
                                  0: entry.progress.completedSessions,
                                  1: entry.progress.totalSessions,
                                })}
                              </span>
                            </dt>
                            <dd className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
                              <div
                                className="h-full rounded-full bg-[#16A34A] transition-[width] duration-300"
                                style={{ width: `${entry.progress.percent}%` }}
                              />
                            </dd>
                          </div>
                        )}
                      </dl>

                      {entry.nextSession && (
                        <div className={cx(
                          'rounded-xl border px-3 py-2 text-xs',
                          entry.nextSession.canJoin ? 'border-rp-success-line bg-rp-success-bg text-rp-success' : 'border-rp-line bg-rp-bg-2 text-rp-text-2',
                        )}>
                          <p className="font-semibold">
                            {entry.nextSession.canJoin ? tr('Phòng học đang mở') : tr('Buổi sắp tới')} · {trf('Buổi {0}', { 0: entry.nextSession.number })}
                          </p>
                          <p className="mt-0.5 opacity-90">{fmtDate(entry.nextSession.scheduledAt)}</p>
                        </div>
                      )}

                      {(entry.pendingAttendanceCount > 0 || (entry.openComplaintsCount ?? 0) > 0 || entry.approvedRetakeRequests.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.pendingAttendanceCount > 0 && (
                            <Badge tone="warning" size="sm">
                              {trf('{0} lượt chờ điểm danh', { 0: entry.pendingAttendanceCount })}
                            </Badge>
                          )}
                          {(entry.openComplaintsCount ?? 0) > 0 && (
                            <Badge tone="danger" size="sm">
                              {trf('{0} khiếu nại mở', { 0: entry.openComplaintsCount })}
                            </Badge>
                          )}
                          {entry.approvedRetakeRequests.length > 0 && (
                            <Badge tone="info" size="sm">
                              {trf('{0} hỗ trợ ôn JLPT', { 0: entry.approvedRetakeRequests.length })}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-3">
                      {entry.nextSession?.canJoin && entry.nextSession?.roomId ? (
                        <Button as={Link} to={`/meeting-room/${entry.nextSession.roomId}`} variant="primary" size="sm" icon={Video}>
                          {tr('Vào dạy')}
                        </Button>
                      ) : <span />}
                      <Button variant="soft" size="sm" onClick={() => openCohort(entry.cohortId, 'overview')}>
                        {tr('Mở không gian lớp')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/mentor-study-courses/')}>
                    {tr('Tất cả lớp')}
                  </Button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand" icon={false} size="sm">{selectedCohort.level}</Badge>
                      <Badge tone={selectedCohort.lifecycle.tone} size="sm">{tr(selectedCohort.lifecycle.label)}</Badge>
                      {selectedCohort.intensityLabel && (
                        <Badge tone="neutral" icon={false} size="sm">{tr(selectedCohort.intensityLabel)}</Badge>
                      )}
                    </div>
                    <h1 className="mt-1.5 text-xl font-semibold text-rp-text sm:text-2xl">{selectedCohort.name}</h1>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mentorCohortEntries.length > 1 && (
                    <div className="w-56">
                      <CustomSelect
                        size="sm"
                        aria-label={tr('Chuyển nhanh sang lớp khác')}
                        value={String(selectedCohort.cohortId)}
                        onChange={(val) => openCohort(Number(val), activeSection)}
                        options={mentorCohortEntries.map((entry) => ({
                          value: String(entry.cohortId),
                          label: `${entry.name} (${entry.level})`,
                        }))}
                      />
                    </div>
                  )}
                  {selectedCohort.liveSession?.roomId && (
                    <Button as={Link} to={`/meeting-room/${selectedCohort.liveSession.roomId}`} variant="primary" size="sm" icon={Video}>
                      {tr('Vào phòng học chung')}
                    </Button>
                  )}
                  <RefreshButton
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                  />
                </div>
              </div>

              <div className="border-t border-rp-line pt-3">
                <Tabs
                  className="sm:flex-wrap"
                  value={activeSection}
                  onChange={switchSection}
                  label={tr('Điều hướng không gian lớp')}
                  tabs={TABS.map((tab) => ({
                    value: tab.id,
                    label: tab.label,
                    icon: tab.icon,
                    count: tab.id === 'learners'
                      ? selectedCohort.enrolledCourses.length
                      : tab.id === 'homework'
                        ? submittedHomeworkCount || undefined
                        : tab.id === 'attendance'
                          ? selectedCohort.pendingAttendanceCount || undefined
                          : tab.id === 'support'
                            ? ((selectedCohort.openComplaintsCount || 0) + selectedCohort.approvedRetakeRequests.length) || undefined
                            : undefined,
                  }))}
                />
              </div>
            </Card>

            {/* ---------- TAB 1: OVERVIEW ---------- */}
            {activeSection === 'overview' && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <Card className="space-y-4">
                  <CardHeader
                    title="Thông tin lớp học"
                    description={selectedCohort.patternText || trf('{0} buổi · {1} phút/buổi', {
                      0: selectedCohort.totalSessions || 0,
                      1: selectedCohort.sessionMinutes || 90,
                    })}
                    icon={<FeatureIcon feature="mentor" size="sm" />}
                  />
                  <dl className="grid grid-cols-2 gap-3 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5 text-xs">
                    <div>
                      <dt className="text-rp-text-muted">{tr('Sĩ số hiện tại')}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-rp-text">
                        {selectedCohort.capacity != null
                          ? `${selectedCohort.enrolledCourses.length}/${selectedCohort.capacity} ${tr('học viên')}`
                          : `${selectedCohort.enrolledCourses.length} ${tr('học viên')}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-rp-text-muted">{tr('Ngày khai giảng')}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-rp-text">{fmtDate(selectedCohort.startsAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-rp-text-muted">{tr('Thời lượng chuẩn')}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-rp-text">
                        {trf('{0} buổi · {1} phút/buổi', {
                          0: selectedCohort.totalSessions || 0,
                          1: selectedCohort.sessionMinutes || 90,
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-rp-text-muted">{tr('Học viên chờ điểm danh')}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-rp-brand-strong">{selectedCohort.pendingAttendanceCount}</dd>
                    </div>
                  </dl>

                  {selectedCohort.nextSession ? (
                    <div className={cx(
                      'rounded-xl border p-4',
                      selectedCohort.nextSession.canJoin ? 'border-rp-success-line bg-rp-success-bg/70' : 'border-rp-line bg-white',
                    )}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-rp-brand-strong">
                        {selectedCohort.nextSession.canJoin ? tr('Phòng học đang mở') : tr('Buổi dạy tiếp theo')}
                      </p>
                      <p className="mt-1 text-base font-semibold text-rp-text">
                        {trf('Buổi {0}', { 0: selectedCohort.nextSession.number })} · {fmtDate(selectedCohort.nextSession.scheduledAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedCohort.nextSession.roomId && (
                          <Button as={Link} to={`/meeting-room/${selectedCohort.nextSession.roomId}`} variant="primary" size="sm" icon={Video}>
                            {tr('Vào phòng học chung')}
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" icon={ClipboardCheck} onClick={() => switchSection('attendance')}>
                          {tr('Chốt điểm danh')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-rp-text-muted">{tr('Chưa có lịch buổi dạy sắp tới.')}</p>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Việc cần xử lý trong lớp" description="Chuyển nhanh tới đúng công việc" />
                  <div className="mt-3 space-y-2.5">
                    {[
                      {
                        section: 'learners',
                        count: selectedCohort.enrolledCourses.length,
                        label: 'Học viên ghi danh & hồ sơ năng lực',
                        cta: 'Xem danh sách',
                      },
                      {
                        section: 'homework',
                        count: submittedHomeworkCount,
                        label: 'Bài tập đã nộp chờ chấm',
                        cta: 'Mở bài tập',
                      },
                      {
                        section: 'attendance',
                        count: selectedCohort.pendingAttendanceCount,
                        label: 'Lượt buổi chưa chốt điểm danh',
                        cta: 'Điểm danh',
                      },
                      {
                        section: 'support',
                        count: selectedCohort.openComplaintsCount ?? '—',
                        label: 'Khiếu nại đang mở',
                        cta: 'Xử lý',
                      },
                    ].map((item) => (
                      <button
                        key={item.section}
                        type="button"
                        onClick={() => switchSection(item.section)}
                        className="rp-focus flex w-full items-center justify-between rounded-xl border border-rp-line bg-rp-surface px-3.5 py-2.5 text-left text-sm transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                      >
                        <span>
                          <strong className="tabular-nums">{item.count}</strong> {tr(item.label)}
                        </span>
                        <span className="text-xs font-semibold text-rp-brand-strong">{tr(item.cta)}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ---------- TAB 2: LEARNERS & SKILL PROFILE ---------- */}
            {activeSection === 'learners' && (
              <Card className="space-y-4">
                <CardHeader
                  title={trf('Danh sách học viên ({0})', { 0: selectedCohort.allCourses.length })}
                  description="Theo dõi chuyên cần, tỷ lệ nộp bài tập đúng hạn và mở hồ sơ năng lực chi tiết của từng học viên."
                />
                {selectedCohort.allCourses.length === 0 ? (
                  <ContextualEmptyState
                    variant="compact"
                    illustration="mentor"
                    title="Lớp chưa có học viên ghi danh"
                    description="Khi học viên đăng ký thành công, hồ sơ học tập sẽ hiển thị tại đây."
                  />
                ) : (
                  <>
                    <div className="hidden md:block">
                      <DataTable
                        columns={learnerColumns}
                        rows={selectedCohort.allCourses}
                        rowKey={(c) => c.id}
                        density="compact"
                        itemLabel="học viên"
                      />
                    </div>
                    <div className="space-y-2.5 md:hidden">
                      {selectedCohort.allCourses.map((c) => {
                        const sessList = c.sessions || [];
                        const presentCount = sessList.filter((s) => s.status === 'Present').length;
                        const hasApprovedRetake = (c.requests || []).some((r) => r.status === 'Approved');
                        return (
                          <div key={c.id} className="rounded-xl border border-rp-line bg-rp-bg-2 p-3 space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-rp-text">{c.learnerName || tr('Học viên')}</span>
                              <Badge tone={statusBadgeTone(c.status)} size="sm">{showStatus(c.status)}</Badge>
                            </div>
                            <p className="text-rp-text-2">
                              {trf('{0}/{1} buổi có mặt', { 0: presentCount, 1: sessList.length || selectedCohort.totalSessions })}
                              {c.eligibility ? ` · ${tr('Bài tập')}: ${c.eligibility.passedOnTimeHomework}/${c.eligibility.requiredHomework}` : ''}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => openSkillModal(c)}>
                                {tr('Hồ sơ năng lực')}
                              </Button>
                              {hasApprovedRetake && (
                                <Button variant="soft" size="sm" onClick={() => switchSection('support')}>
                                  {tr('Lộ trình ôn lại')}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* ---------- TAB 3: SCHEDULE & RESCHEDULE DRAWER ---------- */}
            {activeSection === 'schedule' && (
              <div className="space-y-4">
                {selectedCohort.cohortObj && (
                  <Card density="compact" className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-rp-text">{tr('Điều chỉnh lịch khai giảng / dời tuần học')}</p>
                      <p className="text-xs text-rp-text-muted">{tr('Yêu cầu dời lịch hoặc hủy lớp trống sẽ gửi tới Quản trị viên xem xét trước khi áp dụng.')}</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setScheduleDrawerOpen(true)}>
                      {tr('Gửi yêu cầu dời/hủy lịch')}
                    </Button>
                  </Card>
                )}

                {calendarRepresentativeCourse && (
                  <CohortSessionsCalendar course={calendarRepresentativeCourse} cohort={selectedCohort.cohortObj}>
                    <div className="space-y-2">
                      {selectedCohort.sessions.length === 0 ? (
                        <p className="text-sm text-rp-text-muted">{tr('Chưa có buổi học nào.')}</p>
                      ) : (
                        selectedCohort.sessions.map((s) => (
                          <div
                            key={s.id || s.number}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-sm"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-rp-text">
                                {trf('Buổi {0}', { 0: s.number })}
                                {s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}
                              </strong>
                              <span className="text-xs text-rp-text-muted">· {fmtDate(s.scheduledAt)}</span>
                              <Badge tone={statusBadgeTone(s.status)} size="sm">{showStatus(s.status)}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {s.roomId && (
                                <Button as={Link} to={`/meeting-room/${s.roomId}`} variant="soft" size="sm" icon={Video}>
                                  {tr('Vào phòng học chung')}
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedSessionNumber(Number(s.number));
                                  switchSection('attendance');
                                }}
                              >
                                {tr('Điểm danh buổi này')}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CohortSessionsCalendar>
                )}

                <Drawer
                  open={scheduleDrawerOpen && Boolean(selectedCohort.cohortObj)}
                  onClose={() => setScheduleDrawerOpen(false)}
                  title={tr('Yêu cầu dời lịch / hủy lớp trống')}
                  width="w-[min(560px,100vw)]"
                >
                  {selectedCohort.cohortObj && (
                    <CohortScheduleRequestPanel
                      cohorts={[selectedCohort.cohortObj]}
                      initialCohortId={selectedCohort.cohortId}
                      busy={busy}
                      onRun={runAction}
                    />
                  )}
                </Drawer>
              </div>
            )}

            {/* ---------- TAB 4: HOMEWORK ---------- */}
            {activeSection === 'homework' && (
              homeworkLoading && cohortHomework.length === 0 ? (
                <Card>
                  <SakuraLoader variant="section" context="homework" className="min-h-[140px]" delay={160} />
                </Card>
              ) : homeworkError ? (
                <Card>
                  <ContextualErrorState
                    compact
                    error={homeworkError}
                    title={tr('Chưa tải được bài tập nhóm')}
                    onRetry={() => setHomeworkTick((t) => t + 1)}
                    retrying={homeworkLoading}
                  />
                </Card>
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
              <Card className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="rp-type-card text-rp-text">{tr('Điểm danh theo buổi học')}</h2>
                    <p className="mt-1 text-xs text-rp-text-muted">
                      {tr('Chọn buổi học để điểm danh từng học viên trong lớp trên một màn hình.')}
                    </p>
                  </div>
                  {currentCohortSessionMeta?.roomId && (
                    <Button as={Link} to={`/meeting-room/${currentCohortSessionMeta.roomId}`} variant="primary" size="sm" icon={Video}>
                      {tr('Mở phòng học chung')}
                    </Button>
                  )}
                </div>

                {selectedCohort.sessions.length === 0 ? (
                  <ContextualEmptyState variant="compact" illustration="calendar" title="Lớp chưa có lịch buổi học để điểm danh" />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-full sm:w-72">
                        <CustomSelect
                          aria-label={tr('Chọn buổi học')}
                          value={String(effectiveSessionNumber ?? '')}
                          onChange={(val) => setSelectedSessionNumber(Number(val))}
                          options={selectedCohort.sessions.map((s) => {
                            const pendingAny = selectedCohort.enrolledCourses.some(
                              (c) => c.status === 'Active' && (c.sessions || []).some((cs) => Number(cs.number) === Number(s.number) && cs.status === 'Scheduled'),
                            );
                            return {
                              value: String(s.number),
                              label: `${trf('Buổi {0}', { 0: s.number })} · ${fmtDate(s.scheduledAt)}${pendingAny ? ` · ${tr('Chờ điểm danh')}` : ''}`,
                            };
                          })}
                        />
                      </div>

                      {currentCohortSessionMeta && (
                        <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-xs text-rp-text-2">
                          <Clock className="h-3.5 w-3.5 text-rp-brand-strong" />
                          <span className="font-semibold text-rp-text">{trf('Buổi {0}', { 0: currentCohortSessionMeta.number })}</span>
                          <span>· {fmtDate(currentCohortSessionMeta.scheduledAt)}</span>
                        </div>
                      )}
                    </div>

                    {sessionRoster.length === 0 ? (
                      <ContextualEmptyState variant="compact" illustration="mentor" title="Chưa có học viên nào ghi danh vào buổi học này." />
                    ) : (
                      <>
                        <div className="hidden md:block">
                          <DataTable
                            columns={attendanceColumns}
                            rows={sessionRoster}
                            rowKey={({ course, session }) => `${course.id}-${session.id}`}
                            density="compact"
                            itemLabel="học viên"
                          />
                        </div>
                        <div className="space-y-2.5 md:hidden">
                          {sessionRoster.map(({ course, session }) => {
                            const canMark = course.status === 'Active' && session.status === 'Scheduled';
                            return (
                              <div key={`${course.id}-${session.id}`} className="rounded-xl border border-rp-line bg-rp-bg-2 p-3 space-y-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-rp-text">{course.learnerName || tr('Học viên')}</p>
                                    <p className="text-rp-text-muted">{showStatus(course.status)}</p>
                                  </div>
                                  <Badge tone={statusBadgeTone(session.status)} size="sm">{showStatus(session.status)}</Badge>
                                </div>
                                {session.note && <p className="text-rp-text-2">{session.note}</p>}
                                {canMark && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={CheckCircle2}
                                    disabled={busy}
                                    onClick={() => setAttendanceModal({
                                      course,
                                      session,
                                      status: 'Present',
                                      note: session.note || '',
                                    })}
                                  >
                                    {tr('Điểm danh')}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </Card>
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

                <Card className="space-y-4">
                  <CardHeader
                    title="Lộ trình hỗ trợ ôn lại khi trượt JLPT chính thức"
                    description="Sau khi Quản trị viên duyệt minh chứng trượt JLPT của học viên, Giáo viên lập kế hoạch ôn lại tại đây."
                  />
                  {selectedCohort.approvedRetakeRequests.length === 0 ? (
                    <ContextualEmptyState
                      variant="compact"
                      illustration="certificate"
                      title="Chưa có yêu cầu hỗ trợ ôn lại"
                      description="Chưa có học viên nào cần lập kế hoạch ôn lại trong lớp này."
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedCohort.approvedRetakeRequests.map((r) => (
                        <div key={r.id} className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm text-rp-text">{r.learnerName || tr('Học viên')}</strong>
                            <span className="text-xs text-rp-text-muted">
                              {trf('Thi: {0} · Công bố: {1}', { 0: fmtDate(r.examDate), 1: fmtDate(r.resultPublishedAt) })}
                            </span>
                          </div>
                          {r.reason && (
                            <p className="text-xs leading-relaxed text-rp-text-2">
                              <strong>{tr('Lý do học viên:')}</strong> {r.reason}
                            </p>
                          )}
                          {r.response && (
                            <p className="text-xs leading-relaxed text-rp-text-2">
                              <strong>{tr('Quyết định của Quản trị viên:')}</strong> {r.response}
                            </p>
                          )}
                          {r.mentorSupportPlan && (
                            <p className="rounded-lg border border-rp-line bg-rp-surface px-3 py-2 text-xs text-rp-text">
                              <strong>{tr('Lộ trình đã lưu:')}</strong> {r.mentorSupportPlan}
                            </p>
                          )}
                          <div className="flex justify-end">
                            <Button
                              variant={r.mentorSupportPlan ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => setSupportModal({ request: r, plan: r.mentorSupportPlan || '' })}
                            >
                              {tr(r.mentorSupportPlan ? 'Cập nhật lộ trình' : 'Lập lộ trình hỗ trợ')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}

        {/* Attendance Modal */}
        <Modal
          open={Boolean(attendanceModal)}
          onClose={() => !busy && setAttendanceModal(null)}
          title={attendanceModal ? trf('Điểm danh: {0}', { 0: attendanceModal.course.learnerName || tr('Học viên') }) : ''}
          description={attendanceModal ? `${trf('Buổi {0}', { 0: attendanceModal.session.number })} · ${fmtDate(attendanceModal.session.scheduledAt)}` : ''}
          size="md"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setAttendanceModal(null)} disabled={busy}>
                {tr('Hủy')}
              </Button>
              <Button
                type="submit"
                form="cohort-attendance-form"
                variant="primary"
                loading={busy}
                disabled={!attendanceModal?.note?.trim()}
              >
                {tr('Lưu điểm danh')}
              </Button>
            </>
          )}
        >
          {attendanceModal && (
            <form
              id="cohort-attendance-form"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = attendanceModal.note.trim();
                if (!trimmed) return;
                runAction(
                  async () => {
                    await coursePost(
                      `/${attendanceModal.course.id}/sessions/${attendanceModal.session.id}/attendance`,
                      { status: attendanceModal.status, note: trimmed },
                    );
                    setAttendanceModal(null);
                  },
                  trf('Đã lưu điểm danh cho {0}.', { 0: attendanceModal.course.learnerName || tr('học viên') }),
                );
              }}
            >
              <Field label="Trạng thái" required>
                <CustomSelect
                  disabled={busy}
                  value={attendanceModal.status}
                  onChange={(val) => setAttendanceModal((cur) => cur && ({ ...cur, status: val }))}
                  options={ATTENDANCE_OPTIONS.map((x) => ({ value: x, label: showStatus(x) }))}
                />
              </Field>
              <Field label="Ghi chú điểm danh" required counter={`${attendanceModal.note.trim().length} / 1000`}>
                <Textarea
                  required
                  rows={4}
                  disabled={busy}
                  maxLength={1000}
                  value={attendanceModal.note}
                  onChange={(e) => setAttendanceModal((cur) => cur && ({ ...cur, note: e.target.value }))}
                  placeholder={tr('Nhận xét tình hình tham gia buổi học…')}
                />
              </Field>
            </form>
          )}
        </Modal>

        {/* JLPT Retake Support Plan Modal */}
        <Modal
          open={Boolean(supportModal)}
          onClose={() => !busy && setSupportModal(null)}
          title="Lộ trình hỗ trợ ôn lại JLPT của Giáo viên"
          description={supportModal?.request?.learnerName || tr('Học viên')}
          size="md"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setSupportModal(null)} disabled={busy}>
                {tr('Hủy')}
              </Button>
              <Button
                type="submit"
                form="retake-support-plan-form"
                variant="primary"
                loading={busy}
                disabled={!supportModal?.plan?.trim()}
              >
                {tr('Lưu lộ trình hỗ trợ')}
              </Button>
            </>
          )}
        >
          {supportModal && (
            <form
              id="retake-support-plan-form"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const val = supportModal.plan.trim();
                if (!val) return;
                runAction(
                  async () => {
                    await saveRetakeSupportPlan(supportModal.request.courseId, supportModal.request.id, val);
                    setSupportModal(null);
                  },
                  'Đã lưu kế hoạch hỗ trợ ôn lại cho học viên.',
                );
              }}
            >
              <Field label="Nội dung lộ trình" required counter={`${supportModal.plan.trim().length} / 2000`}>
                <Textarea
                  required
                  rows={5}
                  disabled={busy}
                  maxLength={2000}
                  value={supportModal.plan}
                  onChange={(e) => setSupportModal((cur) => cur && ({ ...cur, plan: e.target.value }))}
                  placeholder={tr('Nhập kế hoạch ôn luyện kỹ năng yếu và lịch đồng hành…')}
                />
              </Field>
            </form>
          )}
        </Modal>

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
                {tr('Trình độ đánh giá:')}{' '}
                <strong>{skillModal.data.assessedJlptLevel || selectedCohort?.level || 'JLPT'}</strong>{' '}
                · {tr('Bài tập đúng hạn:')}{' '}
                <strong>{skillModal.data.homeworkStats?.onTimeCount ?? 0}/{skillModal.data.homeworkStats?.assignedCount ?? 0}</strong>
                {skillModal.data.homeworkStats?.onTimePercent != null ? ` (${skillModal.data.homeworkStats.onTimePercent}%)` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {(skillModal.data.skills || []).map((sk) => (
                  <Badge key={sk.skill} tone="neutral" icon={false} size="sm">
                    {tr(sk.skill)}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : tr('Chưa có mẫu')}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Modal>
      </PageContainer>
    </MentorShell>
  );
}
