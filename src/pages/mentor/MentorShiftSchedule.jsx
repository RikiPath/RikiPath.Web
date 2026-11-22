import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getSession } from '@/app/auth/session.js';
import { MentorShell } from '@/layouts';
import {
  deleteMyAvailabilitySlot,
  getMyAvailabilitySlots,
  getMyMentorSchedule,
  previewMentorSlots,
  previewTeachingConflicts,
  publishMentorSlots,
  requestCancelAvailabilitySlots,
  updateMyMentorSchedule,
} from '@/features/scheduling/api/mentorScheduleManageApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ChevronLeft, ChevronRight, Eye, Save, Send } from 'lucide-react';
import { ContextualErrorState, Modal, SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import ScheduleConflictList from '@/features/scheduling/components/ScheduleConflictList.jsx';
import {
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { vietnamDate } from '@/utils/vietnamDate.js';
import { formatVnSlotWindow } from '@/utils/vnDateTime.js';
import { useLocale, translateTemplate } from '@/locales/locale.js';

const CONFLICT_DEBOUNCE_MS = 400;
const errText = (err) => describeApiError(err).message;

/** Khung giờ Việt Nam (UTC+7, không DST) → ISO UTC. */
function vnLocalToUtc(localDate, localTime) {
  const value = new Date(`${localDate}T${String(localTime).slice(0, 5)}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function slotInterval(slot) {
  const startUtc = slot.startUtc || slot.startTime || vnLocalToUtc(slot.localDate, slot.localStart);
  const endUtc = slot.endUtc || slot.endTime || vnLocalToUtc(slot.localDate, slot.localEnd);
  return startUtc && endUtc ? { startUtc, endUtc } : null;
}

const WEEKDAYS = [
  { id: 1, short: 'T2', label: 'Thứ hai' },
  { id: 2, short: 'T3', label: 'Thứ ba' },
  { id: 3, short: 'T4', label: 'Thứ tư' },
  { id: 4, short: 'T5', label: 'Thứ năm' },
  { id: 5, short: 'T6', label: 'Thứ sáu' },
  { id: 6, short: 'T7', label: 'Thứ bảy' },
  { id: 0, short: 'CN', label: 'Chủ nhật' },
];

const DAYPARTS = [
  { code: 'Morning', label: 'Sáng', start: '07:00:00', end: '11:00:00', tone: 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-deep', dot: 'bg-rp-brand-strong' },
  { code: 'Noon', label: 'Trưa', start: '11:00:00', end: '13:00:00', tone: 'border-[#C47B16] bg-rp-warning-bg text-rp-warning', dot: 'bg-[#C47B16]' },
  { code: 'Afternoon', label: 'Chiều', start: '13:00:00', end: '18:00:00', tone: 'border-rp-success bg-rp-success-bg text-rp-success', dot: 'bg-rp-success' },
  { code: 'Evening', label: 'Tối', start: '18:00:00', end: '22:00:00', tone: 'border-[#7A3E98] bg-[#F4E9F8] text-[#5C2E73]', dot: 'bg-[#7A3E98]' },
];

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 52;
const keyOf = (weekday, code) => `${weekday}-${code}`;

function addIsoDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function mondayOf(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addIsoDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

function minutesOf(value) {
  const [hour, minute] = String(value).slice(0, 5).split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function clock(value) {
  return String(value).slice(0, 5);
}

function weekTitle(days) {
  const first = days[0];
  const last = days[6];
  if (first.month === last.month) return translateTemplate('{0} – {1} tháng {2}, {3}', { 0: first.date, 1: last.date, 2: first.month, 3: first.year });
  return `${first.date} thg ${first.month} – ${last.date} thg ${last.month}, ${last.year}`;
}

export default function MentorShiftSchedule() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const uid = getSession()?.userId ?? 'anon';
  const scheduleKey = ['my-mentor-schedule', uid];
  const slotsKey = ['my-availability-slots', uid];
  const client = useQueryClient();
  const [selected, setSelected] = useState(() => new Set());
  const [weekOffset, setWeekOffset] = useState(0);
  const [preview, setPreview] = useState(null);
  const [published, setPublished] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [activeSlotId, setActiveSlotId] = useState(null);

  const query = useQuery({
    queryKey: scheduleKey,
    queryFn: getMyMentorSchedule,
  });

  const availabilityQuery = useQuery({
    queryKey: slotsKey,
    queryFn: getMyAvailabilitySlots,
  });

  const [syncedRules, setSyncedRules] = useState(undefined);
  if (query.data !== syncedRules) {
    setSyncedRules(query.data);
    const today = vietnamDate(0);
    const rules = (query.data?.rules || []).filter((rule) => !rule.effectiveTo || rule.effectiveTo >= today);
    setSelected(new Set(rules.map((rule) => keyOf(rule.weekday, rule.daypartCode))));
  }

  const weekStart = addIsoDays(mondayOf(vietnamDate(0)), weekOffset * 7);
  const days = WEEKDAYS.map((day, index) => {
    const iso = addIsoDays(weekStart, index);
    const [year, month, date] = iso.split('-').map(Number);
    return { ...day, iso, year, month, date, today: iso === vietnamDate(0) };
  });
  const weekEnd = days[6].iso;

  const rules = useMemo(() => {
    const effectiveFrom = vietnamDate(0);
    return WEEKDAYS.flatMap((day) => DAYPARTS
      .filter((part) => selected.has(keyOf(day.id, part.code)))
      .map((part) => ({
        weekday: day.id,
        daypartCode: part.code,
        localStart: part.start,
        localEnd: part.end,
        effectiveFrom,
      })));
  }, [selected]);

  const toggle = (weekday, code) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = keyOf(weekday, code);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => updateMyMentorSchedule({
      timeZoneId: 'Asia/Ho_Chi_Minh',
      autoPublish: true,
      effectiveFrom: vietnamDate(0),
      rules,
    }),
    onSuccess: (schedule) => {
      client.setQueryData(scheduleKey, schedule);
      setError('');
      setMessage('Đã lưu ca làm việc lặp theo tuần.');
      notify.success('Đã lưu ca làm việc lặp theo tuần.', '', { key: 'mentor-shift-save' });
    },
    onError: (err) => {
      const msg = errText(err);
      setError(msg);
      notify.apiError(err, 'Chưa lưu được ca làm việc', { key: 'mentor-shift-save-err' });
    },
  });

  const effectiveStartDate = weekStart < vietnamDate(0) ? vietnamDate(0) : weekStart;
  const weekInPast = weekEnd < vietnamDate(0);

  const previewMutation = useMutation({
    mutationFn: () => previewMentorSlots({ startDate: effectiveStartDate, endDate: weekEnd }),
    onSuccess: (data) => { setPreview(data); setError(''); setMessage('Đã xem trước khung 90 phút của tuần này.'); },
    onError: (err) => setError(errText(err)),
  });

  const publish = useMutation({
    mutationFn: () => {
      notify.loading('Đang gửi khung giờ chờ duyệt…', '', { key: 'mentor-shift-publish', maxWaitMs: 30000 });
      return publishMentorSlots({ startDate: effectiveStartDate, endDate: weekEnd });
    },
    onSuccess: (data) => {
      setPublished(data);
      setError('');
      const msg = trf('Đã gửi {0} khung giờ chờ Admin duyệt. Bỏ qua {1} khung đã có.', { 0: data.createdCount, 1: data.skippedExistingCount });
      setMessage(msg);
      notify.success('Đã gửi khung giờ chờ Admin duyệt', msg, { key: 'mentor-shift-publish', replace: true });
      client.invalidateQueries({ queryKey: slotsKey });
    },
    onError: (err) => {
      const msg = errText(err);
      setError(msg);
      notify.apiError(err, 'Chưa gửi được khung giờ', { key: 'mentor-shift-publish', replace: true });
    },
  });

  const removeSlot = useMutation({
    mutationFn: (slotId) => deleteMyAvailabilitySlot(slotId),
    onSuccess: () => {
      setError('');
      setActiveSlotId(null);
      setCancelReason('');
      setMessage('Đã xóa khung giờ chưa duyệt.');
      notify.success('Đã xóa khung giờ chưa duyệt.', '', { key: 'mentor-shift-delete' });
      client.invalidateQueries({ queryKey: slotsKey });
    },
    onError: (err) => {
      const msg = errText(err);
      setError(msg);
      notify.apiError(err, 'Không xóa được khung giờ', { key: 'mentor-shift-delete-err' });
    },
  });

  const requestCancel = useMutation({
    mutationFn: ({ slotId, reason }) => requestCancelAvailabilitySlots([slotId], reason),
    onSuccess: () => {
      setError('');
      setActiveSlotId(null);
      setCancelReason('');
      setMessage('Đã gửi yêu cầu hủy khung giờ lên Admin.');
      notify.success('Đã gửi yêu cầu hủy khung giờ lên Admin.', '', { key: 'mentor-shift-cancel-req' });
      client.invalidateQueries({ queryKey: slotsKey });
    },
    onError: (err) => {
      const msg = errText(err);
      setError(msg);
      notify.apiError(err, 'Không gửi được yêu cầu hủy khung giờ', { key: 'mentor-shift-cancel-err' });
    },
  });

  // Khung mới dự kiến công bố (chưa tồn tại) → kiểm tra xung đột với lịch dạy hiện có (debounce).
  const proposedIntervals = useMemo(
    () => (preview?.slots || []).filter((slot) => !slot.isExisting).map(slotInterval).filter(Boolean),
    [preview]
  );
  const intervalsKey = useMemo(() => JSON.stringify(proposedIntervals), [proposedIntervals]);
  const [conflictReport, setConflictReport] = useState(null);

  useEffect(() => {
    const intervals = JSON.parse(intervalsKey);
    if (intervals.length === 0) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      previewTeachingConflicts(intervals)
        .then((report) => {
          if (alive) setConflictReport({ key: intervalsKey, conflicts: report?.conflicts || [], isValid: report?.isValid !== false, error: '' });
        })
        .catch((err) => {
          if (alive) setConflictReport({ key: intervalsKey, conflicts: [], isValid: true, error: errText(err) });
        });
    }, CONFLICT_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [intervalsKey]);

  const activeReport = proposedIntervals.length > 0 && conflictReport?.key === intervalsKey ? conflictReport : null;
  const teachingConflicts = useMemo(() => activeReport?.conflicts || [], [activeReport]);
  const checkingConflicts = proposedIntervals.length > 0 && !activeReport;
  const hasTeachingConflict = teachingConflicts.length > 0 || activeReport?.isValid === false;
  const conflictStarts = useMemo(
    () => new Set(teachingConflicts.map((c) => new Date(c.proposedStartUtc).getTime()).filter((t) => !Number.isNaN(t))),
    [teachingConflicts]
  );

  const previewByDay = useMemo(() => {
    const map = new Map();
    (preview?.slots || []).forEach((slot) => {
      const list = map.get(slot.localDate) || [];
      list.push(slot);
      map.set(slot.localDate, list);
    });
    return map;
  }, [preview]);

  const publishedByKey = useMemo(() => {
    const map = new Map();
    (availabilityQuery.data || []).forEach((slot) => {
      if (slot?.rejectedAt) return;
      const key = `${toVnDateKey(slot.startTime)}-${toVnTimeParts(slot.startTime).hhmm}`;
      map.set(key, { ...slot, availabilityId: slot.id });
    });
    (published?.publishedSlots || []).forEach((slot) => {
      map.set(`${slot.localDate}-${clock(slot.localStart)}`, slot);
    });
    return map;
  }, [published, availabilityQuery.data]);

  const slotById = useMemo(() => {
    const map = new Map();
    (availabilityQuery.data || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [availabilityQuery.data]);

  const activePublished = (published?.publishedSlots || []).find((slot) => slot.availabilityId === activeSlotId);
  const activeSlot = slotById.get(activeSlotId) || (activePublished
    ? {
        id: activePublished.availabilityId,
        startTime: null,
        endTime: null,
        localLabel: `${activePublished.localDate} · ${clock(activePublished.localStart)}–${clock(activePublished.localEnd)}`,
        isApproved: false,
        rejectedAt: null,
        isBooked: false,
        bookedCount: 0,
        isInCohort: false,
        cohortId: null,
        cancelRequestedAt: null,
      }
    : null);
  const canDeleteActive = Boolean(
    activeSlot &&
    !activeSlot.isApproved &&
    !activeSlot.rejectedAt &&
    !activeSlot.isBooked &&
    (activeSlot.bookedCount ?? 0) === 0 &&
    !activeSlot.isInCohort
  );
  const canRequestCancelActive = Boolean(
    activeSlot &&
    activeSlot.isApproved &&
    !activeSlot.isBooked &&
    (activeSlot.bookedCount ?? 0) === 0 &&
    !activeSlot.isInCohort &&
    !activeSlot.cancelRequestedAt
  );
  const missing = query.error?.status === 404;
  const scheduleLoadBlocked = Boolean(query.error && !missing);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const buttonClass = 'inline-flex h-9 items-center rounded-lg border border-rp-line bg-white px-3 text-[12px] text-rp-text-2 hover:bg-rp-brand-tint disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35';

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Ca làm việc')}>
      <div className="box-border flex min-h-[calc(100dvh-var(--spacing-rp-topbar))] min-w-0 max-w-full flex-col px-[var(--rp-space-page-x)] py-[var(--rp-space-page-y)] text-rp-text lg:h-[calc(100dvh-var(--spacing-rp-topbar))] lg:overflow-hidden">
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-rp-line bg-white px-4 py-3 shadow-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="rp-type-page-title mr-1">{tr('Ca làm việc')}</h1>
            <button type="button" onClick={() => setWeekOffset(0)} className={buttonClass}>{tr('Hôm nay')}</button>
            <div className="inline-flex items-center rounded-lg border border-rp-line bg-white p-0.5">
              <button type="button" aria-label={tr('Tuần trước')} onClick={() => setWeekOffset((value) => value - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label={tr('Tuần tới')} onClick={() => setWeekOffset((value) => value + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <p className="text-[14px] font-semibold text-rp-brand-strong">{weekTitle(days)}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" disabled={save.isPending || query.isPending || scheduleLoadBlocked} onClick={() => { setMessage(''); setError(''); save.mutate(); }} className={buttonClass}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {save.isPending ? tr('Đang lưu…') : trf('Lưu {0} ca', { 0: rules.length })}
            </button>
            <button type="button" disabled={previewMutation.isPending || weekInPast} onClick={() => { setMessage(''); setError(''); previewMutation.mutate(); }} className={buttonClass}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              {previewMutation.isPending ? tr('Đang xem…') : tr('Xem trước')}
            </button>
            <button
              type="button"
              disabled={publish.isPending || hasTeachingConflict || weekInPast}
              title={hasTeachingConflict ? tr('Còn xung đột lịch dạy – vui lòng điều chỉnh ca trước khi gửi duyệt.') : undefined}
              onClick={() => { if (hasTeachingConflict) return; setMessage(''); setError(''); publish.mutate(); }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rp-brand-strong px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-deep disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 rp-press">
              <Send className="h-3.5 w-3.5" />
              {publish.isPending ? tr('Đang gửi duyệt…') : tr('Gửi Admin duyệt tuần này')}
            </button>
          </div>
        </div>

        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-rp-text-muted">
          <span>{tr('Bấm một ca để bật hoặc tắt. Ca lặp mỗi tuần. Giờ Việt Nam.')}</span>
          {DAYPARTS.map((part) => (
            <span key={part.code} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${part.dot}`} />
              {tr(part.label)} {clock(part.start)}–{clock(part.end)}
            </span>
          ))}
          {query.isPending && (
            <SakuraLoader variant="inline" size={16} context="cohort" label={tr('Đang tải mẫu lịch…')} delay={160} />
          )}
          {missing && <span>{tr('Chưa có mẫu lịch.')}</span>}
          {preview && <span>{trf('{0} khung mới · {1} xung đột', { 0: preview.newSlotsCount, 1: preview.conflictSlotsCount })}</span>}
        </div>
        {scheduleLoadBlocked && (
          <ContextualErrorState
            variant="inline"
            className="mb-2"
            error={query.error}
            title={tr('Chưa tải được mẫu ca làm việc')}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        )}
        {availabilityQuery.isError && (
          <ContextualErrorState
            variant="inline"
            className="mb-2"
            error={availabilityQuery.error}
            title={tr('Chưa tải được các khung giờ đã đăng ký')}
            onRetry={() => availabilityQuery.refetch()}
            retrying={availabilityQuery.isFetching}
          />
        )}
        {(message || error) && (
          <p role={error ? 'alert' : 'status'} className={`mb-2 rounded-xl px-4 py-2 text-[13px] ${error ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-rp-success-bg text-rp-success'}`}>
            {error || message}
          </p>
        )}
        {checkingConflicts && (
          <SakuraLoader
            variant="inline"
            size={16}
            context="cohort"
            label={tr('Đang kiểm tra xung đột với lịch dạy hiện có')}
            className="mb-2"
            delay={160}
          />
        )}
        {activeReport?.error && (
          <p role="status" className="mb-2 rounded-xl bg-rp-warning-bg px-4 py-2 text-[13px] text-rp-warning">
           {trf('Chưa kiểm tra được xung đột lịch dạy: {0} Máy chủ vẫn kiểm tra lại khi bạn gửi duyệt.', { 0: activeReport.error })}
          </p>
        )}
        {teachingConflicts.length > 0 && (
          <div className="mb-2">
            <ScheduleConflictList
              conflicts={teachingConflicts}
              title={trf('Có {0} khung giờ xung đột với lịch dạy hiện có – nút gửi duyệt tạm khóa', { 0: teachingConflicts.length })}
              cohortLink={(cohortId) => `/mentor-study-courses?cohortId=${cohortId}`}
            />
          </div>
        )}

        <Modal
          open={Boolean(activeSlot)}
          onClose={() => { setActiveSlotId(null); setCancelReason(''); }}
          title={activeSlot ? (activeSlot.localLabel || (activeSlot.startTime ? formatVnSlotWindow(activeSlot.startTime, activeSlot.endTime) : tr('Khung giờ'))) : ''}
          size="sm"
        >
          {activeSlot && (
            <div className="space-y-3">
              <p className="text-[13px] leading-6 text-rp-text-2">
                {activeSlot.isInCohort
                  ? (activeSlot.cohortName
                    ? trf('Khung giờ thuộc lớp {0}; điều chỉnh thông qua yêu cầu khóa học.', { 0: activeSlot.cohortName })
                    : tr('Khung giờ thuộc một lớp nhóm; điều chỉnh thông qua yêu cầu khóa học.'))
                  : activeSlot.isBooked || (activeSlot.bookedCount ?? 0) > 0
                    ? trf('Khung giờ đã có {0} học viên tham gia; không thể xóa trực tiếp.', { 0: activeSlot.bookedCount || 1 })
                    : activeSlot.cancelRequestedAt && !activeSlot.cancelRejectedAt
                      ? tr('Đang chờ Admin duyệt yêu cầu hủy.')
                      : activeSlot.isApproved
                        ? tr('Khung giờ đã duyệt đang mở: bạn có thể gửi yêu cầu hủy lên Admin (cách giờ bắt đầu tối thiểu theo chính sách).')
                        : tr('Khung giờ đang chờ Admin duyệt: bạn có thể xóa trực tiếp trước khi duyệt.')}
              </p>
              {canRequestCancelActive && (
                <input
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  maxLength={1000}
                  placeholder={tr('Lý do xin hủy khung giờ đã duyệt')}
                  className="w-full rounded-lg border border-rp-line px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-rp-brand-strong/35"
                />
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {canDeleteActive && (
                  <button
                    type="button"
                    disabled={removeSlot.isPending}
                    onClick={() => removeSlot.mutate(activeSlot.id)}
                    className="rounded-xl bg-rp-brand-strong px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50 rp-press"
                  >
                    {tr('Xóa khung giờ')}
                  </button>
                )}
                {canRequestCancelActive && (
                  <button
                    type="button"
                    disabled={requestCancel.isPending}
                    onClick={() => requestCancel.mutate({ slotId: activeSlot.id, reason: cancelReason.trim() })}
                    className="rounded-xl bg-rp-brand-strong px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50 rp-press"
                  >
                    {tr('Gửi yêu cầu hủy')}
                  </button>
                )}
                <button type="button" onClick={() => { setActiveSlotId(null); setCancelReason(''); }} className={buttonClass}>{tr('Đóng')}</button>
              </div>
            </div>
          )}
        </Modal>

        <div data-density="compact" className="min-h-[420px] min-w-0 flex-1 overflow-auto rounded-2xl border border-rp-line bg-white lg:min-h-0">
          <div className="min-w-[680px]">
            <div className="sticky top-0 z-20 grid border-b border-rp-line bg-white" style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}>
              <div className="px-2 py-2 text-right text-[10px] text-rp-text-muted">GMT+7</div>
              {days.map((day) => (
                <div key={day.iso} className="overflow-hidden border-l border-rp-line px-1 py-2 text-center">
                  <p className={`text-[11px] uppercase tracking-wide ${day.today ? 'text-rp-brand-strong' : 'text-rp-text-muted'}`}>{day.short}</p>
                  <p className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-semibold ${day.today ? 'bg-rp-brand-strong text-white' : 'text-rp-text'}`}>{day.date}</p>
                </div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}>
              <div className="relative overflow-hidden" style={{ height: gridHeight }}>
                {hours.map((hour) => (
                  <span key={hour} className="absolute right-2 text-[11px] leading-none text-rp-text-muted" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + 8 }}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {days.map((day) => (
                <div key={day.iso} className={`relative overflow-hidden border-l border-rp-line ${day.today ? 'bg-rp-brand-tint' : ''}`} style={{ height: gridHeight }}>
                  {hours.map((hour) => (
                    <div key={hour} className="absolute inset-x-0 border-t border-rp-line" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }} />
                  ))}
                  {DAYPARTS.map((part) => {
                    const on = selected.has(keyOf(day.id, part.code));
                    const top = ((minutesOf(part.start) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    const height = ((minutesOf(part.end) - minutesOf(part.start)) / 60) * HOUR_HEIGHT;
                    return (
                      <button
                        key={part.code}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${on ? 'Tắt' : 'Bật'} ca ${part.label} ${day.label}`}
                        onClick={() => toggle(day.id, part.code)}
                        className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 text-left ${on ? part.tone : 'border-transparent hover:bg-rp-brand-tint'}`}
                        style={{ top: top + 2, height: Math.max(height - 4, 20) }}
                      >
                        <span className={`block truncate px-1.5 pt-1 text-[11px] font-semibold ${on ? '' : 'text-rp-text-muted opacity-0 hover:opacity-100'}`}>
                          {tr(part.label)}
                        </span>
                        {on && height > 36 && <span className="block truncate px-1.5 text-[10px] opacity-80">{clock(part.start)}–{clock(part.end)}</span>}
                      </button>
                    );
                  })}
                  {(previewByDay.get(day.iso) || []).map((slot) => {
                    const publishedSlot = publishedByKey.get(`${slot.localDate}-${clock(slot.localStart)}`);
                    const top = ((minutesOf(slot.localStart) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((minutesOf(slot.localEnd) - minutesOf(slot.localStart)) / 60) * HOUR_HEIGHT - 2, 18);
                    const interval = slotInterval(slot);
                    const teachingConflict = Boolean(interval && conflictStarts.has(new Date(interval.startUtc).getTime()));
                    const conflict = slot.hasConflict || teachingConflict;
                    const tone = DAYPARTS.find((part) => part.code === slot.daypartCode)?.tone || DAYPARTS[0].tone;
                    return (
                      <button
                        key={slot.generationKey}
                        type="button"
                        onClick={() => publishedSlot && setActiveSlotId(publishedSlot.availabilityId)}
                        className={`absolute inset-x-1.5 z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left ${conflict ? 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong' : tone}`}
                        style={{ top: top + 2, height }}
                      >
                        <span className="block truncate text-[11px] font-semibold">{clock(slot.localStart)}–{clock(slot.localEnd)}</span>
                        {height > 28 && <span className="block truncate text-[10px] opacity-80">{conflict ? (slot.conflictReason || (teachingConflict ? tr('Trùng lịch dạy') : tr('Xung đột'))) : slot.isExisting ? tr('Đã có') : tr('Khung 90 phút')}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MentorShell>
  );
}
