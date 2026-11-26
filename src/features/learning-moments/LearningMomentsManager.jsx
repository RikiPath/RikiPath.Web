import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/app/auth/session.js';
import { useLocale } from '@/locales/locale.js';
import { isSafeCelebrationContext } from '@/features/learner-ui/useStreakCelebration.js';
import { claimLearningMoment, getPendingLearningMoments, learningMomentsKey } from './learningMomentsApi.js';
import { describeMoment } from './momentCatalog.js';
import { CELEBRATION_KIND, acquireCelebration, canOpenCelebration, scopeCelebrationGate, setPendingMoments } from './celebrationGate.js';
import CelebrationDialog from './CelebrationDialog.jsx';
import PremiumUnlockDialog from './PremiumUnlockDialog.jsx';
import { GoalHero, JourneyHero } from './MomentHeroes.jsx';

/** Routes where a celebration must never interrupt (timed tests, placement in progress, checkout, live class). */
const BLOCKED_ROUTE_PREFIXES = ['/placement/exam', '/placement-test', '/app/placement-test', '/mock-test', '/mock-tests', '/checkout', '/study-payment', '/meeting', '/onboarding'];
const MAX_DIALOGS_PER_VISIT = 2;
const SAFE_RETRY_MS = 2000;
// Let the destination page (e.g. Dashboard right after onboarding) render its data before a dialog appears.
const FIRST_ATTEMPT_DELAY_MS = 900;

function routeAllowsCelebration(pathname) {
  const clean = String(pathname || '').toLowerCase();
  return !BLOCKED_ROUTE_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`));
}

/** The page is still loading its primary content (route-level Sakura loader / skeleton). */
function pageStillLoading(doc = document) {
  return Boolean(doc.querySelector('[data-sakura-loader="page"], [data-sakura-loader="fullscreen"]'));
}

/**
 * App-level Learning Moments coordinator (mounted once in LearnerShell).
 * - Source of truth: the server's pending moments (derived from verified data: saved goal, graded placement,
 *   confirmed roadmap, paid + activated order…). Never from page visits, query strings or local flags.
 * - Exactly-once: each moment is claimed on the server right before it opens; another tab/device that loses the
 *   claim shows nothing. Closing ("Để sau"/X/Escape) never deletes the milestone and never chains another popup:
 *   the shared celebration gate holds the single modal slot and spaces dialogs out.
 * - Priority comes from the server (purchase 5 → roadmap 20 → placement 25 → goal 30 → achievements).
 */
export default function LearningMomentsManager() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getSession();
  const userId = session?.userId ?? null;
  const active = Boolean(session?.accessToken && !session?.isPreview);

  const pendingQuery = useQuery({
    queryKey: [...learningMomentsKey, userId ?? 'anon'],
    queryFn: getPendingLearningMoments,
    enabled: active,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Account switch / logout → fresh gate (no popup from the previous learner can leak).
  useEffect(() => {
    scopeCelebrationGate(active ? userId : null);
  }, [active, userId]);

  // Re-check after navigation (e.g. returning from a finished lesson/test/onboarding) — throttled by staleTime.
  useEffect(() => {
    if (active) queryClient.invalidateQueries({ queryKey: learningMomentsKey, refetchType: 'active' });
  }, [pathname, active, queryClient]);

  const [current, setCurrent] = useState(null);
  const releaseRef = useRef(null);
  const shownCountRef = useRef(0);
  const [attempted, setAttempted] = useState(() => new Set());
  const next = (pendingQuery.data?.items || []).find((m) => !attempted.has(m.occurrenceKey) && describeMoment(m, tr, trf));

  // Reminders (streak) yield while a real milestone is still waiting to be shown.
  useEffect(() => {
    setPendingMoments(Boolean(active && next && shownCountRef.current < MAX_DIALOGS_PER_VISIT));
  }, [active, next]);

  useEffect(() => {
    if (!active || current || !next || shownCountRef.current >= MAX_DIALOGS_PER_VISIT) return undefined;
    let cancelled = false;
    let timer = 0;
    const attempt = async () => {
      if (cancelled) return;
      if (
        !routeAllowsCelebration(window.location.pathname)
        || !isSafeCelebrationContext()
        || pageStillLoading()
        || !canOpenCelebration(CELEBRATION_KIND.MOMENT)
      ) {
        timer = window.setTimeout(attempt, SAFE_RETRY_MS);
        return;
      }
      const release = acquireCelebration(CELEBRATION_KIND.MOMENT, next.occurrenceKey);
      if (!release) {
        timer = window.setTimeout(attempt, SAFE_RETRY_MS);
        return;
      }
      setAttempted((prev) => new Set(prev).add(next.occurrenceKey));
      try {
        const res = await claimLearningMoment(next.occurrenceKey);
        if (res?.claimed && res.moment) {
          shownCountRef.current += 1;
          releaseRef.current = release;
          if (res.moment.type === 'PURCHASE_COMPLETED') {
            // Entitlements are already active server-side: refresh every lock now (sidebar, dashboard, route gate)
            // so the learner never needs to reload or sign in again.
            void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
            void queryClient.invalidateQueries({ queryKey: ['ai-learning-path'] });
          }
          setCurrent(res.moment);
        } else {
          release({ shown: false });
          queryClient.invalidateQueries({ queryKey: learningMomentsKey });
        }
      } catch {
        // Celebration problems must never affect learning: allow a later retry, stay silent.
        release({ shown: false });
        setAttempted((prev) => {
          const copy = new Set(prev);
          copy.delete(next.occurrenceKey);
          return copy;
        });
      }
    };
    timer = window.setTimeout(attempt, FIRST_ATTEMPT_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, current, next, queryClient]);

  // Never leave the modal slot held if the manager unmounts (logout, role switch).
  useEffect(() => () => releaseRef.current?.({ shown: false }), []);

  const view = current ? describeMoment(current, tr, trf) : null;

  function close() {
    releaseRef.current?.();
    releaseRef.current = null;
    setCurrent(null);
    queryClient.invalidateQueries({ queryKey: learningMomentsKey });
  }

  function goToCta() {
    const href = current?.ctaHref;
    close();
    if (href) navigate(href);
  }

  if (!current || !view) return null;

  if (view.variant === 'purchase') {
    return (
      <PremiumUnlockDialog
        key={current.occurrenceKey}
        open
        variant={view.unlock ? 'unlock' : 'renew'}
        eyebrow={view.eyebrow}
        planName={view.planName}
        title={view.title}
        description={view.description}
        chips={view.chips}
        benefits={view.benefits}
        ctaLabel={view.cta}
        onCta={goToCta}
        onClose={close}
      />
    );
  }

  const hero = view.variant === 'goal'
    ? <GoalHero />
    : view.variant === 'journey'
      ? <JourneyHero ai={Boolean(view.ai)} />
      : null;

  return (
    <CelebrationDialog
      key={current.occurrenceKey}
      open
      accent={view.accent}
      visual={view.visual}
      animation={view.animation}
      confetti={Boolean(view.confetti)}
      hero={hero}
      eyebrow={view.eyebrow}
      title={view.title}
      description={view.description}
      chips={view.chips || []}
      ctaLabel={view.cta}
      onClose={close}
      onCta={goToCta}
    />
  );
}
