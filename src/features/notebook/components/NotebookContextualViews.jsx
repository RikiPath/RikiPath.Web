import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  FilePenLine,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Pagination,
  SakuraLoader,
  SearchInput,
} from '@/components/ui';
import { getSavedNotebookItems, searchNotebook } from '@/features/notebook/api/notebookApi.js';
import { NOTEBOOK_CONTENT_KINDS, getEntryKindLabel, mapSavedItemDto } from '@/features/notebook/utils/notebookModel.js';
import { useDebouncedValue } from '@/components/ui/hooks.js';

export function FolderContextView({
  folder,
  onSelectFile,
  onCreateFile,
  onRenameFolder,
  onDeleteFolder,
  onRenameMoveFile,
  onDeleteFile,
}) {
  const { tr, trf, fmt } = useLocale();
  if (!folder) return null;
  const files = folder.files || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rp-brand-border bg-rp-brand-tint text-rp-brand-pressed">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Thư mục')}</p>
            <h2 className="truncate text-[20px] font-bold text-rp-text">{folder.name}</h2>
            <p className="text-[12.5px] text-rp-text-2">
              {trf('{0} tệp ghi chú · {1} trang · {2} mục đã lưu', {
                0: folder.fileCount ?? files.length,
                1: folder.pageCount ?? 0,
                2: folder.savedItemCount ?? 0,
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="md" icon={Pencil} onClick={() => onRenameFolder(folder)}>
            {tr('Đổi tên')}
          </Button>
          <Button type="button" variant="ghost" size="md" icon={Trash2} onClick={() => onDeleteFolder(folder)}>
            {tr('Xóa')}
          </Button>
          <Button type="button" variant="primary" size="md" icon={FilePlus2} onClick={() => onCreateFile(folder.id)}>
            {tr('Tạo tệp')}
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="rounded-2xl border border-rp-line bg-white p-6">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            illustration="flashcard"
            title={tr('Thư mục này chưa có tệp ghi chú')}
            description={tr('Mỗi tệp ghi chú chứa các trang học tập theo chủ đề hoặc giáo trình của bạn.')}
            action={(
              <Button type="button" variant="primary" size="md" icon={FilePlus2} onClick={() => onCreateFile(folder.id)}>
                {tr('Tạo tệp đầu tiên')}
              </Button>
            )}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="group flex flex-col justify-between gap-3 rounded-2xl border border-rp-line bg-white p-4 transition-colors hover:border-rp-brand-border hover:bg-rp-row-hover"
            >
              <button
                type="button"
                onClick={() => onSelectFile(file.id)}
                className="rp-focus text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4.5 w-4.5 shrink-0 text-rp-brand-pressed" />
                    <h3 className="truncate text-[15px] font-bold text-rp-text">{file.name}</h3>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-rp-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-rp-brand-strong" />
                </div>
                {file.description && (
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] text-rp-text-2">{file.description}</p>
                )}
              </button>

              <div className="flex items-center justify-between gap-2 border-t border-rp-line/70 pt-2.5 text-[12px] text-rp-text-muted">
                <span>
                  {trf('{0} trang · {1} mục', { 0: file.pageCount ?? (file.pages?.length || 0), 1: file.savedItemCount ?? 0 })}
                  {file.modifiedDate ? ` · ${fmt.date(file.modifiedDate)}` : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title={tr('Đổi tên / Di chuyển')}
                    aria-label={tr('Đổi tên / Di chuyển')}
                    onClick={() => onRenameMoveFile(file)}
                    className="rp-focus rounded-lg p-1 text-rp-text-muted hover:bg-white hover:text-rp-brand-strong"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={tr('Xóa tệp')}
                    aria-label={tr('Xóa tệp')}
                    onClick={() => onDeleteFile(file)}
                    className="rp-focus rounded-lg p-1 text-rp-text-muted hover:bg-rp-danger-bg hover:text-rp-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FileContextView({
  file,
  onSelectFolder,
  onSelectPage,
  onCreatePage,
  onRenameMoveFile,
  onDeleteFile,
  onToggleFavorite,
  onDeletePage,
}) {
  const { tr, trf, fmt } = useLocale();
  if (!file) return null;
  const pages = file.pages || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-rp-text-muted">
            <button
              type="button"
              onClick={() => file.folderId && onSelectFolder(file.folderId)}
              className="rp-focus inline-flex items-center gap-1 rounded hover:text-rp-brand-strong"
            >
              <Folder className="h-3.5 w-3.5" />
              <span>{file.folderName}</span>
            </button>
            <span>/</span>
            <span className="font-semibold text-rp-text-2">{tr('Tệp ghi chú')}</span>
          </div>
          <h2 className="truncate text-[20px] font-bold text-rp-text">{file.name}</h2>
          <p className="text-[12.5px] text-rp-text-2">
            {trf('{0} trang · {1} mục đã lưu', { 0: pages.length, 1: file.savedItemCount ?? 0 })}
            {file.modifiedDate ? ` · ${tr('Cập nhật')} ${fmt.relative(file.modifiedDate)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="md" icon={Pencil} onClick={() => onRenameMoveFile(file)}>
            {tr('Đổi tên / Di chuyển')}
          </Button>
          <Button type="button" variant="ghost" size="md" icon={Trash2} onClick={() => onDeleteFile(file)}>
            {tr('Xóa tệp')}
          </Button>
          <Button type="button" variant="primary" size="md" icon={Plus} onClick={() => onCreatePage(file.id)}>
            {tr('Tạo trang')}
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-rp-line bg-white p-6">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            illustration="flashcard"
            title={tr('Tệp ghi chú này chưa có trang nào')}
            description={tr('Hãy tạo trang đầu tiên để bắt đầu viết ghi chú và lưu từ vựng.')}
            action={(
              <Button type="button" variant="primary" size="md" icon={Plus} onClick={() => onCreatePage(file.id)}>
                {tr('Tạo trang đầu tiên')}
              </Button>
            )}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-4 transition-colors hover:border-rp-brand-border hover:bg-rp-row-hover"
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className="rp-focus min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <FilePenLine className="h-4 w-4 shrink-0 text-rp-brand-pressed" />
                  <h3 className="rp-jp truncate text-[15px] font-bold text-rp-text">{page.title}</h3>
                </div>
                <p className="rp-jp mt-1 line-clamp-1 text-[13px] text-rp-text-2">
                  {page.excerpt || tr('Trang trống — bấm để bắt đầu soạn thảo.')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-rp-text-muted">
                  <span>{trf('{0} mục đã lưu', { 0: page.savedItemCount ?? 0 })}</span>
                  {(page.checklistTotalCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rp-brand-tint px-2 py-0.5 font-semibold text-rp-brand-strong">
                      <CheckSquare className="h-3 w-3" />
                      {page.checklistCompletedCount}/{page.checklistTotalCount}
                    </span>
                  )}
                  {page.modifiedDate && <span>· {fmt.date(page.modifiedDate)}</span>}
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title={page.isFavorite ? tr('Bỏ yêu thích') : tr('Đánh dấu yêu thích')}
                  aria-label={page.isFavorite ? tr('Bỏ yêu thích') : tr('Đánh dấu yêu thích')}
                  onClick={() => onToggleFavorite(page.id, !page.isFavorite)}
                  className="rp-focus rounded-lg p-1.5 text-rp-text-muted hover:bg-white hover:text-amber-500"
                >
                  <Star className={`h-4 w-4 ${page.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  title={tr('Xóa trang')}
                  aria-label={tr('Xóa trang')}
                  onClick={() => onDeletePage(page)}
                  className="rp-focus rounded-lg p-1.5 text-rp-text-muted hover:bg-rp-danger-bg hover:text-rp-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FavoritePagesView({
  pages = [],
  isLoading,
  error,
  onRetry,
  onSelectPage,
  onToggleFavorite,
}) {
  const { tr, trf, fmt } = useLocale();

  if (isLoading) return <SakuraLoader variant="section" context="writing" />;
  if (error) {
    return (
      <ContextualErrorState
        error={error}
        title={tr('Chưa tải được danh sách trang yêu thích')}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rp-line bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
            <Star className="h-5 w-5 fill-amber-400" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-rp-text">{tr('Trang yêu thích')}</h2>
            <p className="text-[12.5px] text-rp-text-2">
              {tr('Các trang bạn đã gắn sao để truy cập nhanh. Mở trang gốc trực tiếp mà không tạo bản sao.')}
            </p>
          </div>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-rp-line bg-white p-6">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            illustration="flashcard"
            title={tr('Chưa có trang yêu thích nào')}
            description={tr('Nhấn biểu tượng ngôi sao ở đầu trang ghi chú để ghim trang quan trọng tại đây.')}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-4 transition-colors hover:border-rp-brand-border hover:bg-rp-row-hover"
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className="rp-focus min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-rp-text-muted">
                  <span>{page.folderName}</span>
                  <span>›</span>
                  <span>{page.fileName}</span>
                </div>
                <h3 className="rp-jp mt-0.5 truncate text-[15px] font-bold text-rp-text">{page.title}</h3>
                {page.excerpt && (
                  <p className="rp-jp mt-1 line-clamp-1 text-[13px] text-rp-text-2">{page.excerpt}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-rp-text-muted">
                  <span>{trf('{0} mục đã lưu', { 0: page.savedItemCount ?? 0 })}</span>
                  {page.modifiedDate && <span>· {fmt.relative(page.modifiedDate)}</span>}
                </div>
              </button>

              <button
                type="button"
                title={tr('Bỏ khỏi yêu thích')}
                aria-label={tr('Bỏ khỏi yêu thích')}
                onClick={() => onToggleFavorite(page.id, false)}
                className="rp-focus shrink-0 rounded-xl border border-amber-200 bg-amber-50/70 p-2 text-amber-600 hover:bg-amber-100"
              >
                <Star className="h-4 w-4 fill-amber-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AllSavedItemsView({
  uid,
  totalGlobalItems,
  onSelectItem,
  onSelectPage,
  onAddItem,
  onOpenLookup,
}) {
  const { tr, trf } = useLocale();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 250);
  const pageSize = 24;

  const savedQuery = useQuery({
    queryKey: ['notebook-saved-items', uid, 'smart-view', debouncedSearch, kind, sortBy, page],
    queryFn: () => getSavedNotebookItems({
      search: debouncedSearch || undefined,
      kind,
      sortBy,
      page,
      pageSize,
    }),
    staleTime: 20_000,
  });

  const items = (savedQuery.data?.items || []).map(mapSavedItemDto).filter(Boolean);
  const totalCount = savedQuery.data?.totalCount ?? 0;
  const totalPages = savedQuery.data?.totalPages ?? 1;
  const hasEntriesInScope = totalGlobalItems > 0 || totalCount > 0 || Boolean(debouncedSearch) || kind !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-5">
        <div>
          <h2 className="text-[18px] font-bold text-rp-text">{tr('Tất cả mục đã lưu')}</h2>
          <p className="text-[12.5px] text-rp-text-2">
            {tr('Chế độ xem tổng hợp các từ vựng, Hán tự, ngữ pháp và ghi chú từ mọi trang của bạn.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="md" icon={BookOpen} onClick={onOpenLookup}>
            {tr('Tra cứu từ vựng / Hán tự')}
          </Button>
          <Button type="button" variant="primary" size="md" icon={Plus} onClick={onAddItem}>
            {tr('Thêm mục')}
          </Button>
        </div>
      </div>

      {hasEntriesInScope && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-rp-line bg-white px-4 py-3">
          <div className="min-w-[200px] flex-1">
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(typeof e === 'string' ? e : (e?.target?.value ?? ''));
                setPage(1);
              }}
              onClear={() => {
                setSearch('');
                setPage(1);
              }}
              placeholder={tr('Tìm từ, cách đọc, nghĩa hoặc ghi chú…')}
            />
          </div>
          <CustomSelect
            fitContent
            size="sm"
            label="Phân loại"
            value={kind}
            onChange={(val) => {
              setKind(val);
              setPage(1);
            }}
            options={NOTEBOOK_CONTENT_KINDS.map((k) => ({ value: k.id, label: tr(k.label) }))}
          />
          <CustomSelect
            fitContent
            size="sm"
            label="Sắp xếp"
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
            options={[
              { value: 'recent', label: tr('Mới cập nhật') },
              { value: 'alpha', label: tr('Theo bảng chữ cái') },
              { value: 'srs', label: tr('Ưu tiên có thẻ SRS') },
            ]}
          />
        </div>
      )}

      {savedQuery.isPending ? (
        <SakuraLoader variant="section" context="writing" />
      ) : savedQuery.isError ? (
        <ContextualErrorState
          error={savedQuery.error}
          title={tr('Chưa tải được mục đã lưu')}
          onRetry={() => savedQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-rp-line bg-white p-6">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            illustration={debouncedSearch ? 'search' : 'flashcard'}
            title={debouncedSearch || kind !== 'all' ? tr('Không tìm thấy mục nào phù hợp') : tr('Chưa có mục đã lưu nào')}
            description={debouncedSearch || kind !== 'all'
              ? tr('Thử thay đổi từ khóa tìm kiếm hoặc chọn loại nội dung khác.')
              : tr('Thêm mục mới ngay trong trang ghi chú hoặc bôi đen văn bản khi đang học.')}
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                {(debouncedSearch || kind !== 'all') ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setKind('all');
                      setPage(1);
                    }}
                  >
                    {tr('Xóa bộ lọc')}
                  </Button>
                ) : (
                  <Button type="button" variant="primary" size="md" icon={Plus} onClick={onAddItem}>
                    {tr('Thêm mục đầu tiên')}
                  </Button>
                )}
              </div>
            )}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.noteEntryId}
                className="flex flex-col justify-between gap-2.5 rounded-2xl border border-rp-line bg-white p-4 transition-colors hover:border-rp-brand-border hover:bg-rp-row-hover"
              >
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="rp-focus text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="rp-jp text-[16px] font-bold text-rp-text">{item.term}</span>
                      {item.reading && (
                        <span className="rp-jp ml-2 text-[12.5px] font-medium text-rp-brand-strong">{item.reading}</span>
                      )}
                    </div>
                    <Badge tone="neutral" size="sm">{tr(getEntryKindLabel(item.kind))}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-rp-text-2">{item.meaning}</p>
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line/70 pt-2 text-[11.5px] text-rp-text-muted">
                  <button
                    type="button"
                    onClick={() => item.notebookPageId && onSelectPage(item.notebookPageId)}
                    className="rp-focus truncate hover:text-rp-brand-strong"
                  >
                    {trf('{0} › {1}', { 0: item.fileName || item.folderName, 1: item.notebookPageTitle || tr('Trang') })}
                  </button>
                  {item.hasSrs && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <Sparkles className="h-3 w-3" />
                      {tr('SRS')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

export function NotebookSearchView({
  uid,
  query,
  onClearSearch,
  onSelectFolder,
  onSelectFile,
  onSelectPage,
  onSelectItem,
}) {
  const { tr, trf } = useLocale();
  const cleanQuery = query.trim();

  const searchRes = useQuery({
    queryKey: ['notebook-search', uid, cleanQuery],
    queryFn: () => searchNotebook(cleanQuery, 20),
    enabled: cleanQuery.length > 0,
    staleTime: 15_000,
  });

  if (searchRes.isPending) return <SakuraLoader variant="section" context="writing" />;
  if (searchRes.isError) {
    return (
      <ContextualErrorState
        error={searchRes.error}
        title={tr('Không thể tìm kiếm lúc này')}
        onRetry={() => searchRes.refetch()}
      />
    );
  }

  const data = searchRes.data || {};
  const folders = data.folders || [];
  const files = data.files || [];
  const pages = data.pages || [];
  const items = (data.savedItems || []).map(mapSavedItemDto).filter(Boolean);
  const totalHits = folders.length + files.length + pages.length + items.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-white p-5">
        <div className="flex items-center gap-2.5">
          <Search className="h-5 w-5 text-rp-brand-strong" />
          <div>
            <h2 className="text-[17px] font-bold text-rp-text">
              {trf('Kết quả tìm kiếm cho “{0}”', { 0: cleanQuery })}
            </h2>
            <p className="text-[12.5px] text-rp-text-muted">{trf('{0} kết quả khớp', { 0: totalHits })}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onClearSearch}>
          {tr('Xóa tìm kiếm')}
        </Button>
      </div>

      {totalHits === 0 ? (
        <div className="rounded-2xl border border-rp-line bg-white p-6">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            illustration="search"
            title={tr('Không tìm thấy nội dung phù hợp')}
            description={tr('Thử từ khóa ngắn hơn hoặc tìm bằng tiếng Nhật / nghĩa tiếng Việt.')}
            action={(
              <Button type="button" variant="secondary" size="sm" onClick={onClearSearch}>
                {tr('Quay lại sổ tay')}
              </Button>
            )}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {pages.length > 0 && (
            <section className="rounded-2xl border border-rp-line bg-white p-4 space-y-2.5">
              <h3 className="text-[13px] font-bold text-rp-text-muted">{tr('Trang ghi chú')} ({pages.length})</h3>
              <div className="space-y-2">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPage(p.id);
                      onClearSearch();
                    }}
                    className="rp-focus flex w-full items-center justify-between gap-2 rounded-xl border border-rp-line px-3.5 py-2.5 text-left hover:border-rp-brand-border hover:bg-rp-row-hover"
                  >
                    <div className="min-w-0">
                      <p className="text-[11.5px] text-rp-text-muted">{p.folderName} › {p.fileName}</p>
                      <p className="rp-jp truncate text-[14.5px] font-bold text-rp-text">{p.title}</p>
                      {p.excerpt && <p className="rp-jp truncate text-[12.5px] text-rp-text-2">{p.excerpt}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-rp-text-muted" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section className="rounded-2xl border border-rp-line bg-white p-4 space-y-2.5">
              <h3 className="text-[13px] font-bold text-rp-text-muted">{tr('Mục đã lưu')} ({data.totalSavedItems ?? items.length})</h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {items.map((item) => (
                  <button
                    key={item.noteEntryId}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="rp-focus rounded-xl border border-rp-line p-3 text-left hover:border-rp-brand-border hover:bg-rp-row-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rp-jp truncate font-bold text-rp-text">{item.term}</span>
                      <Badge tone="neutral" size="sm">{tr(getEntryKindLabel(item.kind))}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[12.5px] text-rp-text-2">{item.meaning}</p>
                    <p className="mt-1 truncate text-[11px] text-rp-text-muted">
                      {item.folderName} › {item.fileName} › {item.notebookPageTitle}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(folders.length > 0 || files.length > 0) && (
            <section className="rounded-2xl border border-rp-line bg-white p-4 space-y-2.5">
              <h3 className="text-[13px] font-bold text-rp-text-muted">{tr('Thư mục & Tệp ghi chú')}</h3>
              <div className="flex flex-wrap gap-2">
                {folders.map((f) => (
                  <button
                    key={`f-${f.id}`}
                    type="button"
                    onClick={() => {
                      onSelectFolder(f.id);
                      onClearSearch();
                    }}
                    className="rp-focus inline-flex items-center gap-1.5 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-1.5 text-[13px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint"
                  >
                    <Folder className="h-3.5 w-3.5 text-rp-brand-pressed" />
                    <span>{f.name}</span>
                  </button>
                ))}
                {files.map((file) => (
                  <button
                    key={`fl-${file.id}`}
                    type="button"
                    onClick={() => {
                      onSelectFile(file.id);
                      onClearSearch();
                    }}
                    className="rp-focus inline-flex items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 py-1.5 text-[13px] font-medium text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint"
                  >
                    <FileText className="h-3.5 w-3.5 text-rp-text-muted" />
                    <span>{file.folderName} › {file.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
