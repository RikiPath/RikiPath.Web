import { useMemo, useState } from 'react';
import { useNow } from '@/hooks/useNow.js';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import {
  buildWeekDays,
  formatCleanCohortTitle,
  mondayOfDateKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { getSession } from '@/app/auth/session.js';
import { MentorShell } from '@/layouts';
import { api } from '@/api/client.js';
import { courseGet, getCohorts } from '@/features/cohorts/api/cohortApi.js';
import { deleteMentorAvailability, requestSlotChange } from '@/features/scheduling/api/mentorScheduleApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualErrorState, Modal, RefreshingIndicator, SakuraLoader, StaleDataBar } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { formatVnDateTime as bookingTime, parseUtcDate as bookingDate } from '@/utils/vnDateTime.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

function dayKey(value) {
  const date = bookingDate(value);
  if (!date) return 'Chưa xếp ngày';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayLabel(value) {
  const date = bookingDate(value);
  if (!date) return 'Chưa xếp ngày';
  return date.toLocaleDateString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

const slotClock = value => bookingDate(value)?.toLocaleTimeString(currentIntlTag(), {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
}) || 'Chưa xếp giờ';

function eventRange(event) {
  return {
    start: event.startHour * 60 + (event.startMinute || 0),
    end: event.endHour * 60 + (event.endMinute || 0),
  };
}

function rangesOverlap(left, right) {
  const a = eventRange(left);
  const b = eventRange(right);
  return a.start < b.end && b.start < a.end;
}

function groupByDay(bookings) {
  const groups = new Map();
  [...bookings]
    .sort((a, b) => (bookingDate(a.scheduledAt)?.getTime() || 0) - (bookingDate(b.scheduledAt)?.getTime() || 0))
    .forEach((booking) => {
      const key = dayKey(booking.scheduledAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(booking);
    });
  return [...groups.entries()];
}

export default function WorkSchedule() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const client = useQueryClient();
  const nowMs = useNow();
  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [changeId, setChangeId] = useState(null);
  const [changeReason, setChangeReason] = useState('');
  const [slotNotice, setSlotNotice] = useState('');
  const uid = getSession()?.userId ?? 'anon';
  const cohortsQuery = useQuery({
    queryKey: ['mentor-work-schedule-cohorts', uid],
    queryFn: () => getCohorts(),
    refetchInterval: 30000,
  });
  const cohortNameById = useMemo(() => {
    const map = new Map();
    (cohortsQuery.data || []).forEach((c) => {
      if (c?.id && c?.name) map.set(c.id, c.name);
    });
    return map;
  }, [cohortsQuery.data]);
  const query = useQuery({
    queryKey: ['mentor-work-schedule-courses', uid],
    queryFn: async () => {
      const courses = await courseGet();
      // Merge enrolments belonging to the same cohort session so multi-learner sessions render once with all learner names.
      const merged = new Map();
      (Array.isArray(courses) ? courses : [])
        .filter((c) => c.status !== 'Cancelled')
        .forEach((c) => {
          (c.sessions || []).forEach((s) => {
            const parsedStart = bookingDate(s.scheduledAt);
            const endIso = parsedStart
              ? new Date(parsedStart.getTime() + (Number(c.sessionMinutes) || 90) * 60000).toISOString()
              : null;
            const dedupeKey = c.cohortId ? `cohort-${c.cohortId}-s${s.number}` : `${c.id}-${s.id}`;
            const cur = merged.get(dedupeKey) || {
              id: dedupeKey,
              cohortId: c.cohortId,
              learnerId: c.learnerId,
              planName: c.name,
              sessionNumber: s.number,
              learnerNames: [],
              meetingUrl: s.meetingUrl,
              scheduledAt: s.scheduledAt,
              endsAt: endIso,
              status: s.status,
            };
            if (c.learnerName && !cur.learnerNames.includes(c.learnerName)) {
              cur.learnerNames.push(c.learnerName);
            }
            if (!cur.meetingUrl && s.meetingUrl) cur.meetingUrl = s.meetingUrl;
            merged.set(dedupeKey, cur);
          });
        });
      return [...merged.values()];
    },
    refetchInterval: 15000,
  });

  const refreshSlots = () => client.invalidateQueries({ queryKey: ['mentor-assigned-slots', uid] });
  const removeSlot = useMutation({
    mutationFn: deleteMentorAvailability,
    onSuccess: () => {
      setSlotNotice('Đã xóa khung giờ trống.');
      notify.success('Đã xóa khung giờ trống.', '', { key: 'work-schedule-delete' });
      refreshSlots();
    },
    onError: (err) => notify.apiError(err, 'Không xóa được khung giờ', { key: 'work-schedule-delete-err' }),
  });
  const askChange = useMutation({
    mutationFn: () => requestSlotChange(changeId, changeReason.trim()),
    onSuccess: () => {
      setSlotNotice('Đã gửi yêu cầu điều chỉnh khung giờ. Vui lòng chờ Admin xử lý.');
      notify.success('Đã gửi yêu cầu điều chỉnh khung giờ. Vui lòng chờ Admin xử lý.', '', { key: 'work-schedule-change-req' });
      setChangeId(null);
      setChangeReason('');
      refreshSlots();
    },
    onError: (err) => notify.apiError(err, 'Chưa gửi được yêu cầu điều chỉnh', { key: 'work-schedule-change-err' }),
  });
  const bookings = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const week = useMemo(() => buildWeekDays(mondayOfDateKey(anchorKey)), [anchorKey]);
  const assigned = useQuery({ queryKey: ['mentor-assigned-slots', uid], queryFn: async () => (await api.get('/mentor/availability')).result || [], refetchInterval: 15000 });
  const scheduleError = query.error || assigned.error;
  const selectedMonth = week[0].key.slice(0, 7);
  const monthLabel = `${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}`;
  const grouped = useMemo(() => new Map(groupByDay(bookings)), [bookings]);
  const weekKeys = new Set(week.map((day) => day.key));
  const later = [...grouped.entries()].filter(([key]) => key.startsWith(selectedMonth) && !weekKeys.has(key));
  const calendarEvents = useMemo(() => {
    const allDays = new Set([
      ...bookings.map((b) => dayKey(b.scheduledAt)).filter(Boolean),
      ...(assigned.data || []).map((s) => dayKey(s.startTime)).filter(Boolean),
    ]);
    return [...allDays].flatMap((dk) => {
      // Slots already used by a cohort are drawn as that cohort's session (below), not as availability.
      const slots = (assigned.data || [])
        .filter((slot) => dayKey(slot.startTime) === dk && !slot.isInCohort)
        .map((slot) => {
          const start = toVnTimeParts(slot.startTime);
          const end = toVnTimeParts(slot.endTime);
          const pendingCancel = slot.cancelRequestedAt && !slot.cancelRejectedAt;
          const pendingChange = slot.changeRequestedAt && !slot.changeResolution;
          const ended = (bookingDate(slot.endTime)?.getTime() || 0) <= nowMs;
          const tone = slot.isDeleted
            ? 'cancelled'
            : slot.rejectedAt
              ? 'rejected'
              : (pendingCancel || pendingChange || !slot.isApproved)
                ? 'pending'
                : ended
                  ? 'present'
                  : slot.isBooked ? 'booked' : slot.publishedAt ? 'open' : 'approved';
          const statusLabel = slot.isDeleted
            ? 'Đã hủy'
            : slot.rejectedAt
              ? 'Bị từ chối'
              : pendingCancel
                ? 'Chờ duyệt hủy'
                : pendingChange
                  ? 'Chờ duyệt điều chỉnh'
                  : !slot.isApproved
                    ? 'Chờ Admin duyệt'
                    : ended
                      ? 'Đã hoàn thành'
                      : slot.isBooked ? 'Đã xếp lớp' : slot.publishedAt ? 'Đã công bố' : 'Đã duyệt';
          return {
            id: `slot-${slot.id}`,
            rawSlot: slot,
            dayKey: dk,
            startHour: start.hour,
            startMinute: start.minute,
            endHour: end.hour,
            endMinute: end.minute,
            title: statusLabel === 'Đã công bố' || statusLabel === 'Đã duyệt' ? 'Khung rảnh' : statusLabel,
            statusLabel,
            detail: `${start.hhmm}–${end.hhmm}`,
            tone,
            z: 1,
          };
        });
      const sessions = (grouped.get(dk) || []).map((booking) => {
        const start = toVnTimeParts(booking.scheduledAt);
        const end = booking.endsAt ? toVnTimeParts(booking.endsAt) : { hour: start.hour + 1, minute: start.minute + 30 };
        const roomMatch = booking.meetingUrl?.match(/\/meeting-room\/([0-9a-f-]+)/i);
        const sessionTone = booking.status === 'Present'
          ? 'present'
          : booking.status === 'CancelledByMentor' ? 'cancelled' : 'session';
        const cohortTitle = (booking.cohortId && cohortNameById.get(booking.cohortId)) || booking.planName || 'Lớp nhóm';
        const cleanTitle = formatCleanCohortTitle(cohortTitle, booking.sessionNumber);
        const learnersLabel = (booking.learnerNames || []).join(', ');
        return {
          id: `booking-${booking.id}`,
          dayKey: dk,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          title: cleanTitle,
          fullTitle: trf('{0} · Buổi {1}', { 0: cohortTitle, 1: booking.sessionNumber }),
          detail: learnersLabel ? trf('HV: {0}', { 0: learnersLabel }) : undefined,
          tone: sessionTone,
          href: roomMatch ? `/meeting-room/${roomMatch[1]}` : (booking.cohortId ? `/mentor-study-courses/${booking.cohortId}/` : '/mentor-study-courses/'),
          hrefLabel: roomMatch ? 'Vào phòng học chung' : 'Mở lớp phụ trách',
          secondaryHref: booking.cohortId ? `/mentor-study-courses/${booking.cohortId}/` : '/mentor-study-courses/',
          metaRows: [
            { label: 'Lớp nhóm', value: cohortTitle },
            learnersLabel && { label: 'Học viên', value: learnersLabel },
          ].filter(Boolean),
          z: 3,
        };
      });
      const openSlots = slots.filter((slot) => !sessions.some((session) => rangesOverlap(slot, session)));
      return [...openSlots, ...sessions];
    });
  }, [bookings, grouped, assigned.data, cohortNameById]);

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Lịch làm việc')}>
      <div
        data-page="WorkSchedule"
        className="rp-container rp-cq pt-2.5 pb-1.5 text-rp-text space-y-2"
      >
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-rp-text">{tr('Lịch làm việc')}</h1>
            <p className="text-[12.5px] text-rp-text-muted">
              {tr('Theo dõi buổi dạy đã xếp lớp và các khung giờ đã mở theo chế độ Lịch hoặc Danh sách.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshingIndicator active={(query.isFetching || assigned.isFetching) && !query.isPending && !assigned.isPending} />
            <Link
              to="/mentor-shift-schedule/"
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong ${focusClass}`}
            >
              {tr('Đăng ký lịch dạy')}
            </Link>
          </div>
        </header>

        {(query.isPending || assigned.isPending) && !query.data && !assigned.data ? (
          <SakuraLoader variant="section" context="calendar" label={tr('Đang tải lịch làm việc')} delay={160} />
        ) : scheduleError && !query.data && !assigned.data ? (
          <div className="rounded-2xl border border-rp-line bg-white px-5">
            <ContextualErrorState
              error={scheduleError}
              title={tr('Không tải được lịch làm việc')}
              onRetry={() => {
                if (query.isError) query.refetch();
                if (assigned.isError) assigned.refetch();
              }}
              retrying={query.isFetching || assigned.isFetching}
            />
          </div>
        ) : (
        <>
        {scheduleError && (
          <StaleDataBar
            onRetry={() => {
              if (query.isError) query.refetch();
              if (assigned.isError) assigned.refetch();
            }}
            retrying={query.isFetching || assigned.isFetching}
          />
        )}

        {slotNotice && <p className="mb-3 rounded-xl bg-rp-success-bg px-4 py-3 text-[13px] text-rp-success">{slotNotice}</p>}
        {(removeSlot.error || askChange.error) && (
          <p role="alert" className="mb-3 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">
            {tr(describeApiError(removeSlot.error || askChange.error).message)}
          </p>
        )}

        <SakuraCalendar
          events={calendarEvents}
          anchorKey={anchorKey}
          onAnchorChange={setAnchorKey}
          onRefresh={() => { query.refetch(); assigned.refetch(); }}
          refreshing={query.isFetching || assigned.isFetching}
          renderEventActions={(ev, close) => {
            if (ev.secondaryHref && ev.href !== ev.secondaryHref) {
              return (
                <div className="border-t border-rp-line pt-3">
                  <Link
                    to={ev.secondaryHref}
                    onClick={close}
                    className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                  >
                    {tr('Quản lý lớp & điểm danh')}
                  </Link>
                </div>
              );
            }
            const slot = ev.rawSlot;
            if (!slot) return null;
            const started = new Date(slot.startTime).getTime() <= nowMs;
            return (
              <div className="flex flex-wrap gap-2 border-t border-rp-line pt-3">
                {!slot.isBooked && !slot.bookedCount && (
                  <button
                    type="button"
                    disabled={removeSlot.isPending}
                    onClick={() => { close(); setSlotNotice(''); removeSlot.mutate(slot.id); }}
                    className="h-9 rounded-xl border border-red-200 bg-red-50 px-3.5 text-[12px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {tr('Xóa khung trống')}
                  </button>
                )}
                {!started && !slot.changeRequestedAt && (
                  <button
                    type="button"
                    onClick={() => { close(); setChangeId(slot.id); setChangeReason(''); setSlotNotice(''); }}
                    className="h-9 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
                  >
                    {tr('Xin đổi / hủy tiết')}
                  </button>
                )}
              </div>
            );
          }}
        />

        {changeId != null && (
          <Modal
            open={changeId != null}
            onClose={() => { setChangeId(null); setChangeReason(''); }}
            title={tr('Yêu cầu điều chỉnh hoặc hủy khung giờ')}
            size="sm"
          >
            <form
              className="space-y-4"
              onSubmit={(event) => { event.preventDefault(); askChange.mutate(); }}
            >
              <label className="block text-[12.5px] font-medium text-rp-text-2">
                {tr('Lý do gửi quản trị viên')}
                <input
                  required
                  maxLength={1000}
                  value={changeReason}
                  onChange={(event) => setChangeReason(event.target.value)}
                  placeholder={tr('Nhập lý do cần điều chỉnh hoặc hủy tiết…')}
                  className="mt-1 h-9 w-full rounded-xl border border-rp-line px-3 text-[13px]"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-rp-line pt-3">
                <button
                  type="button"
                  onClick={() => { setChangeId(null); setChangeReason(''); }}
                  className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
                >
                  {tr('Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={askChange.isPending || !changeReason.trim()}
                  className="inline-flex h-9 items-center rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white hover:bg-rp-brand-strong disabled:opacity-50"
                >
                  {askChange.isPending ? tr('Đang gửi…') : tr('Gửi yêu cầu')}
                </button>
              </div>
            </form>
          </Modal>
        )}
        </>
        )}
      </div>
    </MentorShell>
  );
}
