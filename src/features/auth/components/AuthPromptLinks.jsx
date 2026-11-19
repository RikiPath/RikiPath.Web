import { Link } from 'react-router-dom';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Auth footer prompts: one centred line per action ("Question? Link"), no `·` separators.
 * Question and link each stay unbroken (`whitespace-nowrap`), so on narrow screens a line
 * wraps between the two clusters rather than mid-phrase.
 *
 * @param {{ items: Array<{ question: string, label: string, to: string }>, className?: string }} props
 */
export default function AuthPromptLinks({ items, className }) {
  const { tr } = useLocale();
  return (
    <nav aria-label={tr('Liên kết tài khoản')} className={cx('mt-6 border-t border-rp-line pt-5', className)}>
      <ul className="flex flex-col items-center gap-[11px] text-center text-sm leading-6">
        {items.map((item) => (
          <li key={item.to} className="flex flex-wrap items-baseline justify-center gap-x-1.5">
            <span className="whitespace-nowrap text-rp-text-2">{tr(item.question)}</span>
            <Link
              to={item.to}
              className="rp-focus rp-link whitespace-nowrap rounded-sm"
            >
              {tr(item.label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
