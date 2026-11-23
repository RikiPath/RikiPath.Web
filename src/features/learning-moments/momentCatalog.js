import { currentIntlTag } from '@/locales/locale.js';

/**
 * Accent palettes per celebration family (Sakura Design System; streak keeps its own orange dialog).
 * `from`/`to` drive the CTA gradient and badge, `edge` the 3D button edge, `halo` the top glow, `soft` chips/rings.
 */
export const CELEBRATION_ACCENTS = {
  sakura: { from: '#F27A9B', to: '#CC4B6B', edge: '#A83A57', halo: '#FFE4EC', soft: '#FFF0F4', text: '#B53D5C' },
  lavender: { from: '#9B8CF6', to: '#6D5BD0', edge: '#5545AE', halo: '#EEEAFF', soft: '#F4F1FF', text: '#5545AE' },
  emerald: { from: '#3CC896', to: '#16A06E', edge: '#0E7D55', halo: '#DCF6EB', soft: '#ECF9F3', text: '#0F7A55' },
  teal: { from: '#3FC2C0', to: '#1A9897', edge: '#137574', halo: '#DDF5F4', soft: '#ECF9F8', text: '#137574' },
  peach: { from: '#FFA27A', to: '#F2774F', edge: '#D35C36', halo: '#FFEBDF', soft: '#FFF3EC', text: '#C2552F' },
  amber: { from: '#F7C04A', to: '#E59A12', edge: '#C07E07', halo: '#FFF3D2', soft: '#FFF7E1', text: '#9A6A06' },
  gold: { from: '#F6C453', to: '#DB9A14', edge: '#B57C08', halo: '#FFF2CF', soft: '#FFF8E4', text: '#94660A' },
  blue: { from: '#6E9BF2', to: '#3E6FD8', edge: '#2F58B4', halo: '#E3ECFF', soft: '#EEF3FF', text: '#2F58B4' },
};

const NEXT_STEP_CTA = {
  placement: 'Làm bài đánh giá năng lực',
  roadmap: 'Khám phá lộ trình',
  lessons: 'Bắt đầu hành trình',
};

/** CTA per purchased plan kind (routes come from the server's `ctaHref`, these are only the labels). */
const PURCHASE_CTA = {
  self_study: 'Bắt đầu học',
  learning_path: 'Khám phá lộ trình AI',
  speaking: 'Bắt đầu luyện nói',
  writing: 'Bắt đầu luyện viết',
};

function formatDate(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(currentIntlTag(), { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

/**
 * Event catalog: type → presentation. Copy only states what the server verified; numbers come from `data`.
 * `visual` picks the CelebrationVisual badge (no mascot), `animation` its preset, `confetti` a short burst for big
 * moments only. Returns null for unknown types so a newer backend never breaks an older UI.
 */
export function describeMoment(moment, tr, trf) {
  const data = moment?.data || {};
  switch (moment?.type) {
    case 'PURCHASE_COMPLETED': {
      const chips = [
        data.durationDays ? trf('{0} ngày sử dụng', { 0: data.durationDays }) : null,
        data.aiUses ? trf('{0} lượt AI', { 0: data.aiUses }) : null,
        data.endDate ? trf('Hiệu lực đến {0}', { 0: formatDate(data.endDate) }) : null,
      ].filter(Boolean);
      return {
        accent: 'emerald',
        visual: 'success',
        animation: 'success-reveal',
        confetti: true,
        eyebrow: tr('Thanh toán thành công'),
        title: tr('Chúc mừng! Bạn đã mua gói thành công!'),
        description: data.planName
          ? trf('Gói {0} đã được kích hoạt. Bạn có thể bắt đầu sử dụng các quyền lợi ngay bây giờ.', { 0: data.planName })
          : tr('Gói học của bạn đã được kích hoạt. Bạn có thể bắt đầu sử dụng các quyền lợi ngay bây giờ.'),
        chips,
        cta: tr(PURCHASE_CTA[data.kind] || 'Xem gói của tôi'),
      };
    }
    case 'ONBOARDING_COMPLETED':
      return {
        accent: 'sakura',
        visual: 'compass',
        animation: 'badge-pop',
        eyebrow: tr('Chào mừng'),
        title: tr('Chào mừng bạn đến với hành trình tiếng Nhật!'),
        description: tr('RikiPath đã ghi nhận mục tiêu của bạn. Hãy bắt đầu từng bước để tiến gần hơn tới điều mình mong muốn nhé!'),
        chips: data.targetLevel ? [trf('Mục tiêu: {0}', { 0: data.targetLevel })] : [],
        cta: tr(NEXT_STEP_CTA[data.nextStep] || 'Bắt đầu hành trình'),
      };
    case 'PLACEMENT_COMPLETED':
      return {
        accent: 'blue',
        visual: 'target',
        animation: 'badge-pop',
        eyebrow: tr('Đánh giá năng lực'),
        title: tr('Bạn đã hoàn thành bài đánh giá năng lực!'),
        description: tr('RikiPath đã có thêm thông tin để giúp bạn chọn hướng học phù hợp hơn.'),
        // An internal assessment — shown as a reference level, never as an official JLPT result.
        chips: data.assessedLevel ? [trf('Trình độ tham khảo: {0}', { 0: data.assessedLevel })] : [],
        cta: tr('Xem kết quả đánh giá'),
      };
    case 'FIRST_LESSON_COMPLETED':
      return {
        accent: 'emerald',
        visual: 'book',
        animation: 'badge-pop',
        eyebrow: tr('Cột mốc đầu tiên'),
        title: tr('Bài học đầu tiên đã hoàn thành!'),
        description: tr('Thêm một bước tiến tới mục tiêu JLPT của bạn.'),
        chips: data.lessonTitle ? [data.lessonTitle] : [],
        cta: data.hasPractice === 'true' ? tr('Luyện tập kiến thức vừa học') : tr('Khám phá bài tiếp theo'),
      };
    case 'LEARNING_PATH_CREATED':
      return {
        accent: 'teal',
        visual: 'unlock',
        animation: 'badge-pop',
        eyebrow: tr('Lộ trình học'),
        title: tr('Lộ trình học của bạn đã sẵn sàng!'),
        description: tr('Các chặng học đã được sắp xếp theo mục tiêu của bạn. Cùng bắt đầu chặng đầu tiên nhé!'),
        chips: [],
        cta: tr('Khám phá lộ trình'),
      };
    case 'MOCK_TEST_COMPLETED':
      return {
        accent: 'blue',
        visual: 'result',
        animation: 'badge-pop',
        eyebrow: tr('Thi thử'),
        title: tr('Bạn đã hoàn thành một bài thi thử!'),
        description: tr('Bài làm đã được chấm. Xem lại kết quả để biết phần nào cần luyện thêm nhé.'),
        chips: data.score ? [trf('Điểm: {0}', { 0: data.score })] : [],
        cta: tr('Xem kết quả'),
      };
    case 'DAILY_SRS_COMPLETED':
      return {
        accent: 'amber',
        visual: 'calendar',
        animation: 'badge-pop',
        eyebrow: tr('Ôn tập SRS'),
        title: tr('Bạn đã hoàn thành phiên ôn hôm nay!'),
        description: tr('Hôm nay không còn thẻ đến hạn. Ôn đều đặn mỗi ngày là chìa khóa để nhớ lâu.'),
        chips: data.reviewedToday ? [trf('Đã ôn {0} lượt hôm nay', { 0: data.reviewedToday })] : [],
        cta: tr('Xem tiến độ ôn tập'),
      };
    case 'GROUP_QUIZ_PASSED':
      return {
        accent: 'gold',
        visual: 'medal',
        animation: 'badge-pop',
        eyebrow: tr('Kiểm tra cuối chặng'),
        title: tr('Bạn đã hoàn thành chặng học!'),
        description: tr('Kiến thức các bài trong chặng đã được củng cố vững chắc. Sẵn sàng cho chặng tiếp theo rồi đấy!'),
        chips: [
          data.topicTitle || data.exerciseTitle || data.title,
          data.score ? trf('Điểm: {0}%', { 0: data.score }) : null,
        ].filter(Boolean),
        cta: tr('Tiếp tục lộ trình'),
      };
    case 'STAGE_ASSESSMENT_PASSED':
      return {
        accent: 'gold',
        visual: 'trophy',
        animation: 'badge-pop',
        confetti: true,
        eyebrow: tr('Đánh giá tổng kết cấp độ'),
        title: tr('Chúc mừng bạn đã vượt qua cột mốc JLPT!'),
        description: tr('Bạn đã hoàn thành đánh giá tổng kết và củng cố toàn diện kỹ năng ở cấp độ này.'),
        chips: [
          data.levelCode ? `JLPT ${data.levelCode}` : null,
          data.score ? trf('Điểm: {0}%', { 0: data.score }) : null,
        ].filter(Boolean),
        cta: tr('Xem bước tiếp theo'),
      };
    default:
      return null;
  }
}

/** Achievement history labels + badge (only for codes the server returns from real data). */
export function describeAchievement(a, tr, trf) {
  switch (a?.code) {
    case 'ONBOARDING_COMPLETED': return { visual: 'compass', accent: 'sakura', title: tr('Bắt đầu hành trình'), detail: tr('Đặt mục tiêu học tập đầu tiên') };
    case 'PLACEMENT_COMPLETED': return { visual: 'target', accent: 'blue', title: tr('Đánh giá năng lực'), detail: tr('Hoàn thành bài đánh giá đầu tiên') };
    case 'LEARNING_PATH_CREATED': return { visual: 'unlock', accent: 'teal', title: tr('Lộ trình cá nhân'), detail: tr('Lộ trình học đầu tiên sẵn sàng') };
    case 'FIRST_LESSON_COMPLETED': return { visual: 'book', accent: 'emerald', title: tr('Bài học đầu tiên'), detail: tr('Hoàn thành bài học đầu tiên') };
    case 'LESSONS_COMPLETED': return { visual: 'book', accent: 'emerald', title: trf('{0} bài học', { 0: a.value }), detail: trf('Hoàn thành {0} bài học', { 0: a.value }) };
    case 'GROUP_QUIZ_PASSED': return { visual: 'medal', accent: 'gold', title: tr('Kiểm tra cuối chặng'), detail: tr('Vượt qua bài kiểm tra tổng hợp chặng học') };
    case 'STAGE_ASSESSMENT_PASSED': return { visual: 'trophy', accent: 'gold', title: tr('Tổng kết cấp độ'), detail: tr('Đạt bài đánh giá tổng kết cấp độ JLPT') };
    case 'MOCK_TEST_COMPLETED': return { visual: 'result', accent: 'blue', title: tr('Bài thi thử đầu tiên'), detail: tr('Hoàn thành bài thi thử đầu tiên') };
    case 'STREAK_MILESTONE': return { visual: 'medal', accent: 'peach', title: trf('Chuỗi {0} ngày', { 0: a.value }), detail: trf('Học {0} ngày liên tiếp', { 0: a.value }) };
    default: return null;
  }
}
