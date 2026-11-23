function range(start, end) {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
}

/**
 * Computes compact, non-redundant page number tokens without ever collapsing
 * a single hidden page into an ellipsis.
 *
 * Rules:
 * - <= 5 pages: show every page directly (no ellipsis).
 * - >= 6 pages: collapse gaps of 2+ hidden pages with '...' based on siblingCount.
 */
export function getPaginationRange(currentPage = 1, totalPages = 1, siblingCount = 1) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  if (safeTotal <= 1) return [1];

  const safeCurrent = Math.max(1, Math.min(Number(currentPage) || 1, safeTotal));
  const siblings = Math.max(0, Number(siblingCount) || 0);

  if (safeTotal <= 5) {
    return range(1, safeTotal);
  }

  if (siblings === 0) {
    if (safeCurrent <= 2) {
      const leftEnd = safeCurrent === 1 ? 2 : 3;
      return leftEnd >= safeTotal - 2
        ? range(1, safeTotal)
        : [...range(1, leftEnd), '...', safeTotal];
    }
    if (safeCurrent >= safeTotal - 1) {
      const rightStart = safeCurrent === safeTotal ? safeTotal - 1 : safeTotal - 2;
      return rightStart <= 3
        ? range(1, safeTotal)
        : [1, '...', ...range(rightStart, safeTotal)];
    }
    let left = Math.max(2, safeCurrent);
    let right = Math.min(safeTotal - 1, safeCurrent);
    if (left <= 3) left = 2;
    if (right >= safeTotal - 2) right = safeTotal - 1;
    const hasLeftDots = left > 2;
    const hasRightDots = right < safeTotal - 1;
    return [
      1,
      ...(hasLeftDots ? ['...'] : []),
      ...range(left, right),
      ...(hasRightDots ? ['...'] : []),
      safeTotal,
    ];
  }

  const edgeAnchor = siblings + 2;
  if (safeCurrent <= siblings + 1) {
    return edgeAnchor >= safeTotal - 2
      ? range(1, safeTotal)
      : [...range(1, edgeAnchor), '...', safeTotal];
  }

  if (safeCurrent >= safeTotal - siblings) {
    const rightStart = safeTotal - edgeAnchor + 1;
    return rightStart <= 3
      ? range(1, safeTotal)
      : [1, '...', ...range(rightStart, safeTotal)];
  }

  let left = Math.max(2, safeCurrent - siblings);
  let right = Math.min(safeTotal - 1, safeCurrent + siblings);
  if (left <= 3) left = 2;
  if (right >= safeTotal - 2) right = safeTotal - 1;

  const hasLeftDots = left > 2;
  const hasRightDots = right < safeTotal - 1;
  return [
    1,
    ...(hasLeftDots ? ['...'] : []),
    ...range(left, right),
    ...(hasRightDots ? ['...'] : []),
    safeTotal,
  ];
}

/**
 * Unified smart pagination view-model shared by all RikiPath screens.
 */
export function getSmartPaginationModel({
  currentPage = 1,
  totalPages = 1,
  compact = false,
  siblingCount,
  showFirstLast = true,
  showPageJump = true,
} = {}) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  if (safeTotalPages <= 1) {
    return {
      visible: false,
      currentPage: 1,
      totalPages: safeTotalPages,
      items: [],
      showFirst: false,
      showLast: false,
      canPrev: false,
      canNext: false,
      showJump: false,
    };
  }

  const safeCurrentPage = Math.max(1, Math.min(Number(currentPage) || 1, safeTotalPages));
  const resolvedSiblings =
    typeof siblingCount === 'number' && siblingCount >= 0
      ? siblingCount
      : compact
        ? 0
        : 1;

  const items = getPaginationRange(safeCurrentPage, safeTotalPages, resolvedSiblings);
  const isLongList = safeTotalPages >= 6;
  const hasLeftEllipsis = items[1] === '...';
  const hasRightEllipsis = items[items.length - 2] === '...';

  return {
    visible: true,
    currentPage: safeCurrentPage,
    totalPages: safeTotalPages,
    items,
    showFirst: Boolean(showFirstLast && isLongList && hasLeftEllipsis),
    showLast: Boolean(showFirstLast && isLongList && hasRightEllipsis),
    canPrev: safeCurrentPage > 1,
    canNext: safeCurrentPage < safeTotalPages,
    showJump: Boolean(showPageJump && isLongList),
  };
}
