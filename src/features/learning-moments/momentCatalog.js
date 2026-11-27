import { CalendarDays, Clock, GraduationCap, Layers, ListChecks, Route, Sparkles, TicketCheck, Timer } from 'lucide-react';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
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

/** CTA per purchased plan kind (routes come from the server's `ctaHref`, these are only the labels). */
const PURCHASE_CTA = {
  self_study: 'Bắt đầu học',
  combo: 'Bắt đầu học',
  learning_path: 'Khám phá lộ trình AI',
  speaking: 'Bắt đầu luyện nói',
  writing: 'Bắt đầu luyện viết',
  ai_grading: 'Bắt đầu sử dụng',
};

function formatMonthYear(isoDate) {
  const date = isoDate ? new Date(`${String(isoDate).slice(0, 10)}T12:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(currentIntlTag(), { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Goal facts — only what the learner actually confirmed (server data), never placeholders. */
function goalChips(data, trf) {
  const chips = [];
  if (data.targetLevel) chips.push({ label: formatJlptLevel(data.targetLevel), icon: GraduationCap });
  const min = positive(data.dailyMinutesMin);
  const max = positive(data.dailyMinutesMax);
  const daily = positive(data.dailyMinutes);
  if (min && max) chips.push({ label: trf('{0}–{1} phút/ngày', { 0: min, 1: max }), icon: Clock });
  else if (daily) chips.push({ label: trf('{0} phút/ngày', { 0: daily }), icon: Clock });
  const exam = formatMonthYear(data.examDate);
  if (exam) chips.push({ label: trf('Thi {0}', { 0: exam }), icon: CalendarDays });
  return chips;
}

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
      const mode = data.mode || 'activation';
      const plan = data.planName || '';
      const aiUses = positive(data.aiUses);
      const chips = [
        positive(data.durationDays) ? { label: trf('{0} ngày sử dụng', { 0: positive(data.durationDays) }), icon: CalendarDays } : null,
        aiUses ? { label: trf('{0} lượt AI', { 0: aiUses }), icon: TicketCheck } : null,
        data.isUnlimited === 'true'
          ? { label: tr('Không giới hạn thời hạn'), icon: Clock }
          : (data.endDate && !String(data.endDate).startsWith('2099') && !String(data.endDate).startsWith('2100'))
            ? { label: trf('Hiệu lực đến {0}', { 0: formatDate(data.endDate) }), icon: Clock }
            : null,
      ].filter(Boolean);
      let title;
      let description;
      if (mode === 'renewal') {
        title = tr('Gia hạn gói học thành công!');
        description = plan
          ? trf('{0} đã được gia hạn. Bạn tiếp tục sử dụng đầy đủ quyền lợi mà không bị gián đoạn.', { 0: plan })
          : tr('Gói học của bạn đã được gia hạn. Bạn tiếp tục sử dụng đầy đủ quyền lợi mà không bị gián đoạn.');
      } else if (mode === 'topup') {
        title = tr('Đã bổ sung lượt AI thành công!');
        description = aiUses
          ? trf('Bạn vừa nhận thêm {0} lượt AI. Lượt mới đã sẵn sàng để sử dụng ngay.', { 0: aiUses })
          : tr('Lượt AI mới đã được cộng vào tài khoản và sẵn sàng để sử dụng ngay.');
      } else if (mode === 'credit') {
        title = tr('Chúc mừng! Lượt AI của bạn đã được kích hoạt');
        description = plan
          ? trf('Bạn đã nhận quyền lợi của {0}. Hãy dùng lượt AI để nhận góp ý và nâng cấp trải nghiệm học tập cùng RikiPath.', { 0: plan })
          : tr('Lượt AI đã sẵn sàng. Hãy dùng để nhận góp ý và nâng cấp trải nghiệm học tập cùng RikiPath.');
      } else {
        title = tr('Chúc mừng! Gói học của bạn đã được kích hoạt');
        description = plan
          ? trf('Bạn đã mở khóa thành công các quyền lợi của {0}. Khám phá những tính năng mới và nâng cấp trải nghiệm học tập cùng RikiPath.', { 0: plan })
          : tr('Bạn đã mở khóa thành công các quyền lợi của gói học. Khám phá những tính năng mới và nâng cấp trải nghiệm học tập cùng RikiPath.');
      }
      const benefits = Array.isArray(moment.benefits) ? moment.benefits.filter((b) => b?.name) : [];
      return {
        variant: 'purchase',
        // Unlock animation only when something new is actually unlocked.
        unlock: mode === 'activation' || mode === 'credit',
        accent: 'emerald',
        visual: 'success',
        eyebrow: tr('Thanh toán thành công'),
        planName: plan,
        title,
        description,
        chips,
        benefits,
        // The server points the CTA at a missing prerequisite (goal / placement) when the plan cannot be used yet.
        cta: data.ctaStep === 'goal'
          ? tr('Thiết lập mục tiêu học tập')
          : data.ctaStep === 'placement'
            ? tr('Làm bài đánh giá năng lực')
            : tr(PURCHASE_CTA[data.kind] || 'Khám phá tính năng'),
      };
    }
    case 'GOAL_CONFIRMED':
    case 'ONBOARDING_COMPLETED': {
      // Step 1 of Goal → Assessment → Roadmap. Copy never shows backend reasons; CTA routes come from the server.
      const title = data.targetLevel
        ? trf('Mục tiêu JLPT {0} đã sẵn sàng!', { 0: data.targetLevel })
        : tr('Mục tiêu JLPT của bạn đã sẵn sàng!');
      const reusesAssessment = data.nextStep === 'roadmap' || data.readyForRoadmap === 'true';
      return {
        variant: 'goal',
        accent: 'sakura',
        visual: 'compass',
        eyebrow: tr('Bước 1/3 hoàn tất'),
        title,
        description: reusesAssessment
          ? tr('Mục tiêu và kết quả đánh giá đã sẵn sàng. Hãy tạo lộ trình học phù hợp với bạn.')
          : data.compatibilityStatus === 'INSUFFICIENT_FOR_TARGET'
            ? tr('Kết quả trước chưa phù hợp với mục tiêu mới. Hãy làm bài đánh giá cho mục tiêu hiện tại.')
            : tr('Bước tiếp theo, hãy đánh giá năng lực để tìm ra lộ trình học phù hợp với bạn.'),
        chips: goalChips(data, trf),
        cta: reusesAssessment ? tr('Tạo lộ trình học') : tr('Đánh giá năng lực'),
      };
    }
    case 'PLACEMENT_COMPLETED': {
      const chips = [
        data.targetLevel ? { label: formatJlptLevel(data.targetLevel), icon: GraduationCap } : null,
        // An internal reference level, never an official JLPT result.
        data.assessedLevel ? trf('Trình độ tham khảo: JLPT {0}', { 0: data.assessedLevel }) : null,
      ].filter(Boolean);
      const base = {
        variant: 'journey',
        accent: 'sakura',
        visual: 'target',
        eyebrow: tr('Bước 2/3 hoàn tất'),
        title: tr('Bạn đã hoàn thành bài đánh giá!'),
        chips,
      };
      if (data.nextStep === 'roadmap' && data.hasGoal !== 'false') {
        return {
          ...base,
          description: tr('Mục tiêu và kết quả đánh giá đã sẵn sàng. Hãy tạo lộ trình học phù hợp với bạn.'),
          cta: tr('Tạo lộ trình học'),
        };
      }
      if (data.hasGoal === 'false' || data.nextStep === 'goal') {
        return {
          ...base,
          eyebrow: tr('Đánh giá năng lực'),
          description: tr('Hãy đặt mục tiêu JLPT để RikiPath tạo lộ trình học phù hợp với bạn.'),
          cta: tr('Đặt mục tiêu JLPT'),
        };
      }
      return {
        ...base,
        eyebrow: tr('Đánh giá năng lực'),
        description: tr('Kết quả chưa đủ cho mục tiêu hiện tại. Hãy làm thêm bài đánh giá để nhận lộ trình phù hợp.'),
        cta: tr('Đánh giá năng lực'),
      };
    }
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
    case 'LEARNING_PATH_CREATED': {
      const ai = data.kind === 'ai' || data.kind === 'personalized';
      const chips = [
        data.targetLevel ? { label: formatJlptLevel(data.targetLevel), icon: GraduationCap } : null,
        { label: ai ? tr('Lộ trình cá nhân hóa AI') : tr('Lộ trình tiêu chuẩn'), icon: ai ? Sparkles : Route },
        positive(data.stages) ? { label: trf('{0} chặng học', { 0: positive(data.stages) }), icon: Layers } : null,
        positive(data.lessons) ? { label: trf('{0} bài học', { 0: positive(data.lessons) }), icon: ListChecks } : null,
        positive(data.planDays)
          ? { label: trf('{0} ngày học', { 0: positive(data.planDays) }), icon: CalendarDays }
          : positive(data.dailyMinutes) ? { label: trf('{0} phút/ngày', { 0: positive(data.dailyMinutes) }), icon: Timer } : null,
      ].filter(Boolean);
      return {
        variant: 'journey',
        ai,
        accent: 'sakura',
        visual: 'unlock',
        eyebrow: tr('Hành trình mới'),
        title: tr('Lộ trình học của bạn đã sẵn sàng!'),
        description: ai
          ? tr('Hành trình chinh phục JLPT của bạn đã chính thức bắt đầu. Lộ trình được xây dựng từ mục tiêu và kết quả đánh giá năng lực thực tế của bạn — khám phá từng chặng học và tiến gần hơn đến cấp độ mong muốn.')
          : tr('Hành trình chinh phục JLPT của bạn đã chính thức bắt đầu. Khám phá từng chặng học, hoàn thành các mục tiêu và tiến gần hơn đến cấp độ mà bạn mong muốn.'),
        chips,
        cta: tr('Khám phá lộ trình'),
      };
    }
    case 'MOCK_TEST_COMPLETED':
      return {
        accent: 'sakura',
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
          data.levelCode ? formatJlptLevel(data.levelCode) : null,
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
    case 'PLACEMENT_COMPLETED': return { visual: 'target', accent: 'sakura', title: tr('Đánh giá năng lực'), detail: tr('Hoàn thành bài đánh giá đầu tiên') };
    case 'LEARNING_PATH_CREATED': return { visual: 'unlock', accent: 'sakura', title: tr('Lộ trình học'), detail: tr('Lộ trình học đầu tiên sẵn sàng') };
    case 'FIRST_LESSON_COMPLETED': return { visual: 'book', accent: 'emerald', title: tr('Bài học đầu tiên'), detail: tr('Hoàn thành bài học đầu tiên') };
    case 'LESSONS_COMPLETED': return { visual: 'book', accent: 'emerald', title: trf('{0} bài học', { 0: a.value }), detail: trf('Hoàn thành {0} bài học', { 0: a.value }) };
    case 'GROUP_QUIZ_PASSED': return { visual: 'medal', accent: 'gold', title: tr('Kiểm tra cuối chặng'), detail: tr('Vượt qua bài kiểm tra tổng hợp chặng học') };
    case 'STAGE_ASSESSMENT_PASSED': return { visual: 'trophy', accent: 'gold', title: tr('Tổng kết cấp độ'), detail: tr('Đạt bài đánh giá tổng kết cấp độ JLPT') };
    case 'MOCK_TEST_COMPLETED': return { visual: 'result', accent: 'sakura', title: tr('Bài thi thử đầu tiên'), detail: tr('Hoàn thành bài thi thử đầu tiên') };
    case 'STREAK_MILESTONE': return { visual: 'medal', accent: 'peach', title: trf('Chuỗi {0} ngày', { 0: a.value }), detail: trf('Học {0} ngày liên tiếp', { 0: a.value }) };
    default: return null;
  }
}
