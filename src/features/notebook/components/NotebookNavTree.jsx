import {
  Bookmark,
  ChevronRight,
  Ellipsis,
  FilePenLine,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { Collapsible, CountBadge, IconButton, Popover, SearchInput, cx } from '@/components/ui';

/**
 * Row actions stay visible on touch / coarse pointers; on fine-pointer desktops they reveal on
 * hover or keyboard focus, and stay visible while their menu is open (`aria-expanded`).
 */
const ROW_ACTIONS_CLASS =
  'flex shrink-0 items-center [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 transition-opacity duration-150';

/**
 * Reusable Left Navigation Tree for Personal Notebook V3.
 * Strict hierarchy order: Search -> All Saved Items -> Favorites -> Folders -> Files -> Pages.
 */
export default function NotebookNavTree({
  searchQuery,
  onSearchChange,
  stats,
  folders = [],
  selection, // { view: 'folder' | 'file' | 'page' | 'all-items' | 'favorites', id?: number }
  expandedFolders = {},
  expandedFiles = {},
  onToggleFolderExpand,
  onToggleFileExpand,
  onSelectView,
  onRequestCreate, // ({ kind: 'folder'|'file'|'page', folderId?, fileId? })
  onRequestRenameOrMove, // ({ kind: 'folder'|'file'|'page', item, renameOnly? })
  onRequestDelete, // ({ kind: 'folder'|'file'|'page', item })
}) {
  const { tr, trf } = useLocale();

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Search */}
      <div>
        <SearchInput
          value={searchQuery}
          onChange={(e) => onSearchChange(typeof e === 'string' ? e : (e?.target?.value ?? ''))}
          onClear={() => onSearchChange('')}
          placeholder={tr('Tìm kiếm trong sổ tay…')}
          aria-label={tr('Tìm kiếm trong sổ tay')}
        />
      </div>

      {/* 2 & 3. Smart Views */}
      <nav aria-label={tr('Chế độ xem thông minh')} className="space-y-1">
        <SmartViewButton
          active={selection.view === 'all-items'}
          icon={<Bookmark className="h-4 w-4 shrink-0 text-rp-brand-strong" />}
          label={tr('Tất cả mục đã lưu')}
          count={stats?.totalSavedItems ?? 0}
          tone="sakura"
          onClick={() => onSelectView('all-items')}
        />
        <SmartViewButton
          active={selection.view === 'favorites'}
          icon={<Star className="h-4 w-4 shrink-0 text-amber-500" />}
          label={tr('Trang yêu thích')}
          count={stats?.favoritePagesCount ?? 0}
          tone="amber"
          onClick={() => onSelectView('favorites')}
        />
      </nav>

      <div className="h-px bg-rp-line" aria-hidden="true" />

      {/* 4. Folder -> File -> Page Tree */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-rp-text-muted">
          {tr('Thư mục & Ghi chú')}
        </span>
        <IconButton
          size="sm"
          icon={FolderPlus}
          label={tr('Tạo thư mục mới')}
          onClick={() => onRequestCreate({ kind: 'folder' })}
        />
      </div>

      {folders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rp-line bg-rp-bg-2/70 p-3 text-center">
          <p className="text-[12.5px] text-rp-text-muted">{tr('Chưa có thư mục nào.')}</p>
          <button
            type="button"
            onClick={() => onRequestCreate({ kind: 'folder' })}
            className="rp-focus mt-2 inline-flex h-8 items-center gap-1 rounded-lg bg-rp-brand-tint px-3 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tr('Tạo thư mục')}</span>
          </button>
        </div>
      ) : (
        <ul role="tree" aria-label={tr('Cây thư mục sổ tay')} className="space-y-1">
          {folders.map((folder) => {
            const isExpanded = expandedFolders[folder.id] ?? true;
            const isFolderActive = selection.view === 'folder' && selection.id === folder.id;
            const files = folder.files || [];

            return (
              <li key={folder.id} role="treeitem" aria-expanded={isExpanded} aria-selected={isFolderActive}>
                {/* Folder Row */}
                <div
                  className={cx(
                    'group flex h-9 items-center gap-1 rounded-xl pr-1 transition-colors',
                    isFolderActive ? 'bg-rp-brand-tint text-rp-brand-strong' : 'text-rp-text hover:bg-rp-bg-2',
                  )}
                >
                  <ExpandToggle
                    expanded={isExpanded}
                    label={isExpanded ? trf('Thu gọn thư mục {0}', { 0: folder.name }) : trf('Mở thư mục {0}', { 0: folder.name })}
                    onClick={() => onToggleFolderExpand(folder.id)}
                  />

                  <button
                    type="button"
                    title={folder.name}
                    onClick={() => onSelectView('folder', folder.id)}
                    className="rp-focus flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-lg text-left text-[13px] font-semibold"
                  >
                    {isExpanded ? (
                      <FolderOpen className="h-4 w-4 shrink-0 text-rp-brand-pressed" />
                    ) : (
                      <Folder className="h-4 w-4 shrink-0 text-rp-brand-pressed" />
                    )}
                    <span className="truncate">{folder.name}</span>
                  </button>

                  <RowMenu label={trf('Tùy chọn thư mục {0}', { 0: folder.name })}>
                    {(close) => (
                      <>
                        <MenuActionButton
                          icon={FilePlus2}
                          label={tr('Tạo tệp ghi chú')}
                          onClick={() => {
                            close();
                            onRequestCreate({ kind: 'file', folderId: folder.id });
                          }}
                        />
                        <MenuActionButton
                          icon={Pencil}
                          label={tr('Đổi tên thư mục')}
                          onClick={() => {
                            close();
                            onRequestRenameOrMove({ kind: 'folder', item: folder });
                          }}
                        />
                        <MenuActionButton
                          icon={Trash2}
                          danger
                          label={tr('Xóa thư mục')}
                          onClick={() => {
                            close();
                            onRequestDelete({ kind: 'folder', item: folder });
                          }}
                        />
                      </>
                    )}
                  </RowMenu>
                </div>

                {/* Files inside Folder */}
                <Collapsible open={isExpanded}>
                  <ul role="group" className="ml-3 mt-0.5 space-y-0.5 border-l border-rp-line/80 pl-2">
                    {files.length === 0 ? (
                      <li>
                        <button
                          type="button"
                          onClick={() => onRequestCreate({ kind: 'file', folderId: folder.id })}
                          className="rp-focus flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-left text-[12px] text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-brand-strong"
                        >
                          <Plus className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tr('Tạo tệp đầu tiên')}</span>
                        </button>
                      </li>
                    ) : files.map((file) => {
                      const isFileExpanded = expandedFiles[file.id] ?? true;
                      const isFileActive = selection.view === 'file' && selection.id === file.id;
                      const pages = file.pages || [];

                      return (
                        <li key={file.id} role="treeitem" aria-expanded={isFileExpanded} aria-selected={isFileActive}>
                          <div
                            className={cx(
                              'group flex h-8 items-center gap-1 rounded-xl pr-1 transition-colors',
                              isFileActive ? 'bg-rp-brand-tint text-rp-brand-strong' : 'text-rp-text-2 hover:bg-rp-bg-2 hover:text-rp-text',
                            )}
                          >
                            <ExpandToggle
                              expanded={isFileExpanded}
                              label={isFileExpanded ? trf('Thu gọn tệp {0}', { 0: file.name }) : trf('Mở tệp {0}', { 0: file.name })}
                              onClick={() => onToggleFileExpand(file.id)}
                            />

                            <button
                              type="button"
                              title={file.name}
                              onClick={() => onSelectView('file', file.id)}
                              className="rp-focus flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-lg text-left text-[12.5px] font-medium"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
                              <span className="truncate">{file.name}</span>
                            </button>

                            <RowMenu label={trf('Tùy chọn tệp {0}', { 0: file.name })}>
                              {(close) => (
                                <>
                                  <MenuActionButton
                                    icon={Plus}
                                    label={tr('Tạo trang mới')}
                                    onClick={() => {
                                      close();
                                      onRequestCreate({ kind: 'page', folderId: folder.id, fileId: file.id });
                                    }}
                                  />
                                  <MenuActionButton
                                    icon={Pencil}
                                    label={tr('Đổi tên / Di chuyển')}
                                    onClick={() => {
                                      close();
                                      onRequestRenameOrMove({ kind: 'file', item: { ...file, folderId: folder.id } });
                                    }}
                                  />
                                  <MenuActionButton
                                    icon={Trash2}
                                    danger
                                    label={tr('Xóa tệp')}
                                    onClick={() => {
                                      close();
                                      onRequestDelete({ kind: 'file', item: { ...file, folderId: folder.id } });
                                    }}
                                  />
                                </>
                              )}
                            </RowMenu>
                          </div>

                          {/* Pages inside File */}
                          <Collapsible open={isFileExpanded}>
                            <ul role="group" className="ml-2.5 mt-0.5 space-y-0.5 border-l border-rp-line/70 pl-2">
                              {pages.length === 0 ? (
                                <li>
                                  <button
                                    type="button"
                                    onClick={() => onRequestCreate({ kind: 'page', folderId: folder.id, fileId: file.id })}
                                    className="rp-focus flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-left text-[11.5px] text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-brand-strong"
                                  >
                                    <Plus className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{tr('Thêm trang')}</span>
                                  </button>
                                </li>
                              ) : pages.map((page) => {
                                const isPageActive = selection.view === 'page' && selection.id === page.id;
                                const pageItem = { ...page, fileId: file.id, folderId: folder.id };
                                return (
                                  <li key={page.id} role="treeitem" aria-selected={isPageActive}>
                                    <div
                                      className={cx(
                                        'group flex h-8 items-center gap-1 rounded-xl pr-1 transition-colors',
                                        isPageActive
                                          ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong shadow-[inset_2px_0_0_0_#CC4B6B]'
                                          : 'text-rp-text-2 hover:bg-rp-bg-2 hover:text-rp-text',
                                      )}
                                    >
                                      <button
                                        type="button"
                                        title={page.title}
                                        aria-current={isPageActive ? 'page' : undefined}
                                        onClick={() => onSelectView('page', page.id)}
                                        className="rp-focus flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-lg pl-2 text-left text-[12.5px]"
                                      >
                                        <FilePenLine className={cx('h-3.5 w-3.5 shrink-0', isPageActive ? 'text-rp-brand-pressed' : 'text-rp-text-muted')} />
                                        <span className="rp-jp min-w-0 flex-1 truncate">{page.title}</span>
                                        {page.isFavorite && (
                                          <Star aria-label={tr('Trang yêu thích')} className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
                                        )}
                                      </button>

                                      <RowMenu label={trf('Tùy chọn trang {0}', { 0: page.title })}>
                                        {(close) => (
                                          <>
                                            <MenuActionButton
                                              icon={Pencil}
                                              label={tr('Đổi tên')}
                                              onClick={() => {
                                                close();
                                                onRequestRenameOrMove({ kind: 'page', item: pageItem, renameOnly: true });
                                              }}
                                            />
                                            <MenuActionButton
                                              icon={Trash2}
                                              danger
                                              label={tr('Xóa trang')}
                                              onClick={() => {
                                                close();
                                                onRequestDelete({ kind: 'page', item: pageItem });
                                              }}
                                            />
                                          </>
                                        )}
                                      </RowMenu>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </Collapsible>
                        </li>
                      );
                    })}
                  </ul>
                </Collapsible>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SmartViewButton({ active, icon, label, count, tone, onClick }) {
  void tone;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'rp-focus flex h-9 w-full items-center justify-between gap-2 rounded-xl px-2.5 text-[13px] font-medium transition-colors',
        active ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong' : 'text-rp-text hover:bg-rp-bg-2',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <CountBadge count={count} size="sm" showZero max={999} />
    </button>
  );
}

function ExpandToggle({ expanded, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      className="rp-focus inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-lg text-rp-text-muted hover:text-rp-text"
    >
      <ChevronRight
        aria-hidden="true"
        className={cx(
          'h-3.5 w-3.5 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          expanded && 'rotate-90',
        )}
      />
    </button>
  );
}

/** Row "⋯" menu built on the shared portal Popover (never clipped by the scrolling sidebar). */
function RowMenu({ label, children }) {
  return (
    <div className={ROW_ACTIONS_CLASS}>
      <Popover
        align="end"
        label={label}
        trigger={(
          <IconButton
            size="sm"
            icon={Ellipsis}
            label={label}
          />
        )}
      >
        {({ close }) => (
          <div className="min-w-[176px] space-y-0.5 p-1">
            {children(close)}
          </div>
        )}
      </Popover>
    </div>
  );
}

function MenuActionButton({ icon: Icon, label, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rp-focus flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors',
        danger
          ? 'text-rp-danger hover:bg-rp-danger-bg'
          : 'text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong',
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
