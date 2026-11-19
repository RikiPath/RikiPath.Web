import { Link } from 'react-router-dom';
import { examSkills, formatScore, scoreDifference } from '@/features/mock-test/utils/examSkillScores.js';
import { useLocale } from '@/locales/locale.js';

const skills = [...examSkills, { code: 'speaking', label: 'Nói' }];
const axes = skills.map((skill, index) => {
  const angle = -Math.PI / 2 + index * 2 * Math.PI / skills.length;
  return { ...skill, x: Math.cos(angle), y: Math.sin(angle) };
});
const center = { x: 200, y: 150 };
const radius = 112;
const ticks = [20, 40, 60, 80, 100];
const colors = ['#FBBF24', '#FB7185'];
const chartBackground = '#211D25';

function point(axis, score) {
  const distance = radius * score / 100;
  return { x: center.x + axis.x * distance, y: center.y + axis.y * distance };
}

function polygon(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}

function ScoreSeries({ scores, color, dash }) {
  const marks = axes.map(axis => {
    const score = scores[axis.code];
    return score ? point(axis, 100 * Number(score.correct) / Number(score.count)) : null;
  });
  return <g stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {marks.every(Boolean) ? <polygon points={polygon(marks)} fill={color} fillOpacity=".12" strokeDasharray={dash} />
      : marks.map((mark, index) => {
        const next = marks[(index + 1) % marks.length];
        return mark && next ? <line key={axes[index].code} x1={mark.x} y1={mark.y} x2={next.x} y2={next.y} strokeDasharray={dash} /> : null;
      })}
    {marks.map((mark, index) => mark && <circle key={axes[index].code} cx={mark.x} cy={mark.y}
      r={dash ? 5 : 3.5} fill={dash ? chartBackground : color} />)}
  </g>;
}

function Score({ value }) {
  const { tr, trf } = useLocale();
  return value ? <>
    <strong className="break-all">{formatScore(value)}%</strong>
    <span className="block break-all text-xs text-rp-text-2">{trf('{0}/{1} đúng', { 0: String(value.correct), 1: String(value.count) })}</span>
    {value.missingAudio && <span className="mt-1 block text-xs text-rp-text-2">{tr('Có câu thiếu audio')}</span>}
  </> : <span className="text-xs text-rp-text-2">{tr('Thiếu dữ liệu')}</span>;
}

function absoluteDifference({ correct }) {
  return correct < 0n ? -correct : correct;
}

function Differences({ rows, comparedLabel }) {
  const { tr, trf } = useLocale();
  const comparable = rows.filter(row => row.difference);
  if (!comparable.length) return <p className="text-sm text-rp-text-2">{tr('Cần điểm của cùng một kỹ năng ở cả hai bài để tính chênh lệch.')}</p>;
  const higher = comparable.filter(row => row.difference.correct > 0n).map(row => row.skill.label);
  const lower = comparable.filter(row => row.difference.correct < 0n).map(row => row.skill.label);
  const equal = comparable.filter(row => row.difference.correct === 0n).map(row => row.skill.label);
  const largest = comparable.reduce((best, current) =>
    absoluteDifference(current.difference) * best.difference.count > absoluteDifference(best.difference) * current.difference.count
      ? current : best);
  return <div className="rounded-lg bg-rp-brand-tint p-3 text-sm">
    <p className="font-semibold">{trf('{0} so với mốc đối chiếu', { 0: comparedLabel })}</p>
    <ul className="mt-1 space-y-1">
      {higher.length > 0 && <li>{trf('Cao hơn ở {0}.', { 0: higher.join(', ') })}</li>}
      {lower.length > 0 && <li>{trf('Thấp hơn ở {0}.', { 0: lower.join(', ') })}</li>}
      {equal.length > 0 && <li>{trf('Bằng điểm ở {0}.', { 0: equal.join(', ') })}</li>}
    </ul>
    {higher.length + lower.length > 1 && <p className="mt-2">
      {tr('Chênh lệch lớn nhất ở')}{' '}<strong>{tr(largest.skill.label)}</strong> ({formatScore(largest.difference, true)}{' '}{tr('điểm %).')}
    </p>}
  </div>;
}

export default function ExamSkillRadar({ series, compare = false }) {
  const { tr } = useLocale();
  const rows = skills.map(skill => {
    const scores = series.map(item => item.scores[skill.code]);
    return { skill, scores, difference: compare ? scoreDifference(scores[0], scores[1]) : null };
  });
  const lines = series.map((item, index) => ({
    ...item,
    color: colors[series.length > 1 ? index : 1],
    dash: series.length > 1 && index === 0 ? '5 4' : undefined,
  }));

  return <div className="space-y-3" aria-live="polite">
    <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <figure className="mx-auto w-full max-w-[400px] rounded-xl bg-[#211D25] px-1 pb-4 text-white sm:px-2">
        <svg viewBox="0 0 400 278" aria-hidden="true" className="block w-full">
          {ticks.map(tick => <polygon key={tick} points={polygon(axes.map(axis => point(axis, tick)))} fill="none"
            stroke={tick === 100 ? '#817383' : '#5B4D5D'} strokeWidth={tick === 100 ? 1.8 : 1} />)}
          {axes.map(axis => {
            const end = point(axis, 100);
            const label = point(axis, 115);
            return <g key={axis.code}>
              <line x1={center.x} y1={center.y} x2={end.x} y2={end.y} stroke="#756777" />
              <text x={label.x} y={label.y + 4} fill="#FBF5F8" fontSize="14" fontWeight="600"
                textAnchor={axis.x > .1 ? 'start' : axis.x < -.1 ? 'end' : 'middle'}>{tr(axis.label)}</text>
            </g>;
          })}
          {ticks.map(tick => <text key={tick} x={center.x + 8} y={point(axes[0], tick).y + 3} fontSize="10" fill="#DDD1DC">{tick}%</text>)}
          {lines.map(item => <ScoreSeries key={item.label} scores={item.scores} color={item.color} dash={item.dash} />)}
        </svg>
        <figcaption className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {lines.map(item => <span key={item.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="w-5 border-t-2" style={{ borderColor: item.color, borderStyle: item.dash ? 'dashed' : 'solid' }} />
            {tr(item.label)}
          </span>)}
        </figcaption>
      </figure>
      <div className="min-w-0 overflow-x-auto" tabIndex={0} role="region" aria-label={tr('Bảng điểm theo kỹ năng')}>
        <table aria-label={tr('Tỷ lệ câu đúng theo kỹ năng')} className="w-full min-w-[16rem] table-fixed text-center text-xs sm:text-sm">
          <thead className="text-rp-text-2">
            <tr className="border-b border-rp-line">
              <th scope="col" className="py-2 text-left">{tr('Kỹ năng')}</th>
              {series.map(item => <th scope="col" key={item.label} className="px-1 py-2">{tr(item.label)}</th>)}
              {compare && <th scope="col" className="px-1 py-2">{tr('Chênh lệch')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-rp-line">
            {rows.map(({ skill, scores, difference }) => <tr key={skill.code}>
              <th scope="row" className="py-3 pr-1 text-left font-semibold">{tr(skill.label)}</th>
              {skill.code === 'speaking' && scores.every(score => !score) ? <td colSpan={series.length + Number(compare)} className="px-1 py-3 text-xs text-rp-text-2">
                {tr('Chấm riêng ở')}{' '}<Link to="/riki/speaking/" className="rp-focus rp-link rounded-sm">{tr('Luyện nói')}</Link>
              </td> : <>
                {scores.map((value, index) => <td key={series[index].label} className="px-1 py-3"><Score value={value} /></td>)}
                {compare && <td className={'break-all px-1 py-3 font-semibold ' + (difference?.correct > 0n ? 'text-emerald-800' : difference?.correct < 0n ? 'text-rp-brand-strong' : '')}>
                  {difference ? <>{formatScore(difference, true)}<span className="block text-[11px] font-normal">{tr('điểm %')}</span></>
                    : <span aria-label={tr('Thiếu dữ liệu')}>—</span>}
                </td>}
              </>}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    {compare && <Differences rows={rows} comparedLabel={tr(series[1].label)} />}
  </div>;
}
