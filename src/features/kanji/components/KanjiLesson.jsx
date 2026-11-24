import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, PenTool } from 'lucide-react';
import KanjiDetailStudio from './KanjiDetailStudio.jsx';
import KanjiRecognitionPad from './KanjiRecognitionPad.jsx';
import { useKanjiLibrary } from '@/features/kanji/hooks/useKanjiLibrary.js';
import { filterKanjiCatalog, matchRecognizedKanji } from '@/features/kanji/utils/kanjiLibrary.js';
import {
  Badge,
  Button,
  ContextualErrorState,
  Drawer,
  EmptyState,
  Modal,
  PageContainer,
  Pagination,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  SegmentedControl,
  Tabs,
  cx,
} from '@/components/ui';
import { ControlGroup, filterSupportedJlptLevels, IllustratedPageHeader } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';

const PAGE_SIZE = 48;

function useIsDesktop(query = '(min-width: 1024px)') {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export default function KanjiLesson({ library: libraryProp }) {
  const { tr, trf } = useLocale();
  const fallbackLibrary = useKanjiLibrary({ enabled: !libraryProp });
  const library = libraryProp || fallbackLibrary;
  const {
    items,
    summary,
    signedIn,
    loading,
    fetching,
    error,
    submitting,
    lastResult,
    saveError,
    submitResult,
    clearFeedback,
    reload,
  } = library;

  const isDesktop = useIsDesktop('(min-width: 1024px)');
  const [keyword, setKeyword] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(0);
  const [studioTab, setStudioTab] = useState('learn');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [lookupPadOpen, setLookupPadOpen] = useState(false);
  const [recognizedCandidates, setRecognizedCandidates] = useState(null);

  const filteredItems = useMemo(
    () => filterKanjiCatalog(items, { keyword, level: levelFilter, status: statusFilter }),
    [items, keyword, levelFilter, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage]);

  const activeItem = useMemo(() => {
    if (!filteredItems.length) return null;
    return (
      filteredItems.find((row) => row.kanjiId === selectedId) ||
      pagedItems[0] ||
      filteredItems[0]
    );
  }, [filteredItems, pagedItems, selectedId]);

  const activeIndex = activeItem
    ? filteredItems.findIndex((row) => row.kanjiId === activeItem.kanjiId)
    : -1;

  const matchedRecognized = useMemo(
    () => (Array.isArray(recognizedCandidates) ? matchRecognizedKanji(items, recognizedCandidates) : []),
    [items, recognizedCandidates],
  );

  const hasFilters = Boolean(keyword.trim()) || levelFilter !== 'ALL' || statusFilter !== 'all';

  const jlptTabs = useMemo(
    () => [
      { value: 'ALL', label: 'Tất cả' },
      ...filterSupportedJlptLevels(summary.levels).map((lvl) => ({
        value: lvl.code,
        label: lvl.code,
      })),
    ],
    [summary.levels],
  );

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả' },
      { value: 'practiced', label: 'Đã luyện' },
      ...(summary.dueCount > 0 ? [{ value: 'due', label: 'Cần ôn viết' }] : []),
    ],
    [summary.dueCount],
  );

  const resetFilters = () => {
    setKeyword('');
    setLevelFilter('ALL');
    setStatusFilter('all');
    setPage(1);
  };

  const selectKanji = (row, { openMobileDrawer = true, tab } = {}) => {
    if (!row) return;
    setSelectedId(row.kanjiId);
    if (tab) setStudioTab(tab);
    clearFeedback?.();
    const targetIdx = filteredItems.findIndex((entry) => entry.kanjiId === row.kanjiId);
    if (targetIdx >= 0) {
      setPage(Math.floor(targetIdx / PAGE_SIZE) + 1);
    }
    if (openMobileDrawer && !isDesktop) {
      setMobileDrawerOpen(true);
    }
  };

  const selectByOffset = (delta) => {
    if (activeIndex < 0) return;
    const next = filteredItems[activeIndex + delta];
    if (next) selectKanji(next, { openMobileDrawer: false });
  };

  const pickFromRecognition = (row) => {
    resetFilters();
    setSelectedId(row.kanjiId);
    setLookupPadOpen(false);
    setRecognizedCandidates(null);
    clearFeedback?.();
    if (!isDesktop) {
      setMobileDrawerOpen(true);
    }
  };

  const splitDesktop = isDesktop && Boolean(activeItem) && filteredItems.length > 0;

  return (
    <PageContainer width="default" density="comfortable" className="pb-20 text-rp-text">
      <IllustratedPageHeader
        icon="kanji"
        tone="lavender"
        compact
        className="mb-4"
        eyebrow={tr('Thư viện tiếng Nhật')}
        title={tr('Hán tự Kanji')}
        description={tr('Tra cứu nghĩa, âm On/Kun, thứ tự nét, từ ví dụ và luyện viết Hán tự JLPT N5–N2.')}
        actions={
          !loading && items.length > 0 ? (
            <ControlGroup>
              <Tabs
                variant="pill"
                size="md"
                label={tr('Lọc cấp độ JLPT')}
                value={levelFilter}
                onChange={(val) => {
                  setLevelFilter(val);
                  setPage(1);
                }}
                tabs={jlptTabs}
              />
              <SegmentedControl
                size="md"
                label={tr('Trạng thái luyện tập')}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                options={statusOptions}
              />
            </ControlGroup>
          ) : null
        }
      />

      {loading && !items.length && (
        <div className="flex min-h-[42vh] items-center justify-center">
          <SakuraLoader variant="section" context="writing" label={tr('Đang tải thư viện Kanji…')} delay={160} />
        </div>
      )}

      {!loading && error && !items.length && (
        <div className="mx-auto max-w-xl py-8">
          <ContextualErrorState
            error={error}
            title={tr('Chưa tải được thư viện Kanji')}
            onRetry={reload}
            retrying={fetching}
          />
        </div>
      )}

      {!loading && !error && !items.length && (
        <EmptyState
          variant="card"
          illustration="kanji"
          className="mx-auto w-full max-w-xl"
          title={tr('Thư viện Kanji hiện chưa có dữ liệu')}
          description={tr('Nội dung Hán tự N5–N2 sẽ hiển thị tại đây ngay khi được xuất bản.')}
        />
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {/* Compact Search, Stroke Lookup & Status Count Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[min(100%,240px)] flex-1 flex-wrap items-center gap-2.5">
              <SearchInput
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                onClear={() => {
                  setKeyword('');
                  setPage(1);
                }}
                placeholder="Tìm Kanji, Hán Việt, nghĩa…"
                aria-label={tr('Tìm kiếm chữ Kanji')}
                className="min-w-[200px] max-w-[300px] flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={PenTool}
                onClick={() => {
                  setRecognizedCandidates(null);
                  setLookupPadOpen(true);
                }}
              >
                {tr('Tìm bằng nét vẽ')}
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="md" onClick={resetFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-rp-text-muted">
              <span>
                {trf('Hiển thị {0} / {1} chữ Kanji', { 0: filteredItems.length, 1: summary.total })}
                {' · '}
                {trf('Đã luyện {0}/{1}', { 0: summary.practiced, 1: summary.total })}
              </span>
              <RefreshingIndicator active={fetching && !loading} delay={60} />
            </div>
          </div>

          {/* Main library + detail/writing workspace */}
          {filteredItems.length === 0 ? (
            <div className="flex justify-center py-6">
              <EmptyState
                variant="card"
                illustration="search"
                className="mx-auto w-full max-w-xl"
                title={
                  levelFilter !== 'ALL' && !keyword.trim() && statusFilter === 'all'
                    ? trf('Chưa có chữ Kanji {0} trong thư viện', { 0: levelFilter })
                    : tr('Không tìm thấy chữ Kanji phù hợp.')
                }
                description={tr('Hãy thử từ khóa khác hoặc chuyển về Tất cả để duyệt toàn bộ thư viện.')}
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="soft" size="sm" onClick={resetFilters}>
                      {tr('Xem tất cả Kanji')}
                    </Button>
                    {statusFilter === 'due' && (
                      <Button as={Link} to="/daily-srs/" variant="secondary" size="sm">
                        {tr('Ôn tập SRS')}
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          ) : (
            <div
              className={cx(
                'grid gap-6',
                splitDesktop
                  ? 'lg:grid-cols-[minmax(0,1.28fr)_minmax(390px,490px)] xl:grid-cols-[minmax(0,1.4fr)_minmax(420px,510px)] lg:items-start'
                  : 'grid-cols-1',
              )}
            >
              {/* Visual Kanji grid */}
              <div className="min-w-0 space-y-4">
                <div style={{ '--rp-grid-min': '8.25rem' }} className="rp-fluid-grid-fill">
                  {pagedItems.map((row) => {
                    const selected = activeItem?.kanjiId === row.kanjiId;
                    const primaryLevel = row.jlptLevels[0];
                    return (
                      <button
                        key={row.kanjiId}
                        type="button"
                        onClick={() => selectKanji(row)}
                        aria-pressed={selected}
                        className={cx(
                          'rp-focus group flex flex-col justify-between rounded-rp-card border p-3 text-left transition-all',
                          selected
                            ? 'border-rp-brand-strong bg-rp-brand-tint/55 ring-2 ring-rp-brand/25 shadow-rp-xs'
                            : row.mastered
                              ? 'border-rp-success-line bg-rp-success-bg/50 hover:border-rp-brand-border'
                              : 'border-rp-line bg-rp-surface hover:border-rp-brand-border hover:bg-rp-row-hover',
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          {primaryLevel ? (
                            <Badge tone={selected ? 'brand' : 'neutral'} icon={false} size="sm">
                              {primaryLevel}
                            </Badge>
                          ) : (
                            <span />
                          )}
                          {row.mastered ? (
                            <CheckCircle2
                              aria-label={tr('Đã thành thạo')}
                              className="h-4 w-4 shrink-0 text-rp-success"
                            />
                          ) : row.writingScore != null ? (
                            <span className="text-[11px] font-semibold tabular-nums text-rp-brand-strong">
                              {row.writingScore}%
                            </span>
                          ) : row.isDueForWriting ? (
                            <span className="h-2 w-2 rounded-full bg-rp-warning" title={tr('Cần ôn viết')} />
                          ) : null}
                        </div>

                        <div className="my-2.5 text-center">
                          <span lang="ja" className="rp-kanji block text-[36px] font-medium leading-none text-rp-text">
                            {row.character}
                          </span>
                        </div>

                        <div className="min-w-0 space-y-0.5 text-center">
                          {row.sinoVietnamese && (
                            <p className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-rp-brand-strong">
                              {row.sinoVietnamese}
                            </p>
                          )}
                          <p className="truncate text-xs text-rp-text-2">
                            {row.meaning || row.onYomi || row.kunYomi || tr('Hán tự')}
                          </p>
                          <p className="text-[11px] text-rp-text-muted">
                            {row.strokeCount ? `${row.strokeCount} ${tr('nét')}` : '—'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    pageSize={PAGE_SIZE}
                    totalItems={filteredItems.length}
                    showPageSize={false}
                    itemLabel="chữ"
                    onPageChange={setPage}
                    className="rounded-rp-card border border-rp-line shadow-rp-xs"
                  />
                )}
              </div>

              {/* Sticky Desktop Kanji Detail & Practice Studio */}
              {splitDesktop && activeItem && (
                <aside className="min-w-0 lg:sticky lg:top-[calc(var(--rp-sticky-top-offset)+1rem)]">
                  <KanjiDetailStudio
                    key={activeItem.kanjiId}
                    item={activeItem}
                    libraryItems={items}
                    tab={studioTab}
                    onTabChange={setStudioTab}
                    signedIn={signedIn}
                    onSubmitWriting={submitResult}
                    submittingWriting={submitting}
                    lastResult={lastResult}
                    saveError={saveError}
                    hasPrev={activeIndex > 0}
                    hasNext={activeIndex >= 0 && activeIndex < filteredItems.length - 1}
                    onPrev={() => selectByOffset(-1)}
                    onNext={() => selectByOffset(1)}
                  />
                </aside>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile & Tablet Detail Drawer */}
      <Drawer
        open={Boolean(mobileDrawerOpen && !isDesktop && activeItem)}
        onClose={() => setMobileDrawerOpen(false)}
        size="lg"
        title="Chi tiết Hán tự"
      >
        {activeItem && !isDesktop && (
          <KanjiDetailStudio
            key={`drawer-${activeItem.kanjiId}`}
            item={activeItem}
            libraryItems={items}
            tab={studioTab}
            onTabChange={setStudioTab}
            signedIn={signedIn}
            onSubmitWriting={submitResult}
            submittingWriting={submitting}
            lastResult={lastResult}
            saveError={saveError}
            hasPrev={activeIndex > 0}
            hasNext={activeIndex >= 0 && activeIndex < filteredItems.length - 1}
            onPrev={() => selectByOffset(-1)}
            onNext={() => selectByOffset(1)}
            inDrawer
          />
        )}
      </Drawer>

      {/* Handwriting Recognition Lookup Modal */}
      <Modal
        open={lookupPadOpen}
        onClose={() => {
          setLookupPadOpen(false);
          setRecognizedCandidates(null);
        }}
        title="Tìm Kanji bằng nét vẽ"
        description="Vẽ chữ Hán tự bạn muốn tra cứu, sau đó chọn chữ gợi ý khớp trong thư viện."
        size="md"
      >
        <KanjiRecognitionPad onCandidates={setRecognizedCandidates} />
        {recognizedCandidates !== null && (
          <div className="mt-4 border-t border-rp-line pt-3">
            {matchedRecognized.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rp-text-muted">
                  {tr('Chữ khớp trong thư viện')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {matchedRecognized.map((row) => (
                    <button
                      key={row.kanjiId}
                      type="button"
                      onClick={() => pickFromRecognition(row)}
                      className="rp-focus flex items-center gap-2.5 rounded-rp-input border border-rp-line bg-rp-surface px-3 py-2 text-left hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
                    >
                      <span lang="ja" className="rp-kanji text-2xl leading-none text-rp-text">
                        {row.character}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-rp-brand-strong">
                          {row.sinoVietnamese || row.character}
                        </span>
                        <span className="block max-w-[160px] truncate text-xs text-rp-text-2">
                          {row.meaning}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-rp-text-2">
                {recognizedCandidates.length > 0
                  ? trf('Hệ thống nhận dạng được: {0}, nhưng chưa có chữ này trong thư viện hiện tại.', {
                      0: recognizedCandidates.join(', '),
                    })
                  : tr('Chưa nhận dạng được chữ nào. Hãy thử vẽ rõ nét hơn.')}
              </p>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
