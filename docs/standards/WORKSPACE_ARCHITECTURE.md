# RikiPath Smart Learning Workspace Standards

Tài liệu quy chuẩn kiến trúc lâu dài cho không gian học tập **RikiPath.Web** (Smart Calendar, Hierarchical Sidebar, Group Learning Workspaces & Data Presentation).

---

## 1. Global Header Smart Calendar
- Vị trí cố định trên top bar (`AppShell.jsx`): `Search → Theme → Home → Calendar → Language → Notifications → Profile`.
- Desktop sử dụng `Popover` (`align="end"`), Mobile (`< 640px`) chuyển sang `Drawer` (`side="right"`) để không tràn ngang hay bị cắt khung.
- Nội dung xem nhanh chỉ hiển thị dữ liệu thật từ Backend (`useWorkspaceCalendar`), theo múi giờ chuẩn `Asia/Ho_Chi_Minh (GMT+7)`:
  - Không dựng sự kiện SRS tương lai hoặc lịch thi JLPT giả lập nếu Backend không trả về.
  - Nút **Vào phòng** chỉ bật trong cửa sổ phòng học (`[start - 15m, end + 30m]`); ngoài cửa sổ hiển thị lý do ngữ cảnh rõ ràng.
  - Trạng thái tải dùng `SakuraLoader`; khi rỗng hiển thị `"Bạn chưa có lịch học sắp tới."`.
  - Đồng bộ Google Calendar (`GET/POST/DELETE /api/mentor/calendar`) chỉ khả dụng cho **Mentor** khi máy chủ đã cấu hình; không gắn nút giả cho Học viên.
  - **Content Author** không phụ thuộc lịch giảng dạy nhóm: `HeaderCalendarPopover` không gọi endpoint `Mentor/Admin` gây 403 mà hiển thị tóm tắt trung thực và lối tắt về `/author-dashboard` / `/content-plan`.

---

## 2. Hierarchical 2-Level Sidebar Navigation
- Hỗ trợ cấu trúc cha–con 2 cấp (tối đa 2 cấp) trong `src/layouts/appNav.js` (`item.children`) cho cả 4 vai trò (**Learner**, **Mentor**, **Content Author**, **Admin**):
  - **Learner — Học nhóm** mở nhánh con gồm: `Tổng quan học nhóm` (`/group-learning`), `Tìm Mentor` (`/mentors`), `Khám phá lớp học` (`/cohorts`), `Lớp của tôi` (`/my-courses`), `Lịch học` (`/calendar`), `Bài tập về nhà` (`/homework`), `Tiến độ học nhóm` (`/group-learning/progress`).
  - **Mentor**: 4 nhóm rõ ràng (`Bảng điều khiển`, `Giảng dạy`, `Chất lượng & Hồ sơ`, `Chuyên môn & Khác`), giữ `Lịch dạy & lịch rảnh` và `Chất lượng & phản hồi` làm nhánh cha mở sẵn.
  - **Content Author**: `Studio` (`/cms`), `Biên soạn & Kho học liệu` (Soạn thủ công, Soạn với AI, Kho đã duyệt), `Luyện thi` (Đề thi thử, Ngân hàng câu hỏi), `Nhập liệu` (Import Excel, Lịch sử lô nhập).
  - **Admin**: `Bảng điều khiển`, `Học viên & Gói tự học`, `Điều phối lớp học` (Lớp nhóm & Ghi danh, Ngoại lệ & Khiếu nại), `Đội ngũ Mentor` (Hồ sơ Mentor, Xét duyệt hồ sơ, Lịch dạy & chất lượng), `Nội dung & Hệ thống` (Duyệt nội dung, Cấu hình JLPT, Phần thi).
- `QuickJumpModal` (`Ctrl+K`) luôn khả dụng trong `AppShell.jsx` cho mọi vai trò và mọi trang (kể cả khi trang có ô tìm kiếm cục bộ như `/admin/users`), tự động khử trùng các mục cha/con trùng đường dẫn và hỗ trợ tìm theo `keywords` / nhãn nhóm.
- Quy tắc tương tác & responsive:
  - Khi một trang con đang mở, nhánh cha tự động mở rộng và hiển thị trạng thái đang chọn.
  - Lưu trạng thái đóng/mở nhánh theo `roleKey` trong `localStorage` (`rp.nav.expanded.<role>`).
  - Animation accordion sử dụng CSS grid row (`0fr ↔ 1fr`) kèm `motion-reduce:transition-none` để tôn trọng `prefers-reduced-motion`, bảo đảm đóng/mở mượt khi nhấp item cha.
  - Khi Sidebar thu gọn (`76px`), giữ nút biểu tượng căn giữa + tooltip; bấm vào nhánh cha mở menu nổi qua Portal ngoài vùng cuộn để vẫn truy cập đầy đủ các trang con.

---

## 3. Group Learning Workspace Context Separation
- Tách bạch luồng Học viên thay vì dồn toàn bộ vào một trang cuộn dài:
  - `/group-learning`: Tổng quan học nhóm, buổi sắp tới, bài tập cần làm, lối tắt 6 chức năng.
  - `/cohorts`: Khám phá & đăng ký lớp nhóm (`LearnerCohortDiscoveryPanel`); không lộ thông tin nội bộ của Admin (`entitlementReference` hay mã `#id` thay cho tên lớp).
  - `/my-courses`: Danh sách thẻ lớp học nhóm; click mở `/my-courses/:courseId` (nếu query `?cohortId=` cũ không khớp lớp đã ghi danh sẽ điều hướng sạch về `/cohorts`).
  - `/my-courses/:courseId`: Không gian lớp học 5 tab (`?section=overview|schedule|homework|progress|support`):
    - **Tổng quan**: thông tin lớp, buổi tiếp theo, thanh toán PayOS chờ xử lý (chỉ hiện khi `Pending`), hủy trước khai giảng (chỉ hiện khi hợp lệ).
    - **Lịch học**: lịch `CohortSessionsCalendar` và danh sách buổi điểm danh của lớp.
    - **Bài tập**: `CohortHomeworkPanel` gắn đúng `cohortId`.
    - **Điểm danh & tiến độ**: thống kê chuyên cần & điều kiện hoàn thành khóa (`CohortCompletionSummary` chỉ xuất hiện ở tab này, không lặp ở tab Hỗ trợ).
    - **Đánh giá & hỗ trợ**: đánh giá Mentor, chuyển lớp, hỗ trợ trượt JLPT (chỉ hiện khi hợp lệ với trạng thái đã bản địa hóa VI/JA) và mục khiếu nại.
- Bảo toàn tương thích ngược cho liên kết cũ (`/my-courses?tab=cohorts`, `/my-courses?cohortId=X`, PayOS `orderCode`, thông báo Backend trỏ `/my-courses/{id}`).

---

## 4. Homework Cross-Class Aggregation & Calendar Clarity
- Trang `/homework` cho Học viên mặc định chế độ **Tất cả lớp** (gọi `GET /api/homework` không truyền `cohortId` khi chưa lọc lớp cụ thể) kèm bộ lọc trạng thái (`Tất cả`, `Cần làm`, `Đã nộp`, `Đã chấm`) và liên kết thẳng về không gian lớp tương ứng.
- Phân biệt rõ số buổi **trong khoảng hiển thị** (`GMT+7 · {n} sự kiện trong khoảng`) và **tổng số buổi toàn khóa** (`{0} buổi toàn khóa`).
- Không dùng tên hiển thị thô kiểu `"Lớp #<id>"`; luôn ưu tiên `cohortName || name || "Lớp JLPT <level>"`.
- Không bao giờ hiển thị số `0` giả trong lúc đang tải hoặc khi API lỗi (`SmartDataBoundary` / `SakuraLoader`).
- Điểm bài tập (`publishedGrade`) đọc đúng `{ score, passed }` từ DTO Backend thay vì nội suy object thành chuỗi `[object Object]`.

---

## 5. Multi-Role Focused Workspaces (Mentor / Admin / Content Author)
- **Mentor Cohort Workspace** (`/mentor-study-courses/` & `/mentor-study-courses/:cohortId`):
  - Thư mục lớp theo từng Cohort thay cho select mã ghi danh đơn lẻ (`Lịch dạy · 6 tab ngữ cảnh`: `overview | learners | schedule | homework | attendance | support`).
  - **Học viên & Năng lực**: theo dõi chuyên cần + mở hồ sơ năng lực `getMentorLearnerSkillProfile` trong Modal theo nhu cầu.
  - **Điểm danh theo buổi**: chọn một buổi học và điểm danh toàn bộ học viên ghi danh của buổi đó trên một màn hình (`markSession`).
  - **Lịch dạy hợp nhất** (`MentorScheduleNavTabs`): liên kết mượt giữa `/work-schedule`, `/mentor-shift-schedule`, và `/mentor-availability` kèm chú giải trạng thái thống nhất.
- **Admin Group Learning & Case Triage** (`/admin/study-courses` & `/admin/mentor-cases`):
  - Tách `/admin/study-courses` (`AdminGroupWorkspace`) thành 5 tab nghiệp vụ (`cohorts | plans | enrollments | requests | cases`), bổ sung danh sách lớp + chế độ `"Sửa lớp"`, workbench Gói khóa học 2 cột và bảng Master–Detail cho Ghi danh & Hỗ trợ ôn JLPT.
  - Tách `/admin/mentor-cases` (`AdminMentorCases`) thành trung tâm phân loại 3 tab (`complaints | schedule | transfers`).
- **Content Author Studio** (`/cms`, `/content-manual`, `/content-plan`, `/content-import-preview`, `/approved-bank`):
  - Đồng bộ trạng thái thật của AI Studio (`/content-plan`): chỉ lưu `Draft` để Author kiểm tra và mở `/content-manual` gửi Admin duyệt, tránh ghi nhãn sai là đã gửi duyệt.
  - Biểu mẫu soạn/chỉnh sửa trong `/content-manual` mở qua `Modal size="xl"` với theo dõi thay đổi chưa lưu (`confirmAction` + `beforeunload`).
  - Kho đã duyệt (`/approved-bank`) dùng phân trang phía máy chủ (`Pagination`).

---

## 6. Deep-Link & Notification Resolution Contract
- `src/app/routes/routeTable.js` và `src/features/notifications/utils/notificationDedupe.js` bảo đảm mọi `actionUrl` / query string do Backend phát sinh đều mở đúng đích:
  - `/mentor/cohorts/:cohortId` & `/mentor-study-courses/:cohortId` -> mở đúng lớp & tab ngữ cảnh (`?section=...`).
  - `/mentor/complaints/:complaintId` -> `/mentor-disputes` kèm tự chọn đúng `highlightComplaintId`.
  - `/consultation-room?roomId=...` giữ nguyên `?roomId=` (không redirect làm mất tham số); các lời mời phòng học dùng chuẩn `/meeting-room/:roomId`.
  - `/admin/study-courses?courseId=... | cohortScheduleRequestId=... | transferRequestId=... | complaintId=...` tự chọn tab và hồ sơ mục tiêu tương ứng.

---

## 7. Adaptive Desktop Width & Form Interaction Rules
- Các màn hình làm việc dạng bảng/biểu mẫu/công cụ (`MentorGrading`, `AdminSlotReview`, `AdminConsultants`, `AdminContentReview`, `CmsLessonDetail`) sử dụng `rp-container` hoặc khung Modal đủ rộng (`size="xl"` / `max-w-[1160px]`) thay cho giới hạn cột đọc văn bản (`rp-container-reading`).
- Giữ ổn định bố cục cho bảng dữ liệu & form thao tác nghiệp vụ (không gắn animation dịch chuyển gây giật cho dòng bảng hay ô nhập liệu trên Mentor/Admin/Content Author).
