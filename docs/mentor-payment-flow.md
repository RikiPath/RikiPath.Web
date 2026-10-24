# Thanh toán tư vấn thật

1. Learner chọn mentor và lịch đã duyệt ở `/booking-schedule/`.
2. `/consultation-payment/?mentorId=...&slotId=...` tải gói từ database, kiểm tra lại lịch và gọi `POST /api/mentor-meetings/purchase`.
3. Backend tạo UserSubscription Pending và MentorBooking AwaitingPayment, lưu câu hỏi, tạo link PayOS. Chưa có thanh toán thì booking chưa xuất hiện trong hàng đợi Mentor.
4. Biên lai `/consultation-receipt/?subscriptionId=...` hiển thị **Đang chờ thanh toán**. Learner mở link PayOS để tự hoàn tất chuyển tiền.
5. Webhook `/api/Payment/payos/webhook` xác minh chữ ký rồi chuyển đơn thành Paid, booking thành Assigned. Backend cũng có `POST /api/mentor-meetings/purchases/{id}/sync` cho chính người mua đối soát trực tiếp với API PayOS khi webhook chưa về, phù hợp khi chạy local.
6. Sau xác nhận, `/api/mentor/meetings` trả booking cho đúng Mentor. Mentor tiếp nhận để chuyển thành Accepted. Learner xem trạng thái tại `/consultation-center/`.

Trang biên lai chỉ báo thành công dựa trên database sau đối soát. Tham số `status=PAID` trên URL không được dùng làm bằng chứng thanh toán. Backend đối chiếu mã đơn, số tiền, mã link và số tiền đã nhận; người khác không được đối soát đơn của bạn. Lịch bị hủy không tự được phục hồi nếu nhận tiền muộn; biên lai sẽ yêu cầu kiểm tra lịch.

Return/cancel URL cấu hình tại PayOsSettings.WebReturnUrl / WebCancelUrl được gắn subscriptionId trước khi ký yêu cầu. FE hỗ trợ `/payment/success/` và `/payment/cancel/`, vẫn cần gọi backend để xác nhận. Có thể cấu hình webhook public khi triển khai; localhost không nhận trực tiếp webhook từ internet.

Biên lai mẫu cũ (RP-PAY-88421 / VNPay / Sato-sensei) đã bỏ. Nó không tạo giao dịch hoặc booking backend.

Tài liệu API được dùng để triển khai đối soát: [payOS – Lấy thông tin link thanh toán](https://payos.vn/docs/api/).

Kiểm thử `MentorPaymentFlowTests` dùng gateway giả lập, không chuyển tiền thật: Pending không vào queue, PAID đúng thông tin mới vào queue, chống sai mã/sai tiền, webhook lặp, webhook sai chữ ký, sai quyền và đơn bị hủy.
