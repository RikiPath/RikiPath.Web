import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui';
import { DRAG_THRESHOLD_PX } from './floatingWidgetMath.js';
import { useOptionalFloatingWidgets } from './floatingWidgetState.js';

/**
 * Coordinates a floating dock trigger within `FloatingWidgetProvider`:
 * - Mouse, touch & pen smooth Pointer Events dragging with 6px click-vs-drag threshold
 * - Live ResizeObserver size syncing (e.g. badge counts or responsive width changes)
 * - Automatic viewport clamping & non-overlapping collision avoidance
 * - Keyboard arrow movement when focused (Arrow keys nudge; Shift+Arrow nudges faster)
 *
 * Keeps graceful fixed fallback styling if rendered outside `FloatingWidgetProvider`.
 */
export default function DraggableFloatingDock({
  widgetId,
  order = 0,
  zIndex = 65,
  fallbackClassName = 'fixed bottom-4 right-4 sm:bottom-5 sm:right-5',
  onDragStateChange,
  onReleaseSettled,
  ariaLabel,
  className,
  children,
}) {
  const manager = useOptionalFloatingWidgets();
  const registerWidget = manager?.registerWidget;
  const unregisterWidget = manager?.unregisterWidget;
  const rootRef = useRef(null);
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const dragStateRef = useRef(null);
  const windowDragCleanupRef = useRef(null);
  const suppressTimerRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!registerWidget || !unregisterWidget || !el) return undefined;

    const reportSize = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      if (width > 0 && height > 0) {
        if (lastSizeRef.current.width === width && lastSizeRef.current.height === height) return;
        lastSizeRef.current = { width, height };
        registerWidget(widgetId, { order, size: { width, height } });
      }
    };

    reportSize();
    if (typeof ResizeObserver !== 'function') return () => unregisterWidget(widgetId);
    const observer = new ResizeObserver(reportSize);
    observer.observe(el);
    return () => {
      lastSizeRef.current = { width: 0, height: 0 };
      observer.disconnect();
      unregisterWidget(widgetId);
    };
  }, [registerWidget, unregisterWidget, widgetId, order]);

  useEffect(() => () => {
    windowDragCleanupRef.current?.();
    if (suppressTimerRef.current) {
      window.clearTimeout(suppressTimerRef.current);
    }
    if (dragStateRef.current?.frame) {
      window.cancelAnimationFrame(dragStateRef.current.frame);
    }
  }, []);

  const anchor = manager?.getWidgetAnchorRect(widgetId);
  const hasCoord = Boolean(manager && anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y));
  const [slideReady, setSlideReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setSlideReady(hasCoord));
    return () => window.cancelAnimationFrame(id);
  }, [hasCoord]);

  const enableSlideTransition = hasCoord && slideReady;

  function handlePointerDown(event) {
    if (!manager || event.button > 0) return;
    if (event.target?.closest?.('[data-floating-no-drag="true"]')) return;

    windowDragCleanupRef.current?.();
    const rect = rootRef.current?.getBoundingClientRect();
    const startX = Number.isFinite(anchor?.x) ? anchor.x : (rect?.left ?? 0);
    const startY = Number.isFinite(anchor?.y) ? anchor.y : (rect?.top ?? 0);

    dragStateRef.current = {
      pointerId: event.pointerId,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originPosX: startX,
      originPosY: startY,
      moved: false,
      frame: 0,
    };

    // Track drag via window listeners instead of setPointerCapture on pointerdown so
    // clicks (< DRAG_THRESHOLD_PX) are not retargeted away from inner <button> elements.
    const onWindowMove = (moveEvent) => {
      const ds = dragStateRef.current;
      if (!ds || moveEvent.pointerId !== ds.pointerId || !manager) return;

      const dx = moveEvent.clientX - ds.originClientX;
      const dy = moveEvent.clientY - ds.originClientY;
      const distance = Math.hypot(dx, dy);

      if (!ds.moved && distance >= DRAG_THRESHOLD_PX) {
        ds.moved = true;
        suppressClickRef.current = true;
        setDragging(true);
        manager.setActiveDragId(widgetId);
        onDragStateChange?.(true);
      }

      if (!ds.moved) return;

      const nextCoord = { x: ds.originPosX + dx, y: ds.originPosY + dy };
      if (ds.frame) window.cancelAnimationFrame(ds.frame);
      ds.frame = window.requestAnimationFrame(() => {
        manager.moveWidget(widgetId, nextCoord, { persist: false });
      });
    };

    const onWindowFinish = (endEvent) => {
      const ds = dragStateRef.current;
      if (!ds || (endEvent.pointerId != null && ds.pointerId !== endEvent.pointerId)) return;
      if (ds.frame) window.cancelAnimationFrame(ds.frame);

      const wasMoved = ds.moved;
      dragStateRef.current = null;
      windowDragCleanupRef.current?.();

      if (wasMoved && manager) {
        const dx = endEvent.clientX - ds.originClientX;
        const dy = endEvent.clientY - ds.originClientY;
        manager.moveWidget(widgetId, { x: ds.originPosX + dx, y: ds.originPosY + dy }, { persist: true });
        setDragging(false);
        manager.setActiveDragId(null);
        onDragStateChange?.(false);
        onReleaseSettled?.();
        if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = window.setTimeout(() => {
          suppressClickRef.current = false;
          suppressTimerRef.current = 0;
        }, 80);
      } else {
        suppressClickRef.current = false;
      }
    };

    window.addEventListener('pointermove', onWindowMove, { passive: true });
    window.addEventListener('pointerup', onWindowFinish);
    window.addEventListener('pointercancel', onWindowFinish);
    windowDragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowFinish);
      window.removeEventListener('pointercancel', onWindowFinish);
      windowDragCleanupRef.current = null;
    };
  }

  function handleClickCapture(event) {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleKeyDown(event) {
    if (!manager) return;
    const step = event.shiftKey ? 32 : 14;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      manager.nudgeWidget(widgetId, -step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      manager.nudgeWidget(widgetId, step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      manager.nudgeWidget(widgetId, 0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      manager.nudgeWidget(widgetId, 0, step);
    }
  }

  const positionStyle = hasCoord
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate3d(${anchor.x}px, ${anchor.y}px, 0)`,
        zIndex: dragging ? zIndex + 15 : zIndex,
        touchAction: 'none',
      }
    : {
        zIndex,
        touchAction: 'none',
      };

  return (
    <div
      ref={rootRef}
      data-floating-widget={widgetId}
      data-dragging={dragging ? 'true' : 'false'}
      aria-label={ariaLabel}
      style={positionStyle}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
      className={cx(
        'pointer-events-auto select-none',
        !hasCoord && fallbackClassName,
        dragging
          ? 'cursor-grabbing'
          : enableSlideTransition
            ? 'cursor-grab transition-transform duration-150 ease-out'
            : 'cursor-grab',
        className,
      )}
    >
      {typeof children === 'function' ? children({ dragging, anchor }) : children}
    </div>
  );
}
