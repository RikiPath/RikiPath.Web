import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge, Button, Card, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import WebClayIcon from './WebClayIcon.jsx';
import { pickNextRoadmapDay } from './learnerTokens.js';

const STAGE_NODE_COORDS = [
  { x: 135, y: 162 },
  { x: 345, y: 112 },
  { x: 555, y: 146 },
  { x: 765, y: 78 },
];

function buildPreviewNodes({
  targetLevel,
  hasPlacementCompleted,
  hasActiveAiPath,
  hasAiCredit,
  latestPath,
  tr,
  trf,
}) {
  const goalCode = targetLevel || 'JLPT';
  const phases = Array.isArray(latestPath?.phases) ? latestPath.phases : [];

  if (hasActiveAiPath && phases.length > 0) {
    const sliced = phases.slice(0, 4);
    const totalDays = Array.isArray(latestPath.dailySchedules) ? latestPath.dailySchedules.length : 0;
    const doneDays = Array.isArray(latestPath.dailySchedules)
      ? latestPath.dailySchedules.filter((d) => d?.isCompleted).length
      : 0;

    return sliced.map((phase, idx) => {
      const days = Array.isArray(latestPath?.dailySchedules)
        ? latestPath.dailySchedules.filter((d) => d.phaseNumber === phase.phaseNumber || d.phaseId === phase.phaseId)
        : [];
      const phaseDone = days.length > 0 && days.every((d) => d.isCompleted);
      const isCurrent =
        !phaseDone &&
        (days.some((d) => d.isStarted && !d.isCompleted) ||
          sliced.findIndex((_, i) => i >= idx && i === idx) === idx);
      return {
        id: phase.phaseNumber ?? idx + 1,
        coord: STAGE_NODE_COORDS[idx] || STAGE_NODE_COORDS[idx % 4],
        title: phase.title || trf('Chặng {0}', { 0: idx + 1 }),
        badge: phase.focusSkillName || phase.jlptLevelName || `Stage ${idx + 1}`,
        subtitle: phase.summary || phase.goal || tr('Hoàn thành các ngày học trong chặng để tiến gần hơn tới mục tiêu.'),
        status: phaseDone ? 'done' : idx === 0 || sliced.slice(0, idx).every((_p, pi) => pi < idx && phaseDone) ? 'active' : isCurrent ? 'active' : 'locked',
        icons: ['kanji', 'reading', 'grammar'],
        tasks: days.length > 0
          ? days.slice(0, 5).map((d) => ({
              label: d.title || trf('Ngày {0}', { 0: d.dayNumber || 1 }),
              done: Boolean(d.isCompleted),
            }))
          : [
              { label: tr('Từ vựng trọng tâm'), done: false },
              { label: tr('Ngữ pháp cốt lõi'), done: false },
              { label: tr('Đọc hiểu & Nghe hiểu'), done: false },
              { label: tr('Ôn lại SRS'), done: false },
            ],
        summaryNote: totalDays > 0 ? `${doneDays}/${totalDays} ${tr('ngày hoàn thành')}` : undefined,
      };
    });
  }

  const stage1Done = Boolean(targetLevel);
  const stage2Done = Boolean(hasPlacementCompleted);

  return [
    {
      id: 'goal',
      coord: STAGE_NODE_COORDS[0],
      title: stage1Done ? trf('Mục tiêu {0}', { 0: goalCode }) : tr('Đặt mục tiêu JLPT'),
      badge: 'Bước 01',
      subtitle: stage1Done
        ? trf('Đã chọn mục tiêu {0} làm kim chỉ nam.', { 0: goalCode })
        : tr('Chọn cấp độ JLPT mong muốn để hệ thống cá nhân hóa.'),
      status: stage1Done ? 'done' : 'active',
      to: '/onboarding/',
      cta: stage1Done ? tr('Xem lại mục tiêu') : tr('Đặt mục tiêu JLPT'),
      icons: ['dashboard', 'roadmap', 'calendar'],
      tasks: [
        { label: tr('Chọn cấp độ mục tiêu (N5–N2)'), done: stage1Done },
        { label: tr('Thiết lập ngày dự thi'), done: stage1Done },
        { label: tr('Ước lượng thời lượng mỗi ngày'), done: stage1Done },
      ],
    },
    {
      id: 'placement',
      coord: STAGE_NODE_COORDS[1],
      title: tr('Đánh giá năng lực'),
      badge: 'Bước 02',
      subtitle: stage2Done
        ? tr('Đã ghi nhận kết quả đánh giá năng lực 4 kỹ năng.')
        : tr('Xác định điểm xuất phát thực tế qua 4 kỹ năng JLPT.'),
      status: stage2Done ? 'done' : stage1Done ? 'active' : 'locked',
      to: '/app/placement-test/',
      cta: stage2Done ? tr('Xem kết quả đánh giá') : tr('Làm đánh giá năng lực'),
      icons: ['placement', 'listening', 'reading'],
      tasks: [
        { label: tr('Từ vựng & Hán tự'), done: stage2Done },
        { label: tr('Ngữ pháp JLPT'), done: stage2Done },
        { label: tr('Đọc hiểu & Nghe hiểu'), done: stage2Done },
      ],
    },
    {
      id: 'ai-roadmap',
      coord: STAGE_NODE_COORDS[2],
      mapLabel: tr('Lộ trình AI'),
      title: tr('Lộ trình cá nhân hóa AI'),
      badge: tr('Bước 03'),
      subtitle: hasAiCredit
        ? tr('Mở khóa lịch học từng ngày bám sát điểm yếu của bạn.')
        : tr('Mở khóa lộ trình AI theo từng tuần và lịch nhắc SRS.'),
      status: hasActiveAiPath ? 'done' : stage2Done ? 'active' : 'locked',
      to: !stage2Done ? '/app/placement-test/' : hasAiCredit ? '/roadmap/?generateAi=1' : '/plans/',
      cta: !stage2Done
        ? tr('Hoàn thành đánh giá trước')
        : hasAiCredit
          ? tr('Khám phá lộ trình AI')
          : tr('Xem gói lượt AI'),
      icons: ['ai', 'roadmap', 'srs'],
      tasks: [
        { label: tr('Chia chặng ôn theo tuần'), done: hasActiveAiPath },
        { label: tr('Gợi ý bài học bù lỗ hổng'), done: hasActiveAiPath },
        { label: tr('Kết hợp ôn thẻ SRS mỗi ngày'), done: hasActiveAiPath },
      ],
    },
    {
      id: 'mastery',
      coord: STAGE_NODE_COORDS[3],
      title: trf('Chinh phục {0}', { 0: goalCode }),
      badge: 'Đích đến',
      subtitle: tr('Sẵn sàng thi thử JLPT chuẩn giờ và theo dõi điểm tiến bộ.'),
      status: 'locked',
      to: '/mock-tests/',
      cta: tr('Khám phá thi thử JLPT'),
      icons: ['achievement', 'mock', 'group'],
      tasks: [
        { label: tr('Luyện đề thi thử JLPT'), done: false },
        { label: tr('Chấm bài Viết / Nói với AI'), done: false },
        { label: tr('Luyện trực tiếp cùng Giáo viên'), done: false },
      ],
    },
  ];
}

/**
 * Centerpiece Japanese Landscape Learning Journey Map ("Hành trình chinh phục JLPT") + Unified Stage Focus Split Box.
 * Inspired by IELTSWithHarry visual clarity, reimagined with RikiPath original Fuji / Torii / Sakura SVG scenery.
 */
export default function LearningJourneyMap({
  targetLevel,
  roadmapAccess = {},
  hasAiCredit = true,
  className,
}) {
  const { tr, trf } = useLocale();
  const hasActiveAiPath = Boolean(roadmapAccess?.hasActiveAiPath);
  const latestPath = roadmapAccess?.latestPath;
  const hasPlacementCompleted = Boolean(roadmapAccess?.hasPlacementCompleted);

  const nodes = useMemo(
    () =>
      buildPreviewNodes({
        targetLevel,
        hasPlacementCompleted,
        hasActiveAiPath,
        hasAiCredit,
        latestPath,
        tr,
        trf,
      }),
    [targetLevel, hasPlacementCompleted, hasActiveAiPath, hasAiCredit, latestPath, tr, trf],
  );

  const defaultSelectedIndex = useMemo(() => {
    const activeIdx = nodes.findIndex((n) => n.status === 'active');
    if (activeIdx >= 0) return activeIdx;
    const lastDoneIdx = nodes.findLastIndex((n) => n.status === 'done');
    return lastDoneIdx >= 0 ? lastDoneIdx : 0;
  }, [nodes]);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const resolvedIndex = selectedIndex != null && nodes[selectedIndex] ? selectedIndex : defaultSelectedIndex;
  const currentStage = nodes[resolvedIndex] || nodes[0];

  const nextDay = useMemo(() => pickNextRoadmapDay(latestPath), [latestPath]);
  const primaryActionTo =
    hasActiveAiPath && nextDay?.lessons?.[0]?.lessonId
      ? `/lesson-player/?lessonId=${nextDay.lessons[0].lessonId}`
      : hasActiveAiPath
        ? '/roadmap/'
        : currentStage?.to || '/roadmap/';
  const primaryActionLabel = hasActiveAiPath
    ? (nextDay?.isStarted ? tr('Tiếp tục ngày học') : tr('Vào lộ trình'))
    : (currentStage?.cta || tr('Mở lộ trình học'));

  return (
    <Card
      className={cx('flex flex-col overflow-hidden border-rp-line bg-white p-4 shadow-rp-sm sm:p-5', className)}
      data-section="LearningJourneyMap"
    >
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <WebClayIcon name="roadmap" size="sm" tone="sakura" hover className="-my-1" />
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold tracking-tight text-rp-navy sm:text-[18px]">
              {tr('Lộ trình học của bạn')}
            </h2>
            <p className="truncate text-xs text-rp-text-2">
              {hasActiveAiPath
                ? trf('{0} chặng học cá nhân hóa · Mục tiêu JLPT {1}', {
                    0: Array.isArray(latestPath?.phases) ? latestPath.phases.length : nodes.length,
                    1: targetLevel || 'JLPT',
                  })
                : trf('4 bước từ đánh giá năng lực đến chinh phục {0}', { 0: targetLevel || 'JLPT' })}
            </p>
          </div>
        </div>

        <Button
          as={Link}
          to="/roadmap/"
          variant="secondary"
          size="sm"
          iconRight={ArrowRight}
        >
          {hasActiveAiPath ? tr('Xem toàn bộ lộ trình') : trf('Xem {0} bước', { 0: nodes.length })}
        </Button>
      </div>

      {/* Compact 2-Column Body on Desktop: Map (7-8 cols) + Active Stage Detail Card (4-5 cols) */}
      <div className="mt-3.5 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        {/* Left: Scenic Japanese Landscape Winding Path Canvas (never full-width stretched, never clipped) */}
        <div className="relative flex items-center overflow-hidden rounded-2xl border border-rp-line/80 bg-[#EFF5FB] lg:col-span-7 xl:col-span-8">
          <svg
            viewBox="0 0 900 230"
            className="block h-auto w-full select-none"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={tr('Bản đồ hành trình chinh phục JLPT')}
          >
            <defs>
              <linearGradient id="rpMapSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FDF6F3" />
                <stop offset="62%" stopColor="#F1F5FC" />
                <stop offset="100%" stopColor="#E6F6EF" />
              </linearGradient>
              <linearGradient id="rpFujiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#899BC4" />
                <stop offset="100%" stopColor="#C3D0EA" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="rpHillFront" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#DFF4EA" />
                <stop offset="50%" stopColor="#E8F6EE" />
                <stop offset="100%" stopColor="#D7ECE2" />
              </linearGradient>
            </defs>

            {/* Subtle sky canvas */}
            <rect width="900" height="230" fill="url(#rpMapSky)" />
            <circle cx="110" cy="48" r="22" fill="#FCE09B" opacity="0.55" />
            <circle cx="110" cy="48" r="15" fill="#F8C868" opacity="0.85" />

            {/* Floating soft clouds */}
            <path d="M260 48h64a13 13 0 0 0 0-26h-6a19 19 0 0 0-36-4 13 13 0 0 0-22 13z" fill="rgba(255,255,255,0.75)" />
            <path d="M500 36h50a10 10 0 0 0 0-20h-4a15 15 0 0 0-27-2 10 10 0 0 0-19 10z" fill="rgba(255,255,255,0.72)" />

            {/* Mt. Fuji stylized silhouette behind Destination Peak */}
            <path d="M635 182 L758 38 Q764 30 772 38 L895 182 Z" fill="url(#rpFujiGrad)" />
            <path
              d="M724 78 L758 38 Q764 30 772 38 L805 78 L790 86 L776 75 L762 87 L746 74 Z"
              fill="#FFFFFF"
              opacity="0.92"
            />

            {/* Rolling distant hills */}
            <path d="M0 148 Q190 92 415 130 T810 116 L900 128 L900 230 L0 230 Z" fill="#E3ECF9" opacity="0.72" />
            <path d="M0 168 Q255 132 510 158 T900 144 L900 230 L0 230 Z" fill="url(#rpHillFront)" />

            {/* Pond at bottom left */}
            <ellipse cx="210" cy="202" rx="64" ry="11" fill="#B7DCF6" opacity="0.65" />
            <ellipse cx="210" cy="202" rx="46" ry="7" fill="#D5EBFA" opacity="0.7" />

            {/* Sakura Blossom Trees & Decorative Torii Gate */}
            <g transform="translate(46 130)">
              <rect x="8" y="24" width="5" height="20" rx="2.5" fill="#7D5A58" />
              <circle cx="10" cy="18" r="14" fill="#F8BBD0" opacity="0.9" />
              <circle cx="2" cy="22" r="9" fill="#F48FB1" opacity="0.85" />
              <circle cx="19" cy="21" r="10" fill="#FCE4EC" opacity="0.95" />
            </g>
            <g transform="translate(848 122)">
              <rect x="7" y="22" width="5" height="18" rx="2.5" fill="#7D5A58" />
              <circle cx="9" cy="17" r="13" fill="#F8BBD0" opacity="0.9" />
              <circle cx="17" cy="21" r="8" fill="#FCE4EC" opacity="0.95" />
            </g>
            {/* Minimalist Vermilion Torii near Stage 3-4 */}
            <g transform="translate(642 98)" opacity="0.82">
              <rect x="0" y="6" width="38" height="4.5" rx="2" fill="#D94E5C" />
              <rect x="4" y="13" width="30" height="3" rx="1.5" fill="#D94E5C" />
              <rect x="7" y="9" width="4" height="25" rx="1.5" fill="#C9414E" />
              <rect x="27" y="9" width="4" height="25" rx="1.5" fill="#C9414E" />
            </g>

            {/* Winding Road connecting the 4 Checkpoints */}
            <path
              d="M 135 162 C 225 144, 270 118, 345 112 C 435 104, 470 150, 555 146 C 645 142, 695 104, 765 78"
              stroke="#DFD8D6"
              strokeWidth="20"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 135 162 C 225 144, 270 118, 345 112 C 435 104, 470 150, 555 146 C 645 142, 695 104, 765 78"
              stroke="#FFFDF9"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 135 162 C 225 144, 270 118, 345 112 C 435 104, 470 150, 555 146 C 645 142, 695 104, 765 78"
              stroke="#C9B9BD"
              strokeWidth="2.2"
              strokeDasharray="7 7"
              strokeLinecap="round"
              fill="none"
            />

            {/* Checkpoint Platforms */}
            {nodes.map((node, idx) => {
              const { x, y } = node.coord;
              const selected = idx === resolvedIndex;
              const isDone = node.status === 'done';
              const isActive = node.status === 'active';
              const fillTop = isDone ? '#E8F7EF' : isActive ? '#FCEAEF' : '#ECE9EE';
              const fillSide = isDone ? '#167C53' : isActive ? '#E05A7A' : '#9AA3B5';

              return (
                <g
                  key={node.id}
                  transform={`translate(${x} ${y})`}
                  onClick={() => setSelectedIndex(idx)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.title} (${node.badge})`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(idx);
                    }
                  }}
                >
                  {/* Selection glow */}
                  {selected && (
                    <ellipse cx="0" cy="-2" rx="33" ry="14" fill="rgba(224,90,122,0.18)" />
                  )}
                  {/* 2.5D Platform Pedestal */}
                  <ellipse cx="0" cy="4" rx="24" ry="10" fill={fillSide} />
                  <ellipse
                    cx="0"
                    cy="-2"
                    rx="24"
                    ry="10"
                    fill={fillTop}
                    stroke={selected ? '#25304D' : '#FFFFFF'}
                    strokeWidth={selected ? '2.5' : '2'}
                  />

                  {/* Status Badge Floating Above Platform */}
                  <g transform="translate(0 -23)">
                    <circle
                      r="12.5"
                      fill={isDone ? '#167C53' : isActive ? '#E05A7A' : '#FFFFFF'}
                      stroke={isDone || isActive ? '#FFFFFF' : '#CBD3E1'}
                      strokeWidth="2"
                    />
                    {isDone ? (
                      <path d="M-4.5 0.5l3.2 3.2L5-3.2" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    ) : isActive ? (
                      <circle r="4.2" fill="#FFFFFF" />
                    ) : (
                      <>
                        <rect x="-4.5" y="-1" width="9" height="6.5" rx="1.8" fill="#8C95A6" />
                        <path d="M-2.8-1v-2.2a2.8 2.8 0 0 1 5.6 0V-1" stroke="#8C95A6" strokeWidth="1.7" fill="none" />
                      </>
                    )}
                  </g>

                  {/* Crisp White Pill Label Under Platform */}
                  <g transform="translate(0 26)">
                    <rect
                      x="-68"
                      y="-11.5"
                      width="136"
                      height="23"
                      rx="8.5"
                      fill="#FFFFFF"
                      stroke={selected ? '#E05A7A' : '#EAE3E4'}
                      strokeWidth={selected ? '1.8' : '1.2'}
                    />
                    <text
                      textAnchor="middle"
                      y="3.8"
                      fontSize="11"
                      fontWeight="700"
                      fill={selected ? '#B53D5C' : '#25304D'}
                    >
                      {node.mapLabel || (node.title.length > 18 ? `${node.title.slice(0, 17)}…` : node.title)}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Compact Stage Focus Card beside the map (4-5 cols on Desktop) */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-rp-brand-border/75 bg-rp-brand-tint/45 p-4 lg:col-span-5 xl:col-span-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <WebClayIcon name={currentStage?.icons?.[0] || 'ai'} size="md" hover className="-my-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    tone={currentStage?.status === 'done' ? 'success' : currentStage?.status === 'active' ? 'brand' : 'neutral'}
                    icon={Sparkles}
                    size="sm"
                  >
                    {currentStage?.status === 'done'
                      ? tr('Chặng đã hoàn thành')
                      : currentStage?.status === 'active'
                        ? tr('Chặng đang mở')
                        : tr('Chặng tiếp theo')}
                  </Badge>
                  {currentStage?.summaryNote && (
                    <span className="text-[11px] font-semibold text-rp-text-2">{currentStage.summaryNote}</span>
                  )}
                </div>

                <h3 className="mt-1 text-[16px] font-extrabold leading-snug text-rp-navy">
                  {currentStage?.title}
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-rp-text-2">
                  {currentStage?.subtitle}
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 border-t border-rp-brand-border/50 pt-2.5">
              {(currentStage?.tasks || []).slice(0, 3).map((task, idx) => (
                <li key={`${task.label}-${idx}`} className="flex items-center gap-2 text-xs font-medium text-rp-navy">
                  {task.done ? (
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-success" />
                  ) : currentStage?.status === 'locked' ? (
                    <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
                  ) : (
                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full border-2 border-rp-line-strong bg-white" />
                  )}
                  <span className={cx('truncate', task.done && 'line-through text-rp-text-muted')}>
                    {task.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-1">
            <Button
              as={Link}
              to={primaryActionTo}
              variant="primary"
              size="sm"
              iconRight={ArrowRight}
              className="w-full justify-center sm:w-auto"
            >
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
