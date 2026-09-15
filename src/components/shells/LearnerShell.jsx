import { NavLink } from 'react-router-dom';
import { getSession } from '../../auth/session.js';
import { displayName, learnerRoleLabel, useLearnerProfile } from '../../hooks/useLearnerHome.js';
import { LEARNER_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 260;

export default function LearnerShell({
  children,
  pathname,
  breadcrumb = 'Cổng học tập',
  searchPlaceholder = 'Tìm kiếm giáo trình, kanji, bài giảng...',
}) {
  const session = getSession();
  const profileQuery = useLearnerProfile();
  const userName = displayName(profileQuery.data, session);
  const userRole = learnerRoleLabel(profileQuery.data, session);
  const avatarUrl = profileQuery.data?.avatarUrl;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-md" data-shell="learner">
      <aside
        className="fixed left-0 top-0 z-50 flex h-screen flex-col justify-between overflow-y-auto bg-surface-container-lowest p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        style={{ width: SIDEBAR_W }}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container">
              <span className="material-symbols-outlined text-[24px] text-primary">local_florist</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
                {LEARNER_NAV.brand.title}
              </span>
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant">
                {LEARNER_NAV.brand.subtitle}
              </span>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {LEARNER_NAV.items.map((item) => {
              if (item.neverActive) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-body-md text-body-md text-on-surface-variant/70"
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              }
              const active = pathMatches(pathname, item);
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 font-body-md text-body-md transition-all',
                    active
                      ? 'bg-secondary-container font-semibold text-on-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-label-md text-label-md text-on-surface">
                {userName}
              </div>
              <div className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {userRole}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0" style={{ paddingLeft: SIDEBAR_W }}>
        <header
          className="fixed right-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-outline-variant/30 bg-surface/90 px-6 backdrop-blur-xl sm:px-8"
          style={{ left: SIDEBAR_W }}
        >
          <div className="hidden items-center gap-2 whitespace-nowrap font-body-sm text-body-sm text-on-surface-variant sm:flex">
            <span>Trang chủ</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-label-md text-label-md text-on-surface">{breadcrumb}</span>
          </div>
          <div className="mx-0 max-w-md flex-1 sm:mx-6">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                className="h-10 w-full rounded-lg bg-surface-container-lowest pl-10 pr-4 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container/30"
                placeholder={searchPlaceholder}
                type="text"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              aria-label="Thông báo"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          </div>
        </header>
        <main className="min-h-screen bg-surface pt-16">{children}</main>
      </div>
    </div>
  );
}
