import { useMemo, useState } from 'react';
import { CalendarDays, List } from 'lucide-react';
import { SegmentedControl } from '@/components/ui';
import SakuraCalendar from './SakuraCalendar.jsx';
import { formatCleanCohortTitle, toVnDateKey, toVnTimeParts } from '@/features/scheduling/utils/calendarGeometry.js';
import { parseUtcDate, sessionStatusLabel } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

function resolveRoomId(session, cohort) {
  if (session?.meetingUrl && /\/meeting-room\/([0-9a-f-]+)/i.test(session.meetingUrl)) {
    return session.meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i)[1];
  }
  const match = cohort?.sessions?.find((s) => Number(s.number) === Number(session?.number)) || cohort?.sessions?.[0];
  return match?.roomId || null;
}

function toneForSession(status) {
  if (status === 'Present') return 'present';
  if (status === 'CancelledByMentor' || status === 'CancelledByLearner' || status === 'TransferredOut') return 'cancelled';
  if (status === 'Absent' || status === 'ExcusedAbsent') return 'pending';
  return 'session';
}

/**
 * Wraps cohort session schedules in a Google Calendar-grade Day/Week/Month/Agenda switcher
 * alongside a toggle to view/mark the linear session list.
 */
export default function CohortSessionsCalendar({
  course,
  cohort,
  children,
}) {
  const { tr, trf } = useLocale();
  const [mode, setMode] = useState('calendar');
  const [renderedAt] = useState(() => Date.now());

  const { events, firstKey } = useMemo(() => {
    const minutes = Number(course?.sessionMinutes) || 90;
    const mapped = (course?.sessions || [])
      .filter((s) => s.scheduledAt)
      .map((s) => {
        const startDate = parseUtcDate(s.scheduledAt);
        const endDate = startDate ? new Date(startDate.getTime() + minutes * 60000) : null;
        const dk = toVnDateKey(s.scheduledAt);
        const start = toVnTimeParts(s.scheduledAt);
        const end = endDate ? toVnTimeParts(endDate) : { hour: start.hour + 1, minute: start.minute + 30 };
        const roomId = resolveRoomId(s, cohort);
        const isLive = Boolean(s.status === 'Scheduled' && startDate && endDate && renderedAt >= startDate.getTime() - 15 * 60000 && renderedAt <= endDate.getTime() + 30 * 60000);
        const computedStatusLabel = isLive
          ? 'Đang mở phòng'
          : (s.status === 'Scheduled' && endDate && renderedAt > endDate.getTime() ? 'Chờ điểm danh' : sessionStatusLabel(s));
        return {
          id: `course-${course.id}-s-${s.id || s.number}`,
          session: s,
          dayKey: dk,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          title: formatCleanCohortTitle(course.cohortName || course.name, s.number),
          fullTitle: trf('{0} · Buổi {1}', { 0: course.cohortName || course.name, 1: s.number }),
          detail: s.note || computedStatusLabel,
          statusLabel: computedStatusLabel,
          tone: toneForSession(s.status),
          href: roomId ? `/meeting-room/${roomId}` : undefined,
          hrefLabel: roomId ? 'Vào phòng học chung' : undefined,
          metaRows: [
            { label: 'Lớp / Khóa', value: course.cohortName || course.name },
            { label: 'Học viên', value: course.learnerName || '—' },
            { label: tr('Giáo viên'), value: course.mentorName || 'Chưa phân công' },
            s.note && { label: 'Ghi chú', value: s.note },
          ].filter(Boolean),
        };
      });

    const todayKey = toVnDateKey(new Date());
    const upcoming = mapped.find((e) => e.dayKey >= todayKey);
    return {
      events: mapped,
      firstKey: upcoming?.dayKey || mapped[0]?.dayKey || todayKey,
    };
  }, [course, cohort, renderedAt, tr, trf]);

  const [anchorKey, setAnchorKey] = useState(firstKey);

  return (
    <section className="course-box">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0">{tr('Lịch buổi học & Phòng học chung')}</h2>
          <p className="course-meta m-0 mt-0.5">
            {trf('{0} buổi toàn khóa · Giờ Việt Nam (GMT+7)', { 0: events.length })}
          </p>
        </div>
        <SegmentedControl
          label={tr('Kiểu hiển thị buổi học')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'calendar', label: 'Lịch biểu', icon: CalendarDays },
            { value: 'list', label: 'Danh sách buổi học', icon: List },
          ]}
        />
      </div>

      {mode === 'calendar' ? (
        <SakuraCalendar
          events={events}
          audience="learner"
          anchorKey={anchorKey}
          onAnchorChange={setAnchorKey}
          defaultView="month"
          emptyTitle={tr('Không có buổi học nào trong khoảng này.')}
          emptyDescription={tr('Chuyển sang Danh sách buổi học hoặc chọn tuần/tháng khác để xem toàn bộ khóa học.')}
        />
      ) : (
        children
      )}
    </section>
  );
}
