import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext.jsx';
import { CONSULT_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 248;
const HEADER_H = 64;
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function thisWeek() {
  const keyFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = keyFormat.format(new Date());
  const [year, month, day] = todayKey.split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
  }).format(noon);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  const monday = new Date(noon);
  monday.setUTCDate(noon.getUTCDate() - index);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + offset);
    const key = keyFormat.format(date);
    return {
      key,
      name: DAY_NAMES[offset],
      date: Number(key.slice(-2)),
      month: key.slice(5, 7),
      today: key === todayKey,
    };
  });
}

function navClass(active) {
  return [
    'group/nav flex w-full items-center gap-2.5',
    'rounded-lg px-2.5 py-1.5 text-left',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[#AD3155]/25',
    active
      ? 'bg-[#FADDE8] text-[#A12E50]'
      : 'text-[#826773] hover:bg-[#F7F1F3] hover:text-[#A24867]',
  ].join(' ');
}

function roleLabel(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'mentor' || value === 'consultant') return 'Mentor';
  if (value === 'admin') return 'Quản trị viên';
  return role || 'Mentor';
}

export default function ConsultShell({ children, pathname, breadcrumb = 'Mentor' }) {
  const location = useLocation();
  const currentPath = pathname || location.pathname;
  const { user, primaryRole, logout } = useAuth();

  const displayName =
    user?.fullName || user?.name || user?.email || CONSULT_NAV.user.name;
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M';
  const week = thisWeek();
  const today = week.find((day) => day.today) || week[0];

  return (
    <div
      data-shell="consult"
      className="min-h-screen bg-[#FAF8F7]
                 font-['Nunito',sans-serif] text-[#3F3038]"
    >
      <aside
        aria-label="Điều hướng mentor"
        style={{ width: SIDEBAR_W }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden
                   border-r border-[#E8DFDC] bg-[#FAF8F7]"
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
          <span
            className="flex h-9 w-9 items-center justify-center
                       rounded-xl bg-[#AD3155] text-white"
          >
            <span className="material-symbols-outlined text-[22px]">
              support_agent
            </span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[16px] font-medium">
              {CONSULT_NAV.brand.title}
            </span>
            <span className="mt-0.5 block text-[10px] text-[#AA8F9B]">
              Cổng mentor
            </span>
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <nav
          aria-label="Menu chính"
          className="shrink-0 px-2.5 pb-2"
        >
          {CONSULT_NAV.groups.map((group) => (
            <div key={group.label} className="mb-2.5">
              <div
                className="mb-1 px-2.5 text-[10px] font-medium
                           tracking-[0.08em] text-[#B18F9E]"
              >
                {group.label.toUpperCase()}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathMatches(currentPath, item);
                  return (
                    <NavLink
                      key={`${group.label}-${item.to}-${item.label}`}
                      to={item.to}
                      className={navClass(active)}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'material-symbols-outlined text-[19px]',
                          active ? 'text-[#AD3155]' : 'text-[#B18B9B]',
                        ].join(' ')}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[13px] ${active ? 'font-medium' : ''}`}>
                          {item.label}
                        </span>
                        {item.hint ? (
                          <span className={`block truncate text-[10px] ${active ? 'text-[#C46B86]' : 'text-[#B39AA6]'}`}>
                            {item.hint}
                          </span>
                        ) : null}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          <Link
            to="/work-schedule"
            aria-label={`Tuần này ${today.date}/${today.month}, mở lịch làm việc`}
            className="flex min-h-[168px] flex-1 flex-col rounded-2xl
                       border border-[#F0D3DE] bg-[#F8E4EC] p-3
                       transition-colors hover:bg-[#F6DCE7]
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#AD3155]/25"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium tracking-[0.04em] text-[#AD3155]">
                Tuần này
              </span>
              <span className="text-[10px] text-[#B07A8C]">
                {week[0].date}/{week[0].month} – {week[6].date}/{week[6].month}
              </span>
            </span>
            <span className="mt-2.5 grid grid-cols-7 gap-1">
              {week.map((day) => (
                <span
                  key={day.key}
                  className={[
                    'flex flex-col items-center rounded-lg py-1',
                    day.today ? 'bg-[#AD3155] text-white' : 'bg-white/70 text-[#8A6B78]',
                  ].join(' ')}
                >
                  <span className="text-[9px] leading-none">{day.name}</span>
                  <span className="mt-1 text-[11px] font-medium leading-none">{day.date}</span>
                </span>
              ))}
            </span>
            <span className="flex min-h-0 flex-1 items-center">
              <span
                aria-hidden="true"
                className="font-['Noto_Serif_JP',serif] text-[64px]
                           leading-none text-[#AD3155]/20"
              >
                {String(today.date).padStart(2, '0')}
              </span>
            </span>
            <span className="pt-2 text-[10px] text-[#B07A8C]">
              Hôm nay · giờ Việt Nam
            </span>
          </Link>
        </div>
        </div>

        <div className="shrink-0 border-t border-[#E8DFDC] px-3 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center
                         justify-center rounded-full bg-[#F8DFE9]
                         text-[12px] font-medium text-[#AD3155]"
            >
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#AA8F9B]">
                {roleLabel(primaryRole || user?.role)}
              </span>
            </span>
            <button
              type="button"
              onClick={logout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="flex h-8 w-8 items-center justify-center
                         rounded-lg text-[#B18B9B] hover:bg-[#FADDE8]
                         hover:text-[#AD3155]"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0" style={{ paddingLeft: SIDEBAR_W }}>
        <header
          style={{ left: SIDEBAR_W, height: HEADER_H }}
          className="fixed right-0 top-0 z-40 flex items-center
                     border-b border-[#E8DFDC] bg-[#FAF8F7] px-6"
        >
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#AA98A1]">
            <span>Mentor</span>
            <span className="material-symbols-outlined text-[16px] text-[#C9B8C0]">
              chevron_right
            </span>
            <span className="truncate text-[#826A76]">{breadcrumb}</span>
          </div>
        </header>
        <main className="min-h-screen" style={{ paddingTop: HEADER_H }}>
          {children}
        </main>
      </div>
    </div>
  );
}
