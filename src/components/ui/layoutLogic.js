export const CONTAINER_WIDTHS = Object.freeze({
  narrow: 'rp-container-narrow',
  reading: 'rp-container-reading',
  default: 'rp-container',
  wide: 'rp-container-wide',
  full: 'rp-container-full',
});

export const DENSITY_LEVELS = Object.freeze(['compact', 'comfortable', 'spacious']);

export const GRID_MIN_PRESETS = Object.freeze({
  xs: '10.5rem',
  sm: '13.5rem',
  md: '16.5rem',
  lg: '20rem',
  xl: '24rem',
});

export function normalizeDensity(density) {
  return DENSITY_LEVELS.includes(density) ? density : 'comfortable';
}

export function getContainerClass(width = 'default') {
  return CONTAINER_WIDTHS[width] || CONTAINER_WIDTHS.default;
}

export function getFluidGridStyle(minItemWidth = 'md', extraStyle) {
  const resolved = GRID_MIN_PRESETS[minItemWidth] || minItemWidth || GRID_MIN_PRESETS.md;
  return {
    ...(extraStyle || {}),
    '--rp-grid-min': resolved,
  };
}

export function getColumnPriorityClass(priority) {
  if (priority === 'secondary' || priority === 'medium') return 'hidden sm:table-cell';
  if (priority === 'optional' || priority === 'low') return 'hidden lg:table-cell';
  return '';
}
