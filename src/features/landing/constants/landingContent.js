// Landing copy. Descriptive only: no learner counts, ratings, testimonials or scores, because
// RikiPath has no verified public figures. Business facts mirror current rules:
//  - JLPT levels supported: N5–N2 (features/mentor/api/mentorGovernanceApi.js SUPPORTED_JLPT_LEVELS)
//  - Group classes: 10 weeks, 90-minute sessions, 1–4 learners, paid in full via PayOS.

export const HERO_POINTS = [
  { key: 'levels', label: 'Lộ trình JLPT N5–N2' },
  { key: 'srs', label: 'Ôn tập lặp ngắt quãng' },
  { key: 'group', label: 'Lớp nhóm 1–4 học viên' },
];

export const LEVELS = [
  { level: 'N5', name: 'Nền tảng', text: 'Kana, từ vựng và mẫu câu cơ bản.', kanji: '基' },
  { level: 'N4', name: 'Sơ cấp', text: 'Hội thoại hằng ngày, Kanji thông dụng.', kanji: '初' },
  { level: 'N3', name: 'Trung cấp', text: 'Đọc hiểu đoạn văn, nghe tình huống.', kanji: '中' },
  { level: 'N2', name: 'Trung cao cấp', text: 'Văn bản dài, ngữ pháp nâng cao.', kanji: '上' },
];

// Learning ecosystem (bento grid). `art` = StudyIllustration name, `size` = bento cell, `preview` = mini UI,
// `fx` = hover gesture. `to` only points at public routes that exist (routeTable.js).
export const TOOLS = [
  { key: 'vocabulary', art: 'vocabulary', size: 'wide', preview: 'flashcard', fx: 'flip', title: 'Từ vựng', text: 'Sổ từ theo chủ đề, ví dụ, phát âm và lưu vào sổ tay cá nhân.' },
  { key: 'srs', art: 'srs', size: 'tall', preview: 'srs', fx: 'spin', title: 'Ôn tập SRS', text: 'Thẻ đến hạn được nhắc lại đúng lúc trước khi bạn kịp quên.', to: '/feature/srs' },
  { key: 'grammar', art: 'grammar', fx: 'stack', title: 'Ngữ pháp', text: 'Mẫu câu theo cấp độ, ví dụ ngữ cảnh và bài luyện ngắn.' },
  { key: 'kanji', art: 'kanji', fx: 'draw', title: 'Hán tự', text: 'Viết theo thứ tự nét và nhận diện chữ Hán theo cấp độ.' },
  { key: 'kana', art: 'kana', fx: 'flip', title: 'Kana', text: 'Luyện Hiragana, Katakana cùng âm đục, âm ghép và phát âm.' },
  { key: 'reading', art: 'reading', fx: 'stack', title: 'Đọc hiểu', text: 'Đoạn văn theo cấp độ JLPT kèm câu hỏi và giải thích.' },
  { key: 'listening', art: 'listening', fx: 'tick', title: 'Nghe hiểu', text: 'Bài nghe có âm thanh, câu hỏi và đáp án sau khi nộp.' },
  { key: 'writing', art: 'writing', fx: 'draw', title: 'Luyện viết', text: 'Viết câu, đoạn văn và nhận góp ý tham khảo từ Haru.', to: '/feature/ai-scoring' },
  { key: 'speaking', art: 'speaking', fx: 'tick', title: 'Luyện nói', text: 'Đọc theo, ghi âm và nhận góp ý phát âm từ Haru.', to: '/feature/shadowing' },
  { key: 'mock', art: 'mock', size: 'wide', preview: 'exam', fx: 'tick', title: 'Thi thử JLPT', text: 'Đề tính giờ theo cấu trúc JLPT, nộp bài có xác nhận, xem kết quả từng phần.', to: '/thi-thu' },
];

export const PERSONAL = [
  { title: 'Bắt đầu đúng trình độ', text: 'Bài đánh giá năng lực gợi ý cấp độ khởi đầu thay vì bắt bạn học lại từ đầu.' },
  { title: 'Gợi ý việc nên học tiếp', text: 'Bảng học tập gom bài học, thẻ đến hạn ôn và đề luyện theo mục tiêu JLPT của bạn.' },
  { title: 'Góp ý từ Haru AI', text: 'Haru góp ý bài viết, bài nói và cách ôn từng kỹ năng. Góp ý của AI mang tính tham khảo.' },
  { title: 'Theo dõi tiến độ', text: 'Tiến độ bài học, lịch sử thi thử và kết quả theo từng phần được lưu trên tài khoản.' },
];

export const INTENSITY = [
  { name: 'Nhẹ', perWeek: 2, sessions: 20, hours: 30, note: 'Phù hợp người đi làm, cần nhịp đều đặn.', days: [1, 4] },
  { name: 'Tiêu chuẩn', perWeek: 3, sessions: 30, hours: 45, note: 'Cân bằng giữa học trên lớp và tự ôn.', days: [0, 2, 4] },
  { name: 'Nâng cao', perWeek: 4, sessions: 40, hours: 60, note: 'Tăng tốc trước kỳ thi.', days: [0, 1, 3, 4] },
];

export const GROUP_STEPS = [
  { title: 'Chọn Mentor', text: 'Xem hồ sơ, trình độ giảng dạy và đánh giá từ học viên lớp nhóm.' },
  { title: 'Chọn lớp', text: 'So sánh lịch học, cường độ, chỗ còn trống và học phí trọn khóa.' },
  { title: 'Giữ chỗ & thanh toán', text: 'Chỗ được giữ trong thời gian thanh toán qua PayOS; ghi danh có hiệu lực khi hệ thống xác minh.' },
  { title: 'Vào lớp', text: 'Lịch học, phòng học trực tuyến, điểm danh, bài tập về nhà và tổng kết khóa.' },
];

export const JOURNEY = [
  { art: 'notebook', title: 'Đăng ký', text: 'Tạo tài khoản miễn phí và xác thực email.' },
  { art: 'roadmap', title: 'Chọn mục tiêu JLPT', text: 'Chọn cấp độ mục tiêu, làm bài đánh giá năng lực.' },
  { art: 'vocabulary', title: 'Học & luyện tập', text: 'Bài học, từ vựng, Kanji, ngữ pháp và đề thi thử.' },
  { art: 'progress', title: 'Theo dõi tiến độ', text: 'Xem tiến độ bài học và kết quả từng lần thi thử.' },
  { art: 'ai', title: 'Nhận gợi ý & hỗ trợ', text: 'Gợi ý ôn tập, góp ý của Haru và lớp nhóm cùng Mentor.' },
];

export const FAQ = [
  ['Nội dung ôn luyện JLPT gồm những gì?', 'Từ vựng, Hán tự, ngữ pháp, đọc hiểu và nghe hiểu theo cấp độ N5–N2. Luyện nói và viết cùng Haru là kỹ năng bổ trợ.'],
  ['Học nhóm khác gì tự học?', 'Tự học theo lộ trình và thi thử trên nền tảng. Học nhóm là lớp nhỏ cùng Mentor trong 10 tuần, có lịch cố định, bài tập về nhà và nhận xét.'],
  ['Haru có thay Mentor không?', 'Không. Haru góp ý nhanh khi bạn luyện tập; Mentor dạy lớp nhóm, chấm bài và theo dõi tiến độ.'],
  ['Thanh toán lớp nhóm thế nào?', 'Thanh toán trọn khóa qua PayOS. Trạng thái ghi danh chỉ được xác nhận sau khi máy chủ xác minh giao dịch.'],
];

export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
