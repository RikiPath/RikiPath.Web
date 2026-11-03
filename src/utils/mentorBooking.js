export const BOOKING_HORIZON_DAYS = 30;

export const bookingDate = value => value ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`) : null;
export const bookingTime = value => bookingDate(value)?.toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) || 'Chưa xếp lịch';
export const bookingExpired = booking => Boolean(booking.endsAt && bookingDate(booking.endsAt) <= new Date());
export const bookingStatus = booking => booking.status === 'Assigned' && bookingExpired(booking) ? 'Đã hết lịch' : ({
  Assigned: 'Đã xác nhận', Accepted: 'Đã xác nhận', Confirmed: 'Đã xác nhận', Completed: 'Đã hoàn tất', Cancelled: 'Đã hủy',
  AwaitingPayment: 'Chờ thanh toán', PendingAssignment: 'Chờ phân công',
}[booking.status] || 'Trạng thái đang cập nhật');

export const paymentStatusLabel = status => ({
  Pending: 'Đang chờ thanh toán',
  Paid: 'Đã thanh toán',
  Failed: 'Thanh toán không thành công',
  Refunded: 'Đã hoàn tiền',
}[status] || 'Đang cập nhật');

export const bookingErrorMessage = error => {
  const status = Number(error?.response?.status ?? error?.status ?? error?.statusCode);
  if (status === 400) return 'Thông tin đặt lịch chưa hợp lệ. Vui lòng kiểm tra lại.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền đặt lịch này.';
  if (status === 409) return 'Khung giờ hoặc vé tư vấn không còn khả dụng. Vui lòng làm mới và chọn lại.';
  return 'Không thể đặt lịch lúc này. Vui lòng kiểm tra kết nối và thử lại.';
};
