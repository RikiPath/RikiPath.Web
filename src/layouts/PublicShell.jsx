import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Menu, UserPlus } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import { useLocale } from '@/locales/locale.js';
import { useAuth } from '@/app/auth/authContext.js';
import { homeForRole } from '@/app/routes/routeTable.js';
import { Drawer, IconButton, cx } from '@/components/ui';
import { MARKETING_NAV } from './navConfig.js';

const SCROLL_THRESHOLD = 8;
const SECTION_IDS = MARKETING_NAV.links.map((item) => item.id).filter(Boolean);

function hashToSectionId(hash) {
  if (!hash) return '';
  const id = decodeURIComponent(hash.slice(1));
  return SECTION_IDS.includes(id) ? id : '';
}

/** True once the page is scrolled past a few px. Updates state only when the boolean flips. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > SCROLL_THRESHOLD);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return scrolled;
}

/** Tracks active Homepage section via IntersectionObserver + scroll position without effect setState cascades. */
function useActiveSection(pathname, hash) {
  const [observed, setObserved] = useState({ path: '', id: '' });

  useEffect(() => {
    if (pathname !== '/' || typeof IntersectionObserver === 'undefined') return undefined;

    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const ratios = new Map();
    const syncActive = () => {
      if (window.scrollY < 140 && !window.location.hash) {
        setObserved((prev) => (prev.path === '/' && prev.id === '' ? prev : { path: '/', id: '' }));
        return;
      }
      let bestId = '';
      let bestRatio = 0;
      for (const id of SECTION_IDS) {
        const ratio = ratios.get(id) || 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId) {
        setObserved((prev) => (prev.path === '/' && prev.id === bestId ? prev : { path: '/', id: bestId }));
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        syncActive();
      },
      { rootMargin: '-20% 0px -52% 0px', threshold: [0, 0.15, 0.35, 0.6] },
    );

    elements.forEach((el) => observer.observe(el));

    const onScroll = () => {
      if (window.scrollY < 140) {
        setObserved((prev) => (prev.path === '/' && prev.id === '' ? prev : { path: '/', id: '' }));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  const activeId = pathname === '/'
    ? (observed.path === '/' ? observed.id : hashToSectionId(hash))
    : '';
  const selectActive = useCallback((id) => setObserved({ path: '/', id }), []);

  return [activeId, selectActive];
}

function NavItems({ activeId, onNavigate, vertical = false }) {
  const { tr } = useLocale();
  return MARKETING_NAV.links.map((link) => {
    const active = Boolean(link.id && activeId === link.id);
    return (
      <Link
        key={link.id || link.to}
        to={link.to}
        aria-current={active ? 'location' : undefined}
        onClick={(event) => onNavigate?.(event, link)}
        className={cx(
          'rp-focus whitespace-nowrap rounded-lg text-[14px] font-medium transition-colors duration-150',
          vertical
            ? cx('block px-3 py-2.5 hover:bg-rp-muted', active ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong' : 'text-rp-text-2')
            : cx('rp-nav-link relative px-1.5 py-1.5', active ? 'is-active font-semibold text-rp-brand-strong' : 'text-rp-text-2 hover:text-rp-brand-strong'),
        )}
      >
        {tr(link.label)}
      </Link>
    );
  });
}

const FOOTER_COLUMNS = [
  {
    title: 'Học tiếng Nhật',
    links: [
      { to: '/#roadmap', label: 'Lộ trình JLPT N5–N2' },
      { to: '/courses', label: 'Luyện thi JLPT' },
      { to: '/thi-thu', label: 'Thi thử' },
      { to: '/feature/srs', label: 'Ôn tập SRS' },
    ],
  },
  {
    title: 'Học cùng người thật',
    links: [
      { to: '/#group-learning', label: 'Học nhóm cùng Giáo viên' },
      { to: '/about', label: 'RikiPath là gì?' },
      { to: '/#faq', label: 'Câu hỏi thường gặp' },
    ],
  },
  {
    title: 'Tài khoản',
    links: [
      { to: '/auth', label: 'Đăng nhập' },
      { to: '/register', label: 'Đăng ký' },
      { to: '/verify-email', label: 'Xác thực email' },
    ],
  },
];

export default function PublicShell({ children }) {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const { tr } = useLocale();
  const { isAuthenticated, primaryRole } = useAuth();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const [activeId, selectActive] = useActiveSection(pathname, hash);

  const handleNavClick = useCallback((event, link) => {
    setOpen(false);
    if (pathname === '/' && link?.id) {
      event.preventDefault();
      selectActive(link.id);
      const target = document.getElementById(link.id);
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      if (window.location.hash !== `#${link.id}`) {
        navigate(`/#${link.id}`, { replace: true });
      }
    }
  }, [navigate, pathname, selectActive]);

  const handleLogoClick = useCallback((event) => {
    if (pathname === '/') {
      event.preventDefault();
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      if (window.location.hash) navigate('/', { replace: true });
      selectActive('');
    }
  }, [navigate, pathname, selectActive]);

  return (
    <div className="min-h-dvh bg-rp-bg-2 text-rp-text" data-shell="marketing">
      <a href="#rp-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold">{tr('Bỏ qua điều hướng')}</a>
      {/* Fixed height in both states (no layout shift); only background/border/shadow change on scroll. */}
      <header
        data-scrolled={scrolled || undefined}
        className={cx(
          'rp-public-header sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300',
          scrolled ? 'border-rp-line/80 bg-white/95 shadow-[0_10px_30px_-18px_rgba(90,30,55,0.25)] backdrop-blur-xl' : 'border-transparent bg-white/65 backdrop-blur-md',
        )}
      >
        <div className="mx-auto flex h-[var(--spacing-rp-topbar)] max-w-[1280px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-[var(--rp-space-page-x)]">
          <Link to="/" onClick={handleLogoClick} className="rp-focus group flex shrink-0 items-center gap-1.5 rounded-lg sm:gap-2.5" aria-label={`RikiPath — ${tr('Trang chủ')}`}>
            <BrandMark className="h-8 w-9 shrink-0 transition-transform duration-300 group-hover:-rotate-3 sm:h-10 sm:w-14" />
            <span className="leading-tight">
              <span className="block whitespace-nowrap text-[14.5px] font-extrabold tracking-[-0.02em] sm:text-[16px]">Riki<span className="text-rp-brand">Path</span></span>
              <span className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-rp-text-muted sm:block">JLPT Academy</span>
            </span>
          </Link>
          <nav aria-label={tr('Điều hướng chính')} className="hidden items-center gap-7 lg:flex">
            <NavItems activeId={activeId} onNavigate={handleNavClick} />
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitch className="hidden sm:block" />
            {isAuthenticated ? (
              <Link
                to={homeForRole(primaryRole)}
                className="rp-focus rp-press inline-flex h-9 items-center whitespace-nowrap rounded-rp-input bg-rp-brand-pressed px-3.5 text-[13px] font-semibold text-white shadow-rp-brand transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-rp-brand-strong sm:h-10 sm:px-4 sm:text-[14px]"
              >
                {tr(MARKETING_NAV.workspaceLabel)}
              </Link>
            ) : (
              <>
                <Link
                  to={MARKETING_NAV.login.to}
                  className="rp-focus rp-press inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-rp-input bg-rp-brand-pressed px-2 text-[12px] font-semibold text-white shadow-rp-brand transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-rp-brand-strong hover:shadow-[0_12px_24px_-10px_rgba(194,67,98,0.55)] sm:h-10 sm:gap-1.5 sm:px-4 sm:text-[14px]"
                >
                  <LogIn aria-hidden="true" className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span>{tr(MARKETING_NAV.login.label)}</span>
                </Link>
                <Link
                  to={MARKETING_NAV.register.to}
                  className="rp-focus rp-press inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-rp-input border border-rp-brand-border bg-white px-2 text-[12px] font-semibold text-rp-brand-strong transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-rp-brand hover:bg-rp-brand-tint sm:h-10 sm:gap-1.5 sm:px-4 sm:text-[14px]"
                >
                  <UserPlus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span>{tr(MARKETING_NAV.register.label)}</span>
                </Link>
              </>
            )}
            <IconButton icon={Menu} label={tr('Mở menu')} onClick={() => setOpen(true)} className="lg:hidden" />
          </div>
        </div>
      </header>

      <Drawer open={open} onClose={() => setOpen(false)} title="RikiPath">
        <nav aria-label={tr('Điều hướng chính')} className="space-y-1 p-3">
          <NavItems vertical activeId={activeId} onNavigate={handleNavClick} />
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-rp-line px-6 py-3 sm:hidden">
          <span className="text-xs font-semibold text-rp-text-muted">{tr('Ngôn ngữ')}</span>
          <LanguageSwitch />
        </div>
        {!isAuthenticated && (
          <div className="grid grid-cols-2 gap-2 border-t border-rp-line p-4">
            <Link
              to={MARKETING_NAV.login.to}
              onClick={() => setOpen(false)}
              className="rp-focus rp-press inline-flex items-center justify-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-3 py-2.5 text-sm font-semibold text-white shadow-rp-brand"
            >
              <LogIn aria-hidden="true" className="h-4 w-4" />
              {tr(MARKETING_NAV.login.label)}
            </Link>
            <Link
              to={MARKETING_NAV.register.to}
              onClick={() => setOpen(false)}
              className="rp-focus rp-press inline-flex items-center justify-center gap-1.5 rounded-rp-input border border-rp-brand-border bg-white px-3 py-2.5 text-sm font-semibold text-rp-brand-strong"
            >
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              {tr(MARKETING_NAV.register.label)}
            </Link>
          </div>
        )}
      </Drawer>

      <main id="rp-main">{children}</main>

      <footer className="lp-footer relative overflow-hidden border-t border-rp-line bg-[linear-gradient(180deg,#ffffff_0%,#faf9f6_100%)]">
        <div aria-hidden="true" className="rp-pattern-seigaiha pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-50 [mask-image:linear-gradient(to_top,black,transparent)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-10 px-[var(--rp-space-page-x)] py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="rp-focus inline-flex items-center gap-2.5 rounded-lg" aria-label={`RikiPath — ${tr('Trang chủ')}`}>
              <BrandMark className="h-10 w-12" />
              <span className="text-lg font-extrabold">Riki<span className="text-rp-brand">Path</span></span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-rp-text-2">{tr('Nền tảng học tiếng Nhật và luyện thi JLPT N5–N2: tự học theo lộ trình, thi thử, học nhóm cùng Giáo viên và góp ý từ Haru AI.')}</p>
            <p lang="ja" className="rp-kanji mt-4 text-[13px] tracking-[0.2em] text-rp-brand-pressed/80">一歩ずつ、確かに。</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={tr(col.title)}>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rp-text-muted"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rp-brand" />{tr(col.title)}</p>
              <ul className="space-y-2.5 text-sm text-rp-text-2">
                {col.links.map((link) => (
                  <li key={link.to}><Link to={link.to} className="rp-focus rp-underline rounded-sm transition-colors hover:text-rp-brand-strong">{tr(link.label)}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="relative border-t border-rp-line">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-[var(--rp-space-page-x)] py-5 text-xs text-rp-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 RikiPath Learning</p>
            <p>{tr('Thanh toán lớp nhóm qua PayOS · Đồng bộ Web và ứng dụng RikiPath')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
