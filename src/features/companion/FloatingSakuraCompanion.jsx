import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { DraggableFloatingDock, useOptionalFloatingWidgets } from '@/features/floating-widgets';
import { useOptionalSmartNotebook } from '@/features/notebook/context/smartNotebookState.js';
import { useLocale } from '@/locales/locale.js';
import { cx } from '@/components/ui';
import {
  buildContextualSpeechCandidates,
  canTriggerProactiveSpeech,
  COMPANION_REACTIONS,
  COMPANION_STATES,
  INACTIVITY_SLEEP_MS,
  isCompanionSuppressedRoute,
  loadCompanionPrefs,
  readSessionSpeechMeta,
  recordSessionSpeech,
  resolvePageAmbientState,
  saveCompanionPrefs,
  selectNonRepeatingLine,
} from './companionMachine.js';
import { playSakuraChime } from './companionSound.js';
import { useCompanionContext } from './useCompanionContext.js';
import SakuraFox3DActor from './SakuraFox3DActor.jsx';
import RikiInteractivePanel from './RikiInteractivePanel.jsx';

/**
 * Floating Interactive 3D Sakura Fox Companion ("Riki").
 * Managed inside `FloatingWidgetProvider` alongside `FloatingNotebookWidget`:
 * - Smooth drag & drop with >=20px collision-free clearance
 * - Quadrant-aware inward speech bubble & interactive menu placement (zero edge clipping)
 * - 14 non-conflicting character states (ambient studying/curious, hover, dragging, landing, sleepy, etc.)
 * - Strictly hides on timed exam/meeting routes and closes overlays when modals or Notebook open
 */
export default function FloatingSakuraCompanion() {
  const { tr } = useLocale();
  const { pathname, search } = useLocation();
  const { isLearner, session } = useAuth();
  const activeSession = session || getSession();
  const nb = useOptionalSmartNotebook();
  const widgetManager = useOptionalFloatingWidgets();

  const ambientState = resolvePageAmbientState(pathname);

  const [prefs, setPrefs] = useState(loadCompanionPrefs);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelInitialView, setPanelInitialView] = useState('menu');
  const [speechBubble, setSpeechBubble] = useState(null);
  const [companionState, setCompanionState] = useState(() => resolvePageAmbientState(pathname));
  const [reaction, setReaction] = useState(COMPANION_REACTIONS.NONE);
  const [modalActive, setModalActive] = useState(false);
  const [examDomActive, setExamDomActive] = useState(false);

  const recentSpeechIdsRef = useRef([]);
  const reactionTimerRef = useRef(0);
  const bubbleTimerRef = useRef(0);
  const landingTimerRef = useRef(0);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  const suppressed = isCompanionSuppressedRoute({
    pathname,
    search,
    examActive: examDomActive,
  });

  const stats = useCompanionContext({
    active: Boolean(isLearner && !activeSession?.isPreview && !suppressed),
  });

  const updatePrefs = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveCompanionPrefs(next);
      return next;
    });
  }, []);

  const triggerReaction = useCallback((nextReaction, durationMs = 1100) => {
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    setReaction(nextReaction);
    reactionTimerRef.current = window.setTimeout(() => {
      setReaction(COMPANION_REACTIONS.NONE);
    }, durationMs);
  }, []);

  const bumpActivity = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setCompanionState((prev) => (prev === COMPANION_STATES.SLEEPY ? ambientState : prev));
  }, [ambientState]);

  const effectivePanelOpen = panelOpen && !nb?.drawerOpen;
  const effectiveSpeechBubble = !effectivePanelOpen && !nb?.drawerOpen ? speechBubble : null;

  const resolvedVisualState =
    !effectivePanelOpen &&
    !effectiveSpeechBubble &&
    (companionState === COMPANION_STATES.IDLE ||
      companionState === COMPANION_STATES.STUDYING ||
      companionState === COMPANION_STATES.CURIOUS)
      ? ambientState
      : companionState;

  // Watch DOM lightly for active modals or active timed ExamWorkspace so Companion never overlaps them
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined;
    const syncOverlayGuards = () => {
      const hasModal = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
      const hasExam = Boolean(document.querySelector('[data-exam-attempt-active="true"]'));
      setModalActive(hasModal);
      setExamDomActive(hasExam);
      if (hasModal || hasExam) {
        setSpeechBubble(null);
        setPanelOpen(false);
      }
    };
    syncOverlayGuards();
    const observer = new MutationObserver(syncOverlayGuards);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Clear timers cleanly on unmount
  useEffect(() => () => {
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (landingTimerRef.current) window.clearTimeout(landingTimerRef.current);
  }, []);

  // Transition idle/ambient -> sleepy naturally after inactivity
  useEffect(() => {
    if (suppressed || prefs.minimized || effectivePanelOpen || modalActive) return undefined;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= INACTIVITY_SLEEP_MS) {
        setCompanionState((prev) =>
          prev === COMPANION_STATES.IDLE || prev === COMPANION_STATES.STUDYING || prev === COMPANION_STATES.CURIOUS
            ? COMPANION_STATES.SLEEPY
            : prev,
        );
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [suppressed, prefs.minimized, effectivePanelOpen, modalActive]);

  // Rate-limited proactive contextual greeting
  const speechCandidates = useMemo(
    () => buildContextualSpeechCandidates({ pathname, stats }),
    [pathname, stats],
  );

  useEffect(() => {
    if (
      !isLearner ||
      suppressed ||
      prefs.minimized ||
      prefs.mutedProactive ||
      modalActive ||
      effectivePanelOpen ||
      nb?.drawerOpen
    ) {
      return undefined;
    }
    const meta = readSessionSpeechMeta();
    if (!canTriggerProactiveSpeech({
      mutedProactive: prefs.mutedProactive,
      suppressed,
      lastSpokenAt: meta.lastSpokenAt,
    })) {
      return undefined;
    }

    const delayTimer = window.setTimeout(() => {
      const picked = selectNonRepeatingLine(speechCandidates, recentSpeechIdsRef.current);
      if (!picked) return;
      recentSpeechIdsRef.current = [...recentSpeechIdsRef.current.slice(-4), picked.id];
      recordSessionSpeech();
      setSpeechBubble(picked);
      setCompanionState(picked.state || COMPANION_STATES.SPEAKING);
      if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = window.setTimeout(() => {
        setSpeechBubble(null);
        setCompanionState(ambientState);
      }, 9500);
    }, 2400);

    return () => window.clearTimeout(delayTimer);
  }, [
    isLearner,
    suppressed,
    prefs.minimized,
    prefs.mutedProactive,
    modalActive,
    effectivePanelOpen,
    nb?.drawerOpen,
    speechCandidates,
    ambientState,
  ]);

  const panelPlacement = useMemo(() => {
    if (!effectivePanelOpen || !widgetManager) return null;
    return widgetManager.getPanelPlacement('riki', { width: 360, height: 492 });
  }, [effectivePanelOpen, widgetManager]);

  const bubblePlacement = useMemo(() => {
    if (!effectiveSpeechBubble || !widgetManager) return null;
    return widgetManager.getPanelPlacement('riki', { width: 312, height: 152 });
  }, [effectiveSpeechBubble, widgetManager]);

  if (!isLearner || !activeSession?.accessToken || suppressed || modalActive) {
    return null;
  }

  function openInteractiveMenu(initial = 'menu') {
    bumpActivity();
    if (nb?.drawerOpen && nb?.setDrawerOpen) {
      nb.setDrawerOpen(false);
    }
    setSpeechBubble(null);
    setPanelInitialView(initial);
    setPanelOpen(true);
    setCompanionState(COMPANION_STATES.HAPPY);
    triggerReaction(COMPANION_REACTIONS.JUMPING);
    playSakuraChime('greet', prefs.soundEnabled);
  }

  function handleBubbleQuickReply(reply) {
    bumpActivity();
    setSpeechBubble(null);
    if (reply.action === 'chat' || reply.action === 'chat-kanji') {
      openInteractiveMenu('chat');
    } else if (reply.action === 'recommend') {
      openInteractiveMenu('recommend');
    } else if (reply.action === 'progress') {
      openInteractiveMenu('progress');
    } else if (reply.action === 'encourage') {
      openInteractiveMenu('encourage');
    } else if (reply.action === 'quick-review') {
      openInteractiveMenu('quick-review');
    } else if (reply.action === 'play') {
      openInteractiveMenu('play');
    }
  }

  function handleDragStateChange(isDragging) {
    if (isDragging) {
      if (landingTimerRef.current) window.clearTimeout(landingTimerRef.current);
      if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
      setSpeechBubble(null);
      setPanelOpen(false);
      setCompanionState(COMPANION_STATES.DRAGGING);
      setReaction(COMPANION_REACTIONS.NONE);
    }
  }

  function handleDragSettled() {
    bumpActivity();
    setCompanionState(COMPANION_STATES.LANDING);
    playSakuraChime('pop', prefs.soundEnabled);
    if (landingTimerRef.current) window.clearTimeout(landingTimerRef.current);
    landingTimerRef.current = window.setTimeout(() => {
      setCompanionState((prev) => (prev === COMPANION_STATES.LANDING ? ambientState : prev));
    }, 390);
  }

  if (prefs.minimized) {
    return (
      <DraggableFloatingDock
        widgetId="riki"
        order={1}
        zIndex={64}
        fallbackClassName="fixed bottom-4 right-[92px] sm:bottom-5 sm:right-[138px]"
        ariaLabel={tr('Kéo để di chuyển nút Riki')}
      >
        {({ dragging }) => (
          <button
            type="button"
            onClick={() => {
              updatePrefs({ minimized: false });
              bumpActivity();
              setCompanionState(COMPANION_STATES.EXCITED);
              triggerReaction(COMPANION_REACTIONS.WAVING);
            }}
            aria-label={tr('Mở cáo Sakura Riki')}
            className={cx(
              'rp-focus inline-flex h-12 items-center gap-1.5 rounded-full border border-rp-brand-border bg-white/95 px-3.5 text-xs font-bold text-rp-brand-strong shadow-rp-pop transition-transform',
              dragging ? 'scale-105' : 'hover:scale-105',
            )}
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
            <span>Riki</span>
          </button>
        )}
      </DraggableFloatingDock>
    );
  }

  return (
    <div data-companion-dock="riki">
      {/* Viewport-safe Inward Interactive Menu & Speech Bubble Overlay */}
      {effectivePanelOpen && (
        <div
          style={panelPlacement ? {
            position: 'fixed',
            left: `${panelPlacement.left}px`,
            top: `${panelPlacement.top}px`,
            width: `${panelPlacement.width}px`,
            zIndex: 67,
          } : undefined}
          className={cx(
            'pointer-events-none',
            !panelPlacement && 'fixed bottom-[94px] right-3 z-[67] sm:bottom-[104px] sm:right-5',
          )}
        >
          <RikiInteractivePanel
            key={panelInitialView}
            initialView={panelInitialView}
            stats={stats}
            companionState={resolvedVisualState}
            companionReaction={reaction}
            prefs={prefs}
            onSetState={setCompanionState}
            onTriggerReaction={triggerReaction}
            onToggleSound={() => updatePrefs({ soundEnabled: !prefs.soundEnabled })}
            onToggleProactiveMute={() => updatePrefs({ mutedProactive: !prefs.mutedProactive })}
            onResetPosition={widgetManager ? () => widgetManager.resetPositions() : undefined}
            onMinimize={() => {
              setPanelOpen(false);
              setSpeechBubble(null);
              updatePrefs({ minimized: true });
            }}
            onClose={() => {
              setPanelOpen(false);
              setCompanionState(ambientState);
            }}
          />
        </div>
      )}

      {!effectivePanelOpen && effectiveSpeechBubble && (
        <div
          style={bubblePlacement ? {
            position: 'fixed',
            left: `${bubblePlacement.left}px`,
            top: `${bubblePlacement.top}px`,
            width: `${bubblePlacement.width}px`,
            zIndex: 66,
          } : undefined}
          className={cx(
            'pointer-events-none',
            !bubblePlacement && 'fixed bottom-[94px] right-3 z-[66] sm:bottom-[104px] sm:right-5',
          )}
        >
          <div
            role="status"
            aria-live="polite"
            onPointerEnter={() => {
              if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
            }}
            className="riki-bubble-enter pointer-events-auto relative rounded-2xl border border-rp-brand-border bg-white/98 p-3.5 shadow-[0_18px_36px_-18px_rgba(140,42,74,0.28),0_2px_8px_rgba(20,24,35,0.06)] backdrop-blur"
          >
            <button
              type="button"
              onClick={() => {
                setSpeechBubble(null);
                setCompanionState(ambientState);
              }}
              aria-label={tr('Đóng')}
              title={tr('Đóng')}
              className="rp-focus absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>

            <p className="pr-6 text-[12.5px] font-medium leading-5 text-rp-text">
              {tr(effectiveSpeechBubble.text)}
            </p>

            {effectiveSpeechBubble.quickReplies?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {effectiveSpeechBubble.quickReplies.map((reply) =>
                  reply.to ? (
                    <Link
                      key={reply.label}
                      to={reply.to}
                      onClick={() => setSpeechBubble(null)}
                      className="rp-focus inline-flex items-center rounded-full border border-rp-brand-border bg-rp-brand-tint/60 px-2.5 py-1 text-[11px] font-semibold text-rp-brand-strong transition-colors hover:bg-rp-brand-tint"
                    >
                      {tr(reply.label)}
                    </Link>
                  ) : (
                    <button
                      key={reply.label}
                      type="button"
                      onClick={() => handleBubbleQuickReply(reply)}
                      className="rp-focus rounded-full border border-rp-line bg-rp-bg-2 px-2.5 py-1 text-[11px] font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/50 hover:text-rp-brand-strong"
                    >
                      {tr(reply.label)}
                    </button>
                  ),
                )}
              </div>
            )}

            <span
              aria-hidden="true"
              style={bubblePlacement ? { left: `${bubblePlacement.arrowOffsetX - 6}px` } : { right: '26px' }}
              className={cx(
                'absolute h-3 w-3 rotate-45 border-rp-brand-border bg-white',
                bubblePlacement?.openUpward === false
                  ? '-top-1.5 border-l border-t'
                  : '-bottom-1.5 border-b border-r',
              )}
            />
          </div>
        </div>
      )}

      {/* Draggable Tactile 3D Sakura Fox Trigger */}
      <DraggableFloatingDock
        widgetId="riki"
        order={1}
        zIndex={64}
        fallbackClassName="fixed bottom-4 right-[92px] sm:bottom-5 sm:right-[138px]"
        ariaLabel={tr('Kéo để di chuyển cáo Sakura Riki')}
        onDragStateChange={handleDragStateChange}
        onReleaseSettled={handleDragSettled}
      >
        {({ dragging }) => (
          <button
            type="button"
            data-testid="floating-riki-companion"
            onPointerEnter={() => {
              if (dragging) return;
              bumpActivity();
              if (!effectivePanelOpen) {
                setCompanionState(COMPANION_STATES.HOVER);
                triggerReaction(COMPANION_REACTIONS.WAVING, 1200);
              }
            }}
            onPointerLeave={() => {
              if (!dragging && !effectivePanelOpen && !effectiveSpeechBubble) {
                setCompanionState(ambientState);
              }
            }}
            onClick={() => {
              if (effectivePanelOpen) {
                setPanelOpen(false);
                setCompanionState(ambientState);
              } else {
                openInteractiveMenu('menu');
              }
            }}
            aria-expanded={effectivePanelOpen}
            aria-haspopup="dialog"
            aria-label={tr('Mở trợ lý học tập cáo Sakura Riki')}
            className={cx(
              'rp-focus relative flex h-16 w-16 items-center justify-center rounded-full border p-1 transition-transform duration-200 sm:h-[72px] sm:w-[72px]',
              dragging
                ? 'scale-105 border-rp-brand bg-gradient-to-br from-rp-brand-tint to-white shadow-[0_20px_38px_-10px_rgba(204,75,107,0.48)]'
                : effectivePanelOpen
                  ? 'border-rp-brand bg-gradient-to-br from-rp-brand-tint to-white shadow-rp-brand hover:scale-105'
                  : 'border-rp-brand-border/80 bg-gradient-to-br from-white via-[#FFF7FA] to-[#FAD4DE]/45 shadow-[0_12px_28px_-10px_rgba(140,42,74,0.3)] hover:scale-105 active:scale-95',
            )}
          >
            <SakuraFox3DActor state={resolvedVisualState} reaction={reaction} size={60} interactive={!dragging} />
            {!effectivePanelOpen && !dragging && stats.dueCards > 0 && !prefs.mutedProactive && (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rp-brand-pressed px-1 text-[9.5px] font-bold text-white ring-2 ring-white tabular-nums"
              >
                {stats.dueCards > 99 ? '99+' : stats.dueCards}
              </span>
            )}
          </button>
        )}
      </DraggableFloatingDock>
    </div>
  );
}
