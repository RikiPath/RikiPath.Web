import { parseUtcDate } from '@/utils/vnDateTime.js';

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const SHORT_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const FULL_DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const CALENDAR_TONES = Object.freeze({
  session: {
    label: 'Buổi lớp nhóm',
    hex: '#CE476D',
    card: 'border-l-[3.5px] border-l-[#CE476D] border border-[#F2CCD7] bg-[#FFF5F7] text-[#7D2941] shadow-2xs',
    pill: 'bg-[#FCEAEF] text-[#9E3350] border border-[#F2CCD7]',
    dot: 'bg-[#CE476D]',
  },
  present: {
    label: 'Đã hoàn thành',
    hex: '#16A34A',
    card: 'border-l-[3.5px] border-l-[#16A34A] border border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]',
    pill: 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]',
    dot: 'bg-[#16A34A]',
  },
  open: {
    label: 'Đã công bố',
    hex: '#3B82F6',
    card: 'border-l-[3.5px] border-l-[#3B82F6] border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]',
    pill: 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]',
    dot: 'bg-[#3B82F6]',
  },
  approved: {
    label: 'Đã duyệt',
    hex: '#0D9488',
    card: 'border-l-[3.5px] border-l-[#0D9488] border border-[#99F6E4] bg-[#F0FDFA] text-[#115E59]',
    pill: 'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]',
    dot: 'bg-[#0D9488]',
  },
  booked: {
    label: 'Đã xếp lớp',
    hex: '#CE476D',
    card: 'border-l-[3.5px] border-l-[#CE476D] border border-[#EFC2CF] bg-[#FFF4F7] text-[#7D2941] shadow-2xs',
    pill: 'bg-[#FCEAEF] text-[#9E3350] border border-[#EFC2CF]',
    dot: 'bg-[#CE476D]',
  },
  pending: {
    label: 'Chờ duyệt',
    hex: '#E4A020',
    card: 'border-l-[3.5px] border-l-[#E4A020] border border-[#F3D7A4] bg-[#FFFBF2] text-[#784506]',
    pill: 'bg-[#FFF5E2] text-[#8E5306] border border-[#F3D7A4]',
    dot: 'bg-[#E4A020]',
  },
  rejected: {
    label: 'Bị từ chối',
    hex: '#DC3545',
    card: 'border-l-[3.5px] border-l-[#DC3545] border border-[#F5C2C7] bg-[#FFF5F5] text-[#842029]',
    pill: 'bg-[#FDECEC] text-[#B42318] border border-[#F5C2C7]',
    dot: 'bg-[#DC3545]',
  },
  conflict: {
    label: 'Trùng lịch',
    hex: '#DC3545',
    card: 'border-l-[3.5px] border-l-[#DC3545] border border-[#F5B7B1] bg-[#FEF5F5] text-[#8A1C13]',
    pill: 'bg-[#FDECEC] text-[#B42318] border border-[#F5B7B1]',
    dot: 'bg-[#DC3545]',
  },
  cancelled: {
    label: 'Đã hủy',
    hex: '#8B8B97',
    card: 'border-l-[3.5px] border-l-[#8B8B97] border border-[#E2E2E8] bg-[#F8F8FA] text-[#5E5E6A] opacity-85',
    pill: 'bg-[#F1F1F4] text-[#5E5E6A] border border-[#E2E2E8]',
    dot: 'bg-[#8B8B97]',
  },
  selected: {
    label: 'Đã chọn (chưa gửi)',
    hex: '#22C55E',
    card: 'border-l-[3.5px] border-l-[#22C55E] border border-[#86EFAC] bg-[#F3FEF6] text-[#14532D] shadow-xs ring-1 ring-inset ring-[#86EFAC]/50',
    pill: 'bg-[#E3FCE9] text-[#15803D] border border-[#86EFAC]',
    dot: 'bg-[#22C55E]',
  },
  live: {
    label: 'Phòng đang mở',
    card: 'border-l-[3.5px] border-l-[#0F766E] border border-[#99F6E4] bg-[#F0FDFA] text-[#115E59]',
    pill: 'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]',
    dot: 'bg-[#0F766E]',
  },
  homework: {
    label: 'Hạn nộp bài tập',
    card: 'border-l-[3.5px] border-l-[#4F46E5] border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3]',
    pill: 'bg-[#E0E7FF] text-[#4338CA] border border-[#C7D2FE]',
    dot: 'bg-[#4F46E5]',
  },
  rescheduled: {
    label: 'Đã dời lịch',
    card: 'border-l-[3.5px] border-l-[#B45309] border border-[#FDE68A] bg-[#FFFBEB] text-[#78350F]',
    pill: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
    dot: 'bg-[#B45309]',
  },
  srs: {
    label: 'Ôn tập SRS hôm nay',
    card: 'border-l-[3.5px] border-l-[#059669] border border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]',
    pill: 'bg-[#D1FAE5] text-[#047857] border border-[#A7F3D0]',
    dot: 'bg-[#059669]',
  },
  ghost: {
    label: 'Dự kiến',
    card: 'border border-dashed border-[#86EFAC] bg-[#F0FDF4]/80 text-[#166534]',
    pill: 'bg-[#F0FDF4] border border-dashed border-[#86EFAC] text-[#166534]',
    dot: 'bg-[#22C55E]',
  },
});

/** Formats a cohort/class display title concisely so calendar cards don't truncate into unreadable 'QA-N4...'. */
export function formatCleanCohortTitle(rawName, sessionNumber) {
  const raw = String(rawName || '').trim();
  if (!raw) return sessionNumber ? `Lớp nhóm · Buổi ${sessionNumber}` : 'Lớp nhóm';
  // Replace noisy technical prefixes like QA-N4-202611... with clean readable JLPT class title
  let clean = raw
    .replace(/^QA[-_ ]+/i, '')
    .replace(/[-_]\d{6,}.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) clean = raw;
  return sessionNumber ? `${clean} · Buổi ${sessionNumber}` : clean;
}

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
