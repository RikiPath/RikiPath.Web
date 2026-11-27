import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge, Button, Card, cx } from '@/components/ui';
import { FeatureLink } from '@/features/entitlements/components/StudyUnlock.jsx';
import { useJourneyRoadmap } from '@/features/learning-journey/useJourneyRoadmap.js';
import { skillNameLabel } from '@/features/learning-journey/journeyModel.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';
import WebClayIcon from './WebClayIcon.jsx';
import { pickNextRoadmapDay } from './learnerTokens.js';
import { MAX_ITEMS_PER_SCENE, NODE_KIND_LABEL, buildLessonJourney, chunkBalanced } from './lessonJourneyModel.js';
import { buildProgressPath, buildRoad, choosePattern, landscapeArt, landscapeFor, layoutNodes, placeLabels, resolveJourneyProgress, seedOf, truncate } from './journeyLayout.js';
import SceneBackdrop from './journeyScenes.jsx';
import './dashboard.css';

const KIND_TONE = { lesson: '#B53D5C', practice: '#167C53', review: '#6B5BB8', quiz: '#B65A06', checkpoint: '#B65A06', step: '#5E6B85', phase: '#5E6B85' };
const KIND_ICON = { lesson: 'reading', practice: 'writing', review: 'srs', quiz: 'mock', checkpoint: 'achievement' };

// Three clearly different states: completed = green, current = sakura, locked = grey with a lock; upcoming = pale.
const NODE_STYLE = {
  done: { top: '#E1F5EA', side: '#1F8F5F', badge: '#1F8F5F', ring: '#FFFFFF', pill: '#A9DEC1', title: '#14532D' },
  current: { top: '#FCEAEF', side: '#E05A7A', badge: '#E05A7A', ring: '#FFFFFF', pill: '#E05A7A', title: '#B53D5C' },
  in_progress: { top: '#FFF4DC', side: '#E0A526', badge: '#E0A526', ring: '#FFFFFF', pill: '#F2C76A', title: '#7A4A06' },
  upcoming: { top: '#F6F3F4', side: '#B7AEB2', badge: '#FFFFFF', ring: '#C9C0C4', pill: '#DCD3D6', title: '#25304D' },
  locked: { top: '#EEF0F3', side: '#8E96A6', badge: '#FFFFFF', ring: '#B4BBC8', pill: '#D5D9E0', title: '#4B5468' },
};

/** Before a lesson roadmap exists: AI phases if an AI path is active, otherwise the real onboarding steps. */
function buildFallbackNodes({ targetLevel, hasPlacementCompleted, hasActiveAiPath, hasAiCredit, latestPath, tr, trf }) {
  const goalCode = targetLevel || 'JLPT';
  const phases = Array.isArray(latestPath?.phases) ? latestPath.phases : [];
  if (hasActiveAiPath && phases.length > 0) {
    const schedules = Array.isArray(latestPath?.dailySchedules) ? latestPath.dailySchedules : [];
    const rows = phases.map((phase, idx) => {
      const days = schedules.filter((d) => d.phaseNumber === phase.phaseNumber || (d.phaseId != null && d.phaseId === phase.phaseId));
      const doneDays = days.filter((d) => d?.isCompleted).length;
      return { phase, idx, days, doneDays, complete: days.length > 0 && doneDays === days.length };
    });
    const currentIdx = rows.findIndex((r) => !r.complete);
    return rows.map(({ phase, idx, days, doneDays, complete }) => ({
      id: `phase-${phase.phaseNumber ?? idx + 1}`,
      kind: 'phase',
      kindLabel: trf('Chặng {0}', { 0: idx + 1 }),
      title: phase.title || trf('Chặng {0}', { 0: idx + 1 }),
      subtitle: phase.summary || phase.goal || '',
      status: complete ? 'done' : idx === currentIdx ? 'current' : 'upcoming',
      icon: 'roadmap',
      dayProgress: days.length > 0 ? { done: doneDays, total: days.length } : null,
      to: '/roadmap/',
      cta: tr('Xem chặng trong lộ trình'),
    }));
  }
  const s1 = Boolean(targetLevel);
  const s2 = Boolean(hasPlacementCompleted);
  const st = (done, open) => (done ? 'done' : open ? 'current' : 'locked');
  const step = (n) => trf('Bước {0}', { 0: n });
  return [
    { id: 'goal', kind: 'step', kindLabel: step(1), title: s1 ? trf('Mục tiêu {0}', { 0: goalCode }) : tr('Đặt mục tiêu JLPT'), subtitle: s1 ? trf('Đã chọn mục tiêu {0} làm kim chỉ nam.', { 0: goalCode }) : tr('Chọn cấp độ JLPT mong muốn để hệ thống cá nhân hóa.'), status: st(s1, true), to: '/onboarding/', cta: s1 ? tr('Xem lại mục tiêu') : tr('Đặt mục tiêu JLPT'), icon: 'dashboard' },
    { id: 'placement', kind: 'step', kindLabel: step(2), title: tr('Đánh giá năng lực'), subtitle: s2 ? tr('Đã ghi nhận kết quả đánh giá năng lực 4 kỹ năng.') : tr('Xác định điểm xuất phát thực tế qua 4 kỹ năng JLPT.'), status: st(s2, s1), to: '/app/placement-test/', cta: s2 ? tr('Xem kết quả đánh giá') : tr('Làm đánh giá năng lực'), icon: 'placement' },
    { id: 'ai-roadmap', kind: 'step', kindLabel: step(3), title: tr('Lộ trình AI'), subtitle: hasAiCredit ? tr('Mở khóa lịch học từng ngày bám sát điểm yếu của bạn.') : tr('Mở khóa lộ trình AI theo từng tuần và lịch nhắc SRS.'), status: st(hasActiveAiPath, s2), to: !s2 ? '/app/placement-test/' : hasAiCredit ? '/roadmap/?generateAi=1' : '/plans/', cta: !s2 ? tr('Hoàn thành đánh giá trước') : hasAiCredit ? tr('Khám phá lộ trình AI') : tr('Xem gói lượt AI'), icon: 'ai' },
    { id: 'mastery', kind: 'step', kindLabel: step(4), title: trf('Chinh phục {0}', { 0: goalCode }), subtitle: tr('Sẵn sàng thi thử JLPT chuẩn giờ và theo dõi điểm tiến bộ.'), status: 'locked', lockText: tr('Mở sau khi bạn có lộ trình AI và hoàn thành các chặng học.'), to: '/mock-tests/', cta: tr('Khám phá thi thử JLPT'), icon: 'achievement' },
  ];
}

/**
 * Layer 1: painted landscape. Responsive srcset, lazy-loaded except the visible scene and its neighbours, light
 * parallax while scenes slide, fades in over the vector fallback (no white flash), hidden if the file fails.
 */
function SceneImage({ art, index, near, onStatus }) {
  return (
    <div className="rp-world-art" style={{ '--rp-i': index }} aria-hidden="true">
      <img
        src={art.src}
        srcSet={art.srcSet}
        sizes="(min-width: 1024px) 64vw, 100vw"
        alt=""
        loading={near ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        style={{ objectPosition: art.focus }}
        onLoad={(e) => {
          e.currentTarget.dataset.loaded = 'true';
          onStatus('ready');
        }}
        onError={() => onStatus('error')}
      />
    </div>
  );
}

/** Landscape per scene: one world per stage (stable), never the same world twice in a row. */
function withLandscapes(scenes) {
  let prevStage = null;
  let prevLandscape = null;
  return scenes.map((s) => {
    const stage = s.key.replace(/-\d+$/, '');
    const landscape = stage === prevStage ? prevLandscape : landscapeFor(stage, prevLandscape);
    prevStage = stage;
    prevLandscape = landscape;
    return { ...s, landscape };
  });
}

/** Road pattern per scene (stable: stage key + real step kinds + landscape), never repeated back-to-back. */
function withPatterns(scenes) {
  let previous = null;
  return scenes.map((s) => {
    const pattern = choosePattern({ key: s.key, landscape: s.landscape, kinds: s.items.map((n) => n.kind), previous });
    previous = pattern;
    return { ...s, pattern };
  });
}

/** Viewport size in CSS px (state changes only on resize, never per frame). */
function useBoxSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function Checkpoint({ node, point, selected, onSelect, labelSide = 'below', labelWidth, titleChars, compact, tr }) {
  const { x, y } = point;
  const s = NODE_STYLE[node.status] || NODE_STYLE.upcoming;
  const done = node.status === 'done';
  const current = node.status === 'current';
  const locked = node.status === 'locked';
  const stateLabel = done ? tr('Đã hoàn thành') : current ? tr('Bạn đang ở đây') : node.status === 'in_progress' ? tr('Đang học') : locked ? tr('Chưa mở') : tr('Sắp tới');
  const half = labelWidth / 2;
  return (
    <g
      transform={`translate(${x} ${y})`}
      className="rp-journey-node"
      data-status={node.status}
      data-kind={node.kind}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${node.kindLabel}: ${node.title} — ${stateLabel}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <title>{`${node.kindLabel} · ${node.title}`}</title>
      {current && <ellipse cx="0" cy="1" rx="32" ry="13" className="rp-journey-pulse" />}
      {done && <ellipse cx="0" cy="1" rx="28" ry="12" fill="rgba(31,143,95,0.14)" />}
      {selected && <ellipse cx="0" cy="1" rx="30" ry="12.5" fill={done ? 'rgba(31,143,95,0.16)' : 'rgba(224,90,122,0.16)'} />}
      {/* Checkpoint platform, anchored on the road point (the road spline passes through it): a very light contact
          shadow, an opaque raised base that fully covers the road and its centre dashes, then the top face. */}
      <ellipse cx="0" cy="6" rx="27" ry="10.5" fill="rgba(37,48,77,0.14)" />
      <ellipse cx="0" cy="3" rx="25" ry="11.5" className="rp-node-base" fill={s.side} stroke="rgba(37,48,77,0.16)" strokeWidth="1" />
      <ellipse cx="0" cy="-1" rx="25" ry="11.5" className="rp-node-top" fill={s.top} stroke={selected ? s.pill : '#FFFFFF'} strokeWidth={selected ? 2.4 : 1.8} />
      <g transform="translate(0 -22)">
        <circle r="12.5" fill={s.badge} stroke={s.ring} strokeWidth="2" />
        {done ? (
          <path d="M-4.5 0.5l3.2 3.2L5-3.2" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : current ? (
          <circle r="4.2" fill="#FFFFFF" />
        ) : node.status === 'in_progress' ? (
          <>
            <circle r="5" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M0 -5 A5 5 0 0 1 0 5 Z" fill="#FFFFFF" />
          </>
        ) : locked ? (
          <>
            <rect x="-4.5" y="-1" width="9" height="6.5" rx="1.8" fill="#7B8496" />
            <path d="M-2.8-1v-2.2a2.8 2.8 0 0 1 5.6 0V-1" stroke="#7B8496" strokeWidth="1.7" fill="none" />
          </>
        ) : (
          <circle r="3.2" fill="#C9C2C6" />
        )}
      </g>
      {current && (
        <g transform={`translate(0 ${labelSide === 'above' ? -94 : -52})`} className="rp-journey-here" style={{ '--rp-here-y': `${labelSide === 'above' ? -94 : -52}px` }}>
          <rect x="-47" y="-11" width="94" height="20" rx="10" fill="#E05A7A" />
          <path d="M-5 9l5 6 5-6z" fill="#E05A7A" />
          <text textAnchor="middle" y="3.5" fontSize="10" fontWeight="800" fill="#FFFFFF">{tr('Bạn đang ở đây')}</text>
        </g>
      )}
      {/* Two-line label: real kind + truncated title (full text in the tooltip and the detail card). */}
      <g transform={`translate(0 ${labelSide === 'above' ? -62 : 35})`} data-label-side={labelSide}>
        <rect x={-half} y="-12" width={labelWidth} height="34" rx="10" fill="rgba(37,48,77,0.10)" />
        <rect x={-half} y="-14" width={labelWidth} height="34" rx="10" fill="rgba(37,48,77,0.16)" />
        <rect x={-half} y="-16" width={labelWidth} height="34" rx="10" fill="#FFFFFF" stroke={selected || current ? s.pill : done ? '#A9DEC1' : node.status === 'in_progress' ? '#F2C76A' : '#D9D1D4'} strokeWidth={selected || current ? 2 : 1.4} />
        <text textAnchor="middle" y="-3" fontSize={compact ? 10 : 9} fontWeight="800" letterSpacing="0.4" fill={done ? '#1F8F5F' : node.status === 'in_progress' ? '#B07A04' : locked ? '#6B7487' : KIND_TONE[node.kind] || '#5E6B85'}>
          {truncate(node.kindLabel.toUpperCase(), titleChars + 4)}
        </text>
        <text textAnchor="middle" y="11" fontSize={compact ? 12 : 11} fontWeight="700" fill={s.title}>
          {truncate(node.title, titleChars)}
        </text>
      </g>
    </g>
  );
}

/**
 * Travelled road: a soft Sakura band + slowly moving dashes, revealed through a mask drawn on the same path.
 * When progress grows (a lesson is completed) the reveal extends from the old end to the new checkpoint using
 * real arc lengths (`getTotalLength`); first render / reload shows the final state without animating.
 */
function ProgressRoad({ d, maskId }) {
  const revealRef = useRef(null);
  const lastLength = useRef(0);
  useEffect(() => {
    const el = revealRef.current;
    if (!el || !d || typeof el.getTotalLength !== 'function') {
      lastLength.current = 0;
      return;
    }
    const length = el.getTotalLength();
    const previous = lastLength.current;
    lastLength.current = length;
    el.style.strokeDasharray = `${length} ${length}`;
    el.style.strokeDashoffset = '0';
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!(previous > 0) || length <= previous + 1 || reduced || typeof el.animate !== 'function') return;
    el.animate([{ strokeDashoffset: length - previous }, { strokeDashoffset: 0 }], { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }, [d]);
  if (!d) return null;
  return (
    <g aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <path ref={revealRef} d={d} stroke="#FFFFFF" strokeWidth="30" strokeLinecap="round" fill="none" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d={d} stroke="#FCE3EA" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d={d} stroke="#E0708F" strokeWidth="2.4" strokeDasharray="7 7" strokeLinecap="round" fill="none" className="rp-journey-dash" />
      </g>
    </g>
  );
}

function SceneArt({ scene, index, width, height, compact, navGutter, viewportWidth, selectedIndex, onSelect, hasPrev, hasNext, active, artReady, tr }) {
  const r = seedOf(scene.key);
  const r2 = seedOf(`${scene.key}:b`);
  const gutter = navGutter ? Math.round((44 * width) / Math.max(1, viewportWidth)) : 0;
  const { points, labelWidth, titleChars } = layoutNodes({ count: scene.items.length, width, height, pattern: scene.pattern, seed: r, compact, gutter });
  const roadGeo = buildRoad(points, { width, fromLeft: hasPrev, toRight: hasNext });
  const road = roadGeo.d;
  const statuses = scene.items.map((n) => n.status);
  const sides = placeLabels({ points, labelWidth, width, height, samples: roadGeo.samples, currentIndex: statuses.indexOf('current') });
  // Contiguous progress (never "every completed node"): ends exactly on the current checkpoint.
  const progress = resolveJourneyProgress(statuses, { hasPrev, hasNext });
  const progressD = buildProgressPath(roadGeo, progress);
  const gid = `rpJourney${index}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-full w-full select-none" preserveAspectRatio="xMidYMid slice" role="group" aria-label={scene.caption || tr('Bản đồ lộ trình học')} data-active={active ? 'true' : 'false'}>
      {/* Layer 1–2: landscape + scenery (pure decoration) */}
      {/* Vector backdrop = fallback only (no painting, still loading, or failed); fades out when the painting is ready */}
      <g className="rp-world-fallback" data-hidden={artReady ? 'true' : 'false'}>
        <SceneBackdrop variant={scene.landscape} width={width} height={height} seed={r} seed2={r2} gid={gid} />
      </g>
      {/* Layer 2.5: soft paper veil — mutes the busy landscape so the road, checkpoints and labels read first */}
      <rect width={width} height={height} fill="#FFFCF8" fillOpacity="0.5" aria-hidden="true" />
      {/* Layer 3: base road — whole scene, always visible, static (ivory surface, soft brown-grey edge, light shadow) */}
      {artReady && <path d={road} stroke="rgba(255,251,244,0.7)" strokeWidth="44" strokeLinecap="round" fill="none" />}
      <path d={road} stroke="rgba(37,48,77,0.16)" strokeWidth="24" strokeLinecap="round" fill="none" transform="translate(0 3)" />
      <path d={road} stroke="#A8958F" strokeWidth="21" strokeLinecap="round" fill="none" />
      <path d={road} stroke="#FFFBF4" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d={road} stroke="#CDBFC2" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round" fill="none" />
      {/* Layer 4: travelled / active path — same geometry, ends exactly on the current checkpoint */}
      <ProgressRoad d={progressD} maskId={`${gid}-progress`} />
      {/* Layers 5–8: checkpoints after every road layer (platform masks the road); the current one is drawn last */}
      {scene.items
        .map((node, i) => ({ node, i }))
        .sort((a, b) => (a.node.status === 'current') - (b.node.status === 'current'))
        .map(({ node, i }) => (
        <Checkpoint
          key={node.id}
          node={node}
          point={points[i]}
          labelSide={sides[i]}
          labelWidth={labelWidth}
          titleChars={titleChars}
          compact={compact}
          selected={scene.startIndex + i === selectedIndex}
          onSelect={() => onSelect(scene.startIndex + i)}
          tr={tr}
        />
      ))}
    </svg>
  );
}

const BTN_PRIMARY =
  'rp-focus rp-press rp-btn-primary group inline-flex h-9 items-center justify-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong';
const BTN_SECONDARY =
  'rp-focus rp-press group inline-flex h-9 items-center justify-center gap-2 rounded-rp-input border border-rp-line bg-white px-4 text-sm font-semibold text-rp-text transition-colors hover:border-rp-brand-border hover:text-rp-brand-strong';

const DETAIL_STYLE = {
  done: 'border-rp-mint-line bg-rp-mint-bg/45',
  current: 'border-rp-brand-border/75 bg-rp-brand-tint/45',
  in_progress: 'border-[#F3D7A4] bg-[#FFFBF2]',
  upcoming: 'border-rp-line bg-rp-bg-2/60',
  locked: 'border-rp-line bg-rp-bg-2/70',
};

/**
 * "Lộ trình học của bạn": the learner's real LESSON roadmap (Adaptive Roadmap V2 stages → lessons, practice,
 * review, stage quiz, stage assessment). Each stage becomes balanced scenes of up to 6 steps (3 on narrow screens);
 * node positions, label widths and scenery are computed per scene. Previous/Next, swipe/drag, ←/→ and dots move
 * between scenes; the map and the detail card share one row height.
 */
export default function LearningJourneyMap({ targetLevel, roadmapAccess = {}, hasAiCredit = true, className }) {
  const { tr, trf } = useLocale();
  const journeyData = useJourneyRoadmap();
  const hasActiveAiPath = Boolean(roadmapAccess?.hasActiveAiPath);
  const latestPath = roadmapAccess?.latestPath;
  const hasPlacementCompleted = Boolean(roadmapAccess?.hasPlacementCompleted);

  const viewportRef = useRef(null);
  const box = useBoxSize(viewportRef);
  const compact = box.w > 0 && box.w < 560;
  let W = compact ? 480 : 900;
  let H = compact ? 300 : 250;
  if (box.w > 0 && box.h > 0) {
    const ratio = box.w / box.h;
    if (compact) H = Math.max(300, Math.round(W / ratio));
    else if (ratio >= 900 / 250) W = Math.round(250 * ratio); // wide & short: widen the drawing, keep 250 tall
    else H = Math.round(900 / ratio); // narrower: keep 900 wide, extra height becomes sky
  }
  const maxPerScene = compact ? 3 : MAX_ITEMS_PER_SCENE;

  const lessonJourney = useMemo(
    () => buildLessonJourney(journeyData.roadmap, journeyData.overview, { maxPerScene }),
    [journeyData.roadmap, journeyData.overview, maxPerScene],
  );

  const { nodes, scenes, currentIndex } = useMemo(() => {
    if (lessonJourney) {
      const items = lessonJourney.items.map((it) => ({ ...it, kindLabel: tr(NODE_KIND_LABEL[it.kind]), icon: KIND_ICON[it.kind] }));
      return {
        nodes: items,
        scenes: withPatterns(withLandscapes(lessonJourney.scenes.map((s) => ({ ...s, items: items.slice(s.startIndex, s.startIndex + s.items.length), caption: [s.stageTitle, s.levelCode].filter(Boolean).join(' · ') })))),
        currentIndex: lessonJourney.currentIndex,
      };
    }
    const fallback = buildFallbackNodes({ targetLevel, hasPlacementCompleted, hasActiveAiPath, hasAiCredit, latestPath, tr, trf });
    const out = [];
    let start = 0;
    for (const items of chunkBalanced(fallback, maxPerScene)) {
      out.push({ key: `s${start}`, theme: 'lesson', startIndex: start, items, caption: '', landscape: ['sakura_garden', 'village', 'lakeside'][out.length % 3] });
      start += items.length;
    }
    const cur = fallback.findIndex((n) => n.status === 'current');
    return { nodes: fallback, scenes: withPatterns(out), currentIndex: cur >= 0 ? cur : Math.max(0, fallback.findLastIndex((n) => n.status === 'done')) };
  }, [lessonJourney, targetLevel, hasPlacementCompleted, hasActiveAiPath, hasAiCredit, latestPath, tr, trf, maxPerScene]);

  const sceneOf = useCallback((idx) => Math.max(0, scenes.findIndex((s) => idx >= s.startIndex && idx < s.startIndex + s.items.length)), [scenes]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [sceneChoice, setSceneChoice] = useState(null);
  const resolvedSelected = selectedIndex != null && nodes[selectedIndex] ? selectedIndex : currentIndex;
  const sceneIndex = Math.min(scenes.length - 1, Math.max(0, sceneChoice ?? sceneOf(resolvedSelected)));
  const stage = nodes[resolvedSelected] || nodes[0];

  const goToScene = useCallback(
    (next) => {
      const target = Math.min(scenes.length - 1, Math.max(0, next));
      setSceneChoice(target);
      const s = scenes[target];
      const inScene = currentIndex >= s.startIndex && currentIndex < s.startIndex + s.items.length;
      setSelectedIndex(inScene ? currentIndex : s.startIndex);
    },
    [scenes, currentIndex],
  );

  // Swipe / drag: the track follows the pointer via a CSS variable (no React state per move).
  const trackRef = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e) => {
    if (scenes.length < 2 || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest?.('.rp-journey-nav, .rp-journey-dot')) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, width: e.currentTarget.clientWidth || 1, active: false };
  };
  const onPointerMove = (e) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    g.dx = e.clientX - g.x;
    if (!g.active && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(e.clientY - g.y)) {
      g.active = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      trackRef.current?.setAttribute('data-dragging', 'true');
    }
    if (g.active) trackRef.current?.style.setProperty('--rp-drag', `${g.dx}px`);
  };
  const endDrag = () => {
    const g = drag.current;
    drag.current = null;
    if (!g?.active) return;
    suppressClick.current = true;
    trackRef.current?.removeAttribute('data-dragging');
    trackRef.current?.style.setProperty('--rp-drag', '0px');
    if (Math.abs(g.dx) > g.width * 0.18) goToScene(sceneIndex + (g.dx < 0 ? 1 : -1));
  };
  const onClickCapture = (e) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const onKeyDown = (e) => {
    if (scenes.length < 2) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToScene(sceneIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToScene(sceneIndex - 1);
    }
  };

  // Detail CTA mirrors the selected step's real state.
  const nextDay = useMemo(() => pickNextRoadmapDay(latestPath), [latestPath]);
  const status = stage?.status || 'upcoming';
  const locked = status === 'locked' || Boolean(stage?.gated);
  let ctaLabel = stage?.cta || tr('Mở lộ trình học');
  let ctaTo = stage?.to || '/roadmap/';
  if (lessonJourney && stage) {
    const isCheck = stage.kind === 'quiz' || stage.kind === 'checkpoint';
    ctaLabel = isCheck
      ? (status === 'done' ? tr('Xem kết quả kiểm tra') : tr('Làm bài kiểm tra'))
      : status === 'done'
        ? tr('Xem lại bài học')
        : status === 'current'
          ? tr('Tiếp tục học')
          : tr('Mở bài học');
  } else if (hasActiveAiPath && status === 'current' && nextDay?.lessons?.[0]?.lessonId) {
    ctaTo = `/lesson-player/?lessonId=${nextDay.lessons[0].lessonId}`;
    ctaLabel = nextDay.isStarted ? tr('Tiếp tục ngày học') : tr('Vào lộ trình');
  }
  const ctaClass = cx(status === 'current' ? BTN_PRIMARY : BTN_SECONDARY, 'w-full sm:w-auto');
  const lockText = stage?.lock ? trf(stage.lock.template, { 0: stage.lock.value ?? '' }) : stage?.lockText || null;
  const multi = scenes.length > 1;
  const [artStatus, setArtStatus] = useState({});
  const markArt = useCallback((key, status) => setArtStatus((prev) => (prev[key] === status ? prev : { ...prev, [key]: status })), []);
  const scene = scenes[sceneIndex];
  // Position of the selected step inside its stage and the step that follows it (real order from the roadmap).
  const peers = lessonJourney && stage ? nodes.filter((n) => n.stageKey === stage.stageKey) : nodes;
  const peerIndex = peers.findIndex((n) => n.id === stage?.id);
  const nextPeer = peerIndex >= 0 ? peers[peerIndex + 1] || null : null;
  // Last step of a stage: point to the next stage (and say so when it moves up a JLPT level).
  const lastOfStage = lessonJourney && stage && peerIndex === peers.length - 1;
  const nextStageFirst = lastOfStage ? nodes.find((n, i) => i > nodes.indexOf(peers[peers.length - 1]) && n.stageKey !== stage.stageKey) || null : null;
  const nextStageSize = nextStageFirst ? nodes.filter((n) => n.stageKey === nextStageFirst.stageKey).length : 0;
  const levelUp = Boolean(nextStageFirst?.levelCode && stage?.levelCode && nextStageFirst.levelCode !== stage.levelCode);
  const journeyEnd = lastOfStage && !nextStageFirst;
  const skill = stage?.skillName ? tr(skillNameLabel(stage.skillName)) : '';
  const progress = stage?.stageProgress
    ? { done: stage.stageProgress.completed, total: stage.stageProgress.total, label: trf('Chặng: {0}/{1} bài học', { 0: stage.stageProgress.completed, 1: stage.stageProgress.total }), short: trf('{0}/{1} bài', { 0: stage.stageProgress.completed, 1: stage.stageProgress.total }) }
    : stage?.dayProgress
      ? { done: stage.dayProgress.done, total: stage.dayProgress.total, label: trf('{0}/{1} ngày hoàn thành', { 0: stage.dayProgress.done, 1: stage.dayProgress.total }), short: trf('{0}/{1} ngày', { 0: stage.dayProgress.done, 1: stage.dayProgress.total }) }
      : null;

  const subtitle = lessonJourney
    ? trf('{0}/{1} bài học · Mục tiêu JLPT {2}', { 0: lessonJourney.completedLessons, 1: lessonJourney.totalLessons, 2: targetLevel || 'JLPT' })
    : hasActiveAiPath
      ? trf('{0} chặng học cá nhân hóa · Mục tiêu JLPT {1}', { 0: nodes.length, 1: targetLevel || 'JLPT' })
      : trf('4 bước từ đánh giá năng lực đến chinh phục {0}', { 0: targetLevel || 'JLPT' });

  return (
    <Card className={cx('flex flex-col overflow-hidden border-rp-line bg-white p-4 shadow-rp-sm sm:p-5', className)} data-section="LearningJourneyMap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <WebClayIcon name="roadmap" size="sm" hover className="-my-1" />
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold tracking-tight text-rp-navy sm:text-[18px]">{tr('Lộ trình học của bạn')}</h2>
            <p className="truncate text-xs text-rp-text-2">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button as={Link} to="/roadmap/" variant="secondary" size="sm" iconRight={ArrowRight}>
            {lessonJourney || hasActiveAiPath ? tr('Xem toàn bộ lộ trình') : trf('Xem {0} bước', { 0: nodes.length })}
          </Button>
        </div>
      </div>

      {/* Map and detail share one row height on desktop (grid stretch); the map grows its sky to fill. */}
      <div className="mt-3.5 grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="flex min-w-0 flex-col lg:col-span-7 xl:col-span-8">
          <div
            ref={viewportRef}
            className="rp-journey-viewport relative h-[clamp(250px,18vw,300px)] overflow-hidden rounded-2xl lg:h-auto lg:min-h-[clamp(250px,18vw,300px)] lg:flex-1"
            role="region"
            aria-roledescription={tr('băng chuyền')}
            aria-label={scene?.caption || tr('Bản đồ lộ trình học')}
            tabIndex={multi ? 0 : undefined}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={onClickCapture}
          >
            {scene?.caption && (
              <span key={scene.key} className="rp-journey-caption pointer-events-none absolute left-3 top-3 z-[1] max-w-[60%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-rp-navy shadow-rp-xs">
                {scene.caption}
              </span>
            )}
            {multi && (
              <>
                <button type="button" onClick={() => goToScene(sceneIndex - 1)} disabled={sceneIndex === 0} aria-label={tr('Các chặng trước')} className="rp-focus rp-journey-nav rp-journey-nav-edge" data-side="left">
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => goToScene(sceneIndex + 1)} disabled={sceneIndex === scenes.length - 1} aria-label={tr('Các chặng tiếp theo')} className="rp-focus rp-journey-nav rp-journey-nav-edge" data-side="right">
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </>
            )}
            {multi && (
              <div className="absolute right-3 top-3 z-[2] rounded-full bg-white/90 px-2.5 py-1.5 shadow-rp-xs">
                {scenes.length <= 8 ? (
                  <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label={tr('Chọn nhóm chặng')}>
                    {scenes.map((s, i) => (
                      <button key={s.key} type="button" role="tab" aria-selected={i === sceneIndex} aria-label={s.caption || trf('Cảnh {0}', { 0: i + 1 })} onClick={() => goToScene(i)} className="rp-focus rp-journey-dot" data-active={i === sceneIndex ? 'true' : 'false'} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-semibold leading-none text-rp-text-2" aria-live="polite">{trf('Cảnh {0}/{1}', { 0: sceneIndex + 1, 1: scenes.length })}</p>
                )}
              </div>
            )}
            <div ref={trackRef} className="rp-journey-track" style={{ '--rp-scene': sceneIndex }}>
              {scenes.map((s, i) => (
                <div key={s.key} className="rp-journey-scene relative" aria-hidden={i !== sceneIndex} inert={i !== sceneIndex ? true : undefined}>
                  {(() => {
                    const art = landscapeArt(s.landscape);
                    return art && artStatus[s.key] !== 'error' ? (
                      <>
                        <SceneImage art={art} index={i} near={Math.abs(i - sceneIndex) <= 1} onStatus={(st) => markArt(s.key, st)} />
                        <div className="rp-world-overlay" data-landscape={s.landscape} aria-hidden="true" />
                      </>
                    ) : null;
                  })()}
                  <SceneArt
                    artReady={artStatus[s.key] === 'ready'}
                    scene={s}
                    index={i}
                    width={W}
                    height={H}
                    compact={compact}
                    navGutter={multi}
                    viewportWidth={box.w || 900}
                    selectedIndex={resolvedSelected}
                    onSelect={setSelectedIndex}
                    hasPrev={i > 0}
                    hasNext={i < scenes.length - 1}
                    active={i === sceneIndex}
                    tr={tr}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div key={stage?.id} className={cx('rp-journey-detail flex flex-col gap-3 rounded-2xl border p-4 lg:col-span-5 xl:col-span-4', DETAIL_STYLE[status])} data-status={status}>
          <div className="flex items-start gap-3">
            <WebClayIcon name={stage?.icon || 'reading'} size="sm" hover className={cx('-my-0.5 shrink-0', locked && 'opacity-60 grayscale')} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide" style={{ color: locked ? '#8C95A6' : KIND_TONE[stage?.kind] || '#5E6B85' }}>
                  {stage?.kindLabel}
                </span>
                <Badge tone={status === 'done' ? 'success' : status === 'current' ? 'brand' : status === 'in_progress' ? 'warning' : 'neutral'} icon={status === 'in_progress' ? Clock : locked ? LockKeyhole : status === 'done' ? CheckCircle2 : Sparkles} size="sm">
                  {status === 'done' ? tr('Đã hoàn thành') : status === 'current' ? tr('Bạn đang ở đây') : status === 'in_progress' ? tr('Đang học') : locked ? tr('Chưa mở') : tr('Sắp tới')}
                </Badge>
              </div>
              <h3 className={cx('mt-1 text-[15.5px] font-extrabold leading-snug [overflow-wrap:anywhere]', locked ? 'text-rp-text-2' : 'text-rp-navy')}>{stage?.title}</h3>
              <p className="mt-0.5 line-clamp-2 text-xs leading-[18px] text-rp-text-2">
                {locked && lockText ? lockText : lessonJourney ? [stage?.stageTitle, stage?.levelCode].filter(Boolean).join(' · ') : stage?.subtitle}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
            {peerIndex >= 0 && (
              <div className="rounded-xl bg-white/80 px-2.5 py-2">
                <dt className="font-semibold text-rp-text-muted">{lessonJourney ? tr('Vị trí trong chặng') : tr('Vị trí')}</dt>
                <dd className="mt-0.5 font-extrabold tabular-nums text-rp-navy">{trf('Bước {0}/{1}', { 0: peerIndex + 1, 1: peers.length })}</dd>
              </div>
            )}
            {skill ? (
              <div className="rounded-xl bg-white/80 px-2.5 py-2">
                <dt className="font-semibold text-rp-text-muted">{tr('Kỹ năng')}</dt>
                <dd className="mt-0.5 truncate font-extrabold text-rp-navy">{skill}</dd>
              </div>
            ) : stage?.levelCode ? (
              <div className="rounded-xl bg-white/80 px-2.5 py-2">
                <dt className="font-semibold text-rp-text-muted">{tr('Cấp độ')}</dt>
                <dd className="mt-0.5 font-extrabold text-rp-navy">{formatJlptLevel(stage.levelCode)}</dd>
              </div>
            ) : null}
            {nextStageFirst && (
              <div className={cx('col-span-2 rounded-xl px-2.5 py-2', levelUp ? 'border border-rp-brand-border/70 bg-white' : 'bg-white/80')}>
                <dt className="flex flex-wrap items-center gap-1.5 font-semibold text-rp-text-muted">
                  {levelUp ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rp-brand-tint px-2 py-0.5 text-[10.5px] font-extrabold text-rp-brand-strong">
                      <Sparkles aria-hidden="true" className="h-3 w-3" />
                      {trf('Lên cấp độ JLPT {0}', { 0: nextStageFirst.levelCode })}
                    </span>
                  ) : (
                    tr('Chặng tiếp theo')
                  )}
                  <span className="tabular-nums">· {trf('{0} bước', { 0: nextStageSize })}</span>
                </dt>
                <dd className="mt-0.5 truncate font-extrabold text-rp-navy" title={nextStageFirst.stageTitle}>{nextStageFirst.stageTitle}</dd>
                <dd className="mt-0.5 truncate text-rp-text-2" title={nextStageFirst.title}>
                  <span className="mr-1 text-[10.5px] font-extrabold uppercase" style={{ color: KIND_TONE[nextStageFirst.kind] || '#5E6B85' }}>{nextStageFirst.kindLabel}</span>
                  {nextStageFirst.title}
                </dd>
                {levelUp && (
                  <dd className="mt-1 text-[11px] leading-4 text-rp-text-muted">
                    {trf('Hoàn thành chặng {0} để chuyển sang nội dung JLPT {1}.', { 0: stage.levelCode, 1: nextStageFirst.levelCode })}
                  </dd>
                )}
              </div>
            )}
            {journeyEnd && (
              <div className="col-span-2 rounded-xl bg-white/80 px-2.5 py-2">
                <dt className="font-semibold text-rp-text-muted">{tr('Đích đến')}</dt>
                <dd className="mt-0.5 font-bold text-rp-navy">{trf('Đây là bước cuối của lộ trình JLPT {0}.', { 0: targetLevel || stage.levelCode || '' })}</dd>
              </div>
            )}
            {nextPeer && (
              <div className="col-span-2 rounded-xl bg-white/80 px-2.5 py-2">
                <dt className="font-semibold text-rp-text-muted">{tr('Bước tiếp theo')}</dt>
                <dd className="mt-0.5 truncate font-bold text-rp-navy" title={nextPeer.title}>
                  <span className="mr-1 text-[10.5px] font-extrabold uppercase" style={{ color: KIND_TONE[nextPeer.kind] || '#5E6B85' }}>{nextPeer.kindLabel}</span>
                  {nextPeer.title}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-auto space-y-3">
            {/* One compact meta row: duration · stage progress bar · count */}
            {((lessonJourney && (stage?.minutes > 0 || stage?.questionCount > 0)) || progress) && (
              <div className="flex items-center gap-3 text-[11.5px] font-semibold text-rp-text-2">
                {lessonJourney && (stage?.minutes > 0 || stage?.questionCount > 0) && (
                  <span className="inline-flex shrink-0 items-center gap-1.5">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
                    {stage.minutes > 0 ? trf('Khoảng {0} phút', { 0: stage.minutes }) : trf('{0} câu hỏi', { 0: stage.questionCount })}
                  </span>
                )}
                {progress && (
                  <>
                    <span
                      className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-white"
                      role="progressbar"
                      aria-label={progress.label}
                      aria-valuemin={0}
                      aria-valuemax={progress.total}
                      aria-valuenow={progress.done}
                    >
                      <span className={cx('rp-grow-x block h-full origin-left rounded-full transition-transform duration-500', status === 'done' ? 'bg-rp-mint' : 'bg-rp-brand')} style={{ transform: `scaleX(${Math.max(0.02, progress.done / Math.max(1, progress.total))})` }} />
                    </span>
                    <span className="shrink-0 tabular-nums">{progress.short}</span>
                  </>
                )}
              </div>
            )}
            {locked && lessonJourney ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedIndex(currentIndex);
                  setSceneChoice(sceneOf(currentIndex));
                }}
                className={cx(BTN_SECONDARY, 'w-full sm:w-auto')}
              >
                <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                {tr('Đến bước hiện tại')}
              </button>
            ) : locked ? null : stage?.study ? (
              <FeatureLink to={ctaTo} label={tr('Bài học')} showLock={false} className={ctaClass}>
                {ctaLabel}
                <ArrowRight aria-hidden="true" className="rp-btn-arrow h-4 w-4" />
              </FeatureLink>
            ) : (
              <Link to={ctaTo} className={ctaClass}>
                {ctaLabel}
                <ArrowRight aria-hidden="true" className="rp-btn-arrow h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
