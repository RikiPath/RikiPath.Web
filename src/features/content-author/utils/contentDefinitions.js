export const definitions = {
  Lesson: { label: 'Bài học', fields: [
    { key: 'title', label: 'Tên bài học', kind: 'text', required: true, maxLength: 200 },
    { key: 'description', label: 'Mô tả bài học', kind: 'textarea', maxLength: 2000 },
    { key: 'sortOrder', label: 'Thứ tự hiển thị', kind: 'number' },
  ] },
  Vocabulary: { label: 'Từ vựng', fields: [
    { key: 'word', label: 'Từ vựng (Kanji / Kana)', kind: 'text', required: true, maxLength: 150 },
    { key: 'reading', label: 'Cách đọc (Hiragana / Katakana)', kind: 'text', required: true, maxLength: 150 },
    { key: 'meaning', label: 'Nghĩa tiếng Việt', kind: 'textarea', required: true, maxLength: 1000 },
    { key: 'exampleSentence', label: 'Câu ví dụ', kind: 'text', maxLength: 500 },
    { key: 'exampleSentenceMeaning', label: 'Nghĩa câu ví dụ', kind: 'text', maxLength: 500 },
    { key: 'lessonTitle', label: 'Tên bài học liên kết (nếu có)', kind: 'text', maxLength: 200 },
  ] },
  Kanji: { label: 'Hán tự', fields: [
    { key: 'character', label: 'Chữ Hán (Kanji)', kind: 'text', required: true, maxLength: 20 },
    { key: 'meaning', label: 'Nghĩa tiếng Việt', kind: 'textarea', required: true, maxLength: 500 },
    { key: 'sinoVietnamese', label: 'Âm Hán Việt', kind: 'text', maxLength: 100 },
    { key: 'onYomi', label: 'Âm On (Onyomi)', kind: 'text', maxLength: 150 },
    { key: 'kunYomi', label: 'Âm Kun (Kunyomi)', kind: 'text', maxLength: 150 },
    { key: 'strokeCount', label: 'Số nét', kind: 'number', required: true },
    { key: 'strokeOrderImageUrl', label: 'URL ảnh thứ tự nét', kind: 'url', maxLength: 500 },
    { key: 'lessonTitle', label: 'Tên bài học liên kết (nếu có)', kind: 'text', maxLength: 200 },
  ] },
  Grammar: { label: 'Ngữ pháp', fields: [
    { key: 'title', label: 'Tên mẫu ngữ pháp', kind: 'text', required: true, maxLength: 200 },
    { key: 'structure', label: 'Cấu trúc ngữ pháp', kind: 'text', required: true, maxLength: 300 },
    { key: 'usageNotes', label: 'Cách dùng & lưu ý', kind: 'textarea', maxLength: 2000 },
    { key: 'exampleSentence', label: 'Câu ví dụ', kind: 'text', maxLength: 500 },
    { key: 'exampleSentenceMeaning', label: 'Nghĩa câu ví dụ', kind: 'text', maxLength: 500 },
    { key: 'lessonTitle', label: 'Tên bài học liên kết (nếu có)', kind: 'text', maxLength: 200 },
  ] },
  PracticeExercise: { label: 'Bài luyện tập', fields: [
    { key: 'title', label: 'Tên bài luyện tập', kind: 'text', required: true, maxLength: 200 },
    { key: 'description', label: 'Mô tả bài luyện tập', kind: 'textarea', maxLength: 2000 },
    { key: 'sortOrder', label: 'Thứ tự bài luyện tập', kind: 'number' },
  ] },
  MockTest: { label: 'Đề thi thử', fields: [
    { key: 'title', label: 'Tên đề thi thử', kind: 'text', required: true, maxLength: 200 },
    { key: 'description', label: 'Mô tả đề thi', kind: 'textarea', maxLength: 2000 },
    { key: 'timeLimitMinutes', label: 'Thời lượng làm bài (phút)', kind: 'number', required: true },
  ] },
};
