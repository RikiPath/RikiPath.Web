import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { CustomSelect } from './core.jsx';
import { useLocale } from '@/locales/locale.js';

/**
 * Generates an array of page numbers with ellipses.
 * e.g. [1, 2, '...', 7, 8, 9, '...', 42]
 */
function getPaginationRange(currentPage, totalPages, siblingCount = 1) {
  const totalNumbers = siblingCount * 2 + 3; // siblingCount on each side + current + 2 boundary
  const totalBlocks = totalNumbers + 2; // + 2 for ellipses

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, '...', ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, '...', ...middleRange, '...', totalPages];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Enterprise, highly accessible Pagination component with theme styling.
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
  itemLabel = 'mục',
  variant = 'sakura', // 'sakura' | 'admin' | 'neutral'
  className = '',
}) {
  const { tr, trf } = useLocale();
  const pages = getPaginationRange(currentPage, totalPages);
  const startItem = totalItems ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  const isSakura = variant === 'sakura';
  const isAdmin = variant === 'admin';

  const activeBtnClass = isSakura || isAdmin
    ? 'bg-rp-brand-pressed text-white shadow-sm shadow-rp-brand/25 font-bold border-transparent'
    : 'bg-rp-text text-white font-bold border-transparent';

  const idleBtnClass =
    'bg-rp-surface text-rp-text border border-rp-line hover:bg-rp-brand-tint hover:text-rp-brand-pressed hover:border-rp-brand-border transition-all font-medium';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 bg-rp-surface/95 backdrop-blur-sm border-t border-rp-line text-xs ${className}`}
      data-component="Pagination"
    >
      {/* Left: Total Records Info & Page Size */}
      <div className="flex flex-wrap items-center gap-3 text-rp-text-2">
        {showTotal && totalItems !== undefined && (
          <span className="font-medium">
            {tr('Hiển thị')}{' '}
            <strong className="text-rp-text font-bold">
              {totalItems === 0 ? 0 : `${startItem} - ${endItem}`}
            </strong>{' '}
            {tr('trong tổng số')}{' '}<strong className="text-rp-text font-bold">{totalItems}</strong> {tr(itemLabel)}
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-rp-text-muted">{tr('| Mỗi trang:')}</span>
            <CustomSelect
              size="sm"
              className="w-auto min-w-[118px]"
              label={tr('Số dòng mỗi trang')}
              value={String(pageSize)}
              onChange={(val) => onPageSizeChange(Number(val))}
              options={pageSizeOptions.map((opt) => ({
                value: String(opt),
                label: trf('{0} / trang', { 0: opt }),
              }))}
            />
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
        {showFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title={tr('Trang đầu')}
            className="hidden sm:inline-flex p-1.5 rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title={tr('Trang trước')}
          className="p-1.5 rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Number Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-rp-text-disabled font-medium select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
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
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title={tr('Trang sau')}
          className="p-1.5 rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {showFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title={tr('Trang cuối')}
            className="hidden sm:inline-flex p-1.5 rounded-lg border border-rp-line bg-rp-surface text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
