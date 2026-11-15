import { useState } from 'react';
import { Link } from 'react-router-dom';

const labels = {
  vocabulary: 'Từ vựng', grammar: 'Ngữ pháp', reading: 'Đọc hiểu',
  listening: 'Nghe hiểu', speaking: 'Nói',
};
const allLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
const axes = Object.entries(labels).map(([code, label], index) => {
  const angle = index * 2 * Math.PI / 5 - Math.PI / 2;
  return { code, label, dx: Math.cos(angle), dy: Math.sin(angle) };
});
const formatPercent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const center = { x: 180, y: 124 };
const radius = 85;

function point(axis, scale) {
  const distance = radius * scale;
  return { x: center.x + axis.dx * distance, y: center.y + axis.dy * distance };
}

function polygon(points) {
  return points.map(({ x, y }) => x + ',' + y).join(' ');
}

export default function SkillAssessmentChart({ assessments, targetLevel, visibleLevels = allLevels, showStudyLevel = false }) {
  const [selection, setSelection] = useState(null);
  if (!assessments?.length) return null;

  const levelRank = level => visibleLevels.indexOf(level) + 1;
  const pointAtLevel = (axis, rank) => point(axis, rank / visibleLevels.length);
  const target = targetLevel || assessments.find(item => item.targetLevelCode)?.targetLevelCode;
  const targetRank = levelRank(target);
  const skills = axes.map(axis => {
    const assessment = assessments.find(item => item.skillCode === axis.code);
    const level = showStudyLevel ? assessment?.recommendedStudyLevelCode : assessment?.estimatedLevelCode;
    const rank = levelRank(level);
    const meetsTarget = showStudyLevel
      ? rank > 0 && level === target && assessment.levelBreakdowns?.some(item => item.levelCode === target && item.meetsPlanningThreshold)
      : targetRank > 0 && rank >= targetRank;
    const levelBand = showStudyLevel ? null : assessment?.estimatedLevelBand;
    const visibleBand = levelBand?.split(/\s*[–-]\s*/).every(level => levelRank(level)) ? levelBand : null;
    return { ...axis, assessment, level, rank, meetsTarget, visibleBand, mark: rank ? pointAtLevel(axis, rank) : null };
  });
  const allEstimated = skills.every(skill => skill.rank > 0);
  const jlptAxes = axes.filter(axis => axis.code !== 'speaking');
  const selected = skills.find(item => item.code === selection)
    ?? skills.find(item => item.assessment?.priority === 'high')
    ?? skills[0];
  const detail = selected.assessment;
  const visibleBreakdowns = detail?.levelBreakdowns?.filter(item => levelRank(item.levelCode)) ?? [];
  let progress = 'Cần thêm dữ liệu';
  if (selected.code === 'speaking' && !detail) {
    progress = 'Chưa đánh giá';
  } else if (showStudyLevel) {
    if (selected.rank) {
      progress = selected.meetsTarget
        ? 'Đạt mốc · Ôn duy trì'
        : 'Ôn từ ' + selected.level;
    }
  } else if (selected.rank && targetRank) {
    progress = selected.rank > targetRank ? 'Vượt mốc · Ôn duy trì'
      : selected.rank === targetRank ? 'Đạt mốc · Ôn duy trì'
        : selected.visibleBand ? 'Gần mốc · Ưu tiên ôn' : 'Dưới mốc · Ưu tiên ôn';
  } else if (detail?.hasSufficientEvidence) {
    progress = 'Chưa xác định cấp đạt';
  }

  return <section className="mt-4 rounded-xl border border-[#EADFE5] bg-white p-4 text-[#49353F]">
    <h3 className="text-sm font-bold">{showStudyLevel ? 'Mức ôn theo mục tiêu' : 'Năng lực so với mục tiêu'} {targetRank ? target : 'JLPT'}</h3>
    <div className="mt-3 grid items-start gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <figure className="mx-auto w-full max-w-[360px]">
        <svg aria-hidden="true" viewBox="0 0 360 228" className="block w-full">
          {visibleLevels.map((level, index) => <polygon key={level}
            points={polygon(axes.map(axis => pointAtLevel(axis, index + 1)))} fill="none" stroke="#E5D5DE" />)}
          {skills.map(axis => {
            const end = point(axis, 1);
            return <line key={axis.code} x1={center.x} y1={center.y} x2={end.x} y2={end.y}
              stroke={axis.code === selected.code ? '#C36587' : '#D9C6D2'} strokeDasharray={axis.mark ? undefined : '4 4'} />;
          })}
          {allEstimated
            ? <polygon points={polygon(skills.map(axis => axis.mark))} fill="#AD3155" fillOpacity=".17" stroke="#AD3155" strokeWidth="2" />
            : skills.map((axis, index) => {
                const next = skills[(index + 1) % skills.length];
                return axis.mark && next.mark ? <line key={axis.code}
                  x1={axis.mark.x} y1={axis.mark.y} x2={next.mark.x} y2={next.mark.y} stroke="#AD3155" strokeWidth="2" /> : null;
              })}
          {targetRank > 0 && <polyline points={polygon(jlptAxes.map(axis => pointAtLevel(axis, targetRank)))} fill="none"
            stroke="#365C9F" strokeDasharray="5 4" strokeWidth="2" />}
          {visibleLevels.map((level, index) => <text key={level} x={center.x + 7}
            y={pointAtLevel(axes[0], index + 1).y + 3} fill="#65535F" fontSize="10">{level}</text>)}
          {skills.map(axis => {
            const label = point(axis, 1.24);
            return <g key={axis.code}>
              <text x={label.x} y={label.y + 4} textAnchor={axis.dx > .1 ? 'start' : axis.dx < -.1 ? 'end' : 'middle'}
                fontWeight="600" fontSize="12" fill="#49353F">{axis.label}</text>
              {axis.mark && <circle cx={axis.mark.x} cy={axis.mark.y} r={axis.code === selected.code ? 5 : 4}
                fill="#AD3155" stroke="#fff" strokeWidth="1.5" />}
            </g>;
          })}
        </svg>
        <figcaption className="flex flex-wrap justify-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="w-4 border-t-2 border-[#AD3155]" /> {showStudyLevel ? 'Mức ôn đề xuất' : 'Năng lực ước lượng'}</span>
          {targetRank > 0 && <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="w-4 border-t-2 border-dashed border-[#365C9F]" /> Mốc JLPT {target}</span>}
        </figcaption>
        {!allEstimated && <p className="mt-2 text-center text-xs text-[#765E6B]">
          {showStudyLevel ? 'Trục để trống khi bài đánh giá chưa đủ dữ liệu cho kỹ năng đó.' : 'Trục chưa có điểm khi cấp độ đạt được chưa xác định.'}
        </p>}
      </figure>

      <div className="space-y-3">
        <div role="group" aria-label="Xem nhận xét từng trục" className="grid grid-cols-2 gap-2">
          {skills.map(axis => <button key={axis.code} type="button" aria-pressed={selected.code === axis.code}
            onClick={() => setSelection(axis.code)}
            className={'rounded-lg border p-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#AD3155] '
              + (selected.code === axis.code ? 'border-[#AD3155] bg-[#FFF3F7]' : 'border-[#EADFE5] bg-white')}>
            <span className="block text-xs font-semibold">{axis.label}</span>
            <span className="mt-1 block text-xs text-[#765E6B]">
              {axis.visibleBand || (axis.rank ? axis.level
                : axis.code === 'speaking' && !axis.assessment ? 'Chưa đánh giá'
                  : showStudyLevel ? 'Cần thêm dữ liệu' : 'Chưa xác định cấp đạt')}
            </span>
          </button>)}
        </div>
        <div aria-live="polite" className="space-y-2 rounded-lg bg-[#FAF4F7] p-3 text-xs leading-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h4 className="font-bold">{selected.label}</h4>
            <span className="font-semibold text-[#9E2A4B]">{progress}</span>
          </div>
          {detail ? <>
              {!showStudyLevel && Number.isFinite(detail.scorePercent) && <p>Kết quả bài đánh giá <strong>{formatPercent.format(detail.scorePercent)}% đúng</strong></p>}
              {visibleBreakdowns.length > 0 && <ul aria-label="Kết quả theo cấp độ" className="flex flex-wrap gap-1.5">
                {visibleBreakdowns.map(item => <li key={item.levelCode} className="rounded-md bg-white px-2 py-0.5">
                  {item.levelCode} · {item.correctCount}/{item.totalCount} đúng
                  {showStudyLevel && Number.isFinite(item.scorePercent) && ' (' + formatPercent.format(item.scorePercent) + '%)'}
                </li>)}
              </ul>}
              {detail.comment && (!showStudyLevel || !detail.estimatedLevelCode || levelRank(detail.estimatedLevelCode) > 0) && <p>{detail.comment}</p>}
              {detail.recommendation && <p><strong>Cách ôn</strong> · {detail.recommendation}</p>}
              {Number.isFinite(detail.suggestedStudySharePercent) && <p className="font-semibold text-[#9E2A4B]">
                {detail.suggestedStudySharePercent > 0
                  ? 'Tỷ trọng bài luyện đề xuất ' + formatPercent.format(detail.suggestedStudySharePercent) + '%'
                  : 'Kho bài hiện chưa có bài phù hợp cho kỹ năng này.'}
              </p>}
            </> : selected.code === 'speaking' ? <>
              <p>Kỹ năng nói được chấm riêng qua bài thu âm.</p>
              <Link to="/riki/speaking/" className="font-semibold text-[#9E2A4B] underline">Đến trang luyện nói</Link>
            </> : <p>Chưa có dữ liệu đánh giá.</p>}
        </div>
      </div>
    </div>
  </section>;
}
