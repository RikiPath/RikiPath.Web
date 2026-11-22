import { backendUtcDate, planMentorAvailability } from '@/utils/mentorSchedule';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell, MentorShell } from '@/layouts';
import { api } from '@/api/client';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import SakuraCalendar from './SakuraCalendar';
import {
  mondayOfDateKey,
  shiftDateKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import '@/pages/shared/studyCourses.css';
import './availabilityPlanner.css';
import {
  CalendarDays,
  Clock,
  Repeat,
  RefreshCw,
  Send,
  Info,
  Link2,
  ChevronDown,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Scissors,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';

const dayKey = value => toVnDateKey(value);
const clock = value => toVnTimeParts(value).hhmm;
const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const JA_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const monday = () => mondayOfDateKey(toVnDateKey(new Date()));

/**
 * Status of one availability slot, most specific first. Mentor availability (a time the Mentor offers)
 * stays visually distinct from a slot already used by a cohort session (tone `booked`).
 */
function statusOf(s, conflictIds) {
  if (s.rejectedAt) return { label: 'Bị từ chối', tone: 'rejected', calTone: 'cancelled' };
  if (s.cancelRequestedAt && !s.cancelRejectedAt) return { label: 'Chờ duyệt hủy', tone: 'pending', calTone: 'pending' };
  if (s.changeRequestedAt && !s.changeResolution) return { label: 'Chờ duyệt điều chỉnh', tone: 'pending', calTone: 'pending' };
  if (!s.isApproved) return { label: 'Chờ Admin duyệt', tone: 'pending', calTone: 'pending' };
  if (conflictIds?.has(s.id)) return { label: 'Xung đột lịch', tone: 'rejected', calTone: 'conflict' };
  if (s.isInCohort || (s.bookedCount ?? 0) > 0) return { label: 'Đã xếp lớp', tone: 'booked', calTone: 'booked' };
  if (s.publishedAt) return { label: 'Đã công bố', tone: 'approved', calTone: 'open' };
  return { label: 'Đã duyệt', tone: 'approved', calTone: 'approved' };
}

/** Ids of non-rejected slots that overlap another non-rejected slot of the same Mentor. */
function findConflicts(slots) {
  const ids = new Set();
  const byMentor = new Map();
  slots.forEach((s) => {
    if (s.rejectedAt) return;
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

export default function AvailabilityPlanner({ admin = false, embedded = false }) {
  const { tr, trf, locale, fmt } = useLocale();
  const labels = locale === 'ja' ? JA_DAYS : VI_DAYS;
  const Shell = embedded ? Fragment : admin ? AdminShell : MentorShell;
  const [slots, setSlots] = useState([]), [selected, setSelected] = useState([]);
  const [calendar, setCalendar] = useState(null), [calendarError, setCalendarError] = useState(null);
  const [week, setWeek] = useState(monday), [days, setDays] = useState([1, 3, 5]);
  const [error, setError] = useState(''), [loadError, setLoadError] = useState(null), [initialLoading, setInitialLoading] = useState(true), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [repeating, setRepeating] = useState(true), [reason, setReason] = useState('');
  const [draft, setDraft] = useState({ date: '', from: '', to: '', until: '' });
  const [splitMinutes, setSplitMinutes] = useState('90');
  const setField = (name, value) => setDraft((current) => ({ ...current, [name]: value }));
  const load = useCallback(async () => {
    setLoadError(null);
    const response = await api.get(admin ? '/admin/mentor-availabilities' : '/mentor/availability');
    setSlots(response.result || []); setSelected([]);
    if (!admin) {
      const query = new URLSearchParams(window.location.search);
      if (query.has('code') && query.has('state')) {
        const payload = { code: query.get('code'), state: query.get('state') };
        query.delete('code'); query.delete('state'); query.delete('scope');
        window.history.replaceState(null, '', window.location.pathname + (query.size ? '?' + query.toString() : ''));
        await api.post('/mentor/calendar/callback', payload);
      }
      // Google Calendar status is independent from the schedule: a failure here must not hide the slots.
      try {
        const status = await api.get('/mentor/calendar');
        setCalendar(status.result); setCalendarError(null);
      } catch (e) {
        setCalendarError(e);
      }
    }
  }, [admin]);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setInitialLoading(true);
        return load();
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(e);
        setError(describeApiError(e).message);
      })
      .finally(() => alive && setInitialLoading(false));
    return () => { alive = false; };
  }, [load]);
  async function action(work, message = 'Đã cập nhật lịch.', tone = 'success') {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    const toastKey = 'availability-planner-action';
    if (message !== null) {
      notify.loading('Đang xử lý…', '', { key: toastKey, maxWaitMs: 30000 });
    }
    try {
      await work();
      await load();
      if (message !== null) {
        setNotice(message);
        notify[tone](message, '', { key: toastKey, replace: true });
      }
    } catch (e) {
      setError(describeApiError(e).message);
      notify.apiError(e, 'Chưa cập nhật được lịch', { key: toastKey, replace: message !== null });
    } finally { setBusy(false); }
  }
  const plan = useMemo(() => planMentorAvailability({ ...draft, repeating, days, slots, now: new Date() }), [draft, repeating, days, slots]);
  const sessionMinutes = Number(splitMinutes);
  const sessionMinutesOk = Number.isInteger(sessionMinutes) && sessionMinutes >= 15 && sessionMinutes <= 240;
  const canSplit = slot => sessionMinutesOk && slot.isApproved && !slot.rejectedAt && !slot.changeRequestedAt && slot.bookedCount === 0 && slot.maxLearners === 1 && backendUtcDate(slot.startTime) > new Date() && (backendUtcDate(slot.endTime) - backendUtcDate(slot.startTime)) / 60000 > sessionMinutes;
  const splittable = slots.filter(canSplit);
  const pending = slots.filter(s => !s.isApproved && !s.rejectedAt && backendUtcDate(s.startTime) > new Date());
  const weekStart = mondayOfDateKey(week);
  const weekEnd = shiftDateKey(weekStart, 6);
  const visible = slots.filter(s => {
    const dk = dayKey(s.startTime);
    return dk >= weekStart && dk <= weekEnd;
  });

  const conflictIds = useMemo(() => findConflicts(slots), [slots]);
  const allCalendarEvents = useMemo(() => slots.map(s => {
    const st = statusOf(s, conflictIds);
    const minutes = Math.round((backendUtcDate(s.endTime) - backendUtcDate(s.startTime)) / 60000);
    const startParts = toVnTimeParts(s.startTime);
    const endParts = toVnTimeParts(s.endTime);
    const slotDay = dayKey(s.startTime);
    return {
      id: `av-${s.id}`,
      slot: s,
      dayKey: slotDay,
      startHour: startParts.hour,
      startMinute: startParts.minute,
      endHour: endParts.hour,
      endMinute: endParts.minute,
      title: admin ? (s.mentorName || 'Mentor') : `${startParts.hhmm}–${endParts.hhmm}`,
      detail: tr(s.rejectedAt
        ? 'Admin đã từ chối khung giờ này.'
        : conflictIds.has(s.id)
          ? 'Khung giờ trùng với một khung khác. Hãy xóa hoặc xin điều chỉnh một trong hai.'
          : s.isInCohort
            ? 'Khung giờ đã được dùng cho buổi học của lớp nhóm. Điều chỉnh qua yêu cầu dời lịch của lớp.'
            : !s.isApproved
              ? 'Khung giờ chỉ được dùng để xếp lớp sau khi Admin duyệt.'
              : s.publishedAt
                ? 'Khung giờ đã công bố, có thể được dùng để mở lớp nhóm.'
                : 'Đã duyệt, chưa công bố để mở lớp.'),
      statusLabel: st.label,
      tone: st.calTone,
      metaRows: [
        admin && { label: 'Cố vấn', value: s.mentorName || 'Mentor' },
        { label: 'Trạng thái', value: tr(st.label) },
        { label: 'Thời lượng', value: fmt.duration(minutes) },
        s.isInCohort
          ? { label: 'Lớp nhóm', value: tr('Đã xếp buổi học') }
          : (s.bookedCount ?? 0) > 0 && { label: 'Học viên', value: trf('{0}/{1} học viên', { 0: s.bookedCount, 1: s.maxLearners ?? 4 }) },
        s.publishedAt && { label: 'Công bố lúc', value: fmt.dateTime(backendUtcDate(s.publishedAt)) },
        s.rejectionReason && { label: 'Lý do từ chối', value: s.rejectionReason },
        s.cancelRejectedAt && s.cancelRejectionReason && { label: 'Admin không duyệt hủy', value: s.cancelRejectionReason },
        s.changeResolution && { label: 'Kết quả điều chỉnh', value: s.changeResolution },
      ].filter(Boolean),
    };
  }), [slots, admin, conflictIds, tr, trf, fmt]);

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
    const targets = splittable;
    setBusy(true); setError(''); setNotice('');
    let done = 0;
    const toastKey = 'availability-split-slots';
    notify.loading(trf('Đang chia {0} khung giờ…', { 0: targets.length }), '', { key: toastKey, maxWaitMs: 45000 });
    try {
      for (const slot of targets) {
        await api.post(`/admin/mentor-availabilities/${slot.id}/split`, { sessionMinutes });
        done += 1;
      }
      const msg = trf('Đã chia {0} khung thành các buổi {1} phút.', { 0: done, 1: sessionMinutes });
      setNotice(msg);
      notify.success(msg, '', { key: toastKey, replace: true });
    } catch (e) {
      const errMsg = describeApiError(e).message;
      const msg = done ? trf('Đã chia {0}/{1} khung rồi dừng: {2}', { 0: done, 1: targets.length, 2: errMsg }) : errMsg;
      setError(msg);
      notify.error('Chia khung giờ chưa hoàn tất', msg, { key: toastKey, replace: true });
    } finally {
      try { await load(); } catch (e) { setError(current => current || describeApiError(e).message); }
      setBusy(false);
    }
  }
  const shortDate = key => key.split('-').reverse().slice(0, 2).join('/');
  const [slotChangeReason, setSlotChangeReason] = useState('');
  const [adminRejectNote, setAdminRejectNote] = useState('');

  return <Shell {...(embedded ? {} : { breadcrumb: 'Lịch Mentor' })}><main className="availability-page">
    <header className="av-page-header">
      <div><span className="av-eyebrow">{tr('QUẢN LÝ LỊCH')}</span><h1>{admin ? tr('Duyệt lịch Mentor') : tr('Lịch rảnh của tôi')}</h1>
        <p>{admin ? tr('Kiểm tra đăng ký và sắp xếp khung giờ dạy cho Mentor.') : tr('Chủ động sắp xếp thời gian rảnh, xem theo Ngày / Tuần / Tháng và theo dõi lịch đã đăng ký.')}</p>
      </div>
      <span className="av-timezone"><Clock size={15} />{' '}{tr('Giờ Việt Nam')}{' '}<span>GMT+7</span></span>
    </header>
    {error && <div className="av-alert av-alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
    {notice && <div className="av-alert av-alert-success" role="status"><Info size={18} /><span>{notice}</span></div>}
    {!admin && <form className="av-card av-register" onSubmit={e => { e.preventDefault(); if (!plan.ready) return;
      action(async () => { await api.post('/mentor/availability', { startTime: new Date(`${draft.date}T${draft.from}:00+07:00`).toISOString(),
        endTime: new Date(`${draft.date}T${draft.to}:00+07:00`).toISOString(), repeatUntil: repeating ? draft.until : null, weekdays: repeating ? days : null });
      setDraft({ date: '', from: '', to: '', until: '' }); }, trf('Đã gửi {0} buổi. Vui lòng chờ Admin duyệt.', { 0: plan.rows.length })); }}>
      <div className="av-card-heading"><span className="av-icon"><CalendarDays size={21} /></span><div><h2>{tr('Đăng ký lịch rảnh')}</h2><p>{tr('Chọn một khung giờ, nhấp trực tiếp trên lưới lịch hoặc đăng ký lặp lại nhiều tuần.')}</p></div></div>
      <fieldset disabled={busy} className="av-register-fields">
        <div className="av-register-grid">
          <div className="av-time-block">
            <h3>{tr('Thời gian rảnh')}</h3>
            <div className="av-date-time-grid">
              <label className="av-field"><span>{tr('Ngày bắt đầu')}</span><input name="date" type="date" min={dayKey(new Date())} required value={draft.date} onChange={e => setField('date', e.target.value)} /></label>
              <label className="av-field"><span>{tr('Từ giờ')}</span><input name="from" type="time" required value={draft.from} onChange={e => setField('from', e.target.value)} /></label>
              <label className="av-field"><span>{tr('Đến giờ')}</span><input name="to" type="time" required value={draft.to} onChange={e => setField('to', e.target.value)} /></label>
            </div>
            <div className="av-inline-tip"><Info size={15} /><p>{tr('Khung giờ chỉ mở đặt lịch sau khi được Admin duyệt.')}</p></div>
          </div>
          <div className="av-repeat-block">
            <label className="av-toggle"><input type="checkbox" checked={repeating} onChange={e => setRepeating(e.target.checked)} /><span className="av-toggle-track" aria-hidden="true" /><span><Repeat size={16} />{' '}{tr('Lặp theo tuần')}</span></label>
            {repeating ? <div className="av-repeat-options">
              <div className="av-presets"><span>{tr('Chọn nhanh')}</span>{[[1, 3, 5], [2, 4, 6]].map((preset, i) => <button type="button" key={i} className={days.length === 3 && preset.every(d => days.includes(d)) ? 'is-selected' : ''} aria-pressed={days.length === 3 && preset.every(d => days.includes(d))} onClick={() => setDays(preset)}>{preset.map((d) => labels[d]).join(' · ')}</button>)}</div>
              <div className="av-weekdays" role="group" aria-label={tr('Các thứ lặp lại')}>{[1, 2, 3, 4, 5, 6, 0].map(d => <label key={d} className={days.includes(d) ? 'is-selected' : ''}><input type="checkbox" checked={days.includes(d)} onChange={e => setDays(e.target.checked ? [...days, d] : days.filter(x => x !== d))} /><span>{labels[d]}</span></label>)}</div>
              <label className="av-field av-until"><span>{tr('Lặp đến ngày')}</span><input type="date" name="until" required min={draft.date || dayKey(new Date())} value={draft.until} onChange={e => setField('until', e.target.value)} /></label>
            </div> : <p className="av-repeat-off">{tr('Chỉ đăng ký khung giờ trong ngày đã chọn.')}</p>}
          </div>
        </div>
        <div className={`av-preview${plan.error ? ' is-error' : ''}`} aria-live="polite">
          <strong>{plan.error || (plan.ready ? trf('Sẽ tạo {0} buổi chờ duyệt', { 0: plan.rows.length }) : tr('Chọn ngày và giờ để xem các buổi sẽ được tạo.'))}</strong>
          {plan.rows.length > 0 && <div className="av-preview-dates">{(plan.overlapping.length ? plan.overlapping : plan.rows).slice(0, 12).map(day => <span key={day}>{labels[new Date(`${day}T12:00:00+07:00`).getUTCDay()]} {shortDate(day)}</span>)}
            {(plan.overlapping.length ? plan.overlapping : plan.rows).length > 12 && <span>{trf('+{0} buổi', { 0: (plan.overlapping.length ? plan.overlapping : plan.rows).length - 12 })}</span>}</div>}
        </div>
        <div className="av-form-footer"><span><span className="av-dot av-dot-pending" /> {plan.ready ? trf('{0} buổi sẽ chờ Admin duyệt', { 0: plan.rows.length }) : tr('Đăng ký mới sẽ ở trạng thái chờ duyệt')}</span><button className="av-button av-button-primary" disabled={busy || !plan.ready}><Send size={16} />{busy ? tr('Đang gửi…') : tr('Gửi đăng ký')}</button></div>
      </fieldset>
    </form>}

    {initialLoading ? (
      <div className="av-card p-6"><SakuraLoader variant="section" context="calendar" label={tr('Đang tải lịch dạy')} className="min-h-[180px]" delay={160} /></div>
    ) : loadError && slots.length === 0 ? (
      <div className="av-card p-5">
        <ContextualErrorState compact error={loadError} title={tr('Chưa tải được lịch tuần')} onRetry={() => action(load, null)} retrying={busy} />
      </div>
    ) : (
      <SakuraCalendar
        events={allCalendarEvents}
        anchorKey={week}
        onAnchorChange={setWeek}
        onRefresh={() => action(load, null)}
        refreshing={busy}
        onEmptySlotClick={!admin ? ({ date, from, to }) => {
          setRepeating(false);
          setDraft((prev) => ({ ...prev, date, from, to }));
          notify.info(trf('Đã chọn nhanh {0} · {1}–{2}', { 0: shortDate(date), 1: from, 2: to }), 'Kiểm tra biểu mẫu phía trên và bấm Gửi đăng ký.', { key: 'av-quick-pick' });
        } : undefined}
        renderEventActions={(ev, close) => {
          const s = ev.slot;
          if (!s) return null;
          const isFuture = backendUtcDate(s.startTime) > new Date();
          if (admin) {
            return (
              <div className="space-y-3 border-t border-rp-line pt-3">
                {!s.isApproved && !s.rejectedAt && isFuture && (
                  <div className="space-y-2">
                    <label className="block text-[12px] font-medium text-rp-text-2">
                      {tr('Lý do nếu từ chối')}
                      <input
                        value={adminRejectNote}
                        onChange={(e) => setAdminRejectNote(e.target.value)}
                        maxLength={500}
                        placeholder={tr('Nhập lý do từ chối khung giờ...')}
                        className="mt-1 h-9 w-full rounded-lg border border-rp-line px-3 text-[13px]"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => { close(); review(true, [s.id]); }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />{' '}{tr('Duyệt khung này')}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !adminRejectNote.trim()}
                        onClick={() => { close(); review(false, [s.id], adminRejectNote); setAdminRejectNote(''); }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-deep disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />{' '}{tr('Từ chối')}
                      </button>
                    </div>
                  </div>
                )}
                {canSplit(s) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { close(); action(() => api.post(`/admin/mentor-availabilities/${s.id}/split`, { sessionMinutes }), trf('Đã chia khung giờ thành các buổi {0} phút.', { 0: sessionMinutes })); }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-brand-border bg-rp-brand-tint px-3.5 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft disabled:opacity-50"
                  >
                    <Scissors className="h-4 w-4" />{' '}{trf('Chia thành buổi {0} phút', { 0: sessionMinutes })}
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-3 border-t border-rp-line pt-3">
              {!s.isApproved && (s.bookedCount ?? 0) === 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { close(); action(() => api.delete(`/mentor/availability/${s.id}`), 'Đã xóa đăng ký.'); }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-[12px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />{' '}{tr('Xóa khung chưa duyệt')}
                </button>
              )}
              {s.isApproved && !s.changeRequestedAt && !s.cancelRequestedAt && isFuture && (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!slotChangeReason.trim()) return;
                    close();
                    action(
                      () => api.post(`/mentor-schedule/slots/${s.id}/change`, { reason: slotChangeReason.trim() }),
                      'Đã gửi yêu cầu điều chỉnh cho Admin.',
                    ).then(() => setSlotChangeReason(''));
                  }}
                >
                  <label className="block text-[12px] font-medium text-rp-text-2">
                    {tr('Xin điều chỉnh / hủy khung đã duyệt')}
                    <input
                      required
                      maxLength={1000}
                      value={slotChangeReason}
                      onChange={(e) => setSlotChangeReason(e.target.value)}
                      placeholder={tr('Nhập lý do cần dời hoặc hủy khung giờ')}
                      className="mt-1 h-9 w-full rounded-lg border border-rp-line px-3 text-[13px]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || !slotChangeReason.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-deep disabled:opacity-50"
                  >
                    {tr('Gửi yêu cầu cho Admin')}
                  </button>
                </form>
              )}
            </div>
          );
        }}
      />
    )}
    {admin && <section className="course-box"><h2>{trf('Lịch chờ duyệt ({0})', { 0: pending.length })}</h2>
      <p>{tr('Duyệt tất cả áp dụng các lịch đang chờ hiển thị bên dưới, từng đợt tối đa 50 lịch.')}</p>
      <label>{tr('Lý do từ chối')}{' '}<input value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></label>
      <div className="course-buttons"><button disabled={busy || !selected.length} onClick={() => review(true, selected)}>{tr('Duyệt đã chọn')}</button><button disabled={busy || !selected.length || !reason.trim()} onClick={() => review(false, selected)}>{tr('Từ chối đã chọn')}</button>
        <button disabled={busy || !pending.length} onClick={() => action(async () => { for (let i = 0; i < pending.length; i += 50) await api.post('/admin/mentor-availabilities/review?approve=true', pending.slice(i, i + 50).map(s => s.id)); })}>{trf('Duyệt tất cả ({0})', { 0: pending.length })}</button></div>
      {pending.map(s => <label className="course-row" key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(e.target.checked ? [...selected, s.id] : selected.filter(x => x !== s.id))} /> {s.mentorName || 'Mentor'} · {labels[new Date(`${dayKey(s.startTime)}T12:00:00+07:00`).getUTCDay()]} {shortDate(dayKey(s.startTime))} · {clock(s.startTime)}–{clock(s.endTime)}</label>)}
    </section>}
    {admin && <section className="course-box"><h2>{tr('Chia khung rảnh theo thời lượng gói')}</h2><p>{tr('Mỗi buổi 90 phút. Ví dụ khung 08:00–12:30 thành ba buổi. Chia tất cả áp dụng mọi khung đã duyệt, chưa đặt, chưa có yêu cầu điều chỉnh, còn ở tương lai và dài hơn 90 phút. Phần lẻ được giữ lại.')}</p>
      <div className="course-buttons av-split-bar"><label>{tr('Phút/buổi')}{' '}<input type="number" required min="15" max="240" value={splitMinutes} onChange={e => setSplitMinutes(e.target.value)} /></label>
        <button type="button" className="is-primary" disabled={busy || !sessionMinutesOk || !splittable.length} onClick={splitAll}>{trf('Chia tất cả ({0})', { 0: splittable.length })}</button></div>
      {visible.filter(canSplit).map(s => <form className="course-row course-form" key={s.id} onSubmit={e => { e.preventDefault(); action(() => api.post('/admin/mentor-availabilities/' + s.id + '/split', { sessionMinutes })); }}>
        <p>{s.mentorName || 'Mentor'} · {labels[new Date(`${dayKey(s.startTime)}T12:00:00+07:00`).getUTCDay()]} {shortDate(dayKey(s.startTime))} · {clock(s.startTime)}–{clock(s.endTime)}</p><button disabled={busy || !sessionMinutesOk}>{tr('Chia khung này')}</button>
      </form>)}
    </section>}
    {!admin && <section className="av-card av-registrations"><div className="av-section-title"><div><h2>{tr('Đăng ký trong tuần')}</h2><p>{tr('Theo dõi trạng thái và gửi yêu cầu điều chỉnh khi cần.')}</p></div><span className="av-count">{initialLoading || (loadError && slots.length === 0) ? '—' : visible.length}</span></div>
      {initialLoading ? (
        <SakuraLoader variant="section" size={32} context="calendar" className="min-h-[80px] py-3" delay={160} />
      ) : loadError && slots.length === 0 ? (
        <ContextualErrorState variant="inline" error={loadError} title={tr('Chưa tải được danh sách đăng ký')} onRetry={() => action(load, null)} retrying={busy} />
      ) : visible.length === 0 ? <div className="av-empty-list">{tr('Chưa có đăng ký trong tuần đang xem.')}</div> : <div className="av-registration-list">{visible.map(s => { const status = statusOf(s, conflictIds); return <article className="av-registration" key={s.id}>
        <div className="av-registration-top"><span className="av-list-icon"><CalendarDays size={18} /></span><div className="av-registration-date"><strong>{shortDate(dayKey(s.startTime))} <span>·</span> {clock(s.startTime)} – {clock(s.endTime)}</strong>{s.rejectionReason && <p>{s.rejectionReason}</p>}{s.changeRequestedAt && <p>{tr('Yêu cầu điều chỉnh đang chờ Admin xử lý.')}</p>}</div><span className={`av-status av-status-${status.tone}`}>{tr(status.label)}</span>
          {!s.isApproved && s.bookedCount === 0 && <button type="button" className="av-icon-button av-delete" aria-label={tr('Xóa đăng ký')} title={tr('Xóa đăng ký')} disabled={busy} onClick={() => action(() => api.delete(`/mentor/availability/${s.id}`), 'Đã xóa đăng ký.')}><Trash2 size={16} /></button>}
        </div>
        {s.isApproved && !s.changeRequestedAt && backendUtcDate(s.startTime) > new Date() && <details className="av-change"><summary>{tr('Yêu cầu điều chỉnh')}{' '}<ChevronDown size={14} /></summary><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action(() => api.post(`/mentor-schedule/slots/${s.id}/change`, { reason: f.get('reason') }), 'Đã gửi yêu cầu điều chỉnh cho Admin.'); }}><label className="av-field"><span>{tr('Lý do điều chỉnh')}</span><input name="reason" maxLength={1000} required placeholder={tr('Nhập lý do cần hủy hoặc dời lịch')} /></label><button className="av-button" disabled={busy}>{tr('Gửi yêu cầu')}</button></form></details>}
      </article>; })}</div>}
    </section>}
    {!admin && (() => {
      const sync = calendarError
        ? { label: 'Chưa kiểm tra được', tone: 'av-status-rejected', text: 'Chưa tải được trạng thái Google Calendar. Lịch rảnh và lịch dạy trên RikiPath không bị ảnh hưởng.' }
        : !calendar
          ? { label: 'Đang kiểm tra', tone: 'av-status-neutral', text: 'Đang kiểm tra trạng thái kết nối…' }
          : !calendar.configured
            ? { label: 'Chưa hỗ trợ', tone: 'av-status-neutral', text: 'Đồng bộ Google Calendar chưa được bật cho hệ thống. Bạn vẫn đăng ký và quản lý lịch đầy đủ tại RikiPath.' }
            : !calendar.connected
              ? { label: 'Chưa kết nối', tone: 'av-status-neutral', text: 'Kết nối để thấy lịch dạy trên lịch cá nhân. Đồng bộ một chiều từ RikiPath.' }
              : calendar.lastSyncedAt
                ? { label: 'Đã đồng bộ', tone: 'av-status-approved', text: 'Các buổi học đã xếp lớp được đồng bộ một chiều từ RikiPath.' }
                : { label: 'Chờ đồng bộ lần đầu', tone: 'av-status-pending', text: 'Đã kết nối. Hệ thống sẽ đồng bộ các buổi học đã xếp lớp trong ít phút.' };
      return (
        <section className="av-card av-google" aria-labelledby="av-google-title">
          <span className="av-google-icon"><CalendarDays size={23} /></span>
          <div className="av-google-copy">
            <h2 id="av-google-title">Google Calendar <span className={`av-status ${sync.tone}`}>{tr(sync.label)}</span></h2>
            <p>{tr(sync.text)}</p>
            <p className="av-sync-note">{tr('Đồng bộ Google Calendar không thay thế việc Admin duyệt lịch: khung chờ duyệt hoặc bị từ chối không được đưa lên Google Calendar.')}</p>
            {calendar?.connected && calendar.lastSyncedAt && <span className="av-sync-time">{trf('Đồng bộ gần nhất: {0}', { 0: fmt.dateTime(backendUtcDate(calendar.lastSyncedAt)) })}</span>}
          </div>
          {calendar?.configured && !calendarError && <div className="av-google-actions">{calendar.connected ? <><button className="av-button" disabled={busy} onClick={() => action(() => api.post('/mentor/calendar/sync'), 'Đã đồng bộ Google Calendar.')}><RefreshCw size={15} />{tr('Đồng bộ ngay')}</button><button className="av-text-button" disabled={busy} onClick={() => action(() => api.delete('/mentor/calendar'), 'Đã ngắt kết nối Google Calendar.')}>{tr('Ngắt kết nối')}</button></> : <button className="av-button" disabled={busy} onClick={() => action(async () => { const r = await api.post('/mentor/calendar/connect'); window.location.assign(r.result.url); }, 'Đang chuyển tới Google Calendar…', 'info')}><Link2 size={15} />{tr('Kết nối')}</button>}</div>}
        </section>
      );
    })()}
  </main></Shell>;
}
