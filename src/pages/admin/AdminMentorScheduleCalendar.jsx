import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Table2 } from 'lucide-react';
import {
  Badge,
  ContextualEmptyState,
  ContextualErrorState,
  DataTable,
  RefreshButton,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
  Tabs,
} from '@/components/ui';
import { getAdminMentorSchedule } from '@/features/admin/api/adminApi.js';
import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import {
  getViewDateRange,
  shiftDateKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { useLocale } from '@/locales/locale.js';

const STATES = {
  Available: { label: 'Trống', tone: 'success', calendarStatus: 'open' },
  Booked: { label: 'Đã xếp lớp', tone: 'brand', calendarStatus: 'booked' },
  Held: { label: 'Chờ thanh toán', tone: 'warning', calendarStatus: 'pending' },
  HeldExpired: { label: 'Giữ chỗ hết hạn', tone: 'neutral', calendarStatus: 'cancelled' },
  Draft: { label: 'Chưa công bố', tone: 'warning', calendarStatus: 'pending' },
  Ended: { label: 'Đã kết thúc', tone: 'neutral', calendarStatus: 'present' },
  Cancelled: { label: 'Đã hủy', tone: 'danger', calendarStatus: 'cancelled' },
  Rejected: { label: 'Đã từ chối', tone: 'danger', calendarStatus: 'cancelled' },
};

const clock = (value) => toVnTimeParts(value).hhmm;
const activeBookings = (slot) =>
  (slot.bookings || []).filter(
    (b) => b.paymentStatus === 'Paid' && ['Assigned', 'Accepted', 'Completed'].includes(b.status),
  );

export default function AdminMentorScheduleCalendar({ mentorId, email }) {
  const { tr, trf } = useLocale();
  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [view, setView] = useState('week');
  const [displayMode, setDisplayMode] = useState('calendar');

  const range = useMemo(() => getViewDateRange(anchorKey, view), [anchorKey, view]);
  const from = new Date(`${range.startKey}T00:00:00+07:00`).toISOString();
  const to = new Date(`${shiftDateKey(range.endKey, 1)}T00:00:00+07:00`).toISOString();

  const query = useQuery({
    queryKey: ['admin-mentor-calendar', mentorId, from, to],
    queryFn: async () => {
      const startMs = new Date(from).getTime();
      const endMs = new Date(to).getTime();
      const chunkMs = 28 * 86400_000;
      if (endMs - startMs <= chunkMs) {
        return getAdminMentorSchedule(mentorId, from, to);
      }
      const chunks = [];
      for (let cursor = startMs; cursor < endMs; cursor += chunkMs) {
        const nextEnd = Math.min(cursor + chunkMs, endMs);
        chunks.push(getAdminMentorSchedule(mentorId, new Date(cursor).toISOString(), new Date(nextEnd).toISOString()));
      }
      const pages = await Promise.all(chunks);
      const byId = new Map();
      pages.flat().forEach((slot) => {
        if (slot?.id != null) byId.set(slot.id, slot);
      });
      return [...byId.values()];
    },
    enabled: Number(mentorId) > 0,
    refetchInterval: 15000,
  });

  const slots = useMemo(
    () => [...(query.data || [])].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [query.data],
  );
  const bookedCount = useMemo(
    () => slots.filter((s) => activeBookings(s).length > 0 || s.bookedCount > 0).length,
    [slots],
  );

  const events = useMemo(
    () =>
      slots.flatMap((slot) => {
        const dayKey = toVnDateKey(slot.startTime);
        if (!dayKey) return [];
        const startParts = toVnTimeParts(slot.startTime);
        const endParts = toVnTimeParts(slot.endTime);
        const state = STATES[slot.state] || STATES.Available;
        const learners = activeBookings(slot).map((b) => b.learnerName).filter(Boolean).join(', ');
        return [{
          id: slot.id,
          dayKey,
          startHour: startParts.hour,
          startMinute: startParts.minute,
          endHour: endParts.hour,
          endMinute: endParts.minute,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: learners || tr(state.label),
          subtitle: `${startParts.hhmm}–${endParts.hhmm}`,
          tone: state.calendarStatus,
          status: state.calendarStatus,
          statusLabel: tr(state.label),
        }];
      }),
    [slots, tr],
  );

  const tableColumns = [
    {
      key: 'date',
      header: tr('Ngày (GMT+7)'),
      render: (row) => <span className="font-medium">{toVnTimeParts(row.startTime).dateKey}</span>,
    },
    {
      key: 'time',
      header: tr('Khung giờ'),
      render: (row) => (
        <span className="tabular-nums text-xs font-semibold">
          {clock(row.startTime)} – {clock(row.endTime)}
        </span>
      ),
    },
    {
      key: 'state',
      header: tr('Trạng thái'),
      render: (row) => {
        const st = STATES[row.state] || STATES.Available;
        return <Badge tone={st.tone} size="sm" icon={false}>{tr(st.label)}</Badge>;
      },
    },
    {
      key: 'learners',
      header: tr('Học viên / lớp'),
      render: (row) => (
        <span className="text-xs text-rp-text-2">
          {activeBookings(row).map((b) => b.learnerName).filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-rp-text-2">
          <span>{email || tr('Lịch giảng dạy')}</span>
          <span>·</span>
          <span>{trf('{0} lượt xếp lớp', { 0: bookedCount })}</span>
          <span>·</span>
          <span>{tr('Giờ Việt Nam')}</span>
          <RefreshingIndicator active={query.isFetching && !query.isPending} />
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            variant="pill"
            label={tr('Chế độ xem')}
            value={displayMode}
            onChange={setDisplayMode}
            tabs={[
              { value: 'calendar', label: tr('Lịch'), icon: CalendarDays },
              { value: 'table', label: tr('Bảng ngày'), icon: Table2 },
            ]}
          />
          {!query.isPending && !(query.isError && !query.data) && !(displayMode === 'table' && slots.length === 0) && (
            <RefreshButton
              onRefresh={() => query.refetch({ cancelRefetch: true })}
              refreshing={query.isFetching}
            />
          )}
        </div>
      </div>

      {query.isError && !query.data && (
        <ContextualErrorState
          compact
          error={query.error}
          title={tr('Không thể tải lịch giảng dạy')}
          onRetry={() => query.refetch()}
        />
      )}
      {query.isError && query.data && (
        <StaleDataBar onRetry={() => query.refetch()} retrying={query.isFetching} />
      )}

      {query.isPending ? (
        <SakuraLoader variant="section" context="cohort" label={tr('Đang tải lịch từ hệ thống')} delay={140} />
      ) : displayMode === 'calendar' ? (
        <SakuraCalendar
          events={events}
          anchorKey={anchorKey}
          onAnchorChange={setAnchorKey}
          view={view}
          onViewChange={setView}
          onRefresh={() => query.refetch()}
          refreshing={query.isFetching}
        />
      ) : slots.length === 0 ? (
        <ContextualEmptyState
          variant="compact"
          illustration="calendar"
          title={tr('Chưa có khung giờ nào trong khoảng thời gian này')}
          description={tr('Hãy chọn tuần khác hoặc chuyển sang chế độ Lịch để xem chi tiết.')}
        />
      ) : (
        <DataTable columns={tableColumns} rows={slots} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
