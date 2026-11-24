// Development scene preview (simulated data). Shown only in development builds and always labelled "Mô phỏng";
// none of these values is ever presented as current weather.

const TOKYO = { name: 'Tokyo', region: 'Tokyo', country: 'Nhật Bản', latitude: 35.68, longitude: 139.69, timezone: 'Asia/Tokyo', source: 'search' };
const HANOI = { name: 'Hà Nội', region: 'Hà Nội', country: 'Việt Nam', latitude: 21.03, longitude: 105.85, timezone: 'Asia/Ho_Chi_Minh', source: 'search' };

const wx = (at, tz, fields) => ({
  temperature: 20,
  weatherCode: 0,
  cloudCover: 10,
  isDay: true,
  precipitation: 0,
  rain: 0,
  showers: 0,
  snowfall: 0,
  windSpeed: 8,
  windDirection: 250,
  humidity: 60,
  timezone: tz,
  observedAt: at.slice(0, 16),
  ...fields,
});

export const SCENE_PRESETS = [
  { id: 'tokyo-spring-morning', label: 'Tokyo · Xuân · Sáng · Trời quang', mode: 'weather', location: TOKYO, at: '2026-04-02T08:10:00+09:00', weather: { temperature: 14, weatherCode: 0, cloudCover: 8, windSpeed: 9, windDirection: 200 } },
  { id: 'tokyo-noon-partly', label: 'Tokyo · Trưa · Có mây rải rác', mode: 'weather', location: TOKYO, at: '2026-05-14T12:20:00+09:00', weather: { temperature: 23, weatherCode: 2, cloudCover: 45, windSpeed: 14, windDirection: 160 } },
  { id: 'tokyo-sunset', label: 'Tokyo · Hoàng hôn · Trời quang', mode: 'weather', location: TOKYO, at: '2026-10-10T17:05:00+09:00', weather: { temperature: 19, weatherCode: 1, cloudCover: 18, windSpeed: 7, windDirection: 40 } },
  { id: 'tokyo-rain', label: 'Tokyo · Chiều · Mưa vừa', mode: 'weather', location: TOKYO, at: '2026-06-18T15:00:00+09:00', weather: { temperature: 21, weatherCode: 63, cloudCover: 96, precipitation: 3.4, rain: 3.4, windSpeed: 18, windDirection: 90 } },
  { id: 'tokyo-spring-rain-wind', label: 'Tokyo · Xuân · Mưa nhẹ · Gió mạnh', mode: 'weather', location: TOKYO, at: '2026-04-04T11:30:00+09:00', weather: { temperature: 12, weatherCode: 61, cloudCover: 92, precipitation: 0.8, rain: 0.8, windSpeed: 46, windDirection: 260 } },
  { id: 'tokyo-thunder', label: 'Tokyo · Dông', mode: 'weather', location: TOKYO, at: '2026-08-20T16:30:00+09:00', weather: { temperature: 27, weatherCode: 95, cloudCover: 100, precipitation: 8.2, rain: 8.2, windSpeed: 28, windDirection: 180 } },
  { id: 'tokyo-winter-snow', label: 'Tokyo · Đông · Đêm · Tuyết', mode: 'weather', location: TOKYO, at: '2026-01-22T21:30:00+09:00', weather: { temperature: -1, weatherCode: 73, cloudCover: 100, snowfall: 1.2, precipitation: 1.2, windSpeed: 10, windDirection: 330, isDay: false } },
  { id: 'tokyo-night-clear', label: 'Tokyo · Đêm · Trời quang', mode: 'weather', location: TOKYO, at: '2026-11-20T22:40:00+09:00', weather: { temperature: 11, weatherCode: 0, cloudCover: 5, isDay: false } },
  { id: 'tokyo-night-overcast', label: 'Tokyo · Khuya · Trời u ám', mode: 'weather', location: TOKYO, at: '2026-11-20T23:30:00+09:00', weather: { temperature: 10, weatherCode: 3, cloudCover: 100, isDay: false } },
  { id: 'hanoi-summer-noon', label: 'Hà Nội · Hè · Trưa · Nhiều mây', mode: 'weather', location: HANOI, at: '2026-06-24T12:10:00+07:00', weather: { temperature: 34, weatherCode: 2, cloudCover: 72, windSpeed: 10, windDirection: 135, humidity: 70 } },
  { id: 'hanoi-fog', label: 'Hà Nội · Sáng · Sương mù', mode: 'weather', location: HANOI, at: '2026-12-28T07:20:00+07:00', weather: { temperature: 15, weatherCode: 45, cloudCover: 85, windSpeed: 4, humidity: 98 } },
  { id: 'tokyo-strong-wind', label: 'Tokyo · Thu · Gió mạnh', mode: 'weather', location: TOKYO, at: '2026-11-24T14:00:00+09:00', weather: { temperature: 13, weatherCode: 2, cloudCover: 40, windSpeed: 58, windDirection: 315 } },
  { id: 'weather-unavailable', label: 'Dịch vụ thời tiết không khả dụng', mode: 'weather', location: TOKYO, at: '2026-05-14T09:00:00+09:00', weather: null, unavailable: true },
  { id: 'sky-only', label: 'Chỉ bầu trời · Tokyo · Sáng xuân', mode: 'sky', location: TOKYO, at: '2026-04-02T08:10:00+09:00', weather: null },
  { id: 'disabled', label: 'Tắt hiệu ứng', mode: 'off', location: TOKYO, at: '2026-04-02T08:10:00+09:00', weather: null },
];

/** Expanded preset → inputs for resolveScene + the status the popover should show. */
export function presetInputs(preset) {
  const tz = preset.location?.timezone || '';
  return {
    mode: preset.mode,
    location: preset.location,
    now: new Date(preset.at),
    weather: preset.weather ? wx(preset.at, tz, preset.weather) : null,
    weatherStatus: preset.mode !== 'weather' ? 'disabled' : preset.unavailable ? 'error' : 'ready',
  };
}
