import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext.jsx';
import { getSession } from '../../auth/session.js';
import LanguageSwitch from '../LanguageSwitch.jsx';
import { useLocale } from '../../i18n/locale.js';
import {
  displayName,
  learnerRoleLabel,
  useLearnerProfile,
} from '../../hooks/useLearnerHome.js';

import { LEARNER_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 216;
const HEADER_H = 64;
const STORAGE_KEY = 'rikipath.learnerMenuGroups.v2';

const MAIN_ITEMS = [
  {
    to: '/app',
    label: 'Bảng điều khiển',
    icon: 'home',
    end: true,
  },
  {
    to: '/roadmap',
    label: 'Lộ trình ôn luyện',
    icon: 'alt_route',
  },
];

const MENU_GROUPS = [
  {
    id: 'practice',
    label: 'Ôn luyện JLPT',
    icon: 'edit_square',
    items: [
      {
        to: '/lessons',
        label: 'Bài luyện tập',
        icon: 'menu_book',
      },
      {
        to: '/exam-n3',
        label: 'Thi thử ',
        icon: 'quiz',
      },
      {
        to: '/riki/listening',
        label: 'Nghe hiểu',
        icon: 'headphones',
      },
      {
        to: '/riki/reading',
        label: 'Đọc hiểu',
        icon: 'auto_stories',
      },
      {
        to: '/riki/essay',
        label: 'Luyện viết',
        icon: 'edit_note',
      },
      {
        to: '/speech',
        label: 'Luyện nói',
        icon: 'mic',
        alsoActive: ['/riki/speaking'],
      },
    ],
  },
  {
    id: 'knowledge',
    label: 'Kho kiến thức',
    icon: 'local_library',
    items: [
      {
        to: '/vocabulary',
        label: 'Từ vựng',
        icon: 'translate',
        alsoActive: ['/vocabulary-detail'],
      },
      {
        to: '/kanji-writing?type=kanji',
        label: 'Hán tự',
        icon: 'draw',
      },
      {
        to: '/kanji-writing?type=hiragana',
        label: 'Hiragana',
        symbol: 'あ',
      },
      {
        to: '/kanji-writing?type=katakana',
        label: 'Katakana',
        symbol: 'ア',
      },
    ],
  },
  {
    id: 'review',
    label: 'Ôn tập & kết quả',
    icon: 'history',
    items: [
      {
        to: '/daily-srs',
        label: 'Ôn tập đến hạn',
        icon: 'history',
      },
      {
        to: '/kanji-notebook',
        label: 'Sổ tay cá nhân',
        icon: 'bookmarks',
      },
      {
        to: '/exam-result',
        label: 'Kết quả thi',
        icon: 'fact_check',
      },
    ],
  },
  {
    id: 'support',
    label: 'Hỗ trợ',
    icon: 'forum',
    items: [
      { to: '/payments', label: 'Thanh toán', icon: 'payments', alsoActive: ['/payments/history', '/consultation-payment', '/consultation-receipt', '/payment/success', '/payment/cancel'] },
      {
        to: '/ai-counselor',
        label: 'Trợ lý Haru',
        icon: 'psychology',
      },
      {
        to: '/mentor',
        label: 'Tư vấn Mentor',
        icon: 'support_agent',
        alsoActive: [
          '/booking-schedule',

          '/consultation-center',
          '/consultation-session',

          '/consultation-room',
        ],
      },
      {
        to: '/mentor-chat',
        label: 'Tin nhắn',
        icon: 'forum',
      },
    ],
  },
];

const ACCOUNT_ITEMS = [
  {
    to: '/settings',
    label: 'Tài khoản của tôi',
    icon: 'account_circle',
  },
  {
    to: '/exam-result',
    label: 'Kết quả ôn luyện',
    icon: 'monitoring',
  },
  {
    to: '/onboarding',
    label: 'Mục tiêu ôn luyện',
    icon: 'flag',
  },
];

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

function itemActive(pathname, search, item) {
  const [path, query] = item.to.split('?');

  if (!pathMatches(pathname, { ...item, to: path })) {
    return false;
  }

  if (!query) return true;

  const wanted = new URLSearchParams(query);
  const current = new URLSearchParams(search);

  return [...wanted.entries()].every(
    ([key, value]) => current.get(key) === value,
  );
}

function groupForPath(pathname, search) {
  return MENU_GROUPS.find((group) =>
    group.items.some((item) => itemActive(pathname, search, item)),
  )?.id;
}

function MenuRow({ item, active }) {
  const { tr } = useLocale();
  const label = tr(item.label);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={[
        'group flex min-h-[32px] items-center gap-2',
        'rounded-lg px-2 text-[13px]',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#AD3155]/25',
        active
          ? 'bg-[#FADDE8] font-medium text-[#A12E50]'
          : 'text-[#826773] hover:bg-[#FCE7EF] hover:text-[#A24867]',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center',
          active
            ? 'text-[#AD3155]'
            : 'text-[#B18B9B] group-hover:text-[#B26582]',
        ].join(' ')}
      >
        {item.symbol ? (
          <span className="text-[16px] font-medium">
            {item.symbol}
          </span>
        ) : (
          <Icon name={item.icon} className="text-[19px]" />
        )}
      </span>

      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>

      {active && (
        <span
          aria-hidden="true"
          className="h-1 w-1 shrink-0 rounded-full bg-[#C57792]"
        />
      )}
    </NavLink>
  );
}

export default function LearnerShell({
  children,
  pathname,
  breadcrumb = 'Tổng quan',
  searchPlaceholder = 'Tìm bài luyện, từ vựng...',
  searchValue,
  onSearchChange,
}) {
  const location = useLocation();
  const currentPath = pathname || location.pathname;

  const { logout } = useAuth();
  const { locale, tr } = useLocale();
  const session = getSession();
  const profileQuery = useLearnerProfile();

  const userName =
    displayName(profileQuery.data, session) || tr('Người dùng');

  const rawRole = learnerRoleLabel(profileQuery.data, session);
  const userRole = locale === 'ja' ? rawRole.replace(/^Học viên/, tr('Học viên')) : rawRole;
  const initial = userName.trim().charAt(0).toUpperCase() || 'R';

  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState(() => {
    let saved = {};

    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}',
      );

      if (
        stored &&
        typeof stored === 'object' &&
        !Array.isArray(stored)
      ) {
        saved = stored;
      }
    } catch {
      // Dùng trạng thái mặc định nếu không đọc được dữ liệu đã lưu.
    }

    const activeGroup = groupForPath(
      currentPath,
      location.search,
    );

    return {
      practice: true,
      knowledge: false,
      review: false,
      support: false,
      ...saved,
      ...(activeGroup ? { [activeGroup]: true } : {}),
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(openGroups),
      );
    } catch {
      // Menu vẫn hoạt động khi trình duyệt chặn localStorage.
    }
  }, [openGroups]);

  useEffect(() => {
    setAccountOpen(false);

    const activeGroup = groupForPath(
      currentPath,
      location.search,
    );

    if (activeGroup) {
      setOpenGroups((current) =>
        current[activeGroup]
          ? current
          : { ...current, [activeGroup]: true },
      );
    }
  }, [currentPath, location.search]);

  useEffect(() => {
    if (!accountOpen) return undefined;

    function closeOutside(event) {
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  function toggleGroup(id) {
    setOpenGroups((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  return (
    <div
      data-shell="learner"
      className="min-h-screen bg-[#FAF8F7]
                 font-['Nunito',sans-serif]
                 text-[#3F3038]"
    >
      {/* Thanh trên cùng */}
      <header
        style={{ height: HEADER_H }}
        className="fixed inset-x-0 top-0 z-50 flex items-center
                   justify-between gap-5 border-b border-[#E8DFDC]
                   bg-[#FAF8F7] px-5"
      >
        <NavLink
          to="/app"
          className="flex shrink-0 items-center gap-2.5 rounded-lg
                     focus-visible:outline-none
                     focus-visible:ring-2
                     focus-visible:ring-[#AD3155]/30"
        >
          <span
            className="flex h-9 w-9 items-center justify-center
                       rounded-xl bg-[#AD3155] text-white"
          >
            <Icon name="spa" className="text-[22px]" />
          </span>

          <span className="leading-tight">
            <span
              className="block text-[17px] font-medium
                         tracking-normal"
            >
              {LEARNER_NAV.brand.title}
            </span>

            <span
              className="mt-0.5 block text-[10px]
                         text-[#AA8F9B]"
            >
              {tr('Ôn luyện tiếng Nhật')}
            </span>
          </span>
        </NavLink>

        <div
          className="hidden min-w-0 flex-1 items-center
                     gap-2 md:flex"
        >
          <span className="text-[12px] text-[#AA98A1]">
            {tr('Ôn luyện')}
          </span>

          <Icon
            name="chevron_right"
            className="text-[16px] text-[#C9B8C0]"
          />

          <span className="truncate text-[12px] text-[#826A76]">
            {tr(breadcrumb)}
          </span>
        </div>

        {typeof onSearchChange === 'function' && (
          <label className="relative hidden w-[280px] lg:block">
            <span className="sr-only">
              {tr(searchPlaceholder)}
            </span>

            <Icon
              name="search"
              className="pointer-events-none absolute left-3
                         top-1/2 -translate-y-1/2
                         text-[18px] text-[#B29DA7]"
            />

            <input
              type="search"
              placeholder={tr(searchPlaceholder)}
              value={searchValue ?? ''}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              className="h-9 w-full rounded-[10px] border
                         border-[#EEDFE6] bg-white
                         pl-9 pr-3 text-[12px] outline-none
                         placeholder:text-[#B29DA7]
                         focus:border-[#D6A2B5]
                         focus:ring-2 focus:ring-[#AD3155]/10"
            />
          </label>
        )}

        <LanguageSwitch className="inline-flex items-center gap-1 rounded-lg border border-[#EEDCE5] bg-white px-2.5 py-1 text-[12px] font-medium text-[#826A76] hover:bg-[#FCE7EF]" />
        {/* Tài khoản */}
        <div ref={accountRef} className="relative shrink-0">
          <button
            ref={accountButtonRef}
            type="button"
            aria-expanded={accountOpen}
            aria-controls="learner-account-panel"
            aria-label={`${tr('Tài khoản')} ${userName}`}
            onClick={() =>
              setAccountOpen((current) => !current)
            }
            className="flex items-center gap-2 rounded-lg
                       px-2 py-1 hover:bg-[#FCE7EF]
                       focus-visible:outline-none
                       focus-visible:ring-2
                       focus-visible:ring-[#AD3155]/25"
          >
            <span className="hidden text-right sm:block">
              <span
                className="block max-w-[150px] truncate
                           text-[12px] font-medium"
              >
                {userName}
              </span>

              <span
                className="mt-0.5 block text-[10px]
                           text-[#AA8F9B]"
              >
                {userRole}
              </span>
            </span>

            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center
                         rounded-full bg-[#F8DFE9]
                         text-[12px] font-medium text-[#AD3155]"
            >
              {initial}
            </span>

            <Icon
              name={accountOpen ? 'expand_less' : 'expand_more'}
              className="text-[17px] text-[#B29DA7]"
            />
          </button>

          {accountOpen && (
            <div
              id="learner-account-panel"
              className="absolute right-0 top-[calc(100%+12px)]
                         w-[250px] overflow-hidden rounded-xl
                         border border-[#EEDCE5] bg-white
                         shadow-[0_12px_32px_rgba(75,42,55,0.10)]"
            >
              <div
                className="border-b border-[#F1E8ED]
                           bg-[#FFF7FA] px-4 py-3"
              >
                <p className="truncate text-[13px] font-medium">
                  {userName}
                </p>

                <p className="mt-1 text-[11px] text-[#AA8F9B]">
                  {userRole}
                </p>
              </div>

              <nav
                aria-label={tr('Tài khoản')}
                className="space-y-0.5 p-2"
              >
                {ACCOUNT_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5
                               rounded-lg px-2.5 py-2.5
                               text-[12px] text-[#826A76]
                               hover:bg-[#FFF1F6]"
                  >
                    <Icon
                      name={item.icon}
                      className="text-[18px] text-[#AC8E9B]"
                    />
                    {tr(item.label)}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-[#F1E8ED] p-2">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5
                             rounded-lg px-2.5 py-2.5 text-left
                             text-[12px] text-[#AD3155]
                             hover:bg-[#FCEDF3]"
                >
                  <Icon
                    name="logout"
                    className="text-[18px]"
                  />
                  {tr('Đăng xuất')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <aside
        aria-label={tr('Điều hướng ôn luyện')}
        style={{
          width: SIDEBAR_W,
          top: HEADER_H,
        }}
        className="fixed bottom-0 left-0 z-40 flex flex-col
                   border-r border-[#E8DFDC] bg-[#FAF8F7]"
      >
        <nav
          aria-label={tr('Menu chính')}
          className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3"
        >
          <div
            className="mb-2 px-2.5 text-[10px] font-medium
                       tracking-[0.08em] text-[#B18F9E]"
          >
            {tr('TỔNG QUAN')}
          </div>

          <div className="space-y-1">
            {MAIN_ITEMS.map((item) => (
              <MenuRow
                key={item.to}
                item={item}
                active={itemActive(
                  currentPath,
                  location.search,
                  item,
                )}
              />
            ))}
          </div>

          <div className="mt-3 space-y-0.5">
            {MENU_GROUPS.map((group) => {
              const open = Boolean(openGroups[group.id]);

              const active = group.items.some((item) =>
                itemActive(
                  currentPath,
                  location.search,
                  item,
                ),
              );

              return (
                <div key={group.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`learner-group-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                    className={[
                      'flex min-h-[34px] w-full items-center',
                      'gap-2 rounded-lg px-2 text-left',
                      'text-[12px] font-normal',
                      'transition-colors hover:bg-[#FCE7EF]',
                      'focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-[#AD3155]/25',
                      active
                        ? 'text-[#A24867]'
                        : 'text-[#8A727E]',
                    ].join(' ')}
                  >
                    <Icon
                      name={group.icon}
                      className={`text-[19px] ${
                        active
                          ? 'text-[#B05D7A]'
                          : 'text-[#B18B9B]'
                      }`}
                    />

                    <span className="flex-1">
                      {tr(group.label)}
                    </span>

                    <Icon
                      name="expand_more"
                      className={[
                        'text-[17px] text-[#B99AA8]',
                        'transition-transform duration-150',
                        open ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </button>

                  {open && (
                    <div
                      id={`learner-group-${group.id}`}
                      className="mb-1 ml-[18px] mt-0.5
                                 space-y-0.5 border-l
                                 border-[#E6D9D4] pl-1.5"
                    >
                      {group.items.map((item) => (
                        <MenuRow
                          key={item.to}
                          item={item}
                          active={itemActive(
                            currentPath,
                            location.search,
                            item,
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Cài đặt cố định ở đáy */}
        <div
          className="shrink-0 border-t border-[#E8DFDC]
                     px-2.5 py-2"
        >
          <MenuRow
            item={{
              to: '/settings',
              label: 'Cài đặt tài khoản',
              icon: 'settings',
            }}
            active={itemActive(
              currentPath,
              location.search,
              { to: '/settings' },
            )}
          />
        </div>
      </aside>

      {/* Nội dung trang */}
      <div
        style={{ paddingLeft: SIDEBAR_W }}
        className="min-w-0"
      >
        <div
          style={{ paddingTop: HEADER_H }}
          className="min-h-screen"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
