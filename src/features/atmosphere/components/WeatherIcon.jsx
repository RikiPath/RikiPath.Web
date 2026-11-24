import { createElement } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudOff,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Cloudy,
  MoonStar,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from 'lucide-react';
import { cx } from '@/components/ui';

const ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  'cloud-moon': CloudMoon,
  cloud: Cloud,
  cloudy: Cloudy,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  'rain-wind': CloudRainWind,
  thunder: CloudLightning,
  snow: CloudSnow,
  fog: CloudFog,
  'moon-star': MoonStar,
  sunrise: Sunrise,
  sunset: Sunset,
  off: CloudOff,
};

/**
 * Semantic weather glyph (Lucide) with a fixed box, tone colour and a very light CSS micro-animation.
 * The wrapper is keyed by icon so a state change plays a short entrance instead of popping; size never changes.
 * Decorative by default (the control around it carries the accessible name).
 * @param {{ icon: { key: string, tone: string, supplement?: 'wind'|null }, size?: 'sm'|'md'|'lg', animate?: boolean, className?: string }} props
 */
export default function WeatherIcon({ icon, size = 'md', animate = true, className }) {
  const glyph = ICONS[icon?.key] || Sun;
  const box = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span
      key={icon?.key}
      aria-hidden="true"
      className={cx('rp-wx-icon relative inline-grid shrink-0 place-items-center', box, className)}
      data-icon={icon?.key}
      data-tone={icon?.tone}
      data-animate={animate ? 'true' : 'false'}
    >
      {createElement(glyph, { className: 'relative h-full w-full', strokeWidth: 2 })}
      {icon?.supplement === 'wind' && (
        <span className="rp-wx-wind absolute -bottom-1 -right-1.5 grid h-3 w-3 place-items-center rounded-full">
          <Wind className="h-2.5 w-2.5" strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}
