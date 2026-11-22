import { backendUtcDate } from '@/utils/mentorSchedule';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminShell, MentorShell } from '@/layouts';
import { api } from '@/api/client';
import { describeApiError } from '@/api/apiErrors.js';
import { invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import {
  Banner,
  Button,
  Checkbox,
  ContextualErrorState,
  CustomSelect,
  Field,
  Input,
  Modal,
  SakuraLoader,
} from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import SakuraCalendar from './SakuraCalendar';
import InteractiveSlotCalendar from './InteractiveSlotCalendar';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import {
  mondayOfDateKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import '@/pages/shared/studyCourses.css';
import './availabilityPlanner.css';
import {
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Scissors,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';

const dayKey = (value) => toVnDateKey(value);
const clock = (value) => toVnTimeParts(value).hhmm;
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const JA_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const monday = () => mondayOfDateKey(toVnDateKey(new Date()));

function statusOf(s, conflictIds) {
  if (s.isDeleted) return { label: 'Đã hủy', tone: 'cancelled', calTone: 'cancelled' };
  if (s.rejectedAt) return { label: 'Bị từ chối', tone: 'rejected', calTone: 'rejected' };
  if (s.cancelRequestedAt && !s.cancelRejectedAt) return { label: 'Chờ duyệt hủy', tone: 'pending', calTone: 'pending' };
  if (s.changeRequestedAt && !s.changeResolution) return { label: 'Chờ duyệt đổi giờ', tone: 'pending', calTone: 'pending' };
  if (!s.isApproved) return { label: 'Chờ duyệt', tone: 'pending', calTone: 'pending' };
  if (conflictIds?.has(s.id)) return { label: 'Trùng lịch', tone: 'rejected', calTone: 'conflict' };
  if (s.sessionCompleted || (s.isInCohort && s.status === 'Completed')) return { label: 'Đã hoàn thành', tone: 'present', calTone: 'present' };
  if (s.isInCohort || s.status === 'Booked' || (s.bookedCount ?? 0) > 0) return { label: 'Đã xếp lớp', tone: 'session', calTone: 'session' };
  return { label: 'Đã duyệt', tone: 'approved', calTone: 'approved' };
}

function findConflicts(slots) {
  const ids = new Set();
  const byMentor = new Map();
  slots.forEach((s) => {
    if (s.rejectedAt || s.isDeleted) return;
    const key = s.mentorId ?? 0;
    if (!byMentor.has(key)) byMentor.set(key, []);
    byMentor.get(key).push({ id: s.id, start: backendUtcDate(s.startTime).getTime(), end: backendUtcDate(s.endTime).getTime() });
  });
  byMentor.forEach((list) => {
    list.sort((a, b) => a.start - b.start);
    let last = null;
    list.forEach((cur) => {
      if (last && cur.start < last.end) { ids.add(cur.id); ids.add(last.id); }
      if (!last || cur.end > last.end) last = cur;
    });
  });
  return ids;
}

function MentorInteractiveAvailabilityWorkspace({ embedded = false }) {
  const { tr, trf } = useLocale();
  const Shell = embedded ? Fragment : MentorShell;
  const workspace = useMentorScheduleWorkspace({ includeCalendarStatus: false });
  const {
    availabilityQuery,
    scheduleQuery,
    slots,
    cohortSessions,
    externalBusyEvents,
    policy,
    invalidateScheduling,
    createAvailability,
    createAvailabilityBatch,
    movePendingSlot,
    deletePendingSlot,
    requestCancelSlot,
    requestChangeSlot,
  } = workspace;

  const [week, setWeek] = useState(monday);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function action(work, message = 'Đã cập nhật lịch.', tone = 'success', { silentToast = false } = {}) {
    setBusy(true);
    setError('');
    setNotice('');
    const toastKey = 'availability-planner-action';
    if (message !== null && !silentToast) {
      notify.loading(tr('Đang xử lý…'), '', { key: toastKey, maxWaitMs: 30000 });
    }
    try {
      const res = await work();
      await invalidateScheduling();
      if (message !== null && !silentToast) {
        setNotice(message);
        notify[tone](message, '', { key: toastKey, replace: true });
      }
      return res;
    } catch (e) {
      setError(describeApiError(e).message);
      if (!silentToast) {
        notify.apiError(e, tr('Chưa cập nhật được lịch'), { key: toastKey, replace: message !== null });
      }
      throw e;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell {...(embedded ? {} : { breadcrumb: tr('Khung giờ rảnh & yêu cầu') })}>
      <div className={embedded ? 'space-y-2' : 'rp-container pt-2.5 pb-1.5 text-rp-text space-y-2'}>
        {!embedded && (
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-[20px] font-bold tracking-tight text-rp-text">{tr('Khung giờ rảnh & yêu cầu')}</h1>
              <p className="text-[12.5px] text-rp-text-muted">
                {trf('Chuyển đổi giữa Lịch và Danh sách để đăng ký khung {0} phút, theo dõi trạng thái duyệt hoặc gửi yêu cầu điều chỉnh.', {
                  0: policy.sessionMinutes,
                })}
              </p>
            </div>
          </header>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[12.5px] font-medium text-red-800" role="alert">
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12.5px] font-medium text-emerald-800" role="status">
            <Info size={16} /><span>{notice}</span>
          </div>
        )}

        {availabilityQuery.isPending ? (
          <div className="rounded-2xl border border-rp-line bg-white p-8">
            <SakuraLoader variant="section" context="calendar" label={tr('Đang tải lịch dạy…')} className="min-h-[180px]" delay={160} />
          </div>
        ) : availabilityQuery.isError && slots.length === 0 ? (
          <div className="rounded-2xl border border-rp-line bg-white p-5">
            <ContextualErrorState compact error={availabilityQuery.error} title={tr('Chưa tải được lịch tuần')} onRetry={() => availabilityQuery.refetch()} retrying={availabilityQuery.isFetching} />
          </div>
        ) : (
          <InteractiveSlotCalendar
            slots={slots}
            cohortSessions={cohortSessions}
            externalBusyEvents={externalBusyEvents}
            policy={policy}
            anchorKey={week}
            onAnchorChange={setWeek}
            onRefresh={() => { availabilityQuery.refetch(); scheduleQuery.refetch(); }}
            refreshing={availabilityQuery.isFetching || scheduleQuery.isFetching}
            busy={busy}
            onCreateAvailability={({ startTime, endTime, repeatUntil, weekdays, idempotencyKey, count, silentToast }) =>
              action(
                () => createAvailability({ startTime, endTime, repeatUntil, weekdays, idempotencyKey }),
                count > 1
                  ? trf('Đã gửi {0} khung giờ 90 phút chờ duyệt.', { 0: count })
                  : tr('Đã gửi khung giờ 90 phút chờ duyệt.'),
                'success',
                { silentToast }
              )
            }
            onCreateAvailabilityBatch={({ slots: batchSlots, idempotencyKey, count }) =>
              action(
                () => createAvailabilityBatch({ slots: batchSlots, idempotencyKey }),
                count > 1
                  ? trf('Đã gửi đăng ký {0} khung giờ 90 phút chờ duyệt.', { 0: count })
                  : tr('Đã gửi khung giờ 90 phút chờ duyệt.'),
                'success'
              )
            }
            onMovePendingSlot={({ slot, startUtcIso, endUtcIso }) =>
              action(() => movePendingSlot({ slot, startUtcIso, endUtcIso }), tr('Đã dời khung giờ chờ duyệt.'))
            }
            onDeletePendingSlot={(slotId) =>
              action(() => deletePendingSlot(slotId), tr('Đã xóa đăng ký.'))
            }
            onRequestCancelSlot={(slotId, reason) =>
              action(() => requestCancelSlot(slotId, reason), tr('Đã gửi yêu cầu hủy khung giờ.'))
            }
            onRequestChangeSlot={(slotId, reason) =>
              action(() => requestChangeSlot(slotId, reason), tr('Đã gửi yêu cầu điều chỉnh giờ.'))
            }
          />
        )}
      </div>
    </Shell>
  );
}

function AdminAvailabilityWorkspace({ embedded = false }) {
  const { tr, trf, locale, fmt } = useLocale();
  const queryClient = useQueryClient();
  const labels = locale === 'ja' ? JA_DAYS : VI_DAYS;
  const Shell = embedded ? Fragment : AdminShell;
  const [slots, setSlots] = useState([]);
  const [mentorFilter, setMentorFilter] = useState('ALL');
  const [selected, setSelected] = useState([]);
  const [week, setWeek] = useState(monday);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [splitMinutes, setSplitMinutes] = useState('90');
  const [adminRejectNote, setAdminRejectNote] = useState('');
  const [batchReviewModalOpen, setBatchReviewModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const response = await api.get('/admin/mentor-availabilities');
    setSlots(response.result || []);
    setSelected([]);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => { if (!alive) return null; setInitialLoading(true); return load(); })
      .catch((e) => { if (!alive) return; setLoadError(e); setError(describeApiError(e).message); })
      .finally(() => alive && setInitialLoading(false));
    return () => { alive = false; };
  }, [load]);

  async function action(work, message = 'Đã cập nhật lịch.', tone = 'success') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const toastKey = 'availability-planner-action';
    if (message !== null) notify.loading(tr('Đang xử lý…'), '', { key: toastKey, maxWaitMs: 30000 });
    try {
      await work();
      await load();
      await invalidateAdminDomains(queryClient, ['schedules']);
      if (message !== null) {
        setNotice(message);
        notify[tone](message, '', { key: toastKey, replace: true });
      }
    } catch (e) {
      setError(describeApiError(e).message);
      notify.apiError(e, tr('Chưa cập nhật được lịch'), { key: toastKey, replace: message !== null });
    } finally {
      setBusy(false);
    }
  }

  const mentorOptions = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const key = String(s.mentorId ?? s.mentorName ?? '');
      if (key && !map.has(key)) {
        map.set(key, s.mentorName || tr('Giáo viên'));
      }
    }
    const items = [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'vi'))
      .map(([value, label]) => ({ value, label }));
    return [{ value: 'ALL', label: tr('Tất cả Giáo viên') }, ...items];
  }, [slots, tr]);

  const filteredSlots = useMemo(() => (
    mentorFilter === 'ALL'
      ? slots
      : slots.filter((s) => String(s.mentorId ?? s.mentorName ?? '') === mentorFilter)
  ), [slots, mentorFilter]);

  const sessionMinutes = Number(splitMinutes);
  const sessionMinutesOk = Number.isInteger(sessionMinutes) && sessionMinutes >= 15 && sessionMinutes <= 240;
  const canSplit = (slot) => sessionMinutesOk && slot.isApproved && !slot.rejectedAt && !slot.changeRequestedAt && slot.bookedCount === 0 && slot.maxLearners === 1 && backendUtcDate(slot.startTime) > new Date() && (backendUtcDate(slot.endTime) - backendUtcDate(slot.startTime)) / 60000 > sessionMinutes;
  const splittable = filteredSlots.filter(canSplit);
  const pending = filteredSlots.filter((s) => !s.isApproved && !s.rejectedAt && backendUtcDate(s.startTime) > new Date());
  const pendingBatchGroups = useMemo(() => {
    const groups = new Map();
    for (const s of pending) {
      const key = s.batchGroupKey || `M${s.mentorId || 0}-${String(s.createdAt || '').slice(0, 19) || 'BATCH'}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          mentorName: s.mentorName || 'Giáo viên',
          createdAt: s.createdAt || null,
          items: [],
        });
      }
      groups.get(key).items.push(s);
    }
    return [...groups.values()];
  }, [pending]);
  const conflictIds = useMemo(() => findConflicts(slots), [slots]);
  const shortDate = (key) => key.split('-').reverse().slice(0, 2).join('/');

  const allCalendarEvents = useMemo(() => filteredSlots.map((s) => {
    const st = statusOf(s, conflictIds);
    const minutes = Math.round((backendUtcDate(s.endTime) - backendUtcDate(s.startTime)) / 60000);
    const startParts = toVnTimeParts(s.startTime);
    const endParts = toVnTimeParts(s.endTime);
    return {
      id: `av-${s.id}`,
      slot: s,
      dayKey: dayKey(s.startTime),
      startHour: startParts.hour,
      startMinute: startParts.minute,
      endHour: endParts.hour,
      endMinute: endParts.minute,
      title: `${s.mentorName || 'Giáo viên'}${minutes > 90 ? ` (${minutes}p)` : ''}`,
      detail: `${startParts.hhmm}–${endParts.hhmm} · ${tr(st.label)}`,
      statusLabel: st.label,
      tone: st.calTone,
      metaRows: [
        { label: 'Giáo viên', value: s.mentorName || 'Giáo viên' },
        { label: 'Trạng thái', value: tr(st.label) },
        { label: 'Thời lượng', value: fmt.duration(minutes) },
        s.isInCohort
          ? { label: 'Lớp nhóm', value: tr('Đã xếp buổi học') }
          : (s.bookedCount ?? 0) > 0 && { label: 'Học viên', value: trf('{0}/{1} học viên', { 0: s.bookedCount, 1: s.maxLearners ?? 4 }) },
        s.rejectionReason && { label: 'Lý do từ chối', value: s.rejectionReason },
      ].filter(Boolean),
    };
  }), [filteredSlots, conflictIds, tr, trf, fmt]);

  const review = (approve, ids, explicitReason) => action(async () => {
    const useReason = explicitReason ?? reason;
    for (let i = 0; i < ids.length; i += 50) {
      await api.post(
        `/admin/mentor-availabilities/review?approve=${approve}${approve ? '' : `&rejectionReason=${encodeURIComponent(useReason)}`}`,
        ids.slice(i, i + 50),
      );
    }
  });

  async function splitAll() {
    if (busy || !sessionMinutesOk || !splittable.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    let done = 0;
    const toastKey = 'availability-split-slots';
    notify.loading(trf('Đang chia {0} khung giờ…', { 0: splittable.length }), '', { key: toastKey, maxWaitMs: 45000 });
    try {
      for (const slot of splittable) {
        await api.post(`/admin/mentor-availabilities/${slot.id}/split`, { sessionMinutes });
        done += 1;
      }
      const msg = trf('Đã chia {0} khung thành các buổi {1} phút.', { 0: done, 1: sessionMinutes });
      setNotice(msg);
      notify.success(msg, '', { key: toastKey, replace: true });
      setSplitModalOpen(false);
    } catch (e) {
      setError(describeApiError(e).message);
      notify.apiError(e, tr('Chia khung giờ chưa hoàn tất'), { key: toastKey, replace: true });
    } finally {
      try {
        await load();
        await invalidateAdminDomains(queryClient, ['schedules']);
      } catch (e) { setError((cur) => cur || describeApiError(e).message); }
      setBusy(false);
    }
  }

  return (
    <Shell {...(embedded ? {} : { breadcrumb: tr('Duyệt lịch Giáo viên') })}>
      <div className={embedded ? 'space-y-3' : 'rp-container py-3 text-rp-text space-y-3'}>
        {!embedded && (
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-[20px] font-bold tracking-tight text-rp-text">{tr('Duyệt lịch Giáo viên')}</h1>
              <p className="text-[12.5px] text-rp-text-muted">{tr('Kiểm tra đăng ký và duyệt khung giờ dạy học cho Giáo viên.')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[220px]">
                <CustomSelect
                  size="sm"
                  searchable
                  label={tr('Lọc theo Giáo viên')}
                  value={mentorFilter}
                  onChange={(val) => { setMentorFilter(val || 'ALL'); setSelected([]); }}
                  options={mentorOptions}
                />
              </div>
              {splittable.length > 0 && (
                <Button variant="secondary" size="sm" icon={Scissors} onClick={() => setSplitModalOpen(true)}>
                  {trf('Chia khung gộp ({0})', { 0: splittable.length })}
                </Button>
              )}
              <Button variant="primary" size="sm" icon={CheckCircle2} onClick={() => setBatchReviewModalOpen(true)}>
                {trf('Duyệt hàng loạt ({0})', { 0: pending.length })}
              </Button>
            </div>
          </header>
        )}

        {embedded && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-[220px]">
              <CustomSelect
                size="sm"
                searchable
                label={tr('Lọc theo Giáo viên')}
                value={mentorFilter}
                onChange={(val) => { setMentorFilter(val || 'ALL'); setSelected([]); }}
                options={mentorOptions}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {splittable.length > 0 && (
                <Button variant="secondary" size="sm" icon={Scissors} onClick={() => setSplitModalOpen(true)}>
                  {trf('Chia khung gộp ({0})', { 0: splittable.length })}
                </Button>
              )}
              <Button variant="primary" size="sm" icon={CheckCircle2} onClick={() => setBatchReviewModalOpen(true)}>
                {trf('Duyệt hàng loạt ({0})', { 0: pending.length })}
              </Button>
            </div>
          </div>
        )}

        {error && <Banner tone="danger">{error}</Banner>}
        {notice && <Banner tone="success">{notice}</Banner>}
        {initialLoading ? (
          <div className="av-card p-6"><SakuraLoader variant="section" context="calendar" label={tr('Đang tải lịch dạy')} className="min-h-[180px]" delay={160} /></div>
        ) : loadError && slots.length === 0 ? (
          <div className="av-card p-5"><ContextualErrorState compact error={loadError} title={tr('Chưa tải được lịch tuần')} onRetry={() => action(load, null)} retrying={busy} /></div>
        ) : (
          <SakuraCalendar
            events={allCalendarEvents}
            anchorKey={week}
            onAnchorChange={setWeek}
            onRefresh={() => action(load, null)}
            refreshing={busy}
            renderEventActions={(ev, close) => {
              const s = ev.slot;
              if (!s) return null;
              const isFuture = backendUtcDate(s.startTime) > new Date();
              return (
                <div className="space-y-3 border-t border-rp-line pt-3">
                  {!s.isApproved && !s.rejectedAt && isFuture && (
                    <div className="space-y-2">
                      <Field label={tr('Lý do nếu từ chối')}>
                        <Input
                          value={adminRejectNote}
                          onChange={(e) => setAdminRejectNote(e.target.value)}
                          maxLength={500}
                          placeholder={tr('Nhập lý do từ chối khung giờ...')}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="primary" icon={CheckCircle2} disabled={busy} onClick={() => { close(); review(true, [s.id]); }}>
                          {tr('Duyệt khung này')}
                        </Button>
                        <Button size="sm" variant="danger" icon={XCircle} disabled={busy || !adminRejectNote.trim()} onClick={() => { close(); review(false, [s.id], adminRejectNote); setAdminRejectNote(''); }}>
                          {tr('Từ chối')}
                        </Button>
                      </div>
                    </div>
                  )}
                  {canSplit(s) && (
                    <Button size="sm" variant="secondary" icon={Scissors} disabled={busy} onClick={() => { close(); action(() => api.post(`/admin/mentor-availabilities/${s.id}/split`, { sessionMinutes }), trf('Đã chia khung giờ thành các buổi {0} phút.', { 0: sessionMinutes })); }}>
                      {trf('Chia thành buổi {0} phút', { 0: sessionMinutes })}
                    </Button>
                  )}
                </div>
              );
            }}
          />
        )}

        {/* Batch Review Modal */}
        {batchReviewModalOpen && (
          <Modal
            open={batchReviewModalOpen}
            onClose={() => setBatchReviewModalOpen(false)}
            title={trf('Lịch chờ duyệt ({0})', { 0: pending.length })}
            description={tr('Chọn các khung giờ để duyệt hoặc từ chối hàng loạt.')}
            size="lg"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-[200px] flex-1">
                  <Field label={tr('Lý do từ chối (khi từ chối)')}>
                    <Input
                      value={reason}
                      maxLength={1000}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={tr('Nhập lý do nếu từ chối các khung đã chọn…')}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || !selected.length}
                    onClick={() => review(true, selected)}
                  >
                    {tr('Duyệt đã chọn')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy || !selected.length || !reason.trim()}
                    onClick={() => review(false, selected)}
                  >
                    {tr('Từ chối đã chọn')}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy || !pending.length}
                    onClick={() => action(async () => {
                      for (let i = 0; i < pending.length; i += 50) {
                        await api.post('/admin/mentor-availabilities/review?approve=true', pending.slice(i, i + 50).map((s) => s.id));
                      }
                    })}
                  >
                    {trf('Duyệt tất cả ({0})', { 0: pending.length })}
                  </Button>
                </div>
              </div>

              <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                {pendingBatchGroups.length === 0 ? (
                  <p className="rounded-xl border border-rp-line p-6 text-center text-[13px] text-rp-text-muted">{tr('Hiện không có khung giờ nào chờ duyệt.')}</p>
                ) : pendingBatchGroups.map((group) => {
                  const groupIds = group.items.map((x) => x.id);
                  const allGroupSelected = groupIds.every((id) => selected.includes(id));
                  return (
                    <div key={group.key} className="overflow-hidden rounded-xl border border-rp-line bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line/80 bg-[#FAF7F9] px-3.5 py-2 text-[12px]">
                        <div className="inline-flex items-center gap-2 font-semibold text-rp-text">
                          <Checkbox
                            label={group.mentorName}
                            checked={allGroupSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelected((cur) => [...new Set([...cur, ...groupIds])]);
                              } else {
                                setSelected((cur) => cur.filter((id) => !groupIds.includes(id)));
                              }
                            }}
                          />
                          <span className="rounded-full bg-rp-brand-tint px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong">
                            {trf('Đợt gửi {0} khung giờ', { 0: group.items.length })}
                          </span>
                        </div>
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => review(true, groupIds)}
                        >
                          {trf('Duyệt cả đợt ({0})', { 0: groupIds.length })}
                        </Button>
                      </div>
                      <div className="divide-y divide-rp-line/60 px-3.5 py-1.5">
                        {group.items.map((s) => (
                          <div key={s.id} className="py-1.5">
                            <Checkbox
                              checked={selected.includes(s.id)}
                              onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))}
                              label={`${labels[new Date(`${dayKey(s.startTime)}T12:00:00+07:00`).getUTCDay()]} ${shortDate(dayKey(s.startTime))} · ${clock(s.startTime)}–${clock(s.endTime)}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal>
        )}

        {/* Split Legacy Slots Modal */}
        {splitModalOpen && (
          <Modal
            open={splitModalOpen}
            onClose={() => setSplitModalOpen(false)}
            title={tr('Chia khung rảnh theo thời lượng buổi')}
            description={tr('Áp dụng cho các khung đã duyệt, chưa xếp lớp và dài hơn thời lượng buổi.')}
            size="md"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="w-36">
                  <Field label={tr('Phút / buổi')}>
                    <Input
                      type="number"
                      required
                      min="15"
                      max="240"
                      value={splitMinutes}
                      onChange={(e) => setSplitMinutes(e.target.value)}
                    />
                  </Field>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy || !sessionMinutesOk || !splittable.length}
                  onClick={splitAll}
                >
                  {trf('Chia tất cả ({0})', { 0: splittable.length })}
                </Button>
              </div>
              <div className="max-h-[42vh] divide-y divide-rp-line overflow-y-auto rounded-xl border border-rp-line">
                {splittable.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[12.5px]">
                    <span>
                      {s.mentorName || tr('Giáo viên')} · {labels[new Date(`${dayKey(s.startTime)}T12:00:00+07:00`).getUTCDay()]} {shortDate(dayKey(s.startTime))} · {clock(s.startTime)}–{clock(s.endTime)}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy || !sessionMinutesOk}
                      onClick={() => action(() => api.post(`/admin/mentor-availabilities/${s.id}/split`, { sessionMinutes }))}
                    >
                      {tr('Chia khung này')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Shell>
  );
}

export default function AvailabilityPlanner({ admin = false, embedded = false }) {
  return admin
    ? <AdminAvailabilityWorkspace embedded={embedded} />
    : <MentorInteractiveAvailabilityWorkspace embedded={embedded} />;
}
