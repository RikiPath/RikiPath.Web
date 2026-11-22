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
  - **Learner**: Thứ tự hành trình từ trên xuống dưới gồm `Tổng quan`, **`Học cùng Giáo viên`** (đặt ngay dưới Tổng quan: `Tổng quan lớp học` `/group-learning`, `Tìm Giáo viên` `/mentors`, `Khám phá lớp học` `/cohorts`, `Lớp của tôi` `/my-courses`, `Lịch học` `/calendar`, `Bài tập về nhà` `/homework`, `Tiến độ học nhóm` `/group-learning/progress`), tiếp theo là `Lộ trình học JLPT`, `Thư viện tiếng Nhật`, `Góc học tập của tôi`, `Luyện tập & Thi thử`, và `Tiện ích & Tài khoản`.
  - **Mentor**: 3 nhóm chính (`Tổng quan`, `Giảng dạy`, `Chất lượng & Hồ sơ`). Riêng phần lịch của Giáo viên **chỉ giữ 2 trang trực tiếp** để tránh trùng lặp chức năng:
    1. **Lịch làm việc (`/work-schedule`)** — *"Tôi phải dạy buổi nào?"*: chỉ hiển thị buổi dạy chính thức đã xếp lớp (`Sắp diễn ra` / `Đã hoàn thành`), không trộn khung giờ mới đăng ký/chờ duyệt/từ chối và không cho kéo thả.
    2. **Đăng ký lịch dạy (`/mentor-shift-schedule`)** — *"Tôi có thể dạy vào lúc nào?"*: hợp nhất toàn bộ thao tác chọn nhiều khung 90 phút, kéo thả Draft, Điền nhanh theo ca mẫu, xem trạng thái phê duyệt (`Chờ duyệt`, `Đã duyệt`, `Đã xếp lớp`, `Đã hoàn thành`, `Bị từ chối`, `Đã hủy`) và gửi yêu cầu điều chỉnh/hủy. Mọi liên kết cũ tới `/mentor-availability` tự động chuyển hướng về `/mentor-shift-schedule`. Tuyệt đối không tạo thêm trang lịch thứ 3 cho Giáo viên.
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
  - **Lịch dạy tối giản 2 không gian**: Chỉ tồn tại `/work-schedule` (*Lịch làm việc*) và `/mentor-shift-schedule` (*Đăng ký lịch dạy*); `/mentor-availability` tự động chuyển hướng sang `/mentor-shift-schedule`. Dùng chung 4 trạng thái chính (`Chờ duyệt`, `Đã duyệt`, `Đã xếp lớp` màu Sakura `#CE476D`, `Đã hoàn thành`) và 2 ngoại lệ (`Bị từ chối`, `Đã hủy`); hiển thị đúng tên lớp, thứ tự buổi và sĩ số thực tế `{enrolledCount}/{capacity}` từ Cohort.
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

---

## 8. Admin Navigation & Business Configuration Hierarchy
- Nhóm Sidebar **Điều hành** của Admin gồm: `Tổng quan` (`/admin/dashboard`), `Người dùng & vai trò` (`/admin/users`) và `Thanh toán & giao dịch` (`/admin/payments`).
- Nhóm Sidebar **Cấu hình** (đổi tên từ *Nội dung*, bố cục phẳng một cấp) gồm: `Chứng chỉ & cấp độ` (`/admin/study-catalog`, đổi tên từ *Cấu hình JLPT*), `Phần thi` (`/admin/certificate-sections`), `Gói học & bảng giá` (`/admin/plans`), `Chính sách học tập` (`/admin/policies`, hỗ trợ deep link cũ `/admin/mentor-group-policy`) và `Duyệt nội dung` (`/admin/content-review`).
- Mọi breadcrumb tự động bám theo `ROLE_NAV.Admin` (ví dụ `Quản trị › Cấu hình › Chứng chỉ & cấp độ`), đồng bộ hai ngôn ngữ VI/JA.

---

## 9. Content Author Studio VNext Architecture
- Quy tắc cốt lõi: **Every Content Author screen must be designed and validated as part of a complete content lifecycle, not as an isolated page.**
- Điều hướng vai trò `ContentAuthor` (`area: 'Tác giả nội dung'`) gồm 3 nhóm trong `ROLE_NAV.ContentAuthor`:
  1. **Tổng quan**: `Studio` (`/cms-studio`), `Nội dung của tôi` (`/author-dashboard`).
  2. **Biên soạn & Kho học liệu**: `Biên soạn học liệu` (`Biên soạn nội dung` `/content-manual`, `Bài học` `/lesson-cms`, `Đề thi thử` `/exam-builder`, `Trợ lý biên soạn` `/content-plan`) và `Kho đã duyệt` (`Từ vựng` `/vocabulary-editor`, `Hán tự` `/kanji-editor`, `Ngữ pháp` `/content-library`, `Ngân hàng câu hỏi` `/question-bank`).
  3. **Nhập liệu**: `Nhập Excel` (`/bulk-import`), `Lịch sử nhập liệu` (`/bulk-import?view=history`).
- Cấp độ chứng chỉ được đồng bộ động từ `GET /api/content-author/manual/lookups` qua `useAuthorLookups()` (hỗ trợ đầy đủ `N5`–`N1` và mọi cấp độ mới do Admin cấu hình; tuyệt đối không hard-code `N5..N2`).
- Tất cả trang kho đã duyệt (bao gồm `Ngân hàng câu hỏi`) đọc dữ liệu thật từ `/api/SharedBank/*` có phân trang và Modal chi tiết; tuyệt đối không dùng dữ liệu mẫu hay lưu nháp cục bộ trình duyệt giả.

---

## 10. Admin Control Center VNext Architecture
- **Canonical Query & Invalidation (`src/features/admin/api/adminQueryKeys.js`)**: Toàn bộ màn hình Admin dùng chung `ADMIN_KEYS` và `invalidateAdminDomains(queryClient, domains)` (`users`, `mentors`, `schedules`, `policy`, `cohorts`, `plans`, `content`, `catalog`) để số liệu Dashboard, danh sách và phân quyền luôn đồng bộ sau mutation.
- **Không trùng lặp navigation nội bộ**: `AdminMentorHub` sử dụng trực tiếp Sidebar + Sub-menu của `ROLE_NAV.Admin`; không render thanh `<nav>` card lặp lại trên đầu trang.
- **Phân biệt Quyền giảng dạy JLPT & Chứng chỉ cá nhân (`/admin/mentor-qualifications`)**: Hỗ trợ đầy đủ cấp độ JLPT `N5`–`N1` động, đồng bộ thật với `/api/admin/mentors/qualifications` và kiểm tra hồ sơ đã duyệt + trần trình độ đã xác minh trước khi cấp quyền.
- **Quản trị an toàn dữ liệu & Kiểm toán Backend**: Các thao tác nhạy cảm của Admin (quản lý tài khoản/vai trò, hồ sơ/quyền Giáo viên, lịch dạy, lớp nhóm, phần thi, chính sách, duyệt nội dung) thực thi trong transaction, bảo vệ tài khoản/lớp/lịch đang hoạt động bằng `409 Conflict` và ghi `AdminAuditLogs`.

---

## 11. Universal Profile & Settings Architecture (All Roles)
- Nguyên tắc cốt lõi: **One Account Identity — Shared Profile Experience — Role-Aware Extensions.**
- Một không gian tài khoản dùng chung (`/profile`, đồng bộ `/settings`) phục vụ tất cả 4 vai trò (`Learner`, `Mentor`, `ContentAuthor`, `Admin`) bên trong đúng `AppShell` của từng vai trò (`RoleAccountShell`), tránh nhân bản màn hình cài đặt rời rạc hoặc trả `403`.
- **Shared Core (`ProfileWorkspace`)**:
  - `ProfileHeader`: avatar đồng bộ Header + modal tải/cắt/xóa ảnh (`AvatarUploaderModal`, kiểm tra magic bytes JPEG/PNG/WebP `<= 5 MB` trên Backend), hiển thị một `FullName` duy nhất, huy hiệu vai trò, trạng thái xác thực email, `PendingEmail` và phương thức đăng nhập (`Mật khẩu nội bộ` / `Google`).
  - `PersonalInformationSection`: xem/sửa `FullName` và `PhoneNumber` có dirty-check, đọc thông tin mở rộng theo vai trò (Học viên -> Mục tiêu học tập; Giáo viên -> trạng thái kiểm duyệt & liên kết `/mentor-profile`; Tác giả -> `/cms-studio`; Admin -> khóa tự sửa phân quyền).
  - `AccountSecuritySection`: đổi mật khẩu có đo độ mạnh, hỗ trợ thiết lập mật khẩu lần đầu cho tài khoản Google chưa có mật khẩu (`POST /api/Auth/set-password`), quy trình đổi email an toàn 2 bước giữ `Email` cũ tới khi xác nhận OTP qua `PendingEmail`, và thu hồi toàn bộ phiên cũ bằng `TokenVersion`.
  - `NotificationPreferencesSection`: công tắc kênh (Email / In-App), danh mục thông báo riêng từng vai trò (`NotificationCategories`), khóa bắt buộc `securityAlerts`, thực thi thật khi phát sinh thông báo/email ở Backend.
  - `PreferencesSection`: ngôn ngữ VI/JA và khung giờ học ưu tiên (`studyTimePreference`, Learner).
- **Learner Extension (`LearningGoalsSection`)**: đồng bộ cấp độ động `N5`–`N1` từ API chứng chỉ (tuyệt đối không hard-code danh sách tĩnh `1..4`), phân tách rõ Mục tiêu đang chọn, Trình độ đánh giá đầu vào, Chứng chỉ tự khai báo và Cấp độ đang học.
