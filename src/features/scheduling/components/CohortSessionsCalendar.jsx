import { useMemo, useState } from 'react';
import SakuraCalendar from './SakuraCalendar.jsx';
import { formatCleanCohortTitle, toVnDateKey, toVnTimeParts } from '@/features/scheduling/utils/calendarGeometry.js';
import { parseUtcDate, sessionStatusLabel } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

function resolveRoomId(session, cohort) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohort?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohort?.sessions?.[0];
  return match?.roomId || session?.roomId || null;
}

function classifyCohortSession(s, {
  cohortStatus,
  lifecycleId,
  canOpenMeetingRoom,
  startDate,
  endDate,
  nowMs,
}) {
  const status = String(s?.status || 'Scheduled');
  if (
    status === 'Cancelled'
    || status === 'CancelledByMentor'
    || status === 'CancelledByLearner'
    || status === 'TransferredOut'
    || cohortStatus === 'Cancelled'
  ) {
    return {
      tone: 'cancelled',
      label: sessionStatusLabel({ ...s, status: status === 'Scheduled' ? 'Cancelled' : status }),
      allowRoom: false,
    };
  }

  if (
    s?.sessionCompleted === true
    || status === 'Completed'
    || status === 'Present'
    || status === 'Absent'
    || status === 'ExcusedAbsent'
  ) {
    return {
      tone: 'present',
      label: status === 'Scheduled' || status === 'Completed' ? 'Đã hoàn thành' : sessionStatusLabel(s),
      allowRoom: false,
    };
  }

  if (lifecycleId === 'Recruiting') {
    return {
      tone: 'approved',
      label: 'Lịch đã duyệt',
      allowRoom: false,
    };
  }

  const startMs = startDate ? startDate.getTime() : NaN;
  const endMs = endDate ? endDate.getTime() : NaN;
  const isLive = Boolean(
    canOpenMeetingRoom
    && Number.isFinite(startMs)
    && Number.isFinite(endMs)
    && nowMs >= startMs - 15 * 60_000
    && nowMs <= endMs + 30 * 60_000,
  );

  if (isLive) {
    return {
      tone: 'live',
      label: 'Đang diễn ra',
      allowRoom: true,
    };
  }

  if (Number.isFinite(endMs) && nowMs > endMs && lifecycleId !== 'Recruiting') {
    return {
      tone: 'pending',
      label: 'Chờ điểm danh',
      allowRoom: false,
    };
  }

  return {
    tone: 'session',
    label: lifecycleId === 'Upcoming' || lifecycleId === 'Teaching' ? 'Buổi học đã kích hoạt' : sessionStatusLabel(s),
    allowRoom: Boolean(canOpenMeetingRoom && Number.isFinite(startMs) && nowMs >= startMs - 15 * 60_000),
  };
}

/**
 * Shared class calendar using SakuraCalendar's single unified toolbar
 * (Hôm nay, prev/next, Ngày/Tuần/Tháng, Lịch/Danh sách, and optional header actions).
 */
export default function CohortSessionsCalendar({
  course = null,
  cohort = null,
  sessions = null,
  lifecycleId = null,
  canOpenMeetingRoom = null,
  headerTopRight = null,
  audience = null,
  onRefresh = null,
  refreshing = false,
  defaultView = 'month',
}) {
  const { tr, trf } = useLocale();
  const [renderedAt] = useState(() => Date.now());
  const resolvedAudience = audience ?? (course && !sessions ? 'learner' : 'mentor');
  const resolvedCanOpenRoom = canOpenMeetingRoom ?? Boolean(
    course && !sessions && course.status !== 'Cancelled' && (!course.paymentStatus || course.paymentStatus === 'Paid'),
  );

  const { events, firstKey } = useMemo(() => {
    const minutes = Number(cohort?.sessionMinutes ?? course?.sessionMinutes) || 90;
    const rawList = Array.isArray(sessions) && sessions.length > 0
      ? sessions
      : Array.isArray(course?.sessions) && course.sessions.length > 0
        ? course.sessions
        : (cohort?.sessions || []);

    const cohortStatus = cohort?.status || course?.status || '';
    const cohortTitle = cohort?.name || course?.cohortName || course?.name || tr('Lớp học JLPT');
    const mentorDisplay = cohort?.mentorName || course?.mentorName || '';

    const mapped = rawList
      .map((s) => {
        const startIso = s.scheduledAt || s.startTime;
        if (!startIso) return null;
        const startDate = parseUtcDate(startIso);
        const explicitEnd = s.endTime ? parseUtcDate(s.endTime) : null;
        const endDate = explicitEnd || (startDate ? new Date(startDate.getTime() + minutes * 60_000) : null);
        const dk = toVnDateKey(startIso);
        const start = toVnTimeParts(startIso);
        const end = endDate
          ? toVnTimeParts(endDate)
          : { hour: start.hour + Math.floor((start.minute + minutes) / 60), minute: (start.minute + minutes) % 60 };
        const roomId = resolveRoomId(s, cohort);
        const meta = classifyCohortSession(s, {
          cohortStatus,
          lifecycleId,
          canOpenMeetingRoom: resolvedCanOpenRoom,
          startDate,
          endDate,
          nowMs: renderedAt,
        });

        return {
          id: `cohort-${cohort?.id || course?.id || 'cls'}-s-${s.id || s.number}`,
          session: s,
          dayKey: dk,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          title: formatCleanCohortTitle(cohortTitle, s.number),
          fullTitle: trf('{0} · Buổi {1}', { 0: cohortTitle, 1: s.number }),
          detail: s.note || tr(meta.label),
          statusLabel: meta.label,
          tone: meta.tone,
          href: meta.allowRoom && roomId ? `/meeting-room/${roomId}` : undefined,
          hrefLabel: meta.allowRoom && roomId ? 'Vào phòng học chung' : undefined,
          metaRows: [
            { label: tr('Lớp học'), value: cohortTitle },
            course?.learnerName && { label: tr('Học viên'), value: course.learnerName },
            mentorDisplay && { label: tr('Giáo viên'), value: mentorDisplay },
            s.note && { label: tr('Ghi chú'), value: s.note },
          ].filter(Boolean),
        };
      })
      .filter(Boolean);

    const todayKey = toVnDateKey(new Date());
    const upcoming = mapped.find((e) => e.dayKey >= todayKey);
    return {
      events: mapped,
      firstKey: upcoming?.dayKey || mapped[0]?.dayKey || todayKey,
    };
  }, [sessions, course, cohort, lifecycleId, resolvedCanOpenRoom, renderedAt, tr, trf]);

  const scopeKey = `${cohort?.id ?? course?.id ?? 'cls'}:${firstKey}`;
  const [anchorOverride, setAnchorOverride] = useState({ scopeKey: null, key: null });
  const anchorKey = anchorOverride.scopeKey === scopeKey && anchorOverride.key ? anchorOverride.key : firstKey;

  return (
    <SakuraCalendar
      events={events}
      audience={resolvedAudience}
      anchorKey={anchorKey}
      onAnchorChange={(nextKey) => setAnchorOverride({ scopeKey, key: nextKey })}
      defaultView={defaultView}
      headerTopRight={headerTopRight}
      onRefresh={onRefresh}
      refreshing={refreshing}
      agendaShowAllDates
      emptyTitle={tr('Chưa có buổi học nào trong khoảng thời gian này.')}
      emptyDescription={tr('Chuyển sang Danh sách hoặc chọn tuần/tháng khác để xem đủ lịch trình toàn khóa.')}
    />
  );
}
