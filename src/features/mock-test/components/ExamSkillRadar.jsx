import { Badge, EmptyState, ProgressBar } from '@/components/ui';
import {
  examSkills,
  formatScore,
  getEvaluatedSkills,
  isValidSkillScore,
  scoreDifference,
} from '@/features/mock-test/utils/examSkillScores.js';
import { useLocale } from '@/locales/locale.js';

const center = { x: 220, y: 158 };
const radius = 102;
const ticks = [20, 40, 60, 80, 100];
const colors = ['#F59E0B', '#E05A7A'];
const chartBackground = 'var(--color-rp-surface, #FFFFFF)';

function buildAxes(skills) {
  return skills.map((skill, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / skills.length;
    return { ...skill, x: Math.cos(angle), y: Math.sin(angle) };
  });
}

function point(axis, score) {
  const distance = (radius * score) / 100;
  return { x: center.x + axis.x * distance, y: center.y + axis.y * distance };
}

function polygon(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}

function ScoreSeries({ axes, scores, color, dash, animate = false }) {
  const marks = axes.map((axis) => {
    const score = scores?.[axis.code];
    return isValidSkillScore(score)
      ? point(axis, (100 * Number(score.correct)) / Number(score.count))
      : null;
  });
  const activeMarks = marks.filter(Boolean);

  return (
    <g
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={animate ? 'rp-radar-reveal' : undefined}
      style={animate ? { transformOrigin: `${center.x}px ${center.y}px` } : undefined}
    >
      {activeMarks.length >= 3 ? (
        <polygon points={polygon(activeMarks)} fill={color} fillOpacity=".16" strokeDasharray={dash} />
      ) : (
        marks.map((mark, index) => {
          const next = marks[(index + 1) % marks.length];
          return mark && next ? (
            <line key={axes[index].code} x1={mark.x} y1={mark.y} x2={next.x} y2={next.y} strokeDasharray={dash} />
          ) : null;
        })
      )}
      {marks.map((mark, index) =>
        mark ? (
          <circle
            key={axes[index].code}
            cx={mark.x}
            cy={mark.y}
            r={dash ? 5 : 3.5}
            fill={dash ? chartBackground : color}
          />
        ) : null,
      )}
    </g>
  );
}

function Score({ value, unevaluatedReason }) {
  const { tr, trf } = useLocale();
  return isValidSkillScore(value) ? (
    <>
      <strong className="whitespace-nowrap tabular-nums text-rp-text">{formatScore(value)}%</strong>
      <span className="block whitespace-nowrap text-xs tabular-nums text-rp-text-2">
        {trf('{0}/{1} đúng', { 0: String(value.correct), 1: String(value.count) })}
      </span>
    </>
  ) : (
    <span className="inline-flex flex-col items-center gap-0.5 text-xs text-rp-text-muted">
      <Badge tone="neutral" size="sm" icon={false}>{tr('Chưa đánh giá')}</Badge>
      {unevaluatedReason === 'missing_audio' && (
        <span className="text-[11px] text-rp-text-muted">{tr('Thiếu audio')}</span>
      )}
    </span>
  );
}

function resolveSkillRowStatus(scores = []) {
  const valid = scores.filter(isValidSkillScore);
  if (valid.length === 0) {
    return { tone: 'neutral', label: 'Chưa đánh giá' };
  }
  const totals = valid.reduce(
    (acc, item) => ({
      correct: acc.correct + BigInt(item.correct),
      count: acc.count + BigInt(item.count),
    }),
    { correct: 0n, count: 0n },
  );
  if (totals.count <= 0n) {
    return { tone: 'neutral', label: 'Chưa đánh giá' };
  }
  const pct = Number((totals.correct * 100n + totals.count / 2n) / totals.count);
  if (pct >= 80) return { tone: 'success', label: 'Nền tảng vững' };
  if (pct >= 50) return { tone: 'warning', label: 'Trung bình' };
  return { tone: 'danger', label: 'Cần củng cố' };
}

function absoluteDifference({ correct }) {
  return correct < 0n ? -correct : correct;
}

function Differences({ rows, comparedLabel }) {
  const { tr, trf } = useLocale();
  const comparable = rows.filter((row) => row.difference);
  if (!comparable.length) {
    return (
      <p className="text-sm text-rp-text-2">
        {tr('Cần điểm của cùng một kỹ năng ở cả hai bài để tính chênh lệch.')}
      </p>
    );
  }
  const higher = comparable.filter((row) => row.difference.correct > 0n).map((row) => tr(row.skill.label));
  const lower = comparable.filter((row) => row.difference.correct < 0n).map((row) => tr(row.skill.label));
  const equal = comparable.filter((row) => row.difference.correct === 0n).map((row) => tr(row.skill.label));
  const largest = comparable.reduce((best, current) =>
    absoluteDifference(current.difference) * best.difference.count >
    absoluteDifference(best.difference) * current.difference.count
      ? current
      : best,
  );
  return (
    <div className="rounded-rp-input border border-rp-line bg-rp-surface p-3.5 text-sm">
      <p className="font-semibold text-rp-text">{trf('{0} so với mốc đối chiếu', { 0: comparedLabel })}</p>
      <ul className="mt-1.5 space-y-1 text-rp-text-2">
        {higher.length > 0 && <li>{trf('Cao hơn ở {0}.', { 0: higher.join(', ') })}</li>}
        {lower.length > 0 && <li>{trf('Thấp hơn ở {0}.', { 0: lower.join(', ') })}</li>}
        {equal.length > 0 && <li>{trf('Bằng điểm ở {0}.', { 0: equal.join(', ') })}</li>}
      </ul>
      {higher.length + lower.length > 1 && (
        <p className="mt-2 text-rp-text">
          {tr('Chênh lệch lớn nhất ở')}{' '}
          <strong>{tr(largest.skill.label)}</strong>{' '}
          ({formatScore(largest.difference, true)}{' '}{tr('điểm %')}).
        </p>
      )}
    </div>
  );
}

function SkillProgressFallback({ evaluatedSkills, lines }) {
  const { tr, trf } = useLocale();
  if (evaluatedSkills.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-rp-card border border-rp-line bg-rp-bg-2/70 p-4">
        <EmptyState
          variant="inline"
          size="sm"
          illustration="chart"
          title={tr('Chưa có đủ dữ liệu kỹ năng hợp lệ để vẽ biểu đồ.')}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between space-y-3 rounded-rp-card border border-rp-line bg-rp-bg-2/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-rp-text-2">
          {trf('Biểu đồ cột cho {0} kỹ năng đã đánh giá', { 0: evaluatedSkills.length })}
        </span>
        <div className="flex flex-wrap gap-3 text-xs font-medium text-rp-text-2">
          {lines.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {tr(item.label)}
            </span>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {evaluatedSkills.map((skill) => (
          <li key={skill.code} className="space-y-1.5">
            <p className="text-xs font-semibold text-rp-text">{tr(skill.label)}</p>
            {lines.map((item) => {
              const score = item.scores?.[skill.code];
              const pct = isValidSkillScore(score)
                ? Math.round((Number(score.correct) * 100) / Number(score.count))
                : null;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11.5px] text-rp-text-muted">
                    <span>{tr(item.label)}</span>
                    <span className="font-semibold tabular-nums text-rp-text">
                      {pct != null ? `${pct}% (${String(score.correct)}/${String(score.count)})` : tr('Chưa đánh giá')}
                    </span>
                  </div>
                  <ProgressBar
                    value={pct ?? 0}
                    max={100}
                    tone={item.dash ? 'neutral' : 'brand'}
                    label={`${tr(skill.label)} - ${tr(item.label)}`}
                  />
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExamSkillRadar({ series, compare = false, unevaluatedNotes = {}, animate = false }) {
  const { tr } = useLocale();
  const rows = examSkills.map((skill) => {
    const scores = series.map((item) => item.scores?.[skill.code]);
    return {
      skill,
      scores,
      status: !compare ? resolveSkillRowStatus(scores) : null,
      difference: compare ? scoreDifference(scores[0], scores[1]) : null,
      unevaluatedReason: unevaluatedNotes?.[skill.code]?.reason ?? null,
    };
  });
  const lines = series.map((item, index) => ({
    ...item,
    color: colors[series.length > 1 ? index : 1],
    dash: series.length > 1 && index === 0 ? '5 4' : undefined,
  }));
  const evaluatedSkills = getEvaluatedSkills(series);
  const canRenderRadar = evaluatedSkills.length >= 3;
  const axes = canRenderRadar ? buildAxes(evaluatedSkills) : [];

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {canRenderRadar ? (
          <figure className="mx-auto flex h-full w-full max-w-[440px] flex-col items-center justify-between rounded-rp-card border border-rp-line bg-rp-bg-2/50 px-3 pt-2 pb-4 text-rp-text lg:max-w-none">
            <svg viewBox="0 0 440 300" aria-hidden="true" className="my-auto block w-full max-w-[400px]">
              {ticks.map((tick) => (
                <polygon
                  key={tick}
                  points={polygon(axes.map((axis) => point(axis, tick)))}
                  fill="none"
                  stroke={tick === 100 ? 'var(--color-rp-line-strong, #DEC9CE)' : 'var(--color-rp-line, #EAE3E4)'}
                  strokeWidth={tick === 100 ? 1.6 : 1}
                />
              ))}
              {axes.map((axis) => {
                const end = point(axis, 100);
                const label = point(axis, 120);
                return (
                  <g key={axis.code}>
                    <line
                      x1={center.x}
                      y1={center.y}
                      x2={end.x}
                      y2={end.y}
                      stroke="var(--color-rp-line-strong, #DEC9CE)"
                    />
                    <text
                      x={label.x}
                      y={label.y + 4}
                      fill="var(--color-rp-text, #2D282A)"
                      fontSize="13.5"
                      fontWeight="600"
                      textAnchor={axis.x > 0.1 ? 'start' : axis.x < -0.1 ? 'end' : 'middle'}
                    >
                      {tr(axis.label)}
                    </text>
                  </g>
                );
              })}
              {ticks.map((tick) => (
                <text
                  key={tick}
                  x={center.x + 8}
                  y={point(axes[0], tick).y + 3}
                  fontSize="10"
                  fill="var(--color-rp-text-muted, #776C70)"
                >
                  {tick}%
                </text>
              ))}
              {lines.map((item) => (
                <ScoreSeries
                  key={item.label}
                  axes={axes}
                  scores={item.scores}
                  color={item.color}
                  dash={item.dash}
                  animate={animate}
                />
              ))}
            </svg>
            <figcaption className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs font-semibold text-rp-text-2">
              {lines.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="w-5 border-t-2"
                    style={{ borderColor: item.color, borderStyle: item.dash ? 'dashed' : 'solid' }}
                  />
                  {tr(item.label)}
                </span>
              ))}
            </figcaption>
          </figure>
        ) : (
          <SkillProgressFallback evaluatedSkills={evaluatedSkills} lines={lines} />
        )}

        <div
          className="flex min-w-0 flex-col justify-center overflow-x-auto rounded-rp-card border border-rp-line bg-rp-surface"
          tabIndex={0}
          role="region"
          aria-label={tr('Bảng điểm theo kỹ năng')}
        >
          <table aria-label={tr('Tỷ lệ câu đúng theo kỹ năng')} className="w-full min-w-[26rem] text-center text-xs sm:text-sm">
            <thead className="bg-rp-bg-2 text-rp-text-2">
              <tr className="border-b border-rp-line">
                <th scope="col" className="min-w-[6.75rem] whitespace-nowrap px-4 py-3 text-left font-semibold">
                  {tr('Kỹ năng')}
                </th>
                {series.map((item) => (
                  <th scope="col" key={item.label} className="whitespace-nowrap px-3 py-3 font-semibold">
                    {tr(item.label)}
                  </th>
                ))}
                {!compare && (
                  <th scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">
                    {tr('Trạng thái')}
                  </th>
                )}
                {compare && (
                  <th scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">
                    {tr('Chênh lệch')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-rp-line">
              {rows.map(({ skill, scores, status, difference, unevaluatedReason }) => (
                <tr key={skill.code} className="transition-colors hover:bg-rp-bg-2/60">
                  <th scope="row" className="min-w-[6.75rem] whitespace-nowrap px-4 py-3.5 text-left font-semibold text-rp-text">
                    {tr(skill.label)}
                  </th>
                  {scores.map((value, index) => (
                    <td key={series[index].label} className="px-3 py-3.5">
                      <Score
                        value={value}
                        unevaluatedReason={!isValidSkillScore(value) ? unevaluatedReason : null}
                      />
                    </td>
                  ))}
                  {!compare && status && (
                    <td className="px-3 py-3.5">
                      <Badge tone={status.tone} size="sm" icon={false} className="whitespace-nowrap">
                        {tr(status.label)}
                      </Badge>
                    </td>
                  )}
                  {compare && (
                    <td
                      className={`whitespace-nowrap px-3 py-3.5 font-semibold tabular-nums ${
                        difference?.correct > 0n
                          ? 'text-rp-success'
                          : difference?.correct < 0n
                            ? 'text-rp-danger'
                            : 'text-rp-text-2'
                      }`}
                    >
                      {difference ? (
                        <>
                          {formatScore(difference, true)}
                          <span className="block text-[11px] font-normal">{tr('điểm %')}</span>
                        </>
                      ) : (
                        <span aria-label={tr('Chưa đánh giá')}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {compare && <Differences rows={rows} comparedLabel={tr(series[1].label)} />}
    </div>
  );
}
