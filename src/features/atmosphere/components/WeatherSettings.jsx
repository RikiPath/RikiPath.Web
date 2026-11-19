import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CloudSun, LoaderCircle, LocateFixed, MapPin, PowerOff, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { CONDITION_LABEL, PERIOD_LABEL, coarsen, conditionForWeather } from '../atmosphereLogic.js';
import { searchCities } from '../weatherService.js';

const MODES = [
  { value: 'weather', label: 'Bầu trời + thời tiết', hint: 'Bầu trời động và thời tiết thực tế tại địa điểm bạn chọn.', icon: CloudSun },
  { value: 'sky', label: 'Chỉ bầu trời', hint: 'Bầu trời minh họa theo giờ trên thiết bị, không gọi dịch vụ thời tiết.', icon: Sparkles },
  { value: 'off', label: 'Tắt hoàn toàn', hint: 'Header tĩnh theo Design System, không hiệu ứng.', icon: PowerOff },
];
const LEVELS = [
  { value: 'low', label: 'Nhẹ' },
  { value: 'medium', label: 'Vừa' },
  { value: 'high', label: 'Mạnh' },
];
const ROLE_NOTE = {
  subtle: 'Không gian Giáo viên dùng phiên bản giản lược (không cánh hoa).',
  minimal: 'Không gian làm việc dùng phiên bản tối giản để ưu tiên khả năng đọc.',
};

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function formatPlace(loc) {
  return [loc.name, loc.region, loc.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
}

function LocationPicker({ prefs, setPrefs, tr }) {
  const [query, setQuery] = useState('');
  const [geoState, setGeoState] = useState('idle');
  const term = useDebounced(query.trim(), 350);
  const listId = useId();
  const results = useQuery({
    queryKey: ['atmosphere-geocode', term.toLowerCase()],
    enabled: term.length >= 2,
    queryFn: ({ signal }) => searchCities(term, signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 0,
  });

  const choose = (loc) => {
    setPrefs({ location: loc, mode: prefs.mode === 'off' ? 'weather' : prefs.mode === 'sky' ? 'weather' : prefs.mode });
    setQuery('');
  };

  const useDevice = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState('idle');
        // Only a ~11 km rounded position is kept; the precise fix is discarded right here.
        choose({ name: tr('Vị trí hiện tại'), latitude: coarsen(pos.coords.latitude, 1), longitude: coarsen(pos.coords.longitude, 1), source: 'device' });
      },
      (err) => setGeoState(err?.code === 1 ? 'denied' : 'failed'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );
  };

  const list = results.data || [];
  return (
    <div className="space-y-2">
      {prefs.location ? (
        <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-brand-strong" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-rp-text">{formatPlace(prefs.location)}</span>
          <button
            type="button"
            onClick={() => setPrefs({ location: null, mode: prefs.mode === 'weather' ? 'sky' : prefs.mode })}
            className="rp-focus rounded-md p-1 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
            aria-label={tr('Xóa địa điểm')}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-rp-text-muted">{tr('Chưa chọn địa điểm — chế độ "Chỉ bầu trời" vẫn dùng giờ trên thiết bị.')}</p>
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
                <span className="min-w-0 flex-1 truncate">{formatPlace(r)}</span>
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
      <p role="status" className="min-h-[1rem] text-[11px] text-rp-text-muted">
        {geoState === 'denied' && tr('Bạn đã từ chối quyền vị trí. Hãy tìm thành phố thủ công.')}
        {geoState === 'failed' && tr('Không xác định được vị trí. Hãy tìm thành phố thủ công.')}
        {geoState === 'unsupported' && tr('Trình duyệt không hỗ trợ định vị.')}
        {geoState === 'idle' && tr('Chỉ lưu vị trí đã làm tròn (~10 km); không lưu tọa độ GPS chính xác.')}
      </p>
    </div>
  );
}

function WeatherStatus({ atmosphere, tr }) {
  const { weatherStatus, weather, prefs, scene, refetchWeather } = atmosphere;
  if (prefs.mode === 'off') return <p className="text-[12px] text-rp-text-muted">{tr('Header đang ở chế độ tĩnh.')}</p>;
  if (weatherStatus === 'ready') {
    const cond = conditionForWeather(weather.weatherCode, weather.cloudCover);
    return (
      <p className="text-[12px] text-rp-text-2">
        <strong className="text-rp-text">{Math.round(weather.temperature)}°C</strong> · {tr(CONDITION_LABEL[cond])} · {tr(PERIOD_LABEL[scene.period])}
        {weather.observedAt && <span className="text-rp-text-muted"> · {tr('cập nhật')} {weather.observedAt.slice(11, 16)}</span>}
      </p>
    );
  }
  if (weatherStatus === 'loading') return <p className="text-[12px] text-rp-text-muted">{tr('Đang lấy thời tiết… bầu trời minh họa vẫn hiển thị.')}</p>;
  if (weatherStatus === 'error')
    return (
      <p className="flex flex-wrap items-center gap-2 text-[12px] text-rp-warning">
        {tr('Chưa lấy được thời tiết thực tế — đang hiển thị bầu trời minh họa theo giờ.')}
        <button type="button" onClick={() => refetchWeather()} className="rp-focus rp-link inline-flex items-center gap-1 rounded-md">
          <RefreshCw aria-hidden="true" className="h-3 w-3" /> {tr('Thử lại')}
        </button>
      </p>
    );
  if (weatherStatus === 'no-location') return <p className="text-[12px] text-rp-text-muted">{tr('Chọn địa điểm để xem thời tiết thực tế.')}</p>;
  return <p className="text-[12px] text-rp-text-muted">{tr('Bầu trời minh họa theo giờ trên thiết bị')} · {tr(PERIOD_LABEL[scene.period])}</p>;
}

export default function WeatherSettings({ atmosphere }) {
  const { tr } = useLocale();
  const { prefs, setPrefs, decoration } = atmosphere;
  const groupId = useId();
  return (
    <div className="w-[min(340px,calc(100vw-24px))] space-y-4 p-4 text-left">
      <div>
        <p className="text-sm font-semibold text-rp-text">{tr('Bầu trời & thời tiết')}</p>
        <WeatherStatus atmosphere={atmosphere} tr={tr} />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Chế độ hiển thị')}</legend>
        <div role="radiogroup" aria-labelledby={groupId} className="space-y-1">
          {MODES.map((m) => {
            const active = prefs.mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPrefs({ mode: m.value })}
                className={cx(
                  'rp-focus flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors',
                  active ? 'border-rp-brand-border bg-rp-brand-tint/70' : 'border-transparent hover:bg-rp-muted',
                )}
              >
                <m.icon aria-hidden="true" className={cx('mt-0.5 h-4 w-4 shrink-0', active ? 'text-rp-brand-strong' : 'text-rp-text-muted')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-rp-text">{tr(m.label)}</span>
                  <span className="block text-[11px] leading-snug text-rp-text-muted">{tr(m.hint)}</span>
                </span>
                {active && <Check aria-hidden="true" className="mt-0.5 h-4 w-4 text-rp-brand-strong" />}
              </button>
            );
          })}
        </div>
        <span id={groupId} className="sr-only">{tr('Chế độ hiển thị')}</span>
      </fieldset>

      <fieldset disabled={prefs.mode === 'off'} className="disabled:opacity-50">
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Cường độ hiệu ứng')}</legend>
        <div role="radiogroup" aria-label={tr('Cường độ hiệu ứng')} className="grid grid-cols-3 gap-1 rounded-full bg-rp-muted p-1">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={prefs.intensity === l.value}
              onClick={() => setPrefs({ intensity: l.value })}
              className={cx(
                'rp-focus rounded-full py-1.5 text-[12px] font-semibold transition-colors',
                prefs.intensity === l.value ? 'bg-rp-surface text-rp-brand-strong shadow-rp-xs' : 'text-rp-text-2 hover:text-rp-text',
              )}
            >
              {tr(l.label)}
            </button>
          ))}
        </div>
        {ROLE_NOTE[decoration] && <p className="mt-1.5 text-[11px] text-rp-text-muted">{tr(ROLE_NOTE[decoration])}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Địa điểm thời tiết')}</legend>
        <LocationPicker prefs={prefs} setPrefs={setPrefs} tr={tr} />
      </fieldset>

      <p className="border-t border-rp-line pt-2 text-[10.5px] text-rp-text-muted">
        {tr('Dữ liệu thời tiết:')}{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="rp-link-external font-semibold">Open-Meteo.com</a>{' '}
        (CC BY 4.0)
      </p>
    </div>
  );
}
