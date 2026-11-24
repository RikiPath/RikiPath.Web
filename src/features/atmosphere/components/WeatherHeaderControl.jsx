import { Popover, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { weatherLabel } from '../atmosphereLogic.js';
import { iconForScene } from '../engine/weatherIcon.js';
import WeatherIcon from './WeatherIcon.jsx';
import WeatherSettings from './WeatherSettings.jsx';

/** Header entry point: compact chip that opens the atmosphere control center. */
export default function WeatherHeaderControl({ atmosphere }) {
  const { tr } = useLocale();
  const { scene, weatherStatus } = atmosphere;
  const live = weatherStatus === 'ready' && scene.live;
  const icon = iconForScene(scene);
  const place = scene.place?.source === 'location' ? scene.place.name : '';
  const temp = live ? Math.round(scene.weather.temperature) : null;
  const summary = live ? `${temp}°C, ${tr(weatherLabel(scene.weather))}${place ? `, ${place}` : ''}` : '';
  return (
    <Popover
      label={tr('Cài đặt bầu trời và thời tiết')}
      panelClassName="flex max-h-[min(82vh,calc(100dvh_-_80px),720px)] flex-col overflow-hidden"
      trigger={({ toggle, props, open }) => (
        <button
          {...props}
          type="button"
          onClick={toggle}
          aria-label={`${tr('Bầu trời & thời tiết')}: ${summary || tr(icon.label)}`}
          className={cx(
            'rp-focus rp-hc rp-sky-control relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold transition-colors',
            open ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong' : 'border-rp-line bg-rp-surface/80 text-rp-text-2 hover:border-rp-brand-border hover:text-rp-text',
          )}
        >
          <WeatherIcon icon={icon} animate={!scene.off} />
          {live && (
            <span className="hidden items-center gap-1 tabular-nums md:inline-flex">
              {temp}°
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
