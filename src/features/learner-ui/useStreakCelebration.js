import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { claimStreakCelebration, getStreakCelebration } from '@/features/progress/api/analyticsApi.js';
import { getSession } from '@/app/auth/session.js';
import { learnerKeys, learnerScopeKey } from '@/features/dashboard/hooks/useLearnerHome.js';
import { notify } from '@/components/ui';
import { STREAK_MILESTONES } from './learnerTokens.js';

export const streakCelebrationKey = ['learner', 'streak-celebration'];

const SAFE_CONTEXT_RETRY_MS = 2000;
// Learning Moments (onboarding, placement, first lesson…) get the first slot; streak waits for a calm screen.
const FIRST_ATTEMPT_DELAY_MS = 1500;

/**
 * Presentation policy (celebrate meaningful progress, not every visit):
 * - milestone reached today → big dialog;
 * - ordinary daily extension → small toast only;
 * - streak at risk → big reminder only when today's activity would hit a milestone or a 7+ day streak is at risk;
 *   otherwise nothing is shown (the event is not consumed).
 */
export function streakPresentation(event) {
  const days = Number(event?.currentStreakDays) || 0;
  if (event?.eventType === 'milestone') return 'dialog';
  if (event?.eventType === 'daily') return 'toast';
  if (event?.eventType === 'atRisk') return STREAK_MILESTONES.includes(days + 1) || days >= 7 ? 'dialog' : 'none';
  return 'none';
}

/**
 * The celebration may only open in a calm context: no other modal open, no exam / timed attempt
 * or SRS player in progress, and the tab is visible. Otherwise the pending event simply waits.
 */
export function isSafeCelebrationContext(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return false;
  if (doc.visibilityState && doc.visibilityState !== 'visible') return false;
  if (doc.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"]')) return false;
  if (doc.querySelector('[data-exam-attempt-active="true"], [data-srs-player-active="true"]')) return false;
  return true;
}

/**
 * Event-driven streak celebration (never "open because currentStreak > 0").
 *
 * 1. Reads today's server event (`hasPendingEvent`) — visiting pages never creates one.
 * 2. When pending and the page is in a safe context, claims it on the server. The claim is atomic per
 *    learner + Vietnam study day, so across tabs, devices, reloads and re-logins exactly one caller wins.
 * 3. Only the winner gets `celebration` (the payload to render). Nothing is stored in localStorage.
 */
export function useStreakCelebration({ enabled = true } = {}) {
  const session = getSession();
  const queryClient = useQueryClient();
  const scope = learnerScopeKey(session);
  const queryKey = [...streakCelebrationKey, ...scope];
  const active = Boolean(enabled && session?.accessToken && !session?.isPreview);

  const eventQuery = useQuery({
    queryKey,
    queryFn: getStreakCelebration,
    enabled: active,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: (count, err) => err?.status !== 401 && count < 1,
  });

  const [celebration, setCelebration] = useState(null);
  const claimedIdsRef = useRef(new Set());
  const presentation = eventQuery.data?.hasPendingEvent ? streakPresentation(eventQuery.data) : 'none';
  const eventId = presentation !== 'none' ? eventQuery.data.eventId : null;

  useEffect(() => {
    if (!active || !eventId || claimedIdsRef.current.has(eventId)) return undefined;
    let cancelled = false;
    let timer = 0;

    const attempt = async () => {
      if (cancelled) return;
      if (!isSafeCelebrationContext()) {
        timer = window.setTimeout(attempt, SAFE_CONTEXT_RETRY_MS);
        return;
      }
      claimedIdsRef.current.add(eventId);
      try {
        const result = await claimStreakCelebration(eventId);
        // Do not bail out on `cancelled` here: a winning claim is already recorded server-side,
        // so it must still be shown even if a refetch re-ran this effect meanwhile.
        queryClient.setQueryData(queryKey, result ? { ...result, hasPendingEvent: false } : undefined);
        queryClient.invalidateQueries({ queryKey: learnerKeys.streak });
        if (result?.claimed) {
          if (presentation === 'toast') {
            notify.success(`🔥 ${result.currentStreakDays}`, 'Chuỗi ngày học của bạn vừa tăng thêm một ngày!', { key: 'streak-daily-toast' });
          } else {
            setCelebration(result);
          }
        }
      } catch {
        // Network failure before the server recorded the claim: allow a later retry (still idempotent server-side).
        claimedIdsRef.current.delete(eventId);
      }
    };

    timer = window.setTimeout(attempt, FIRST_ATTEMPT_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // queryKey is derived from the session scope captured above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, eventId, presentation, queryClient]);

  return {
    event: eventQuery.data || null,
    celebration,
    dismiss: () => setCelebration(null),
  };
}
