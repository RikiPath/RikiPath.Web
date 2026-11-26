import { parseUtcDate } from '@/utils/vnDateTime.js';

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const SHORT_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const FULL_DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const CALENDAR_CATEGORIES = Object.freeze({
  srs: {
    id: 'srs',
    category: 'srs',
    label: 'Ôn tập SRS',
    shortLabel: 'Ôn tập',
    hex: '#D5A12F',
    bgHex: '#FFF8E7',
    card: 'border-l-[3.5px] border-l-rp-cal-srs border border-rp-cal-srs-border bg-rp-cal-srs-bg text-rp-cal-srs-text shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-rp-cal-srs hover:bg-[#FFEFCA] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rp-cal-srs/15 text-rp-cal-srs-text transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-rp-cal-srs group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-rp-cal-srs-border bg-rp-cal-srs-bg text-rp-cal-srs-text',
    dot: 'bg-rp-cal-srs',
    iconText: 'text-rp-cal-srs',
  },
  homework: {
    id: 'homework',
    category: 'homework',
    label: 'Bài tập về nhà',
    shortLabel: 'Bài tập',
    hex: '#DC6977',
    bgHex: '#FFF1F3',
    card: 'border-l-[3.5px] border-l-rp-cal-homework border border-rp-cal-homework-border bg-rp-cal-homework-bg text-rp-cal-homework-text shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-rp-cal-homework hover:bg-[#FFE2E7] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rp-cal-homework/15 text-rp-cal-homework-text transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-rp-cal-homework group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-rp-cal-homework-border bg-rp-cal-homework-bg text-rp-cal-homework-text',
    dot: 'bg-rp-cal-homework',
    iconText: 'text-rp-cal-homework',
  },
  class: {
    id: 'session',
    category: 'session',
    label: 'Lịch học / Lớp học',
    shortLabel: 'Lớp học',
    hex: '#2F9B6B',
    bgHex: '#EAF8F0',
    card: 'border-l-[3.5px] border-l-rp-cal-class border border-rp-cal-class-border bg-rp-cal-class-bg text-rp-cal-class-text shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-rp-cal-class hover:bg-[#D7F2E3] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rp-cal-class/15 text-rp-cal-class-text transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-rp-cal-class group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-rp-cal-class-border bg-rp-cal-class-bg text-rp-cal-class-text',
    dot: 'bg-rp-cal-class',
    iconText: 'text-rp-cal-class',
  },
  reminder: {
    id: 'reminder',
    category: 'reminder',
    label: 'Nhắc nhở / Thông báo',
    shortLabel: 'Nhắc nhở',
    hex: '#477FDC',
    bgHex: '#EDF4FF',
    card: 'border-l-[3.5px] border-l-rp-cal-reminder border border-rp-cal-reminder-border bg-rp-cal-reminder-bg text-rp-cal-reminder-text shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-rp-cal-reminder hover:bg-[#DCEAFE] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rp-cal-reminder/15 text-rp-cal-reminder-text transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-rp-cal-reminder group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-rp-cal-reminder-border bg-rp-cal-reminder-bg text-rp-cal-reminder-text',
    dot: 'bg-rp-cal-reminder',
    iconText: 'text-rp-cal-reminder',
  },
});

export const CALENDAR_CATEGORY_ORDER = Object.freeze(['session', 'workLive', 'workUpcoming', 'workCompleted', 'homework', 'srs', 'reminder']);

export const CALENDAR_TONES = Object.freeze({
  session: {
    ...CALENDAR_CATEGORIES.class,
    label: 'Đã xếp lớp',
  },
  class: {
    ...CALENDAR_CATEGORIES.class,
    label: 'Lớp học',
  },
  present: {
    ...CALENDAR_CATEGORIES.class,
    label: 'Đã hoàn thành',
  },
  workUpcoming: {
    id: 'workUpcoming',
    category: 'workUpcoming',
    label: 'Sắp diễn ra',
    shortLabel: 'Sắp diễn ra',
    hex: '#6B7280',
    bgHex: '#F3F4F6',
    card: 'border-l-[3.5px] border-l-[#6B7280] border border-[#D1D5DB] bg-[#F3F4F6] text-[#374151] shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[#4B5563] hover:bg-[#E5E7EB] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6B7280]/15 text-[#374151] transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-[#4B5563] group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-[#D1D5DB] bg-[#F3F4F6] text-[#374151]',
    dot: 'bg-[#6B7280]',
    iconText: 'text-[#4B5563]',
  },
  workLive: {
    id: 'workLive',
    category: 'workLive',
    label: 'Đang diễn ra',
    shortLabel: 'Đang diễn ra',
    hex: '#D97706',
    bgHex: '#FFFBEB',
    card: 'border-l-[3.5px] border-l-[#D97706] border border-[#FCD34D] bg-[#FFFBEB] text-[#92400E] shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[#B45309] hover:bg-[#FEF3C7] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D97706]/15 text-[#92400E] transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-[#D97706] group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]',
    dot: 'bg-[#D97706]',
    iconText: 'text-[#B45309]',
  },
  workCompleted: {
    id: 'workCompleted',
    category: 'workCompleted',
    label: 'Đã hoàn thành',
    shortLabel: 'Đã hoàn thành',
    hex: '#16A34A',
    bgHex: '#F0FDF4',
    card: 'border-l-[3.5px] border-l-[#16A34A] border border-[#86EFAC] bg-[#F0FDF4] text-[#14532D] shadow-2xs',
    hoverCard: 'transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[#15803D] hover:bg-[#DCFCE7] hover:shadow-rp-xs active:scale-[0.99]',
    arrowChip: 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16A34A]/15 text-[#14532D] transition-[background-color,color,transform,box-shadow] duration-150 group-hover:scale-105 group-hover:bg-[#16A34A] group-hover:text-white group-hover:shadow-rp-xs',
    pill: 'border border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]',
    dot: 'bg-[#16A34A]',
    iconText: 'text-[#15803D]',
  },
  approved: {
    label: 'Đã duyệt',
    hex: '#16A34A',
    card: 'border-l-[3.5px] border-l-[#16A34A] border border-[#86EFAC] bg-[#F0FDF4] text-[#14532D]',
    pill: 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]',
    dot: 'bg-[#16A34A]',
  },
  // Legacy alias mapped uniformly to Green 'Đã duyệt'
  open: {
    label: 'Đã duyệt',
    hex: '#16A34A',
    card: 'border-l-[3.5px] border-l-[#16A34A] border border-[#86EFAC] bg-[#F0FDF4] text-[#14532D]',
    pill: 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]',
    dot: 'bg-[#16A34A]',
  },
  booked: {
    ...CALENDAR_CATEGORIES.class,
    label: 'Đã xếp lớp',
  },
  pending: {
    label: 'Chờ duyệt',
    hex: '#E4A020',
    card: 'border-l-[3.5px] border-l-[#E4A020] border border-[#F3D7A4] bg-[#FFFBF2] text-[#784506]',
    pill: 'bg-[#FFF5E2] text-[#8E5306] border border-[#F3D7A4]',
    dot: 'bg-[#E4A020]',
  },
  needsRevision: {
    label: 'Cần bổ sung',
    hex: '#EA580C',
    card: 'border-l-[3.5px] border-l-[#EA580C] border border-[#FDBA74] bg-[#FFF7ED] text-[#9A3412]',
    pill: 'bg-[#FFEDD5] text-[#C2410C] border border-[#FDBA74]',
    dot: 'bg-[#EA580C]',
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
    category: 'session',
    label: 'Đã hủy',
    hex: '#8B8B97',
    bgHex: '#EAF8F0',
    card: 'border-l-[3.5px] border-l-rp-cal-class border border-rp-cal-class-border bg-rp-cal-class-bg/65 text-rp-cal-class-text opacity-80',
    pill: 'bg-[#F1F1F4] text-[#5E5E6A] border border-[#E2E2E8]',
    dot: 'bg-rp-cal-class',
    iconText: 'text-rp-cal-class',
  },
  selected: {
    label: 'Đã chọn (chưa gửi)',
    hex: '#22C55E',
    card: 'border-[1.5px] border-dashed border-[#4ADE80] bg-[#F3FEF6] text-[#14532D] shadow-xs',
    pill: 'bg-[#E3FCE9] text-[#15803D] border border-dashed border-[#4ADE80]',
    dot: 'bg-[#22C55E]',
  },
  live: {
    ...CALENDAR_CATEGORIES.class,
    label: 'Phòng đang mở',
  },
  homework: {
    ...CALENDAR_CATEGORIES.homework,
    label: 'Hạn nộp bài tập',
  },
  rescheduled: {
    ...CALENDAR_CATEGORIES.class,
    label: 'Đã dời lịch',
  },
  srs: {
    ...CALENDAR_CATEGORIES.srs,
    label: 'Ôn tập SRS',
  },
  reminder: {
    ...CALENDAR_CATEGORIES.reminder,
    label: 'Nhắc nhở',
  },
  notification: {
    ...CALENDAR_CATEGORIES.reminder,
    label: 'Nhắc nhở',
  },
  ghost: {
    label: 'Dự kiến',
    card: 'border border-dashed border-rp-cal-class-border bg-rp-cal-class-bg/80 text-rp-cal-class-text',
    pill: 'bg-rp-cal-class-bg border border-dashed border-rp-cal-class-border text-rp-cal-class-text',
    dot: 'bg-rp-cal-class',
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

/**
 * Resolves the unified 4-category visual identity (SRS, Homework, Class, Reminder)
 * from an event object or category/eventType string.
 */
export function getCalendarCategoryMeta(eventOrType) {
  if (eventOrType && typeof eventOrType === 'object') {
    const toneKey = eventOrType.tone;
    if (toneKey === 'workUpcoming' || toneKey === 'workLive' || toneKey === 'workCompleted') {
      return CALENDAR_TONES[toneKey];
    }
  }
  const key = typeof eventOrType === 'string'
    ? eventOrType
    : (eventOrType?.category || eventOrType?.eventType || eventOrType?.tone || 'session');
  if (key === 'workUpcoming' || key === 'workLive' || key === 'workCompleted') {
    return CALENDAR_TONES[key];
  }
  if (key === 'srs') return CALENDAR_CATEGORIES.srs;
  if (key === 'homework') return CALENDAR_CATEGORIES.homework;
  if (key === 'reminder' || key === 'notification') return CALENDAR_CATEGORIES.reminder;
  return CALENDAR_CATEGORIES.class;
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

const COMPACT_DAYS_VN = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** Formats a YYYY-MM-DD key consistently with 4-digit year for multi-year List View rows (e.g. "Thứ 4, 02/12/2026"). */
export function formatFullDayWithYearVn(dateKey, todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return String(dateKey || '');
  const wd = weekdayOfDateKey(dateKey);
  const [year, month, day] = String(dateKey).split('-');
  const label = `${COMPACT_DAYS_VN[wd]}, ${day}/${month}/${year}`;
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

export function getViewDateRange(anchorKey, view, audience = 'mentor') {
  if (view === 'day') {
    return {
      startKey: anchorKey,
      endKey: anchorKey,
      title: formatFullDayWithYearVn(anchorKey),
      subtitle: 'Hiển thị theo ngày',
    };
  }
  if (view === 'month') {
    const matrix = buildMonthMatrix(anchorKey);
    return {
      startKey: matrix.cells[0]?.key || anchorKey,
      endKey: matrix.cells[matrix.cells.length - 1]?.key || anchorKey,
      title: matrix.title,
      subtitle: audience === 'learner' ? 'Tổng quan lịch học theo tháng' : 'Theo dõi phân bố buổi dạy và khung trống',
    };
  }
  if (view === 'agenda') {
    const startKey = anchorKey;
    const endKey = shiftDateKey(anchorKey, 29);
    const crossYear = startKey.slice(0, 4) !== endKey.slice(0, 4);
    return {
      startKey,
      endKey,
      title: crossYear
        ? `${formatShortDateVn(startKey)}/${startKey.slice(0, 4)} – ${formatShortDateVn(endKey)}/${endKey.slice(0, 4)}`
        : `${formatShortDateVn(startKey)} – ${formatShortDateVn(endKey)}`,
      subtitle: 'Lịch trình 30 ngày tới',
    };
  }
  const days = buildWeekDays(anchorKey);
  const first = days[0];
  const last = days[6];
  const title = first.year !== last.year
    ? `Tháng ${String(first.month).padStart(2, '0')}/${first.year} – Tháng ${String(last.month).padStart(2, '0')}/${last.year}`
    : first.month === last.month
      ? `Tháng ${first.month}, ${first.year}`
      : `Tháng ${first.month} – ${last.month}, ${last.year}`;
  const subtitle = first.year !== last.year
    ? `${formatShortDateVn(first.key)}/${first.year} – ${formatShortDateVn(last.key)}/${last.year}`
    : `${formatShortDateVn(first.key)} – ${formatShortDateVn(last.key)}`;
  return {
    startKey: first.key,
    endKey: last.key,
    title,
    subtitle,
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

export function groupAgendaEvents(events = [], { startKey, endKey, todayKey, smartOrder = false, preserveOrder = false } = {}) {
  const byDay = new Map();
  const inRange = [...events].filter((ev) => (!startKey || ev.dayKey >= startKey) && (!endKey || ev.dayKey <= endKey));
  if (!preserveOrder) {
    if (smartOrder) {
      const isCompleted = (ev) => ev?.tone === 'present' || ev?.sessionCompleted === true;
      inRange.sort((a, b) => {
        const ca = isCompleted(a);
        const cb = isCompleted(b);
        if (ca !== cb) return ca ? 1 : -1;
        const dayCmp = a.dayKey.localeCompare(b.dayKey);
        if (!ca) {
          return dayCmp !== 0 ? dayCmp : minutesOfEvent(a).start - minutesOfEvent(b).start;
        }
        return dayCmp !== 0 ? -dayCmp : minutesOfEvent(b).start - minutesOfEvent(a).start;
      });
    } else {
      inRange.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || minutesOfEvent(a).start - minutesOfEvent(b).start);
    }
  }

  for (const ev of inRange) {
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
