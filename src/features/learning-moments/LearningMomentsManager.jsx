import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/app/auth/session.js';
import { useLocale } from '@/locales/locale.js';
import { isSafeCelebrationContext } from '@/features/learner-ui/useStreakCelebration.js';
import { claimLearningMoment, getPendingLearningMoments, learningMomentsKey } from './learningMomentsApi.js';
import { describeMoment } from './momentCatalog.js';
import CelebrationDialog from './CelebrationDialog.jsx';


/** Routes where a celebration must never interrupt (timed tests, placement in progress, checkout). */
const BLOCKED_ROUTE_PREFIXES = ['/placement/exam', '/placement-test', '/app/placement-test', '/mock-test', '/mock-tests', '/checkout', '/study-payment', '/meeting'];
const MAX_DIALOGS_PER_VISIT = 2;
const SAFE_RETRY_MS = 2000;

function routeAllowsCelebration(pathname) {
  const clean = String(pathname || '').toLowerCase();
  return !BLOCKED_ROUTE_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`));
}

/**
 * App-level Learning Moments coordinator (mounted once in LearnerShell).
 * - One source of truth: the server's pending moments (derived from verified data; never from page visits).
 * - Priority queue (server order), one dialog at a time, at most a couple per visit; the rest stay pending.
 * - Exactly-once presentation: each moment is claimed on the server right before it opens; another tab/device
 *   that loses the claim shows nothing. Closing ("Để sau") never deletes the achievement.
 * - Waits for a safe context: no other modal open, no exam in progress, tab visible, not on a blocked route.
 */
export default function LearningMomentsManager() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getSession();
  const active = Boolean(session?.accessToken && !session?.isPreview);

  const pendingQuery = useQuery({
    queryKey: [...learningMomentsKey, session?.userId ?? 'anon'],
    queryFn: getPendingLearningMoments,
    enabled: active,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Re-check after navigation (e.g. returning from a finished lesson/test/onboarding) — throttled by staleTime.
  useEffect(() => {
    if (active) queryClient.invalidateQueries({ queryKey: learningMomentsKey, refetchType: 'active' });
  }, [pathname, active, queryClient]);

  const [current, setCurrent] = useState(null);
  const shownCountRef = useRef(0);
  const [attempted, setAttempted] = useState(() => new Set());
  const next = (pendingQuery.data?.items || []).find((m) => !attempted.has(m.occurrenceKey) && describeMoment(m, tr, trf));

  useEffect(() => {
    if (!active || current || !next || shownCountRef.current >= MAX_DIALOGS_PER_VISIT) return undefined;
    let cancelled = false;
    let timer = 0;
    const attempt = async () => {
      if (cancelled) return;
      if (!routeAllowsCelebration(window.location.pathname) || !isSafeCelebrationContext()) {
        timer = window.setTimeout(attempt, SAFE_RETRY_MS);
        return;
      }
      setAttempted((prev) => new Set(prev).add(next.occurrenceKey));
      try {
        const res = await claimLearningMoment(next.occurrenceKey);
        if (res?.claimed && res.moment) {
          shownCountRef.current += 1;
          setCurrent(res.moment);
        } else {
          queryClient.invalidateQueries({ queryKey: learningMomentsKey });
        }
      } catch {
        // Celebration problems must never affect learning: allow a later retry, stay silent.
        setAttempted((prev) => {
          const copy = new Set(prev);
          copy.delete(next.occurrenceKey);
          return copy;
        });
      }
    };
    timer = window.setTimeout(attempt, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, current, next, queryClient]);

  const view = current ? describeMoment(current, tr, trf) : null;

  function close() {
    setCurrent(null);
    queryClient.invalidateQueries({ queryKey: learningMomentsKey });
  }

  return (
    <CelebrationDialog
      open={Boolean(current && view)}
      level={current?.level}
      accent={view?.accent}
      visual={view?.visual}
      animation={view?.animation}
      confetti={Boolean(view?.confetti)}
      eyebrow={view?.eyebrow}
      title={view?.title}
      description={view?.description}
      chips={view?.chips || []}
      ctaLabel={view?.cta}
      onClose={close}
      onCta={() => {
        const href = current?.ctaHref;
        close();
        if (href) navigate(href);
      }}
    />
  );
}
