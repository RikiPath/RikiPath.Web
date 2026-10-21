export const bookingDate = value => value ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`) : null;
export const bookingTime = value => bookingDate(value)?.toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) || 'Chưa xếp lịch';
export const bookingExpired = booking => Boolean(booking.endsAt && bookingDate(booking.endsAt) <= new Date());
export const canAcceptBooking = booking => booking.status === 'Assigned' && !bookingExpired(booking);
export const bookingStatus = booking => booking.status === 'Assigned' && bookingExpired(booking) ? 'Đã hết lịch' : ({
  Assigned: 'Chờ tiếp nhận', Accepted: 'Đã tiếp nhận', Completed: 'Đã hoàn tất', Cancelled: 'Đã hủy',
  AwaitingPayment: 'Chờ thanh toán', PendingAssignment: 'Chờ phân công',
}[booking.status] || booking.status);
