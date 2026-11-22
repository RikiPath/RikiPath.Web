import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, RotateCw } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { StudyIllustration } from './StudyIllustrations.jsx';
import HeroScenicSlideshow from './HeroScenicSlideshow.jsx';

const MAX_TILT = 5; // degrees — subtle, never a "spinning card"
const LEVELS = ['N5', 'N4', 'N3', 'N2'];

/**
 * Hero composition: floating study cards at different depths over the hero's full-bleed landscape.
 * Pointer tilt writes two CSS variables inside requestAnimationFrame (no React state per frame),
 * only for fine pointers and without reduced motion. Every card is an illustration of the product UI
 * (labelled "Minh họa"); the only control is the flashcard flip, which really flips the card.
 */
export default function HeroLearningScene() {
  const stageRef = useRef(null);
  const innerRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const { tr, trf } = useLocale();

  useEffect(() => {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner) return undefined;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return undefined;

    let frame = 0;
    let next = null;
    const apply = () => {
      frame = 0;
      if (!next) return;
      inner.style.setProperty('--rx', `${next.rx.toFixed(2)}deg`);
      inner.style.setProperty('--ry', `${next.ry.toFixed(2)}deg`);
    };
    const onMove = (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      next = { rx: -y * MAX_TILT, ry: x * MAX_TILT };
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const onLeave = () => {
      next = { rx: 0, ry: 0 };
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={stageRef} data-idle className="lp-stage relative mx-auto w-full max-w-[640px] lg:mx-0 lg:ml-auto" data-intro="stage" style={{ '--d': '260ms' }}>
      <div ref={innerRef} className="lp-stage-inner relative">
        {/* Scenic frame: the landscape slideshow fills ONLY this rounded box (object-fit: cover), behind the
            floating cards. The fixed aspect ratio reserves space (no CLS); a soft gradient lifts the cards. */}
        <div className="lp-scenic-frame relative overflow-hidden rounded-[28px] sm:rounded-[32px]">
          <div aria-hidden="true" className="aspect-[4/5] w-full sm:aspect-[6/5] lg:aspect-[1/1] xl:aspect-[6/5.4]" />
          <HeroScenicSlideshow className="absolute inset-0" sizes="(min-width: 1024px) 640px, 92vw" />
          <div aria-hidden="true" className="lp-scenic-shade absolute inset-0" />
          <span lang="ja" aria-hidden="true" className="rp-kanji lp-hero-vertical absolute right-5 top-5 hidden text-[13px] tracking-[0.3em] text-white [writing-mode:vertical-rl] sm:block">日本語の道</span>
        </div>

        {/* Sakura branch (original SVG) framing the top edge of the stage */}
        <svg aria-hidden="true" viewBox="0 0 260 120" className="lp-branch pointer-events-none absolute -top-6 left-[22%] hidden w-[44%] sm:block">
          <path d="M4 18 C 60 30, 110 26, 150 52 S 220 96, 256 104" stroke="#7A4A3A" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M96 30 C 112 10, 132 6, 150 4 M168 66 C 186 52, 204 50, 222 54" stroke="#7A4A3A" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.8" />
          {[[40, 24, 1], [78, 30, 0.85], [118, 18, 1], [148, 6, 0.8], [160, 56, 1], [196, 52, 0.9], [224, 86, 1], [250, 100, 0.8]].map(([cx, cy, s]) => (
            <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) scale(${s})`}>
              {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} rx="5" ry="8" cy="-7" fill="#F7B6C8" stroke="#F28DA8" strokeWidth="0.8" transform={`rotate(${a})`} />)}
              <circle r="2.4" fill="#C24362" />
            </g>
          ))}
        </svg>

        {/* Sakura petals (CSS only, few, paused off-screen) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-visible sm:block">
          {[
            ['8%', '-4%', 0, 15], ['46%', '-6%', 4, 18], ['88%', '20%', 8, 17], ['70%', '64%', 2, 19], ['28%', '40%', 6, 21],
          ].map(([left, top, delay, dur]) => (
            <svg key={left} viewBox="0 0 20 20" className="rp-petal-drift absolute h-4 w-4" style={{ left, top, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}>
              <path d="M10 1.5c3.6 2.3 6 5.6 5.5 9.4-.4 3.4-3 6.1-5.5 7.6-2.5-1.5-5.1-4.2-5.5-7.6C4 7.1 6.4 3.8 10 1.5Z" fill="#F3A3BA" />
            </svg>
          ))}
        </div>

        {/* Flashcard — front-left, deepest layer, really flips */}
        <div className="lp-depth-3 absolute left-0 top-[3%] w-[min(200px,50%)] sm:left-[2%]" data-intro="pop" style={{ '--d': '520ms' }}>
          <div className="lp-bob" style={{ '--bob': '0s' }}>
            <div className="lp-flip" data-flipped={flipped}>
              <div className="lp-flip-inner">
                <div className="rounded-[20px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_48px_-20px_rgba(90,30,55,0.4)]">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tone-vocab"><StudyIllustration name="vocabulary" size={22} /> {tr('Thẻ từ vựng')}</p>
                  <p lang="ja" className="rp-kanji mt-2 text-[40px] font-semibold leading-none text-rp-text">経験</p>
                  <p className="mt-2 text-[12px] text-rp-text-muted">{tr('Bạn có nhớ nghĩa?')}</p>
                </div>
                <div aria-hidden={!flipped} className="lp-flip-back rounded-[20px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_48px_-20px_rgba(90,30,55,0.4)]">
                  <p lang="ja" className="rp-jp text-[15px] text-rp-text-muted">けいけん</p>
                  <p className="mt-1 text-[18px] font-bold text-rp-text">{tr('kinh nghiệm')}</p>
                  <p lang="ja" className="rp-jp mt-2 text-[12px] leading-5 text-rp-text-2">いい経験になった。</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFlipped((v) => !v)}
              aria-pressed={flipped}
              className="rp-focus mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-rp-text shadow-rp-xs ring-1 ring-black/5 hover:text-rp-brand-strong"
            >
              <RotateCw aria-hidden="true" className="h-3.5 w-3.5" /> {flipped ? tr('Xem mặt trước') : tr('Lật thẻ')}
            </button>
          </div>
        </div>

        {/* Mini roadmap — top-right */}
        <div className="lp-depth-2 absolute right-0 top-[24%] w-[min(210px,48%)] sm:right-[1%]" data-intro="pop" style={{ '--d': '640ms' }} role="img" aria-label={tr('Minh họa lộ trình JLPT từ N5 đến N2')}>
          <div className="lp-bob rounded-[18px] border border-white/70 bg-white/95 p-3.5 shadow-[0_22px_44px_-20px_rgba(90,30,55,0.38)]" style={{ '--bob': '1.4s' }}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-tone-reading flex items-center gap-1.5"><StudyIllustration name="roadmap" size={22} /> {tr('Lộ trình JLPT')}</p>
            <ol className="mt-3 flex items-center justify-between">
              {LEVELS.map((lvl, i) => (
                <li key={lvl} className="flex flex-1 items-center last:flex-none">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? 'bg-rp-brand-pressed text-white' : 'bg-rp-brand-tint text-rp-brand-strong'}`}>{lvl}</span>
                  {i < LEVELS.length - 1 && <span aria-hidden="true" className="mx-1 h-[2px] flex-1 rounded-full bg-gradient-to-r from-rp-brand-soft to-rp-line" />}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* SRS concept card — bottom-left */}
        <div className="lp-depth-1 absolute bottom-[16%] left-0 hidden w-[min(220px,46%)] sm:block sm:left-[4%]" data-intro="pop" style={{ '--d': '760ms' }} role="img" aria-label={tr('Minh họa khoảng cách ôn tập lặp ngắt quãng')}>
          <div className="lp-bob rounded-[18px] border border-white/70 bg-white/95 p-3.5 shadow-[0_22px_44px_-20px_rgba(90,30,55,0.38)]" style={{ '--bob': '2.6s' }}>
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tone-listening"><StudyIllustration name="srs" size={22} /> {tr('Ôn tập SRS')}</p>
            <div className="mt-2.5 flex items-end gap-1.5">
              {[1, 3, 7, 14].map((days, i) => (
                <span key={days} className="flex flex-1 flex-col items-center gap-1">
                  <span aria-hidden="true" className="w-full rounded-md bg-gradient-to-t from-tone-listening/70 to-tone-listening/25" style={{ height: `${10 + i * 7}px` }} />
                  <span className="whitespace-nowrap text-[9.5px] font-medium text-rp-text-muted">{trf('{n} ngày', { n: days })}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Group class card — bottom-right */}
        <div className="lp-depth-2 absolute bottom-0 right-0 w-[min(250px,62%)] sm:right-[2%]" data-intro="pop" style={{ '--d': '880ms' }} role="img" aria-label={tr('Minh họa lớp nhóm cùng Giáo viên: 10 tuần, 90 phút mỗi buổi, 1 đến 4 học viên')}>
          <div className="lp-bob rounded-[18px] border border-white/70 bg-white/95 p-3.5 shadow-[0_22px_44px_-20px_rgba(90,30,55,0.38)]" style={{ '--bob': '3.4s' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tone-mentor"><StudyIllustration name="group" size={22} /> {tr('Lớp nhóm')}</p>
              <span className="flex -space-x-1.5" aria-hidden="true">
                {['#F2A2B8', '#9CC4E8', '#B9DDB0', '#F6D49A'].map((c) => <span key={c} className="h-5 w-5 rounded-full border-2 border-white" style={{ background: c }} />)}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] font-bold text-rp-text">{tr('Học cùng Giáo viên')}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-rp-text-muted"><CalendarCheck aria-hidden="true" className="h-3.5 w-3.5" /> {tr('10 tuần · 90 phút/buổi · 1–4 học viên')}</p>
          </div>
        </div>
      </div>
      <p className="mt-6 flex justify-center lg:justify-end"><span className="lp-hero-note rounded-full px-3 py-1 text-[11px] font-medium text-rp-text-2 shadow-rp-xs ring-1 ring-black/5">{tr('Hình minh họa giao diện, không phải dữ liệu học tập thật.')}</span></p>
    </div>
  );
}
