// Seasonal decoration — independent of weather and always labelled as an ESTIMATE.
// Bloom / foliage windows are coarse latitude rules (calibrated on typical Japanese/East-Asian dates); they decorate,
// they never claim that blossoms or leaves are really out today.

export const SEASONAL_PREFS = ['auto', 'on', 'off'];

export const SEASON_LABEL = {
  spring: 'Mùa xuân',
  summer: 'Mùa hè',
  autumn: 'Mùa thu',
  winter: 'Mùa đông',
  tropical: 'Khí hậu nhiệt đới',
};

/** Meteorological season by hemisphere; |lat| < 23.5 is treated as tropical (no four-season decoration). */
export function seasonFor(latitude, month) {
  if (!Number.isFinite(latitude)) return null;
  if (Math.abs(latitude) < 23.5) return 'tropical';
  const m = latitude >= 0 ? month : ((month + 5) % 12) + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/** Estimated sakura window (day-of-year) for the northern hemisphere, or null where cherry season is not typical. */
export function sakuraWindow(latitude) {
  if (!Number.isFinite(latitude) || latitude < 24 || latitude > 46) return null;
  if (latitude < 27.5) return { start: 20, end: 55 }; // Okinawa / Taiwan: late Jan – Feb
  const bloom = latitude <= 36 ? 85 - (36 - latitude) * 0.5 : 85 + (latitude - 36) * 4.3;
  return { start: Math.round(bloom - 2), end: Math.round(bloom + 16) };
}

/** Estimated autumn-foliage window (day-of-year), northern temperate zone only. */
export function foliageWindow(latitude) {
  if (!Number.isFinite(latitude) || latitude < 30 || latitude > 56) return null;
  const peak = latitude > 45 ? 296 : 326 - (latitude - 35.7) * 4;
  return { start: Math.round(peak - 20), end: Math.round(peak + 12) };
}

const inWindow = (doy, w) => Boolean(w) && doy >= w.start && doy <= w.end;

/**
 * @param {{ latitude?: number|null, month: number, dayOfYear: number, pref: 'auto'|'on'|'off' }} input
 * @returns {{ season: string|null, decoration: 'sakura'|'leaves'|null, estimated: true, reason: string }}
 */
export function seasonalContext({ latitude, month, dayOfYear, pref = 'auto' }) {
  const lat = Number.isFinite(latitude) ? latitude : null;
  const season = lat === null ? null : seasonFor(lat, month);
  if (pref === 'off') return { season, decoration: null, estimated: true, reason: 'off' };
  if (pref === 'on') {
    // Artistic decoration chosen by the user: autumn leaves in temperate autumn, brand sakura otherwise.
    return { season, decoration: season === 'autumn' ? 'leaves' : 'sakura', estimated: true, reason: 'forced' };
  }
  if (lat === null) return { season, decoration: null, estimated: true, reason: 'no-location' };
  if (lat >= 0 && inWindow(dayOfYear, sakuraWindow(lat))) return { season, decoration: 'sakura', estimated: true, reason: 'sakura-window' };
  if (lat >= 0 && inWindow(dayOfYear, foliageWindow(lat))) return { season, decoration: 'leaves', estimated: true, reason: 'foliage-window' };
  return { season, decoration: null, estimated: true, reason: 'out-of-season' };
}
