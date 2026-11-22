# RikiPath.Web — Workspace Layout & Contextual Interaction Standards

Bộ quy chuẩn bắt buộc về bố cục không gian làm việc, tương tác theo ngữ cảnh và trải nghiệm người dùng cho toàn bộ **RikiPath.Web** (Learner, Giáo viên, Admin, Content Author). Mọi coding agent và developer phải đọc và tuân thủ tài liệu này trước khi triển khai bất kỳ thay đổi UI nào.

---

## 1. 12 Quy tắc cốt lõi (Mandatory Workspace Rules)

### Rule 01 — Primary Content First
Nội dung chính của trang (lưới lịch, bảng dữ liệu, vùng học bài, trình soạn thảo) luôn chiếm tối đa diện tích khả dụng ngay khi mở trang. Không để banner giới thiệu dài, bảng cấu hình phụ hoặc khối thống kê trang trí đẩy nội dung chính xuống dưới tầm nhìn.

### Rule 02 — Progressive Disclosure
Ẩn các tùy chọn nâng cao, công cụ điền mẫu và biểu mẫu phụ cho đến khi người dùng chủ động kích hoạt (qua nút gọn trên thanh công cụ để mở `Modal`, `Drawer` hoặc `Popover`).

### Rule 03 — No Unnecessary Long-Scroll Workspace
Không kéo dài một trang theo chiều dọc chỉ để xếp chồng nhiều chức năng hoặc hiển thị đồng thời cả Lịch và Bảng danh sách của cùng một nguồn dữ liệu. Áp dụng nguyên tắc **Một nội dung chính tại một thời điểm (One Primary View at a Time)**:
- Chỉ hiển thị **Lịch** hoặc **Danh sách** tại một thời điểm thông qua bộ chuyển đổi `Lịch | Danh sách` ngay trên thanh công cụ.
- Trên màn hình desktop tiêu chuẩn, `Header + Toolbar + Primary Canvas` nằm gọn trong chiều cao viewport; khi dữ liệu nhiều, chỉ vùng lưới giờ (`Time Grid`) hoặc vùng bảng (`Table`) cuộn nội bộ.

### Rule 04 — Contextual Actions
Đặt các nút thao tác gắn liền với đối tượng liên quan:
- Trên thanh công cụ Calendar/Table: điều hướng thời gian, chuyển đổi `Lịch | Danh sách`, lọc trạng thái, `Điền nhanh`, `Đăng ký giờ`, và nút hành động theo ngữ cảnh `Xem & gửi đăng ký (X)` (chỉ xuất hiện khi `X > 0`).
- Trên từng dòng của chế độ `Danh sách`: dùng nút ba chấm (`...`) ở cuối dòng mở `Popover` chứa các hành động hợp lệ (`Xem chi tiết`, `Điều chỉnh giờ`, `Hủy yêu cầu` / `Bỏ chọn`).

### Rule 05 — Modal / Drawer / Popover Selection
Chọn đúng pattern giao diện theo độ phức tạp của tác vụ (không lạm dụng Modal cho mọi thứ và không mở biểu mẫu dài inline bên dưới bảng/lịch):
- **Modal**: xác nhận danh sách (`Xác nhận lịch dạy`), chọn mẫu điền nhanh (`Điền nhanh khung giờ theo ca`), biểu mẫu chỉnh sửa ngắn/trung bình (`Điều chỉnh khung giờ`).
- **Drawer**: xem hoặc chỉnh sửa chi tiết hồ sơ/nội dung dài cần giữ ngữ cảnh trang chính.
- **Popover**: menu thao tác dòng (`...`), chọn ngày nhanh (`MiniDateJump`), bộ lọc nhỏ.
- **Tabs**: chuyển đổi giữa các góc nhìn/nghiệp vụ liên quan trong cùng một Workspace.
- **Dedicated Page**: quy trình phức tạp nhiều bước cần không gian độc lập.

### Rule 06 — Preserve User State
Tuyệt đối không làm mất các lựa chọn chưa gửi hoặc dữ liệu đang nhập khi người dùng:
- Chuyển đổi qua lại giữa chế độ `Lịch` và `Danh sách`,
- Chuyển ngày/tuần/tháng trên Calendar,
- Mở hoặc đóng Modal xem trước / điền nhanh.

### Rule 07 — Accessible Interaction
Hỗ trợ đầy đủ bàn phím (`Tab`, `Enter`, `Space`, `Escape`, phím mũi tên), thao tác chạm trên mobile/tablet, focus trap + trả focus khi đóng `Modal`/`Drawer`, và độ tương phản văn bản dễ đọc.

### Rule 08 — Clean Visual Hierarchy & Calendar Grid Alignment
- Giảm thiểu thẻ lồng nhau (nested cards), tiêu đề lặp lại, nhãn kỹ thuật dư thừa (như `1/4`, `3/4` trực tiếp trên cột ngày — chuyển thành tooltip dễ hiểu nếu cần) và khoảng đệm quá lớn.
- **Chuẩn căn thẳng cột Calendar Header & Body (Zero Scrollbar Offset Drift)**:
  - `Calendar Header` (`sticky top-0`) và `Calendar Body` phải nằm chung trong **cùng một scroll container duy nhất (`overflow-auto`)** và dùng chung một công thức `gridTemplateColumns: '64px repeat(N, minmax(0, 1fr))'`.
  - Tuyệt đối không đặt `overflow-y: auto` riêng cho `Calendar Body` bên dưới một `Calendar Header` nằm ngoài vùng cuộn dọc, và không dùng `padding-right` / offset thủ công để bù thanh cuộn.
- **Chuẩn màu nền ngày và trạng thái chọn ngày trên Calendar**:
  - Thứ Hai đến Chủ Nhật sử dụng **cùng nền trắng đồng nhất (`bg-white`)**; không tô màu nền hồng/xám riêng cho Thứ Bảy, Chủ Nhật hoặc nguyên cột ngày hôm nay.
  - **Ngày hôm nay (`isToday`)**: đánh dấu bằng vòng tròn **Soft Sakura Rose** (`bg-rp-brand-pressed text-white`) quanh số ngày trên Header.
  - **Ngày đang chọn (`isSelectedDay`)**: hiển thị highlight Sakura nhẹ trên ô Header (`bg-rp-brand-tint/35`, vạch chỉ báo `bg-rp-brand` dưới chân Header, vòng số `border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong`).
  - **Ngày hôm nay đồng thời là ngày đang chọn (`isToday && isSelectedDay`)**: kết hợp vòng tròn Sakura Rose với viền mảnh (`ring-2 ring-rp-brand-border ring-offset-1`) và vạch chỉ báo dưới chân Header, rõ ràng và không chồng màu.
- Phân biệt rõ **4 trạng thái chính + 2 trạng thái ngoại lệ** (loại bỏ nhãn `"Đã công bố"` trên lịch Giáo viên) và thông tin lớp đi kèm:
  - **Xanh lá nhạt (`Đã chọn` — Draft cục bộ chưa gửi)**: lựa chọn nháp trên client (click để bỏ chọn, kéo thả trực tiếp).
  - **Vàng hổ phách `#E4A020` (`Chờ duyệt`)**: khung giờ đã gửi lên hệ thống, đang chờ Quản trị viên duyệt.
  - **Xanh ngọc `#0D9488` (`Đã duyệt`)**: Quản trị viên đã duyệt, ghi rõ `"Chưa xếp lớp"` (không hiển thị `0/4 học viên`).
  - **Hồng Sakura `#CE476D` (`Đã xếp lớp`)**: buổi học đã gắn với lớp nhóm & sĩ số thực tế `{enrolledCount}/{capacity} học viên` (lấy từ `StudyCohort`, không dùng xanh dương).
  - **Xanh lá `#16A34A` (`Đã hoàn thành`)**: chỉ xác lập từ lifecycle / xác nhận điểm danh Backend, tuyệt đối không suy luận chỉ vì đã qua giờ kết thúc.
  - **Đỏ `#DC3545` (`Bị từ chối` / `Trùng lịch`)** và **Xám `#8B8B97` (`Đã hủy`)**: trạng thái ngoại lệ.

### Rule 09 — User-First Terminology
Không sao chép nguyên thuật ngữ kỹ thuật từ prompt hoặc hệ thống nội bộ (`API`, `snap`, `conflict`, `policy`, `workflow`, `backend`, `atomic`, `batch`, `cohort code QA-...`) lên giao diện người dùng. Dùng ngôn ngữ tự nhiên, thân thiện bằng Tiếng Việt và Tiếng Nhật (`tr` / `trf`).

### Rule 10 — Task-Level UX Gate
Trước và sau khi thực hiện bất kỳ task UI nào, agent phải kiểm tra:
1. Nội dung chính có nằm ngay trong tầm nhìn đầu tiên không?
2. Có biểu mẫu inline hay danh sách trùng lặp nào làm trang bị kéo dài không?
3. Các trạng thái `loading`, `empty`, `error`, `partial-success` đã trung thực với kết quả từ máy chủ chưa?

### Rule 11 — Responsive Workspace
- **Desktop**: tối ưu không gian rộng cho Calendar / Table với vùng cuộn nội bộ gọn gàng.
- **Tablet / Mobile**: ưu tiên chế độ xem theo Ngày (`Day View`), bảng danh sách gọn và hộp thoại chọn giờ nhanh thay vì ép lưới 7 cột quá hẹp.

### Rule 12 — Protect Business Logic
Mọi cải tiến về bố cục và thao tác phải bảo toàn 100% quy tắc nghiệp vụ, phân quyền và hợp đồng dữ liệu:
- Thời lượng buổi học 90 phút cố định và khoảng nghỉ tối thiểu 15 phút giữa hai buổi.
- Không tự động gửi duyệt khi người dùng mới chọn trên lịch hoặc mới áp dụng mẫu điền nhanh.
- Không cho phép sửa/xóa trực tiếp các buổi học đã khóa hoặc đã xếp vào lớp nhóm trái quy định máy chủ.
- Khi gửi nhiều khung giờ, phản ánh chính xác kết quả từng khung giờ từ máy chủ; giữ lại các khung giờ chưa gửi được để người dùng điều chỉnh mà không tạo bản ghi trùng.

---

## 2. 12 Quy chuẩn bắt buộc cho Calendar, Bảng dữ liệu & Hiệu năng (Mandatory Scheduling & Performance Rules)

1. **Status-Based Interaction Lock & Two-Workspace Split**: Giáo viên chỉ có **2 trang lịch** (`Lịch làm việc` chỉ hiển thị buổi sắp diễn ra / đã hoàn thành; `Đăng ký lịch dạy` quản lý đăng ký khung rảnh). Chỉ cho phép kéo thả (`drag`), chỉnh giờ trực tiếp và click bỏ chọn đối với **Draft chưa gửi** (`isSelectedDraft`). Mọi bản ghi đã lưu trên Backend (`Chờ duyệt`, `Đã duyệt`, `Đã xếp lớp`, `Đã hoàn thành`, `Bị từ chối`, `Đã hủy`) đều khóa kéo thả/sửa trực tiếp trên lưới lịch (`draggable: false, locked: true`) và chỉ xử lý hủy/điều chỉnh qua workflow Backend hợp lệ.
2. **Không dùng màu thay cho chữ**: Mọi thẻ lịch và badge trạng thái phải luôn hiển thị nhãn văn bản rõ ràng đi kèm chấm tròn màu ngữ nghĩa (`Semantic Status Dot`).
3. **Custom Listbox cho bộ lọc có màu/icon**: Không sử dụng `<select>` native khi dropdown cần hiển thị chấm màu trạng thái hoặc badge; sử dụng `StatusDotListbox` hỗ trợ đầy đủ bàn phím (`ArrowUp/Down`, `Home/End`, `Enter`, `Escape`) và `aria-selected`.
4. **Direct Row Actions đúng quyền**: Trên bảng danh sách (`Ngày | Giờ dạy | Loại lịch | Trạng thái | Thao tác`), đặt trực tiếp các nút thao tác hợp lệ (`Xem`, `Sửa giờ`, `Hủy`) ở cuối dòng thay vì ẩn toàn bộ vào menu 3 chấm; ẩn các nút không được phép theo trạng thái thực tế và mở `Modal` xác nhận giải thích rõ hậu quả khi nhấn `Hủy`.
5. **Tách biệt Loại lịch (`EventType`) và Trạng thái (`Status`)**: `Buổi lớp nhóm` là **Loại lịch** (`CohortSession` vs `Availability` / `Draft`), tuyệt đối không gộp chung làm một giá trị của bộ lọc `Trạng thái`.
6. **Đồng bộ dữ liệu Calendar & Danh sách**: Hai chế độ `Lịch | Danh sách` dùng chung nguồn dữ liệu, bộ nhớ đệm React Query, lựa chọn Draft chưa gửi và trạng thái bộ lọc (`Trạng thái`, `Loại lịch`, `Khoảng ngày`, `Khung giờ`).
7. **Không gọi API trong từng frame kéo thả**: Tuyệt đối không gửi request lên Backend trong sự kiện `pointermove`. Chỉ kiểm tra hợp lệ cục bộ trong lúc kéo và gọi API khi người dùng xác nhận lưu.
8. **60 FPS Drag & Drop — Không re-render cả lịch mỗi pixel**:
   - Xử lý `pointermove` bên trong `requestAnimationFrame`.
   - Cache tọa độ các cột ngày (`getBoundingClientRect`) khi bắt đầu phiên kéo và chỉ đo lại khi cuộn (`scrollTop`/`scrollLeft` thay đổi).
   - Chỉ cập nhật React state của `dragVisual` khi khung giờ đã snap (`dayKey` + `startMin` theo bước 15 phút) thực sự thay đổi.
   - Định vị thẻ `calendar-drag-ghost` bằng `transform: translate3d(...)` trên tầng GPU compositor thay vì thay đổi thuộc tính `top` gây layout reflow.
9. **Nhất quán giữa Bộ lọc, Sắp xếp thông minh (`Smart Sorting`) và Phân trang**:
   - Kết hợp đồng thời các điều kiện lọc bằng phép `AND` (`Khoảng ngày` + `Trạng thái` + `Loại lịch` + `Khung giờ GMT+7` theo quy tắc giao khoảng `[slotStart, slotEnd) ∩ [filterStart, filterEnd) ≠ ∅`).
   - Mặc định ưu tiên sắp xếp: (1) Khung đang chọn / Chờ duyệt cần xử lý, (2) Lịch sắp tới gần nhất trước, (3) Lịch đã qua mới nhất trước, (4) Lịch bị từ chối / đã hủy, kèm khóa phụ ổn định theo `ID`.
10. **Backend Validation & Ownership**: Backend (`/api/mentor/availability` & `/api/mentor/availability/query`) luôn kiểm tra quyền sở hữu (`MentorId == claim.Id`), trạng thái khóa, khoảng nghỉ tối thiểu và chống trùng lịch trong transaction có khóa đồng thời.
11. **Thông báo lỗi thân thiện**: Hiển thị rõ lý do cho người dùng (ví dụ: `"Giờ này đã có lịch. Vui lòng chọn thời gian khác."`, `"Bạn cần có thời gian nghỉ tối thiểu 15 phút giữa hai buổi học."`).
12. **Tối ưu hiệu năng không đánh đổi toàn vẹn dữ liệu**: Mọi tối ưu UI/render phải giữ nguyên kiểm tra xung đột, xử lý lỗi từng mục khi gửi batch và dọn dẹp sạch `requestAnimationFrame` / event listeners khi unmount.
13. **Calendar Always Renders the Calendar Grid (No Big Empty State Above/Inside Calendar)**:
    - Khi không có lịch trong ngày/tuần/tháng đang xem, **luôn hiển thị lưới Calendar bình thường** (đầy đủ Header, trục giờ, 7 cột ngày, đường kẻ giờ và khả năng click/drag). Tuyệt đối không chèn khối `ContextualEmptyState` lớn phía trên hoặc bên trong làm đẩy lưới lịch xuống hay thay thế mất Calendar.
    - Các thẻ đang chọn tạm (`isSelectedDraft`) luôn giữ hiển thị trên lưới lịch ngay cả khi người dùng đang lọc theo trạng thái đã lưu (`Chờ duyệt`, `Đã duyệt`, v.v.), trừ khi bộ lọc `Loại lịch` loại trừ rõ ràng nhóm `Khung đang chọn`.
    - Nếu người dùng đang bật bộ lọc mà không có kết quả, giữ nguyên lưới lịch và chỉ hiển thị thanh gợi ý nhỏ 1 dòng (`ActiveScheduleFilterBar` / `calendar-empty-filter-hint`) kèm nút **Xóa bộ lọc**, không che vùng thao tác.
    - Chế độ **Danh sách (`List` / `Table` / `agenda`)** được phép hiển thị `ContextualEmptyState` khi không có dòng dữ liệu nào vì không có lưới thời gian.

---

## 3. Quy chuẩn màn hình CRUD Quản trị (Admin CRUD Workspace Standards)

Áp dụng cho các trang quản trị danh mục (`AdminStudyCatalog`, `AdminCertificateSections`, `AdminUsers` và các danh sách cấu hình tương tự):

1. **Page Header + Primary CTA**: Tiêu đề, mô tả 1 dòng ngắn gọn và nút hành động chính (`+ Thêm ...`) nằm gọn bên phải `PageHeader` bằng `Button variant="primary"`.
2. **Segmented Tabs chỉ dành cho nhóm dữ liệu**: Dùng `Tabs` (`variant="pill"`) để chuyển giữa các thực thể ngang hàng (ví dụ: `Chứng chỉ` | `Cấp độ`). **Tuyệt đối không** biến `Tạo mới` thành một Tab riêng hoặc đặt form tạo/sửa cố định chiếm phần đầu trang.
3. **Compact Management Table trên Desktop + Compact List trên Mobile**:
   - Hiển thị danh sách dạng Table 1 hàng mỗi bản ghi với tỷ lệ cột cân đối, `Badge` trạng thái semantic nhẹ (`Hoạt động` / `Ngừng sử dụng`), và nút `Sửa` ở cột `Thao tác` cuối hàng.
   - Không render mỗi bản ghi thành một Card cao lặp lại tiêu đề/mô tả và nút đặt bên dưới.
   - Không hiển thị ID kỹ thuật từ database (như `#1`, `Sửa #1`) trừ khi nghiệp vụ đối soát thực sự cần.
   - Trên màn hình nhỏ (`< md`), tự động chuyển sang Compact Card List không gây scroll ngang.
4. **Contextual Create / Edit Modal với Unsaved Guard**:
   - Nhấn `+ Thêm ...` hoặc `Sửa` mở `Modal` (`size="md"`), bố cục form dọc dùng `Field` (`label` phía trên `Input`/`Select`/`Textarea`), footer chuẩn `Hủy` + `Lưu thay đổi`.
   - Hiển thị lỗi validation ngay dưới field tương ứng; tự đóng Modal và làm mới dữ liệu khi lưu thành công.
   - Khi Modal có thay đổi chưa lưu (`isDirty`), đóng bằng `Hủy` / `X` / `Escape` phải hỏi xác nhận qua `AlertDialog` (`Bỏ thay đổi chưa lưu?`).
5. **Chỉ thêm filter / search / pagination khi dữ liệu thực sự cần**: Danh mục ít bản ghi (1–15 dòng) ưu tiên giao diện sạch, không nhồi filter bar hay KPI card thừa; chỉ hiện bộ lọc (như lọc theo chứng chỉ cha) khi thực sự có từ 2 nhóm trở lên.
6. **Bảo toàn dữ liệu lịch sử**: Thao tác vô hiệu hóa (`isActive = false`) hoặc lưu trữ (`Lưu trữ`) phải giải thích rõ không làm mất dữ liệu khóa học/bài học lịch sử và xác nhận trước khi lưu trữ.
7. **Dropdown / Select chuẩn thay thế native select**: Toàn bộ thanh lọc (Toolbar filters) và biểu mẫu (Form Modals) phải sử dụng `CustomSelect` (`Select` từ `@/components/ui`) thay cho thẻ `<select>` native của trình duyệt. Dropdown hiển thị qua Popover nền trắng mềm mại, viền nhẹ, hover Sakura, tick chọn `Check` cho mục đang kích hoạt, mũi tên `ChevronDown` xoay 180° tinh tế, hỗ trợ phím điều hướng (ArrowUp/Down, Enter, Space, Escape) và không bị cắt bởi viền container.
8. **Admin CRUD & Data Integrity Standards (Thứ tự hiển thị, Validation & Concurrency)**:
   - **Frontend validate inline, Backend & PostgreSQL là tuyến bảo vệ cuối cùng**: Mọi thao tác tạo/sửa phải validate ngay dưới field (bắt buộc, trim/chuẩn hóa khoảng trắng, giới hạn độ dài, số nguyên dương `>= 1`), focus vào field lỗi đầu tiên, disable nút Lưu khi đang gửi và giữ nguyên dữ liệu form khi API trả lỗi.
   - **Phạm vi duy nhất & liên tục rõ ràng**: Danh mục có thứ tự (như `Chứng chỉ` 1..N toàn cục, `Cấp độ` 1..N theo từng chứng chỉ cha) phải tự động gợi ý vị trí tiếp theo khi tạo mới, cung cấp thao tác `Di chuyển lên` / `Di chuyển xuống` (khóa trong phạm vi danh sách cha), và hiển thị preview dịch chuyển nếu Admin đổi số thủ công vào vị trí đã có mục khác.
   - **Atomic Reordering & Concurrency**: Đổi thứ tự phải thực thi nguyên tử trong transaction kèm kiểm tra `ExpectedRevision` / `OrderToken` (trả `409 Conflict` với mã `ORDER_REVISION_CONFLICT`, `DISPLAY_ORDER_CONFLICT`, `CERTIFICATE_ALREADY_EXISTS`, `LEVEL_ALREADY_EXISTS`, hoặc `400` `DISPLAY_ORDER_INVALID` / `404` `CERTIFICATE_NOT_FOUND` — không trả `500` cho lỗi validation). PostgreSQL bảo vệ bằng `CHECK ("SortOrder" >= 1)`, `UNIQUE (...) DEFERRABLE INITIALLY DEFERRED` và functional unique index chuẩn hóa chữ hoa/thường + khoảng trắng.
   - **Bảo toàn quan hệ lịch sử**: Không tự đổi khóa định danh lịch sử (`CertificateTypeId`, `Code`) sau khi đã tạo và không xóa bản ghi đang có tham chiếu chỉ để sửa trùng thứ tự.
9. **Centralized Business Configuration & Payment Read-Only Transparency (`/admin/plans`, `/admin/payments`, `/admin/policies`)**:
   - **Quản lý bảng giá thật qua Admin (`AdminPlansWorkspace`)**: Không hard-code giá gói học hay dải ID trên Frontend hoặc Backend; Modal tạo/sửa gói tự học/lượt AI phải hiển thị live Learner card preview và yêu cầu xác nhận khi thay đổi giá/tạm ngừng bán gói đang có người mua (`AlertDialog`), bảo toàn snapshot đơn cũ.
   - **Đối soát thanh toán chỉ đọc (`AdminPaymentsWorkspace`)**: Hiển thị trạng thái cấu hình cổng PayOS qua các cờ boolean và URL công khai (tuyệt đối không lộ secret key), tổng hợp đủ các luồng thanh toán kèm bộ lọc/chi tiết `OrderSnapshot`; không đặt nút chuyển trạng thái sang `Paid` thủ công.
   - **Cấu hình chính sách theo phiên bản (`AdminLearningPolicies`)**: Quản lý các quy tắc kinh doanh có thể điều chỉnh qua hệ thống phiên bản hiệu lực (`MentorGroupPolicy`), tách biệt rõ với ranh giới vận hành cố định chỉ đọc.
10. **Content Author Studio Lifecycle & Shared Primitive Standards**:
   - **Lifecycle hoàn chỉnh (End-to-End)**: Tác giả nội dung đi xuyên suốt `Tạo mới -> Lưu bản nháp -> Xem trước -> Chỉnh sửa -> Gửi duyệt -> Xử lý mục bị từ chối (xem góp ý Admin + sửa & gửi lại) / Xóa bản nháp -> Tra cứu Kho đã duyệt`; mọi màn hình phải kết nối trực tiếp bằng deep-link (`?editId=`, `?type=`, `?status=`, `?batchId=`) và Modal `ContentForm` / `ContentPreviewPanel` dùng chung.
   - **Đồng bộ UI Sakura**: Toàn bộ màn hình Content Author sử dụng `@/components/ui` (`PageHeader`, `Card`, `DataTable`, `CustomSelect`, `Checkbox`, `Radio`, `Input`, `Textarea`, `Modal`, `AlertDialog`, `Tabs`, `Badge`, `Pagination`), validation hiển thị inline dưới trường lỗi và không có nút hay form tĩnh giả ("Bố cục mẫu", "Nháp cục bộ").
11. **Admin Control Center Workspace Standards (Anti-Wall-of-Controls & Case Queues)**:
   - **Không nhồi Form tạo/sửa cố định bên dưới Bảng**: Bảng dữ liệu (`DataTable`) luôn nằm ở vùng chính (`Primary Content First`). Biểu mẫu Tạo/Sửa (tài khoản, giáo viên, lớp nhóm, gói học) mở qua `Modal` (`size="md"`/`"xl"`), còn chi tiết xem xét / cấp quyền / đổi giáo viên mở qua `Drawer`.
   - **Quản lý chính sách nhiều tham số qua Summary -> History -> Drawer Wizard (`AdminMentorGroupPolicy`)**: Tách màn hình thành KPI tóm tắt phiên bản hiệu lực + Bảng lịch sử kèm `Modal` so sánh diff; chỉnh sửa/ban hành phiên bản mới nằm trong `Drawer` chia thành 6 bước `Tabs` (`variant="pill"`) có bước xem lại diff trước khi lưu.
   - **Tình trạng Rỗng đơn nhất & Nhất quán thuật ngữ**: Khi danh sách hoặc hàng đợi không có dữ liệu, chỉ hiển thị **một** `ContextualEmptyState` / `EmptyState` rõ ràng; toàn bộ UI dùng thuật ngữ **`Giáo viên`** (chỉ giữ `"mentor"` trong URL/route kỹ thuật hoặc payload API).
12. **Universal Account & Settings Workspace Standards (All Roles)**:
   - **Không chuyển hướng thô ra ngoài AppShell cho thao tác tài khoản thường nhật**: Người dùng ở mọi vai trò mở `/profile` (hoặc menu Avatar ở góc trên bên phải) để chỉnh hồ sơ, tải/xóa avatar, bật/tắt thông báo, đổi ngôn ngữ, đổi mật khẩu hoặc đổi email ngay trong shell làm việc của mình; không trùng lặp `DisplayName` và không dùng `LEVEL_BY_ID` cứng.
   - **An toàn phiên & xác nhận thay đổi chưa lưu**: Khi rời form đang sửa hồ sơ phải hỏi qua `AlertDialog`; sau khi đổi/tạo mật khẩu hoặc hoàn tất xác thực `PendingEmail` phải đăng xuất có thông báo để buộc đăng nhập lại bằng phiên mới (`TokenVersion`).

---

## 4. Complete Workspace UX Review Standard (Mandatory for All Future UI Tasks)

Mọi task xây dựng hoặc nâng cấp giao diện trong `RikiPath.Web` (Learner, Giáo viên, Content Author, Admin) phải tuân thủ đầy đủ quy chuẩn rà soát toàn diện:

1. **Rà soát trọn vẹn mọi màn hình & chi tiết lồng nhau**: Kiểm tra toàn bộ route công khai/ẩn, nested detail, tabs, modal, drawer và popover thuộc phạm vi tính năng trước khi chỉnh sửa; không sửa rời rạc vài trang mẫu.
2. **Dùng Shared UI Primitives (`@/components/ui`)**: Mọi control (`Button`, `Input`, `SearchInput`, `Textarea`, `CustomSelect`/`Select`, `StatusDotListbox`, `DateRangePicker`, `FilterPopover`, `SegmentedControl`, `Tabs`, `DataTable`, `Pagination`, `Modal`, `Drawer`, `AlertDialog`, `Badge`, `Banner`, `ContextualEmptyState`/`ContextualErrorState`/`QueryState`) dùng thống nhất Design System; không dùng `<select>` thô hay dựng lại component trùng lặp.
3. **Không nhồi nhét & không trùng lặp luồng**: Đưa tác vụ tạo/sửa/xem chi tiết/xác nhận vào `Modal`/`Drawer`/`Tabs`/`Popover` theo Rule 05; không xếp inline form dài dưới bảng/lịch hoặc kéo dài trang với nội dung hướng dẫn thừa.
4. **Ngôn ngữ tự nhiên VI/JA, không jargon**: Không đưa thuật ngữ kỹ thuật (`API`, `backend`, `OCR`, `policy`, `sync`, `snap`, `#id` nội bộ) hay tên vai trò nội bộ `Mentor` vào giao diện người dùng (dùng `Giáo viên`); mọi nhãn/thông báo qua `tr()`/`trf()` và `fmt` với múi giờ `Asia/Ho_Chi_Minh`.
5. **Trung thực mọi trạng thái & dữ liệu thật**: Phân biệt rõ đang tải, rỗng, không khớp lọc, hết lượt/chưa mở khóa, không đủ quyền và lỗi máy chủ; tuyệt đối không hard-code giá, chính sách, tiến độ giả, hoặc tự suy diễn trạng thái hoàn thành từ đồng hồ cục bộ.
6. **Responsive & Quyền hạn**: Xác minh hiển thị sạch trên Desktop (`1920`, `1440`, `1366`), Tablet (`1024`, `768`) và Mobile (`390`, `375`) không tràn ngang; bảo toàn nguyên vẹn kiểm soát quyền ở cả Frontend và Backend.
7. **Chỉ báo cáo hoàn tất sau xác minh thực tế**: Kiểm tra từng màn hình, modal, bộ lọc, validation, locale VI/JA và console trình duyệt trước khi tổng kết.
