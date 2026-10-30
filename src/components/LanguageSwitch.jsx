import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/locale.js';

export default function LanguageSwitch({ className }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const options = [
    { id: 'vi', flag: '🇻🇳', label: t('langVi') },
    { id: 'ja', flag: '🇯🇵', label: t('langJa') },
  ];
  const current = options.find((item) => item.id === locale) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('langLabel')}
        className={className}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{current.flag} {locale === 'ja' ? 'JA' : 'VN'}</span>
        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={t('langLabel')} className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={locale === item.id}
                onClick={() => { setLocale(item.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold ${locale === item.id ? 'bg-[#fdf2f4] text-[#9E2A4B]' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <span aria-hidden="true">{item.flag}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
