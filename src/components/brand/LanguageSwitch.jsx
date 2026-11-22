import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { cx } from '@/components/ui';
import viFlag from '@/assets/flags/vi.svg';
import jaFlag from '@/assets/flags/ja.svg';

// Same flags and layout as RikiPath.Mobile `RikiLanguageSwitcher` (assets/flags/*.svg):
// pill trigger + 188px popover with "Ngôn ngữ / 言語" header, flag rows and a check on the active one.
const OPTIONS = [
  { id: 'vi', code: 'VI', flag: viFlag, labelKey: 'langVi' },
  { id: 'ja', code: 'JA', flag: jaFlag, labelKey: 'langJa' },
];

function Flag({ src }) {
  return (
    <span className="relative inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px]" aria-hidden="true">
      <img src={src} alt="" width="24" height="16" className="h-full w-full object-cover" draggable={false} />
      {/* Hairline drawn above the artwork so white flags (Japan) keep a visible edge, as on Mobile. */}
      <span className="pointer-events-none absolute inset-0 rounded-[2px] ring-1 ring-inset ring-black/15" />
    </span>
  );
}

/** `className` positions/hides the switcher (e.g. "hidden sm:block"); its look is owned here. */
export default function LanguageSwitch({ className }) {
  const { tr, locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const current = OPTIONS.find((o) => o.id === locale) || OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // Move focus to the active option for keyboard users.
    const raf = window.requestAnimationFrame(() => listRef.current?.querySelector('[aria-selected="true"]')?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.cancelAnimationFrame(raf);
    };
  }, [open]);

  function choose(id) {
    if (id !== locale) setLocale(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKeyDown(event) {
    const items = [...(listRef.current?.querySelectorAll('[role="option"]') || [])];
    const index = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  }

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${t('langLabel')}: ${t(current.labelKey)}`}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'rp-focus inline-flex h-9 items-center gap-2 rounded-[10px] border bg-rp-surface pl-2.5 pr-2 text-[13px] font-semibold text-rp-text shadow-rp-xs transition-[border-color,background-color,box-shadow] duration-150',
          open ? 'border-rp-brand-border bg-rp-brand-tint' : 'border-rp-line hover:border-rp-brand-border hover:bg-rp-brand-tint',
        )}
      >
        <Flag src={current.flag} />
        <span key={current.code} className="rp-anim-fade tabular-nums tracking-wide">{current.code}</span>
        <ChevronDown aria-hidden="true" className={cx('h-4 w-4 text-rp-text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="rp-lang-pop absolute right-0 top-[calc(100%+8px)] z-[95] w-[188px] origin-top-right rounded-rp-card border border-rp-line bg-rp-surface p-2 shadow-rp-pop"
        >
          <p className="flex items-center gap-2 px-2 pb-2 pt-1 text-xs font-semibold text-rp-text">
            <Globe aria-hidden="true" className="h-4 w-4 text-rp-brand" />
            {tr('Ngôn ngữ')}{' '}<span aria-hidden="true" className="text-rp-text-disabled">/</span> <span lang="ja">言語</span>
          </p>
          <div className="mb-1 h-px bg-rp-line" />
          <ul id={listId} ref={listRef} role="listbox" aria-label={t('langLabel')} onKeyDown={onListKeyDown} className="space-y-0.5">
            {OPTIONS.map((option) => {
              const selected = option.id === locale;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    lang={option.id}
                    onClick={() => choose(option.id)}
                    className={cx(
                      'rp-focus flex min-h-11 w-full items-center gap-2.5 rounded-rp-sm px-2 text-left text-[13.5px] transition-colors duration-150',
                      selected ? 'font-bold text-rp-brand-pressed' : 'font-medium text-rp-text hover:bg-rp-brand-tint',
                    )}
                  >
                    <Flag src={option.flag} />
                    <span className="min-w-0 flex-1 truncate">{t(option.labelKey)}</span>
                    {selected && <Check aria-hidden="true" className="h-[18px] w-[18px] text-rp-brand-pressed" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
