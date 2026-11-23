import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clampWidgetPosition,
  computeDefaultPositions,
  computeFloatingPanelPlacement,
  FLOATING_WIDGET_STORAGE_KEY,
  getViewportBucket,
  normalizeSize,
  readPersistedPositions,
  resolveWidgetCollision,
  WIDGET_GAP_PX,
  writePersistedPositions,
} from './floatingWidgetMath.js';
import { FloatingWidgetContext } from './floatingWidgetState.js';

function readViewport() {
  if (typeof window === 'undefined') return { width: 1280, height: 720 };
  return {
    width: document.documentElement?.clientWidth || window.innerWidth || 1280,
    height: window.innerHeight || 720,
  };
}

function samePositions(a = {}, b = {}) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => b[k] && a[k]?.x === b[k]?.x && a[k]?.y === b[k]?.y);
}

/**
 * Coordinates positioning, dragging, viewport clamping, ResizeObserver re-layout,
 * collision avoidance (>=20px clearance), and localStorage persistence across all
 * Learner floating triggers (`notebook`, `riki`).
 */
export function FloatingWidgetProvider({ children }) {
  const [viewport, setViewport] = useState(readViewport);
  const [metaMap, setMetaMap] = useState({}); // { [id]: { order, size } }
  const [positions, setPositions] = useState(() => {
    if (typeof window === 'undefined') return {};
    const vp = readViewport();
    return readPersistedPositions(window.localStorage, FLOATING_WIDGET_STORAGE_KEY, getViewportBucket(vp));
  });
  const [activeDragId, setActiveDragId] = useState(null);

  const metaRef = useRef(metaMap);
  const positionsRef = useRef(positions);
  const bucketRef = useRef(getViewportBucket(viewport));

  useEffect(() => {
    metaRef.current = metaMap;
  }, [metaMap]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const recomputeLayout = useCallback((nextMeta, nextViewport, movedId = null, preferReset = false) => {
    const ids = Object.keys(nextMeta);
    if (!ids.length) return {};

    const bucket = getViewportBucket(nextViewport);
    const specs = ids.map((id) => ({
      id,
      order: nextMeta[id]?.order ?? 0,
      size: normalizeSize(nextMeta[id]?.size),
    }));
    const sizes = Object.fromEntries(specs.map((s) => [s.id, s.size]));
    const defaults = computeDefaultPositions(specs, nextViewport, { gap: WIDGET_GAP_PX });

    const seed = preferReset
      ? defaults
      : Object.fromEntries(
          specs.map((s) => [s.id, positionsRef.current[s.id] || defaults[s.id]]),
        );

    const resolved = resolveWidgetCollision({
      movedId,
      positions: seed,
      sizes,
      viewport: nextViewport,
      gap: WIDGET_GAP_PX,
    });

    const merged = preferReset ? resolved : { ...positionsRef.current, ...resolved };
    if (samePositions(positionsRef.current, merged) && !preferReset) {
      return positionsRef.current;
    }
    if (typeof window !== 'undefined' && !preferReset) {
      writePersistedPositions(window.localStorage, merged, FLOATING_WIDGET_STORAGE_KEY, bucket);
    }
    positionsRef.current = merged;
    setPositions(merged);
    return merged;
  }, []);

  useEffect(() => {
    if (!Object.keys(metaMap).length) return;
    recomputeLayout(metaMap, readViewport());
  }, [metaMap, recomputeLayout]);

  const registerWidget = useCallback((id, { order = 0, size } = {}) => {
    const cleanSize = normalizeSize(size);
    setMetaMap((prev) => {
      const existing = prev[id];
      if (
        existing &&
        existing.order === order &&
        existing.size.width === cleanSize.width &&
        existing.size.height === cleanSize.height
      ) {
        return prev;
      }
      return { ...prev, [id]: { order, size: cleanSize } };
    });
  }, []);

  const unregisterWidget = useCallback((id) => {
    setMetaMap((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const moveWidget = useCallback((id, nextCoord, { persist = false } = {}) => {
    const currentMeta = metaRef.current;
    const vp = readViewport();
    const specs = Object.keys(currentMeta).map((wid) => ({
      id: wid,
      order: currentMeta[wid]?.order ?? 0,
      size: normalizeSize(currentMeta[wid]?.size),
    }));
    const sizes = Object.fromEntries(specs.map((s) => [s.id, s.size]));
    const size = sizes[id] || normalizeSize(null);
    const clamped = clampWidgetPosition(nextCoord, size, vp);

    const basePositions = {
      ...positionsRef.current,
      [id]: clamped,
    };

    const resolved = resolveWidgetCollision({
      movedId: id,
      positions: basePositions,
      sizes,
      viewport: vp,
      gap: WIDGET_GAP_PX,
    });

    const merged = { ...positionsRef.current, ...resolved };
    positionsRef.current = merged;
    setPositions(merged);
    if (persist && typeof window !== 'undefined') {
      writePersistedPositions(window.localStorage, merged, FLOATING_WIDGET_STORAGE_KEY, getViewportBucket(vp));
    }
    return merged[id] || clamped;
  }, []);

  const nudgeWidget = useCallback((id, dx, dy) => {
    const cur = positionsRef.current[id];
    if (!cur) return;
    moveWidget(id, { x: cur.x + dx, y: cur.y + dy }, { persist: true });
  }, [moveWidget]);

  const resetPositions = useCallback(() => {
    const vp = readViewport();
    const bucket = getViewportBucket(vp);
    bucketRef.current = bucket;
    if (typeof window !== 'undefined') {
      writePersistedPositions(window.localStorage, {}, FLOATING_WIDGET_STORAGE_KEY, bucket);
    }
    recomputeLayout(metaRef.current, vp, null, true);
  }, [recomputeLayout]);

  const getWidgetAnchorRect = useCallback((id) => {
    const pos = positions[id];
    const meta = metaMap[id];
    const size = normalizeSize(meta?.size);
    if (!pos) {
      const vp = viewport;
      const fallback = computeDefaultPositions(
        Object.keys(metaMap).map((k) => ({ id: k, order: metaMap[k].order, size: metaMap[k].size })),
        vp,
      );
      return { ...(fallback[id] || { x: vp.width - size.width - 16, y: vp.height - size.height - 16 }), ...size };
    }
    return { x: pos.x, y: pos.y, width: size.width, height: size.height };
  }, [positions, metaMap, viewport]);

  const getPanelPlacement = useCallback((id, panelSize) => {
    const anchorRect = getWidgetAnchorRect(id);
    return computeFloatingPanelPlacement(anchorRect, panelSize, viewport);
  }, [getWidgetAnchorRect, viewport]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame = 0;
    const onResize = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const vp = readViewport();
        const nextBucket = getViewportBucket(vp);
        if (nextBucket !== bucketRef.current) {
          bucketRef.current = nextBucket;
          positionsRef.current = typeof window !== 'undefined'
            ? readPersistedPositions(window.localStorage, FLOATING_WIDGET_STORAGE_KEY, nextBucket)
            : {};
        }
        setViewport(vp);
        recomputeLayout(metaRef.current, vp);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [recomputeLayout]);

  const value = useMemo(() => ({
    viewport,
    positions,
    activeDragId,
    setActiveDragId,
    registerWidget,
    unregisterWidget,
    moveWidget,
    nudgeWidget,
    resetPositions,
    getWidgetAnchorRect,
    getPanelPlacement,
  }), [
    viewport,
    positions,
    activeDragId,
    registerWidget,
    unregisterWidget,
    moveWidget,
    nudgeWidget,
    resetPositions,
    getWidgetAnchorRect,
    getPanelPlacement,
  ]);

  return (
    <FloatingWidgetContext.Provider value={value}>
      {children}
    </FloatingWidgetContext.Provider>
  );
}
