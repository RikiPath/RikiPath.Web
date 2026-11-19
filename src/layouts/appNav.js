// Role navigation for the unified AppShell. Every `to` must be a real route in
// App.jsx (enforced by test/app_nav_routes.test.js) — no dead links.
import {
  BadgeCheck,
  BookOpen,
  BookOpenText,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileQuestion,
  FolderUp,
  Gavel,
  GraduationCap,
  Headphones,
  History,
  Languages,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  Mic,
  NotebookPen,
  PenLine,
  Repeat,
  Settings,
  ShieldCheck,
  Sparkles,
  SpellCheck,
  Star,
  UserCog,
  UserRound,
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

export const ROLE_NAV = {
  Learner: {
    home: '/app',
    area: 'Học viên',
    groups: [
      {
        label: 'Tổng quan',
        items: [
          { to: '/app', label: 'Bảng học tập', icon: LayoutDashboard, tone: 'haru', end: true },
          { to: '/roadmap', label: 'Lộ trình JLPT', icon: JlptRoadmapIcon, tone: 'roadmap' },
          { to: '/placement', label: 'Đánh giá năng lực', icon: ClipboardCheck, tone: 'mock', prefix: true },
        ],
      },
      {
        label: 'Tự học',
        items: [
          { to: '/lessons', label: 'Bài học', icon: BookOpen, tone: 'lesson', alsoActive: ['/lesson-player', '/lesson-practice'] },
          { to: '/vocabulary', label: 'Từ vựng', icon: Languages, tone: 'vocabulary', alsoActive: ['/vocabulary-detail'] },
          { to: '/grammar', label: 'Ngữ pháp', icon: SpellCheck, tone: 'grammar' },
          { to: '/kanji-writing?type=kanji', label: 'Hán tự', icon: KanjiBrushIcon, tone: 'kanji' },
          { to: '/kanji-writing?type=hiragana', label: 'Kana', icon: KanaHiraganaIcon, tone: 'kana', alsoMatch: ['/kanji-writing?type=katakana'] },
          { to: '/daily-srs', label: 'Ôn tập SRS', icon: SrsLoopIcon, tone: 'srs' },
          { to: '/kanji-notebook', label: 'Sổ tay', icon: NotebookPen, tone: 'writing' },
        ],
      },
      {
        label: 'Luyện kỹ năng',
        items: [
          { to: '/riki/listening', label: 'Nghe hiểu', icon: Headphones, tone: 'listening' },
          { to: '/riki/reading', label: 'Đọc hiểu', icon: BookOpenText, tone: 'reading' },
          { to: '/riki/essay', label: 'Luyện viết', icon: PenLine, tone: 'writing', alsoActive: ['/sentence-studio', '/ai-scoring'] },
          { to: '/speech', label: 'Luyện nói', icon: Mic, tone: 'speaking', alsoActive: ['/riki/speaking'] },
          { to: '/mock-tests', label: 'Thi thử JLPT', icon: FileCheck2, tone: 'mock' },
          { to: '/exam-result', label: 'Lịch sử & kết quả', icon: History, tone: 'neutral' },
        ],
      },
      {
        label: 'Học nhóm',
        items: [
          { to: '/mentors', label: 'Tìm Mentor', icon: UsersRound, tone: 'mentor', prefix: true },
          { to: '/my-courses', label: 'Lớp học nhóm', icon: GroupClassIcon, tone: 'group' },
          { to: '/homework', label: 'Bài tập về nhà', icon: ClipboardList, tone: 'writing' },
        ],
      },
      {
        label: 'Hỗ trợ',
        items: [
          { to: '/ai-counselor', label: 'Haru AI', icon: Sparkles, tone: 'haru' },
          { to: '/plans', label: 'Gói tự học', icon: Layers, tone: 'neutral', alsoActive: ['/study-payment'] },
          { to: '/settings', label: 'Cài đặt', icon: Settings, tone: 'neutral' },
        ],
      },
    ],
  },
  Mentor: {
    home: '/mentor-overview',
    area: 'Mentor',
    groups: [
      {
        label: 'Tổng quan',
        items: [{ to: '/mentor-overview', label: 'Bảng điều khiển', icon: LayoutDashboard, tone: 'mentor' }],
      },
      {
        label: 'Lớp học',
        items: [
          { to: '/mentor-study-courses', label: 'Quản lý lớp nhóm', icon: GroupClassIcon, tone: 'group' },
          { to: '/mentor-homework', label: 'Bài tập & chấm điểm', icon: ClipboardList, tone: 'writing' },
          { to: '/mentor-grading', label: 'Chấm bài luyện tập', icon: ListChecks, tone: 'mock' },
        ],
      },
      {
        label: 'Lịch dạy',
        items: [
          { to: '/mentor-shift-schedule', label: 'Đăng ký lịch dạy', icon: CalendarDays, tone: 'calendar' },
          { to: '/mentor-availability', label: 'Lịch tuần', icon: CalendarCheck, tone: 'calendar', alsoActive: ['/work-schedule'] },
        ],
      },
      {
        label: 'Chất lượng',
        items: [
          { to: '/mentor-attendance-kpi', label: 'Điểm danh & KPI', icon: ChartNoAxesCombined, tone: 'reading' },
          { to: '/mentor-reviews', label: 'Đánh giá', icon: Star, tone: 'grammar' },
          { to: '/mentor-disputes', label: 'Khiếu nại', icon: Gavel, tone: 'neutral' },
        ],
      },
      {
        label: 'Tài khoản',
        items: [{ to: '/mentor-profile', label: 'Hồ sơ chuyên môn', icon: UserRound, tone: 'neutral' }],
      },
    ],
  },
  ContentAuthor: {
    home: '/cms-studio',
    area: 'Tác giả nội dung',
    groups: [
      {
        label: 'Tổng quan',
        items: [
          { to: '/cms-studio', label: 'Studio', icon: LayoutDashboard, tone: 'reading' },
          { to: '/author-dashboard', label: 'Nội dung của tôi', icon: ClipboardCheck, tone: 'reading' },
        ],
      },
      {
        label: 'Học liệu',
        items: [
          { to: '/lesson-cms', label: 'Bài học', icon: BookOpen, tone: 'lesson', alsoActive: ['/lesson-cms-detail'] },
          { to: '/content-manual', label: 'Soạn thủ công', icon: PenLine, tone: 'writing' },
          { to: '/content-plan', label: 'Soạn với AI', icon: Wand2, tone: 'haru' },
          { to: '/vocabulary-editor', label: 'Từ vựng', icon: Languages, tone: 'vocabulary' },
          { to: '/kanji-editor', label: 'Hán tự', icon: KanjiBrushIcon, tone: 'kanji' },
          { to: '/content-library', label: 'Ngữ pháp', icon: SpellCheck, tone: 'grammar' },
        ],
      },
      {
        label: 'Luyện thi',
        items: [
          { to: '/question-bank', label: 'Ngân hàng câu hỏi', icon: FileQuestion, tone: 'mock' },
          { to: '/exam-builder', label: 'Đề thi thử', icon: FileCheck2, tone: 'mock' },
        ],
      },
      {
        label: 'Nhập liệu',
        items: [{ to: '/bulk-import', label: 'Import Excel', icon: FolderUp, tone: 'neutral', alsoActive: ['/content-studio'] }],
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
          { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard, tone: 'neutral' },
          { to: '/admin/users', label: 'Người dùng & vai trò', icon: UserCog, tone: 'neutral', alsoActive: ['/admin/users/detail'] },
        ],
      },
      {
        label: 'Nội dung',
        items: [
          { to: '/admin/content-review', label: 'Duyệt nội dung', icon: ShieldCheck, tone: 'reading', alsoActive: ['/admin/approval-content'] },
          { to: '/admin/study-catalog', label: 'Cấu hình JLPT', icon: GraduationCap, tone: 'reading' },
          { to: '/admin/certificate-sections', label: 'Phần thi', icon: Library, tone: 'reading' },
        ],
      },
      {
        label: 'Học nhóm',
        items: [
          { to: '/admin/study-courses', label: 'Gói học, lớp & ghi danh', icon: GroupClassIcon, tone: 'group' },
          { to: '/admin/mentor-group-policy', label: 'Chính sách lớp nhóm', icon: ClipboardList, tone: 'mentor' },
          { to: '/admin/mentor-homework', label: 'Bài tập về nhà', icon: ClipboardCheck, tone: 'writing' },
        ],
      },
      {
        label: 'Mentor',
        items: [
          { to: '/admin/mentors', label: 'Hồ sơ Mentor', icon: UsersRound, tone: 'mentor', alsoActive: ['/admin/consultants'] },
          { to: '/admin/mentor-verifications', label: 'Xét duyệt hồ sơ', icon: BadgeCheck, tone: 'mentor' },
          { to: '/admin/mentor-qualifications', label: 'Phân quyền JLPT', icon: GraduationCap, tone: 'mentor' },
          { to: '/admin/mentor-schedules', label: 'Duyệt lịch dạy', icon: CalendarCheck, tone: 'calendar' },
          { to: '/admin/slot-review', label: 'Yêu cầu đổi/hủy lịch', icon: CalendarDays, tone: 'calendar' },
          { to: '/admin/mentor-template', label: 'Mẫu ca', icon: Repeat, tone: 'calendar' },
          { to: '/admin/mentor-quality', label: 'Điểm danh & KPI', icon: ChartNoAxesCombined, tone: 'reading' },
          { to: '/admin/mentor-cases', label: 'Ngoại lệ & khiếu nại', icon: Gavel, tone: 'neutral' },
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

/** Active-state matching shared by the sidebar and breadcrumbs. */
export function isNavItemActive(item, pathname, search = '') {
  const current = clean(pathname);
  const target = clean(item.to);
  if (item.alsoMatch?.some((m) => clean(m) === current && queryMatches(m, search))) return true;
  if (current === target && queryMatches(item.to, search)) return true;
  if (item.alsoActive?.some((p) => clean(p) === current || current.startsWith(`${clean(p)}/`))) return true;
  if (item.prefix && target !== '/' && current.startsWith(`${target}/`)) return true;
  return false;
}

/** Finds { group, item } for the current location, used to build breadcrumbs. */
export function findActiveNav(roleKey, pathname, search = '') {
  const nav = ROLE_NAV[roleKey];
  if (!nav) return null;
  for (const group of nav.groups) {
    for (const item of group.items) {
      if (isNavItemActive(item, pathname, search)) return { group, item };
    }
  }
  return null;
}

/** Breadcrumb trail: area home › group › item › page (page only when it adds information). */
export function buildBreadcrumbs(roleKey, pathname, search, pageLabel) {
  const nav = ROLE_NAV[roleKey];
  if (!nav) return [];
  const trail = [{ label: nav.area, to: nav.home }];
  const active = findActiveNav(roleKey, pathname, search);
  if (active && clean(active.item.to) !== clean(nav.home)) {
    trail.push({ label: active.group.label });
    trail.push({ label: active.item.label, to: clean(active.item.to) === clean(pathname) ? undefined : active.item.to });
  }
  // The page's own label is only added on sub-pages (detail views); on a page the sidebar
  // already names, legacy per-page breadcrumb strings would just repeat or contradict it.
  const onNavPage = active && clean(active.item.to) === clean(pathname);
  const last = trail[trail.length - 1];
  if (pageLabel && !onNavPage && pageLabel !== last.label) {
    trail.push({ label: pageLabel });
  }
  return trail;
}

export function allNavTargets() {
  return Object.values(ROLE_NAV).flatMap((nav) => nav.groups.flatMap((g) => g.items.flatMap((i) => [i.to, ...(i.alsoMatch || [])])));
}
