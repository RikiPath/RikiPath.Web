import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import { bookmarkKanji, createNotebookList, getNotebookEntries, getNotebookLists } from '@/features/notebook/api/notebookApi.js';
import { searchKanji } from '@/features/content-author/api/sharedBankApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import { describeApiError } from '@/api/apiErrors.js';
import Icon from '@/components/ui/Icon.jsx';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

const SAMPLES = ['日', '水', '学', '人', '月'];

function listIdOf(list) {
  return list?.id || list?.learnerNoteId;
}

function readings(item) {
  return [
    item.onYomi ? { label: 'On', value: item.onYomi } : null,
    item.kunYomi ? { label: 'Kun', value: item.kunYomi } : null,
    item.sinoVietnamese ? { label: 'HV', value: item.sinoVietnamese } : null,
    item.reading ? { label: '', value: item.reading } : null,
  ].filter(Boolean);
}

export default function KanjiNotebook() {
  const { tr } = useLocale();
  const session = getSession();
  const signedIn = Boolean(session?.accessToken);
  const uid = session?.userId ?? 'anon';
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [notice, setNotice] = useState('');
  const client = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ['notebook-lists', uid],
    queryFn: getNotebookLists,
    enabled: signedIn,
  });
  const savedQuery = useQuery({
    queryKey: ['kanji-saved', uid, (listsQuery.data || []).map(listIdOf).join(',')],
    enabled: signedIn && listsQuery.isSuccess,
    queryFn: async () => {
      const groups = await Promise.all((listsQuery.data || []).map(async (list) => {
        const rows = await getNotebookEntries(listIdOf(list));
        return rows.filter((row) => row.contentType === 'kanji' || row.kanjiId);
      }));
      const seen = new Set();
      return groups.flat().filter((row) => {
        const key = row.kanjiId || row.term;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });
  const searchQuery = useQuery({
    queryKey: ['kanji-search', submitted],
    queryFn: () => searchKanji(submitted),
    enabled: submitted.length > 0,
  });

  const ensureList = useMutation({
    mutationFn: async () => {
      const lists = listsQuery.data || [];
      if (listIdOf(lists[0])) return listIdOf(lists[0]);
      const created = await createNotebookList({ name: 'Kanji' });
      return created?.id || created?.learnerNoteId;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['notebook-lists'] }),
  });

  const save = useMutation({
    mutationFn: async (kanjiId) => {
      const learnerNoteId = await ensureList.mutateAsync();
      return bookmarkKanji({ learnerNoteId, kanjiId });
    },
    onSuccess: (res) => {
      setNotice(tr('Đã lưu vào sổ.'));
      if (res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Chữ này đã có trong sổ kanji.'), '', { key: 'kanji-bm-dup' });
      } else {
        notify.success(tr('Đã lưu vào sổ kanji.'), '', { key: 'kanji-bm-ok' });
      }
      client.invalidateQueries({ queryKey: ['kanji-saved', uid] });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được chữ kanji'), { key: 'kanji-bm-err' }),
  });

  const items = searchQuery.data?.items || [];
  const saved = savedQuery.data || [];
  const savedIds = new Set(saved.map((row) => row.kanjiId).filter(Boolean));

  function runSearch(value) {
    const next = value.trim();
    setKeyword(next);
    setNotice('');
    setSubmitted(next);
  }

  return (
    <LearnerShell pathname="/kanji-notebook" breadcrumb={tr('Sổ kanji')}>
      <main className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text">
        <section className="overflow-hidden rounded-[24px] border border-rp-line bg-white p-[var(--rp-space-card-pad)] shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="rp-type-caption font-semibold tracking-[0.16em] text-rp-brand-strong">{tr('SỔ KANJI')}</p>
              <h1 className="mt-1 rp-type-page-title">{tr('Tra và lưu kanji')}</h1>
            </div>
            <div className="min-w-[108px] rounded-2xl bg-rp-brand-tint px-4 py-3">
              <p className="text-[11px] text-rp-text-muted">{tr('Đã lưu')}</p>
              <p className="mt-1 text-[24px] font-semibold leading-none">{savedQuery.isSuccess ? saved.length : '—'}</p>
            </div>
          </div>

          <form
            className="mt-5 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(keyword);
            }}
          >
            <label className="relative min-w-0 flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-rp-brand" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={tr('Gõ chữ, âm đọc hoặc nghĩa')}
                className="h-12 w-full rounded-2xl border border-rp-line bg-rp-brand-tint pl-10 pr-3 text-[14px] outline-none focus:border-rp-brand-strong"
              />
            </label>
            <button type="submit" className={`h-12 shrink-0 rounded-2xl bg-rp-brand-strong px-5 text-[13px] font-semibold text-white hover:bg-rp-brand-deep ${focus}`}>
              {tr('Tìm')}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-rp-text-muted">{tr('Thử')}</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => runSearch(sample)}
                className={`h-8 rounded-full bg-rp-brand-tint px-3 text-[14px] text-rp-brand-strong hover:bg-rp-brand-soft ${focus}`}
              >
                {sample}
              </button>
            ))}
          </div>
        </section>

        {searchQuery.isError && (
          <ContextualErrorState
            variant="inline"
            className="mt-4"
            error={searchQuery.error}
            title={tr('Chưa tìm được dữ liệu Hán tự')}
            onRetry={() => searchQuery.refetch()}
            retrying={searchQuery.isFetching}
          />
        )}
        {(save.error || notice) && (
          <p role={save.error ? 'alert' : 'status'} className={`mt-4 rounded-2xl px-4 py-3 text-[13px] ${save.error ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-rp-success-bg text-rp-success'}`}>
            {save.error ? describeApiError(save.error).message : notice}
          </p>
        )}
        {!signedIn && <p className="mt-4 text-[13px] text-rp-text-muted">{tr('Đăng nhập để lưu chữ vào sổ.')}</p>}

        {submitted && (
          <section className="mt-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-semibold">{tr('Kết quả')}</h2>
              {searchQuery.isSuccess && <span className="text-[12px] text-rp-text-muted">{items.length}</span>}
            </div>
            {searchQuery.isPending && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((slot) => (
                  <div key={slot} className="h-[132px] animate-pulse rounded-[22px] bg-white" />
                ))}
              </div>
            )}
            {searchQuery.isSuccess && items.length === 0 && (
              <p className="rounded-[22px] border border-dashed border-rp-brand-border bg-white px-4 py-10 text-center text-[13px] text-rp-text-muted">
                {tr('Không có kanji khớp.')}
              </p>
            )}
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const stored = savedIds.has(item.id);
                return (
                  <li key={item.id} className="flex gap-4 rounded-[22px] border border-rp-line bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
                    <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint">
                      <span className="text-[46px] leading-none text-rp-text" style={{ fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' }}>{item.character}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[16px] font-semibold leading-6">{item.meaning}</p>
                        {item.jlptLevelName && (
                          <span className="shrink-0 rounded-full bg-rp-brand-tint px-2 py-0.5 text-[11px] font-medium text-rp-brand-strong">{item.jlptLevelName}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {readings(item).map((part) => (
                          <span key={`${part.label}-${part.value}`} className="rounded-full bg-rp-brand-tint px-2 py-0.5 text-[12px] text-rp-text-2">
                            {part.label ? `${part.label} ${part.value}` : part.value}
                          </span>
                        ))}
                        {item.strokeCount > 0 && (
                          <span className="rounded-full bg-rp-brand-tint px-2 py-0.5 text-[12px] text-rp-text-2">{item.strokeCount} {tr('nét')}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!signedIn || save.isPending || stored}
                        onClick={() => { setNotice(''); save.mutate(item.id); }}
                        className={`mt-3 h-8 rounded-full px-3 text-[12px] font-medium disabled:opacity-50 ${stored ? 'bg-rp-success-bg text-rp-success' : `border border-rp-brand-border text-rp-brand-strong hover:bg-rp-brand-tint`} ${focus}`}
                      >
                        {stored ? tr('Đã lưu') : tr('Lưu vào sổ')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <h2 className="mb-3 text-[16px] font-semibold">{tr('Trong sổ')}</h2>
          {(listsQuery.isLoading || savedQuery.isLoading) && (
            <SakuraLoader variant="section" context="writing" label={tr('Đang tải sổ Hán tự')} delay={160} />
          )}
          {(listsQuery.isError || savedQuery.isError) && (
            <ContextualErrorState
              variant="inline"
              className="mb-3"
              error={listsQuery.error || savedQuery.error}
              title={tr('Chưa tải được sổ Hán tự')}
              onRetry={() => (listsQuery.isError ? listsQuery.refetch() : savedQuery.refetch())}
              retrying={listsQuery.isFetching || savedQuery.isFetching}
            />
          )}
          {!saved.length && !listsQuery.isLoading && !savedQuery.isLoading && !listsQuery.isError && !savedQuery.isError && (
            <div className="rounded-[22px] border border-dashed border-rp-brand-border bg-white px-5 py-10 text-center">
              <p className="text-[42px] leading-none tracking-[0.2em] text-[#F3D5E0]" style={{ fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' }}>漢字</p>
              <p className="mt-3 text-[13px] text-rp-text-muted">{tr('Sổ còn trống. Chọn một chữ phía trên để bắt đầu.')}</p>
            </div>
          )}
          {saved.length > 0 && (
            <ul style={{ '--rp-grid-min': '9.5rem' }} className="rp-fluid-grid">
              {saved.map((row) => (
                <li key={row.noteEntryId || row.kanjiId} className="rounded-[22px] border border-rp-line bg-white px-4 py-4 text-center shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
                  <p className="text-[40px] leading-none" style={{ fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' }}>{row.term}</p>
                  <p className="mt-3 truncate text-[13px] font-medium">{row.meaning}</p>
                  {row.reading && <p className="mt-1 truncate text-[12px] text-rp-text-muted">{row.reading}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </LearnerShell>
  );
}
