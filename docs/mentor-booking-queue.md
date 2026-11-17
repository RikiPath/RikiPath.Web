# Hàng đợi xác nhận tư vấn

`/consultation-queue/` lấy booking đã thanh toán được gán cho Mentor đăng nhập qua `GET /api/mentor/meetings`. Các tên học viên, câu hỏi, thời gian, bộ đếm và trạng thái đều từ database. Lịch cũ vẫn xuất hiện trong **Tất cả / Lịch sử**, không thể tiếp nhận lại.

Booking được xác nhận tự động sau khi giao dịch đặt lịch hoàn tất. Màn hình hàng đợi và chi tiết chỉ đọc trạng thái qua `GET /api/mentor/meetings` và `GET /api/mentor/meetings/{bookingId}`; không có thao tác Mentor phải tiếp nhận. Trạng thái `Assigned` cũ được giữ nguyên trong dữ liệu lịch sử nhưng hiển thị như một lịch đã xác nhận, không được cập nhật hàng loạt.

Chỉ số JLPT, điểm thi, tệp đính kèm, SLA và phân bổ AI mẫu đã bỏ khỏi màn này vì API hiện không cung cấp các dữ liệu đó. Chat riêng mở `/mentor-chat/?bookingId=...`; phòng họp dùng RoomId thật của lịch.

Kiểm thử: `dotnet test RikiPath.Tests/RikiPath.Tests.csproj --filter FullyQualifiedName~MentorBookingConfirmationTests`. Dừng API trước khi test vì project dùng chung thư mục output; rebuild WebApi rồi khởi động lại sau test.
