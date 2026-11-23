import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { CustomSelect } from './core.jsx';
import { getSmartPaginationModel } from './paginationLogic.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Enterprise, adaptive, accessible Pagination component shared across RikiPath.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showTotal = true,
  showFirstLast = true,
  showPageJump = true,
  siblingCount,
  itemLabel = 'mục',
  variant = 'sakura', // 'sakura' | 'admin' | 'neutral'
  className = '',
}) {
  const { tr, trf } = useLocale();
  const rootRef = useRef(null);
  const [jumpValue, setJumpValue] = useState('');
  const [isCompactWidth, setIsCompactWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const updateWidth = (width) => {
      if (width > 0) setIsCompactWidth(width < 520);
    };
    updateWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateWidth(entry.contentRect?.width || 0);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const safeTotalPages = Math.max(1, totalPages || 1);
  if (safeTotalPages <= 1) return null;

  const model = getSmartPaginationModel({
    currentPage,
    totalPages: safeTotalPages,
    compact: isCompactWidth,
    siblingCount,
    showFirstLast,
    showPageJump,
  });

  const safeCurrentPage = model.currentPage;
  const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 10;
  const normalizedPageSizeOptions = Array.from(
    new Set([
      ...pageSizeOptions.map(Number).filter((n) => Number.isFinite(n) && n > 0),
      safePageSize,
    ]),
  ).sort((a, b) => a - b);
  const pages = model.items;
  const startItem = totalItems ? Math.min((safeCurrentPage - 1) * safePageSize + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(safeCurrentPage * safePageSize, totalItems) : 0;

  const isNeutral = variant === 'neutral';

  const activeBtnClass =
    'bg-rp-brand-pressed text-white shadow-sm shadow-rp-brand/25 font-bold border-transparent';

  const idleBtnClass = isNeutral
    ? 'bg-rp-surface text-rp-text border border-rp-line hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border transition-colors font-medium'
    : 'bg-rp-surface text-rp-text border border-rp-line hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border transition-colors font-medium';

  const goToPage = (target) => {
    const clamped = Math.max(1, Math.min(safeTotalPages, Number(target) || 1));
    if (clamped !== safeCurrentPage) onPageChange?.(clamped);
  };

  const handleJumpChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setJumpValue('');
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > safeTotalPages) return;
    setJumpValue(String(parsed));
  };

  const commitJump = (e) => {
    e?.preventDefault();
    const parsed = Number.parseInt(String(jumpValue).trim(), 10);
    if (!Number.isFinite(parsed)) {
      setJumpValue('');
      return;
    }
    const clamped = Math.max(1, Math.min(safeTotalPages, parsed));
    setJumpValue('');
    if (clamped !== safeCurrentPage) onPageChange?.(clamped);
  };

  const hasTotalInfo = showTotal && totalItems !== undefined;
  const hasPageSizeControl = Boolean(showPageSize && onPageSizeChange);
  const hasJumpControl = Boolean(model.showJump && (totalItems == null || totalItems > 0));
  const hasLeftControls = hasTotalInfo || hasPageSizeControl || hasJumpControl;

  return (
    <nav
      ref={rootRef}
      aria-label={tr('Phân trang')}
      className={`flex shrink-0 max-w-full flex-wrap items-center ${hasLeftControls ? 'justify-between' : 'justify-center'} gap-2.5 border-t border-rp-line bg-rp-surface px-4 py-2.5 text-xs md:flex-nowrap ${className}`}
      data-component="Pagination"
    >
      {/* Left: Compact Total Records Info, Page Size & Fast Page Jump (hidden cleanly when empty) */}
      {hasLeftControls && (
        <div className="flex flex-wrap items-center gap-2 text-rp-text-2 sm:flex-nowrap">
          {hasTotalInfo && (
            <span className="whitespace-nowrap font-medium tabular-nums">
              <strong className="font-bold text-rp-text">
                {totalItems === 0 ? '0' : `${startItem}–${endItem}`}
              </strong>
              {' / '}
              <strong className="font-bold text-rp-text">{totalItems}</strong> {tr(itemLabel)}
            </span>
          )}

          {hasPageSizeControl && (
            <div className="flex shrink-0 items-center gap-1.5">
              {hasTotalInfo && <span className="text-rp-line">|</span>}
              <CustomSelect
                fitContent
                size="sm"
                triggerClassName="h-8 rounded-lg text-xs"
                label={tr('Số dòng mỗi trang')}
                value={String(safePageSize)}
                onChange={(val) => onPageSizeChange(Number(val))}
                options={normalizedPageSizeOptions.map((opt) => ({
                  value: String(opt),
                  label: trf('{0} / trang', { 0: opt }),
                }))}
              />
            </div>
          )}

          {hasJumpControl && (
            <form onSubmit={commitJump} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              {(hasTotalInfo || hasPageSizeControl) && <span className="text-rp-line">|</span>}
              <label htmlFor="rp-page-jump" className="text-rp-text-muted whitespace-nowrap">
                {tr('Trang')}
              </label>
              <input
                id="rp-page-jump"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-valuemin={1}
                aria-valuemax={safeTotalPages}
                value={jumpValue}
                onChange={handleJumpChange}
                onBlur={commitJump}
                placeholder={String(safeCurrentPage)}
                aria-label={tr('Đi tới trang')}
                className="h-8 w-11 rounded-lg border border-rp-line bg-rp-surface px-1.5 text-center text-xs font-medium tabular-nums text-rp-text focus:border-rp-brand focus:outline-none"
              />
              <span className="text-rp-text-muted tabular-nums">/ {safeTotalPages}</span>
            </form>
          )}
        </div>
      )}

      {/* Right: Page Navigation Buttons */}
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1 sm:shrink-0 sm:flex-nowrap">
        {model.showFirst && (
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={!model.canPrev}
            aria-label={tr('Trang đầu')}
            title={tr('Trang đầu')}
            className="rp-focus hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => goToPage(safeCurrentPage - 1)}
          disabled={!model.canPrev}
          aria-label={tr('Trang trước')}
          title={tr('Trang trước')}
          className="rp-focus inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Number Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  aria-hidden="true"
                  className="inline-flex h-8 w-7 items-center justify-center text-rp-text-disabled font-medium select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => goToPage(p)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={trf('Trang {0}', { 0: p })}
                className={`rp-focus inline-flex h-8 min-w-[32px] px-2 rounded-lg items-center justify-center text-xs tabular-nums transition-colors ${
                  isActive ? activeBtnClass : idleBtnClass
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => goToPage(safeCurrentPage + 1)}
          disabled={!model.canNext}
          aria-label={tr('Trang sau')}
          title={tr('Trang sau')}
          className="rp-focus inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {model.showLast && (
          <button
            type="button"
            onClick={() => goToPage(safeTotalPages)}
            disabled={!model.canNext}
            aria-label={tr('Trang cuối')}
            title={tr('Trang cuối')}
            className="rp-focus hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
}
