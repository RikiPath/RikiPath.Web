const SWITCH_MESSAGES = {
  vi: {
    ja: 'Đã chuyển giao diện sang tiếng Nhật.',
  },
  ja: {
    vi: '表示言語をベトナム語に切り替えました。',
  },
  en: {
    vi: 'Display language switched to Vietnamese.',
    ja: 'Display language switched to Japanese.',
  },
};

export function languageSwitchMessage(from, to) {
  if (from === to) return '';
  return SWITCH_MESSAGES[from]?.[to] || '';
}
