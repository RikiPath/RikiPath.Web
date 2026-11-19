// Dữ liệu hiển thị của thẻ lớp (thuần JS, dùng chung Web + kiểm thử). Chỉ định dạng dữ liệu Backend trả về.
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import { translateTemplate, currentIntlTag } from '@/locales/locale.js';

const WEEKDAY_LABELS = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ nhật' };
const INTENSITY_TONE = { Light: 'intensity-light', Standard: 'intensity-standard', Advanced: 'intensity-advanced' };

export const money = (v) => `${Number(v || 0).toLocaleString(currentIntlTag())} ₫`;
export const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');

/** "Thứ 2, Thứ 4 · 19:00–20:30" (nhóm theo khung giờ). */
export function schedulePatternText(pattern = [], sessions = []) {
  if (!pattern?.length) {
    if (!sessions?.length) return 'Chưa có lịch cụ thể';
    const fmt = new Intl.DateTimeFormat(currentIntlTag(), { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
    return [...new Set(sessions.map((s) => fmt.format(parseUtcDate(s.startTime))))].join(', ');
  }
  const order = (d) => (d === 0 ? 7 : d);
  const groups = new Map();
  [...pattern]
    .sort((a, b) => order(a.weekday) - order(b.weekday))
    .forEach((p) => {
      const time = `${p.localStart}–${p.localEnd}`;
      const label = p.weekdayLabel || WEEKDAY_LABELS[p.weekday] || translateTemplate('Thứ {0}', { 0: p.weekday + 1 });
      groups.set(time, [...(groups.get(time) || []), label]);
    });
  return [...groups.entries()].map(([time, days]) => `${days.join(', ')} · ${time}`).join('; ');
}

/** Trạng thái ghi danh (tách biệt với cường độ): Đang tham gia / Còn chỗ / Đã đủ chỗ / Sắp mở. */
export function enrollmentStatusOf(cohort) {
  if (cohort.myEnrollmentCourseId) return { key: 'Enrolled', label: 'Đang tham gia', tone: 'ok' };
  // Unknown seat count is not "full": only a number from the API decides that.
  if (cohort.seatsAvailable != null && cohort.seatsAvailable <= 0) return { key: 'Full', label: 'Đã đủ chỗ', tone: 'muted' };
  if (cohort.enrollmentOpen === true) return { key: 'Available', label: 'Còn chỗ', tone: 'ok' };
  return { key: 'Upcoming', label: 'Sắp mở / chưa mở ghi danh', tone: 'warn' };
}

/** Cường độ học lấy từ trường Backend (intensity/intensityLabel/sessionsPerWeek). */
export function intensityOf(cohort) {
  const label = cohort.intensityLabel || 'Tùy chỉnh';
  return {
    key: cohort.intensity || 'Custom',
    text: translateTemplate('Cường độ: {0}{1}', { 0: label, 1: cohort.sessionsPerWeek ? translateTemplate(' · {0} buổi/tuần', { 0: cohort.sessionsPerWeek }) : '' }),
    tone: INTENSITY_TONE[cohort.intensity] || 'intensity-custom',
  };
}

export function cohortCardFacts(cohort) {
  const totalSessions = cohort.totalSessions ?? cohort.sessions?.length ?? 0;
  const weeks = cohort.sessionsPerWeek ? Math.round(totalSessions / cohort.sessionsPerWeek) : null;
  return [
    ['Cấp độ JLPT', cohort.level || '—'],
    ['Mentor', cohort.mentorName || '—'],
    ['Lịch hằng tuần', schedulePatternText(cohort.schedulePattern, cohort.sessions)],
    ['Thời lượng buổi', cohort.sessionMinutes ? translateTemplate('{0} phút/buổi', { 0: cohort.sessionMinutes }) : '—'],
    ['Tổng số buổi', !totalSessions ? '—' : translateTemplate('{0} buổi{1}', { 0: totalSessions, 1: cohort.totalTeachingHours != null ? translateTemplate(' · {0} giờ', { 0: cohort.totalTeachingHours }) : '' })],
    ['Thời gian khóa', weeks ? translateTemplate('{0} tuần', { 0: weeks }) : '—'],
    ['Chỗ còn trống', cohort.seatsAvailable == null || cohort.capacity == null ? '—' : translateTemplate('{0}/{1} chỗ', { 0: Math.max(0, cohort.seatsAvailable), 1: cohort.capacity })],
    ['Học phí trọn khóa', money(cohort.price)],
  ];
}
