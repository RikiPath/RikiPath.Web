// Dữ liệu hiển thị của thẻ lớp (thuần JS, dùng chung Web + kiểm thử). Chỉ định dạng dữ liệu Backend trả về.
const WEEKDAY_LABELS = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ nhật' };
const INTENSITY_TONE = { Light: 'intensity-light', Standard: 'intensity-standard', Advanced: 'intensity-advanced' };

export const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫`;
export const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');

/** "Thứ 2, Thứ 4 · 19:00–20:30" (nhóm theo khung giờ). */
export function schedulePatternText(pattern = [], sessions = []) {
  if (!pattern?.length) {
    if (!sessions?.length) return 'Chưa có lịch cụ thể';
    const fmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
    return [...new Set(sessions.map((s) => fmt.format(new Date(s.startTime))))].join(', ');
  }
  const order = (d) => (d === 0 ? 7 : d);
  const groups = new Map();
  [...pattern]
    .sort((a, b) => order(a.weekday) - order(b.weekday))
    .forEach((p) => {
      const time = `${p.localStart}–${p.localEnd}`;
      const label = p.weekdayLabel || WEEKDAY_LABELS[p.weekday] || `Thứ ${p.weekday + 1}`;
      groups.set(time, [...(groups.get(time) || []), label]);
    });
  return [...groups.entries()].map(([time, days]) => `${days.join(', ')} · ${time}`).join('; ');
}

/** Trạng thái ghi danh (tách biệt với cường độ): Còn chỗ / Đã đủ chỗ / Sắp mở. */
export function enrollmentStatusOf(cohort) {
  if ((cohort.seatsAvailable ?? 0) <= 0) return { key: 'Full', label: 'Đã đủ chỗ', tone: 'muted' };
  if (cohort.enrollmentOpen === true) return { key: 'Available', label: 'Còn chỗ', tone: 'ok' };
  return { key: 'Upcoming', label: 'Sắp mở / chưa mở ghi danh', tone: 'warn' };
}

/** Cường độ học lấy từ trường Backend (intensity/intensityLabel/sessionsPerWeek). */
export function intensityOf(cohort) {
  const label = cohort.intensityLabel || 'Tùy chỉnh';
  return {
    key: cohort.intensity || 'Custom',
    text: `Cường độ: ${label}${cohort.sessionsPerWeek ? ` · ${cohort.sessionsPerWeek} buổi/tuần` : ''}`,
    tone: INTENSITY_TONE[cohort.intensity] || 'intensity-custom',
  };
}

export function cohortCardFacts(cohort) {
  const totalSessions = cohort.totalSessions ?? cohort.sessions?.length ?? 0;
  const weeks = cohort.sessionsPerWeek ? Math.round(totalSessions / cohort.sessionsPerWeek) : null;
  return [
    ['Cấp độ JLPT', cohort.level || '—'],
    ['Mentor', cohort.mentorName || `#${cohort.mentorId}`],
    ['Lịch hằng tuần', schedulePatternText(cohort.schedulePattern, cohort.sessions)],
    ['Thời lượng buổi', `${cohort.sessionMinutes ?? '—'} phút/buổi`],
    ['Tổng số buổi', `${totalSessions} buổi${cohort.totalTeachingHours != null ? ` · ${cohort.totalTeachingHours} giờ` : ''}`],
    ['Thời gian khóa', weeks ? `${weeks} tuần` : '—'],
    ['Chỗ còn trống', `${Math.max(0, cohort.seatsAvailable ?? 0)}/${cohort.capacity}`],
    ['Học phí trọn khóa', money(cohort.price)],
  ];
}
