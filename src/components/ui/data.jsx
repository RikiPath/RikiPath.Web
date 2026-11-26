import { isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import Pagination from './Pagination.jsx';
import { Button } from './core.jsx';
import { cx } from './cx.js';
import { getColumnPriorityClass, normalizeDensity } from './layoutLogic.js';
import { resolveEmptyIllustration } from './dataStateLogic.js';
import { FEATURE_TONES, MAX_UPLOAD_BYTES, formatBytes, monthGrid, validateUploadFile } from './logic.js';
import { EmptyState, ErrorState } from './states.jsx';
import { Skeleton } from './core.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

/* ------------------------------------------------------------------ Feature icons */

export function FeatureIcon({ feature = 'neutral', icon, size = 'md', interactive = true, className }) {
  const tone = FEATURE_TONES[feature] || FEATURE_TONES.neutral;
  const Icon = icon || tone.Icon;
  const dims = size === 'sm' ? 'h-8 w-8 rounded-[10px]' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const iconDims = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center ring-1 ring-inset ring-black/[0.04]',
        interactive && 'rp-icon-tilt',
        tone.bg,
        tone.fg,
        dims,
        className,
      )}
    >
      <Icon className={iconDims} />
    </span>
  );
}

/* ------------------------------------------------------------------ FileUpload */

export function FileUpload({
  label = 'Tải tệp lên',
  hint,
  accept = [],
  maxBytes = MAX_UPLOAD_BYTES,
  multiple = false,
  files = [],
  onChange,
  disabled = false,
  error,
}) {
  const { trf, tr } = useLocale();
  const inputRef = useRef(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  function take(list) {
    const incoming = [...(list || [])];
    if (!incoming.length) return;
    const problems = incoming.map((f) => validateUploadFile(f, { maxBytes, accept })).filter(Boolean);
    setLocalError(problems[0] || '');
    const valid = incoming.filter((f) => !validateUploadFile(f, { maxBytes, accept }));
    if (!valid.length) return;
    onChange?.(multiple ? [...files, ...valid] : valid.slice(0, 1));
  }

  const shownError = error || localError;
  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) take(e.dataTransfer.files);
        }}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-rp-card border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-rp-brand bg-rp-brand-tint' : shownError ? 'border-rp-danger-line bg-rp-danger-bg/40' : 'border-rp-line bg-rp-bg-2 hover:border-rp-brand-border',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rp-surface text-rp-brand shadow-rp-xs">
          <Upload aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-rp-text">{tr(label)}</span>
        <span className="text-xs text-rp-text-muted">
          {hint || trf('Kéo thả hoặc bấm để chọn · tối đa {0}', { 0: formatBytes(maxBytes) })}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={Array.isArray(accept) ? (accept.join(',') || undefined) : (accept || undefined)}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            take(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {shownError && <p role="alert" className="mt-1.5 text-xs font-medium text-rp-danger">{shownError}</p>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-rp-input border border-rp-line bg-rp-surface px-3 py-2">
              {(file.type || '').startsWith('image/') ? <ImageIcon aria-hidden="true" className="h-4 w-4 text-tone-reading" /> : <FileText aria-hidden="true" className="h-4 w-4 text-tone-mock" />}
              <span className="min-w-0 flex-1 truncate text-sm text-rp-text">{file.name}</span>
              <span className="text-xs tabular-nums text-rp-text-muted">{formatBytes(file.size)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange?.(files.filter((_, i) => i !== index))}
                  aria-label={trf('Bỏ tệp {0}', { 0: file.name })}
                  className="rp-focus rounded-full p-1 text-rp-text-muted hover:bg-rp-danger-bg hover:text-rp-danger"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ DataTable */

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (typeof a === 'string' && /\d{4}-\d{2}-\d{2}/.test(a) && !Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
}

/**
 * Client-side table with sort + pagination + every state.
 * columns: [{ key, header, render?(row), sortValue?(row), sortable?, className?, align? }]
 * For server-side paging pass `page`, `pageSize`, `total`, `onPageChange` and pre-sorted rows.
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  keyField,
  onRowClick,
  loading = false,
  error,
  onRetry,
  empty,
  emptyIllustration,
  emptyContext,
  caption,
  pageSize: pageSizeProp = 10,
  page: pageProp,
  total,
  onPageChange,
  onPageSizeChange,
  rowActions,
  actionsHeader = false,
  actionsCompact = true,
  paginationVariant = 'neutral',
  alwaysShowPagination = false,
  stickyHeader = false,
  fillHeight = false,
  scrollClassName,
  itemLabel = 'dòng',
  density = 'compact',
  align = 'center',
  minTableWidth = 'min-w-[560px]',
  // Changes whenever the caller's filters/search change (e.g. `${status}|${query}`): client-paged tables return to
  // page 1 instead of staying on a page that no longer exists or now shows unrelated rows.
  resetPageKey,
  onViewChange,
  beforeTable,
  rowClassName,
  className,
}) {
  const resolveRowKey = (row, idx) => (keyField && row?.[keyField] != null ? row[keyField] : rowKey(row) ?? idx);
  const { tr } = useLocale();
  const [sort, setSort] = useState(null);
  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(pageSizeProp);
  const [sizeCustomized, setSizeCustomized] = useState(false);
  const [adaptiveSize, setAdaptiveSize] = useState(0);
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const tableRef = useRef(null);
  const [lastResetKey, setLastResetKey] = useState(resetPageKey);
  if (resetPageKey !== lastResetKey) {
    setLastResetKey(resetPageKey);
    setLocalPage(1);
  }
  const serverPaged = typeof onPageChange === 'function' && pageProp != null;
  const page = serverPaged ? pageProp : localPage;

  const sorted = useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    if (!sort || serverPaged) return list;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue || ((row) => row[sort.key]);
    list.sort((a, b) => compareValues(get(a), get(b)) * (sort.dir === 'asc' ? 1 : -1));
    return list;
  }, [rows, sort, columns, serverPaged]);

  // A viewport-locked table can show more client-side rows when there is room. Never
  // infer extra server pages from the current response, and respect a manual page size.
  const pageSize = serverPaged ? pageSizeProp : sizeCustomized ? localSize : Math.max(localSize, fillHeight ? adaptiveSize : 0);

  useEffect(() => {
    if (!fillHeight || serverPaged || loading || error || sorted.length === 0 || typeof ResizeObserver === 'undefined') return undefined;
    const root = rootRef.current;
    const table = tableRef.current;
    const parent = root?.parentElement;
    if (!parent || !table) return undefined;

    let frame = 0;
    const measure = () => {
      const sampleRows = Array.from(table.tBodies[0]?.rows || []).slice(0, 4);
      const header = table.tHead;
      if (sampleRows.length === 0 || !header) return;
      const parentRect = parent.getBoundingClientRect();
      const available = Math.min(parentRect.height, window.innerHeight - parentRect.top - 16);
      const rowHeight = Math.max(...sampleRows.map((row) => row.getBoundingClientRect().height));
      if (available <= 0 || rowHeight <= 0) return;
      const headerHeight = header.getBoundingClientRect().height;
      const pagerHeight = root.querySelector('[data-component="Pagination"]')?.getBoundingClientRect().height || 56;
      const withoutPager = Math.max(1, Math.floor((available - headerHeight - 2) / rowHeight));
      const withPager = Math.max(1, Math.floor((available - headerHeight - pagerHeight - 2) / rowHeight));
      const next = Math.min(100, sorted.length <= withoutPager ? sorted.length : withPager);
      setAdaptiveSize((current) => current === next ? current : next);
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(parent);
    observer.observe(table);
    window.addEventListener('resize', scheduleMeasure);
    scheduleMeasure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.cancelAnimationFrame(frame);
    };
  }, [fillHeight, serverPaged, loading, error, sorted.length, pageSize]);

  const totalItems = serverPaged ? total ?? sorted.length : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = serverPaged ? sorted : sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key) {
    setSort((cur) => {
      const next = cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null;
      onViewChange?.({ reason: 'sort', sort: next, page: safePage, pageSize });
      return next;
    });
  }

  const resolvedDensity = normalizeDensity(density);
  const actionsHeaderLabel = actionsHeader
    ? tr(typeof actionsHeader === 'string' ? actionsHeader : 'Thao tác')
    : <span className="sr-only">{tr('Thao tác')}</span>;
  const resolveAlignClass = (dir) => {
    const effective = dir || align;
    if (effective === 'right') return 'text-right';
    if (effective === 'left') return 'text-left';
    return 'text-center';
  };
  const getColumnSizeClass = (col) => cx(
    col.compact && 'w-[1%] whitespace-nowrap',
    col.width,
  );
  const allColumns = rowActions
    ? [...columns, { key: '__actions', header: actionsHeaderLabel, align: 'center', headerAlign: 'center', compact: actionsCompact, render: rowActions }]
    : columns;
  const resolveColumnAlign = (col, index) => resolveAlignClass(
    col.align || (index === 0 ? 'left' : index === allColumns.length - 1 ? 'right' : align),
  );
  const edgeCellPadding = (index) => index === 0
    ? 'pl-[var(--rp-table-cell-x)] pr-[var(--rp-table-cell-x)] sm:pl-3'
    : index === allColumns.length - 1
      ? 'pl-[var(--rp-table-cell-x)] pr-[var(--rp-table-cell-x)] sm:pr-3'
      : '';
  const usesTableScroll = Boolean(stickyHeader || scrollClassName || fillHeight);

  // Sync measured thead height into --rp-table-head-h so the vertical scrollbar track always starts below the sticky header.
  useEffect(() => {
    if (!usesTableScroll) return undefined;
    const scroller = scrollRef.current;
    const thead = tableRef.current?.tHead;
    if (!scroller || !thead) return undefined;

    const syncHeadHeight = () => {
      const h = Math.round(thead.getBoundingClientRect().height);
      if (h > 0) scroller.style.setProperty('--rp-table-head-h', `${h}px`);
    };
    syncHeadHeight();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(syncHeadHeight);
    ro.observe(thead);
    return () => ro.disconnect();
  }, [usesTableScroll, columns.length, resolvedDensity]);

  const tableElement = (
    <div
      ref={rootRef}
      data-rp-surface="true"
      data-density={resolvedDensity}
      className={cx(
        'flex w-full max-w-full min-w-0 flex-col overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface',
        // Short lists stay compact; long lists are capped by the workspace and scroll inside.
        fillHeight && 'min-h-0 max-h-full',
        className,
      )}
    >
      <div
        ref={scrollRef}
        style={usesTableScroll ? { '--rp-table-head-bg': 'var(--color-rp-table-head)' } : undefined}
        className={cx(
          stickyHeader || scrollClassName || fillHeight ? 'rp-table-scroll' : 'rp-scroll-x',
          fillHeight && 'min-h-0',
          fillHeight && !scrollClassName && 'max-h-[clamp(260px,68vh,740px)] lg:max-h-full',
          stickyHeader && !fillHeight && !scrollClassName && 'max-h-[clamp(260px,62vh,640px)]',
          scrollClassName,
        )}
      >
        <table ref={tableRef} className={cx('w-full border-collapse rp-type-body', resolveAlignClass(align), minTableWidth)}>
          {caption && <caption className="sr-only">{tr(caption)}</caption>}
          <thead className="bg-rp-table-head">
            <tr>
              {allColumns.map((col, index) => {
                const sortable = col.sortable !== false && col.key !== '__actions' && !serverPaged;
                const dir = sort?.key === col.key ? sort.dir : null;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                    className={cx(
                      'border-b border-rp-brand-border/80 bg-rp-table-head px-[var(--rp-table-cell-x)] py-[var(--rp-table-cell-y)] text-xs font-bold text-rp-brand-strong',
                      stickyHeader && 'sticky top-0 z-10 shadow-[0_1px_0_var(--color-rp-brand-border)]',
                      col.headerAlign ? resolveAlignClass(col.headerAlign) : resolveColumnAlign(col, index),
                      edgeCellPadding(index),
                      getColumnPriorityClass(col.priority),
                      getColumnSizeClass(col),
                      col.headerClassName,
                    )}
                  >
                    {(() => {
                      const headerContent = typeof col.header === 'function'
                        ? col.header({ visibleRows: visible, safePage, pageSize })
                        : col.header;
                      return sortable ? (
                        <button type="button" onClick={() => toggleSort(col.key)} className={cx('rp-focus inline-flex items-center gap-1 rounded hover:text-rp-brand-deep', col.headerButtonClassName)}>
                          {headerContent}
                          {dir === 'asc' ? <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" /> : dir === 'desc' ? <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />}
                        </button>
                      ) : (
                        headerContent
                      );
                    })()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: Math.min(pageSize, 6) }, (_, i) => (
                <tr key={`sk-${i}`} className="border-b border-rp-line last:border-0">
                  {allColumns.map((col, index) => (
                    <td
                      key={col.key}
                      className={cx(
                        'px-[var(--rp-table-cell-x)] py-[var(--rp-table-cell-y)]',
                        resolveColumnAlign(col, index),
                        edgeCellPadding(index),
                        getColumnPriorityClass(col.priority),
                        getColumnSizeClass(col),
                      )}
                    >
                      <Skeleton className={cx('h-3.5 w-3/4', (col.align || align) === 'center' && 'mx-auto', (col.align || align) === 'right' && 'ml-auto')} />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && error && (
              <tr><td colSpan={allColumns.length}><ErrorState error={error} onRetry={onRetry} compact /></td></tr>
            )}
            {!loading && !error && visible.length === 0 && (
              <tr>
                <td colSpan={allColumns.length}>
                  {empty == null ? (
                    <EmptyState
                      variant="compact"
                      illustration={emptyIllustration || resolveEmptyIllustration({ context: emptyContext, title: itemLabel })}
                      context={emptyContext}
                    />
                  ) : isValidElement(empty) || typeof empty !== 'object' ? (
                    empty
                  ) : (
                    <EmptyState
                      variant={empty.variant || 'compact'}
                      illustration={empty.illustration || emptyIllustration}
                      context={empty.context || emptyContext}
                      size={empty.size}
                      title={empty.title}
                      description={empty.description ?? empty.message}
                      icon={empty.icon}
                      mascot={empty.mascot}
                      art={empty.art}
                      action={empty.action}
                      className={empty.className}
                    />
                  )}
                </td>
              </tr>
            )}
            {!loading && !error && visible.map((row, rowIdx) => (
              <tr
                key={resolveRowKey(row, rowIdx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                } : undefined}
                className={cx(
                  'border-b border-rp-line transition-colors duration-150 last:border-0 hover:bg-rp-row-hover',
                  onRowClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rp-brand/35',
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                )}
              >
                {allColumns.map((col, index) => (
                  <td
                    key={col.key}
                    className={cx(
                      'px-[var(--rp-table-cell-x)] py-[var(--rp-table-cell-y)] align-middle text-rp-text',
                      resolveColumnAlign(col, index),
                      edgeCellPadding(index),
                      getColumnPriorityClass(col.priority),
                      getColumnSizeClass(col),
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && (alwaysShowPagination ? totalItems > 0 : totalPages > 1) && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          itemLabel={itemLabel}
          variant={paginationVariant}
          className="shrink-0"
          onPageChange={(p) => {
            if (serverPaged) onPageChange(p);
            else setLocalPage(p);
            onViewChange?.({ reason: 'page', page: p, pageSize });
          }}
          onPageSizeChange={(size) => {
            if (onPageSizeChange) onPageSizeChange(size);
            else {
              setSizeCustomized(true);
              setLocalSize(size);
              setLocalPage(1);
            }
            onViewChange?.({ reason: 'pageSize', page: 1, pageSize: size });
          }}
        />
      )}
    </div>
  );

  if (!beforeTable) return tableElement;
  const headerBand = typeof beforeTable === 'function'
    ? beforeTable({ visibleRows: visible, safePage, pageSize, totalItems })
    : beforeTable;
  return (
    <div className={cx('flex w-full min-w-0 flex-col gap-3', fillHeight && 'min-h-0 flex-1')}>
      {headerBand}
      {tableElement}
    </div>
  );
}

/* ------------------------------------------------------------------ Month calendar */

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Accessible month calendar. `events` = { 'YYYY-MM-DD': [{ label, tone }] }.
 * Used for learner schedules and mentor planners; selection is optional.
 */
export function MonthCalendar({ month: monthProp, onMonthChange, events = {}, selected, onSelect, renderDay, className }) {
  const { trf, tr } = useLocale();
  const today = ymd(new Date());
  const [internal, setInternal] = useState(() => {
    const base = monthProp || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const month = monthProp ? new Date(monthProp.getFullYear(), monthProp.getMonth(), 1) : internal;
  const setMonth = (next) => (onMonthChange ? onMonthChange(next) : setInternal(next));
  const days = monthGrid(month.getFullYear(), month.getMonth());
  const title = month.toLocaleDateString(currentIntlTag(), { month: 'long', year: 'numeric' });
  return (
    <div className={cx('rounded-rp-card border border-rp-line bg-rp-surface p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold capitalize text-rp-text" aria-live="polite">{tr(title)}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={ChevronLeft} aria-label={tr('Tháng trước')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
          <Button variant="ghost" size="sm" icon={ChevronRight} aria-label={tr('Tháng sau')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </div>
      </div>
      <div role="grid" aria-label={title} className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="py-1 text-[11px] font-semibold text-rp-text-muted">{tr(d)}</div>
        ))}
        {days.map((date) => {
          const key = ymd(date);
          const inMonth = date.getMonth() === month.getMonth();
          const dayEvents = events[key] || [];
          const isSel = selected === key;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={isSel || undefined}
              aria-label={`${date.toLocaleDateString(currentIntlTag())}${dayEvents.length ? trf(', {0} lịch', { 0: dayEvents.length }) : ''}`}
              onClick={() => onSelect?.(key)}
              className={cx(
                'rp-focus flex min-h-11 flex-col items-center justify-start gap-0.5 rounded-lg py-1 text-[13px] transition-colors',
                inMonth ? 'text-rp-text' : 'text-rp-text-disabled',
                isSel ? 'bg-rp-brand-pressed text-white' : key === today ? 'bg-rp-brand-tint font-bold text-rp-brand-strong' : 'hover:bg-rp-muted',
              )}
            >
              <span className="tabular-nums">{date.getDate()}</span>
              {renderDay ? renderDay(key, dayEvents) : dayEvents.length > 0 && (
                <span className="flex gap-0.5" aria-hidden="true">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span key={i} className={cx('h-1.5 w-1.5 rounded-full', isSel ? 'bg-white' : ev.tone === 'danger' ? 'bg-rp-danger' : ev.tone === 'success' ? 'bg-rp-success' : 'bg-rp-brand')} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
