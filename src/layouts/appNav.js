// Role navigation for the unified AppShell. Every `to` must be a real route in
// App.jsx (enforced by test/app_nav_routes.test.js) — no dead links.
import {
  ArrowLeftRight,
  BadgeCheck,
  BookOpen,
  BookOpenCheck,
  BookOpenText,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  CalendarCheck2,
  CirclePlay,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CreditCard,
  FileCheck2,
  FileQuestion,
  FolderUp,
  Gavel,
  GraduationCap,
  Headphones,
  History,
  Keyboard,
  Languages,
  Layers,
  Layers3,
  LayoutDashboard,
  LayoutGrid,
  Library,
  ListChecks,
  MessageSquareWarning,
  Mic,
  NotebookPen,
  Package,
  PenLine,
  RefreshCw,
  Repeat,
  Settings,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  SpellCheck,
  Star,
  UserCheck,
  Users,
  UsersRound,
  Wand2,
} from 'lucide-react';
import {
  GroupClassIcon,
  JlptRoadmapIcon,
  KanaHiraganaIcon,
  KanjiBrushIcon,
  SrsLoopIcon,
} from '@/components/ui/SakuraIcons.js';
import { SIDEBAR_COUNTER_KEYS } from '@/features/sidebar-counters/sidebarCounterModel.js';

export const ROLE_NAV = {
  Learner: {
    home: '/app',
    area: 'Học viên',
    groups: [
      {
        label: 'Tổng quan',
        items: [
          { to: '/app', label: 'Bảng học tập', icon: LayoutDashboard, tone: 'haru', end: true },
          { to: '/placement', label: 'Đánh giá năng lực', icon: ClipboardCheck, tone: 'mock', prefix: true },
          {
            id: 'group-learning',
            to: '/my-courses',
            label: 'Học cùng Giáo viên',
            icon: GroupClassIcon,
            tone: 'group',
            defaultOpen: true,
            children: [
              { to: '/my-courses', label: 'Lớp của tôi', icon: GroupClassIcon, tone: 'group', prefix: true },
              { to: '/homework', label: 'Bài tập về nhà', icon: ClipboardList, tone: 'writing', counterKey: SIDEBAR_COUNTER_KEYS.LEARNER_HOMEWORK_PENDING },
              { to: '/calendar', label: 'Lịch học', icon: CalendarDays, tone: 'calendar' },
              { to: '/group-learning/progress', label: 'Tiến độ học nhóm', icon: ChartNoAxesCombined, tone: 'present' },
              { to: '/cohorts', label: 'Khám phá lớp học', icon: Compass, tone: 'group' },
              { to: '/mentors', label: 'Tìm Giáo viên', icon: UsersRound, tone: 'mentor', prefix: true },
            ],
          },
        ],
      },
      {
        label: 'Lộ trình học JLPT',
        items: [
          { to: '/roadmap', label: 'Lộ trình của tôi', icon: JlptRoadmapIcon, tone: 'roadmap', alsoActive: ['/roadmap/stages'] },
          {
            id: 'lesson-discovery',
            to: '/lessons',
            label: 'Khám phá bài học',
            icon: BookOpen,
            tone: 'lesson',
            defaultOpen: false,
            alsoActive: ['/lesson-player', '/lesson-practice', '/riki/listening', '/riki/reading'],
            children: [
              {
                to: '/lessons',
                label: 'Tất cả bài học',
                icon: LayoutGrid,
                tone: 'lesson',
                alsoMatch: ['/lessons?category=all'],
                excludeQuery: {
                  category: ['vocabulary', 'grammar', 'kanji', 'listening', 'reading'],
                  skill: ['Vocabulary', 'Grammar', 'Kanji', 'Listening', 'Reading', 'vocabulary', 'grammar', 'kanji', 'listening', 'reading'],
                },
                keywords: ['tất cả bài học', 'khám phá bài học', 'all lessons'],
              },
              {
                to: '/lessons?category=vocabulary',
                label: 'Từ vựng',
                icon: Languages,
                tone: 'vocab',
                alsoMatch: ['/lessons?skill=Vocabulary', '/lessons?skill=vocabulary'],
                keywords: ['từ vựng', 'vocabulary', 'bài học từ vựng'],
              },
              {
                to: '/lessons?category=grammar',
                label: 'Ngữ pháp',
                icon: SpellCheck,
                tone: 'grammar',
                alsoMatch: ['/lessons?skill=Grammar', '/lessons?skill=grammar'],
                keywords: ['ngữ pháp', 'grammar', 'bài học ngữ pháp'],
              },
              {
                to: '/lessons?category=kanji',
                label: 'Kanji',
                icon: KanjiBrushIcon,
                tone: 'kanji',
                alsoMatch: ['/lessons?skill=Kanji', '/lessons?skill=kanji'],
                keywords: ['kanji', 'hán tự', 'bài học kanji'],
              },
              {
                to: '/lessons?category=listening',
                label: 'Nghe hiểu',
                icon: Headphones,
                tone: 'listening',
                alsoMatch: ['/lessons?skill=Listening', '/lessons?skill=listening'],
                alsoActive: ['/riki/listening'],
                keywords: ['nghe hiểu', 'listening', 'bài học nghe hiểu'],
              },
              {
                to: '/lessons?category=reading',
                label: 'Đọc hiểu',
                icon: BookOpenText,
                tone: 'reading',
                alsoMatch: ['/lessons?skill=Reading', '/lessons?skill=reading'],
                alsoActive: ['/riki/reading'],
                keywords: ['đọc hiểu', 'reading', 'bài học đọc hiểu'],
              },
            ],
          },
        ],
      },
      {
        label: 'Thư viện tiếng Nhật',
        items: [
          { to: '/grammar', label: 'Ngữ pháp tiếng Nhật', icon: SpellCheck, tone: 'grammar' },
          { to: '/kanji-writing?type=kanji', label: 'Kanji (Hán tự)', icon: KanjiBrushIcon, tone: 'kanji' },
          { to: '/kanji-writing?type=hiragana', label: 'Bảng chữ Hiragana', icon: KanaHiraganaIcon, tone: 'kana' },
          { to: '/kanji-writing?type=katakana', label: 'Bảng chữ Katakana', icon: KanaHiraganaIcon, tone: 'kana' },
        ],
      },
      {
        label: 'Góc học tập của tôi',
        items: [
          {
            id: 'srs-review',
            to: '/daily-srs',
            label: 'Ôn tập SRS',
            icon: SrsLoopIcon,
            tone: 'srs',
            defaultOpen: true,
            children: [
              {
                to: '/daily-srs',
                label: 'Tổng quan',
                icon: LayoutGrid,
                end: true,
                alsoActive: ['/daily-srs/progress'],
                keywords: ['tổng quan', 'tiến độ', 'lịch ôn', 'overview', 'forecast', 'calendar'],
              },
              {
                to: '/daily-srs/due',
                label: 'Ôn thẻ đến hạn',
                icon: CalendarCheck2,
                counterKey: SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE,
                keywords: ['ôn thẻ đến hạn', 'đến hạn', 'due', 'scheduled review', 'lịch ôn'],
              },
              {
                id: 'srs-practice',
                to: '/daily-srs/practice',
                label: 'Ôn tự do',
                icon: CirclePlay,
                defaultOpen: true,
                children: [
                  {
                    to: '/daily-srs/practice/flip',
                    label: 'Lật thẻ',
                    icon: Layers3,
                    showIconInBreadcrumb: true,
                    kind: 'radio',
                    keywords: ['flashcard', 'flip', 'lật thẻ'],
                  },
                  {
                    to: '/daily-srs/practice/typing',
                    label: 'Gõ đáp án',
                    icon: Keyboard,
                    showIconInBreadcrumb: true,
                    kind: 'radio',
                    keywords: ['typing', 'gõ đáp án'],
                  },
                  {
                    to: '/daily-srs/practice/mcq',
                    label: 'Trắc nghiệm',
                    icon: ListChecks,
                    showIconInBreadcrumb: true,
                    kind: 'radio',
                    keywords: ['mcq', 'quiz', 'trắc nghiệm'],
                  },
                  {
                    to: '/daily-srs/practice/mixed',
                    label: 'Hỗn hợp',
                    icon: Shuffle,
                    showIconInBreadcrumb: true,
                    kind: 'radio',
                    keywords: ['mixed', 'hỗn hợp'],
                  },
                ],
              },
              { to: '/daily-srs/library', label: 'Thẻ của tôi', icon: Layers, keywords: ['thẻ của tôi', 'my cards', 'thẻ cá nhân', 'library'] },
              { to: '/daily-srs/templates', label: 'Thư viện thẻ mẫu', icon: BookOpen, keywords: ['thư viện thẻ mẫu', 'thẻ mẫu', 'templates'] },
            ],
          },
          { to: '/kanji-notebook', label: 'Sổ tay cá nhân', icon: NotebookPen, tone: 'writing', alsoActive: ['/vocabulary-detail'] },
        ],
      },
      {
        label: 'Luyện tập & Thi thử',
        items: [
          { to: '/riki/essay', label: 'Luyện viết', icon: PenLine, tone: 'writing', alsoActive: ['/sentence-studio', '/ai-scoring'] },
          { to: '/speech', label: 'Luyện nói', icon: Mic, tone: 'speaking', alsoActive: ['/riki/speaking'] },
          {
            id: 'practice-exam',
            to: '/practice-sets',
            label: 'Luyện đề & Thi thử',
            icon: BookOpenCheck,
            tone: 'mock',
            defaultOpen: false,
            children: [
              {
                to: '/practice-sets',
                label: 'Bộ đề luyện tập',
                icon: Layers,
                tone: 'mock',
                prefix: true,
                keywords: ['bộ đề', 'luyện đề', 'practice', 'kỹ năng', 'hỗn hợp'],
              },
              {
                to: '/mock-tests',
                label: 'Thi thử JLPT',
                icon: FileCheck2,
                tone: 'mock',
                prefix: true,
                alsoActive: ['/mock-test'],
                keywords: ['thi thử', 'jlpt', 'mock test', 'đề thi'],
              },
              {
                to: '/exam-result',
                label: 'Lịch sử & kết quả',
                icon: History,
                tone: 'neutral',
                prefix: true,
                keywords: ['lịch sử', 'kết quả', 'điểm số', 'xem lại', 'history', 'result'],
              },
            ],
          },
        ],
      },
      {
        label: 'Tiện ích & Tài khoản',
        items: [
          { to: '/plans', label: 'Gói tự học', icon: Layers, tone: 'neutral', alsoActive: ['/study-payment'] },
          { to: '/settings', label: 'Cài đặt', icon: Settings, tone: 'neutral', alsoActive: ['/profile'] },
        ],
      },
    ],
  },
  Mentor: {
    home: '/mentor-overview',
    area: 'Giáo viên',
    groups: [
      {
        label: 'Tổng quan',
        items: [{ to: '/mentor-overview', label: 'Bảng điều khiển', icon: LayoutDashboard, tone: 'mentor' }],
      },
      {
        label: 'Giảng dạy',
        items: [
          {
            to: '/mentor-study-courses',
            label: 'Quản lý lớp học',
            icon: GroupClassIcon,
            tone: 'group',
            prefix: true,
            alsoActive: ['/mentor/cohorts'],
            counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_COHORT_ATTENDANCE_PENDING,
            keywords: ['cohort', 'lớp học', 'học viên', 'điểm danh'],
          },
          {
            to: '/mentor-homework',
            label: 'Bài tập & chấm điểm',
            icon: ClipboardList,
            tone: 'writing',
            counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_HOMEWORK_TO_GRADE,
          },
          { to: '/mentor-grading', label: 'Chấm bài luyện tập', icon: ListChecks, tone: 'mock' },
          {
            id: 'mentor-teaching-schedule',
            to: '/work-schedule',
            label: 'Lịch giảng dạy',
            icon: CalendarDays,
            tone: 'calendar',
            defaultOpen: true,
            children: [
              {
                to: '/work-schedule',
                label: 'Lịch làm việc',
                icon: CalendarCheck,
                tone: 'calendar',
                alsoActive: ['/mentor/schedule', '/mentor/bookings'],
                keywords: ['lịch tuần', 'buổi dạy', 'đã xếp lớp', 'đã hoàn thành'],
              },
              {
                to: '/mentor-shift-schedule',
                label: 'Đăng ký khung giờ',
                icon: CalendarClock,
                tone: 'calendar',
                alsoActive: ['/mentor-availability', '/mentor/availability'],
                keywords: ['khung giờ', 'mẫu lịch tuần', 'đề xuất mở lớp'],
              },
              {
                to: '/mentor-proposal-history',
                label: 'Danh sách đăng ký',
                icon: ClipboardList,
                tone: 'calendar',
                counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_PROPOSALS_ACTION_REQUIRED,
                keywords: ['đề xuất', 'mở tuyển sinh', 'cần bổ sung', 'đã duyệt', 'đã mở lớp', 'bị từ chối'],
              },
            ],
          },
        ],
      },
      {
        label: 'Chất lượng & hỗ trợ',
        items: [
          { to: '/mentor-attendance-kpi', label: 'Điểm danh & KPI', icon: ChartNoAxesCombined, tone: 'reading' },
          { to: '/mentor-reviews', label: 'Đánh giá học viên', icon: Star, tone: 'grammar', alsoActive: ['/mentor/reviews'] },
          {
            to: '/mentor-disputes',
            label: 'Khiếu nại & hỗ trợ',
            icon: Gavel,
            tone: 'neutral',
            alsoActive: ['/mentor/complaints', '/mentor/disputes'],
            counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_COMPLAINTS_AWAITING_RESPONSE,
          },
        ],
      },
      {
        label: 'Tài khoản',
        items: [
          {
            to: '/profile',
            label: 'Tài khoản & cài đặt',
            icon: Settings,
            tone: 'neutral',
            alsoActive: ['/settings', '/mentor-profile', '/mentor/profile'],
            counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_PROFILE_ACTION_REQUIRED,
            keywords: ['hồ sơ cá nhân', 'hồ sơ chuyên môn', 'chứng chỉ', 'bảo mật', 'cài đặt'],
          },
        ],
      },
    ],
  },
  ContentAuthor: {
    home: '/cms-studio',
    area: 'Quản lý nội dung',
    groups: [
      {
        label: 'Tổng quan',
        items: [
          { to: '/cms-studio', label: 'Studio', icon: LayoutDashboard, tone: 'reading' },
          { to: '/author-dashboard', label: 'Nội dung của tôi', icon: ClipboardCheck, tone: 'reading', keywords: ['tiến độ', 'chờ duyệt'] },
        ],
      },
      {
        label: 'Biên soạn & Kho học liệu',
        items: [
          {
            id: 'author-create',
            to: '/content-manual',
            label: 'Biên soạn học liệu',
            icon: PenLine,
            tone: 'writing',
            defaultOpen: true,
            children: [
              { to: '/content-manual', label: 'Biên soạn nội dung', icon: PenLine, tone: 'writing', counterKey: SIDEBAR_COUNTER_KEYS.AUTHOR_MANUAL_CHANGES_REQUIRED },
              { to: '/srs-templates', label: 'Thẻ mẫu SRS', icon: Repeat, tone: 'vocabulary', counterKey: SIDEBAR_COUNTER_KEYS.AUTHOR_SRS_TEMPLATES_CHANGES_REQUIRED },
              { to: '/lesson-cms', label: 'Bài học', icon: BookOpen, tone: 'lesson', alsoActive: ['/lesson-cms-detail'], counterKey: SIDEBAR_COUNTER_KEYS.AUTHOR_LESSONS_CHANGES_REQUIRED },
              { to: '/exam-builder', label: 'Đề thi thử', icon: FileCheck2, tone: 'mock', counterKey: SIDEBAR_COUNTER_KEYS.AUTHOR_EXAMS_CHANGES_REQUIRED },
              { to: '/content-plan', label: 'Trợ lý biên soạn', icon: Wand2, tone: 'haru' },
            ],
          },
          {
            id: 'author-bank',
            to: '/vocabulary-editor',
            label: 'Kho đã duyệt',
            icon: Library,
            tone: 'vocabulary',
            children: [
              { to: '/vocabulary-editor', label: 'Từ vựng', icon: Languages, tone: 'vocabulary' },
              { to: '/kanji-editor', label: 'Hán tự', icon: KanjiBrushIcon, tone: 'kanji' },
              { to: '/content-library', label: 'Ngữ pháp', icon: SpellCheck, tone: 'grammar' },
              { to: '/question-bank', label: 'Ngân hàng câu hỏi', icon: FileQuestion, tone: 'mock', counterKey: SIDEBAR_COUNTER_KEYS.AUTHOR_QUESTION_BANK_CHANGES_REQUIRED },
            ],
          },
        ],
      },
      {
        label: 'Nhập liệu',
        items: [
          { to: '/bulk-import', label: 'Nhập Excel', icon: FolderUp, tone: 'neutral', alsoActive: ['/content-studio'], excludeQuery: { view: 'history' } },
          { to: '/bulk-import?view=history', label: 'Lịch sử nhập liệu', icon: History, tone: 'neutral' },
        ],
      },
      {
        label: 'Tài khoản',
        items: [
          { to: '/profile', label: 'Hồ sơ & cài đặt', icon: Settings, tone: 'neutral', alsoActive: ['/settings'] },
        ],
      },
    ],
  },
  Admin: {
    home: '/admin/dashboard',
    area: 'Quản trị',
    groups: [
      {
        label: 'Điều hành',
        items: [
          { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard, tone: 'sakura' },
          { to: '/admin/users', label: 'Người dùng & vai trò', icon: Users, tone: 'sakura', alsoActive: ['/admin/users/detail'] },
          { to: '/admin/payments', label: 'Thanh toán & giao dịch', icon: CreditCard, tone: 'sakura', counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_PAYMENTS_REVIEW },
        ],
      },
      {
        label: 'Lớp học & ghi danh',
        items: [
          { to: '/admin/study-courses', label: 'Lớp học & ghi danh', icon: GroupClassIcon, tone: 'sakura', excludeQuery: { section: 'enrollments' } },
          { to: '/admin/retake-support', label: 'Ghi danh & ôn lại JLPT', icon: RefreshCw, tone: 'sakura', alsoMatch: ['/admin/study-courses?section=enrollments'], counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_RETAKE_REQUESTS },
          { to: '/admin/mentor-template', label: 'Lịch cố định tuần', icon: Repeat, tone: 'sakura' },
        ],
      },
      {
        label: 'Lịch dạy & điều phối',
        items: [
          { to: '/admin/mentor-schedules', label: 'Đề xuất mở lớp', icon: CalendarCheck, tone: 'sakura', alsoMatch: ['/admin/slot-review?tab=proposals', '/admin/slot-review?tab=review'], counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_MENTOR_SCHEDULES },
          { to: '/admin/schedule-requests', label: 'Yêu cầu đổi/hủy lịch', icon: CalendarClock, tone: 'sakura', alsoMatch: ['/admin/slot-review?tab=cancel', '/admin/slot-review?tab=change'], counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_SCHEDULE_REQUESTS },
          { to: '/admin/mentor-replacements', label: 'Đổi Giáo viên', icon: UserCheck, tone: 'sakura' },
          { to: '/admin/transfers', label: 'Chuyển lớp', icon: ArrowLeftRight, tone: 'sakura', counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_COHORT_TRANSFERS },
        ],
      },
      {
        label: 'Giám sát & hỗ trợ',
        items: [
          { to: '/admin/complaints', label: 'Khiếu nại khóa học', icon: MessageSquareWarning, tone: 'sakura', alsoMatch: ['/admin/mentor-cases?tab=complaints'], counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_COMPLAINTS },
          { to: '/admin/mentor-quality', label: 'Điểm danh & KPI', icon: ChartNoAxesCombined, tone: 'sakura' },
        ],
      },
      {
        label: 'Giáo viên',
        items: [
          { to: '/admin/mentor-verifications', label: 'Xét duyệt hồ sơ', icon: BadgeCheck, tone: 'sakura', alsoActive: ['/admin/mentors', '/admin/consultants', '/admin/mentor-qualifications'], counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_MENTOR_VERIFICATIONS },
        ],
      },
      {
        label: 'Quản lý nội dung',
        items: [
          { to: '/admin/content-review', label: 'Duyệt nội dung', icon: ShieldCheck, tone: 'sakura', alsoActive: ['/admin/approval-content'], counterKey: SIDEBAR_COUNTER_KEYS.ADMIN_CONTENT_REVIEW },
        ],
      },
      {
        label: 'Cấu hình hệ thống',
        items: [
          { to: '/admin/study-catalog', label: 'Chứng chỉ & cấp độ', icon: GraduationCap, tone: 'neutral' },
          { to: '/admin/certificate-sections', label: 'Cấu trúc đề thi', icon: Library, tone: 'neutral' },
          { to: '/admin/plans', label: 'Gói học & học phí', icon: Package, tone: 'neutral' },
          {
            to: '/admin/policies',
            label: 'Chính sách lớp học',
            icon: SlidersHorizontal,
            tone: 'neutral',
            keywords: [
              'Chính sách vận hành',
              'Lớp học & giảng dạy',
              'Tuyển sinh & ghi danh',
              'Chính sách đào tạo',
              'sĩ số',
              'giới hạn lớp',
              'bài tập',
              'KPI',
            ],
          },
        ],
      },
      {
        label: 'Tài khoản & cài đặt',
        items: [
          { to: '/profile', label: 'Tài khoản & cài đặt', icon: Settings, tone: 'neutral', alsoActive: ['/settings', '/update-email', '/change-password'] },
        ],
      },
    ],
  },
};

const ROLE_ALIASES = { consultant: 'Mentor', mentor: 'Mentor', admin: 'Admin', contentauthor: 'ContentAuthor', learner: 'Learner' };

export function navRoleFor(role) {
  return ROLE_ALIASES[String(role || '').toLowerCase()] || 'Learner';
}

function clean(path) {
  return (String(path || '').split('#')[0].split('?')[0].replace(/\/+$/, '') || '/');
}

function queryMatches(itemTo, search) {
  const q = String(itemTo).split('?')[1];
  if (!q) return true;
  const wanted = new URLSearchParams(q);
  const current = new URLSearchParams(search || '');
  return [...wanted.entries()].every(([k, v]) => current.get(k) === v);
}

function excludeMatches(item, search) {
  if (!item.excludeQuery) return false;
  const current = new URLSearchParams(search || '');
  return Object.entries(item.excludeQuery).some(([k, v]) => {
    const actual = current.get(k);
    return Array.isArray(v) ? v.includes(actual) : actual === v;
  });
}

/** Active-state matching shared by the sidebar and breadcrumbs. */
function isOwnNavItemActive(item, pathname, search = '') {
  if (excludeMatches(item, search)) return false;
  const current = clean(pathname);
  const target = clean(item.to);
  if (item.alsoMatch?.some((m) => clean(m) === current && queryMatches(m, search))) return true;
  if (current === target && queryMatches(item.to, search)) return true;
  if (item.alsoActive?.some((p) => clean(p) === current || current.startsWith(`${clean(p)}/`))) return true;
  if (item.prefix && target !== '/' && current.startsWith(`${target}/`)) return true;
  return false;
}

export function isNavItemActive(item, pathname, search = '') {
  if (isOwnNavItemActive(item, pathname, search)) return true;
  return Boolean(item.children?.some((child) => isNavItemActive(child, pathname, search)));
}

function findInNavBranch(items, pathname, search) {
  for (const item of items) {
    if (item.children?.length) {
      const nested = findInNavBranch(item.children, pathname, search);
      if (nested) return { item: nested.item, parents: [item, ...nested.parents] };
    }
    if (isOwnNavItemActive(item, pathname, search)) {
      return { item, parents: [] };
    }
  }
  return null;
}

/** Finds { group, parent, parents, item } for the current location, used to build breadcrumbs. */
export function findActiveNav(roleKey, pathname, search = '') {
  const nav = ROLE_NAV[roleKey];
  if (!nav) return null;
  for (const group of nav.groups) {
    const found = findInNavBranch(group.items, pathname, search);
    if (found) {
      return {
        group,
        parent: found.parents[0],
        parents: found.parents,
        item: found.item,
      };
    }
  }
  return null;
}

/** Breadcrumb trail: area home › group/parent › ... › item › page (page only when it adds information). */
export function buildBreadcrumbs(roleKey, pathname, search, pageLabel) {
  const nav = ROLE_NAV[roleKey];
  if (!nav) return [];
  const trail = [{ label: nav.area, to: nav.home }];
  const active = findActiveNav(roleKey, pathname, search);
  if (active && clean(active.item.to) !== clean(nav.home)) {
    const ancestors = active.parents || (active.parent ? [active.parent] : []);
    if (ancestors.length > 0) {
      for (const anc of ancestors) {
        trail.push({
          label: anc.label,
          to: clean(anc.to) === clean(pathname) ? undefined : anc.to,
          icon: anc.showIconInBreadcrumb ? anc.icon : undefined,
        });
      }
    } else if (active.group.label !== active.item.label) {
      trail.push({ label: active.group.label });
    }
    const lastAncestor = ancestors[ancestors.length - 1];
    if (!lastAncestor || lastAncestor.label !== active.item.label) {
      trail.push({
        label: active.item.label,
        to: clean(active.item.to) === clean(pathname) ? undefined : active.item.to,
        icon: active.item.showIconInBreadcrumb ? active.item.icon : undefined,
      });
    }
  }
  // The page's own label is only added on sub-pages (detail views); on a page the sidebar
  // already names, legacy per-page breadcrumb strings would just repeat or contradict it.
  // However, when a list route also hosts a query-based detail/result view (e.g. `?attemptId=`,
  // `?submissionId=`, `?id=`) with a distinct pageLabel, keep the list crumb clickable and append pageLabel.
  const searchParams = search ? new URLSearchParams(search) : null;
  const hasDetailQuery = Boolean(
    searchParams && (
      searchParams.get('attemptId')
      || searchParams.get('submissionId')
      || searchParams.get('id')
      || searchParams.get('lessonId')
      || searchParams.get('editId')
    ),
  );
  const onNavPage = active && clean(active.item.to) === clean(pathname);
  const last = trail[trail.length - 1];
  const isAliasFallback = pageLabel === 'Thi thử' && active?.item?.label === 'Thi thử JLPT';
  if (pageLabel && (!onNavPage || (hasDetailQuery && !isAliasFallback)) && pageLabel !== last.label) {
    if (onNavPage && active?.item?.to && last && !last.to) {
      last.to = active.item.to;
    }
    trail.push({ label: pageLabel });
  }
  return trail;
}

export function flattenNavItems(items = []) {
  return items.flatMap((item) => (item.children?.length ? [item, ...flattenNavItems(item.children)] : [item]));
}

export function allNavTargets() {
  return Object.values(ROLE_NAV).flatMap((nav) =>
    nav.groups.flatMap((g) => flattenNavItems(g.items).flatMap((i) => [i.to, ...(i.alsoMatch || [])])),
  );
}
