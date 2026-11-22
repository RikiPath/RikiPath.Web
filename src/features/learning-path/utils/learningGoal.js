export function jlptExamDate(year, month) {
  if (!/^\d{4}$/.test(year) || !['07', '12'].includes(month)) return null;
  const first = new Date(year + '-' + month + '-01T00:00:00Z');
  const day = 1 + (7 - first.getUTCDay()) % 7;
  return year + '-' + month + '-' + String(day).padStart(2, '0');
}

export function isJlptExamDate(date) {
  const [year, month] = date.split('-');
  return date === jlptExamDate(year, month);
}

export function buildLearningGoal({ certificateTypeId, levelId, minMinutes, maxMinutes, timeMode = 'range', examDate, certificateTypeName = 'JLPT' }, today) {
  const minimum = Number(minMinutes);
  const maximum = timeMode === 'fixed' ? minimum : Number(maxMinutes);
  if (!Number.isSafeInteger(Number(certificateTypeId)) || Number(certificateTypeId) <= 0 || !Number.isSafeInteger(Number(levelId)) || Number(levelId) <= 0) {
    throw new Error('Vui lòng chọn cấp độ bạn muốn ôn luyện.');
  }
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 15 || maximum > 480 || minimum > maximum) {
    throw new Error('Thời gian học phải từ 15 đến 480 phút; số phút tối thiểu không lớn hơn tối đa.');
  }
  if (examDate) {
    const parsed = new Date(examDate + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== examDate) {
      throw new Error('Vui lòng chọn đủ ngày, tháng và năm dự định thi.');
    }
    if (examDate <= today) throw new Error('Ngày dự định thi phải sau hôm nay.');
    if (certificateTypeName?.trim().toUpperCase() === 'JLPT' && !isJlptExamDate(examDate)) {
      throw new Error('Vui lòng chọn Chủ nhật đầu tiên của tháng 7 hoặc tháng 12 cho kỳ thi JLPT.');
    }
  }
  return {
    certificateTypeId: Number(certificateTypeId),
    targetCertificateLevelId: Number(levelId),
    ...(timeMode === 'fixed'
      ? { dailyStudyMinutes: minimum }
      : { dailyStudyMinutesMin: minimum, dailyStudyMinutesMax: maximum }),
    ...(examDate ? { targetExamDate: examDate } : {}),
    ...(examDate === '' ? { clearTargetExamDate: true } : {}),
  };
}
