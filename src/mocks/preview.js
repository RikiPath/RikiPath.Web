export const PREVIEW_FLAG = 'rikipath.preview';
export const PREVIEW_ROLE = 'rikipath.previewRole';

export const PREVIEW_SESSIONS = {
  Learner: {
    isPreview: true,
    accessToken: 'preview-learner',
    role: 'Learner',
    userId: 'preview-minh-anh',
    email: 'minh.anh@rikipath.preview',
    fullName: 'Minh Anh',
    skipOnboarding: true,
  },
  Mentor: {
    isPreview: true,
    accessToken: 'preview-mentor',
    role: 'Mentor',
    userId: 'preview-sensei',
    email: 'aoi@rikipath.preview',
    fullName: 'Sensei Aoi',
  },
  Admin: {
    isPreview: true,
    accessToken: 'preview-admin',
    role: 'Admin',
    userId: 'preview-admin',
    email: 'admin@rikipath.preview',
    fullName: 'Sakura Admin',
  },
  ContentAuthor: {
    isPreview: true,
    accessToken: 'preview-author',
    role: 'ContentAuthor',
    userId: 'preview-author',
    email: 'author@rikipath.preview',
    fullName: 'Content Lead',
  },
};

export const MOCK_PROFILE = {
  firstName: 'Minh',
  lastName: 'Anh',
  email: 'minh.anh@rikipath.preview',
  avatarUrl: null,
  role: 'Learner',
  targetJlptLevelId: 3,
  targetJlptLevelName: 'N3',
  dailyStudyMinutes: 45,
};

export const MOCK_STREAK = {
  currentStreakDays: 6,
  longestStreakDays: 14,
  isActiveToday: true,
};

export const MOCK_COMPLETION = {
  completedLessons: 18,
  totalLessons: 30,
  completionPercent: 60,
};

export const MOCK_SKILLS = [
  { skillName: 'Từ vựng', averageScore: 82 },
  { skillName: 'Ngữ pháp', averageScore: 74 },
  { skillName: 'Đọc hiểu', averageScore: 68 },
  { skillName: 'Nghe hiểu', averageScore: 71 },
  { skillName: 'Viết', averageScore: 63 },
];

export const MOCK_SRS = {
  totalDue: 24,
  items: [
    { id: '1', prompt: '経験', meaning: 'kinh nghiệm', repetitions: 1 },
    { id: '2', prompt: '準備', meaning: 'chuẩn bị', repetitions: 2 },
    { id: '3', prompt: '～わけにはいかない', meaning: 'không thể làm…', repetitions: 0 },
    { id: '4', prompt: '連絡', meaning: 'liên lạc', repetitions: 5 },
    { id: '5', prompt: '確認', meaning: 'xác nhận', repetitions: 3 },
  ],
};

export function isPreviewEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const q = params.get('preview');
  if (q === '0') {
    localStorage.removeItem(PREVIEW_FLAG);
    return false;
  }
  if (q) {
    localStorage.setItem(PREVIEW_FLAG, '1');
    const role = ['Learner', 'Mentor', 'Admin', 'ContentAuthor'].includes(q) ? q : 'Learner';
    localStorage.setItem(PREVIEW_ROLE, role);
    return true;
  }
  return localStorage.getItem(PREVIEW_FLAG) === '1';
}

export function getPreviewSession() {
  if (!isPreviewEnabled()) return null;
  const role = localStorage.getItem(PREVIEW_ROLE) || 'Learner';
  return PREVIEW_SESSIONS[role] || PREVIEW_SESSIONS.Learner;
}
