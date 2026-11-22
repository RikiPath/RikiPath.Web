import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bookmark, Search } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FeatureIcon,
  PageContainer,
  SakuraLoader,
  SearchInput,
  Tabs,
  cx,
  notify,
} from '@/components/ui';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import { bookmarkGrammar } from '@/features/notebook/api/notebookApi.js';
import { getGrammar, searchGrammar } from '@/features/content-author/api/sharedBankApi.js';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';

const SAMPLES = ['ている', 'たら', 'ながら', 'ように'];
const JLPT_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

export default function GrammarBank() {
  const { tr } = useLocale();
  const signedIn = Boolean(getSession()?.accessToken);
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(0);

  const searchQuery = useQuery({
    queryKey: ['grammar-search', submitted],
    queryFn: () => searchGrammar(submitted),
    enabled: submitted.length > 0,
  });

  const items = useMemo(() => {
    const raw = searchQuery.data?.items || [];
    if (levelFilter === 'ALL') return raw;
    return raw.filter((item) => String(item.jlptLevelName || '').toUpperCase().includes(levelFilter));
  }, [searchQuery.data, levelFilter]);

  const activeId = items.some((item) => item.id === selectedId) ? selectedId : (items[0]?.id ?? 0);

  const detailQuery = useQuery({
    queryKey: ['grammar', activeId],
    queryFn: () => getGrammar(activeId),
    enabled: activeId > 0,
  });

  const save = useMutation({
    mutationFn: bookmarkGrammar,
    onSuccess: (res) => {
      if (res?.alreadyExists || res?.isExisting) notify.info(tr('Mẫu ngữ pháp đã có trong sổ tay'), '', { key: 'grammar-bm-dup' });
      else notify.success(tr('Đã lưu vào sổ tay'), tr('Mẫu ngữ pháp có trong Sổ tay của bạn.'), { key: 'grammar-bm-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được')),
  });

  const pattern = detailQuery.data;
  const queryError = searchQuery.error || detailQuery.error;

  function runSearch(value) {
    const next = value.trim();
    setKeyword(next);
    setSubmitted(next);
    setSelectedId(0);
  }

  return (
    <LearnerShell breadcrumb={tr('Ngữ pháp')}>
      <PageContainer width="default" density="comfortable" className="text-rp-text">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <FeatureIcon feature="grammar" size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tone-grammar">{tr('Ngân hàng ngữ pháp')}</p>
              <h1 className="rp-type-page-title text-rp-text">{tr('Tra mẫu ngữ pháp')}</h1>
            </div>
          </div>

          <form role="search" className="mt-5 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); runSearch(keyword); }}>
            <div className="min-w-[200px] flex-1">
              <SearchInput
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onClear={() => {
                  setKeyword('');
                  setSubmitted('');
                  setSelectedId(0);
                }}
                placeholder="Gõ mẫu câu hoặc nghĩa, ví dụ: ている…"
              />
            </div>
            <Button type="submit" disabled={!keyword.trim()}>{tr('Tìm')}</Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-rp-text-muted">{tr('Gợi ý')}:</span>
              {SAMPLES.map((sample) => (
                <Button key={sample} variant="soft" size="sm" onClick={() => runSearch(sample)} className="rp-jp">
                  {sample}
                </Button>
              ))}
            </div>
            <Tabs
              variant="pill"
              label={tr('Lọc cấp độ JLPT')}
              value={levelFilter}
              onChange={setLevelFilter}
              tabs={JLPT_FILTERS}
            />
          </div>
        </Card>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
          <Card padded={false} className="overflow-hidden" aria-label={tr('Kết quả tìm kiếm')}>
            {!submitted && <EmptyState compact icon={Search} title="Nhập một mẫu để bắt đầu" description="Tìm theo mẫu câu tiếng Nhật hoặc nghĩa tiếng Việt." />}
            {submitted && searchQuery.isPending && <SakuraLoader variant="section" context="grammar" className="min-h-[120px] py-4" delay={160} />}
            {searchQuery.isError && <ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} retrying={searchQuery.isFetching} compact />}
            {searchQuery.isSuccess && items.length === 0 && (
              <EmptyState compact art="search" title="Không có mẫu khớp" description="Thử từ khóa ngắn hơn, gợi ý ở trên hoặc bỏ lọc cấp độ JLPT." />
            )}
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={item.id === activeId ? 'true' : undefined}
                    onClick={() => setSelectedId(item.id)}
                    className={cx(
                      'rp-focus flex w-full items-center justify-between gap-3 border-b border-rp-line px-4 py-3 text-left last:border-b-0',
                      item.id === activeId ? 'bg-tone-grammar-bg' : 'hover:bg-rp-bg-2',
                    )}
                  >
                    <span lang="ja" className="rp-jp truncate text-[15px] font-semibold text-rp-text">{item.title || item.structure}</span>
                    {item.jlptLevelName && <Badge size="sm" tone="neutral" icon={false}>{item.jlptLevelName}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="min-w-0">
            {activeId > 0 && detailQuery.isPending && <SakuraLoader variant="section" context="grammar" delay={160} />}
            {detailQuery.isError && <Card><ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} retrying={detailQuery.isFetching} /></Card>}
            {!activeId && !submitted && (
              <Card><EmptyState compact mascot="studying" title="Chọn một gợi ý hoặc tìm mẫu ngữ pháp" description="Chi tiết cấu trúc, cách dùng và câu ví dụ sẽ hiển thị tại đây." /></Card>
            )}
            {pattern && (
              <Card as="article" className="rp-anim-fade p-6 space-y-5" aria-labelledby="grammar-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {pattern.jlptLevelName ? <Badge tone="brand" icon={false}>JLPT {pattern.jlptLevelName}</Badge> : <span />}
                  {signedIn ? (
                    <Button size="sm" variant="soft" icon={Bookmark} loading={save.isPending} onClick={() => save.mutate(pattern.id)}>
                      {tr('Lưu vào sổ')}
                    </Button>
                  ) : (
                    <Link to="/auth/">
                      <Button size="sm" variant="secondary">{tr('Đăng nhập để lưu')}</Button>
                    </Link>
                  )}
                </div>

                <div>
                  <h2 id="grammar-title" lang="ja" className="rp-jp text-[28px] font-bold leading-snug text-rp-text">{pattern.structure || pattern.title}</h2>
                  {pattern.title && pattern.structure && pattern.title !== pattern.structure && (
                    <p lang="ja" className="rp-jp mt-1 text-sm text-rp-text-muted">{pattern.title}</p>
                  )}
                </div>

                {!signedIn && (
                  <Banner tone="info">{tr('Đăng nhập để lưu mẫu ngữ pháp vào Sổ tay cá nhân và ôn lại bằng SRS.')}</Banner>
                )}

                {pattern.explanation && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Ý nghĩa & cách dùng')}</h3>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-rp-text">
                      <HighlightableText
                        text={pattern.explanation}
                        contentId={`grammar-${pattern.id}-explanation`}
                        sourceTitle={pattern.structure || pattern.title}
                      />
                    </p>
                  </section>
                )}

                {pattern.exampleSentence && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Ví dụ')}</h3>
                    <p lang="ja" className="rp-jp mt-2 rounded-rp-input border-l-4 border-tone-grammar bg-tone-grammar-bg px-4 py-3 text-[17px] leading-8 text-rp-text">
                      <HighlightableText
                        text={pattern.exampleSentence}
                        contentId={`grammar-${pattern.id}-example`}
                        sourceTitle={pattern.structure || pattern.title}
                      />
                    </p>
                  </section>
                )}
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </LearnerShell>
  );
}