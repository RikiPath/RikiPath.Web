const OCCUPANCY_STOPS = Object.freeze([
  { at: 0.25, rgb: [34, 197, 94] }, // Green (#22C55E)
  { at: 0.5, rgb: [234, 179, 8] }, // Yellow (#EAB308)
  { at: 0.75, rgb: [249, 115, 22] }, // Orange (#F97316)
  { at: 1, rgb: [239, 68, 68] }, // Red (#EF4444)
]);

function lerpRgb(from, to, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Computes a single smooth solid color from green -> yellow -> orange -> red
 * based on occupancyRate = enrolledCount / capacity (null when empty so track stays neutral).
 */
export function interpolateOccupancyColor(enrolledCount, capacity) {
  const cap = Number(capacity) || 0;
  const enrolled = Math.max(0, Number(enrolledCount) || 0);
  if (cap <= 0 || enrolled <= 0) return null;

  const rate = Math.max(0, Math.min(1, enrolled / cap));
  if (rate <= OCCUPANCY_STOPS[0].at) {
    const [r, g, b] = OCCUPANCY_STOPS[0].rgb;
    return `rgb(${r}, ${g}, ${b})`;
  }

  for (let i = 1; i < OCCUPANCY_STOPS.length; i += 1) {
    const prev = OCCUPANCY_STOPS[i - 1];
    const next = OCCUPANCY_STOPS[i];
    if (rate <= next.at) {
      const span = next.at - prev.at;
      const t = span > 0 ? (rate - prev.at) / span : 1;
      return lerpRgb(prev.rgb, next.rgb, t);
    }
  }

  const [r, g, b] = OCCUPANCY_STOPS[OCCUPANCY_STOPS.length - 1].rgb;
  return `rgb(${r}, ${g}, ${b})`;
}
