/**
 * Pure state machine, preferences storage, cooldown control, and data-backed contextual lines
 * for the Sakura Fox Interactive Learning Companion (Riki).
 */

export const COMPANION_STATES = {
  IDLE: 'idle',
  CURIOUS: 'curious',
  HOVER: 'hover',
  HAPPY: 'happy',
  EXCITED: 'excited',
  THINKING: 'thinking',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  STUDYING: 'studying',
  CELEBRATING: 'celebrating',
  ENCOURAGING: 'encouraging',
  DRAGGING: 'dragging',
  LANDING: 'landing',
  SLEEPY: 'sleepy',
};

export function resolvePageAmbientState(pathname = '') {
  const clean = String(pathname || '').replace(/\/+$/, '') || '/';
  if (
    clean.startsWith('/lessons') ||
    clean.startsWith('/lesson-player') ||
    clean.startsWith('/grammar') ||
    clean.startsWith('/kanji-notebook') ||
    clean.startsWith('/vocabulary-detail') ||
    clean.startsWith('/kanji-writing') ||
    clean.startsWith('/daily-srs')
  ) {
    return COMPANION_STATES.STUDYING;
  }
  if (
    clean.startsWith('/ai-counselor') ||
    clean.startsWith('/ai-scoring') ||
    clean.startsWith('/roadmap') ||
    clean.startsWith('/cohorts')
  ) {
    return COMPANION_STATES.CURIOUS;
  }
  return COMPANION_STATES.IDLE;
}

export const COMPANION_REACTIONS = {
  NONE: 'none',
  WAVING: 'waving',
  JUMPING: 'jumping',
};

export const COMPANION_PREFS_KEY = 'rikipath.sakuraCompanion.prefs.v1';
export const COMPANION_SESSION_KEY = 'rikipath.sakuraCompanion.session.v1';
export const AUTO_SPEECH_COOLDOWN_MS = 12 * 60 * 1000;
export const INACTIVITY_SLEEP_MS = 45 * 1000;

export const DEFAULT_COMPANION_PREFS = {
  mutedProactive: false,
  soundEnabled: false,
  minimized: false,
};

export function loadCompanionPrefs() {
  if (typeof window === 'undefined') return { ...DEFAULT_COMPANION_PREFS };
  try {
    const raw = window.localStorage.getItem(COMPANION_PREFS_KEY);
    if (!raw) return { ...DEFAULT_COMPANION_PREFS };
    const parsed = JSON.parse(raw);
    return {
      mutedProactive: Boolean(parsed?.mutedProactive),
      soundEnabled: Boolean(parsed?.soundEnabled),
      minimized: Boolean(parsed?.minimized),
    };
  } catch {
    return { ...DEFAULT_COMPANION_PREFS };
  }
}

export function saveCompanionPrefs(prefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      COMPANION_PREFS_KEY,
      JSON.stringify({
        mutedProactive: Boolean(prefs?.mutedProactive),
        soundEnabled: Boolean(prefs?.soundEnabled),
        minimized: Boolean(prefs?.minimized),
      }),
    );
  } catch {
    // Ignore private-mode / quota errors.
  }
}

export function canTriggerProactiveSpeech({ mutedProactive, suppressed, now = Date.now(), lastSpokenAt = 0 }) {
  if (mutedProactive || suppressed) return false;
  if (!lastSpokenAt) return true;
  return now - lastSpokenAt >= AUTO_SPEECH_COOLDOWN_MS;
}

export function readSessionSpeechMeta() {
  if (typeof window === 'undefined') return { lastSpokenAt: 0, count: 0 };
  try {
    const raw = window.sessionStorage.getItem(COMPANION_SESSION_KEY);
    if (!raw) return { lastSpokenAt: 0, count: 0 };
    const parsed = JSON.parse(raw);
    return {
      lastSpokenAt: Number(parsed?.lastSpokenAt) || 0,
      count: Number(parsed?.count) || 0,
    };
  } catch {
    return { lastSpokenAt: 0, count: 0 };
  }
}

export function recordSessionSpeech(now = Date.now()) {
  if (typeof window === 'undefined') return;
  try {
    const prev = readSessionSpeechMeta();
    window.sessionStorage.setItem(
      COMPANION_SESSION_KEY,
      JSON.stringify({ lastSpokenAt: now, count: prev.count + 1 }),
    );
  } catch {
    // Ignore private-mode restrictions.
  }
}

/**
 * Resolves distraction-free exam & meeting guard strictly from real pathname/search/DOM flag.
 */
export function isCompanionSuppressedRoute({ pathname = '', search = '', examActive = false } = {}) {
  if (examActive) return true;
  const clean = String(pathname || '').replace(/\/+$/, '') || '/';
  if (
    clean.startsWith('/placement/exam') ||
    clean.startsWith('/placement-test') ||
    clean.startsWith('/thi-thu') ||
    clean.startsWith('/meeting')
  ) {
    return true;
  }
  if (clean.startsWith('/mock-tests') && String(search || '').includes('attemptId=')) {
    return true;
  }
  return false;
}

/**
 * Picks a line from `candidates` that wasn't shown recently so dialogue stays fresh and natural.
 */
export function selectNonRepeatingLine(candidates = [], recentIds = []) {
  if (!candidates.length) return null;
  const recentSet = new Set(recentIds);
  const fresh = candidates.filter((item) => !recentSet.has(item.id));
  const pool = fresh.length ? fresh : candidates;
  return pool[Math.floor(Math.random() * pool.length)] || candidates[0];
}

export function pickRandomMove(moves = []) {
  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Builds contextual Riki Fox speech bubble lines strictly from real backend learner state.
 * Never fabricates XP, scores, streaks, or unlocked milestones.
 */
export function buildContextualSpeechCandidates({
  pathname = '',
  stats = {},
} = {}) {
  const clean = String(pathname || '').replace(/\/+$/, '') || '/';
  const level = stats.targetLevel || null;
  const streak = Number.isFinite(stats.streakDays) ? stats.streakDays : null;
  const dueCards = Number.isFinite(stats.dueCards) ? stats.dueCards : null;
  const completed = Number.isFinite(stats.completedExercises) ? stats.completedExercises : null;
  const hasPlacement = Boolean(stats.hasPlacementCompleted);
  const hasActivePath = Boolean(stats.hasActiveAiPath);

  const candidates = [];

  if (dueCards != null && dueCards > 0) {
    candidates.push({
      id: 'due-srs',
      text: `Hôm nay có ${dueCards} thẻ SRS đang chờ bạn đó! Ôn nhanh vài thẻ với Riki cho nhớ lâu nhé?`,
      state: COMPANION_STATES.SPEAKING,
      quickReplies: [
        { label: 'Ôn tập nhanh', action: 'quick-review' },
        { label: 'Mở SRS đầy đủ', to: '/daily-srs/' },
      ],
    });
  }

  if (streak != null && streak >= 3) {
    candidates.push({
      id: `streak-${streak >= 7 ? 'week' : 'warm'}`,
      text: `Tuyệt quá, chuỗi ${streak} ngày học liên tiếp rồi! Hôm nay giữ nhịp thêm một bài nhỏ nhé?`,
      state: COMPANION_STATES.CELEBRATING,
      quickReplies: [
        { label: 'Gợi ý bài học', action: 'recommend' },
        { label: 'Động viên mình', action: 'encourage' },
      ],
    });
  }

  if (!level) {
    candidates.push({
      id: 'missing-goal',
      text: 'Bạn chưa chọn mục tiêu JLPT kìa! Chọn cấp độ mục tiêu để Riki đồng hành đúng hướng nha.',
      state: COMPANION_STATES.THINKING,
      quickReplies: [
        { label: 'Đặt mục tiêu JLPT', to: '/onboarding/' },
        { label: 'Trò chuyện với Riki', action: 'chat' },
      ],
    });
  } else if (!hasPlacement && !hasActivePath) {
    candidates.push({
      id: 'need-placement',
      text: `Mục tiêu JLPT ${level} đã sẵn sàng! Làm bài đánh giá năng lực ngắn để mở khóa lộ trình nhé?`,
      state: COMPANION_STATES.SPEAKING,
      quickReplies: [
        { label: 'Đánh giá năng lực', to: '/app/placement-test/' },
        { label: 'Hỏi Riki về JLPT', action: 'chat' },
      ],
    });
  } else if (hasPlacement && !hasActivePath) {
    candidates.push({
      id: 'ready-ai-path',
      text: 'Bạn đã có kết quả đánh giá năng lực rồi đó! Muốn tạo lộ trình học cá nhân hóa với AI không?',
      state: COMPANION_STATES.CELEBRATING,
      quickReplies: [
        { label: 'Tạo lộ trình AI', to: '/roadmap/?generateAi=1' },
        { label: 'Kiểm tra tiến độ', action: 'progress' },
      ],
    });
  }

  if (clean.startsWith('/daily-srs')) {
    candidates.push({
      id: 'ctx-srs',
      text: 'Nhẩm lại cách đọc trước khi lật thẻ sẽ giúp não ghi nhớ sâu hơn gấp đôi đó!',
      state: COMPANION_STATES.LISTENING,
      quickReplies: [
        { label: 'Động viên mình', action: 'encourage' },
        { label: 'Mẹo nhớ Kanji', action: 'chat-kanji' },
      ],
    });
  } else if (clean.startsWith('/kanji-writing')) {
    candidates.push({
      id: 'ctx-kanji',
      text: 'Viết chậm từng nét từ trái sang phải, trên xuống dưới — Riki đang cổ vũ bạn đây!',
      state: COMPANION_STATES.SPEAKING,
      quickReplies: [
        { label: 'Gợi ý bài học', action: 'recommend' },
        { label: 'Chơi với Riki', action: 'play' },
      ],
    });
  } else if (clean.startsWith('/lessons') || clean.startsWith('/lesson-player')) {
    candidates.push({
      id: 'ctx-lessons',
      text: completed != null && completed > 0
        ? `Bạn đã hoàn thành ${completed} bài rồi nè! Học xong nhớ ôn câu ví dụ luôn nha.`
        : 'Bắt đầu từ một bài vừa sức thôi nào — hoàn thành từng bước nhỏ là siêu giỏi rồi!',
      state: COMPANION_STATES.SPEAKING,
      quickReplies: [
        { label: 'Kiểm tra tiến độ', action: 'progress' },
        { label: 'Hỏi Riki ngữ pháp', action: 'chat' },
      ],
    });
  }

  candidates.push(
    {
      id: 'cheer-sakura-1',
      text: 'Học tiếng Nhật giống như ngắm hoa anh đào nở — mỗi ngày một chút rồi cả cây sẽ rực rỡ!',
      state: COMPANION_STATES.SPEAKING,
      quickReplies: [
        { label: 'Gợi ý bài học', action: 'recommend' },
        { label: 'Chơi với Riki', action: 'play' },
      ],
    },
    {
      id: 'cheer-tea-2',
      text: 'Nếu thấy hơi mỏi mắt thì hít một hơi sâu nha. Có Riki ngồi học cùng bạn rồi đây!',
      state: COMPANION_STATES.IDLE,
      quickReplies: [
        { label: 'Ôn tập nhanh', action: 'quick-review' },
        { label: 'Động viên mình', action: 'encourage' },
      ],
    },
  );

  return candidates;
}

export const ENCOURAGEMENT_LINES = [
  {
    id: 'enc-1',
    text: 'Cố lên! Không cần thuộc 100 từ một lúc đâu — hôm nay nhớ thêm 5 từ vững vàng là quá đỉnh rồi!',
  },
  {
    id: 'enc-2',
    text: 'Riki tin bạn làm được! Mỗi lần bấm ôn lại một chữ Kanji khó là thêm một viên gạch xây nền JLPT.',
  },
  {
    id: 'enc-3',
    text: 'Sai một câu bài tập cũng không sao cả — sai bây giờ để đi thi JLPT không nhầm nữa nè!',
  },
  {
    id: 'enc-4',
    text: 'Đuôi Riki vẫy tít lên để cổ vũ bạn đó! Nghỉ 10 giây uống nước rồi làm nốt mục tiêu hôm nay nhé!',
  },
  {
    id: 'enc-5',
    text: 'Ganbatte! Tiếng Nhật càng nghe nhiều càng quen tai — bạn đang đi đúng hướng rồi đó!',
  },
];
