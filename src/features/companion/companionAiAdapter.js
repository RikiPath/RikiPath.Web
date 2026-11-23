import { searchJapaneseDictionary } from '@/features/vocabulary/api/japaneseDictionaryApi.js';
import { getLearningLessons, getJlptLevels } from '@/features/lessons/api/lessonApi.js';
import { COMPANION_STATES } from './companionMachine.js';

let customAiChatProvider = null;

/**
 * Extension hook for connecting a dedicated conversational LLM backend later
 * without touching UI components.
 */
export function registerCompanionChatProvider(providerFn) {
  customAiChatProvider = typeof providerFn === 'function' ? providerFn : null;
}

const JLPT_KNOWLEDGE = [
  {
    match: /\b(wa|ga)\b|は.*が|trợ từ/i,
    text:
      'Mẹo phân biệt は (wa) và が (ga):\n• **は** nêu chủ đề chung hoặc thông tin đã biết ("Về phần A thì...").\n• **が** nhấn mạnh chủ thể trực tiếp thực hiện / trả lời câu hỏi Ai? Cái gì?\nThử xem thêm ví dụ ngay trong mục Ngữ pháp nhé!',
    actions: [{ label: 'Mở Ngữ pháp JLPT', to: '/grammar/' }],
  },
  {
    match: /kanji|hán tự|chữ hán|nhớ chữ/i,
    text:
      'Bí kíp nhớ Kanji bền:\n1. Tách theo **bộ thủ** thay vì học vẹt từng nét.\n2. Gắn kèm 1 từ ghép hay gặp (On-yomi + Kun-yomi).\n3. Viết chậm 3 lần trên khung luyện viết rồi đưa vào SRS!',
    actions: [{ label: 'Luyện viết Kanji', to: '/kanji-writing?type=kanji' }],
  },
  {
    match: /nghe|listening|choukai|聴解/i,
    text:
      'Mẹo luyện nghe JLPT: Lần 1 nghe lấy bối cảnh ai nói với ai; lần 2 chú ý từ khóa cuối câu vì tiếng Nhật thường đảo ý phủ định ở cuối động từ!',
    actions: [{ label: 'Luyện Nghe hiểu', to: '/riki/listening/' }],
  },
  {
    match: /đọc|reading|dokkai|読解/i,
    text:
      'Khi đọc đoạn ngắn JLPT, hãy đọc câu hỏi trước để biết cần tìm gì, rồi gạch dấu những từ nối như しかし (tuy nhiên) hoặc つまり (tóm lại) nhé!',
    actions: [{ label: 'Luyện Đọc hiểu', to: '/riki/reading/' }],
  },
  {
    match: /thi thử|mock|jlpt|đề thi/i,
    text:
      'Trước khi vào đề thi thử đủ giờ, bạn nên nắm chắc phân bổ thời gian: làm phần Từ vựng-Chữ Hán thật dứt khoát để dành dư thời gian cho Đọc hiểu!',
    actions: [{ label: 'Mở Thi thử JLPT', to: '/mock-tests/' }],
  },
];

function extractJapaneseQuery(text) {
  const match = String(text || '').match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
  return match ? match[0] : '';
}

function formatRealProgressSummary(stats = {}) {
  const parts = [];
  if (stats.targetLevel) parts.push(`Mục tiêu: **JLPT ${stats.targetLevel}**`);
  if (Number.isFinite(stats.streakDays)) parts.push(`Chuỗi học: **${stats.streakDays} ngày**`);
  if (Number.isFinite(stats.completedExercises)) parts.push(`Bài hoàn thành: **${stats.completedExercises} bài**`);
  if (Number.isFinite(stats.dueCards)) parts.push(`Thẻ SRS đến hạn: **${stats.dueCards} thẻ**`);

  if (!parts.length) {
    return {
      text: 'Hiện mình chưa thấy dữ liệu tiến độ nào trên tài khoản của bạn. Hãy bắt đầu thiết lập mục tiêu JLPT hoặc làm 1 bài ngắn nhé!',
      state: COMPANION_STATES.THINKING,
      actions: [
        { label: 'Đặt mục tiêu JLPT', to: '/onboarding/' },
        { label: 'Khám phá bài học', to: '/lessons/' },
      ],
    };
  }

  const actions = [];
  if ((stats.dueCards || 0) > 0) actions.push({ label: `Ôn ${stats.dueCards} thẻ SRS`, to: '/daily-srs/' });
  if (!stats.hasPlacementCompleted) actions.push({ label: 'Đánh giá năng lực', to: '/app/placement-test/' });
  else if (!stats.hasActiveAiPath) actions.push({ label: 'Tạo lộ trình AI', to: '/roadmap/?generateAi=1' });
  else actions.push({ label: 'Xem Lộ trình của tôi', to: '/roadmap/' });

  return {
    text: `Tình hình thực tế của bạn hôm nay:\n• ${parts.join('\n• ')}`,
    state: (stats.streakDays || 0) >= 3 ? COMPANION_STATES.CELEBRATING : COMPANION_STATES.SPEAKING,
    actions,
  };
}

async function resolveRealLessonSuggestions(stats = {}) {
  if (stats.hasActiveAiPath && Array.isArray(stats.dailySchedules) && stats.dailySchedules.length > 0) {
    const nextDay =
      stats.dailySchedules.find((d) => !d.isCompleted && (d.canStart || d.isStarted)) ||
      stats.dailySchedules[0];
    if (nextDay) {
      return {
        text: `Theo lộ trình AI hiện tại, chặng tiếp theo là **Ngày ${nextDay.day}**${nextDay.title ? `: ${nextDay.title}` : ''}. Mình mở lộ trình giúp bạn nhé?`,
        state: COMPANION_STATES.SPEAKING,
        actions: [{ label: 'Mở Lộ trình của tôi', to: '/roadmap/' }],
      };
    }
  }

  try {
    let targetLevelId = stats.targetJlptLevelId;
    if (!targetLevelId && stats.targetLevel) {
      const levels = await getJlptLevels();
      const matched = (Array.isArray(levels) ? levels : []).find(
        (l) => String(l.code || l.name || '').toUpperCase().includes(stats.targetLevel),
      );
      targetLevelId = matched?.id;
    }

    const lessonsRes = await getLearningLessons(targetLevelId);
    const items = Array.isArray(lessonsRes?.items)
      ? lessonsRes.items
      : Array.isArray(lessonsRes)
        ? lessonsRes
        : [];
    const nextLesson = items.find((item) => !item.isCompleted) || items[0];

    if (nextLesson) {
      return {
        text: `Gợi ý bài phù hợp ngay lúc này (${stats.targetLevel ? `JLPT ${stats.targetLevel}` : 'thư viện bài học'}): **${nextLesson.title || nextLesson.name || 'Bài học mới'}**`,
        state: COMPANION_STATES.SPEAKING,
        actions: [
          nextLesson.id || nextLesson.lessonId
            ? { label: 'Vào học bài này', to: `/lesson-player/${nextLesson.id || nextLesson.lessonId}` }
            : { label: 'Mở danh sách bài học', to: '/lessons/' },
          ...(stats.dueCards > 0 ? [{ label: `Ôn ${stats.dueCards} thẻ SRS`, to: '/daily-srs/' }] : []),
        ],
      };
    }
  } catch {
    // Fall back cleanly without throwing when self-study catalog is locked or unavailable
  }

  if ((stats.dueCards || 0) > 0) {
    return {
      text: `Hôm nay có **${stats.dueCards} thẻ SRS** đến hạn ôn! Hoàn thành nhanh các thẻ này rồi mình qua bài mới nha.`,
      state: COMPANION_STATES.SPEAKING,
      actions: [{ label: 'Ôn SRS ngay', to: '/daily-srs/' }],
    };
  }

  if (!stats.hasPlacementCompleted) {
    return {
      text: 'Bước tốt nhất lúc này là làm bài đánh giá năng lực ngắn để Riki biết chính xác trình độ và mở khóa lộ trình cho bạn.',
      state: COMPANION_STATES.THINKING,
      actions: [{ label: 'Làm bài đánh giá', to: '/app/placement-test/' }],
    };
  }

  return {
    text: 'Bạn có thể mở Kho bài học JLPT, luyện Nghe-Đọc hoặc ôn từ vựng hôm nay nhé!',
    state: COMPANION_STATES.SPEAKING,
    actions: [
      { label: 'Khám phá bài học', to: '/lessons/' },
      { label: 'Sổ tay cá nhân', to: '/kanji-notebook/' },
    ],
  };
}

/**
 * Answers learner questions using optional configured AI chat provider OR live RikiPath Backend APIs
 * (Dictionary search, Lesson catalog, Placement, Roadmap, Analytics).
 */
export async function askSakuraCompanion({ query, stats = {}, history = [], locale = 'vi', signal } = {}) {
  const clean = String(query || '').trim();
  if (!clean) {
    return {
      text: 'Bạn gõ từ tiếng Nhật (ví dụ さくら), hỏi mẹo ngữ pháp JLPT, hoặc nhờ Riki kiểm tra tiến độ nha!',
      state: COMPANION_STATES.SPEAKING,
      actions: [],
    };
  }

  // Optional pluggable AI endpoint hookup (explicit opt-in via env or registerCompanionChatProvider)
  if (customAiChatProvider) {
    const customReply = await customAiChatProvider({ query: clean, stats, history, locale, signal });
    if (customReply?.text) return customReply;
  }

  const lower = clean.toLowerCase();

  // 1. Live Backend Japanese Dictionary lookup
  const jpToken = extractJapaneseQuery(clean);
  if (jpToken || /tra từ|nghĩa của|từ điển/.test(lower)) {
    const lookupTerm = jpToken || clean.replace(/tra từ|nghĩa của|từ điển/gi, '').trim();
    if (lookupTerm) {
      try {
        const entries = await searchJapaneseDictionary(lookupTerm);
        const list = Array.isArray(entries) ? entries : Array.isArray(entries?.items) ? entries.items : [];
        if (list.length > 0) {
          const top = list.slice(0, 3).map((item) => {
            const word = item.word || item.kanji || item.readingKana || lookupTerm;
            const reading = item.readingKana && item.readingKana !== word ? ` (${item.readingKana})` : '';
            const meaning = item.meaningVi || item.meaning || item.definition || '';
            return `• **${word}**${reading}: ${meaning}`;
          });
          return {
            text: `Mình tìm thấy trong từ điển RikiPath:\n${top.join('\n')}`,
            state: COMPANION_STATES.CELEBRATING,
            actions: [{ label: 'Tra & lưu từ vựng', to: '/kanji-notebook/?tab=vocab-bank' }],
          };
        }
        return {
          text: `Mình chưa thấy mục "${lookupTerm}" trong từ điển hiện có. Bạn thử tra bằng chữ Hiragana (ví dụ: さくら) hoặc mở Sổ tay cá nhân nhé!`,
          state: COMPANION_STATES.THINKING,
          actions: [{ label: 'Mở Sổ tay cá nhân', to: '/kanji-notebook/?tab=vocab-bank' }],
        };
      } catch {
        // Continue to next matching advisor branch cleanly
      }
    }
  }

  // 2. Real Progress Check
  if (/tiến độ|thống kê|kết quả|chuỗi|streak|srs/.test(lower)) {
    return formatRealProgressSummary(stats);
  }

  // 3. Real Lesson Recommendation
  if (/gợi ý|học gì|bài học|lộ trình|hôm nay/.test(lower)) {
    return resolveRealLessonSuggestions(stats);
  }

  // 4. Curated JLPT Study Patterns & Exam Tips
  const matchedKnowledge = JLPT_KNOWLEDGE.find((entry) => entry.match.test(clean));
  if (matchedKnowledge) {
    return {
      text: matchedKnowledge.text,
      state: COMPANION_STATES.SPEAKING,
      actions: matchedKnowledge.actions,
    };
  }

  // 5. Warm conversational fallback grounded in real user state
  return {
    text: `Mình nghe bạn nè! Hiện bạn có thể:\n• Nhập chữ Kana/Kanji (ví dụ: **さくら**) để mình tra từ điển giúp.\n• Bấm hỏi **Gợi ý bài học** hoặc **Kiểm tra tiến độ** để xem dữ liệu thực tế của bạn${stats.targetLevel ? ` (Mục tiêu JLPT ${stats.targetLevel})` : ''}.`,
    state: COMPANION_STATES.SPEAKING,
    actions: [
      { label: 'Gợi ý bài hôm nay', action: 'recommend' },
      { label: 'Xem tiến độ', action: 'progress' },
    ],
  };
}
