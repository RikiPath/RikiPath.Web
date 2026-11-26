import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Droplets,
  Leaf,
  LoaderCircle,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  Wind,
  X,
} from 'lucide-react';
import { cx } from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { PERIOD_LABEL, coarsen, weatherLabel } from '../atmosphereLogic.js';
import { detectApproximateLocation, reverseGeocode, searchCities } from '../weatherService.js';
import { iconForScene, modeIcons } from '../engine/weatherIcon.js';
import WeatherIcon from './WeatherIcon.jsx';

const MODES = [
  { value: 'weather', label: 'Bầu trời + thời tiết', hint: 'Bầu trời sống động theo thời tiết thực tế.' },
  { value: 'sky', label: 'Chỉ bầu trời', hint: 'Bầu trời thay đổi theo giờ địa phương.' },
  { value: 'off', label: 'Tắt hoàn toàn', hint: 'Tắt hiệu ứng, sử dụng header mặc định.' },
];
const LEVELS = [
  { value: 'low', label: 'Nhẹ' },
  { value: 'medium', label: 'Vừa' },
  { value: 'high', label: 'Mạnh' },
];
const SEASONAL = [
  { value: 'auto', label: 'Tự động' },
  { value: 'on', label: 'Bật' },
  { value: 'off', label: 'Tắt' },
];
const FRESHNESS = {
  live: { label: 'Trực tiếp', tone: 'bg-rp-success-bg text-rp-success border-rp-success-line' },
  cached: { label: 'Dữ liệu đã lưu', tone: 'bg-rp-muted text-rp-text-2 border-rp-line' },
};

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

const unique = (list) => list.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
function formatPlace(loc) {
  return unique([loc.name, loc.region, loc.country]).join(', ');
}

/** Wall-clock time in the place's zone (never the device zone for another place). */
function clock(date, timeZone) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(currentIntlTag(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timeZone || undefined }).format(date);
  } catch {
    return '';
  }
}

function SectionTitle({ children, id }) {
  return (
    <p id={id} className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">
      {children}
    </p>
  );
}

function Segmented({ options, value, onChange, label, tr, disabled }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('grid grid-cols-3 gap-1 rounded-full bg-rp-muted p-1', disabled && 'opacity-50')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cx(
            'rp-focus min-h-8 rounded-full px-2 py-1.5 text-[12px] font-semibold transition-colors',
            value === o.value ? 'bg-rp-surface text-rp-brand-strong shadow-rp-xs' : 'text-rp-text-2 hover:text-rp-text',
          )}
        >
          {tr(o.label)}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ header: place · local time · weather · data status */
function SkyHeader({ atmosphere, tr, trf }) {
  const { scene, weatherStatus, freshness, refetchWeather, refreshing } = atmosphere;
  const icon = iconForScene(scene);
  const zone = scene.place.timeZone;
  const localTime = clock(scene.at, zone);
  const live = weatherStatus === 'ready' && scene.live;
  const w = scene.weather;

  let placeLine;
  if (scene.place.source === 'location') placeLine = unique([scene.place.name, scene.place.country]).join(', ');
  else if (scene.place.source === 'zone') placeLine = tr('Theo múi giờ thiết bị');
  else placeLine = tr('Theo giờ thiết bị');

  const phase = scene.solar?.phase;
  const lightLabel = phase === 'twilight' || phase === 'golden' ? (scene.solar.afternoon ? 'Hoàng hôn' : 'Bình minh') : null;
  const timeLine = unique([localTime, tr(PERIOD_LABEL[scene.period]), lightLabel && tr(lightLabel)]).join(' · ');

  const badge = live ? FRESHNESS[freshness] : null;
  const updated = live && w && atmosphere.weather?.observedAt ? atmosphere.weather.observedAt.slice(11, 16) : '';

  return (
    <div className="shrink-0 border-b border-rp-line px-4 pb-3 pt-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rp-line bg-rp-bg-2 shadow-rp-xs', scene.isDark && 'rp-wx-on-dark')}
          style={scene.off ? undefined : { background: `linear-gradient(180deg, ${scene.palette.vars['--rp-sky-top']}, ${scene.palette.vars['--rp-sky-bottom']})` }}
        >
          <WeatherIcon icon={icon} size="lg" animate={false} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Bầu trời & thời tiết')}</p>
          <p className="text-[15px] font-semibold leading-snug text-rp-text [overflow-wrap:anywhere]">{placeLine}</p>
          <p className="text-[12px] text-rp-text-2 tabular-nums">{timeLine}</p>
        </div>
        {live && (
          <p className="shrink-0 text-right">
            <span className="block text-[26px] font-semibold leading-none tabular-nums text-rp-text">{Math.round(w.temperature)}°</span>
            <span className="mt-1 block text-[12px] font-medium text-rp-text-2">{tr(weatherLabel(w))}</span>
          </p>
        )}
      </div>

      <StatusLine atmosphere={atmosphere} tr={tr} />

      {(live || badge) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-rp-text-2">
          {badge && <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 font-semibold', badge.tone)}>{tr(badge.label)}</span>}
          {updated && <span className="tabular-nums">{trf('Cập nhật {time} (giờ địa phương)', { time: updated })}</span>}
          {live && w.wind.speed !== null && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Wind aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
              {trf('Gió {speed} km/h', { speed: Math.round(w.wind.speed) })}
            </span>
          )}
          {live && w.humidity !== null && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Droplets aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
              {trf('Độ ẩm {value}%', { value: Math.round(w.humidity) })}
            </span>
          )}
          {live && freshness === 'live' && (
            <button
              type="button"
              onClick={() => refetchWeather()}
              disabled={refreshing}
              aria-label={tr('Làm mới thời tiết')}
              className="rp-focus ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-rp-text-muted hover:bg-rp-muted hover:text-rp-text disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className={cx('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusLine({ atmosphere, tr }) {
  const { weatherStatus, prefs, refetchWeather } = atmosphere;
  const retry = (
    <button type="button" onClick={() => refetchWeather()} className="rp-focus rp-link inline-flex items-center gap-1 rounded-md font-semibold">
      <RefreshCw aria-hidden="true" className="h-3 w-3" /> {tr('Thử lại')}
    </button>
  );
  let text = null;
  let tone = 'text-rp-text-muted';
  let action = null;
  if (prefs.mode === 'off') text = tr('Header đang ở chế độ tĩnh.');
  else if (weatherStatus === 'disabled') text = tr('Chỉ bầu trời — không gọi dịch vụ thời tiết, không hiển thị mưa hay tuyết.');
  else if (weatherStatus === 'loading')
    text = (
      <span className="inline-flex items-center gap-1.5">
        <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        {tr('Đang lấy thời tiết… bầu trời vẫn theo giờ địa phương.')}
      </span>
    );
  else if (weatherStatus === 'error') {
    text = tr('Chưa lấy được thời tiết — đang hiển thị bầu trời theo giờ, không có hiệu ứng thời tiết.');
    tone = 'text-rp-warning';
    action = retry;
  } else if (weatherStatus === 'expired') {
    text = tr('Dữ liệu thời tiết đã cũ nên tạm ẩn hiệu ứng thời tiết.');
    tone = 'text-rp-warning';
    action = retry;
  } else if (weatherStatus === 'unsupported') text = tr('Chưa nhận diện được tình trạng thời tiết — chỉ hiển thị bầu trời.');
  if (!text) return null;
  return (
    <p role="status" className={cx('mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]', tone)}>
      {text}
      {action}
    </p>
  );
}

function getBrowserPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ location */
function LocationPicker({ prefs, setPrefs, tr, locale }) {
  const [query, setQuery] = useState('');
  const [geoState, setGeoState] = useState('idle');
  const geoAbortRef = useRef(null);
  const term = useDebounced(query.trim(), 350);
  const listId = useId();
  const results = useQuery({
    queryKey: ['atmosphere-geocode', locale, term.toLowerCase()],
    enabled: term.length >= 2,
    queryFn: ({ signal }) => searchCities(term, signal, locale),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 0,
  });

  useEffect(() => () => {
    geoAbortRef.current?.abort();
  }, []);

  // Choosing a place keeps the current mode (it also drives "Chỉ bầu trời"); only "Tắt hoàn toàn" switches on weather.
  const choose = (loc) => {
    setPrefs({ location: loc, mode: prefs.mode === 'off' ? 'weather' : prefs.mode });
    setQuery('');
  };

  const useDevice = async () => {
    geoAbortRef.current?.abort();
    const controller = new AbortController();
    geoAbortRef.current = controller;
    setGeoState('asking');

    let browserDenied = false;
    let browserUnsupported = !('geolocation' in navigator) || (typeof window !== 'undefined' && window.isSecureContext === false);

    if (!browserUnsupported) {
      // Check Permissions API first when supported so an already-denied permission skips useless prompts
      // and falls back immediately to approximate network location.
      try {
        const perm = await navigator.permissions?.query?.({ name: 'geolocation' });
        if (perm?.state === 'denied') browserDenied = true;
      } catch {
        // Permissions API unsupported or restricted; proceed directly to getCurrentPosition.
      }
    }

    if (!browserUnsupported && !browserDenied) {
      try {
        const pos = await getBrowserPosition({
          enableHighAccuracy: false,
          timeout: 8_000,
          maximumAge: 10 * 60 * 1000,
        });
        if (controller.signal.aborted) return;
        // Only a ~11 km rounded position is kept; the precise fix is discarded right here.
        const latitude = coarsen(pos.coords.latitude, 1);
        const longitude = coarsen(pos.coords.longitude, 1);
        const place = await reverseGeocode(latitude, longitude, controller.signal, locale);
        if (controller.signal.aborted) return;
        choose({
          name: place?.name || tr('Vị trí hiện tại'),
          region: place?.region || '',
          country: place?.country || '',
          latitude,
          longitude,
          timezone: browserTimeZone(),
          source: 'device',
        });
        setGeoState('device-ok');
        return;
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err?.code === 1) browserDenied = true;
      }
    }

    // Automatic coarse network/IP fallback when GPS permission is denied, blocked by OS,
    // timed out, or unavailable on desktop browsers.
    const approx = await detectApproximateLocation(controller.signal, locale);
    if (controller.signal.aborted) return;
    if (approx) {
      choose(approx);
      setGeoState(browserDenied ? 'approx-denied' : 'approx');
      return;
    }

    setGeoState(browserDenied ? 'denied' : browserUnsupported ? 'unsupported' : 'failed');
  };

  const list = results.data || [];
  return (
    <div className="space-y-2">
      {prefs.location ? (
        <div className="flex items-center gap-2 rounded-xl border border-rp-brand-border bg-rp-brand-tint/50 px-3 py-2">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-brand-strong" />
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-rp-text [overflow-wrap:anywhere]">{formatPlace(prefs.location)}</span>
          <button
            type="button"
            onClick={() => setPrefs({ location: null })}
            className="rp-focus rounded-md p-1 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
            aria-label={tr('Xóa địa điểm')}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-rp-text-muted">{tr('Chưa chọn địa điểm — bầu trời đang ước tính theo múi giờ thiết bị.')}</p>
      )}

      <label className="relative block">
        <span className="sr-only">{tr('Tìm thành phố')}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('Tìm thành phố (ví dụ: Hà Nội, Tokyo)')}
          aria-controls={listId}
          autoComplete="off"
          className="h-9 w-full rounded-full border border-rp-line bg-rp-surface pl-9 pr-3 text-[13px] text-rp-text placeholder:text-rp-text-muted"
        />
      </label>
      {term.length >= 2 && (
        <ul id={listId} aria-live="polite" className="max-h-44 space-y-0.5 overflow-y-auto">
          {results.isFetching && list.length === 0 && (
            <li className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-rp-text-muted">
              <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> {tr('Đang tìm…')}
            </li>
          )}
          {results.isError && <li className="px-2 py-1.5 text-[12px] text-rp-danger">{tr('Không tìm được địa điểm lúc này. Thử lại sau.')}</li>}
          {results.isSuccess && list.length === 0 && <li className="px-2 py-1.5 text-[12px] text-rp-text-muted">{tr('Không có kết quả phù hợp.')}</li>}
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => choose(r)} className="rp-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-rp-text hover:bg-rp-brand-tint/60">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
                <span className="min-w-0 flex-1 truncate" title={formatPlace(r)}>{formatPlace(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={useDevice}
        disabled={geoState === 'asking'}
        className="rp-focus inline-flex items-center gap-2 rounded-full border border-rp-line px-3 py-1.5 text-[12px] font-semibold text-rp-text-2 hover:border-rp-brand-border hover:text-rp-brand-strong disabled:opacity-60"
      >
        {geoState === 'asking' ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed aria-hidden="true" className="h-3.5 w-3.5" />}
        {tr('Dùng vị trí hiện tại')}
      </button>
      <p role="status" className={cx('min-h-[1rem] text-[11px]', geoState === 'device-ok' || geoState === 'approx' ? 'text-rp-success' : geoState === 'denied' || geoState === 'failed' ? 'text-rp-warning' : 'text-rp-text-muted')}>
        {geoState === 'device-ok' && tr('Đã cập nhật vị trí hiện tại.')}
        {geoState === 'approx-denied' && tr('Trình duyệt đang chặn quyền GPS — đã dùng vị trí ước tính theo mạng.')}
        {geoState === 'approx' && tr('Đã xác định vị trí gần đúng theo kết nối mạng.')}
        {geoState === 'denied' && tr('Bạn đã từ chối quyền vị trí. Hãy tìm thành phố thủ công.')}
        {geoState === 'failed' && tr('Không xác định được vị trí. Hãy tìm thành phố thủ công.')}
        {geoState === 'unsupported' && tr('Trình duyệt không hỗ trợ định vị.')}
        {geoState === 'idle' && tr('Chỉ lưu vị trí đã làm tròn (~10 km); không lưu tọa độ GPS chính xác.')}
      </p>
    </div>
  );
}

export default function WeatherSettings({ atmosphere }) {
  const { locale, tr, trf } = useLocale();
  const { prefs, setPrefs, scene } = atmosphere;
  const modeId = useId();
  const icons = modeIcons(scene);
  return (
    <div className="flex min-h-0 w-[min(392px,calc(100vw-24px))] flex-1 flex-col text-left">
      <SkyHeader atmosphere={atmosphere} tr={tr} trf={trf} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3.5">
        <section aria-labelledby={modeId}>
          <SectionTitle id={modeId}>{tr('Chế độ hiển thị')}</SectionTitle>
          <div role="radiogroup" aria-labelledby={modeId} className="space-y-1">
            {MODES.map((m) => {
              const active = prefs.mode === m.value;
              const icon = icons[m.value];
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPrefs({ mode: m.value })}
                  className={cx(
                    'rp-focus flex min-h-[54px] w-full items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition-colors duration-200',
                    active ? 'border-rp-brand-border bg-rp-brand-tint/70' : 'border-transparent hover:border-rp-line hover:bg-rp-muted',
                  )}
                >
                  <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg border', active ? 'border-rp-brand-border bg-rp-surface' : 'border-rp-line bg-rp-bg-2')}>
                    <WeatherIcon icon={icon} animate={active} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-[13px] font-semibold leading-snug', active ? 'text-rp-brand-strong' : 'text-rp-text')}>{tr(m.label)}</span>
                    <span className="block text-[11px] leading-snug text-rp-text-muted">{tr(m.hint)}</span>
                  </span>
                  <Check aria-hidden="true" className={cx('h-4 w-4 shrink-0 text-rp-brand-strong transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={`${modeId}-fx`}>
          <SectionTitle id={`${modeId}-fx`}>{tr('Cường độ hiệu ứng')}</SectionTitle>
          <Segmented options={LEVELS} value={prefs.intensity} onChange={(v) => setPrefs({ intensity: v })} label={tr('Cường độ hiệu ứng')} tr={tr} disabled={prefs.mode === 'off'} />
        </section>

        <section aria-labelledby={`${modeId}-season`}>
          <SectionTitle id={`${modeId}-season`}>
            <span className="inline-flex items-center gap-1.5">
              <Leaf aria-hidden="true" className="h-3.5 w-3.5" />
              {tr('Trang trí theo mùa')}
            </span>
          </SectionTitle>
          <Segmented options={SEASONAL} value={prefs.seasonal} onChange={(v) => setPrefs({ seasonal: v })} label={tr('Trang trí theo mùa')} tr={tr} disabled={prefs.mode === 'off'} />
        </section>

        <section aria-labelledby={`${modeId}-place`}>
          <SectionTitle id={`${modeId}-place`}>{tr('Địa điểm thời tiết')}</SectionTitle>
          <LocationPicker prefs={prefs} setPrefs={setPrefs} tr={tr} locale={locale} />
        </section>

      </div>
    </div>
  );
}
