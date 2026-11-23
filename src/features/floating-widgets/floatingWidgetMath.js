/**
 * Pure geometry, viewport clamping, default layout, panel quadrant placement,
 * storage serialization, and deterministic collision avoidance for floating docks
 * (`FloatingNotebookWidget` & `FloatingSakuraCompanion`).
 */

export const WIDGET_GAP_PX = 20;
export const EDGE_MARGIN_PX = 16;
export const DEFAULT_TOP_SAFE_PX = 76;
export const DRAG_THRESHOLD_PX = 6;
export const FLOATING_WIDGET_STORAGE_KEY = 'rikipath.floatingWidgets.v1';

const EMPTY_SIZE = { width: 64, height: 64 };

export function normalizeSize(size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.ceil(width) : EMPTY_SIZE.width,
    height: Number.isFinite(height) && height > 0 ? Math.ceil(height) : EMPTY_SIZE.height,
  };
}

export function getViewportBounds({
  viewportWidth = 1280,
  viewportHeight = 720,
  marginPx = EDGE_MARGIN_PX,
  topSafePx = DEFAULT_TOP_SAFE_PX,
} = {}) {
  const w = Math.max(240, Number(viewportWidth) || 1280);
  const h = Math.max(240, Number(viewportHeight) || 720);
  return {
    minX: marginPx,
    maxX: Math.max(marginPx, w - marginPx),
    minY: Math.min(Math.max(marginPx, topSafePx), Math.max(marginPx, h - marginPx - 48)),
    maxY: Math.max(marginPx, h - marginPx),
    viewportWidth: w,
    viewportHeight: h,
  };
}

export function clampWidgetPosition(pos, size, viewport, opts = {}) {
  const s = normalizeSize(size);
  const bounds = getViewportBounds({
    viewportWidth: viewport?.width,
    viewportHeight: viewport?.height,
    marginPx: opts.marginPx,
    topSafePx: opts.topSafePx,
  });
  const maxX = Math.max(bounds.minX, bounds.maxX - s.width);
  const maxY = Math.max(bounds.minY, bounds.maxY - s.height);
  const rawX = Number(pos?.x);
  const rawY = Number(pos?.y);
  return {
    x: Math.round(Math.min(Math.max(Number.isFinite(rawX) ? rawX : maxX, bounds.minX), maxX)),
    y: Math.round(Math.min(Math.max(Number.isFinite(rawY) ? rawY : maxY, bounds.minY), maxY)),
  };
}

export function rectsOverlapWithGap(rectA, rectB, gap = WIDGET_GAP_PX) {
  if (!rectA || !rectB) return false;
  return !(
    rectA.x + rectA.width + gap <= rectB.x ||
    rectB.x + rectB.width + gap <= rectA.x ||
    rectA.y + rectA.height + gap <= rectB.y ||
    rectB.y + rectB.height + gap <= rectA.y
  );
}

function makeRect(pos, size) {
  const s = normalizeSize(size);
  return { x: pos.x, y: pos.y, width: s.width, height: s.height };
}

function distSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function candidatePositionsAround(anchorRect, targetSize, viewport, gap, opts) {
  const s = normalizeSize(targetSize);
  const rawCandidates = [
    { x: anchorRect.x - gap - s.width, y: targetSize._desiredY ?? anchorRect.y }, // left
    { x: anchorRect.x + anchorRect.width + gap, y: targetSize._desiredY ?? anchorRect.y }, // right
    { x: targetSize._desiredX ?? anchorRect.x, y: anchorRect.y - gap - s.height }, // above
    { x: targetSize._desiredX ?? anchorRect.x, y: anchorRect.y + anchorRect.height + gap }, // below
    // corner diagonals if straight push still collides at viewport wall
    { x: anchorRect.x - gap - s.width, y: anchorRect.y + anchorRect.height - s.height },
    { x: anchorRect.x + anchorRect.width + gap, y: anchorRect.y + anchorRect.height - s.height },
    { x: anchorRect.x + anchorRect.width - s.width, y: anchorRect.y - gap - s.height },
    { x: anchorRect.x, y: anchorRect.y - gap - s.height },
  ];
  return rawCandidates.map((c) => clampWidgetPosition(c, s, viewport, opts));
}

/**
 * Computes default bottom-right horizontal dock positions (falling back to upward stacking
 * if the viewport is ultra-narrow) so every registered widget renders with >= gap clearance.
 */
export function computeDefaultPositions(specs = [], viewport = { width: 1280, height: 720 }, opts = {}) {
  const gap = opts.gap ?? WIDGET_GAP_PX;
  const marginPx = opts.marginPx ?? EDGE_MARGIN_PX;
  const bounds = getViewportBounds({
    viewportWidth: viewport?.width,
    viewportHeight: viewport?.height,
    marginPx,
    topSafePx: opts.topSafePx,
  });

  const sorted = [...specs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const result = {};
  let cursorRight = bounds.maxX;
  let rowBottom = bounds.maxY;
  let rowTallest = 0;

  for (const spec of sorted) {
    const s = normalizeSize(spec.size);
    let x = cursorRight - s.width;
    let y = rowBottom - s.height;

    if (x < bounds.minX) {
      rowBottom = Math.max(bounds.minY + s.height, rowBottom - rowTallest - gap);
      cursorRight = bounds.maxX;
      rowTallest = 0;
      x = cursorRight - s.width;
      y = rowBottom - s.height;
    }

    result[spec.id] = clampWidgetPosition({ x, y }, s, viewport, opts);
    cursorRight = result[spec.id].x - gap;
    rowTallest = Math.max(rowTallest, s.height);
  }

  return result;
}

/**
 * Deterministically eliminates overlap while enforcing >= `gap` clearance between all widgets
 * inside clamped viewport bounds.
 */
export function resolveWidgetCollision({
  movedId = null,
  positions = {},
  sizes = {},
  viewport = { width: 1280, height: 720 },
  gap = WIDGET_GAP_PX,
  marginPx = EDGE_MARGIN_PX,
  topSafePx = DEFAULT_TOP_SAFE_PX,
} = {}) {
  const opts = { marginPx, topSafePx };
  const ids = Object.keys(sizes);
  if (ids.length === 0) return {};

  const next = {};
  for (const id of ids) {
    next[id] = clampWidgetPosition(positions[id], sizes[id], viewport, opts);
  }
  if (ids.length === 1) return next;

  const anchorOrder = movedId && ids.includes(movedId)
    ? [movedId, ...ids.filter((id) => id !== movedId)]
    : ids;

  const primaryId = anchorOrder[0];
  for (let i = 1; i < anchorOrder.length; i += 1) {
    const movingOtherId = anchorOrder[i];
    const placedRects = anchorOrder.slice(0, i).map((pid) => makeRect(next[pid], sizes[pid]));
    const currentRect = makeRect(next[movingOtherId], sizes[movingOtherId]);
    const collides = placedRects.some((r) => rectsOverlapWithGap(currentRect, r, gap));
    if (!collides) continue;

    // Collect valid candidates around each blocker and pick nearest valid slot to original coordinate
    const desired = next[movingOtherId];
    const sizeWithDesired = {
      ...normalizeSize(sizes[movingOtherId]),
      _desiredX: desired.x,
      _desiredY: desired.y,
    };

    const validCandidates = [];
    for (const blocker of placedRects) {
      for (const candidate of candidatePositionsAround(blocker, sizeWithDesired, viewport, gap, opts)) {
        const testRect = makeRect(candidate, sizes[movingOtherId]);
        if (!placedRects.some((r) => rectsOverlapWithGap(testRect, r, gap))) {
          validCandidates.push(candidate);
        }
      }
    }

    if (validCandidates.length > 0) {
      validCandidates.sort((a, b) => distSq(a, desired) - distSq(b, desired));
      next[movingOtherId] = validCandidates[0];
    } else if (movingOtherId !== primaryId) {
      // If secondary could not avoid corner wall around primary, slide primary instead
      const otherRect = makeRect(next[movingOtherId], sizes[movingOtherId]);
      const primaryDesired = next[primaryId];
      const primaryCandidates = candidatePositionsAround(
        otherRect,
        { ...normalizeSize(sizes[primaryId]), _desiredX: primaryDesired.x, _desiredY: primaryDesired.y },
        viewport,
        gap,
        opts,
      ).filter((c) => !rectsOverlapWithGap(makeRect(c, sizes[primaryId]), otherRect, gap));

      if (primaryCandidates.length > 0) {
        primaryCandidates.sort((a, b) => distSq(a, primaryDesired) - distSq(b, primaryDesired));
        next[primaryId] = primaryCandidates[0];
      } else {
        const fallback = computeDefaultPositions(
          ids.map((id, order) => ({ id, order, size: sizes[id] })),
          viewport,
          { gap, marginPx, topSafePx },
        );
        return fallback;
      }
    }
  }

  return next;
}

/**
 * Computes fixed-viewport placement `{ left, top, openUpward, arrowOffsetX }` for an expanded
 * popover, speech bubble, or drawer relative to any dragged trigger rectangle.
 */
export function computeFloatingPanelPlacement(
  anchorRect,
  panelSize,
  viewport = { width: 1280, height: 720 },
  { gap = 12, marginPx = 12, topSafePx = DEFAULT_TOP_SAFE_PX } = {},
) {
  const anchor = {
    x: Number(anchorRect?.x) || 0,
    y: Number(anchorRect?.y) || 0,
    width: Math.max(40, Number(anchorRect?.width) || 64),
    height: Math.max(40, Number(anchorRect?.height) || 64),
  };
  const vw = Math.max(280, Number(viewport?.width) || 1280);
  const vh = Math.max(320, Number(viewport?.height) || 720);
  const panelW = Math.min(vw - marginPx * 2, Math.max(200, Number(panelSize?.width) || 320));
  const panelH = Math.min(vh - topSafePx - marginPx, Math.max(120, Number(panelSize?.height) || 360));

  const anchorCenterX = anchor.x + anchor.width / 2;
  const preferredLeft = anchor.x + anchor.width - panelW;
  const maxLeft = Math.max(marginPx, vw - marginPx - panelW);
  const left = Math.round(Math.min(Math.max(preferredLeft, marginPx), maxLeft));

  const spaceAbove = anchor.y - topSafePx - gap;
  const spaceBelow = vh - marginPx - (anchor.y + anchor.height + gap);
  const openUpward = spaceAbove >= Math.min(panelH, 240) || spaceAbove >= spaceBelow;

  let top;
  if (openUpward) {
    top = Math.round(Math.max(topSafePx, anchor.y - gap - panelH));
  } else {
    const maxTop = Math.max(topSafePx, vh - marginPx - panelH);
    top = Math.round(Math.min(anchor.y + anchor.height + gap, maxTop));
  }

  const arrowOffsetX = Math.round(
    Math.min(Math.max(anchorCenterX - left, 20), Math.max(20, panelW - 20)),
  );

  return {
    left,
    top,
    width: Math.round(panelW),
    maxHeight: Math.round(
      Math.max(180, openUpward ? anchor.y - gap - topSafePx : vh - marginPx - (anchor.y + anchor.height + gap)),
    ),
    openUpward,
    arrowOffsetX,
  };
}

export function getViewportBucket(viewport) {
  const width = Number(viewport?.width);
  return Number.isFinite(width) && width > 0 && width < 768 ? 'mobile' : 'desktop';
}

function sanitizeCoordMap(rawMap) {
  if (!rawMap || typeof rawMap !== 'object') return {};
  const clean = {};
  for (const [id, coord] of Object.entries(rawMap)) {
    const x = Number(coord?.x);
    const y = Number(coord?.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      clean[id] = { x: Math.round(x), y: Math.round(y) };
    }
  }
  return clean;
}

export function readPersistedPositions(storage, key = FLOATING_WIDGET_STORAGE_KEY, bucket = null) {
  if (!storage || typeof storage.getItem !== 'function') return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    if (!bucket) {
      return sanitizeCoordMap(parsed);
    }
    if (parsed[bucket] && typeof parsed[bucket] === 'object') {
      return sanitizeCoordMap(parsed[bucket]);
    }
    // Migrate legacy flat { riki, notebook } format for desktop only; mobile starts clean bottom-right.
    if (bucket === 'desktop' && (parsed.riki || parsed.notebook)) {
      return sanitizeCoordMap(parsed);
    }
    return {};
  } catch {
    return {};
  }
}

export function writePersistedPositions(storage, positions, key = FLOATING_WIDGET_STORAGE_KEY, bucket = null) {
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    const clean = sanitizeCoordMap(positions);
    if (!bucket) {
      storage.setItem(key, JSON.stringify(clean));
      return;
    }
    let existing = {};
    try {
      const raw = storage.getItem?.(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        if (parsed.desktop && typeof parsed.desktop === 'object') {
          existing.desktop = sanitizeCoordMap(parsed.desktop);
        }
        if (parsed.mobile && typeof parsed.mobile === 'object') {
          existing.mobile = sanitizeCoordMap(parsed.mobile);
        }
      }
    } catch {
      existing = {};
    }
    storage.setItem(key, JSON.stringify({ ...existing, [bucket]: clean }));
  } catch {
    // Ignore storage quota or sandbox restriction errors.
  }
}
