export const FEATURES = {
  shadowing: {
    slug: 'shadowing',
    title: 'Luyện shadowing theo câu mẫu',
    eyebrow: 'Kỹ thuật phát âm',
    icon: 'record_voice_over',
    iconWrap: 'bg-rp-brand-soft text-rp-brand-strong',
    ctaLabel: 'Trải nghiệm kỹ thuật',
    tryTo: '/lesson-player',
    tryLabel: 'Mở bài shadowing mẫu',
    lead: 'Rèn ngữ điệu, ngắt câu và trọng âm theo câu mẫu — phản xạ nói tự nhiên thay vì đọc từng từ.',
    stats: [
      { k: 'Theo câu', v: 'luyện từng câu mẫu' },
      { k: 'Ghi âm', v: 'nghe lại giọng của bạn' },
      { k: 'Haru AI', v: 'góp ý phát âm' },
    ],
    steps: [
      { t: 'Nghe mẫu', d: 'Câu thoại công sở / tin ngắn, waveform và dấu ngắt hơi hiện sẵn.' },
      { t: 'Nói chồng giọng', d: 'Thu âm cùng lúc với bản gốc, giữ nhịp chứ không dịch trong đầu.' },
      { t: 'Đối chiếu pitch', d: 'AI khoanh âm tiết lệch cao độ, đề xuất câu cần ôn lại.' },
    ],
    points: [
      'Bỏ rào ấp úng khi trả lời hội thoại 30 giây',
      'Luyện kaiwa công sở và phỏng vấn Tokutei',
      'Đồng bộ với bài ngữ pháp đang học trên lộ trình',
    ],
    demo: {
      title: 'Phiên mẫu · Bài 15',
      line: '今、電話をかけてもいいですか。',
      note: 'Ngắt hơi sau 「今」、pitch rơi ở 「でんわ」。',
    },
  },
  'ai-scoring': {
    slug: 'ai-scoring',
    title: 'AI Chấm thi & Phát âm',
    eyebrow: 'Haru Sensei AI',
    icon: 'neurology',
    iconWrap: 'bg-rp-brand-soft text-rp-brand-strong',
    ctaLabel: 'Xem mô phỏng AI',
    tryTo: '/ai-scoring',
    tryLabel: 'Xem phiếu chấm mẫu',
    lead: 'Haru góp ý ngữ pháp, từ vựng và phát âm trong bài nói, bài viết của bạn — góp ý của AI mang tính tham khảo.',
    stats: [
      { k: 'Viết & nói', v: 'chấm bởi Haru AI' },
      { k: 'Theo tiêu chí', v: 'góp ý cụ thể' },
      { k: 'Lịch sử', v: 'xem lại tiến bộ' },
    ],
    steps: [
      { t: 'Nộp bài', d: 'Ghi âm, viết câu hoặc làm mini-test trong studio.' },
      { t: 'Haru chấm', d: 'Tách lỗi ngữ pháp, từ vựng và phát âm; gắn gợi ý sửa.' },
      { t: 'Lộ trình chỉnh', d: 'Đẩy 5 câu sai vào hàng đợi SRS / shadowing hôm sau.' },
    ],
    points: [
      'Chấm ngữ cảnh, không chỉ đúng/sai trắc nghiệm',
      'Biểu đồ quên lãng gắn với điểm yếu thật',
      'Mang phiếu chấm vào lớp nhóm để Giáo viên góp ý thêm',
    ],
    demo: {
      title: 'Phiếu chấm · 経験',
      line: 'Pitch け↘いけん · Mora 3 ổn, rơi muộn 1 nhịp.',
      note: 'Gợi ý: nghe lại câu mẫu 2 lần rồi thu chồng giọng.',
    },
  },
  srs: {
    slug: 'srs',
    title: '10,000+ Kanji & Flashcard SRS',
    eyebrow: 'Ghi nhớ dài hạn',
    icon: 'auto_stories',
    iconWrap: 'bg-rp-brand-soft text-rp-brand-strong',
    ctaLabel: 'Thư viện từ vựng',
    tryTo: '/daily-srs',
    tryLabel: 'Mở hàng đợi SRS',
    lead: 'Hán tự gắn hình tượng văn hóa, ôn đúng chu kỳ Ebbinghaus — nhớ gốc từ thay vì nhồi đêm trước kỳ thi.',
    stats: [
      { k: 'Theo cấp độ', v: 'thẻ từ vựng & Kanji' },
      { k: 'Lặp ngắt quãng', v: 'ôn đúng lúc sắp quên' },
      { k: 'Mỗi ngày', v: 'hàng đợi thẻ đến hạn' },
    ],
    steps: [
      { t: 'Nạp từ bài luyện tập', d: 'Mỗi bài hoàn thành đẩy từ mới + kanji vào sổ.' },
      { t: 'Ôn đúng hạn', d: 'Khẩn cấp / đến hạn / củng cố — 6–15 phút mỗi sáng.' },
      { t: 'Nhớ sâu', d: 'Sai 2 lần thì gắn ví dụ AI và bộ thủ liên tưởng.' },
    ],
    points: [
      'Sổ từ và sổ Kanji đồng bộ một vòng lặp',
      'Không nhồi 200 thẻ/ngày — chỉ đúng cửa sổ quên',
      'Xem chi tiết từng từ: pitch, ví dụ, nét viết',
    ],
    demo: {
      title: 'Thẻ hôm nay · 経験',
      line: 'けいけん · kinh nghiệm · SRS vòng 3',
      note: 'Ôn lại sau 2 ngày. Liên kết Bài 15 ～てもいいです.',
    },
  },
  // Slug kept for old links; the product is now Group Learning (no 1-1 sessions are sold).
  sensei: {
    slug: 'sensei',
    title: 'Học nhóm cùng Giáo viên',
    eyebrow: 'Lớp nhóm trực tuyến',
    icon: 'groups',
    iconWrap: 'bg-[#FFF0F3] text-[#BD385E]',
    ctaLabel: 'Tạo tài khoản',
    tryTo: '/register',
    tryLabel: 'Đăng ký để xem lớp',
    lead: 'Chọn Giáo viên, xem các lớp nhóm đang mở tuyển sinh với lịch học linh hoạt và thanh toán trọn khóa. Lịch học, phòng học trực tuyến, bài tập và nhận xét được quản lý đồng bộ.',
    stats: [
      { k: 'Linh hoạt', v: 'số tuần & số buổi' },
      { k: '90 phút', v: 'mỗi buổi học' },
      { k: 'Nhóm nhỏ', v: 'tương tác trực tiếp' },
    ],
    steps: [
      { t: 'Chọn Giáo viên & lớp', d: 'Xem hồ sơ Giáo viên, lịch học hằng tuần, thời lượng khóa và sĩ số lớp.' },
      { t: 'Giữ chỗ & thanh toán', d: 'Chỗ được giữ trong thời gian thanh toán; ghi danh chỉ có hiệu lực khi hệ thống xác minh.' },
      { t: 'Vào lớp', d: 'Lịch học, phòng học trực tuyến, điểm danh, bài tập và nhận xét của Giáo viên.' },
    ],
    points: [
      'Khóa học ngắn hạn cấp tốc nhiều buổi mỗi tuần',
      'Khóa học tiêu chuẩn cân bằng lịch trên lớp và tự ôn',
      'Quản lý lịch học, điểm danh và bài tập đồng bộ',
    ],
    demo: {
      title: 'Lớp JLPT N4 · Lịch hằng tuần cố định',
      line: 'Thứ 2, 4, 6 · 19:00–20:30 · 3 buổi/tuần',
      note: 'Ví dụ minh họa — lịch thật hiển thị theo từng lớp.',
    },
  },
};

export const FEATURE_LIST = Object.values(FEATURES);
