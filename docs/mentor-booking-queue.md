# Hàng đợi xác nhận tư vấn

`/consultation-queue/` lấy booking đã thanh toán được gán cho Mentor đăng nhập qua `GET /api/mentor/meetings`. Các tên học viên, câu hỏi, thời gian, bộ đếm và trạng thái đều từ database. Lịch cũ vẫn xuất hiện trong **Tất cả / Lịch sử**, không thể tiếp nhận lại.

Nút **Tiếp nhận & xem chi tiết** gọi `POST /api/mentor/meetings/{bookingId}/accept` rồi mở `/consultation-request/?bookingId=...`. Chi tiết lấy bằng `GET /api/mentor/meetings/{bookingId}`. Backend chỉ cho đúng Mentor tiếp nhận booking Paid + Assigned, lịch đã duyệt và chưa kết thúc. Thành công chuyển trạng thái thành Accepted, lưu database. Gửi lại cùng yêu cầu đã Accepted không tạo hành động trùng.

Chỉ số JLPT, điểm thi, tệp đính kèm, SLA và phân bổ AI mẫu đã bỏ khỏi màn này vì API hiện không cung cấp các dữ liệu đó. Chat riêng mở `/mentor-chat/?bookingId=...`; phòng họp dùng RoomId thật của lịch.

Kiểm thử: `dotnet test RikiPath.Tests/RikiPath.Tests.csproj --filter FullyQualifiedName~MentorBookingConfirmationTests`. Dừng API trước khi test vì project dùng chung thư mục output; rebuild WebApi rồi khởi động lại sau test.
