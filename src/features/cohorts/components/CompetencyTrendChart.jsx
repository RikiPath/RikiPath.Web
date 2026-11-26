import { useMemo, useState } from 'react';
import { cx } from '@/components/ui';
import { formatDate } from '@/utils/dateTimeFormat.js';
import { useLocale } from '@/locales/locale.js';
import { formatDataSourceLabel, formatPercent, formatSkillLabel, sortSkillsCanonical } from '../utils/skillLabels.js';

const CHART_W = 640;
const CHART_H = 220;
const PAD_L = 44;
const PAD_R = 18;
const PAD_T = 16;
const PAD_B = 34;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;
const Y_TICKS = [0, 25, 50, 75, 100];

const DEFAULT_GREEN = '#10B981';

/**
 * Shared chronological Line Chart for In-Class Trends & Multi-Assessment Competency Evolution.
 * Enforces strict scale & skill integrity:
 * - Never fabricates missing intermediate points.
 * - Never connects points from incompatible measurement scales.
 * - Requires >= 2 compatible data points before drawing a trend line.
 */
export default function CompetencyTrendChart({
  points = [], // [{ dateUtc, label, sourceType, scaleKey, skillCode, skillLabel, scorePercent, correctCount?, totalCount? }]
  title,
  subtitle,
  color = DEFAULT_GREEN,
  emptyText = 'Cần ít nhất 2 mốc đánh giá cùng thang đo để hiển thị xu hướng.',
  className,
}) {
  const { tr, trf } = useLocale();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const filterOptions = useMemo(() => {
    const safe = Array.isArray(points) ? points : [];
    const hasOverall = safe.some((p) => !p.skillCode);
    const skillMap = new Map();
    for (const pt of safe) {
      if (pt.skillCode && !skillMap.has(pt.skillCode)) {
        skillMap.set(pt.skillCode, pt.skillLabel || pt.skillCode);
      }
    }
    const sortedSkills = sortSkillsCanonical(
      [...skillMap.entries()].map(([skillCode, skillLabel]) => ({ skillCode, skillLabel })),
      (x) => x.skillCode,
    );
    const opts = [];
    if (hasOverall) opts.push({ value: 'OVERALL', label: 'Tổng hợp' });
    for (const sk of sortedSkills) {
      opts.push({ value: sk.skillCode, label: formatSkillLabel(sk.skillLabel || sk.skillCode, tr) });
    }
    return opts;
  }, [points, tr]);

  const [selectedFilter, setSelectedFilter] = useState(null);
  const activeFilter = useMemo(() => {
    if (selectedFilter && filterOptions.some((o) => o.value === selectedFilter)) return selectedFilter;
    return filterOptions[0]?.value || null;
  }, [selectedFilter, filterOptions]);

  const scaleOptions = useMemo(() => {
    const matching = (Array.isArray(points) ? points : []).filter((p) =>
      activeFilter === 'OVERALL' ? !p.skillCode : activeFilter ? p.skillCode === activeFilter : true,
    );
    return [...new Set(matching.map((p) => p.scaleKey || 'DEFAULT'))];
  }, [points, activeFilter]);

  const [selectedScale, setSelectedScale] = useState(null);
  const activeScale = useMemo(() => {
    if (selectedScale && scaleOptions.includes(selectedScale)) return selectedScale;
    return scaleOptions[0] || 'DEFAULT';
  }, [selectedScale, scaleOptions]);

  const activeSeries = useMemo(() => {
    if (!activeFilter) return [];
    return (Array.isArray(points) ? points : [])
      .filter((p) => {
        const matchesSkill = activeFilter === 'OVERALL' ? !p.skillCode : p.skillCode === activeFilter;
        const matchesScale = (p.scaleKey || 'DEFAULT') === activeScale;
        return matchesSkill && matchesScale && p.scorePercent != null && Number.isFinite(Number(p.scorePercent));
      })
      .sort((a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime())
      .map((p) => ({
        ...p,
        val: Math.max(0, Math.min(100, Number(p.scorePercent))),
        shortDate: formatDate(p.dateUtc, '—'),
      }));
  }, [points, activeFilter, activeScale]);

  const plottedPoints = useMemo(() => {
    const n = activeSeries.length;
    if (n < 2) return [];
    return activeSeries.map((pt, idx) => ({
      ...pt,
      x: PAD_L + (idx / (n - 1)) * PLOT_W,
      y: PAD_T + PLOT_H - (pt.val / 100) * PLOT_H,
    }));
  }, [activeSeries]);

  const labelStep = plottedPoints.length > 10 ? Math.ceil(plottedPoints.length / 6) : plottedPoints.length > 6 ? 2 : 1;
  const hovered = hoveredIdx != null ? plottedPoints[hoveredIdx] : null;

  return (
    <div className={cx('space-y-3 rounded-rp-card border border-rp-line bg-rp-surface p-4 text-rp-text', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && <h3 className="text-sm font-bold text-rp-text">{tr(title)}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-rp-text-muted">{tr(subtitle)}</p>}
        </div>

        {filterOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('Lọc kỹ năng biểu đồ xu hướng')}>
            {filterOptions.map((opt) => {
              const isSelected = opt.value === activeFilter;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(opt.value);
                    setHoveredIdx(null);
                  }}
                  className={cx(
                    'rp-focus cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                    isSelected
                      ? 'border-emerald-600/40 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'border-rp-line bg-rp-bg-2/60 text-rp-text-2 hover:text-rp-text',
                  )}
                >
                  {tr(opt.label)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {scaleOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-rp-text-muted">
          <span>{tr('Nhóm đánh giá')}:</span>
          {scaleOptions.map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => {
                setSelectedScale(sc);
                setHoveredIdx(null);
              }}
              className={cx(
                'rp-focus cursor-pointer rounded-md border px-2 py-0.5 font-medium transition-colors',
                sc === activeScale
                  ? 'border-rp-brand-border bg-rp-brand-bg text-rp-brand-strong'
                  : 'border-rp-line bg-rp-surface text-rp-text-2 hover:text-rp-text',
              )}
            >
              {sc === 'InClassHomeworkExercise'
                ? tr('Bài luyện tập tại lớp')
                : sc === 'InClassCohortHomework'
                  ? tr('Bài tập được chấm')
                  : sc}
            </button>
          ))}
        </div>
      )}

      {plottedPoints.length < 2 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-rp-line bg-rp-bg-2/40 px-4 py-8 text-center text-xs text-rp-text-muted">
          {tr(emptyText)}
        </div>
      ) : (
        <div className="relative w-full select-none">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            role="img"
            aria-label={title ? tr(title) : tr('Biểu đồ xu hướng năng lực')}
            className="h-auto w-full overflow-visible"
          >
            {Y_TICKS.map((tick) => {
              const y = PAD_T + PLOT_H - (tick / 100) * PLOT_H;
              return (
                <g key={tick}>
                  <line
                    x1={PAD_L}
                    y1={y}
                    x2={CHART_W - PAD_R}
                    y2={y}
                    stroke={tick === 0 ? 'var(--color-rp-line-strong, #D6CFD2)' : 'var(--color-rp-line, #E5E0E2)'}
                    strokeDasharray={tick === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={PAD_L - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--color-rp-text-muted, #776C70)"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {/* Polyline across genuine chronological compatible points */}
            <path
              d={plottedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {hovered && (
              <line
                x1={hovered.x}
                y1={PAD_T}
                x2={hovered.x}
                y2={PAD_T + PLOT_H}
                stroke={color}
                strokeOpacity="0.4"
                strokeDasharray="3 3"
              />
            )}

            {plottedPoints.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              const isFirst = idx === 0;
              const isLast = idx === plottedPoints.length - 1;
              return (
                <g key={`${pt.dateUtc}-${idx}`}>
                  {(idx % labelStep === 0 || isLast) && (
                    <text
                      x={pt.x}
                      y={CHART_H - 10}
                      textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                      fontSize="10"
                      fill="var(--color-rp-text-muted, #776C70)"
                    >
                      {pt.shortDate}
                    </text>
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.8}
                    fill={isHovered ? color : 'var(--color-rp-surface, #FFFFFF)'}
                    stroke={color}
                    strokeWidth="2.4"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="14"
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${pt.label}: ${formatPercent(pt.val)} (${pt.shortDate})`}
                    className="cursor-pointer focus:outline-none"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onFocus={() => setHoveredIdx(idx)}
                    onBlur={() => setHoveredIdx(null)}
                  />
                </g>
              );
            })}
          </svg>

          {hovered && (
            <div className="pointer-events-none absolute top-1 right-1 z-20 rounded-xl border border-rp-line-strong bg-rp-surface/95 px-3 py-2 text-xs text-rp-text shadow-rp-pop backdrop-blur-sm">
              <p className="font-bold">{hovered.label}</p>
              <p className="font-semibold tabular-nums" style={{ color }}>
                {formatPercent(hovered.val)}
                {hovered.totalCount > 0 ? ` · ${trf('{0}/{1} câu', { 0: hovered.correctCount ?? 0, 1: hovered.totalCount })}` : ''}
              </p>
              <p className="text-[11px] text-rp-text-muted">
                {formatDataSourceLabel(hovered.sourceType, tr)} · {hovered.shortDate}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
