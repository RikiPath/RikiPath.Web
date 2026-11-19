import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Popover, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { CONDITION_LABEL, conditionForWeather } from '../atmosphereLogic.js';
import WeatherSettings from './WeatherSettings.jsx';

function sceneIcon(scene, live) {
  if (scene.period === 'off') return SlidersHorizontal;
  const night = scene.period === 'night' || scene.daylight === false;
  if (!live) return night ? Moon : scene.period === 'evening' ? CloudSun : Sun;
  switch (scene.condition) {
    case 'rain': return CloudRain;
    case 'thunder': return CloudLightning;
    case 'snow': return CloudSnow;
    case 'fog': return CloudFog;
    case 'cloudy': return Cloud;
    case 'partly': return night ? CloudMoon : CloudSun;
    default: return night ? Moon : Sun;
  }
}

/** Header entry point: compact chip that opens the atmosphere settings popover. */
export default function WeatherHeaderControl({ atmosphere }) {
  const { tr } = useLocale();
  const { scene, weather, weatherStatus, prefs } = atmosphere;
  const live = weatherStatus === 'ready';
  const Icon = sceneIcon(scene, live);
  const place = prefs.location?.name;
  const summary = live
    ? `${Math.round(weather.temperature)}°C, ${tr(CONDITION_LABEL[conditionForWeather(weather.weatherCode, weather.cloudCover)])}${place ? `, ${place}` : ''}`
    : '';
  return (
    <Popover
      label={tr('Cài đặt bầu trời và thời tiết')}
      panelClassName="max-h-[min(78vh,640px)] overflow-y-auto"
      trigger={({ toggle, props, open }) => (
        <button
          {...props}
          type="button"
          onClick={toggle}
          aria-label={`${tr('Bầu trời & thời tiết')}${summary ? `: ${summary}` : ''}`}
          className={cx(
            'rp-focus rp-sky-control inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold transition-colors',
            open ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong' : 'border-rp-line bg-rp-surface/80 text-rp-text-2 hover:border-rp-brand-border hover:text-rp-text',
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          {live && (
            <span className="hidden items-center gap-1 tabular-nums md:inline-flex">
              {Math.round(weather.temperature)}°
              {place && <span className="hidden max-w-[110px] truncate font-medium text-rp-text-muted xl:inline">{place}</span>}
            </span>
          )}
        </button>
      )}
    >
      <WeatherSettings atmosphere={atmosphere} />
    </Popover>
  );
}
