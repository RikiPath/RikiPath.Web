# Duyệt lịch Mentor

1. Mentor tạo lịch ở `/mentor-availability/`. Lịch có trạng thái **Chờ duyệt**, chưa hiện cho học viên.
2. Admin mở `/admin/mentor-schedules/` (menu **Duyệt lịch Mentor**), chọn lịch và bấm **Duyệt lịch** hoặc **Từ chối**. Khi từ chối phải nhập lý do.
3. Sau duyệt, Learner mở `/booking-schedule/`, chọn đúng mentor và bấm **Làm mới lịch**. Trang cũng tự tải lại lịch mỗi 30 giây.

Learner chỉ thấy lịch được duyệt, chưa bị từ chối/xóa, mentor đang hoạt động, lịch chưa bắt đầu và còn chỗ. Giờ trên FE hiển thị theo GMT+7; timestamp không có hậu tố múi giờ từ backend được đọc theo UTC.

API quản trị yêu cầu JWT vai trò `Admin`:

- `GET /api/admin/mentor-availabilities`
- `POST /api/admin/mentor-availabilities/{id}/review` với `{ "approve": true }` hoặc `{ "approve": false, "reason": "Lý do" }`.

Lịch đã xử lý hoặc đã bắt đầu không được duyệt lại. Các kiểm thử `MentorAvailabilityApprovalTests` xác nhận lịch mới bị ẩn, lịch được duyệt xuất hiện, lịch bị từ chối vẫn bị ẩn và tài khoản Mentor/Learner không thể duyệt.
