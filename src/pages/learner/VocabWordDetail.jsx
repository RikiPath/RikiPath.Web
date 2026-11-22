import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LearnerShell } from '@/layouts';
import { ArrowLeft, Bookmark, Repeat, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, SakuraLoader, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import { bookmarkVocabulary, createNotebookList, getNotebookLists } from '@/features/notebook/api/notebookApi.js';
import { getVocabulary, searchVocabulary } from '@/features/content-author/api/sharedBankApi.js';

export default function VocabWordDetail() {
  const { tr } = useLocale();
  const client = useQueryClient();
  const navigate = useNavigate();
  const signedIn = Boolean(getSession()?.accessToken);
  const [params, setParams] = useSearchParams();
  const wordId = Number(params.get('id')) || 0;
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const lists = await getNotebookLists();
      const learnerNoteId = lists[0]?.id || (await createNotebookList({ name: 'Từ vựng' }))?.id;
      return bookmarkVocabulary({ learnerNoteId, vocabularyId: wordId });
    },
    onSuccess: (res) => {
      if (res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Từ này đã có trong sổ từ'), '', { key: 'vocab-bm-dup' });
      } else {
        notify.success(tr('Đã lưu vào sổ từ'), tr('Từ này đã có trong Sổ từ của bạn.'), {
          key: 'vocab-bm-ok',
          action: { label: tr('Mở sổ từ'), onClick: () => navigate('/vocabulary/') },
        });
      }
      client.invalidateQueries({ queryKey: ['notebook-lists'] });
    },
    onError: (err) => {
      const code = err?.data?.errorCode || err?.errorCode;
      notify.apiError(err, tr('Chưa lưu được từ'), code === 'SELF_STUDY_PACKAGE_REQUIRED' || err?.status === 403
        ? {
            action: {
              label: tr('Xem gói tự học'),
              onClick: () => navigate('/plans/', { state: { from: { pathname: '/vocabulary-detail/' }, requiredFeatureLabel: tr('Sổ tay từ vựng') } }),
            },
          }
        : undefined);
    },
  });

  const detailQuery = useQuery({
    queryKey: ['vocabulary', wordId],
    queryFn: () => getVocabulary(wordId),
    enabled: wordId > 0,
  });
  const searchQuery = useQuery({
    queryKey: ['vocabulary-search', submitted],
    queryFn: () => searchVocabulary(submitted),
    enabled: submitted.length > 0 && wordId === 0,
  });

  const word = detailQuery.data;
  const items = searchQuery.data?.items || [];

  return (
    <LearnerShell breadcrumb={word?.word || tr('Chi tiết từ')}>
      <div className="rp-container-reading py-6 lg:py-8">
        <Link to="/vocabulary/" className="rp-focus inline-flex items-center gap-1.5 rounded text-sm font-semibold rp-link">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {tr('Về sổ từ')}
        </Link>

        <form
          role="search"
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setParams({});
            setSubmitted(keyword.trim());
          }}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{tr('Tìm từ đã duyệt')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={tr('Tìm từ: chữ, cách đọc hoặc nghĩa')} className="pl-10" />
          </label>
          <Button type="submit" disabled={!keyword.trim()}>{tr('Tìm')}</Button>
        </form>

        <div className="mt-5 space-y-4">
          {wordId > 0 && detailQuery.isPending && <SakuraLoader variant="section" context="vocabulary" delay={160} />}
          {detailQuery.isError && <Card><ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} retrying={detailQuery.isFetching} /></Card>}

          {word && (
            <Card as="article" className="rp-anim-fade overflow-hidden p-0" aria-labelledby="word-title">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rp-line bg-tone-vocab-bg/60 px-6 py-6">
                <div className="min-w-0">
                  <p lang="ja" className="rp-jp text-sm font-medium text-tone-vocab">{word.reading}</p>
                  <h1 id="word-title" lang="ja" className="rp-kanji mt-1 text-[44px] font-semibold leading-tight text-rp-text">{word.word}</h1>
                  {word.jlptLevelName && <Badge tone="brand" icon={false} className="mt-2">JLPT {word.jlptLevelName}</Badge>}
                </div>
                <Button variant="soft" icon={Bookmark} loading={save.isPending} disabled={!signedIn} onClick={() => save.mutate()}>
                  {tr('Lưu vào sổ')}
                </Button>
              </div>
              <div className="space-y-5 px-6 py-5">
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Nghĩa')}</h2>
                  <p className="mt-1.5 text-[17px] leading-7 text-rp-text">{word.meaning}</p>
                </section>
                {word.exampleSentence && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Ví dụ')}</h2>
                    <p lang="ja" className="rp-jp mt-1.5 rounded-rp-input border-l-4 border-tone-vocab bg-rp-bg-2 px-4 py-3 text-[16px] leading-8 text-rp-text">{word.exampleSentence}</p>
                  </section>
                )}
                <div className="flex flex-wrap gap-2 border-t border-rp-line pt-4">
                  <Link to="/daily-srs/" className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input border border-rp-line px-3 text-[13px] font-semibold text-rp-text hover:border-rp-brand-border"><Repeat aria-hidden="true" className="h-4 w-4 text-tone-vocab" /> {tr('Ôn tập SRS')}</Link>
                </div>
              </div>
            </Card>
          )}

          {wordId === 0 && !submitted && (
            <Card><EmptyState compact icon={Search} title={tr('Tìm một từ để xem chi tiết')} description={tr('Gõ chữ Hán, cách đọc hoặc nghĩa tiếng Việt.')} /></Card>
          )}
          {wordId === 0 && submitted && searchQuery.isPending && <SakuraLoader variant="section" context="vocabulary" delay={160} />}
          {wordId === 0 && searchQuery.isError && <Card><ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} retrying={searchQuery.isFetching} compact /></Card>}
          {wordId === 0 && searchQuery.isSuccess && items.length === 0 && (
            <Card><EmptyState compact art="search" title={tr('Không tìm thấy từ phù hợp')} description={tr('Thử từ khóa khác hoặc cách viết bằng kana.')} /></Card>
          )}
          {items.length > 0 && wordId === 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setParams({ id: String(item.id) })}
                    className="rp-focus flex w-full items-center justify-between gap-4 rounded-rp-card border border-rp-line bg-rp-surface px-4 py-3 text-left transition-colors hover:border-rp-brand-border"
                  >
                    <span className="min-w-0">
                      <span lang="ja" className="rp-kanji text-[18px] font-semibold text-rp-text">{item.word}</span>
                      <span lang="ja" className="rp-jp ml-2 text-[13px] text-rp-text-muted">{item.reading}</span>
                    </span>
                    <span className="truncate text-[13px] text-rp-text-2">{item.meaning}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </LearnerShell>
  );
}
