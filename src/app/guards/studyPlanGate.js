/**
 * Metadata and pure decision helper for Backend `[RequireSelfStudy]` routes.
 * Only routes whose primary Backend endpoints carry `[RequireSelfStudy]` belong
 * here; free/credit-on-action routes stay directly accessible to Learners.
 */

const FEATURE_CATALOG = {
  '/lessons': {
    featureLabel: 'Bài học JLPT',
    description: 'Kho bài giảng từ vựng, ngữ pháp, đọc hiểu và nghe hiểu theo cấp độ JLPT.',
  },
  '/lesson-player': {
    featureLabel: 'Trình phát bài học',
    description: 'Nội dung chi tiết từng bài học, flashcard và bài luyện đi kèm.',
  },
  '/riki/listening': {
    featureLabel: 'Luyện nghe hiểu',
    description: 'Các bài nghe JLPT có audio và bài tập kiểm tra kèm theo.',
  },
  '/riki/reading': {
    featureLabel: 'Luyện đọc hiểu',
    description: 'Đoạn văn đọc hiểu JLPT theo cấp độ và câu hỏi luyện tập.',
  },
  '/vocabulary': {
    featureLabel: 'Sổ tay từ vựng cá nhân',
    description: 'Tạo danh sách từ vựng cá nhân, ghi chú và đồng bộ thẻ ôn tập.',
  },
  '/kanji-notebook': {
    featureLabel: 'Sổ tay Hán tự cá nhân',
    description: 'Lưu chữ Kanji đã học vào sổ cá nhân để theo dõi và ôn tập.',
  },
};

export function normalizeGuardPath(pathname = '/') {
  return String(pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
}

export function studyFeatureInfo(pathname) {
  const path = normalizeGuardPath(pathname);
  return FEATURE_CATALOG[path] || {
    featureLabel: 'Nội dung tự học',
    description: 'Tính năng này thuộc gói tự học JLPT đang hiệu lực trên RikiPath.',
  };
}

/**
 * Computes the guard state without performing an implicit navigation to `/plans`.
 * @returns {'allow' | 'login' | 'loading' | 'error' | 'plan-required'}
 */
export function evaluateStudyPlanAccess({
  pathname,
  isPreview = false,
  isAuthenticated = false,
  isLearner = false,
  isPending = false,
  isError = false,
  subscriptionData = null,
  feature = 'active',
}) {
  const path = normalizeGuardPath(pathname);
  if (isPreview || path === '/plans') return 'allow';
  if (!isAuthenticated) return 'login';
  if (!isLearner) return 'allow';
  if (isPending) return 'loading';
  if (isError) return 'error';
  if (!subscriptionData?.[feature]) return 'plan-required';
  return 'allow';
}
