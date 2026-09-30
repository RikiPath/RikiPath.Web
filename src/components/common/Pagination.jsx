import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

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
  const pages = getPaginationRange(currentPage, totalPages);
  const startItem = totalItems ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  const isSakura = variant === 'sakura';
  const isAdmin = variant === 'admin';

  const activeBtnClass = isSakura
    ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] text-white shadow-sm shadow-[#D94B68]/30 font-bold border-transparent'
    : isAdmin
    ? 'bg-primary text-on-primary font-bold shadow-xs border-transparent'
    : 'bg-gray-900 text-white font-bold border-transparent';

  const idleBtnClass =
    'bg-white text-[#2D282A] border border-[#EADFD9] hover:bg-[#FDF2F5] hover:text-[#D94B68] hover:border-[#F8BBD0] transition-all font-medium';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 bg-white/90 backdrop-blur-sm border-t border-[#EADFD9] text-xs ${className}`}
      data-component="Pagination"
    >
      {/* Left: Total Records Info & Page Size */}
      <div className="flex flex-wrap items-center gap-3 text-[#6E686A]">
        {showTotal && totalItems !== undefined && (
          <span className="font-medium">
            Hiển thị{' '}
            <strong className="text-[#2D282A] font-bold">
              {totalItems === 0 ? 0 : `${startItem} - ${endItem}`}
            </strong>{' '}
            trong tổng số <strong className="text-[#2D282A] font-bold">{totalItems}</strong> {itemLabel}
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-[#8E8488]">| Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2.5 bg-[#FAF7F5] border border-[#EADFD9] rounded-lg text-xs font-semibold text-[#2D282A] focus:outline-none focus:border-[#D94B68] focus:ring-1 focus:ring-[#D94B68]/40 transition-colors cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {showFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="Trang đầu"
            className="p-1.5 rounded-lg border border-[#EADFD9] bg-white text-[#6E686A] hover:bg-[#FAF7F5] hover:text-[#2D282A] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Trang trước"
          className="p-1.5 rounded-lg border border-[#EADFD9] bg-white text-[#6E686A] hover:bg-[#FAF7F5] hover:text-[#2D282A] disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Number Buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-[#9E8E93] font-medium select-none"
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
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
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
          title="Trang sau"
          className="p-1.5 rounded-lg border border-[#EADFD9] bg-white text-[#6E686A] hover:bg-[#FAF7F5] hover:text-[#2D282A] disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {showFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Trang cuối"
            className="p-1.5 rounded-lg border border-[#EADFD9] bg-white text-[#6E686A] hover:bg-[#FAF7F5] hover:text-[#2D282A] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
