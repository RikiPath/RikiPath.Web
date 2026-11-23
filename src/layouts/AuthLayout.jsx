import { Link } from 'react-router-dom';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import BackHomeLink from '@/components/brand/BackHomeLink.jsx';
import AuthScenicCarousel from '@/features/auth/components/AuthScenicCarousel.jsx';
import SakuraPetalBackground from '@/features/auth/components/SakuraPetalBackground.jsx';
import { useLocale } from '@/locales/locale.js';

/**
 * Floating auth card (Web editorial): scenic slideshow + form, with per-screen column ratios
 * (`variant`: login | register | verify). Brand lives in the form header, not on the photo.
 * The card centres when there is room and falls back to top-aligned scrolling when content is long.
 */
export default function AuthLayout({ variant = 'login', title, subtitle, children, footer }) {
  const { tr } = useLocale();
  return (
    <div className="relative isolate flex min-h-dvh flex-col px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <SakuraPetalBackground />

      <div
        data-variant={variant}
        className="rp-auth-card rp-card-enter relative m-auto w-full max-w-[1360px] overflow-hidden rounded-[28px] border border-[#F0E2E5] bg-[#FFFDFC] shadow-[0_30px_80px_-30px_rgba(120,40,70,0.28),0_2px_8px_rgba(45,40,42,0.04)]"
      >
        {/* Desktop: slideshow column (adapts cleanly to low viewport heights & zoom) */}
        <AuthScenicCarousel className="hidden lg:m-2 lg:block lg:min-h-[clamp(480px,72dvh,640px)] lg:rounded-[28px]" />

        {/* Form column */}
        <main className="flex min-w-0 flex-col p-[clamp(1.25rem,3vw,2.75rem)]">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="rp-focus flex min-w-0 items-center gap-2.5 rounded-lg" aria-label={tr('RikiPath — Trang chủ')}>
              <BrandMark className="h-9 w-11 shrink-0 sm:h-10 sm:w-12" />
              <span className="truncate bg-gradient-to-r from-[#C24362] to-[#D9627F] bg-clip-text pb-0.5 text-[20px] font-bold tracking-[-0.025em] text-transparent sm:text-[22px]">RikiPath</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <BackHomeLink />
              <LanguageSwitch />
            </div>
          </header>

          {/* Mobile/tablet: compact scenic slideshow strip */}
          <AuthScenicCarousel compact className="mt-4 h-32 rounded-2xl sm:h-40 lg:hidden" />

          <div className="flex flex-1 flex-col justify-center py-[clamp(1rem,2vw,1.75rem)]">
            {title && <h1 className="rp-type-page-title text-rp-text">{tr(title)}</h1>}
            {subtitle && <p className="rp-type-body mt-1.5 text-rp-text-2">{tr(subtitle)}</p>}
            <div className={title || subtitle ? 'mt-5' : ''}>{children}</div>
          </div>

          {footer && <div className="border-t border-rp-line pt-4 text-center rp-type-caption text-rp-text-muted">{footer}</div>}
        </main>
      </div>
    </div>
  );
}
