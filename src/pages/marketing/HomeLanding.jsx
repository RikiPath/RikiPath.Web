import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Map as MapIcon, Repeat, UsersRound } from 'lucide-react';
import { PublicShell } from '@/layouts';
import { useAuth } from '@/app/auth/authContext.js';
import { useLocale } from '@/locales/locale.js';
import { homeForRole } from '@/app/routes/routeTable.js';
import HeroLearningScene from '@/features/landing/components/HeroLearningScene.jsx';
import {
  ClosingCta,
  CtaLink,
  FaqSection,
  GroupLearningSection,
  JourneySection,
  PersonalizedSection,
  RoadmapSection,
  ToolsSection,
} from '@/features/landing/components/LandingSections.jsx';
import { HERO_POINTS } from '@/features/landing/constants/landingContent.js';
import { useLandingMotion } from '@/features/landing/hooks/useLandingMotion.js';
import '@/features/landing/landing.css';

// Content is descriptive only: no user counts, ratings, testimonials or progress figures, because
// RikiPath has no verified public numbers. Hero cards are labelled illustrations of the product UI.

const POINT_ICONS = { levels: MapIcon, srs: Repeat, group: UsersRound };

export default function HomeLanding() {
  const rootRef = useRef(null);
  useLandingMotion(rootRef);
  const { hash, key } = useLocation();

  // Router links like "/#group-learning" (header, footer, other pages) don't scroll by themselves.
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [hash, key]);
  const { isAuthenticated, primaryRole } = useAuth();
  const { tr, locale } = useLocale();
  const startTo = isAuthenticated ? homeForRole(primaryRole) : '/register';
  const startLabel = isAuthenticated ? 'Vào trang học tập' : 'Bắt đầu học';

  return (
    <PublicShell>
      <div ref={rootRef} className="rp-landing overflow-x-clip">
        {/* Hero */}
        <section className="px-2 pb-6 pt-2 sm:px-3 sm:pt-3" aria-labelledby="hero-title">
          {/* Full-width hero on the Sakura / Ivory / Mint surface (dots, seigaiha, orb). The Japanese landscape
              slideshow lives ONLY inside the scenic frame of HeroLearningScene (right column), never behind the copy. */}
          <div className="lp-hero lp-hero-shell relative isolate overflow-hidden rounded-[24px] sm:rounded-[32px]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
            <div className="lp-hero-dots absolute inset-0" />
            <div className="rp-pattern-seigaiha absolute inset-x-0 bottom-0 h-48 opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]" />
            <div className="lp-hero-orb absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full" />
          </div>
            <div className="lp-hero-copy min-w-0 max-w-[600px]">
              <p data-intro style={{ '--d': '80ms' }} className="inline-flex items-center gap-2 rounded-full border border-rp-brand-soft bg-white/85 px-3 py-1.5 text-[13px] font-semibold text-rp-brand-strong shadow-rp-xs">
                <span lang="ja" className="rp-kanji">日本語能力試験</span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-rp-brand" />
                JLPT N5–N2
              </p>
              <h1 id="hero-title" className="mt-6 text-[clamp(2.05rem,1.45rem+1.85vw,3.15rem)] font-extrabold leading-[1.12] tracking-[-0.03em] text-rp-text">
                <span data-intro className="block text-balance" style={{ '--d': '140ms' }}>{tr('Học tiếng Nhật bài bản,')}</span>
                <span data-intro className="block" style={{ '--d': '230ms' }}>
                  {/* Word order differs per language, so the highlighted phrase is placed per locale (no concatenated sentence). */}
                  {locale === 'ja' ? (
                    <>JLPTに<span className="lp-highlight text-rp-brand-pressed">自信</span>を持って挑もう</>
                  ) : (
                    <><span className="lp-highlight text-rp-brand-pressed">{tr('tự tin')}</span>{' '}{tr('bước vào kỳ thi JLPT')}</>
                  )}
                </span>
              </h1>
              <p data-intro style={{ '--d': '330ms' }} className="mt-6 max-w-[540px] rp-type-body leading-8 text-rp-text-2 sm:text-[17px]">
                {tr('Lộ trình theo cấp độ, ôn tập lặp ngắt quãng, đề thi thử có tính giờ và lớp nhóm nhỏ cùng Giáo viên — trong một nền tảng, đồng bộ giữa Web và ứng dụng RikiPath.')}
              </p>
              <div data-intro style={{ '--d': '420ms' }} className="mt-8 flex flex-wrap gap-3">
                <CtaLink to={startTo}>{tr(startLabel)} <ArrowRight aria-hidden="true" className="h-4 w-4" /></CtaLink>
                <CtaLink to="/thi-thu" variant="secondary">{tr('Xem đề thi thử')}</CtaLink>
              </div>
              <ul data-intro style={{ '--d': '500ms' }} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-rp-text-2">
                {HERO_POINTS.map((point) => {
                  const Icon = POINT_ICONS[point.key] || CalendarCheck;
                  return (
                    <li key={point.key} className="flex items-center gap-2">
                      <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-rp-brand-pressed shadow-rp-xs ring-1 ring-rp-line"><Icon className="h-4 w-4" /></span>
                      {tr(point.label)}
                    </li>
                  );
                })}
              </ul>
              <a href="#roadmap" data-intro style={{ '--d': '560ms' }} className="rp-focus rp-underline mt-8 inline-flex items-center gap-1.5 rounded-sm text-[14px] font-semibold text-rp-text-2 hover:text-rp-brand-strong">
                {tr('Khám phá lộ trình JLPT')} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rotate-90" />
              </a>
            </div>

            <div className="lp-hero-stage min-w-0">
              <HeroLearningScene />
            </div>
          </div>
        </section>

        <RoadmapSection />
        <ToolsSection />
        <PersonalizedSection />
        <GroupLearningSection ctaTo={startTo} ctaLabel={isAuthenticated ? tr('Vào trang học tập') : tr('Đăng ký để xem lớp đang mở')} />
        <JourneySection />
        <FaqSection />
        <ClosingCta primaryTo={startTo} primaryLabel={isAuthenticated ? tr('Vào trang học tập') : tr('Tạo tài khoản')} />
      </div>
    </PublicShell>
  );
}
