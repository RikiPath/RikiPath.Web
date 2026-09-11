import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ALL_PAGES, FLOWS, matchFlowStep } from '../flows.js';

export default function PreviewNav() {
  const { pathname } = useLocation();
  const matched = useMemo(() => matchFlowStep(pathname), [pathname]);
  const [activeFlowId, setActiveFlowId] = useState('all');
  const navRef = useRef(null);

  useEffect(() => {
    // Khi đổi trang, giữ tab "Tất cả" nếu đang ở đó; còn không thì sync theo luồng khớp
    setActiveFlowId((prev) => (prev === 'all' ? 'all' : matched.flow.id));
  }, [matched.flow.id, pathname]);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--preview-nav-h', `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [activeFlowId, pathname]);

  const activeFlow = FLOWS.find((f) => f.id === activeFlowId) ?? FLOWS[0];
  const currentStepN =
    activeFlow.id === matched.flow.id || activeFlow.id === 'all'
      ? activeFlow.steps.find((s) => s.to === (pathname === '/' ? '/' : pathname.replace(/\/$/, '') || '/'))?.n
      : null;

  return (
    <header
      ref={navRef}
      className="preview-nav sticky top-0 z-[100] border-b border-[#f2d7de] bg-[#FFF8F8]/95 backdrop-blur-xl shadow-[0_4px_20px_-8px_rgba(217,75,104,0.18)]"
    >
      {/* Hàng 1: chọn chế độ / luồng */}
      <div className="flex items-center gap-2 border-b border-[#f2d7de]/70 px-3 py-1.5 sm:px-4">
        <div className="flex shrink-0 items-center gap-2 pr-2 border-r border-[#f2d7de]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white shadow-sm shadow-[#D94B68]/25">
            <span className="material-symbols-outlined text-[16px]">filter_vintage</span>
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-bold tracking-tight text-[#2D282A]">
              Riki<span className="text-[#D94B68]">Path</span>
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#A59B9E]">
              {ALL_PAGES.length} màn hình
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {FLOWS.map((flow) => {
            const selected = flow.id === activeFlowId;
            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => setActiveFlowId(flow.id)}
                className={[
                  'shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap',
                  selected
                    ? flow.id === 'all'
                      ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white shadow-sm'
                      : 'bg-[#2D282A] text-white shadow-sm'
                    : 'bg-white text-[#6F6669] border border-[#eadfd9] hover:border-[#D94B68]/40 hover:text-[#9E2A4B]',
                ].join(' ')}
                title={flow.description}
              >
                {flow.stepLabel}
                {flow.id !== 'all' ? `: ${flow.title}` : ` (${ALL_PAGES.length})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hàng 2: nút chuyển trang */}
      <div className="px-3 py-2 sm:px-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#6F6669]">
            <span className="font-semibold text-[#9E2A4B]">{activeFlow.stepLabel}</span>
            {' — '}
            {activeFlow.description}
          </p>
          {currentStepN != null && (
            <span className="rounded-full bg-[#FFF0F5] border border-[#f2d7de] px-2 py-0.5 text-[10px] font-bold text-[#9E2A4B]">
              {activeFlow.id === 'all'
                ? `${currentStepN}/${activeFlow.steps.length}`
                : `Bước ${currentStepN}/${activeFlow.steps.length}`}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-0.5">
          {activeFlow.steps.map((step, i) => {
            const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '') || '/';
            const isCurrent = step.to === normalized;
            return (
              <div key={`${step.to}-${step.n}`} className="flex shrink-0 items-center gap-1">
                {activeFlow.id !== 'all' && i > 0 && (
                  <span className="material-symbols-outlined text-[14px] text-[#d4c4c8] px-0.5">
                    chevron_right
                  </span>
                )}
                <NavLink
                  to={step.to}
                  end={step.to === '/'}
                  title={step.hint}
                  className={() =>
                    [
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap border',
                      isCurrent
                        ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white border-transparent shadow-md shadow-[#D94B68]/30'
                        : 'bg-white text-[#6F6669] border-[#eadfd9] hover:border-[#D94B68]/40 hover:text-[#9E2A4B] hover:bg-[#FFF0F5]',
                    ].join(' ')
                  }
                >
                  {activeFlow.id !== 'all' && (
                    <span
                      className={[
                        'inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold',
                        isCurrent ? 'bg-white/25 text-white' : 'bg-[#fde8ec] text-[#9E2A4B]',
                      ].join(' ')}
                    >
                      {step.n}
                    </span>
                  )}
                  {step.label}
                </NavLink>
              </div>
            );
          })}
        </nav>

        {activeFlow.id !== 'all' &&
          matched.flow.id === activeFlow.id &&
          matched.stepIndex < activeFlow.steps.length - 1 && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#6F6669]">
              <span className="font-medium">Bước tiếp theo:</span>
              <Link
                to={activeFlow.steps[matched.stepIndex + 1].to}
                className="font-bold text-[#D94B68] hover:underline"
              >
                {activeFlow.steps[matched.stepIndex + 1].n}.{' '}
                {activeFlow.steps[matched.stepIndex + 1].label}
              </Link>
            </div>
          )}
      </div>
    </header>
  );
}
