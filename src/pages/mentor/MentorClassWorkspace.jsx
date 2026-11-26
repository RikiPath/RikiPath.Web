import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Layers,
  MessageSquareWarning,
  Paperclip,
  Users,
  Video,
  X,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  BackButton,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Drawer,
  Field,
  Modal,
  PageContainer,
  ProgressBar,
  RefreshButton,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  Tabs,
  Textarea,
  Tooltip,
  UnifiedToolbar,
  UserAvatar,
  cx,
  notify,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatusBadge,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { getSession } from '@/app/auth/session.js';
import { queryClient } from '@/api/queryClient.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import {
  courseGet,
  coursePost,
  getCohortComplaints,
  getCohortHomework,
  getCohorts,
  saveRetakeSupportPlan,
} from '@/features/cohorts/api/cohortApi.js';
import { fetchMentorProposalAttachmentBlob } from '@/features/scheduling/api/teachingProposalApi.js';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel.jsx';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel.jsx';
import CohortScheduleRequestPanel from '@/features/scheduling/components/CohortScheduleRequestPanel.jsx';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import OccupancyProgressBar from '@/features/cohorts/components/OccupancyProgressBar.jsx';
import { schedulePatternText, weeklyScheduleLinesOf } from '@/features/cohorts/utils/cohortCardModel.js';
import { getSessionJoinState } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatTuitionVnd } from '@/features/scheduling/utils/proposalValidation.js';
import {
  CLASS_LIFECYCLE_STATUSES,
  computeClassProgress,
  computeLearnerAttendance,
  isConfirmedClassEnrollment,
  resolveClassLifecycleStatus,
} from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { formatDate } from '@/utils/dateTimeFormat.js';
import { formatVnDateTime, formatVnSlotWindow, parseUtcDate } from '@/utils/vnDateTime.js';
import { translateText, useLocale } from '@/locales/locale.js';

const STATUS_LABELS = {
  PendingPayment: 'Chờ thanh toán',
  Ready: 'Sắp diễn ra',
  Active: 'Đang học',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
  Open: 'Đang tuyển sinh',
  Published: 'Đang tuyển sinh',
  Draft: 'Chờ xử lý',
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
  { id: 'learners', label: 'Học viên', icon: Users },
  { id: 'schedule', label: 'Lịch học', icon: CalendarDays },
  { id: 'homework', label: 'Bài tập', icon: ClipboardList },
  { id: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
  { id: 'support', label: 'Hỗ trợ', icon: MessageSquareWarning },
];

const ATTENDANCE_OPTIONS = ['Present', 'Absent', 'ExcusedAbsent', 'CancelledByMentor'];
const SHORT_WEEKDAY = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };

const showStatus = (v) => translateText(STATUS_LABELS[v] || v || '');
const fmtDateOnly = (v) => (v ? formatDate(v, '—') : '—');
const fmtDateTime = (v) => (v ? formatVnDateTime(v, '—') : '—');

/**
 * Stage-aware display status for confirmed enrolled learners (display-only; never mutates DB enrollment status).
 */
function resolveLearnerDisplayStatus(course, lifecycleId) {
  if (course?.status === 'Completed') return { tone: 'success', label: 'Đã hoàn thành' };
  if (lifecycleId === 'Cancelled') return { tone: 'danger', label: 'Đã hủy' };
  if (lifecycleId === 'Recruiting') return { tone: 'success', label: 'Đã ghi danh' };
  if (lifecycleId === 'Upcoming') return { tone: 'neutral', label: 'Sắp học' };
  if (lifecycleId === 'Completed') return { tone: 'neutral', label: 'Chưa hoàn thành' };
  return { tone: 'warning', label: 'Đang học' };
}

function statusBadgeTone(status) {
  if (status === 'Open' || status === 'Published' || status === 'Transferred') return 'info';
  if (status === 'Ready' || status === 'Scheduled') return 'neutral';
  if (status === 'Active' || status === 'Live' || status === 'Pending') return 'warning';
  if (status === 'Completed' || status === 'Present' || status === 'Approved') return 'success';
  if (status === 'Absent' || status === 'Cancelled' || status === 'CancelledByMentor' || status === 'Rejected') return 'danger';
  return 'neutral';
}

function findRoomId(session, cohortObj) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohortObj?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohortObj?.sessions?.[0];
  return match?.roomId || session?.roomId || null;
}

function compactScheduleSummary(cohortObj, totalSessions, sessionMinutes, tr, trf) {
  const spw = Number(cohortObj?.sessionsPerWeek) || 0;
  const pattern = Array.isArray(cohortObj?.schedulePattern) ? cohortObj.schedulePattern : [];
  if (pattern.length > 0) {
    const order = (d) => (d === 0 ? 7 : d);
    const uniqueDays = [...new Set([...pattern].sort((a, b) => order(a.weekday) - order(b.weekday)).map((p) => SHORT_WEEKDAY[p.weekday] || p.weekdayLabel))];
    const freqText = spw > 0 ? trf('{0} buổi/tuần', { 0: spw }) : trf('{0} buổi/tuần', { 0: pattern.length });
    return `${freqText} · ${uniqueDays.join(', ')}`;
  }
  return trf('{0} buổi · {1} phút/buổi', { 0: totalSessions || 0, 1: sessionMinutes || 90 });
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

  const [homeworkState, setHomeworkState] = useState({ cohortId: null, items: [] });
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState(null);
  const [homeworkTick, setHomeworkTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const refreshSeqRef = useRef(0);
  const inFlightRefreshRef = useRef(null);

  const [sessionSelection, setSessionSelection] = useState({ cohortId: null, number: null });
  const [attendanceModalState, setAttendanceModalState] = useState(null);
  const [supportModalState, setSupportModalState] = useState(null);
  const [scheduleDrawerState, setScheduleDrawerState] = useState({ cohortId: null, open: false });

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
        if (alive) setLoadError(e);
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
        name: cohortObj?.name || c.cohortName || c.name || tr('Lớp học JLPT'),
        level: cohortObj?.level || c.level || 'JLPT',
        status: cohortObj?.status || c.status || 'Active',
        startsAt: cohortObj?.startsAt || c.startsAt,
        endsAt: cohortObj?.endsAt || c.endsAt,
        totalSessions: cohortObj?.totalSessions ?? c.totalSessions ?? 0,
        sessionMinutes: cohortObj?.sessionMinutes ?? c.sessionMinutes ?? 90,
        sessionsPerWeek: cohortObj?.sessionsPerWeek ?? c.sessionsPerWeek ?? 0,
        courseDurationWeeks: cohortObj?.courseDurationWeeks || 10,
        courseObjective: cohortObj?.courseObjective || null,
        attachments: Array.isArray(cohortObj?.attachments) ? cohortObj.attachments : [],
        sourceProposalId: cohortObj?.sourceProposalId || null,
        capacity: cohortObj?.capacitySnapshot || cohortObj?.capacity || null,
        price: cohortObj?.price ?? cohortObj?.tuitionPerLearner ?? c.amount ?? 0,
        enrolledCourses: [],
        allCourses: [],
      };
      existing.allCourses.push(c);
      if (isConfirmedClassEnrollment(c)) {
        const lid = c.learnerId ?? `course-${c.id}`;
        const prevIdx = existing.enrolledCourses.findIndex((x) => (x.learnerId ?? `course-${x.id}`) === lid);
        if (prevIdx < 0) existing.enrolledCourses.push(c);
        else if (Number(c.id) > Number(existing.enrolledCourses[prevIdx].id)) existing.enrolledCourses[prevIdx] = c;
      }
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
        status: ch.status || 'Published',
        startsAt: ch.startsAt,
        endsAt: ch.endsAt,
        totalSessions: ch.totalSessions ?? (ch.sessions?.length || 0),
        sessionMinutes: ch.sessionMinutes ?? 90,
        sessionsPerWeek: ch.sessionsPerWeek ?? 0,
        courseDurationWeeks: ch.courseDurationWeeks || 10,
        courseObjective: ch.courseObjective || null,
        attachments: Array.isArray(ch.attachments) ? ch.attachments : [],
        sourceProposalId: ch.sourceProposalId || null,
        capacity: ch.capacitySnapshot || ch.capacity || null,
        price: ch.price ?? ch.tuitionPerLearner ?? 0,
        enrolledCourses: [],
        allCourses: [],
      });
    }

    return [...byId.values()].map((entry) => {
      const repCourse = entry.enrolledCourses.find((c) => c.status === 'Active')
        || entry.enrolledCourses[0]
        || entry.allCourses[0]
        || null;

      // Deduplicate strictly by session number; use cohortObj.sessions.startTime as authoritative schedule source even when 0 learners exist.
      const sessionMap = new Map();
      (entry.cohortObj?.sessions || []).forEach((s) => {
        const startIso = s.scheduledAt || s.startTime || null;
        sessionMap.set(Number(s.number), {
          id: s.id ?? s.number,
          number: Number(s.number),
          availabilityId: s.availabilityId || null,
          scheduledAt: startIso,
          startTime: s.startTime || startIso,
          endTime: s.endTime || null,
          roomId: s.roomId || null,
          status: entry.status === 'Cancelled' ? 'Cancelled' : 'Scheduled',
        });
      });

      (repCourse?.sessions || []).forEach((s) => {
        const num = Number(s.number);
        const cur = sessionMap.get(num) || {};
        sessionMap.set(num, {
          ...cur,
          id: s.id ?? cur.id ?? num,
          number: num,
          attempt: s.attempt,
          scheduledAt: cur.scheduledAt || s.scheduledAt,
          startTime: cur.startTime || s.scheduledAt,
          endTime: cur.endTime || null,
          meetingUrl: s.meetingUrl,
          roomId: findRoomId(s, entry.cohortObj) || cur.roomId,
          status: s.status || cur.status || 'Scheduled',
          note: s.note,
          sessionCompleted: Boolean(s.confirmedAt)
            || s.status === 'Completed'
            || s.status === 'Present'
            || s.status === 'Absent'
            || s.status === 'ExcusedAbsent',
        });
      });

      const sessions = [...sessionMap.values()].sort((a, b) => Number(a.number) - Number(b.number));
      const confirmedCount = entry.cohortObj?.confirmedEnrolledCount ?? entry.enrolledCourses.length;
      const pendingHoldCount = 0;
      const seatsAvailable = entry.cohortObj?.seatsAvailable ?? (
        entry.capacity != null ? Math.max(0, Number(entry.capacity) - confirmedCount) : null
      );

      const lifecycle = resolveClassLifecycleStatus({
        cohortStatus: entry.status,
        confirmedEnrolledCount: confirmedCount,
        capacity: entry.capacity,
        minLearnersToStart: entry.cohortObj?.minLearnersToStart ?? 1,
        startsAt: entry.startsAt,
        enrollmentClosesAtUtc: entry.cohortObj?.enrollmentClosesAtUtc ?? null,
        totalSessions: entry.totalSessions || sessions.length,
        sessions,
        enrolledCourses: entry.enrolledCourses,
        nowMs,
      });

      const allowLiveRoom = lifecycle.id !== 'Recruiting' && lifecycle.id !== 'Completed' && lifecycle.id !== 'Cancelled' && entry.enrolledCourses.length > 0;
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
        const endAt = parseUtcDate(s.endTime)?.getTime() || (at + durationMinutes * 60_000);
        if (allowLiveRoom && joinState.canJoin && s.roomId) liveSession = s;
        if (!nextSession && nowMs <= endAt + 15 * 60_000 && s.status !== 'CancelledByMentor' && s.status !== 'Cancelled') {
          nextSession = { ...s, canJoin: Boolean(allowLiveRoom && joinState.canJoin && s.roomId) };
        }
      }

      let pendingAttendanceCount = 0;
      if (lifecycle.id === 'Teaching' || lifecycle.id === 'Completed') {
        for (const c of entry.enrolledCourses) {
          if (c.status !== 'Active') continue;
          for (const s of c.sessions || []) {
            if (s.status !== 'Scheduled' || !s.scheduledAt) continue;
            const endAt = (parseUtcDate(s.scheduledAt)?.getTime() || 0) + (c.sessionMinutes || durationMinutes) * 60_000;
            if (endAt > 0 && endAt <= nowMs) pendingAttendanceCount += 1;
          }
        }
      }

      const approvedRetakeRequests = entry.allCourses.flatMap((c) =>
        (c.requests || [])
          .filter((r) => r.status === 'Approved')
          .map((r) => ({ ...r, courseId: c.id, learnerName: c.learnerName })),
      );
      const classComplaints = complaints.filter((cp) => Number(cp.cohortId) === entry.cohortId);
      const openComplaintsCount = complaintsError
        ? 0
        : classComplaints.filter((cp) => cp.status === 'Open' || cp.status === 'UnderReview').length;

      const progress = computeClassProgress(sessions, entry.totalSessions || sessions.length);
      const weeklyLines = entry.cohortObj
        ? weeklyScheduleLinesOf({ schedulePattern: entry.cohortObj.schedulePattern, sessions })
        : (sessions.length > 0 ? weeklyScheduleLinesOf({ schedulePattern: [], sessions }) : []);
      const patternText = entry.cohortObj
        ? schedulePatternText(entry.cohortObj.schedulePattern, entry.cohortObj.sessions)
        : (sessions.length > 0 ? schedulePatternText([], sessions) : '');
      const effectiveTotalSessions = progress.totalSessions || entry.totalSessions || sessions.length || 0;
      const totalTeachingHours = entry.cohortObj?.totalTeachingHours
        ?? (effectiveTotalSessions > 0 ? Math.round(((effectiveTotalSessions * durationMinutes) / 60) * 10) / 10 : 0);

      return {
        ...entry,
        confirmedCount,
        pendingHoldCount,
        seatsAvailable,
        totalTeachingHours,
        weeklyLines,
        lifecycle,
        progress,
        repCourse,
        sessions,
        nextSession,
        liveSession,
        pendingAttendanceCount,
        approvedRetakeRequests,
        classComplaintsCount: classComplaints.length,
        openComplaintsCount,
        patternText,
        compactSchedule: compactScheduleSummary(entry.cohortObj, entry.totalSessions || sessions.length, entry.sessionMinutes, tr, trf),
      };
    });
  }, [courses, cohorts, complaints, complaintsError, sessionUserId, nowMs, tr, trf]);

  const selectedCohort = useMemo(() => {
    if (!activeCohortIdParam) return null;
    const idNum = Number(activeCohortIdParam);
    return mentorCohortEntries.find((c) => c.cohortId === idNum) || null;
  }, [activeCohortIdParam, mentorCohortEntries]);

  const activeCohortId = selectedCohort?.cohortId ?? null;
  const cohortHomework = useMemo(
    () => (homeworkState.cohortId === activeCohortId ? homeworkState.items : []),
    [homeworkState, activeCohortId],
  );
  const selectedSessionNumber =
    sessionSelection.cohortId === activeCohortId ? sessionSelection.number : null;
  const attendanceModal = attendanceModalState?.cohortId === activeCohortId ? attendanceModalState : null;
  const supportModal = supportModalState?.cohortId === activeCohortId ? supportModalState : null;
  const scheduleDrawerOpen = Boolean(
    scheduleDrawerState.open && scheduleDrawerState.cohortId === activeCohortId,
  );

  const setAttendanceModal = useCallback(
    (updater) => {
      if (typeof updater === 'function') {
        setAttendanceModalState((cur) => {
          const next = updater(cur?.cohortId === activeCohortId ? cur : null);
          return next ? { ...next, cohortId: activeCohortId } : null;
        });
      } else {
        setAttendanceModalState(updater ? { ...updater, cohortId: activeCohortId } : null);
      }
    },
    [activeCohortId],
  );

  const setSupportModal = useCallback(
    (updater) => {
      if (typeof updater === 'function') {
        setSupportModalState((cur) => {
          const next = updater(cur?.cohortId === activeCohortId ? cur : null);
          return next ? { ...next, cohortId: activeCohortId } : null;
        });
      } else {
        setSupportModalState(updater ? { ...updater, cohortId: activeCohortId } : null);
      }
    },
    [activeCohortId],
  );

  const setScheduleDrawerOpen = useCallback(
    (open) => {
      setScheduleDrawerState(open ? { cohortId: activeCohortId, open: true } : { cohortId: null, open: false });
    },
    [activeCohortId],
  );

  useEffect(() => {
    if (!activeCohortId) return undefined;
    let alive = true;
    const reqCohortId = activeCohortId;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setHomeworkLoading(true);
        setHomeworkError(null);
        return getCohortHomework(reqCohortId);
      })
      .then((rows) => {
        if (!alive || rows == null) return;
        setHomeworkState({
          cohortId: reqCohortId,
          items: Array.isArray(rows) ? rows : [],
        });
      })
      .catch((e) => {
        if (alive) setHomeworkError(e);
      })
      .finally(() => alive && setHomeworkLoading(false));
    return () => {
      alive = false;
    };
  }, [activeCohortId, homeworkTick]);

  const handleRefresh = () => {
    if (inFlightRefreshRef.current) return inFlightRefreshRef.current;
    const seq = ++refreshSeqRef.current;
    setRefreshing(true);
    const reqCohortId = selectedCohort?.cohortId;
    const job = Promise.all([
      loadAll(),
      reqCohortId
        ? getCohortHomework(reqCohortId)
            .then((rows) => {
              if (refreshSeqRef.current === seq) {
                setHomeworkState({
                  cohortId: reqCohortId,
                  items: Array.isArray(rows) ? rows : [],
                });
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
  };

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
    setSessionSelection({ cohortId: null, number: null });
    setScheduleDrawerState({ cohortId: null, open: false });
    setAttendanceModalState(null);
    setSupportModalState(null);
    navigate(`/mentor-study-courses/${cid}/?section=${section}`);
  }

  function switchSection(section) {
    if (!selectedCohort) return;
    const next = new URLSearchParams(searchParams);
    next.set('section', section);
    next.delete('cohortId');
    setSearchParams(next, { replace: true });
  }

  async function handleOpenAttachment(proposalId, attachment) {
    if (!proposalId || attachment?.index == null) return;
    try {
      const res = await fetchMentorProposalAttachmentBlob(proposalId, attachment.index);
      const blob = res instanceof Blob ? res : new Blob([res]);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.apiError(err, tr('Không mở được tài liệu đính kèm.'));
    }
  }

  const levelOptions = useMemo(() => {
    const levels = [...new Set(mentorCohortEntries.map((e) => String(e.level || '').trim()).filter(Boolean))].sort();
    return [
      { value: 'ALL', label: tr('Tất cả cấp độ') },
      ...levels.map((lvl) => ({ value: lvl, label: lvl })),
    ];
  }, [mentorCohortEntries, tr]);

  const hasFilters = search.trim() !== '' || levelFilter !== 'ALL' || statusFilter !== 'ALL';
  const resetFilters = () => {
    setSearch('');
    setLevelFilter('ALL');
    setStatusFilter('ALL');
  };

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mentorCohortEntries.filter((entry) => {
      if (statusFilter !== 'ALL' && entry.lifecycle.id !== statusFilter) return false;
      if (levelFilter !== 'ALL' && String(entry.level || '').trim().toUpperCase() !== levelFilter.toUpperCase()) return false;
      if (!q) return true;
      const learnerNames = entry.enrolledCourses.map((c) => c.learnerName || '').join(' ').toLowerCase();
      return (
        String(entry.name || '').toLowerCase().includes(q)
        || String(entry.level || '').toLowerCase().includes(q)
        || String(entry.patternText || '').toLowerCase().includes(q)
        || learnerNames.includes(q)
      );
    });
  }, [mentorCohortEntries, search, levelFilter, statusFilter]);

  const submittedHomeworkCount = useMemo(
    () => cohortHomework.filter((h) => String(h.status || '').toLowerCase() === 'submitted').length,
    [cohortHomework],
  );

  // Attendance gating & valid sessions list
  const attendanceAvailable = useMemo(() => {
    if (!selectedCohort) return false;
    if (selectedCohort.lifecycle.id === 'Recruiting' || selectedCohort.lifecycle.id === 'Upcoming' || selectedCohort.lifecycle.id === 'Cancelled') {
      return false;
    }
    if (selectedCohort.enrolledCourses.length === 0) return false;
    return selectedCohort.sessions.some((s) => {
      const startMs = parseUtcDate(s.scheduledAt)?.getTime();
      return Number.isFinite(startMs) && startMs <= nowMs;
    });
  }, [selectedCohort, nowMs]);

  const validAttendanceSessions = useMemo(() => {
    if (!selectedCohort || !attendanceAvailable) return [];
    return selectedCohort.sessions.filter((s) => {
      if (!s.scheduledAt) return false;
      const startMs = parseUtcDate(s.scheduledAt)?.getTime();
      const hasRoster = selectedCohort.enrolledCourses.some((c) => (c.sessions || []).some((cs) => Number(cs.number) === Number(s.number)));
      return hasRoster && Number.isFinite(startMs) && startMs <= nowMs;
    });
  }, [selectedCohort, attendanceAvailable, nowMs]);

  const effectiveSessionNumber = useMemo(() => {
    if (validAttendanceSessions.length === 0) return null;
    if (selectedSessionNumber && validAttendanceSessions.some((s) => Number(s.number) === Number(selectedSessionNumber))) {
      return Number(selectedSessionNumber);
    }
    const pendingPast = validAttendanceSessions.find((s) =>
      selectedCohort?.enrolledCourses.some(
        (c) => c.status === 'Active' && (c.sessions || []).some((cs) => Number(cs.number) === Number(s.number) && cs.status === 'Scheduled'),
      ),
    );
    return pendingPast ? Number(pendingPast.number) : Number(validAttendanceSessions[validAttendanceSessions.length - 1].number);
  }, [validAttendanceSessions, selectedSessionNumber, selectedCohort]);

  const sessionRoster = useMemo(() => {
    if (!selectedCohort || effectiveSessionNumber == null) return [];
    return selectedCohort.enrolledCourses
      .map((course) => {
        const sess = (course.sessions || []).find((s) => Number(s.number) === Number(effectiveSessionNumber)) || null;
        return { course, session: sess };
      })
      .filter((r) => Boolean(r.session));
  }, [selectedCohort, effectiveSessionNumber]);

  const currentCohortSessionMeta = useMemo(() => {
    if (!selectedCohort || effectiveSessionNumber == null) return null;
    return validAttendanceSessions.find((s) => Number(s.number) === Number(effectiveSessionNumber)) || null;
  }, [selectedCohort, validAttendanceSessions, effectiveSessionNumber]);

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

  // Directory DataTable Columns (aligned with AdminCohortConsolePanel, excluding redundant mentor column)
  const directoryColumns = [
    {
      key: 'name',
      header: tr('Lớp học'),
      sortValue: (row) => row.name || '',
      render: (row) => (
        <div className="min-w-[180px] space-y-0.5">
          <button
            type="button"
            onClick={() => openCohort(row.cohortId, 'overview')}
            title={row.name}
            className="rp-focus block max-w-[240px] truncate rounded text-left text-[13.5px] font-semibold text-rp-text transition-colors hover:text-[#C84666]"
          >
            {row.name}
          </button>
          <div className="text-[11.5px] tabular-nums text-rp-text-muted">
            {fmtDateOnly(row.startsAt)} – {fmtDateOnly(row.endsAt)}
            {row.progress.totalSessions > 0 && ` · ${trf('{0} buổi', { 0: row.progress.totalSessions })}`}
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      header: tr('Trình độ'),
      compact: true,
      align: 'center',
      sortValue: (row) => row.level || '',
      render: (row) => (
        row.level
          ? <AdminStatusBadge tone="brand" withDot={false} label={row.level} />
          : <span className="text-xs text-rp-text-muted">—</span>
      ),
    },
    {
      key: 'schedule',
      header: tr('Lịch học hàng tuần'),
      sortValue: (row) => row.patternText || row.compactSchedule || '',
      render: (row) => (
        <span className="block max-w-[230px] text-xs leading-5 text-rp-text-2">
          {row.patternText || row.compactSchedule}
        </span>
      ),
    },
    {
      key: 'capacity',
      header: tr('Sĩ số'),
      compact: true,
      sortValue: (row) => Number(row.confirmedCount || 0),
      render: (row) => {
        const cap = Number(row.capacity || 0);
        return (
          <div className="min-w-[108px] space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="tabular-nums font-semibold text-rp-text">
                {row.confirmedCount}/{cap || '—'}
              </span>
            </div>
            <OccupancyProgressBar
              enrolledCount={row.confirmedCount}
              capacity={cap}
              size="sm"
              label={trf('Đã ghi danh: {0}/{1} học viên', { 0: row.confirmedCount, 1: cap })}
            />
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: tr('Tiến trình'),
      compact: true,
      sortValue: (row) => Number(row.progress.completedSessions || 0),
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-xs font-medium text-rp-text-2">
          {row.progress.completedSessions}/{row.progress.totalSessions || 0} {tr('buổi')}
        </span>
      ),
    },
    {
      key: 'price',
      header: tr('Học phí'),
      compact: true,
      sortValue: (row) => Number(row.price || 0),
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-sm font-semibold text-rp-text">
          {formatTuitionVnd(row.price)}
        </span>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      compact: true,
      sortValue: (row) => (row.status === 'Draft' ? 'Chờ mở lớp' : row.lifecycle?.label || ''),
      render: (row) => {
        if (row.status === 'Draft') {
          return <AdminStatusBadge tone="neutral" label={tr('Chờ mở lớp')} />;
        }
        return <AdminStatusBadge tone={row.lifecycle.tone} label={tr(row.lifecycle.label)} />;
      },
    },
  ];

  const showInClassLearnerColumns = Boolean(
    selectedCohort && (selectedCohort.lifecycle.id === 'Teaching' || selectedCohort.lifecycle.id === 'Completed'),
  );

  const homeworkStatsByLearnerId = useMemo(() => {
    const map = new Map();
    for (const hw of cohortHomework) {
      const lid = Number(hw?.learnerId);
      if (!Number.isFinite(lid) || lid <= 0) continue;
      const cur = map.get(lid) || { assigned: 0, submitted: 0, onTime: 0, passed: 0 };
      cur.assigned += 1;
      const subAt = hw.submission?.submittedAt || null;
      if (subAt || hw.status === 'Submitted' || hw.status === 'Graded') {
        cur.submitted += 1;
        if (!hw.dueAt || !subAt || (parseUtcDate(subAt)?.getTime() ?? 0) <= (parseUtcDate(hw.dueAt)?.getTime() ?? Infinity)) {
          cur.onTime += 1;
        }
      }
      if (hw.publishedGrade?.passed === true) cur.passed += 1;
      map.set(lid, cur);
    }
    return map;
  }, [cohortHomework]);

  const cohortAttendanceSummary = useMemo(() => {
    if (!selectedCohort || selectedCohort.enrolledCourses.length === 0) return null;
    let marked = 0;
    let present = 0;
    for (const c of selectedCohort.enrolledCourses) {
      const att = computeLearnerAttendance(c.sessions || []);
      marked += att.markedCount;
      present += att.presentCount;
    }
    if (marked === 0) return null;
    return {
      present,
      marked,
      percent: Math.round((present / marked) * 100),
    };
  }, [selectedCohort]);

  // Stage-adaptive Learner DataTable Columns (confirmed enrolled learners only)
  const learnerColumns = useMemo(() => {
    const cols = [
      {
        key: 'learner',
        header: tr('Học viên'),
        sortValue: (c) => c.learnerName || '',
        render: (c) => (
          <div className="flex items-center gap-2.5">
            <UserAvatar src={c.learnerAvatarUrl} name={c.learnerName || tr('Học viên')} size={32} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-rp-text">{c.learnerName || tr('Học viên')}</p>
              {c.status === 'Transferred' && (
                <p className="text-xs text-rp-text-muted">{tr('Đã chuyển lớp')}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'enrolledAt',
        header: tr('Ngày ghi danh'),
        compact: true,
        sortValue: (c) => parseUtcDate(c.enrolledAtUtc || c.paymentConfirmedAtUtc)?.getTime() || 0,
        render: (c) => (
          <span className="whitespace-nowrap tabular-nums text-xs text-rp-text-2">
            {fmtDateOnly(c.enrolledAtUtc || c.paymentConfirmedAtUtc || c.startsAt)}
          </span>
        ),
      },
      {
        key: 'status',
        header: tr('Trạng thái'),
        compact: true,
        render: (c) => {
          const st = resolveLearnerDisplayStatus(c, selectedCohort?.lifecycle.id);
          return <AdminStatusBadge tone={st.tone} label={tr(st.label)} />;
        },
      },
    ];

    if (showInClassLearnerColumns) {
      cols.push(
        {
          key: 'attendance',
          header: tr('Chuyên cần'),
          compact: true,
          render: (c) => {
            const att = computeLearnerAttendance(c.sessions || []);
            return (
              <span className={cx('whitespace-nowrap tabular-nums text-xs', att.markedCount > 0 ? 'font-medium text-rp-text-2' : 'text-rp-text-muted')}>
                {att.markedCount > 0
                  ? `${att.percent}% (${att.presentCount}/${att.markedCount})`
                  : tr('Chưa có điểm danh')}
              </span>
            );
          },
        },
        {
          key: 'homework',
          header: tr('Bài tập đúng hạn'),
          compact: true,
          render: (c) => {
            const stats = homeworkStatsByLearnerId.get(Number(c.learnerId));
            const assigned = stats ? stats.assigned : (c.eligibility?.requiredHomework || 0);
            const onTime = stats ? stats.onTime : (c.eligibility?.passedOnTimeHomework || 0);
            if (!assigned) {
              return <span className="whitespace-nowrap text-xs text-rp-text-muted">{tr('Chưa có bài tập')}</span>;
            }
            const pct = Math.round((onTime / assigned) * 100);
            return (
              <span className="whitespace-nowrap tabular-nums text-xs font-medium text-rp-text-2">
                {`${onTime}/${assigned} (${pct}%)`}
              </span>
            );
          },
        },
      );
    }

    cols.push({
      key: 'actions',
      header: tr('Thao tác'),
      sortable: false,
      compact: true,
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            iconRight={ArrowRight}
            onClick={() => navigate(`/mentor-study-courses/${selectedCohort.cohortId}/learners/${c.learnerId}/competency`)}
          >
            {tr('Xem năng lực')}
          </Button>
        </div>
      ),
    });

    return cols;
  }, [tr, selectedCohort, showInClassLearnerColumns, homeworkStatsByLearnerId, navigate]);

  // Attendance DataTable Columns
  const attendanceColumns = [
    {
      key: 'learner',
      header: tr('Học viên'),
      sortValue: ({ course }) => course.learnerName || '',
      render: ({ course }) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar src={course.learnerAvatarUrl} name={course.learnerName || tr('Học viên')} size={30} />
          <div>
            <p className="font-semibold text-rp-text">{course.learnerName || tr('Học viên')}</p>
            <p className="text-xs text-rp-text-muted">{showStatus(course.status)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái buổi'),
      render: ({ session }) => (
        <AdminStatusBadge tone={statusBadgeTone(session.status)} label={showStatus(session.status)} />
      ),
    },
    {
      key: 'note',
      header: tr('Ghi chú'),
      render: ({ session }) => (
        <span className="text-xs text-rp-text-2">{session.note || '—'}</span>
      ),
    },
    {
      key: 'action',
      header: tr('Điểm danh'),
      sortable: false,
      compact: true,
      render: ({ course, session }) => {
        const startMs = parseUtcDate(session.scheduledAt)?.getTime() || 0;
        const endMs = startMs + (course.sessionMinutes || selectedCohort?.sessionMinutes || 90) * 60_000;
        const isLocked = session.status !== 'Scheduled' || course.status !== 'Active' || selectedCohort?.lifecycle.id === 'Cancelled';
        const notStarted = startMs > nowMs;
        const notEnded = endMs > nowMs;

        if (session.status !== 'Scheduled') {
          return <span className="text-xs font-medium text-rp-text-muted">{tr('Đã chốt')}</span>;
        }
        if (isLocked || notStarted) {
          return (
            <Tooltip content={tr('Điểm danh khả dụng sau khi buổi học bắt đầu.')}>
              <span className="inline-flex">
                <Button variant="secondary" size="sm" disabled>{tr('Chưa mở')}</Button>
              </span>
            </Tooltip>
          );
        }
        return (
          <Button
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            disabled={busy}
            onClick={() => setAttendanceModal({
              course,
              session,
              status: notEnded ? 'CancelledByMentor' : 'Present',
              allowCompletion: !notEnded,
              note: session.note || '',
            })}
          >
            {tr('Điểm danh')}
          </Button>
        );
      },
    },
  ];

  // Derived data for Overview Pending Tasks (hide completely if zero actions exist)
  const overviewPendingTasks = useMemo(() => {
    if (!selectedCohort) return [];
    const list = [];
    if (selectedCohort.pendingAttendanceCount > 0) {
      list.push({
        section: 'attendance',
        count: selectedCohort.pendingAttendanceCount,
        label: 'lượt buổi chờ chốt điểm danh',
        cta: 'Điểm danh',
      });
    }
    if (submittedHomeworkCount > 0) {
      list.push({
        section: 'homework',
        count: submittedHomeworkCount,
        label: 'bài tập đã nộp chờ chấm',
        cta: 'Chấm bài',
      });
    }
    if ((selectedCohort.openComplaintsCount || 0) > 0) {
      list.push({
        section: 'support',
        count: selectedCohort.openComplaintsCount,
        label: 'khiếu nại cần phản hồi',
        cta: 'Xử lý',
      });
    }
    if (selectedCohort.approvedRetakeRequests.length > 0 && selectedCohort.approvedRetakeRequests.some((r) => !r.mentorSupportPlan)) {
      list.push({
        section: 'support',
        count: selectedCohort.approvedRetakeRequests.filter((r) => !r.mentorSupportPlan).length,
        label: 'yêu cầu lập lộ trình ôn JLPT',
        cta: 'Lập lộ trình',
      });
    }
    return list;
  }, [selectedCohort, submittedHomeworkCount]);

  const canAssignHomework = Boolean(
    selectedCohort
    && selectedCohort.lifecycle.id === 'Teaching'
    && selectedCohort.enrolledCourses.some((c) => c.paymentStatus === 'Paid' && c.status === 'Active'),
  );
  const isPreStartLifecycle = Boolean(
    selectedCohort && (selectedCohort.lifecycle.id === 'Recruiting' || selectedCohort.lifecycle.id === 'Upcoming'),
  );
  const homeworkBlockedReason = !selectedCohort
    ? ''
    : selectedCohort.lifecycle.id === 'Recruiting'
      ? 'Lớp đang tuyển sinh; chỉ có thể giao bài tập khi lớp bắt đầu và có học viên chính thức.'
      : selectedCohort.lifecycle.id === 'Upcoming'
        ? 'Lớp chưa đến thời điểm bắt đầu buổi học đầu tiên.'
        : selectedCohort.lifecycle.id === 'Completed' || selectedCohort.lifecycle.id === 'Cancelled'
          ? 'Lớp đã kết thúc hoặc đã hủy; không thể phát hành thêm bài tập.'
          : 'Lớp chưa có học viên đang theo học.';

  const hasSupportItems = Boolean(
    selectedCohort && (
      selectedCohort.classComplaintsCount > 0
      || complaintsError
      || selectedCohort.approvedRetakeRequests.length > 0
    ),
  );

  return (
    <MentorShell breadcrumb={selectedCohort ? selectedCohort.name : tr('Quản lý lớp học')}>
      <PageContainer width="default" density="comfortable" className="relative space-y-[var(--rp-space-section)] text-rp-text">
        {refreshing && (
          <div className="pointer-events-none sticky top-2 z-30 h-0 overflow-visible">
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
              title={tr('Chưa tải được danh sách lớp học')}
              onRetry={() => handleRefresh()}
              retrying={refreshing}
            />
          </Card>
        ) : !selectedCohort ? (
          /* ===================== DIRECTORY VIEW: SHARED DATATABLE ===================== */
          <div className="space-y-4">
            {complaintsError && (
              <Banner tone="warning">
                {tr('Chưa tải được dữ liệu khiếu nại; danh sách lớp học vẫn hoạt động bình thường.')}
              </Banner>
            )}

            {mentorCohortEntries.length > 0 ? (
              <UnifiedToolbar
                refresh={{
                  onRefresh: handleRefresh,
                  refreshing,
                  disabled: loading,
                }}
                actions={(
                  <Button as={Link} to="/work-schedule/" variant="outline" size="sm" icon={CalendarDays}>
                    {tr('Lịch làm việc')}
                  </Button>
                )}
              >
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                  placeholder="Tìm lớp, cấp độ, học viên…"
                  aria-label={tr('Tìm lớp học')}
                  className="w-full sm:w-[240px]"
                />

                <CustomSelect
                  fitContent
                  value={levelFilter}
                  aria-label={tr('Lọc theo cấp độ JLPT')}
                  onChange={setLevelFilter}
                  options={levelOptions}
                />

                <CustomSelect
                  fitContent
                  value={statusFilter}
                  aria-label={tr('Lọc theo trạng thái lớp')}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'ALL', label: tr('Tất cả trạng thái') },
                    ...CLASS_LIFECYCLE_STATUSES.map((st) => ({
                      value: st.id,
                      label: tr(st.label),
                      dotClass:
                        st.tone === 'success'
                          ? 'bg-[#16A34A]'
                          : st.tone === 'info'
                            ? 'bg-[#2563EB]'
                            : st.tone === 'warning'
                              ? 'bg-[#D97706]'
                              : st.tone === 'danger'
                                ? 'bg-[#DC2626]'
                                : 'bg-[#94A3B8]',
                    })),
                  ]}
                />

                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    icon={X}
                    onClick={resetFilters}
                  >
                    {tr('Xóa bộ lọc')}
                  </Button>
                )}
              </UnifiedToolbar>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button as={Link} to="/work-schedule/" variant="outline" size="sm" icon={CalendarDays}>
                  {tr('Lịch làm việc')}
                </Button>
              </div>
            )}

            {filteredList.length === 0 ? (
              <Card>
                <ContextualEmptyState
                  variant={mentorCohortEntries.length > 0 && hasFilters ? 'search' : 'default'}
                  illustration={mentorCohortEntries.length > 0 && hasFilters ? 'search' : 'classroom'}
                  title={
                    mentorCohortEntries.length > 0 && hasFilters
                      ? tr('Không tìm thấy lớp học phù hợp')
                      : tr('Chưa có lớp học được phân công')
                  }
                  description={
                    mentorCohortEntries.length > 0 && hasFilters
                      ? tr('Thử thay đổi bộ lọc cấp độ, trạng thái hoặc từ khóa tìm kiếm.')
                      : tr('Lớp học mới sẽ được tạo tự động khi Quản trị viên phê duyệt đề xuất lịch dạy của bạn.')
                  }
                  action={
                    mentorCohortEntries.length > 0 && hasFilters ? (
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        {tr('Xóa bộ lọc')}
                      </Button>
                    ) : (
                      <Button as={Link} to="/mentor-shift-schedule/" variant="primary">
                        {tr('Đăng ký lịch dạy')}
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <AdminDataTable
                columns={directoryColumns}
                rows={filteredList}
                rowKey={(row) => row.cohortId}
                itemLabel="lớp học"
                rowActions={(row) => (
                  <AdminRowActions>
                    <AdminIconAction
                      kind="view"
                      tone="brand"
                      tooltip="Xem chi tiết lớp"
                      onClick={() => openCohort(row.cohortId, 'overview')}
                    />
                  </AdminRowActions>
                )}
              />
            )}
          </div>
        ) : (
          /* ===================== CLASS DETAIL WORKSPACE (7 SECTIONS) ===================== */
          <>
            <div className="sticky top-0 z-20 rounded-2xl border border-rp-line bg-white/95 p-4 shadow-rp-xs backdrop-blur-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <BackButton fallbackTo="/mentor-study-courses/" label="Danh sách lớp" restoreListKey="/mentor-study-courses" />
                  <h1 className="truncate text-lg font-semibold text-rp-text sm:text-xl">{selectedCohort.name}</h1>
                  {selectedCohort.level && <AdminStatusBadge tone="brand" withDot={false} label={selectedCohort.level} />}
                  <AdminStatusBadge tone={selectedCohort.lifecycle.tone} label={tr(selectedCohort.lifecycle.label)} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mentorCohortEntries.length > 1 && (
                    <div className="w-56">
                      <CustomSelect
                        size="sm"
                        aria-label={tr('Chuyển nhanh giữa các lớp')}
                        value={String(selectedCohort.cohortId)}
                        onChange={(val) => openCohort(Number(val), activeSection)}
                        options={mentorCohortEntries.map((entry) => ({
                          value: String(entry.cohortId),
                          label: entry.name,
                        }))}
                      />
                    </div>
                  )}
                  {selectedCohort.liveSession?.roomId && (
                    <Button as={Link} to={`/meeting-room/${selectedCohort.liveSession.roomId}`} variant="primary" size="sm" icon={Video}>
                      {tr('Vào phòng học chung')}
                    </Button>
                  )}
                  <RefreshButton onRefresh={handleRefresh} refreshing={refreshing} />
                </div>
              </div>

              <div className="border-t border-rp-line pt-2.5">
                <Tabs
                  variant="pill"
                  size="sm"
                  className="sm:flex-wrap"
                  value={activeSection}
                  onChange={switchSection}
                  label={tr('Điều hướng không gian lớp')}
                  tabs={TABS.map((tab) => ({
                    value: tab.id,
                    label: tab.label,
                    icon: tab.icon,
                    count: tab.id === 'learners'
                      ? (selectedCohort.confirmedCount || undefined)
                      : tab.id === 'homework'
                        ? (submittedHomeworkCount || undefined)
                        : tab.id === 'attendance'
                          ? (selectedCohort.pendingAttendanceCount || undefined)
                          : tab.id === 'support'
                            ? ((selectedCohort.openComplaintsCount || 0) + selectedCohort.approvedRetakeRequests.length) || undefined
                            : undefined,
                  }))}
                />
              </div>
            </div>

            {/* ---------- 1. OVERVIEW ---------- */}
            {activeSection === 'overview' && (
              <div className="space-y-4">
                {/* Top Row: 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
                      <Users className="h-3.5 w-3.5 text-rp-brand" aria-hidden="true" />
                      <span>{tr('Sĩ số lớp học')}</span>
                    </div>
                    <div className="mt-1.5 text-lg font-bold tabular-nums text-rp-text">
                      {selectedCohort.capacity != null
                        ? trf('{0}/{1} học viên', { 0: selectedCohort.confirmedCount, 1: selectedCohort.capacity })
                        : trf('{0} học viên', { 0: selectedCohort.confirmedCount })}
                    </div>
                    {selectedCohort.capacity > 0 && (
                      <OccupancyProgressBar
                        enrolledCount={selectedCohort.confirmedCount}
                        capacity={selectedCohort.capacity}
                        size="sm"
                        className="mt-2"
                        label={trf('Sĩ số lớp học {0}/{1} học viên', {
                          0: selectedCohort.confirmedCount,
                          1: selectedCohort.capacity,
                        })}
                      />
                    )}
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
                      <CheckCircle2 className="h-3.5 w-3.5 text-rp-success" aria-hidden="true" />
                      <span>{tr('Tiến trình khóa học')}</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-lg font-bold tabular-nums text-rp-text">
                        {trf('{0}/{1} buổi', {
                          0: selectedCohort.progress.completedSessions,
                          1: selectedCohort.progress.totalSessions || 0,
                        })}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-rp-text-muted">
                        {selectedCohort.progress.percent}%
                      </span>
                    </div>
                    <ProgressBar
                      value={selectedCohort.progress.completedSessions}
                      max={selectedCohort.progress.totalSessions || 1}
                      tone="success"
                      size="sm"
                      className="mt-2"
                      label={trf('Tiến trình khóa học {0}/{1} buổi', {
                        0: selectedCohort.progress.completedSessions,
                        1: selectedCohort.progress.totalSessions || 0,
                      })}
                    />
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
                      <CalendarClock className="h-3.5 w-3.5 text-rp-brand" aria-hidden="true" />
                      <span>{tr('Thời lượng khóa học')}</span>
                    </div>
                    <div className="mt-1.5 text-lg font-bold tabular-nums text-rp-text">
                      {trf('{0} tuần', { 0: selectedCohort.courseDurationWeeks || 10 })}
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-rp-text-muted">
                      {trf('{0} buổi', { 0: selectedCohort.totalSessions || selectedCohort.sessions.length || 0 })}
                      {selectedCohort.sessionsPerWeek
                        ? ` · ${trf('{0} buổi/tuần', { 0: selectedCohort.sessionsPerWeek })}`
                        : ''}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
                      <Clock className="h-3.5 w-3.5 text-rp-brand" aria-hidden="true" />
                      <span>{tr('Tổng giờ giảng dạy')}</span>
                    </div>
                    <div className="mt-1.5 text-lg font-bold tabular-nums text-rp-text">
                      {trf('{0} giờ', { 0: selectedCohort.totalTeachingHours || 0 })}
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-rp-text-muted">
                      {trf('{0} phút/buổi', { 0: selectedCohort.sessionMinutes || 90 })}
                    </p>
                  </Card>
                </div>

                {/* Middle Row: 2-Column Balanced Course Info + Weekly Teaching Schedule */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="space-y-3.5">
                    <CardHeader
                      title={tr('Thông tin khóa học')}
                      icon={<BookOpen className="h-4 w-4 text-rp-brand" aria-hidden="true" />}
                    />
                    <div className="space-y-2.5 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 p-3.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                          {tr('Hạn tuyển sinh')}
                        </span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {selectedCohort.cohortObj?.enrollmentClosesAtUtc
                            ? fmtDateTime(selectedCohort.cohortObj.enrollmentClosesAtUtc)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                          {tr('Ngày bắt đầu')}
                        </span>
                        <span className="font-semibold tabular-nums text-rp-text">{fmtDateOnly(selectedCohort.startsAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                          {tr('Ngày kết thúc')}
                        </span>
                        <span className="font-semibold tabular-nums text-rp-text">{fmtDateOnly(selectedCohort.endsAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-rp-line/60 pt-2.5">
                        <span className="text-rp-text-muted">{tr('Sĩ số tối thiểu để mở lớp')}</span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {trf('{0} học viên', { 0: selectedCohort.cohortObj?.minLearnersToStart ?? 1 })}
                        </span>
                      </div>
                      {selectedCohort.lifecycle.id === 'Recruiting' && selectedCohort.seatsAvailable != null && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-rp-text-muted">{tr('Số chỗ còn khả dụng')}</span>
                          <span className="font-semibold tabular-nums text-rp-info">
                            {trf('{0} chỗ', { 0: selectedCohort.seatsAvailable })}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="flex flex-col justify-between gap-4">
                    <div className="space-y-3.5">
                      <CardHeader
                        title={tr('Lịch giảng dạy hằng tuần')}
                        icon={<CalendarClock className="h-4 w-4 text-rp-brand" aria-hidden="true" />}
                      />
                      {selectedCohort.weeklyLines.length > 0 ? (
                        <div className="space-y-2">
                          {selectedCohort.weeklyLines.map((line) => (
                            <div
                              key={line.key}
                              className="flex items-center justify-between gap-3 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5 text-xs"
                            >
                              <span className="font-semibold text-rp-text">{line.weekdayLabel}</span>
                              <span className="font-bold tabular-nums text-rp-text">{line.timeRange}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-3 text-xs text-rp-text-2">
                          {selectedCohort.patternText || selectedCohort.compactSchedule}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end border-t border-rp-line/70 pt-3">
                      <Button variant="secondary" size="sm" icon={CalendarDays} onClick={() => switchSection('schedule')}>
                        {tr('Xem toàn bộ lịch học')}
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Course Objective & Teaching Materials (only when present) */}
                {(selectedCohort.courseObjective || selectedCohort.attachments.length > 0) && (
                  <Card className="space-y-3">
                    {selectedCohort.courseObjective && (
                      <div>
                        <p className="text-xs font-semibold text-rp-text-muted">{tr('Mục tiêu khóa học')}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-rp-text">{selectedCohort.courseObjective}</p>
                      </div>
                    )}
                    {selectedCohort.attachments.length > 0 && (
                      <div className={cx(selectedCohort.courseObjective && 'border-t border-rp-line/70 pt-3', 'space-y-2')}>
                        <p className="text-xs font-semibold text-rp-text-muted">{tr('Tài liệu giảng dạy')}</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCohort.attachments.map((att, idx) => (
                            <Button
                              key={`${att.name}-${idx}`}
                              variant="outline"
                              size="sm"
                              icon={Paperclip}
                              onClick={() => handleOpenAttachment(selectedCohort.sourceProposalId, att)}
                            >
                              {att.name || trf('Tài liệu {0}', { 0: idx + 1 })}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Active Teaching Insights & Pending Operations (strictly only after class starts and when real data exists) */}
                {selectedCohort.lifecycle.id === 'Teaching' && (selectedCohort.nextSession || cohortAttendanceSummary || overviewPendingTasks.length > 0) && (
                  <div className={cx('grid gap-4', overviewPendingTasks.length > 0 && 'lg:grid-cols-2')}>
                    {(selectedCohort.nextSession || cohortAttendanceSummary) && (
                      <Card className="space-y-3">
                        <CardHeader title={tr('Hoạt động giảng dạy')} />
                        <div className="space-y-2.5 text-xs">
                          {selectedCohort.nextSession && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5">
                              <div>
                                <p className="text-rp-text-muted">{tr('Buổi học tiếp theo')}</p>
                                <p className="mt-0.5 font-semibold tabular-nums text-rp-text">
                                  {trf('Buổi {0}', { 0: selectedCohort.nextSession.number })} · {fmtDateOnly(selectedCohort.nextSession.scheduledAt)} · {formatVnSlotWindow(selectedCohort.nextSession.scheduledAt, selectedCohort.nextSession.endTime)}
                                </p>
                              </div>
                              {selectedCohort.nextSession.canJoin && selectedCohort.nextSession.roomId && (
                                <Button as={Link} to={`/meeting-room/${selectedCohort.nextSession.roomId}`} variant="primary" size="sm" icon={Video}>
                                  {tr('Vào phòng học chung')}
                                </Button>
                              )}
                            </div>
                          )}
                          {cohortAttendanceSummary && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5">
                              <span className="text-rp-text-muted">{tr('Chuyên cần trung bình của lớp')}</span>
                              <span className="font-semibold tabular-nums text-rp-text">
                                {cohortAttendanceSummary.percent}% ({cohortAttendanceSummary.present}/{cohortAttendanceSummary.marked})
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {overviewPendingTasks.length > 0 && (
                      <Card className="space-y-3">
                        <CardHeader title={tr('Việc cần xử lý')} description={tr('Chuyển nhanh tới đúng công việc phát sinh')} />
                        <div className="space-y-2">
                          {overviewPendingTasks.map((item) => (
                            <button
                              key={`${item.section}-${item.label}`}
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
                    )}
                  </div>
                )}

                {selectedCohort.lifecycle.id === 'Completed' && (
                  <Banner tone="success" title={tr('Lớp học đã hoàn thành')}>
                    {trf('Đã hoàn tất {0}/{1} buổi học. Toàn bộ lịch sử điểm danh, bài tập và hồ sơ năng lực được lưu giữ để tra cứu.', {
                      0: selectedCohort.progress.completedSessions,
                      1: selectedCohort.progress.totalSessions,
                    })}
                  </Banner>
                )}

                {selectedCohort.lifecycle.id === 'Cancelled' && (
                  <Banner tone="danger" title={tr('Lớp học đã hủy')}>
                    {tr('Lớp học này đã được hủy; các thao tác giảng dạy, giao bài tập và điểm danh đã được khóa.')}
                  </Banner>
                )}
              </div>
            )}

            {/* ---------- 2. LEARNERS ---------- */}
            {activeSection === 'learners' && (
              selectedCohort.enrolledCourses.length === 0 ? (
                <Card>
                  <ContextualEmptyState
                    variant="compact"
                    illustration="mentor"
                    title={tr('Lớp chưa có học viên ghi danh.')}
                  />
                </Card>
              ) : (
                <AdminDataTable
                  columns={learnerColumns}
                  rows={selectedCohort.enrolledCourses}
                  rowKey={(c) => c.id}
                  itemLabel="học viên"
                />
              )
            )}

            {/* ---------- 3. SCHEDULE (UNIFIED CALENDAR + RESCHEDULE DRAWER) ---------- */}
            {activeSection === 'schedule' && (
              <div className="space-y-4">
                {calendarRepresentativeCourse && (
                  <CohortSessionsCalendar
                    key={selectedCohort.cohortId}
                    course={calendarRepresentativeCourse}
                    cohort={selectedCohort.cohortObj}
                    sessions={selectedCohort.sessions}
                    lifecycleId={selectedCohort.lifecycle.id}
                    canOpenMeetingRoom={selectedCohort.lifecycle.id !== 'Recruiting' && selectedCohort.lifecycle.id !== 'Completed' && selectedCohort.lifecycle.id !== 'Cancelled' && selectedCohort.enrolledCourses.length > 0}
                    audience="mentor"
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    headerTopRight={
                      selectedCohort.cohortObj && selectedCohort.lifecycle.id !== 'Completed' && selectedCohort.lifecycle.id !== 'Cancelled' ? (
                        <Button variant="secondary" size="sm" onClick={() => setScheduleDrawerOpen(true)}>
                          {tr('Yêu cầu đổi/hủy lịch')}
                        </Button>
                      ) : null
                    }
                  />
                )}

                <Drawer
                  open={scheduleDrawerOpen && Boolean(selectedCohort.cohortObj)}
                  onClose={() => setScheduleDrawerOpen(false)}
                  title={tr('Yêu cầu dời lịch / hủy lớp trống')}
                  width="w-[min(560px,100vw)]"
                >
                  {selectedCohort.cohortObj && (
                    <CohortScheduleRequestPanel
                      key={selectedCohort.cohortId}
                      cohorts={[selectedCohort.cohortObj]}
                      initialCohortId={selectedCohort.cohortId}
                      busy={busy}
                      onRun={runAction}
                    />
                  )}
                </Drawer>
              </div>
            )}

            {/* ---------- 4. HOMEWORK ---------- */}
            {activeSection === 'homework' && (
              isPreStartLifecycle ? (
                <Card>
                  <ContextualEmptyState
                    variant="compact"
                    illustration="homework"
                    title={tr('Bài tập sẽ khả dụng khi lớp học bắt đầu.')}
                  />
                </Card>
              ) : homeworkLoading && cohortHomework.length === 0 ? (
                <Card>
                  <SakuraLoader variant="section" context="homework" className="min-h-[140px]" delay={160} />
                </Card>
              ) : homeworkError ? (
                <Card>
                  <ContextualErrorState
                    compact
                    error={homeworkError}
                    title={tr('Chưa tải được bài tập của lớp')}
                    onRetry={() => setHomeworkTick((t) => t + 1)}
                    retrying={homeworkLoading}
                  />
                </Card>
              ) : (
                <CohortHomeworkPanel
                  key={selectedCohort.cohortId}
                  cohortId={selectedCohort.cohortId}
                  cohortName={selectedCohort.name}
                  coursesInCohort={selectedCohort.enrolledCourses}
                  items={cohortHomework}
                  role="Mentor"
                  canAssign={canAssignHomework}
                  hideDisabledAssign={selectedCohort.lifecycle.id === 'Completed'}
                  assignBlockedReason={homeworkBlockedReason}
                  busy={busy}
                  onRun={runAction}
                />
              )
            )}

            {/* ---------- 5. ATTENDANCE ---------- */}
            {activeSection === 'attendance' && (
              !attendanceAvailable || validAttendanceSessions.length === 0 ? (
                <Card>
                  <ContextualEmptyState
                    variant="compact"
                    illustration="calendar"
                    title={tr('Điểm danh sẽ khả dụng khi buổi học bắt đầu.')}
                  />
                </Card>
              ) : (
                <div className="space-y-4">
                  <UnifiedToolbar>
                    <div className="w-full sm:w-80">
                      <CustomSelect
                        aria-label={tr('Chọn buổi học')}
                        value={String(effectiveSessionNumber ?? '')}
                        onChange={(val) => setSessionSelection({ cohortId: activeCohortId, number: Number(val) })}
                        options={validAttendanceSessions.map((s) => {
                          const pendingAny = selectedCohort.enrolledCourses.some(
                            (c) => c.status === 'Active' && (c.sessions || []).some((cs) => Number(cs.number) === Number(s.number) && cs.status === 'Scheduled'),
                          );
                          return {
                            value: String(s.number),
                            label: `${trf('Buổi {0}', { 0: s.number })} · ${fmtDateOnly(s.scheduledAt)} · ${formatVnSlotWindow(s.scheduledAt, s.endTime)}${pendingAny ? ` · ${tr('Chờ chốt')}` : ''}`,
                          };
                        })}
                      />
                    </div>
                    {currentCohortSessionMeta && (
                      <div className="flex items-center gap-2 text-xs text-rp-text-2">
                        <Clock className="h-3.5 w-3.5 text-rp-brand-strong" aria-hidden="true" />
                        <span className="font-semibold text-rp-text">{trf('Buổi {0}', { 0: currentCohortSessionMeta.number })}</span>
                        <span className="tabular-nums">· {fmtDateOnly(currentCohortSessionMeta.scheduledAt)}</span>
                      </div>
                    )}
                  </UnifiedToolbar>

                  {sessionRoster.length === 0 ? (
                    <Card>
                      <ContextualEmptyState variant="compact" illustration="mentor" title={tr('Lớp chưa có học viên ghi danh.')} />
                    </Card>
                  ) : (
                    <AdminDataTable
                      columns={attendanceColumns}
                      rows={sessionRoster}
                      rowKey={({ course, session }) => `${course.id}-${session.id}`}
                      itemLabel="học viên"
                    />
                  )}
                </div>
              )
            )}

            {/* ---------- 6. SUPPORT (COMPLAINTS & JLPT RETAKE SUPPORT) ---------- */}
            {activeSection === 'support' && (
              !hasSupportItems ? (
                <Card>
                  <ContextualEmptyState
                    variant="compact"
                    illustration="certificate"
                    title={tr('Chưa có yêu cầu hỗ trợ nào.')}
                  />
                </Card>
              ) : (
                <div className="space-y-4">
                  {(selectedCohort.classComplaintsCount > 0 || complaintsError) && (
                    <CohortComplaintPanel
                      key={selectedCohort.cohortId}
                      role="Mentor"
                      cohortId={selectedCohort.cohortId}
                      busy={busy}
                      onRun={runAction}
                    />
                  )}

                  {selectedCohort.approvedRetakeRequests.length > 0 && (
                    <Card className="space-y-4">
                      <CardHeader
                        title="Hỗ trợ ôn lại JLPT"
                        description="Lập kế hoạch ôn tập cho các học viên đã được Quản trị viên duyệt minh chứng kết quả JLPT."
                      />
                      <div className="space-y-3">
                        {selectedCohort.approvedRetakeRequests.map((r) => (
                          <div key={r.id} className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-sm text-rp-text">{r.learnerName || tr('Học viên')}</strong>
                              <span className="text-xs tabular-nums text-rp-text-muted">
                                {trf('Thi: {0} · Công bố: {1}', { 0: fmtDateOnly(r.examDate), 1: fmtDateOnly(r.resultPublishedAt) })}
                              </span>
                            </div>
                            {r.reason && (
                              <p className="text-xs leading-relaxed text-rp-text-2">
                                <strong>{tr('Lý do học viên')}:</strong> {r.reason}
                              </p>
                            )}
                            {r.response && (
                              <p className="text-xs leading-relaxed text-rp-text-2">
                                <strong>{tr('Quyết định của Quản trị viên')}:</strong> {r.response}
                              </p>
                            )}
                            {r.mentorSupportPlan && (
                              <p className="rounded-lg border border-rp-line bg-rp-surface px-3 py-2 text-xs text-rp-text">
                                <strong>{tr('Lộ trình đã lưu')}:</strong> {r.mentorSupportPlan}
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
                    </Card>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* Attendance Modal */}
        <Modal
          open={Boolean(attendanceModal)}
          onClose={() => !busy && setAttendanceModal(null)}
          title={attendanceModal ? trf('Điểm danh: {0}', { 0: attendanceModal.course.learnerName || tr('Học viên') }) : ''}
          description={attendanceModal ? `${trf('Buổi {0}', { 0: attendanceModal.session.number })} · ${fmtDateTime(attendanceModal.session.scheduledAt)}` : ''}
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
                  options={ATTENDANCE_OPTIONS
                    .filter((opt) => attendanceModal.allowCompletion || opt === 'CancelledByMentor')
                    .map((x) => ({ value: x, label: showStatus(x) }))}
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
      </PageContainer>
    </MentorShell>
  );
}
