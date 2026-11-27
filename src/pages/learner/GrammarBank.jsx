import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Info } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageContainer,
  Pagination,
  SakuraLoader,
  SearchInput,
  Skeleton,
  cx,
  notify,
} from '@/components/ui';
import { IllustratedPageHeader, LevelTabs, SUPPORTED_JLPT_LEVELS } from '@/features/learner-ui';
import { LearnerShell } from '@/layouts';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import { addNotebookEntry, createNotebookList, getNotebookLists } from '@/features/notebook/api/notebookApi.js';
import { getGrammar, searchGrammar } from '@/features/content-author/api/sharedBankApi.js';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';
import {
  findGrammarByPattern,
  matchesGrammar,
  pageOfItem,
  parseStructure,
  searchKey,
  parseUsage,
  splitGrammarTitle,
  structureTokens,
} from '@/features/grammar-bank/grammarDisplay.js';

const LEVEL_VALUES = new Set(['ALL', ...SUPPORTED_JLPT_LEVELS]);
// List rows are ~76px; the page size follows the viewport so the list + its pager fit without an inner scroll.
const ROW_HEIGHT = 76;
const LIST_CHROME = 330; // topbar + header + pager + gaps
const MIN_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 14;

function computePageSize() {
  if (typeof window === 'undefined') return 10;
  if (!window.matchMedia?.('(min-width: 1024px)').matches) return 8; // one column: the detail follows the list
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor((window.innerHeight - LIST_CHROME) / ROW_HEIGHT)));
}

function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** One formula line with Japanese tokens highlighted and "+" separators de-emphasised. */
function Formula({ text }) {
  return (
    <span lang="ja" className="rp-jp flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {structureTokens(text).map((token, index) => (
        token.sep
          ? <span key={index} aria-hidden="true" className="text-rp-text-muted">+</span>
          : <span key={index} className={token.jp ? 'font-semibold text-rp-brand-strong' : 'font-medium text-rp-text-2'}>{token.text}</span>
      ))}
    </span>
  );
}

const GRAMMAR_NOTEBOOK_NAME = 'Ngữ pháp';

function clip(text, max) {
  const value = String(text || '').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/**
 * "Lưu vào sổ" = a Grammar entry in the learner's Sổ tay (notebook file "Ngữ pháp", created on first save).
 * It does NOT create an SRS card. The backend links the entry to the published pattern (GrammarPatternId,
 * ItemKind "grammar") and returns the existing entry instead of a duplicate.
 */
async function saveGrammarToNotebook(pattern, heading, usage) {
  const lists = await getNotebookLists();
  const key = searchKey(GRAMMAR_NOTEBOOK_NAME);
  const list = lists.find((item) => searchKey(item.name || item.title) === key)
    ?? await createNotebookList({ name: GRAMMAR_NOTEBOOK_NAME });
  const meaning = [heading.name, ...usage.paragraphs].filter(Boolean).join(' — ') || heading.pattern;
  return addNotebookEntry({
    learnerNoteId: list.id,
    word: clip(heading.pattern, 200),
    meaning: clip(meaning, 500),
    note: clip(pattern.structure, 2000) || undefined,
    itemKind: 'grammar',
    grammarPatternId: pattern.id,
    exampleSentence: clip(pattern.exampleSentence, 500) || undefined,
    exampleMeaning: clip(pattern.exampleSentenceMeaning, 500) || undefined,
    sourceType: 'GrammarBank',
    sourceId: pattern.id,
    sourcePath: `/grammar/?id=${pattern.id}`,
    sourceTitle: clip(heading.pattern, 200),
  });
}

function SectionTitle({ id, children }) {
  return <h3 id={id} className="text-[13px] font-bold text-rp-text">{children}</h3>;
}

/** Two-line list row: Japanese pattern (line 1) · Vietnamese name or meaning (line 2) · JLPT badge. */
function GrammarListItem({ item, active, onSelect, tr }) {
  const { pattern, name } = splitGrammarTitle(item.title, item.structure);
  const meaning = name || item.explanation || '';
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(item.id)}
        className={cx(
          'rp-focus group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 motion-reduce:transition-none',
          active ? 'bg-rp-brand-tint/80' : 'hover:bg-rp-brand-tint/40',
        )}
      >
        {/* Selected indicator: shape + colour, not colour alone */}
        <span
          aria-hidden="true"
          className={cx('absolute inset-y-2 left-0 w-[3px] rounded-full transition-opacity', active ? 'bg-rp-brand opacity-100' : 'opacity-0')}
        />
        <span className="min-w-0 flex-1">
          <span lang="ja" className="rp-jp block text-[15px] font-semibold leading-6 text-rp-brand-strong [overflow-wrap:anywhere]">
            {pattern}
          </span>
          {meaning && (
            <span className="mt-1 line-clamp-2 block text-[13px] leading-5 text-rp-text-2" title={meaning}>
              <span className="font-medium text-rp-text">{tr('Nghĩa')}:</span> {meaning}
            </span>
          )}
        </span>
        {item.jlptLevelName && (
          <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full border border-rp-brand-border/70 bg-rp-surface px-2 text-[11px] font-bold text-rp-brand-strong">
            {item.jlptLevelName}
          </span>
        )}
      </button>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul aria-hidden="true" className="divide-y divide-rp-line/70">
      {Array.from({ length: 7 }, (_, i) => (
        <li key={i} className="space-y-2 px-4 py-3.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-5/6" />
        </li>
      ))}
    </ul>
  );
}

export default function GrammarBank() {
  const { tr, trf } = useLocale();
  const signedIn = Boolean(getSession()?.accessToken);
  const [params, setParams] = useSearchParams();
  // Shareable state lives in the URL (?q=&level=&page=&id=); local state mirrors it for typing.
  const [keyword, setKeyword] = useState(() => params.get('q') || '');
  const [submitted, setSubmitted] = useState(() => (params.get('q') || '').trim());
  const [levelFilter, setLevelFilter] = useState(() => {
    const level = (params.get('level') || 'ALL').toUpperCase();
    return LEVEL_VALUES.has(level) ? level : 'ALL';
  });
  const [page, setPage] = useState(() => positiveInt(params.get('page')) || 1);
  const [selectedId, setSelectedId] = useState(() => positiveInt(params.get('id')));
  const [pageSize, setPageSize] = useState(computePageSize);
  const detailScrollRef = useRef(null);
  const listCardRef = useRef(null);

  // The whole published bank is small (one request per 100 rows), so search runs client-side: accent- and
  // width-insensitive ("nho co" finds "Nhờ có"), across title, structure, usage, example and translation.
  const searchQuery = useQuery({
    queryKey: ['grammar-search', ''],
    queryFn: () => searchGrammar(''),
  });

  const allItems = useMemo(() => searchQuery.data?.items || [], [searchQuery.data]);
  const rawItems = useMemo(() => allItems.filter((item) => matchesGrammar(item, submitted)), [allItems, submitted]);
  const items = useMemo(() => (levelFilter === 'ALL'
    ? rawItems
    : rawItems.filter((item) => String(item.jlptLevelName || '').toUpperCase().includes(levelFilter))), [rawItems, levelFilter]);

  // A deep link (?id=) opens on the page that holds that entry.
  const [deepLinkResolved, setDeepLinkResolved] = useState(() => !positiveInt(params.get('id')));
  if (!deepLinkResolved && searchQuery.isSuccess) {
    setDeepLinkResolved(true);
    const linkedPage = pageOfItem(items, selectedId, pageSize);
    if (linkedPage) setPage(linkedPage);
  }

  // Pagination comes from the real (filtered) result count; the page is clamped so it can never be empty.
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeId = pageItems.some((item) => item.id === selectedId) ? selectedId : (pageItems[0]?.id ?? 0);

  // Re-fit the page size on resize, keeping the open entry on screen.
  const activeRef = useRef({ items, activeId, pageSize });
  useEffect(() => {
    activeRef.current = { items, activeId, pageSize };
  });
  useEffect(() => {
    let frame = 0;
    function onResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = computePageSize();
        const { items: list, activeId: id, pageSize: current } = activeRef.current;
        if (current === next) return;
        setPageSize(next);
        setPage(pageOfItem(list, id, next) ?? 1);
        if (id) setSelectedId(id);
      });
    }
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Mirror the view into the URL (replace: no history entry per click).
  useEffect(() => {
    if (!searchQuery.isSuccess) return;
    const next = new URLSearchParams();
    if (submitted) next.set('q', submitted);
    if (levelFilter !== 'ALL') next.set('level', levelFilter);
    if (safePage > 1) next.set('page', String(safePage));
    if (activeId) next.set('id', String(activeId));
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [searchQuery.isSuccess, submitted, levelFilter, safePage, activeId, params, setParams]);

  const detailQuery = useQuery({
    queryKey: ['grammar', activeId],
    queryFn: () => getGrammar(activeId),
    enabled: activeId > 0,
  });

  const pattern = detailQuery.data;
  const heading = pattern ? splitGrammarTitle(pattern.title, pattern.structure) : null;

  const usage = useMemo(() => parseUsage(pattern?.explanation), [pattern?.explanation]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [savedIds, setSavedIds] = useState(() => new Set());
  const save = useMutation({
    mutationFn: () => saveGrammarToNotebook(pattern, heading, usage),
    onSuccess: (res) => {
      setSavedIds((prev) => new Set(prev).add(pattern.id));
      const openNotebook = { label: tr('Mở sổ tay'), onClick: () => navigate('/kanji-notebook/') };
      if (res?.isAlreadyExisting) {
        notify.info(tr('Mẫu ngữ pháp đã có trong Sổ tay.'), '', { key: 'grammar-bm-dup', action: openNotebook });
      } else {
        notify.success(tr('Đã lưu vào Sổ tay.'), '', { key: 'grammar-bm-ok', action: openNotebook });
      }
      queryClient.invalidateQueries({ queryKey: ['notebook-lists'] });
      queryClient.invalidateQueries({ queryKey: ['notebook-tree'] });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được')),
  });
  const savedHere = pattern ? savedIds.has(pattern.id) : false;
  const structureRows = useMemo(() => parseStructure(pattern?.structure), [pattern?.structure]);
  // "Dễ nhầm" entries link only to real published patterns in the bank; others stay plain text.
  const similar = useMemo(() => usage.confusions.map((entry) => ({
    ...entry,
    target: findGrammarByPattern(allItems, entry.pattern, pattern?.id),
  })), [usage.confusions, allItems, pattern?.id]);

  function levelItems(source, level) {
    return level === 'ALL'
      ? source
      : source.filter((item) => String(item.jlptLevelName || '').toUpperCase().includes(level));
  }

  /** Bring the detail panel's top into view when it is above or below the viewport (no inner scroll to reset). */
  function revealDetail() {
    requestAnimationFrame(() => {
      const node = detailScrollRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.6) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function runSearch(value) {
    const next = value.trim();
    setKeyword(next);
    setSubmitted(next);
    setPage(1);
    setSelectedId(0);
  }

  function changeLevel(value) {
    setLevelFilter(value);
    // Keep the selected pattern when it is still in the filtered results (and show its page); otherwise restart.
    const keptPage = activeId ? pageOfItem(levelItems(rawItems, value), activeId, pageSize) : null;
    setPage(keptPage ?? 1);
    setSelectedId(keptPage ? activeId : 0);
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setSelectedId(0);
    requestAnimationFrame(() => {
      const node = listCardRef.current;
      if (node && node.getBoundingClientRect().top < 0) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function selectItem(id) {
    setSelectedId(id);
    revealDetail();
  }

  /** Open a similar pattern; widen the search/level filter only when the target is hidden by it. */
  function openRelated(id) {
    let list = items;
    if (!list.some((item) => item.id === id)) {
      if (rawItems.some((item) => item.id === id)) {
        setLevelFilter('ALL');
        list = rawItems;
      } else {
        setKeyword('');
        setSubmitted('');
        setLevelFilter('ALL');
        list = allItems;
      }
    }
    setPage(pageOfItem(list, id, pageSize) ?? 1);
    setSelectedId(id);
    revealDetail();
  }

  const hasResults = searchQuery.isSuccess && items.length > 0;
  const hasAnyGrammar = searchQuery.isSuccess && allItems.length > 0;

  return (
    <LearnerShell breadcrumb={tr('Ngữ pháp')}>
      <PageContainer
        width="wide"
        density="comfortable"
        className="text-rp-text"
      >
        <IllustratedPageHeader
          icon="grammar"
          tone="peach"
          compact
          eyebrow={tr('Ngân hàng ngữ pháp')}
          title={tr('Tra mẫu ngữ pháp')}
          description={tr('Tìm cấu trúc JLPT N5–N2, xem cách dùng, ví dụ thực tế và lưu vào Sổ tay.')}
          className="lg:shrink-0"
        >
          {hasAnyGrammar && (
          <div className="flex flex-wrap items-center gap-3">
            <form
              role="search"
              className="flex min-w-[min(100%,280px)] flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                runSearch(keyword);
              }}
            >
              <div className="min-w-0 flex-1">
                <SearchInput
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onClear={() => runSearch('')}
                  placeholder={tr('Gõ mẫu câu hoặc nghĩa, ví dụ: ている, nhờ có…')}
                  aria-label={tr('Tìm mẫu ngữ pháp')}
                />
              </div>
              <Button type="submit" size="md" disabled={keyword.trim() === submitted}>{tr('Tìm')}</Button>
            </form>

            <LevelTabs
              includeAll
              allValue="ALL"
              allLabel={tr('Tất cả')}
              levels={SUPPORTED_JLPT_LEVELS}
              label={tr('Lọc cấp độ JLPT')}
              value={levelFilter}
              onChange={changeLevel}
            />
          </div>
          )}
        </IllustratedPageHeader>

        {searchQuery.isError && (
          <Card className="mt-5">
            <ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} retrying={searchQuery.isFetching} />
          </Card>
        )}

        {searchQuery.isSuccess && items.length === 0 && (
          <EmptyState
            variant={hasAnyGrammar ? 'search' : 'card'}
            illustration={hasAnyGrammar ? 'search' : 'book'}
            className="mx-auto mt-6 max-w-xl"
            title={hasAnyGrammar ? tr('Không tìm thấy kết quả phù hợp') : tr('Chưa có mẫu ngữ pháp')}
            description={hasAnyGrammar ? tr('Thử từ khóa khác hoặc bỏ lọc cấp độ JLPT.') : tr('Các mẫu ngữ pháp JLPT sẽ hiển thị tại đây khi được xuất bản.')}
            action={hasAnyGrammar ? (
              <Button variant="soft" size="sm" onClick={() => { changeLevel('ALL'); runSearch(''); }}>
                {tr('Xóa bộ lọc')}
              </Button>
            ) : undefined}
          />
        )}

        {(searchQuery.isPending || hasResults) && (
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[clamp(320px,30%,390px)_minmax(0,1fr)]">
            {/* ---------- Master: list + its own pagination footer ---------- */}
            <Card
              ref={listCardRef}
              as="section"
              padded={false}
              aria-label={tr('Danh sách mẫu ngữ pháp')}
              className="flex min-w-0 flex-col"
            >
              <div>
                {searchQuery.isPending ? (
                  <ListSkeleton />
                ) : (
                  <ul className="divide-y divide-rp-line/70">
                    {pageItems.map((item) => (
                      <GrammarListItem key={item.id} item={item} active={item.id === activeId} onSelect={selectItem} tr={tr} />
                    ))}
                  </ul>
                )}
              </div>
              {hasResults && (
                <div className="shrink-0 border-t border-rp-line bg-rp-surface px-3 pb-3.5 pt-3">
                  {totalPages > 1 ? (
                    <Pagination
                      currentPage={safePage}
                      totalPages={totalPages}
                      totalItems={items.length}
                      pageSize={pageSize}
                      showPageSize={false}
                      showPageJump={false}
                      showFirstLast={false}
                      onPageChange={changePage}
                      itemLabel={tr('mẫu ngữ pháp')}
                      className="flex-col! gap-2! border-t-0! bg-transparent! px-0! py-0! md:flex-col!"
                    />
                  ) : (
                    <p className="text-center text-xs font-medium tabular-nums text-rp-text-2">
                      {trf('{0} mẫu ngữ pháp', { 0: items.length })}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* ---------- Detail ---------- */}
            <Card
              as="article"
              padded={false}
              aria-labelledby={pattern ? 'grammar-title' : undefined}
              aria-busy={detailQuery.isFetching || undefined}
              className="min-w-0"
            >
              <div ref={detailScrollRef} className="scroll-mt-[calc(var(--spacing-rp-topbar)+12px)]">
                {(searchQuery.isPending || (activeId > 0 && detailQuery.isPending)) && (
                  <div className="p-6"><SakuraLoader variant="section" context="grammar" delay={160} /></div>
                )}
                {detailQuery.isError && (
                  <div className="p-6"><ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} retrying={detailQuery.isFetching} /></div>
                )}
                {pattern && heading && (
                  <div key={pattern.id} className="rp-anim-fade space-y-6 p-5 sm:p-6">
                    {/* A — Header */}
                    <header className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => listCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="rp-focus inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-rp-text-2 hover:bg-rp-muted lg:hidden"
                          >
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                            {tr('Danh sách')}
                          </button>
                          {pattern.jlptLevelName && <Badge tone="brand" size="sm" icon={false}>{formatJlptLevel(pattern.jlptLevelName)}</Badge>}
                        </div>
                        {signedIn ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {savedHere ? (
                              <Button as={Link} to="/kanji-notebook/" size="sm" variant="soft" icon={BookmarkCheck}>
                                {tr('Đã lưu · Mở sổ tay')}
                              </Button>
                            ) : (
                              <Button size="sm" variant="soft" icon={Bookmark} loading={save.isPending} onClick={() => save.mutate()}>
                                {tr('Lưu vào sổ')}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button as={Link} to="/auth/" size="sm" variant="secondary">
                            {tr('Đăng nhập để lưu')}
                          </Button>
                        )}
                      </div>
                      <div>
                        <h2 id="grammar-title" lang="ja" className="rp-jp text-[26px] font-bold leading-snug text-rp-text [overflow-wrap:anywhere] sm:text-[30px]">
                          {heading.pattern}
                        </h2>
                        {heading.name && <p className="mt-1 text-[15px] font-medium text-rp-text-2">{heading.name}</p>}
                      </div>
                    </header>

                    {!signedIn && (
                      <Banner tone="info">{tr('Đăng nhập để lưu mẫu ngữ pháp vào Sổ tay cá nhân.')}</Banner>
                    )}

                    {/* B — Formation: one row per word type / verb group ("Label: formula" lines). */}
                    {structureRows.length > 0 && (
                      <section aria-labelledby="grammar-structure">
                        <SectionTitle id="grammar-structure">{tr('Cách kết hợp')}</SectionTitle>
                        <dl className="mt-2 divide-y divide-rp-brand-border/40 overflow-hidden rounded-xl border border-rp-brand-border/50 bg-rp-brand-tint/35">
                          {structureRows.map((row, index) => (
                            <div key={index} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                              {row.label && (
                                <dt className="shrink-0 text-[12px] font-semibold text-rp-text-2 sm:w-[110px]">{row.label}</dt>
                              )}
                              <dd className="min-w-0 text-[16px] leading-7 [overflow-wrap:anywhere]">
                                <Formula text={row.formula} />
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    )}

                    {/* C — Meaning & usage (plain paragraphs of UsageNotes). */}
                    {usage.paragraphs.length > 0 && (
                      <section aria-labelledby="grammar-usage">
                        <SectionTitle id="grammar-usage">{tr('Ý nghĩa & cách sử dụng')}</SectionTitle>
                        <div className="mt-2 space-y-2 text-[15px] leading-7 text-rp-text">
                          {usage.paragraphs.map((paragraph, index) => (
                            <p key={index}>
                              <HighlightableText
                                text={paragraph}
                                contentId={`grammar-${pattern.id}-explanation-${index}`}
                                sourceTitle={heading.pattern}
                              />
                            </p>
                          ))}
                        </div>
                        {usage.notes.length > 0 && (
                          <ul className="mt-3 space-y-2 rounded-xl bg-rp-info-bg/60 px-4 py-3 text-[14px] leading-6 text-rp-text">
                            {usage.notes.map((note, index) => (
                              <li key={index} className="flex gap-2">
                                <Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-rp-info" />
                                <span><span className="font-semibold">{tr('Lưu ý')}:</span> {note}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    )}

                    {/* E — Example: Japanese first, then its published Vietnamese translation. */}
                    {pattern.exampleSentence && (
                      <section aria-labelledby="grammar-examples">
                        <h3 id="grammar-examples" className="text-[13px] font-bold text-rp-text">{tr('Ví dụ')}</h3>
                        <ol className="mt-2 space-y-3">
                          <li className="rounded-xl border-l-[3px] border-rp-brand bg-rp-bg-2/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">
                              {trf('Ví dụ {0}', { 0: '01' })}
                            </p>
                            <p lang="ja" className="rp-jp mt-1 text-[18px] font-medium leading-8 text-rp-text">
                              <HighlightableText
                                text={pattern.exampleSentence}
                                contentId={`grammar-${pattern.id}-example`}
                                sourceTitle={heading.pattern}
                              />
                            </p>
                            {pattern.exampleSentenceMeaning ? (
                              <p className="mt-2.5 border-t border-rp-line/70 pt-2.5 text-[14px] leading-6 text-rp-text-2">
                                <span className="font-semibold text-rp-text">{tr('Dịch nghĩa')}:</span> {pattern.exampleSentenceMeaning}
                              </p>
                            ) : (
                              <p className="mt-2.5 border-t border-rp-line/70 pt-2.5 text-[13px] italic text-rp-text-muted">
                                {tr('Ví dụ này chưa có bản dịch.')}
                              </p>
                            )}
                          </li>
                        </ol>
                      </section>
                    )}

                    {/* F — Common mistakes ("Sai:" / "Đúng:" pairs), only when the entry has them. */}
                    {usage.mistakes.length > 0 && (
                      <section aria-labelledby="grammar-mistakes">
                        <SectionTitle id="grammar-mistakes">{tr('Lỗi thường gặp')}</SectionTitle>
                        <ul className="mt-2 space-y-2">
                          {usage.mistakes.map((mistake, index) => (
                            <li key={index} className="rounded-xl border border-rp-line px-4 py-3 text-[14px] leading-6">
                              <p><span className="font-semibold text-rp-danger">{tr('Sai')}:</span> <span lang="ja" className="rp-jp">{mistake.wrong}</span></p>
                              {mistake.right && (
                                <p className="mt-1"><span className="font-semibold text-rp-success">{tr('Đúng')}:</span> <span lang="ja" className="rp-jp">{mistake.right}</span></p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* G — Similar grammar: links only to published entries that exist in the bank. */}
                    {similar.length > 0 && (
                      <section aria-labelledby="grammar-similar">
                        <SectionTitle id="grammar-similar">{tr('Ngữ pháp dễ nhầm lẫn')}</SectionTitle>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {similar.map((entry, index) => {
                            const body = (
                              <>
                                <span lang="ja" className="rp-jp block text-[15px] font-semibold text-rp-brand-strong">{entry.pattern}</span>
                                {entry.note && <span className="mt-0.5 block text-[13px] leading-5 text-rp-text-2">{entry.note}</span>}
                              </>
                            );
                            return (
                              <li key={index}>
                                {entry.target ? (
                                  <button
                                    type="button"
                                    onClick={() => openRelated(entry.target.id)}
                                    className="rp-focus group flex h-full w-full items-start justify-between gap-3 rounded-xl border border-rp-line bg-rp-surface px-4 py-3 text-left transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/40 motion-reduce:transition-none"
                                  >
                                    <span className="min-w-0">{body}</span>
                                    <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-rp-text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                                    <span className="sr-only">{tr('Xem mẫu ngữ pháp này')}</span>
                                  </button>
                                ) : (
                                  <div className="h-full rounded-xl border border-dashed border-rp-line px-4 py-3">{body}</div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
