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
  Compass,
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
          { to: '/placement', label: 'Đánh giá năng lực', icon: ClipboardCheck, tone: 'mock', prefix: true },
        ],
      },
      {
        label: 'Lộ trình học JLPT',
        items: [
          { to: '/roadmap', label: 'Lộ trình của tôi', icon: JlptRoadmapIcon, tone: 'roadmap' },
          { to: '/lessons', label: 'Khám phá bài học', icon: BookOpen, tone: 'lesson', alsoActive: ['/lesson-player', '/lesson-practice'] },
        ],
      },
      {
        label: 'Thư viện tiếng Nhật',
        items: [
          { to: '/vocabulary', label: 'Kho từ vựng', icon: Languages, tone: 'vocabulary', alsoActive: ['/vocabulary-detail'] },
          { to: '/grammar', label: 'Ngữ pháp tiếng Nhật', icon: SpellCheck, tone: 'grammar' },
          { to: '/kanji-writing?type=kanji', label: 'Hán tự Kanji', icon: KanjiBrushIcon, tone: 'kanji' },
          { to: '/kanji-writing?type=hiragana', label: 'Bảng chữ Hiragana', icon: KanaHiraganaIcon, tone: 'kana' },
          { to: '/kanji-writing?type=katakana', label: 'Bảng chữ Katakana', icon: KanaHiraganaIcon, tone: 'kana' },
        ],
      },
      {
        label: 'Góc học tập của tôi',
        items: [
          { to: '/daily-srs', label: 'Ôn tập SRS', icon: SrsLoopIcon, tone: 'srs' },
          { to: '/kanji-notebook', label: 'Sổ tay cá nhân', icon: NotebookPen, tone: 'writing' },
        ],
      },
      {
        label: 'Luyện tập & Thi thử',
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
        label: 'Học cùng Giáo viên',
        items: [
          {
            id: 'group-learning',
            to: '/group-learning',
            label: 'Học cùng Giáo viên',
            icon: GroupClassIcon,
            tone: 'group',
            defaultOpen: true,
            children: [
              { to: '/group-learning', label: 'Tổng quan lớp học', icon: LayoutDashboard, tone: 'group' },
              { to: '/mentors', label: 'Tìm Giáo viên', icon: UsersRound, tone: 'mentor', prefix: true },
              { to: '/cohorts', label: 'Khám phá lớp học', icon: Compass, tone: 'group' },
              { to: '/my-courses', label: 'Lớp của tôi', icon: GroupClassIcon, tone: 'group', prefix: true },
              { to: '/calendar', label: 'Lịch học', icon: CalendarDays, tone: 'calendar' },
              { to: '/homework', label: 'Bài tập về nhà', icon: ClipboardList, tone: 'writing' },
              { to: '/group-learning/progress', label: 'Tiến độ học nhóm', icon: ChartNoAxesCombined, tone: 'present' },
            ],
          },
        ],
      },
      {
        label: 'Tiện ích & Tài khoản',
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
            id: 'mentor-classes',
            to: '/mentor-study-courses',
            label: 'Lớp học nhóm',
            icon: GroupClassIcon,
            tone: 'group',
            defaultOpen: true,
            children: [
              {
                to: '/mentor-study-courses',
                label: 'Lớp đang phụ trách',
                icon: GroupClassIcon,
                tone: 'group',
                prefix: true,
                alsoActive: ['/mentor/cohorts'],
                keywords: ['cohort', 'học viên', 'điểm danh'],
              },
              { to: '/mentor-homework', label: 'Bài tập & chấm điểm', icon: ClipboardList, tone: 'writing' },
              { to: '/mentor-grading', label: 'Chấm bài luyện tập', icon: ListChecks, tone: 'mock' },
            ],
          },
          {
            id: 'mentor-schedule',
            to: '/work-schedule',
            label: 'Lịch dạy & lịch rảnh',
            icon: CalendarCheck,
            tone: 'calendar',
            defaultOpen: true,
            children: [
              {
                to: '/work-schedule',
                label: 'Lịch làm việc',
                icon: CalendarCheck,
                tone: 'calendar',
                alsoActive: ['/mentor/schedule', '/mentor/bookings'],
                keywords: ['lịch tuần', 'google calendar'],
              },
              { to: '/mentor-shift-schedule', label: 'Đăng ký lịch dạy', icon: CalendarDays, tone: 'calendar' },
              { to: '/mentor-availability', label: 'Khung giờ rảnh & yêu cầu', icon: CalendarCheck, tone: 'calendar' },
            ],
          },
        ],
      },
      {
        label: 'Chất lượng & Hồ sơ',
        items: [
          {
            id: 'mentor-quality',
            to: '/mentor-attendance-kpi',
            label: 'Chất lượng & phản hồi',
            icon: ChartNoAxesCombined,
            tone: 'reading',
            defaultOpen: true,
            children: [
              { to: '/mentor-attendance-kpi', label: 'Điểm danh & KPI', icon: ChartNoAxesCombined, tone: 'reading' },
              { to: '/mentor-reviews', label: 'Đánh giá học viên', icon: Star, tone: 'grammar', alsoActive: ['/mentor/reviews'] },
              { to: '/mentor-disputes', label: 'Khiếu nại & hỗ trợ', icon: Gavel, tone: 'neutral', alsoActive: ['/mentor/complaints', '/mentor/disputes'] },
            ],
          },
          { to: '/mentor-profile', label: 'Hồ sơ chuyên môn', icon: UserRound, tone: 'neutral', alsoActive: ['/mentor/profile'] },
        ],
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
              { to: '/content-manual', label: 'Soạn thảo tổng hợp', icon: PenLine, tone: 'writing' },
              { to: '/lesson-cms', label: 'Bài học', icon: BookOpen, tone: 'lesson', alsoActive: ['/lesson-cms-detail'] },
              { to: '/exam-builder', label: 'Đề thi thử', icon: FileCheck2, tone: 'mock' },
              { to: '/content-plan', label: 'Soạn với AI', icon: Wand2, tone: 'haru' },
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
              { to: '/question-bank', label: 'Ngân hàng câu hỏi', icon: FileQuestion, tone: 'mock' },
            ],
          },
        ],
      },
      {
        label: 'Nhập liệu',
        items: [
          { to: '/bulk-import', label: 'Import Excel', icon: FolderUp, tone: 'neutral', alsoActive: ['/content-studio'], excludeQuery: { view: 'history' } },
          { to: '/bulk-import?view=history', label: 'Lịch sử lô nhập', icon: History, tone: 'neutral' },
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
          { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard, tone: 'neutral' },
          { to: '/admin/users', label: 'Người dùng & vai trò', icon: UserCog, tone: 'neutral', alsoActive: ['/admin/users/detail'] },
        ],
      },
      {
        label: 'Học cùng Giáo viên',
        items: [
          {
            id: 'admin-cohorts',
            to: '/admin/study-courses',
            label: 'Điều phối lớp học',
            icon: GroupClassIcon,
            tone: 'group',
            defaultOpen: true,
            children: [
              { to: '/admin/study-courses', label: 'Gói học, lớp & ghi danh', icon: GroupClassIcon, tone: 'group' },
              { to: '/admin/mentor-cases', label: 'Ngoại lệ & khiếu nại', icon: Gavel, tone: 'neutral' },
              { to: '/admin/mentor-group-policy', label: 'Chính sách lớp nhóm', icon: ClipboardList, tone: 'mentor' },
              { to: '/admin/mentor-homework', label: 'Bài tập về nhà', icon: ClipboardCheck, tone: 'writing' },
            ],
          },
        ],
      },
      {
        label: 'Giáo viên',
        items: [
          {
            id: 'admin-mentor-team',
            to: '/admin/mentors',
            label: 'Đội ngũ Giáo viên',
            icon: UsersRound,
            tone: 'mentor',
            defaultOpen: true,
            children: [
              { to: '/admin/mentors', label: 'Hồ sơ Giáo viên', icon: UsersRound, tone: 'mentor', alsoActive: ['/admin/consultants'] },
              { to: '/admin/mentor-verifications', label: 'Xét duyệt hồ sơ', icon: BadgeCheck, tone: 'mentor' },
              { to: '/admin/mentor-qualifications', label: 'Phân quyền JLPT', icon: GraduationCap, tone: 'mentor' },
            ],
          },
          {
            id: 'admin-mentor-ops',
            to: '/admin/mentor-schedules',
            label: 'Lịch dạy & chất lượng',
            icon: CalendarCheck,
            tone: 'calendar',
            defaultOpen: true,
            children: [
              { to: '/admin/mentor-schedules', label: 'Duyệt lịch dạy', icon: CalendarCheck, tone: 'calendar' },
              { to: '/admin/slot-review', label: 'Yêu cầu đổi/hủy lịch', icon: CalendarDays, tone: 'calendar' },
              { to: '/admin/mentor-template', label: 'Mẫu ca', icon: Repeat, tone: 'calendar' },
              { to: '/admin/mentor-quality', label: 'Điểm danh & KPI', icon: ChartNoAxesCombined, tone: 'reading' },
            ],
          },
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
  return Object.entries(item.excludeQuery).some(([k, v]) => current.get(k) === v);
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

/** Finds { group, parent, item } for the current location, used to build breadcrumbs. */
export function findActiveNav(roleKey, pathname, search = '') {
  const nav = ROLE_NAV[roleKey];
  if (!nav) return null;
  for (const group of nav.groups) {
    for (const item of group.items) {
      if (item.children?.length) {
        const child = item.children.find((sub) => isOwnNavItemActive(sub, pathname, search));
        if (child) return { group, parent: item, item: child };
      }
      if (isOwnNavItemActive(item, pathname, search)) return { group, item };
    }
  }
  return null;
}

/** Breadcrumb trail: area home › group/parent › item › page (page only when it adds information). */
export function buildBreadcrumbs(roleKey, pathname, search, pageLabel) {
  const nav = ROLE_NAV[roleKey];
  if (!nav) return [];
  const trail = [{ label: nav.area, to: nav.home }];
  const active = findActiveNav(roleKey, pathname, search);
  if (active && clean(active.item.to) !== clean(nav.home)) {
    if (active.parent) {
      trail.push({ label: active.parent.label, to: clean(active.parent.to) === clean(pathname) ? undefined : active.parent.to });
    } else if (active.group.label !== active.item.label) {
      trail.push({ label: active.group.label });
    }
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

export function flattenNavItems(items = []) {
  return items.flatMap((item) => (item.children?.length ? [item, ...flattenNavItems(item.children)] : [item]));
}

export function allNavTargets() {
  return Object.values(ROLE_NAV).flatMap((nav) =>
    nav.groups.flatMap((g) => flattenNavItems(g.items).flatMap((i) => [i.to, ...(i.alsoMatch || [])])),
  );
}
