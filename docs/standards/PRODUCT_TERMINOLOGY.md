# Product terminology (VI ↔ JA)

The single source for user-facing product words. Web (`src/locales/`), Mobile (Flutter ARB/l10n) and
Backend-generated messages must use these terms. Do not invent new business terms; add a row here first.

Never translate: **RikiPath**, **Haru**, **JLPT**, level codes **N5–N2**, **PayOS**, API identifiers, enum values.

| Concept | Tiếng Việt | 日本語 |
|---|---|---|
| Learner dashboard | Bảng học tập | 学習ダッシュボード |
| Learning roadmap | Lộ trình học / Lộ trình JLPT | 学習ロードマップ / JLPTロードマップ |
| Lesson | Bài học | レッスン |
| Vocabulary | Từ vựng | 単語 |
| Grammar / grammar pattern | Ngữ pháp / Mẫu ngữ pháp | 文法 / 文型 |
| Kanji | Hán tự (Kanji) | 漢字 |
| Kana | Kana | かな |
| Review (SRS) | Ôn tập SRS | SRS復習 |
| Due cards | Thẻ đến hạn | 復習予定のカード |
| Study notebook | Sổ tay học tập · Sổ từ · Sổ Hán tự | 学習ノート · 単語ノート · 漢字ノート |
| Listening / Reading | Nghe hiểu / Đọc hiểu | 聴解 / 読解 |
| Listening / Reading / Writing / Speaking practice | Luyện nghe / Luyện đọc / Luyện viết / Luyện nói | リスニング練習 / 読解練習 / ライティング練習 / スピーキング練習 |
| Mock exam | Thi thử JLPT · Đề thi thử | JLPT模擬試験 · 模擬試験 |
| Placement test | Bài đánh giá năng lực | レベル診断 |
| Self-study plan | Gói tự học | 自習プラン |
| AI grading uses | Lượt chấm AI | AI採点回数 |
| Guided group learning / group class | Học cùng Giáo viên / Lớp học nhóm | 教師と学ぶ / グループレッスン |
| Cohort (one class) | Lớp | クラス |
| Mentor (user-facing role) | Giáo viên | 教師（担当授業では講師） |
| Session (90 min) | Buổi học | 授業 |
| Class schedule | Lịch học | 授業スケジュール |
| Teaching schedule (Mentor) | Lịch dạy | 授業スケジュール |
| Availability slots | Khung giờ rảnh / Lịch rảnh | 授業可能時間 |
| Intensity 2/3/4 per week | Nhẹ / Tiêu chuẩn / Nâng cao | 控えめ / 標準 / 集中 |
| Enrollment | Ghi danh | 申込 |
| Seat hold during checkout | Giữ chỗ | 席の確保 |
| Homework (shared / individual) | Bài tập về nhà (bài tập chung / bài tập cá nhân) | 宿題（共通課題 / 個別課題） |
| Attendance | Điểm danh | 出欠確認 |
| Present / Excused / Absent | Có mặt / Vắng có phép / Vắng | 出席 / 届出欠席 / 欠席 |
| Reschedule / cancel request | Yêu cầu dời/hủy lịch | 日程変更・中止の申請 |
| Class transfer | Chuyển lớp | クラス変更 |
| Complaint | Khiếu nại | お問い合わせ・苦情 |
| Refund review | Xem xét hoàn tiền | 返金審査 |
| Mentor replacement | Thay Giáo viên | 担当講師の交代 |
| Course completion summary | Tổng kết khóa học | コース修了まとめ |
| Notifications / Settings | Thông báo / Cài đặt | 通知 / 設定 |
| Content Author | Tác giả nội dung | コンテンツ作成者 |
| Admin | Quản trị viên | 管理者 |

## Business facts that copy must respect

- Group class: 1 Mentor, 1–4 Learners, 10 weeks, 90-minute sessions, 2/3/4 sessions per week (20/30/40 sessions).
- Group learning is separate from the self-study plan and AI credits; there is no 1-1 booking and no Mentor payroll in the product.
- JLPT levels offered: N5–N2.
- Web UI dùng “Giáo viên” cho vai trò Mentor và “Học cùng Giáo viên” cho khu vực lớp có hướng dẫn. Giữ nguyên `Mentor` trong role, API, route, entity và dữ liệu lịch sử/người dùng tự nhập.
- Sidebar Learner đi theo hành trình: Tổng quan → Học cùng Giáo viên → Lộ trình học JLPT → Thư viện tiếng Nhật → Góc học tập của tôi → Luyện tập & Thi thử. Chỉ tạo liên kết đến màn/route đang hoạt động; không dựng trang tiến độ riêng khi chưa có contract.
- Internal ids, QA codes or cohort codes (e.g. `QA-E2E-COHORT-…`) are never shown as names; show the class name.
- Abbreviations are not used in UI copy: "BTVN" → "bài tập về nhà / bài tập", "HV" → "học viên", "p/h" → "phút/giờ",
  "Placement" → "bài đánh giá năng lực", "Cutoff" → "khóa ghi danh". Entitlement reference codes are admin-only.
- Mobile (`RikiPath.Mobile/lib/l10n/app_vi.arb`, `app_ja.arb`) must use the same terms; some Dart screens still
  contain hard-coded Vietnamese ("BTVN", status labels) and need migrating to ARB keys.
