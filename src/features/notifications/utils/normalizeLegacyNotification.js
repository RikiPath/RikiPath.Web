/**
 * Phrase-safe display normalizer for legacy system-generated notifications.
 *
 * Uses Unicode-aware word boundaries (`(?<![\p{L}\p{N}_])` / `(?![\p{L}\p{N}_])`)
 * because JavaScript `\b` is ASCII-only and fails after Vietnamese diacritics (`đã`, `của`, `vấn`).
 * Only normalizes known system actor/status phrasing so user-generated content
 * (such as proper names like "Mentor One", class titles, document names, or
 * original feedback text) is never altered.
 */

const LEGACY_PHRASE_RULES = [
  [/\bAdmin\s+đã\s+approve\s+proposal\s+của\s+Mentor\b/giu, 'Quản trị viên đã phê duyệt đề xuất mở lớp của giáo viên'],
  [/\bAdmin\s+đã\s+approve\b/giu, 'Quản trị viên đã phê duyệt'],

  [/(?<![\p{L}\p{N}_])Ban quản trị(?![\p{L}\p{N}_])/gu, 'Quản trị viên'],
  [/(?<![\p{L}\p{N}_])Bộ phận quản trị(?![\p{L}\p{N}_])/gu, 'Quản trị viên'],
  [/(?<![\p{L}\p{N}_])Quản trị viên\s*\(Admin\)/gu, 'Quản trị viên'],
  [/\bAdmin\s+(đã|yêu cầu|từ chối|đang|sẽ|cần|duyệt|xử lý|chọn|phân công|cấp quyền|xem xét|phê duyệt|dời|mới|phải|có thể)(?![\p{L}\p{N}_])/gu, 'Quản trị viên $1'],
  [/(?<![\p{L}\p{N}_])(chờ|gửi|cho|từ|của|đề nghị|liên hệ|nhờ|bởi|bị|lên|để|với)\s+[Aa]dmin\b/gu, '$1 Quản trị viên'],
  [/(?<![\p{L}\p{N}_])(Kết luận|Quyết định|Ghi chú|Phản hồi)\s+Admin\b/gu, '$1 của Quản trị viên'],

  [/(?<![\p{L}\p{N}_])Lớp có cố vấn chính mới(?![\p{L}\p{N}_])/gu, 'Lớp học có Giáo viên mới'],
  [/(?<![\p{L}\p{N}_])Hồ sơ ứng tuyển cố vấn(?![\p{L}\p{N}_])/giu, 'Hồ sơ Giáo viên'],
  [/(?<![\p{L}\p{N}_])Hồ sơ cố vấn(?![\p{L}\p{N}_])/gu, 'Hồ sơ Giáo viên'],
  [/(?<![\p{L}\p{N}_])hồ sơ cố vấn(?![\p{L}\p{N}_])/gu, 'hồ sơ Giáo viên'],
  [/(?<![\p{L}\p{N}_])Cố vấn\s+(đã|chính|mới|thay thế|khác|không|được|chưa|hủy|vắng|phản hồi|liên quan)(?![\p{L}\p{N}_])/gu, 'Giáo viên $1'],
  [/(?<![\p{L}\p{N}_])cố vấn\s+(đã|chính|mới|thay thế|khác|không|được|chưa|này|hủy|vắng|phản hồi|liên quan)(?![\p{L}\p{N}_])/gu, 'Giáo viên $1'],
  [/(?<![\p{L}\p{N}_])(của|cho|từ|do|thay|đánh giá|chọn|tìm thấy|chỉ|Chờ|Yêu cầu)\s+[Cc]ố vấn(?![\p{L}\p{N}_])/gu, '$1 Giáo viên'],
  [/\bMentor\s+(đã|chính|dạy thay|hủy|vắng|liên quan|không|chưa|có thể|mới)(?![\p{L}\p{N}_])/gu, 'Giáo viên $1'],
  [/\b[Mm]entor\s+(chính|dạy thay|mới được|được tạo|được gửi)(?![\p{L}\p{N}_])/gu, 'Giáo viên $1'],
  [/(?<![\p{L}\p{N}_])(của|cho|từ|thay|đánh giá|Thái độ|Nhận xét|Phản hồi của|chỉ|Chỉ|Chờ|Yêu cầu)\s+[Mm]entor\b/gu, '$1 Giáo viên'],
  [/(?<![\p{L}\p{N}_])Buổi học Mentor\b/gu, 'Buổi dạy cùng Giáo viên'],

  [/(?<![\p{L}\p{N}_])(của|cho|để)\s+Learner\b/gu, '$1 Học viên'],
  [/\bLearner\s+(mới|chưa|đã|đang)(?![\p{L}\p{N}_])/gu, 'Học viên $1'],
  [/\bContent\s*Author\b/gu, 'Quản lý nội dung'],

  [/\bBTVN\b/gu, 'bài tập về nhà'],
  [/(?<![\p{L}\p{N}_])Ngày khai giảng dự kiến(?![\p{L}\p{N}_])/gu, 'Ngày bắt đầu dự kiến'],
  [/(?<![\p{L}\p{N}_])ngày khai giảng dự kiến(?![\p{L}\p{N}_])/gu, 'ngày bắt đầu dự kiến'],
  [/(?<![\p{L}\p{N}_])(Dời ngày|Dời lịch) khai giảng(?![\p{L}\p{N}_])/gu, 'Đổi ngày bắt đầu'],
  [/(?<![\p{L}\p{N}_])(dời ngày|dời lịch) khai giảng(?![\p{L}\p{N}_])/gu, 'đổi ngày bắt đầu'],
  [/(?<![\p{L}\p{N}_])Ngày khai giảng(?![\p{L}\p{N}_])/gu, 'Ngày bắt đầu'],
  [/(?<![\p{L}\p{N}_])ngày khai giảng(?![\p{L}\p{N}_])/gu, 'ngày bắt đầu'],
  [/(?<![\p{L}\p{N}_])(Chờ|Sắp)\s+khai giảng(?![\p{L}\p{N}_])/gu, 'Sắp bắt đầu'],
  [/(?<![\p{L}\p{N}_])(chờ|sắp)\s+khai giảng(?![\p{L}\p{N}_])/gu, 'sắp bắt đầu'],
  [/(?<![\p{L}\p{N}_])Lịch khai giảng(?![\p{L}\p{N}_])/gu, 'Lịch bắt đầu'],
  [/(?<![\p{L}\p{N}_])lịch khai giảng(?![\p{L}\p{N}_])/gu, 'lịch bắt đầu'],
  [/(?<![\p{L}\p{N}_])Trước (ngày|giờ) khai giảng(?![\p{L}\p{N}_])/gu, 'Trước $1 bắt đầu'],
  [/(?<![\p{L}\p{N}_])trước (ngày|giờ) khai giảng(?![\p{L}\p{N}_])/gu, 'trước $1 bắt đầu'],
  [/(?<![\p{L}\p{N}_])Lớp đã khai giảng(?![\p{L}\p{N}_])/gu, 'Lớp đã bắt đầu'],
  [/(?<![\p{L}\p{N}_])Khai giảng(?![\p{L}\p{N}_])/gu, 'Bắt đầu'],
  [/(?<![\p{L}\p{N}_])khai giảng(?![\p{L}\p{N}_])/gu, 'bắt đầu'],
  [/\(TeachingQuality\)/gu, '(Chất lượng giảng dạy)'],
  [/\(MentorConduct\)/gu, '(Tác phong Giáo viên)'],
  [/\(Schedule\)/gu, '(Lịch học)'],
  [/\(PaymentEnrollment\)/gu, '(Thanh toán & Ghi danh)'],
  [/\(Other\)/gu, '(Khác)'],
];

export function normalizeLegacyNotificationText(text) {
  if (typeof text !== 'string' || !text.trim()) return text ?? '';
  let output = text;
  for (const [pattern, replacement] of LEGACY_PHRASE_RULES) {
    pattern.lastIndex = 0;
    if (pattern.test(output)) {
      pattern.lastIndex = 0;
      output = output.replace(pattern, replacement);
    }
  }
  return output;
}

export function normalizeLegacyNotificationItem(notification) {
  if (!notification || typeof notification !== 'object') return notification;
  return {
    ...notification,
    title: normalizeLegacyNotificationText(notification.title),
    message: normalizeLegacyNotificationText(notification.message),
  };
}
