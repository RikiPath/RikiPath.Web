import { Link } from 'react-router-dom';
import { ArrowLeft, House } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared "back to the RikiPath home page" link (public landing at "/").
 * - `variant="pill"`  auth screens: arrow + label (label hidden on very narrow screens, kept for SR).
 * - `variant="icon"`  app top bar: compact house button with a visible tooltip-free label for SR.
 */
export default function BackHomeLink({ variant = 'pill', className }) {
  const { tr } = useLocale();
  if (variant === 'icon') {
    return (
      <Link
        to="/"
        aria-label={tr('Về trang chủ RikiPath')}
        title={tr('Về trang chủ RikiPath')}
        className={cx(
          'rp-focus rp-interactive rp-hc group hidden h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-rp-line bg-rp-surface/85 text-[13px] font-semibold text-rp-text-2 shadow-rp-xs transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/50 hover:text-rp-brand-strong sm:inline-flex xl:w-auto xl:px-2.5',
          className,
        )}
      >
        <House aria-hidden="true" className="h-4 w-4" />
        <span className="hidden xl:inline">{tr('Trang chủ')}</span>
      </Link>
    );
  }
  return (
    <Link
      to="/"
      className={cx(
        'rp-focus group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-semibold text-rp-text-2 transition-colors hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong',
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      <span className="max-[359px]:sr-only">{tr('Trang chủ')}</span>
    </Link>
  );
}
