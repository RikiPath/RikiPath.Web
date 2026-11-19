import { parseUtcDate } from '@/utils/vnDateTime.js';

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const SHORT_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const FULL_DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const CALENDAR_TONES = Object.freeze({
  session: {
    label: 'Buổi lớp nhóm',
    card: 'border-l-[3.5px] border-l-[#AD3155] border border-[#F2CAD7] bg-[#FFF5F8] text-[#6F1934]',
    pill: 'bg-[#FFF0F5] text-[#9A2346] border border-[#F2CAD7]',
    dot: 'bg-[#AD3155]',
  },
  present: {
    label: 'Đã hoàn thành',
    card: 'border-l-[3.5px] border-l-[#266945] border border-[#BDE2CA] bg-[#EFFAF3] text-[#1C4D33]',
    pill: 'bg-[#E8F7EE] text-[#225C3D] border border-[#BDE2CA]',
    dot: 'bg-[#266945]',
  },
  open: {
    label: 'Khung rảnh còn trống',
    card: 'border-l-[3.5px] border-l-[#16795C] border border-[#B2E3D4] bg-[#ECFDF7] text-[#125541]',
    pill: 'bg-[#E6FAF3] text-[#156E53] border border-[#B2E3D4]',
    dot: 'bg-[#16795C]',
  },
  approved: {
    label: 'Đã duyệt · chưa công bố',
    card: 'border-l-[3.5px] border-l-[#2563A6] border border-[#BFD6EE] bg-[#F1F7FD] text-[#1D4875]',
    pill: 'bg-[#EAF3FC] text-[#1F5490] border border-[#BFD6EE]',
    dot: 'bg-[#2563A6]',
  },
  booked: {
    label: 'Đã xếp lớp / có lịch',
    card: 'border-l-[3.5px] border-l-[#6B358A] border border-[#DFC6EC] bg-[#F7EFFB] text-[#4C2263]',
    pill: 'bg-[#F4E9F8] text-[#5C2E73] border border-[#DFC6EC]',
    dot: 'bg-[#6B358A]',
  },
  pending: {
    label: 'Chờ duyệt / điều chỉnh',
    card: 'border-l-[3.5px] border-l-[#C47B16] border border-[#F3D7A4] bg-[#FFF9ED] text-[#7D4B07]',
    pill: 'bg-[#FFF5E2] text-[#8E5306] border border-[#F3D7A4]',
    dot: 'bg-[#C47B16]',
  },
  conflict: {
    label: 'Xung đột lịch',
    card: 'border-l-[3.5px] border-l-[#B42318] border border-[#F5B7B1] bg-[#FEF3F2] text-[#8A1C13]',
    pill: 'bg-[#FDECEC] text-[#B42318] border border-[#F5B7B1]',
    dot: 'bg-[#B42318]',
  },
  cancelled: {
    label: 'Đã hủy / từ chối',
    card: 'border-l-[3.5px] border-l-[#8B7D86] border border-[#E3D9DE] bg-[#F7F3F5] text-[#64575F] opacity-85',
    pill: 'bg-[#F3EEF1] text-[#64575F] border border-[#E3D9DE]',
    dot: 'bg-[#8B7D86]',
  },
  selected: {
    label: 'Đang chọn',
    card: 'border-l-[3.5px] border-l-[#AD3155] border border-[#E6B0C2] bg-[#FCEEF3] text-[#7B1E3B]',
    pill: 'bg-[#FCEEF3] text-[#9A2346] border border-[#E6B0C2]',
    dot: 'bg-[#AD3155]',
  },
  ghost: {
    label: 'Dự kiến',
    card: 'border border-dashed border-[#D8A3B6] bg-white/85 text-[#755F6C]',
    pill: 'bg-white border border-dashed border-[#D8A3B6] text-[#755F6C]',
    dot: 'bg-[#D8A3B6]',
  },
});

export function getToneMeta(tone) {
  return CALENDAR_TONES[tone] || CALENDAR_TONES.session;
}

/** Formats a Date or backend UTC ISO string into YYYY-MM-DD in Asia/Ho_Chi_Minh. */
export function toVnDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = value instanceof Date ? value : parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

/** Extracts { hour, minute, hhmm } in Asia/Ho_Chi_Minh. */
export function toVnTimeParts(value) {
  const parsed = value instanceof Date ? value : parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return { hour: 0, minute: 0, hhmm: '00:00' };
  const hhmm = parsed.toLocaleTimeString('en-GB', {
    timeZone: VN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour, minute, hhmm };
}

/** Shifts a YYYY-MM-DD key by N calendar days using UTC noon arithmetic (DST-safe). */
export function shiftDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

/** Returns 0=Sunday .. 6=Saturday for a YYYY-MM-DD key. */
export function weekdayOfDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Returns Monday YYYY-MM-DD of the week containing dateKey. */
export function mondayOfDateKey(dateKey) {
  const wd = weekdayOfDateKey(dateKey);
  return shiftDateKey(dateKey, wd === 0 ? -6 : 1 - wd);
}

export function formatShortDateVn(dateKey) {
  const parts = String(dateKey).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateKey;
}

export function formatFullDayVn(dateKey, todayKey) {
  const wd = weekdayOfDateKey(dateKey);
  const [, month, day] = String(dateKey).split('-');
  const label = `${FULL_DAYS[wd]}, ${day}/${month}`;
  if (todayKey && dateKey === todayKey) return `Hôm nay · ${label}`;
  if (todayKey && dateKey === shiftDateKey(todayKey, 1)) return `Ngày mai · ${label}`;
  return label;
}

export function buildWeekDays(anchorKey, todayKey = toVnDateKey(new Date())) {
  const mon = mondayOfDateKey(anchorKey);
  return Array.from({ length: 7 }, (_, idx) => {
    const key = shiftDateKey(mon, idx);
    const [year, month, day] = key.split('-').map(Number);
    const wd = weekdayOfDateKey(key);
    return {
      key,
      date: day,
      dateNum: day,
      month,
      year,
      weekdayIndex: wd,
      name: SHORT_DAYS[wd],
      shortName: SHORT_DAYS[wd],
      fullName: FULL_DAYS[wd],
      today: key === todayKey,
      isToday: key === todayKey,
      isWeekend: wd === 0 || wd === 6,
    };
  });
}

export function buildMonthMatrix(anchorKey, todayKey = toVnDateKey(new Date())) {
  const [year, month] = String(anchorKey).split('-').map(Number);
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const gridStart = mondayOfDateKey(firstOfMonth);
  const lastDayDate = new Date(Date.UTC(year, month, 0));
  const lastOfMonth = lastDayDate.toISOString().slice(0, 10);
  const lastWd = weekdayOfDateKey(lastOfMonth);
  const gridEnd = shiftDateKey(lastOfMonth, lastWd === 0 ? 0 : 7 - lastWd);

  const cells = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = shiftDateKey(cursor, 1)) {
    const [cy, cm, cd] = cursor.split('-').map(Number);
    const wd = weekdayOfDateKey(cursor);
    cells.push({
      key: cursor,
      dateNum: cd,
      month: cm,
      year: cy,
      inCurrentMonth: cy === year && cm === month,
      isToday: cursor === todayKey,
      isWeekend: wd === 0 || wd === 6,
      shortName: SHORT_DAYS[wd],
    });
  }

  return {
    year,
    month,
    title: `Tháng ${month}, ${year}`,
    cells,
  };
}

export function stepAnchorKey(anchorKey, view, delta) {
  if (view === 'day') return shiftDateKey(anchorKey, delta);
  if (view === 'month') {
    const [y, m, d] = String(anchorKey).split('-').map(Number);
    const targetMonthLastDay = new Date(Date.UTC(y, m + delta, 0)).getUTCDate();
    const clampedDay = Math.min(d, targetMonthLastDay);
    return new Date(Date.UTC(y, m - 1 + delta, clampedDay)).toISOString().slice(0, 10);
  }
  return shiftDateKey(anchorKey, delta * 7);
}

export function getViewDateRange(anchorKey, view) {
  if (view === 'day') {
    return {
      startKey: anchorKey,
      endKey: anchorKey,
      title: formatFullDayVn(anchorKey),
      subtitle: 'Hiển thị theo ngày · GMT+7',
    };
  }
  if (view === 'month') {
    const matrix = buildMonthMatrix(anchorKey);
    return {
      startKey: matrix.cells[0]?.key || anchorKey,
      endKey: matrix.cells[matrix.cells.length - 1]?.key || anchorKey,
      title: matrix.title,
      subtitle: 'Theo dõi phân bố buổi dạy và khung trống',
    };
  }
  if (view === 'agenda') {
    const startKey = anchorKey;
    const endKey = shiftDateKey(anchorKey, 29);
    return {
      startKey,
      endKey,
      title: `${formatShortDateVn(startKey)} – ${formatShortDateVn(endKey)}`,
      subtitle: 'Lịch trình 30 ngày tới',
    };
  }
  const days = buildWeekDays(anchorKey);
  const first = days[0];
  const last = days[6];
  const title = first.month === last.month
    ? `Tháng ${first.month}, ${first.year}`
    : `Tháng ${first.month} – ${last.month}, ${last.year}`;
  return {
    startKey: first.key,
    endKey: last.key,
    title,
    subtitle: `${formatShortDateVn(first.key)} – ${formatShortDateVn(last.key)}`,
  };
}

export function minutesOfEvent(event) {
  const startMinute = Number.isFinite(Number(event.startMinute)) ? Number(event.startMinute) : 0;
  const endMinute = Number.isFinite(Number(event.endMinute)) ? Number(event.endMinute) : 0;
  const start = Number(event.startHour) * 60 + startMinute;
  let end = Number(event.endHour) * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  return { start, end };
}

/**
 * Packs concurrent events into non-overlapping columns per connected cluster,
 * returning { ...event, col, totalCols, startMin, endMin } cleanly for Google Calendar grid layout.
 */
export function packDayEvents(events = []) {
  if (!events.length) return [];
  const normalized = events
    .map((event) => {
      const { start, end } = minutesOfEvent(event);
      return { ...event, startMin: start, endMin: end };
    })
    .sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  // Partition into connected overlap components first
  const components = [];
  let currentComp = [];
  let compMaxEnd = -1;

  for (const item of normalized) {
    if (currentComp.length === 0 || item.startMin < compMaxEnd) {
      currentComp.push(item);
      compMaxEnd = Math.max(compMaxEnd, item.endMin);
    } else {
      components.push(currentComp);
      currentComp = [item];
      compMaxEnd = item.endMin;
    }
  }
  if (currentComp.length) components.push(currentComp);

  const output = [];
  for (const comp of components) {
    const columnEnds = [];
    const placed = [];
    for (const item of comp) {
      let col = columnEnds.findIndex((endTime) => endTime <= item.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.endMin);
      } else {
        columnEnds[col] = item.endMin;
      }
      placed.push({ ...item, col });
    }
    const totalCols = Math.max(columnEnds.length, 1);
    for (const item of placed) {
      output.push({ ...item, totalCols });
    }
  }
  return output;
}

export function groupAgendaEvents(events = [], { startKey, endKey, todayKey } = {}) {
  const byDay = new Map();
  const sorted = [...events]
    .filter((ev) => (!startKey || ev.dayKey >= startKey) && (!endKey || ev.dayKey <= endKey))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey) || minutesOfEvent(a).start - minutesOfEvent(b).start);

  for (const ev of sorted) {
    if (!byDay.has(ev.dayKey)) byDay.set(ev.dayKey, []);
    byDay.get(ev.dayKey).push(ev);
  }

  return [...byDay.entries()].map(([dayKey, items]) => ({
    dayKey,
    heading: formatFullDayVn(dayKey, todayKey),
    isToday: Boolean(todayKey && dayKey === todayKey),
    items,
  }));
}
