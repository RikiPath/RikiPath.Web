import { readLocale, translateText } from '@/locales/locale.js';
import {
  BUSINESS_TIMEZONE,
  formatDateTime,
  formatTime,
  formatTimeRange,
  parseBusinessDate,
} from './dateTimeFormat.js';

// Dates/times are always shown in the business time zone (GMT+7); only weekday labels follow the UI locale.
const intlTag = () => (readLocale() === 'ja' ? 'ja-JP' : 'vi-VN');

export function parseUtcDate(value) {
  return parseBusinessDate(value);
}

export function formatVnDateTime(value, fallback = 'Chưa xếp lịch') {
  return formatDateTime(value) || translateText(fallback);
}

export function formatVnSlotWindow(startTime, endTime) {
  const start = parseUtcDate(startTime);
  if (!start || Number.isNaN(start.getTime())) return '—';
  const tag = intlTag();
  const day = start.toLocaleDateString(tag, {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  const end = parseUtcDate(endTime);
  const timeText = end && !Number.isNaN(end.getTime())
    ? formatTimeRange(start, end)
    : formatTime(start);
  return `${day} · ${timeText}`;
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
    Completed: 'Đã hoàn thành',
    Cancelled: 'Đã hủy',
    CancelledByMentor: 'Giáo viên đã hủy',
    CancelledByLearner: 'Học viên đã hủy',
    TransferredOut: 'Đã chuyển lớp',
    AwaitingPayment: 'Chờ thanh toán',
    PendingAssignment: 'Chờ phân công',
  }[status] || 'Trạng thái đang cập nhật');
}
