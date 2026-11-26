import { isJlptExamDate } from '@/features/learning-path/utils/learningGoal.js';

export const ONBOARDING_STEPS = [
  {
    id: 'certificate',
    stepNumber: 1,
    shortTitle: 'Chứng chỉ',
    title: 'Chọn chứng chỉ học tập',
    subtitle: 'Chọn chứng chỉ bạn muốn chinh phục để RikiPath gợi ý lộ trình và cấp độ phù hợp.',
    tip: 'RikiPath tải danh sách chứng chỉ trực tiếp từ hệ thống để bảo đảm dữ liệu lộ trình luôn đồng bộ.',
  },
  {
    id: 'level',
    stepNumber: 2,
    shortTitle: 'Cấp độ',
    title: 'Mục tiêu cấp độ của bạn là gì?',
    subtitle: 'Chọn cấp độ bạn đang hướng đến và khai báo chứng chỉ JLPT đã có (nếu có).',
    tip: 'Nếu đã đạt chứng chỉ JLPT thấp hơn mục tiêu, bạn có thể khai báo để rút ngắn bài đánh giá năng lực.',
  },
  {
    id: 'study-plan',
    stepNumber: 3,
    shortTitle: 'Thời gian',
    title: 'Bạn muốn học bao lâu mỗi ngày?',
    subtitle: 'Thiết lập thời lượng phù hợp giúp hệ thống sắp xếp bài học đều đặn mỗi ngày.',
    tip: 'Duy trì nhịp học ổn định mỗi ngày hiệu quả hơn học dồn trong một buổi ngắn hạn.',
  },
  {
    id: 'exam-schedule',
    stepNumber: 4,
    shortTitle: 'Lịch thi',
    title: 'Kế hoạch ngày thi dự kiến',
    subtitle: 'Chọn kỳ thi mục tiêu hoặc bỏ qua bước này nếu bạn chưa có lịch thi cụ thể.',
    tip: 'Ngày thi là tùy chọn; bạn có thể xác nhận mục tiêu và đánh giá năng lực ngay cả khi chưa chọn ngày thi.',
  },
  {
    id: 'review',
    stepNumber: 5,
    shortTitle: 'Xác nhận',
    title: 'Xem lại kế hoạch học tập',
    subtitle: 'Kiểm tra lại toàn bộ thông tin đã chọn trước khi tạo kế hoạch cùng RikiPath.',
    tip: 'Bạn luôn có thể cập nhật lại mục tiêu, thời lượng học và ngày thi trong phần Cài đặt cá nhân.',
  },
];

export const STUDY_TIME_PRESETS = [
  { minutes: 15, pace: 'Nhẹ nhàng', desc: 'Duy trì phản xạ và thói quen hằng ngày', icon: 'sprout', tone: 'vocab' },
  { minutes: 30, pace: 'Cân bằng', desc: 'Nhịp độ ổn định, phù hợp đa số học viên', icon: 'zap', tone: 'reading', recommended: true },
  { minutes: 45, pace: 'Tích cực', desc: 'Tăng tốc tiến độ, cân đối đều 4 kỹ năng', icon: 'flame', tone: 'grammar' },
  { minutes: 60, pace: 'Chuyên sâu', desc: 'Mở rộng từ vựng, chữ Hán và luyện đề', icon: 'book', tone: 'kanji' },
  { minutes: 90, pace: 'Chuyên tâm', desc: 'Ôn luyện cường độ cao cho kỳ thi gần kề', icon: 'rocket', tone: 'calendar' },
];

export const STUDY_RANGE_PRESETS = [
  { min: 15, max: 30, label: '15–30 phút', pace: 'Nhẹ nhàng linh hoạt' },
  { min: 30, max: 60, label: '30–60 phút', pace: 'Cân bằng hiệu quả', recommended: true },
  { min: 45, max: 90, label: '45–90 phút', pace: 'Tăng tốc chuyên sâu' },
];

export const LEVEL_FALLBACKS = {
  N5: { title: 'Nhập môn & sơ cấp', desc: 'Từ vựng, chữ Hán và mẫu câu tiếng Nhật nền tảng.' },
  N4: { title: 'Sơ cấp nâng cao', desc: 'Củng cố kiến thức cơ bản và tình huống giao tiếp quen thuộc.' },
  N3: { title: 'Trung cấp', desc: 'Mở rộng từ vựng học thuật, luyện đọc hiểu và nghe hiểu.' },
  N2: { title: 'Trung – cao cấp', desc: 'Đọc hiểu văn bản dài, tin tức và chủ đề chuyên sâu.' },
  N1: { title: 'Cao cấp', desc: 'Đọc hiểu học thuật, phân tích văn bản phức tạp và diễn đạt tự nhiên.' },
};

export function validateStep1Certificate({ activeCertId, loadingTypes, typesError }) {
  if (loadingTypes) {
    return { valid: false, message: '' };
  }
  if (typesError) {
    return { valid: false, message: 'Không tải được danh sách chứng chỉ.' };
  }
  if (!Number.isSafeInteger(Number(activeCertId)) || Number(activeCertId) <= 0) {
    return { valid: false, message: 'Vui lòng chọn một chứng chỉ để tiếp tục.' };
  }
  return { valid: true, message: '' };
}

export function validateStep2Level({
  activeCertId,
  activeLevelId,
  loadingLevels,
  levelsError,
  needsCertificateChoice = false,
}) {
  if (!activeCertId || loadingLevels) {
    return { valid: false, message: '' };
  }
  if (levelsError) {
    return { valid: false, message: 'Không tải được danh sách cấp độ theo chứng chỉ.' };
  }
  if (!Number.isSafeInteger(Number(activeLevelId)) || Number(activeLevelId) <= 0) {
    return { valid: false, message: 'Vui lòng chọn cấp độ mục tiêu.' };
  }
  if (needsCertificateChoice) {
    return { valid: false, message: 'Vui lòng chọn chứng chỉ JLPT cao nhất bạn đã có.' };
  }
  return { valid: true, message: '' };
}

export function validateStep3StudyPlan({ timeMode = 'fixed', minutes, maxMinutes }) {
  const minRaw = String(minutes ?? '').trim();
  const maxRaw = String(maxMinutes ?? '').trim();
  if (!minRaw) {
    return { valid: false, message: 'Thời gian học phải từ 15 đến 480 phút; số phút tối thiểu không lớn hơn tối đa.' };
  }
  const minVal = Number(minRaw);
  if (!Number.isInteger(minVal) || minVal < 15 || minVal > 480) {
    return { valid: false, message: 'Thời gian học phải từ 15 đến 480 phút; số phút tối thiểu không lớn hơn tối đa.' };
  }
  if (timeMode === 'range') {
    if (!maxRaw) {
      return { valid: false, message: 'Thời gian học phải từ 15 đến 480 phút; số phút tối thiểu không lớn hơn tối đa.' };
    }
    const maxVal = Number(maxRaw);
    if (!Number.isInteger(maxVal) || maxVal < 15 || maxVal > 480 || minVal > maxVal) {
      return { valid: false, message: 'Thời gian học phải từ 15 đến 480 phút; số phút tối thiểu không lớn hơn tối đa.' };
    }
  }
  return { valid: true, message: '' };
}

export function validateStep4ExamDate({ examDate, today, isJlpt = true }) {
  if (!examDate) {
    return { valid: true, optionalOmitted: true, message: '' };
  }
  const parsed = new Date(`${examDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(examDate)
    || !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== examDate
  ) {
    return { valid: false, optionalOmitted: false, message: 'Vui lòng chọn đủ ngày, tháng và năm dự định thi.' };
  }
  if (today && examDate <= today) {
    return { valid: false, optionalOmitted: false, message: 'Ngày dự định thi phải sau hôm nay.' };
  }
  if (isJlpt && !isJlptExamDate(examDate)) {
    return {
      valid: false,
      optionalOmitted: false,
      message: 'Vui lòng chọn Chủ nhật đầu tiên của tháng 7 hoặc tháng 12 cho kỳ thi JLPT.',
    };
  }
  return { valid: true, optionalOmitted: false, message: '' };
}

export function computeStepValidity(draft) {
  const s1 = validateStep1Certificate(draft);
  const s2 = s1.valid
    ? validateStep2Level(draft)
    : { valid: false, message: s1.message };
  const s3 = validateStep3StudyPlan(draft);
  const s4 = validateStep4ExamDate(draft);
  const s5 = {
    valid: s1.valid && s2.valid && s3.valid && s4.valid,
    message: s1.message || s2.message || s3.message || s4.message || '',
  };
  return [s1, s2, s3, s4, s5];
}

export function getFurthestAccessibleStep(validityList) {
  let furthest = 0;
  for (let i = 0; i < validityList.length - 1; i += 1) {
    if (!validityList[i]?.valid) break;
    furthest = i + 1;
  }
  return furthest;
}

export function computeWizardProgressPercent(stepIndex, totalSteps = ONBOARDING_STEPS.length) {
  if (!totalSteps || totalSteps <= 0) return 0;
  const bounded = Math.max(0, Math.min(totalSteps - 1, Number(stepIndex) || 0));
  return Math.round(((bounded + 1) / totalSteps) * 100);
}

export function formatStudySummaryText({ timeMode, minutes, maxMinutes }) {
  const minVal = String(minutes ?? '').trim();
  const maxVal = String(maxMinutes ?? '').trim();
  if (!minVal) return '';
  if (timeMode === 'range') {
    return maxVal ? `${minVal}–${maxVal}` : minVal;
  }
  return minVal;
}

export function resolvePaceLabelForMinutes(minutes, timeMode = 'fixed') {
  if (timeMode === 'range') return 'Khoảng từ–đến';
  const preset = STUDY_TIME_PRESETS.find((item) => item.minutes === Number(minutes));
  return preset ? preset.pace : 'Tùy chỉnh';
}

export function formatExamSessionHeadline(examDate) {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    return null;
  }
  const [year, month, day] = examDate.split('-');
  if (isJlptExamDate(examDate) && (month === '07' || month === '12')) {
    return {
      monthKey: month === '07' ? 'Tháng 7' : 'Tháng 12',
      year,
      dateText: `${day}/${month}/${year}`,
      isJlptSession: true,
    };
  }
  return {
    monthKey: null,
    year,
    dateText: `${day}/${month}/${year}`,
    isJlptSession: false,
  };
}
