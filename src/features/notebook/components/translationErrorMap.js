export function mapTranslationError(error, tr) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      message: tr('Không có kết nối mạng. Vui lòng thử lại.'),
      retryable: true,
    };
  }

  const code = error?.data?.errorCode || error?.code;
  const status = error?.status ?? error?.response?.status;

  if (code === 'TRANSLATION_TOO_LONG') {
    return {
      message: tr('Đoạn văn bản vượt quá giới hạn 500 ký tự. Vui lòng chọn đoạn ngắn hơn.'),
      retryable: false,
    };
  }
  if (code === 'TRANSLATION_NON_JAPANESE' || code === 'TRANSLATION_INSUFFICIENT_CONTEXT' || code === 'TRANSLATION_EMPTY') {
    return {
      message: tr('Vui lòng chọn một từ hoặc đoạn tiếng Nhật đầy đủ để dịch.'),
      retryable: false,
    };
  }
  if (code === 'TRANSLATION_RATE_LIMITED' || status === 429) {
    return {
      message: tr('Bạn đang dịch quá nhanh. Vui lòng thử lại sau.'),
      retryable: true,
    };
  }
  if (code === 'TRANSLATION_TIMEOUT' || status === 504 || code === 'ECONNABORTED') {
    return {
      message: tr('Bản dịch chưa được tải. Hãy thử lại.'),
      retryable: true,
    };
  }
  if (status === 401 || status === 403) {
    return {
      message: tr('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
      retryable: false,
    };
  }
  if (code === 'ERR_NETWORK' || status === 0) {
    return {
      message: tr('Không có kết nối mạng. Vui lòng thử lại.'),
      retryable: true,
    };
  }
  return {
    message: tr('Tính năng dịch đang tạm thời gián đoạn.'),
    retryable: error?.data?.retryable !== false,
  };
}
