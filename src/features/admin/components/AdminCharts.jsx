import { useId, useMemo, useState } from 'react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const DEFAULT_PALETTE = [
  '#E05A7A', // Sakura primary
  '#3B82F6', // Royal blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#64748B', // Slate
];

function compactAxisValue(val) {
  const num = Number(val || 0);
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(num));
}

/* ------------------------------------------------------------------ Line / Area Chart */

/**
 * Interactive SVG Line + Area chart for time-series KPIs (revenue, user registrations).
 * Receives pre-aggregated buckets `{ label, value, secondaryLabel? }`.
 */
export function AdminLineAreaChart({
  data = [],
  height = 220,
  color = '#E05A7A',
  formatValue = (v) => String(v),
  emptyText = 'Chưa có dữ liệu trong khoảng thời gian đã chọn.',
  className,
}) {
  const { tr } = useLocale();
  const gradId = useId();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const metrics = useMemo(() => {
    const safe = Array.isArray(data) ? data : [];
    const maxVal = Math.max(1, ...safe.map((d) => Number(d.value || 0)));
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxVal * r));
    return { safe, maxVal, yTicks };
  }, [data]);

  // An all-zero series is "no data in range", not a chart: no fake axes or flat lines.
  if (!metrics.safe.length || !metrics.safe.some((d) => Number(d.value || 0) > 0)) {
    return (
      <div className={cx('flex items-center justify-center rounded-xl border border-dashed border-rp-line bg-rp-bg-2/50 py-10 text-xs text-rp-text-muted', className)}>
        {tr(emptyText)}
      </div>
    );
  }

  const width = 620;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const n = metrics.safe.length;

  const points = metrics.safe.map((item, idx) => {
    const x = n === 1 ? padL + plotW / 2 : padL + (idx / (n - 1)) * plotW;
    const val = Number(item.value || 0);
    const y = padT + plotH - (val / metrics.maxVal) * plotH;
    return { x, y, val, ...item };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const labelStep = n > 12 ? Math.ceil(n / 7) : n > 7 ? 2 : 1;
  const hovered = hoveredIdx != null ? points[hoveredIdx] : null;

  return (
    <div className={cx('relative w-full select-none', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {metrics.yTicks.map((tick, idx) => {
          const y = padT + plotH - (tick / metrics.maxVal) * plotH;
          return (
            <g key={idx}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#EFE9EC" strokeDasharray={idx === 0 ? undefined : '3 3'} strokeWidth="1" />
              <text x={padL - 8} y={y + 3.5} textAnchor="end" className="fill-[#7D7175] text-[10px] font-medium">
                {compactAxisValue(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <line x1={hovered.x} y1={padT} x2={hovered.x} y2={padT + plotH} stroke={color} strokeOpacity="0.35" strokeDasharray="3 3" />
        )}

        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g key={pt.label || idx}>
              {idx % labelStep === 0 && (
                <text x={pt.x} y={height - 8} textAnchor="middle" className="fill-[#7D7175] text-[10px] font-medium">
                  {pt.label}
                </text>
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5.5 : points.length <= 16 ? 3.5 : 2.5}
                fill={isHovered ? color : '#FFFFFF'}
                stroke={color}
                strokeWidth="2.2"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="14"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 right-2 rounded-lg border border-rp-line bg-rp-text px-2.5 py-1.5 text-xs text-white shadow-rp-pop"
        >
          <p className="font-semibold">{hovered.label}</p>
          <p className="tabular-nums text-[#FDECF1]">{formatValue(hovered.val)}</p>
          {hovered.secondaryLabel && <p className="text-[11px] text-white/75">{hovered.secondaryLabel}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Bar Chart */

export function AdminBarChart({
  data = [],
  height = 210,
  color = '#E05A7A',
  formatValue = (v) => String(v),
  emptyText = 'Chưa có dữ liệu.',
  className,
}) {
  const { tr } = useLocale();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data?.length || !data.some((d) => Number(d.value || 0) > 0)) {
    return (
      <div className={cx('flex items-center justify-center rounded-xl border border-dashed border-rp-line bg-rp-bg-2/50 py-10 text-xs text-rp-text-muted', className)}>
        {tr(emptyText)}
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Number(d.value || 0)));
  const width = 520;
  const padL = 36;
  const padR = 14;
  const padT = 18;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slotW = plotW / data.length;
  const barW = Math.min(44, Math.max(18, slotW * 0.52));

  return (
    <div className={cx('relative w-full select-none', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img">
        {[0, 0.5, 1].map((ratio, i) => {
          const val = Math.round(maxVal * ratio);
          const y = padT + plotH - ratio * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#EFE9EC" strokeDasharray={i === 0 ? undefined : '3 3'} />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" className="fill-[#7D7175] text-[10px] font-medium">
                {compactAxisValue(val)}
              </text>
            </g>
          );
        })}

        {data.map((item, idx) => {
          const val = Number(item.value || 0);
          const barH = Math.max(val > 0 ? 4 : 0, (val / maxVal) * plotH);
          const x = padL + idx * slotW + (slotW - barW) / 2;
          const y = padT + plotH - barH;
          const fill = item.color || color;
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={item.label || idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="6"
                fill={fill}
                fillOpacity={isHovered ? 1 : 0.86}
              />
              <text
                x={x + barW / 2}
                y={Math.max(11, y - 5)}
                textAnchor="middle"
                className="fill-[#332A2E] text-[10.5px] font-bold tabular-nums"
              >
                {formatValue(val)}
              </text>
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-[#5E5257] text-[11px] font-semibold"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ Donut / Pie Chart */

export function AdminDonutChart({
  segments = [],
  centerLabel,
  centerValue,
  size = 152,
  emptyText = 'Chưa có dữ liệu.',
  className,
}) {
  const { tr } = useLocale();
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const valid = (segments || []).filter((s) => Number(s.value || 0) > 0);
  const total = valid.reduce((sum, s) => sum + Number(s.value || 0), 0);

  if (!total) {
    return (
      <div className={cx('flex items-center justify-center rounded-xl border border-dashed border-rp-line bg-rp-bg-2/50 py-10 text-xs text-rp-text-muted', className)}>
        {tr(emptyText)}
      </div>
    );
  }

  const r = 56;
  const cxPos = size / 2;
  const cyPos = size / 2;
  const circumference = 2 * Math.PI * r;
  const computed = valid.reduce((acc, seg, idx) => {
    const val = Number(seg.value || 0);
    const pct = (val / total) * 100;
    const len = (val / total) * circumference;
    const entry = {
      ...seg,
      val,
      pct,
      len,
      offset: acc.running,
      color: seg.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
    };
    return { running: acc.running + len, items: [...acc.items, entry] };
  }, { running: 0, items: [] }).items;

  const activeSeg = hoveredIdx != null ? computed[hoveredIdx] : null;

  return (
    <div className={cx('flex flex-col items-center gap-4 sm:flex-row sm:items-center', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 h-full w-full" role="img">
          <circle cx={cxPos} cy={cyPos} r={r} fill="none" stroke="#F3EEF0" strokeWidth="18" />
          {computed.map((seg, idx) => (
            <circle
              key={seg.label || idx}
              cx={cxPos}
              cy={cyPos}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredIdx === idx ? 21 : 18}
              strokeDasharray={`${seg.len} ${circumference}`}
              strokeDashoffset={-seg.offset}
              className="cursor-pointer transition-[stroke-width] duration-150"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[19px] font-bold leading-6 tabular-nums text-rp-text">
            {activeSeg ? activeSeg.val : centerValue ?? total}
          </span>
          <span className="max-w-[82px] truncate text-[10.5px] font-medium text-rp-text-muted">
            {activeSeg ? tr(activeSeg.label) : tr(centerLabel || 'Tổng cộng')}
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2 w-full">
        {valid.map((seg, idx) => {
          const val = Number(seg.value || 0);
          const pct = Math.round((val / total) * 1000) / 10;
          const color = seg.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
          return (
            <li
              key={seg.label || idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={cx(
                'flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs transition-colors',
                hoveredIdx === idx && 'bg-rp-bg-2',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate font-medium text-rp-text">{tr(seg.label)}</span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-rp-text-2">
                {val} <span className="font-normal text-rp-text-muted">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Stacked Horizontal Bar */

export function AdminStackedBar({
  segments = [],
  height = 14,
  emptyText = 'Chưa có dữ liệu.',
  className,
}) {
  const { tr } = useLocale();
  const valid = (segments || []).filter((s) => Number(s.value || 0) > 0);
  const total = valid.reduce((sum, s) => sum + Number(s.value || 0), 0);

  if (!total) {
    return (
      <p className="text-xs text-rp-text-muted">{tr(emptyText)}</p>
    );
  }

  return (
    <div className={cx('space-y-2.5', className)}>
      <div
        className="flex w-full overflow-hidden rounded-full bg-rp-muted"
        style={{ height }}
        role="img"
      >
        {valid.map((seg, idx) => {
          const pct = (Number(seg.value) / total) * 100;
          const color = seg.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
          return (
            <div
              key={seg.label || idx}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${tr(seg.label)}: ${seg.value}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {segments.map((seg, idx) => {
          const color = seg.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
          const pct = total > 0 ? Math.round((Number(seg.value || 0) / total) * 100) : 0;
          return (
            <span key={seg.label || idx} className="inline-flex items-center gap-1.5 text-rp-text-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-medium">{tr(seg.label)}</span>
              <strong className="tabular-nums text-rp-text">{seg.value}</strong>
              <span className="text-rp-text-muted">({pct}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Progress List */

export function AdminProgressList({ items = [], emptyText = 'Chưa có dữ liệu.', className }) {
  const { tr } = useLocale();
  if (!items?.length) {
    return <p className="text-xs text-rp-text-muted">{tr(emptyText)}</p>;
  }
  return (
    <ul className={cx('space-y-3', className)}>
      {items.map((item, idx) => {
        const pct = item.max > 0 ? Math.min(100, Math.round((item.value / item.max) * 100)) : 0;
        return (
          <li key={item.id || item.label || idx} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-rp-text">{item.label}</span>
              <span className="shrink-0 tabular-nums text-rp-text-2">
                {item.display || `${item.value}/${item.max}`} ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-rp-bg-2">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: item.color || '#E05A7A' }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
