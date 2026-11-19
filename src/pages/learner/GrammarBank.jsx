import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bookmark, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, FeatureIcon, Input, SakuraLoader, cx, notify } from '@/components/ui';

import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import { bookmarkGrammar } from '@/features/notebook/api/notebookApi.js';
import { getGrammar, searchGrammar } from '@/features/content-author/api/sharedBankApi.js';

const SAMPLES = ['ている', 'たら', 'ながら'];

export default function GrammarBank() {
  const { tr } = useLocale();
  const signedIn = Boolean(getSession()?.accessToken);
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selectedId, setSelectedId] = useState(0);

  const searchQuery = useQuery({
    queryKey: ['grammar-search', submitted],
    queryFn: () => searchGrammar(submitted),
    enabled: submitted.length > 0,
  });
  const detailQuery = useQuery({
    queryKey: ['grammar', selectedId],
    queryFn: () => getGrammar(selectedId),
    enabled: selectedId > 0,
  });
  const save = useMutation({
    mutationFn: bookmarkGrammar,
    onSuccess: (res) => {
      if (res?.alreadyExists || res?.isExisting) notify.info(tr('Mẫu ngữ pháp đã có trong sổ tay'), '', { key: 'grammar-bm-dup' });
      else notify.success(tr('Đã lưu vào sổ tay'), tr('Mẫu ngữ pháp có trong Sổ tay của bạn.'), { key: 'grammar-bm-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được')),
  });

  const items = searchQuery.data?.items || [];
  const pattern = detailQuery.data;

  function runSearch(value) {
    const next = value.trim();
    setKeyword(next);
    setSubmitted(next);
    setSelectedId(0);
  }

  return (
    <LearnerShell breadcrumb={tr('Ngữ pháp')}>
      <div className="rp-container py-6 lg:py-8">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <FeatureIcon feature="grammar" size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tone-grammar">{tr('Ngân hàng ngữ pháp')}</p>
              <h1 className="text-2xl font-bold tracking-[-0.01em] text-rp-text">{tr('Tra mẫu ngữ pháp')}</h1>
            </div>
          </div>
          <form role="search" className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); runSearch(keyword); }}>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{tr('Gõ mẫu câu hoặc nghĩa')}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={tr('Gõ mẫu câu hoặc nghĩa, ví dụ: ている')} className="pl-10" />
            </label>
            <Button type="submit" disabled={!keyword.trim()}>{tr('Tìm')}</Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-rp-text-muted">{tr('Gợi ý')}:</span>
            {SAMPLES.map((sample) => (
              <button key={sample} type="button" onClick={() => runSearch(sample)} className="rp-focus rp-jp h-8 rounded-full border border-tone-grammar-bg bg-tone-grammar-bg px-3 text-[13px] font-medium text-tone-grammar hover:border-tone-grammar">{sample}</button>
            ))}
          </div>
        </Card>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card padded={false} className="overflow-hidden" aria-label={tr('Kết quả tìm kiếm')}>
            {!submitted && <EmptyState compact icon={Search} title={tr('Nhập một mẫu để bắt đầu')} description={tr('Tìm theo mẫu câu tiếng Nhật hoặc nghĩa tiếng Việt.')} />}
            {submitted && searchQuery.isPending && <SakuraLoader variant="section" context="grammar" className="min-h-[120px] py-4" delay={160} />}
            {searchQuery.isError && <ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} retrying={searchQuery.isFetching} compact />}
            {searchQuery.isSuccess && items.length === 0 && <EmptyState compact art="search" title={tr('Không có mẫu khớp')} description={tr('Thử từ khóa ngắn hơn hoặc một mẫu khác.')} />}
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={item.id === selectedId ? 'true' : undefined}
                    onClick={() => setSelectedId(item.id)}
                    className={cx('rp-focus flex w-full items-center justify-between gap-3 border-b border-rp-line px-4 py-3 text-left last:border-b-0', item.id === selectedId ? 'bg-tone-grammar-bg' : 'hover:bg-rp-bg-2')}
                  >
                    <span lang="ja" className="rp-jp truncate text-[15px] font-semibold text-rp-text">{item.title || item.structure}</span>
                    {item.jlptLevelName && <Badge size="sm" tone="neutral" icon={false}>{item.jlptLevelName}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="min-w-0">
            {selectedId > 0 && detailQuery.isPending && <SakuraLoader variant="section" context="grammar" delay={160} />}
            {detailQuery.isError && <Card><ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} retrying={detailQuery.isFetching} /></Card>}
            {!selectedId && submitted && items.length > 0 && (
              <Card><EmptyState compact mascot="studying" title={tr('Chọn một mẫu để xem chi tiết')} /></Card>
            )}
            {pattern && (
              <Card as="article" className="rp-anim-fade p-6" aria-labelledby="grammar-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {pattern.jlptLevelName ? <Badge tone="brand" icon={false}>JLPT {pattern.jlptLevelName}</Badge> : <span />}
                  <Button size="sm" variant="soft" icon={Bookmark} loading={save.isPending} disabled={!signedIn} onClick={() => save.mutate(pattern.id)}>
                    {tr('Lưu vào sổ')}
                  </Button>
                </div>
                <h2 id="grammar-title" lang="ja" className="rp-jp mt-4 text-[28px] font-bold leading-snug text-rp-text">{pattern.structure || pattern.title}</h2>
                {pattern.title && pattern.structure && pattern.title !== pattern.structure && <p lang="ja" className="rp-jp text-sm text-rp-text-muted">{tr(pattern.title)}</p>}
                {pattern.explanation && (
                  <section className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Ý nghĩa & cách dùng')}</h3>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-rp-text">{pattern.explanation}</p>
                  </section>
                )}
                {pattern.exampleSentence && (
                  <section className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Ví dụ')}</h3>
                    <p lang="ja" className="rp-jp mt-2 rounded-rp-input border-l-4 border-tone-grammar bg-tone-grammar-bg px-4 py-3 text-[17px] leading-8 text-rp-text">{pattern.exampleSentence}</p>
                  </section>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </LearnerShell>
  );
}
