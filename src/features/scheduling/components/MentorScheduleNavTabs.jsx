import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, CalendarClock, CalendarPlus } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const SCHEDULE_TABS = [
  { to: '/work-schedule/', label: 'Lịch làm việc', icon: CalendarCheck, match: '/work-schedule' },
  { to: '/mentor-shift-schedule/', label: 'Đăng ký lịch dạy', icon: CalendarClock, match: '/mentor-shift-schedule' },
];

const STATUS_LEGEND = [
  { label: 'Chờ duyệt', dot: 'bg-[#E4A020]' },
  { label: 'Đã duyệt', dot: 'bg-[#0D9488]' },
  { label: 'Đã xếp lớp', dot: 'bg-[#CE476D]' },
  { label: 'Đã hoàn thành', dot: 'bg-[#16A34A]' },
  { label: 'Bị từ chối', dot: 'bg-[#DC3545]' },
  { label: 'Đã hủy', dot: 'bg-[#8B8B97]' },
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
