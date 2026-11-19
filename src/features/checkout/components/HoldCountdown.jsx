import { Timer } from 'lucide-react';
import { useNow } from '@/hooks/useNow.js';
import { cx } from '@/components/ui';
import { formatCountdown, holdSecondsLeft } from '../utils/hold.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Live countdown for a cohort seat hold. When it reaches zero it does not declare the hold
 * expired by itself — the Backend decides (payment may still be confirming).
 */
export default function HoldCountdown({ expiresAt, className }) {
  const { tr } = useLocale();
  const now = useNow(1000);
  const left = holdSecondsLeft(expiresAt, now);
  if (left == null) return null;
  const urgent = left <= 120;
  return (
    <p className={cx('inline-flex items-center gap-2 text-sm font-semibold', urgent ? 'text-rp-danger' : 'text-rp-warning', className)} role="timer" aria-live="off">
      <Timer aria-hidden="true" className="h-4 w-4" />
      {left > 0 ? (
        <>{tr('Giữ chỗ còn')}{' '}<span className="tabular-nums">{formatCountdown(left)}</span></>
      ) : (
        <>{tr('Hết thời gian giữ chỗ — đang chờ máy chủ xác nhận trạng thái')}</>
      )}
    </p>
  );
}
