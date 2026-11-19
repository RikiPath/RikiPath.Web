import { readLocale, translateText } from '@/locales/locale.js';

// Dates/times are always shown in the business time zone (GMT+7); only the language of the output follows the
// UI locale (vi-VN / ja-JP). Components that call these re-render on a locale switch because they use useLocale().
const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';
const intlTag = () => (readLocale() === 'ja' ? 'ja-JP' : 'vi-VN');

export function parseUtcDate(value) {
  return value ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`) : null;
}

export function formatVnDateTime(value, fallback = 'Chưa xếp lịch') {
  return parseUtcDate(value)?.toLocaleString(intlTag(), {
    timeZone: BUSINESS_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) || translateText(fallback);
}

export function formatVnSlotWindow(startTime, endTime) {
  const start = parseUtcDate(startTime);
  if (!start || Number.isNaN(start.getTime())) return '—';
  const tag = intlTag();
  const day = start.toLocaleDateString(tag, {
    timeZone: BUSINESS_TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  const hm = (d) =>
    d.toLocaleTimeString(tag, {
      timeZone: BUSINESS_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const end = parseUtcDate(endTime);
  return end && !Number.isNaN(end.getTime()) ? `${day} · ${hm(start)}–${hm(end)}` : `${day} · ${hm(start)}`;
}

export function sessionStatusLabel(item) {
  const status = typeof item === 'string' ? item : item?.status;
  const expired = Boolean(typeof item === 'object' && item?.endsAt && parseUtcDate(item.endsAt) <= new Date());
  if (status === 'Assigned' && expired) return translateText('Đã hết lịch');
  return translateText({
    Assigned: 'Đã xác nhận',
    Accepted: 'Đã xác nhận',
    Confirmed: 'Đã xác nhận',
    Scheduled: 'Đã lên lịch',
    Present: 'Có mặt',
    Absent: 'Vắng mặt',
    ExcusedAbsent: 'Vắng có phép',
    Completed: 'Đã hoàn tất',
    Cancelled: 'Đã hủy',
    CancelledByMentor: 'Giáo viên đã hủy',
    CancelledByLearner: 'Học viên đã hủy',
    TransferredOut: 'Đã chuyển lớp',
    AwaitingPayment: 'Chờ thanh toán',
    PendingAssignment: 'Chờ phân công',
  }[status] || 'Trạng thái đang cập nhật');
}
