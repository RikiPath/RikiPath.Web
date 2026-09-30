import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * Custom hook to handle array slicing, pagination calculations, and page state.
 *
 * @param {Array} items - The source items array to paginate
 * @param {Object} options - Configuration options
 * @param {number} [options.initialPage=1] - Starting page number (1-indexed)
 * @param {number} [options.initialPageSize=10] - Number of items per page
 * @returns {Object} Pagination state and controller functions
 */
export function usePagination(items = [], { initialPage = 1, initialPageSize = 10 } = {}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto adjust page if items shrink
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedData = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const goToPage = useCallback(
    (page) => {
      const p = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(p);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage: goToPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalPages,
    totalItems,
    paginatedData,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
  };
}
