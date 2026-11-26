import { useMemo, useState } from 'react';
import { Badge, EmptyState, Skeleton, cx } from '@/components/ui';
import { formatPercent, formatPercentagePointDelta, formatSkillLabel } from '../utils/skillLabels.js';
import { useLocale } from '@/locales/locale.js';

const CHART_W = 460;
const CHART_H = 340;
const CENTER = { x: CHART_W / 2, y: 170 };
const RADIUS = 104;
const LABEL_RADIUS = 132;
const TICKS = [20, 40, 60, 80, 100];

const DEFAULT_BLUE = '#2563EB';
const DEFAULT_GREEN = '#10B981';

function buildAxesGeometry(axes) {
  return axes.map((axis, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / axes.length;
    return {
      ...axis,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
    };
  });
}

function getVertex(axis, value, maxValue = 100) {
  const numeric = Number(value);
  const clamped = Number.isFinite(numeric) ? Math.max(0, Math.min(maxValue, numeric)) : 0;
  const dist = (RADIUS * clamped) / maxValue;
  return {
    x: CENTER.x + axis.cos * dist,
    y: CENTER.y + axis.sin * dist,
  };
}

function toPolygonPoints(points) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/**
 * Shared Radar Chart across Baseline, In-Class, and Progress Comparison tabs.
 * Supports 1+ series, dynamic axis count (>= 3 radar, < 3 honest horizontal bar fallback),
 * missing/null isolation (never coerces null -> 0), valid 0%, interactive legend toggle,
 * hover/focus/tap vertex tooltip, and full light/dark semantic styling.
 */
export default function CompetencyRadarChart({
  axes = [], // [{ code, label, unassessedReason? }]
  series = [], // [{ key, label, color, values: { [code]: { scorePercent, correctCount?, totalCount?, sampleCount?, sourceLabel?, dateLabel?, note? } | null } }]
  maxValue = 100,
  loading = false,
  interactiveLegend = true,
  unassessedSkills = [], // [{ skillCode, skillLabel, reason? }]
  scopeNote,
  emptyTitle = 'Chưa có đủ dữ liệu kỹ năng để vẽ biểu đồ.',
  emptyDescription,
  ariaLabel = 'Biểu đồ Radar năng lực theo kỹ năng',
  className,
}) {
  const { tr, trf } = useLocale();
  const [hiddenKeys, setHiddenKeys] = useState({});
  const [activeCode, setActiveCode] = useState(null);

  const visibleSeries = useMemo(
    () =>
      series.map((s, idx) => ({
        ...s,
        key: s.key || `series-${idx}`,
        color: s.color || (idx === 0 ? DEFAULT_BLUE : DEFAULT_GREEN),
        isHidden: Boolean(hiddenKeys[s.key || `series-${idx}`]),
      })),
    [series, hiddenKeys],
  );

  // An axis is plottable iff at least one series has a valid numeric score (including valid 0%).
  const plottableAxes = useMemo(
    () =>
      axes.filter((axis) =>
        series.some((s) => {
          const entry = s?.values?.[axis.code];
          return entry != null && entry.scorePercent != null && Number.isFinite(Number(entry.scorePercent));
        }),
      ),
    [axes, series],
  );

  const geometry = useMemo(() => buildAxesGeometry(plottableAxes), [plottableAxes]);
  const activeAxis = useMemo(
    () => geometry.find((a) => a.code === activeCode) || null,
    [geometry, activeCode],
  );

  function toggleSeries(seriesKey) {
    if (!interactiveLegend || series.length <= 1) return;
    setHiddenKeys((prev) => {
      const next = { ...prev, [seriesKey]: !prev[seriesKey] };
      const remainingVisible = series.filter((s, idx) => !next[s.key || `series-${idx}`]).length;
      if (remainingVisible === 0) return prev; // Keep at least one dataset visible.
      return next;
    });
  }

  if (loading) {
    return (
      <div className={cx('flex h-full min-h-[340px] flex-col items-center justify-center rounded-rp-card border border-rp-line bg-rp-bg-2/40 p-5', className)}>
        <Skeleton className="h-56 w-56 rounded-full" />
        <Skeleton className="mt-4 h-4 w-44 rounded-lg" />
      </div>
    );
  }

  if (plottableAxes.length === 0) {
    return (
      <div className={cx('flex h-full min-h-[280px] items-center justify-center rounded-rp-card border border-rp-line bg-rp-bg-2/40 p-5', className)}>
        <EmptyState
          variant="inline"
          size="sm"
          illustration="chart"
          title={tr(emptyTitle)}
          description={emptyDescription ? tr(emptyDescription) : undefined}
        />
      </div>
    );
  }

  const canRenderRadar = plottableAxes.length >= 3;

  // Honest horizontal bar fallback when < 3 evaluated skills exist (never distort into a fake polygon).
  if (!canRenderRadar) {
    return (
      <div className={cx('flex h-full flex-col justify-between gap-4 rounded-rp-card border border-rp-line bg-rp-bg-2/40 p-4', className)}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-rp-text-2">
              {trf('Biểu đồ cột ngang ({0} kỹ năng có dữ liệu)', { 0: plottableAxes.length })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {visibleSeries.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  disabled={!interactiveLegend || series.length <= 1}
                  onClick={() => toggleSeries(s.key)}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-opacity',
                    s.isHidden ? 'border-rp-line bg-rp-surface/60 text-rp-text-muted opacity-55' : 'border-rp-line bg-rp-surface text-rp-text',
                  )}
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {tr(s.label)}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {plottableAxes.map((axis) => (
              <li key={axis.code} className="space-y-1.5 rounded-xl border border-rp-line/80 bg-rp-surface p-3">
                <p className="text-xs font-bold text-rp-text">{formatSkillLabel(axis.label || axis.code, tr)}</p>
                {visibleSeries
                  .filter((s) => !s.isHidden)
                  .map((s) => {
                    const entry = s?.values?.[axis.code];
                    const hasScore = entry != null && entry.scorePercent != null && Number.isFinite(Number(entry.scorePercent));
                    const val = hasScore ? Math.max(0, Math.min(maxValue, Number(entry.scorePercent))) : null;
                    return (
                      <div key={s.key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="text-rp-text-muted">{tr(s.label)}</span>
                          <span className="font-bold tabular-nums text-rp-text">
                            {val != null ? formatPercent(val) : tr('Chưa đánh giá')}
                            {val != null && entry.totalCount > 0 ? ` (${entry.correctCount}/${entry.totalCount})` : ''}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-rp-bg-2">
                          {val != null && (
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${(val / maxValue) * 100}%`, backgroundColor: s.color }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11.5px] leading-relaxed text-rp-text-muted">
          {scopeNote ? tr(scopeNote) : tr('Cần tối thiểu 3 kỹ năng có dữ liệu hợp lệ để tạo biểu đồ Radar; hệ thống giữ biểu đồ cột để bảo toàn độ chính xác.')}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cx(
        'relative flex h-full flex-col justify-between gap-3 rounded-rp-card border border-rp-line bg-rp-bg-2/40 p-4 text-rp-text',
        className,
      )}
    >
      {/* Legend & toggle header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {visibleSeries.map((s) => {
            const canToggle = interactiveLegend && series.length > 1;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!canToggle}
                aria-pressed={!s.isHidden}
                onClick={() => toggleSeries(s.key)}
                className={cx(
                  'rp-focus inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all',
                  canToggle ? 'cursor-pointer hover:border-rp-line-strong' : 'cursor-default',
                  s.isHidden
                    ? 'border-rp-line bg-rp-surface/50 text-rp-text-muted opacity-55'
                    : 'border-rp-line bg-rp-surface text-rp-text shadow-rp-xs',
                )}
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{tr(s.label)}</span>
              </button>
            );
          })}
        </div>

        {plottableAxes.length > 0 && (
          <span className="text-[11px] font-medium text-rp-text-muted tabular-nums">
            {trf('{0} trục kỹ năng', { 0: plottableAxes.length })}
          </span>
        )}
      </div>

      {/* Main Responsive SVG Radar Canvas */}
      <div className="relative flex flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          role="img"
          aria-label={tr(ariaLabel)}
          className="mx-auto block h-auto w-full max-w-[430px] overflow-visible select-none"
        >
          {/* Neutral polygonal grid levels (20% -> 100%) */}
          {TICKS.map((tick) => (
            <polygon
              key={tick}
              points={toPolygonPoints(geometry.map((axis) => getVertex(axis, tick, maxValue)))}
              fill="none"
              stroke={tick === 100 ? 'var(--color-rp-line-strong, #D6CFD2)' : 'var(--color-rp-line, #E5E0E2)'}
              strokeWidth={tick === 100 ? 1.5 : 1}
              strokeDasharray={tick === 100 ? undefined : '2 3'}
            />
          ))}

          {/* Axis spokes + outer non-clipping skill labels */}
          {geometry.map((axis) => {
            const end = getVertex(axis, maxValue, maxValue);
            const labelPos = {
              x: CENTER.x + axis.cos * LABEL_RADIUS,
              y: CENTER.y + axis.sin * LABEL_RADIUS,
            };
            const isActive = activeCode === axis.code;
            const anchor = axis.cos > 0.15 ? 'start' : axis.cos < -0.15 ? 'end' : 'middle';
            const baseline = axis.sin > 0.35 ? 'hanging' : axis.sin < -0.35 ? 'auto' : 'middle';
            return (
              <g key={axis.code}>
                <line
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isActive ? 'var(--color-rp-text-muted, #776C70)' : 'var(--color-rp-line-strong, #D6CFD2)'}
                  strokeWidth={isActive ? 1.6 : 1}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill={isActive ? 'var(--color-rp-text, #2D282A)' : 'var(--color-rp-text-2, #4E4548)'}
                  fontSize="12.5"
                  fontWeight={isActive ? '700' : '600'}
                  textAnchor={anchor}
                  dominantBaseline={baseline}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setActiveCode(axis.code)}
                  onMouseLeave={() => setActiveCode(null)}
                >
                  {formatSkillLabel(axis.label || axis.code, tr)}
                </text>
              </g>
            );
          })}

          {/* Scale tick annotations on top vertical spoke */}
          {TICKS.map((tick) => {
            const p = getVertex(geometry[0], tick, maxValue);
            return (
              <text
                key={tick}
                x={CENTER.x + 6}
                y={p.y + 3}
                fontSize="9.5"
                fill="var(--color-rp-text-muted, #776C70)"
                className="pointer-events-none"
              >
                {tick}%
              </text>
            );
          })}

          {/* Plotted series layers (preserving missing null gaps safely without coercing to 0) */}
          {visibleSeries
            .filter((s) => !s.isHidden)
            .map((s) => {
              const pts = geometry.map((axis) => {
                const entry = s?.values?.[axis.code];
                if (entry == null || entry.scorePercent == null || !Number.isFinite(Number(entry.scorePercent))) {
                  return null;
                }
                return { axis, entry, ...getVertex(axis, entry.scorePercent, maxValue) };
              });
              const validPts = pts.filter(Boolean);

              return (
                <g
                  key={s.key}
                  className="rp-radar-reveal transition-all duration-300 motion-reduce:transition-none"
                  style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
                >
                  {validPts.length >= 3 && pts.every(Boolean) ? (
                    <polygon
                      points={toPolygonPoints(validPts)}
                      fill={s.color}
                      fillOpacity={series.length > 1 ? 0.14 : 0.18}
                      stroke={s.color}
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                    />
                  ) : (
                    pts.map((pt, i) => {
                      const next = pts[(i + 1) % pts.length];
                      if (!pt || !next) return null;
                      return (
                        <line
                          key={`${s.key}-seg-${i}`}
                          x1={pt.x}
                          y1={pt.y}
                          x2={next.x}
                          y2={next.y}
                          stroke={s.color}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      );
                    })
                  )}

                  {pts.map((pt) =>
                    pt ? (
                      <g key={`${s.key}-pt-${pt.axis.code}`}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={activeCode === pt.axis.code ? 5.5 : 4}
                          fill={activeCode === pt.axis.code ? s.color : 'var(--color-rp-surface, #FFFFFF)'}
                          stroke={s.color}
                          strokeWidth="2.4"
                          className="transition-all duration-150"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="15"
                          fill="transparent"
                          tabIndex={0}
                          role="button"
                          aria-label={`${formatSkillLabel(pt.axis.label || pt.axis.code, tr)}: ${formatPercent(pt.entry.scorePercent)}`}
                          className="cursor-pointer focus:outline-none"
                          onMouseEnter={() => setActiveCode(pt.axis.code)}
                          onMouseLeave={() => setActiveCode(null)}
                          onFocus={() => setActiveCode(pt.axis.code)}
                          onBlur={() => setActiveCode(null)}
                          onClick={() => setActiveCode((prev) => (prev === pt.axis.code ? null : pt.axis.code))}
                        />
                      </g>
                    ) : null,
                  )}
                </g>
              );
            })}
        </svg>

        {/* Interactive Tooltip Overlay (Light + Dark mode safe via semantic surface tokens) */}
        {activeAxis && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 right-1 z-20 w-60 rounded-xl border border-rp-line-strong bg-rp-surface/95 p-3 text-xs text-rp-text shadow-rp-pop backdrop-blur-sm"
          >
            <p className="font-bold text-rp-text">{formatSkillLabel(activeAxis.label || activeAxis.code, tr)}</p>
            <div className="mt-1.5 space-y-1.5">
              {visibleSeries
                .filter((s) => !s.isHidden)
                .map((s) => {
                  const entry = s?.values?.[activeAxis.code];
                  const hasVal = entry != null && entry.scorePercent != null && Number.isFinite(Number(entry.scorePercent));
                  return (
                    <div key={s.key} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-rp-text-2">
                          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {tr(s.label)}
                        </span>
                        <span className="font-bold tabular-nums text-rp-text">
                          {hasVal ? formatPercent(entry.scorePercent) : tr('Chưa đánh giá')}
                        </span>
                      </div>
                      {hasVal && (
                        <p className="text-[11px] text-rp-text-muted tabular-nums">
                          {[
                            entry.totalCount > 0 ? trf('{0}/{1} câu đúng', { 0: entry.correctCount ?? 0, 1: entry.totalCount }) : null,
                            entry.sampleCount > 0 ? trf('{0} lượt', { 0: entry.sampleCount }) : null,
                            entry.sourceLabel || null,
                            entry.dateLabel || null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  );
                })}

              {visibleSeries.length >= 2 && (() => {
                const baseScore = visibleSeries[0]?.values?.[activeAxis.code]?.scorePercent;
                const curScore = visibleSeries[1]?.values?.[activeAxis.code]?.scorePercent;
                if (baseScore == null || curScore == null) return null;
                const diff = Number(curScore) - Number(baseScore);
                return (
                  <div className="flex items-center justify-between border-t border-rp-line/70 pt-1 text-[11px]">
                    <span className="text-rp-text-muted">{tr('Chênh lệch')}</span>
                    <strong
                      className={cx(
                        'tabular-nums',
                        diff >= 2 ? 'text-emerald-600 dark:text-emerald-400' : diff <= -2 ? 'text-rose-600 dark:text-rose-400' : 'text-rp-text-2',
                      )}
                    >
                      {formatPercentagePointDelta(diff, tr)}
                    </strong>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Footer note & unassessed skill exclusion transparency */}
      {(scopeNote || unassessedSkills.length > 0) && (
        <div className="space-y-1.5 border-t border-rp-line/60 pt-2.5 text-[11px] text-rp-text-muted">
          {unassessedSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span>{tr('Chưa đưa vào biểu đồ (chưa có dữ liệu hợp lệ):')}</span>
              {unassessedSkills.map((sk) => (
                <Badge key={sk.skillCode} tone="neutral" size="sm" icon={false}>
                  {formatSkillLabel(sk.skillLabel || sk.skillCode, tr)}
                </Badge>
              ))}
            </div>
          )}
          {scopeNote && <p>{tr(scopeNote)}</p>}
        </div>
      )}
    </div>
  );
}
