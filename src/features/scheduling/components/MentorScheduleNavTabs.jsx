import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, CalendarClock, CalendarPlus } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const SCHEDULE_TABS = [
  { to: '/work-schedule/', label: 'Lịch làm việc', icon: CalendarCheck, match: '/work-schedule' },
  { to: '/mentor-shift-schedule/', label: 'Lịch tương tác 90 phút', icon: CalendarClock, match: '/mentor-shift-schedule' },
  { to: '/mentor-availability/', label: 'Lịch rảnh & Google Calendar', icon: CalendarPlus, match: '/mentor-availability' },
];

const STATUS_LEGEND = [
  { label: 'Chờ duyệt', dot: 'bg-amber-400' },
  { label: 'Đã duyệt · chưa công bố', dot: 'bg-sky-500' },
  { label: 'Đã công bố', dot: 'bg-emerald-500' },
  { label: 'Đã xếp lớp', dot: 'bg-rp-brand-pressed' },
  { label: 'Xung đột lịch', dot: 'bg-rose-600' },
];

export default function MentorScheduleNavTabs({ showLegend = true, className = '' }) {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const clean = pathname.replace(/\/+$/, '') || '/';

  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white px-3.5 py-2.5 shadow-rp-xs', className)}>
      <nav aria-label={tr('Điều hướng lịch dạy')} className="flex flex-wrap items-center gap-1.5">
        {SCHEDULE_TABS.map((tab) => {
          const active = clean === tab.match || clean.startsWith(`${tab.match}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cx(
                'rp-focus inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                active
                  ? 'bg-rp-brand-pressed text-white shadow-xs'
                  : 'text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong',
              )}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{tr(tab.label)}</span>
            </Link>
          );
        })}
      </nav>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-rp-text-muted">
          {STATUS_LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span>{tr(item.label)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
