import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, FilePenLine, FileText, Folder, FolderTree, Search } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { Popover, cx } from '@/components/ui';
import { findNotebookLocation } from '../utils/notebookModel.js';

const LEVEL_ORDER = ['folder', 'file', 'page'];
const KIND_ICON = { folder: Folder, file: FileText, page: FilePenLine };

function entityName(kind, entity) {
  return kind === 'page' ? entity?.title : entity?.name;
}

/**
 * One input for choosing a Notebook location level by level: Thư mục → Tệp ghi chú → Trang.
 * `level` is the level that must be chosen (file creation → 'folder', page creation → 'file',
 * saved item → 'page'); higher levels are only navigated. Closed, it shows just the chosen name;
 * the full breadcrumb lives inside the dropdown. Built on the shared Popover (portal, viewport-aware).
 */
export default function CascadingLocationPicker({
  folders = [],
  level = 'page',
  value = null,
  onChange,
  placeholder,
  label,
  invalid = false,
  disabled = false,
  id,
}) {
  const { tr } = useLocale();
  const triggerRef = useRef(null);
  const selected = useMemo(() => findNotebookLocation(folders, level, value), [folders, level, value]);
  const selectedEntity = selected ? selected[level] : null;
  const SelectedIcon = KIND_ICON[level];

  const defaultPlaceholder = level === 'folder'
    ? tr('Chọn thư mục')
    : level === 'file' ? tr('Chọn tệp ghi chú') : tr('Chọn trang');

  return (
    <Popover
      align="start"
      className="w-full"
      label={label || defaultPlaceholder}
      panelClassName="w-[min(380px,calc(100vw-24px))] overflow-hidden"
      trigger={(
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cx(
            'rp-focus flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3.5 text-left text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
            invalid ? 'border-rp-danger' : 'border-rp-line hover:border-rp-brand-border aria-expanded:border-rp-brand aria-expanded:shadow-[0_0_0_3px_rgba(224,90,122,0.18)]',
          )}
        >
          <SelectedIcon aria-hidden="true" className={cx('h-4 w-4 shrink-0', selectedEntity ? 'text-rp-brand-pressed' : 'text-rp-text-muted')} />
          <span className={cx('min-w-0 flex-1 truncate', selectedEntity ? 'rp-jp text-rp-text' : 'font-medium text-rp-text-muted')}>
            {selectedEntity ? entityName(level, selectedEntity) : (placeholder || defaultPlaceholder)}
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
        </button>
      )}
    >
      {({ close }) => (
        <PickerPanel
          folders={folders}
          level={level}
          selected={selected}
          onPick={(entityId, location) => {
            onChange?.(entityId, location);
            close();
            triggerRef.current?.focus();
          }}
          onDismiss={() => {
            close();
            triggerRef.current?.focus();
          }}
        />
      )}
    </Popover>
  );
}

function PickerPanel({ folders, level, selected, onPick, onDismiss }) {
  const { tr, trf } = useLocale();
  const listId = useId();
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const targetDepth = LEVEL_ORDER.indexOf(level);

  // Start one level above the chosen item so its siblings are visible and the breadcrumb is meaningful.
  const [path, setPath] = useState(() => ({
    folderId: targetDepth >= 1 ? selected?.folder?.id ?? null : null,
    fileId: targetDepth >= 2 ? selected?.file?.id ?? null : null,
  }));
  const [direction, setDirection] = useState('forward');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const folder = path.folderId != null ? folders.find((f) => f.id === path.folderId) || null : null;
  const file = folder && path.fileId != null ? (folder.files || []).find((f) => f.id === path.fileId) || null : null;
  const viewKind = !folder || targetDepth === 0 ? 'folder' : !file || targetDepth === 1 ? 'file' : 'page';
  const viewKey = `${viewKind}-${folder?.id ?? 0}-${file?.id ?? 0}`;
  const cleanQuery = query.trim().toLowerCase();

  const rows = useMemo(() => {
    if (cleanQuery) {
      // Search jumps straight to every choosable item at the target level, with its parents as context.
      const out = [];
      for (const f of folders) {
        if (level === 'folder') {
          if (f.name.toLowerCase().includes(cleanQuery)) out.push({ kind: 'folder', entity: f, location: { folder: f, file: null, page: null } });
          continue;
        }
        for (const fl of f.files || []) {
          if (level === 'file') {
            if (fl.name.toLowerCase().includes(cleanQuery)) out.push({ kind: 'file', entity: fl, context: f.name, location: { folder: f, file: fl, page: null } });
            continue;
          }
          for (const p of fl.pages || []) {
            if (String(p.title || '').toLowerCase().includes(cleanQuery)) {
              out.push({ kind: 'page', entity: p, context: `${f.name} › ${fl.name}`, location: { folder: f, file: fl, page: p } });
            }
          }
        }
      }
      return out.slice(0, 50);
    }
    if (viewKind === 'folder') {
      return folders.map((f) => ({ kind: 'folder', entity: f, count: (f.files || []).length, location: { folder: f, file: null, page: null } }));
    }
    if (viewKind === 'file') {
      return (folder?.files || []).map((fl) => ({ kind: 'file', entity: fl, count: (fl.pages || []).length, location: { folder, file: fl, page: null } }));
    }
    return (file?.pages || []).map((p) => ({ kind: 'page', entity: p, location: { folder, file, page: p } }));
  }, [cleanQuery, folders, level, viewKind, folder, file]);

  const safeActive = rows.length === 0 ? -1 : Math.min(activeIndex, rows.length - 1);

  useEffect(() => {
    const t = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 16);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (safeActive < 0) return;
    listRef.current?.querySelector(`[data-index="${safeActive}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [safeActive, viewKey]);

  function drillInto(row) {
    setDirection('forward');
    setQuery('');
    setActiveIndex(0);
    if (row.kind === 'folder') setPath({ folderId: row.entity.id, fileId: null });
    else if (row.kind === 'file') setPath((p) => ({ ...p, fileId: row.entity.id }));
  }

  function goTo(depth) {
    setDirection('back');
    setQuery('');
    setActiveIndex(0);
    if (depth === 0) setPath({ folderId: null, fileId: null });
    else if (depth === 1) setPath((p) => ({ ...p, fileId: null }));
  }

  function activate(row) {
    if (!row) return;
    if (row.kind === level) onPick(row.entity.id, row.location);
    else drillInto(row);
  }

  const currentDepth = viewKind === 'folder' ? 0 : viewKind === 'file' ? 1 : 2;

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      // Handle here so a parent Modal's focus trap never receives it (it would close the whole dialog).
      e.preventDefault();
      e.stopPropagation();
      onDismiss();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (rows.length ? (Math.max(0, i) + 1) % rows.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (rows.length ? (Math.max(0, i) - 1 + rows.length) % rows.length : 0));
    } else if (e.key === 'Home' && !query) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End' && !query) {
      e.preventDefault();
      setActiveIndex(Math.max(0, rows.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(rows[safeActive]);
    } else if (e.key === 'ArrowRight' && !query) {
      const row = rows[safeActive];
      if (row && row.kind !== level) {
        e.preventDefault();
        drillInto(row);
      }
    } else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && !query && currentDepth > 0) {
      e.preventDefault();
      goTo(currentDepth - 1);
    }
  }

  const crumbs = [{ depth: 0, label: tr('Tất cả thư mục') }];
  if (folder && targetDepth >= 1) crumbs.push({ depth: 1, label: folder.name });
  if (file && targetDepth >= 2) crumbs.push({ depth: 2, label: file.name });

  const emptyText = cleanQuery
    ? tr('Không tìm thấy vị trí phù hợp')
    : viewKind === 'folder'
      ? tr('Chưa có thư mục nào')
      : viewKind === 'file'
        ? tr('Thư mục này chưa có tệp ghi chú')
        : tr('Tệp này chưa có trang');

  return (
    <div onKeyDown={onKeyDown} className="flex flex-col">
      {/* Breadcrumb (full path lives here, not in the closed input) */}
      <div className="flex min-h-10 items-center gap-1 border-b border-rp-line px-2 py-1.5">
        {currentDepth > 0 && !cleanQuery && (
          <button
            type="button"
            aria-label={tr('Quay lại')}
            onClick={() => goTo(currentDepth - 1)}
            className="rp-focus inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        <nav aria-label={tr('Vị trí hiện tại')} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-[12.5px]">
          {(cleanQuery ? [{ depth: -1, label: tr('Kết quả tìm kiếm') }] : crumbs).map((c, i, arr) => {
            const last = i === arr.length - 1;
            // Deeper levels: the root crumb collapses to an icon and parent crumbs give way to the current one.
            const iconOnlyRoot = c.depth === 0 && !last && arr.length > 2;
            return (
              <span
                key={`${c.depth}-${c.label}`}
                className={cx('flex min-w-0 items-center gap-0.5', last ? 'shrink' : iconOnlyRoot ? 'shrink-0' : 'shrink-[4]')}
              >
                {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-rp-text-muted" />}
                {last || c.depth < 0 ? (
                  <span className="truncate px-1 font-semibold text-rp-text" aria-current="location">{c.label}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => goTo(c.depth)}
                    aria-label={iconOnlyRoot ? c.label : undefined}
                    title={c.label}
                    className="rp-focus inline-flex min-w-0 items-center rounded px-1 font-medium text-rp-text-muted hover:text-rp-brand-strong"
                  >
                    {iconOnlyRoot ? <FolderTree aria-hidden="true" className="h-4 w-4" /> : <span className="truncate">{c.label}</span>}
                  </button>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Search */}
      <div className="px-2 pt-2">
        <label className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={safeActive >= 0 ? `${listId}-${safeActive}` : undefined}
            aria-label={tr('Tìm thư mục, tệp hoặc trang')}
            placeholder={level === 'folder' ? tr('Tìm thư mục…') : level === 'file' ? tr('Tìm tệp ghi chú…') : tr('Tìm trang…')}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            className="rp-focus h-10 w-full rounded-xl border border-rp-line bg-rp-bg-2/60 pl-9 pr-3 text-sm transition-colors focus:border-rp-brand focus:bg-white"
          />
        </label>
      </div>

      {/* Level list (slides between levels) */}
      <div className="overflow-hidden">
        <ul
          key={cleanQuery ? 'search' : viewKey}
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={crumbs[crumbs.length - 1].label}
          className={cx(
            'max-h-[min(300px,45vh)] space-y-0.5 overflow-y-auto overscroll-contain p-2',
            !cleanQuery && (direction === 'back' ? 'rp-cascade-in-back' : 'rp-cascade-in-forward'),
          )}
        >
          {rows.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-rp-text-muted">{emptyText}</li>
          ) : rows.map((row, idx) => {
            const Icon = KIND_ICON[row.kind];
            const choosable = row.kind === level;
            const isSelected = choosable && selected?.[level]?.id === row.entity.id;
            const isActive = idx === safeActive;
            return (
              <li
                key={`${row.kind}-${row.entity.id}`}
                id={`${listId}-${idx}`}
                data-index={idx}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => activate(row)}
                className={cx(
                  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors duration-100',
                  isSelected
                    ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong'
                    : isActive ? 'bg-rp-bg-2 text-rp-text' : 'text-rp-text-2',
                )}
              >
                <Icon aria-hidden="true" className={cx('h-4 w-4 shrink-0', isSelected ? 'text-rp-brand-pressed' : 'text-rp-text-muted')} />
                <span className="min-w-0 flex-1">
                  <span className="rp-jp block truncate">{entityName(row.kind, row.entity)}</span>
                  {row.context && <span className="block truncate text-[11.5px] font-normal text-rp-text-muted">{row.context}</span>}
                </span>
                {row.count != null && !choosable && (
                  <span className="shrink-0 text-[11.5px] tabular-nums text-rp-text-muted">
                    {row.kind === 'folder' ? trf('{0} tệp', { 0: row.count }) : trf('{0} trang', { 0: row.count })}
                  </span>
                )}
                {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-brand-pressed" />}
                {!choosable && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
