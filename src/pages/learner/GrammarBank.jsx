import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
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
  const queryError = searchQuery.error || detailQuery.error;

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

        {queryError && (
          <div className="mt-4">
            <ErrorState
              error={queryError}
              onRetry={() => (detailQuery.error ? detailQuery.refetch() : searchQuery.refetch())}
            />
          </div>
        )}

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            {searchQuery.isPending && submitted && (
              <div className="flex justify-center px-4 py-8">
                <SakuraLoader label={tr('Đang tìm…')} />
              </div>
            )}
            {!submitted && (
              <EmptyState
                title={tr('Nhập một mẫu để bắt đầu.')}
                description={tr('Gõ mẫu ngữ pháp tiếng Nhật hoặc chọn một gợi ý phía trên.')}
                className="py-8"
              />
            )}
            {searchQuery.isSuccess && items.length === 0 && (
              <EmptyState
                title={tr('Không có mẫu khớp.')}
                description={tr('Thử tìm với từ khóa khác.')}
                className="py-8"
              />
            )}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cx(
                  'rp-focus block w-full border-b border-rp-border/60 px-4 py-3 text-left last:border-b-0 transition-colors',
                  item.id === selectedId ? 'bg-tone-grammar-bg/60' : 'hover:bg-rp-surface-subtle'
                )}
              >
                <span className="rp-jp block text-[15px] font-semibold text-rp-text">{item.title || item.structure}</span>
                {item.jlptLevelName && (
                  <span className="mt-1 block truncate text-[12px] text-rp-text-muted">{item.jlptLevelName}</span>
                )}
              </button>
            ))}
          </Card>

          {detailQuery.isPending && selectedId > 0 && (
            <Card className="flex justify-center p-8">
              <SakuraLoader label={tr('Đang tải chi tiết…')} />
            </Card>
          )}

          {pattern && (
            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                {pattern.jlptLevelName ? <Badge tone="grammar">{pattern.jlptLevelName}</Badge> : <span />}
                <Button
                  type="button"
                  size="sm"
                  disabled={!signedIn || save.isPending}
                  onClick={() => save.mutate(pattern.id)}
                >
                  <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                  {tr('Lưu vào sổ')}
                </Button>
              </div>
              <h2 className="rp-jp mt-3 text-[28px] font-semibold leading-snug text-rp-text">
                {pattern.structure || pattern.title}
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-rp-text">{pattern.explanation}</p>
              {pattern.exampleSentence && (
                <p className="rp-jp mt-4 rounded-2xl bg-tone-grammar-bg/60 px-4 py-3 text-[16px] leading-7 text-rp-text">
                  {pattern.exampleSentence}
                </p>
              )}
              <LearnerFeedbackPanel type="grammar" id={selectedId} label="Phản hồi về mẫu ngữ pháp" />
            </Card>
          )}
        </div>
      </div>
    </LearnerShell>
  );
}