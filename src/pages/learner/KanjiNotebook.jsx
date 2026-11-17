import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getSession } from '../../auth/session.js';
import { bookmarkKanji, createNotebookList, getNotebookEntries, getNotebookLists } from '../../api/notebookApi.js';
import { searchKanji } from '../../api/sharedBankApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

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
  const signedIn = Boolean(getSession()?.accessToken);
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [notice, setNotice] = useState('');
  const client = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ['notebook-lists'],
    queryFn: getNotebookLists,
    enabled: signedIn,
  });
  const savedQuery = useQuery({
    queryKey: ['kanji-saved', (listsQuery.data || []).map(listIdOf).join(',')],
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
    onSuccess: () => {
      setNotice(tr('Đã lưu vào sổ.'));
      client.invalidateQueries({ queryKey: ['kanji-saved'] });
    },
  });

  const items = searchQuery.data?.items || [];
  const saved = savedQuery.data || [];
  const savedIds = new Set(saved.map((row) => row.kanjiId).filter(Boolean));
  const error = searchQuery.error || save.error;

  function runSearch(value) {
    const next = value.trim();
    setKeyword(next);
    setNotice('');
    setSubmitted(next);
  }

  return (
    <LearnerShell pathname="/kanji-notebook" breadcrumb={tr('Sổ kanji')}>
      <main className="mx-auto max-w-[1040px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7">
        <section className="overflow-hidden rounded-[24px] border border-[#F0E4E9] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">{tr('SỔ KANJI')}</p>
              <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{tr('Tra và lưu kanji')}</h1>
            </div>
            <div className="min-w-[108px] rounded-2xl bg-[#FDF2F5] px-4 py-3">
              <p className="text-[11px] text-[#967F8A]">{tr('Đã lưu')}</p>
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
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#C4A8B4]">search</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={tr('Gõ chữ, âm đọc hoặc nghĩa')}
                className="h-12 w-full rounded-2xl border border-[#EADFE5] bg-[#FFFBFC] pl-10 pr-3 text-[14px] outline-none focus:border-[#AD3155]"
              />
            </label>
            <button type="submit" className={`h-12 shrink-0 rounded-2xl bg-[#AD3155] px-5 text-[13px] font-semibold text-white hover:bg-[#982B4B] ${focus}`}>
              {tr('Tìm')}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[#A08B96]">{tr('Thử')}</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => runSearch(sample)}
                className={`h-8 rounded-full bg-[#FDF2F5] px-3 text-[14px] text-[#AD3155] hover:bg-[#F8E3EB] ${focus}`}
              >
                {sample}
              </button>
            ))}
          </div>
        </section>

        {(error || notice) && (
          <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-2xl px-4 py-3 text-[13px] ${error ? 'bg-[#FCF4F8] text-[#A33357]' : 'bg-[#E7F6EC] text-[#1E5C36]'}`}>
            {error?.message || notice}
          </p>
        )}
        {!signedIn && <p className="mt-4 text-[13px] text-[#8C7782]">{tr('Đăng nhập để lưu chữ vào sổ.')}</p>}

        {submitted && (
          <section className="mt-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-semibold">{tr('Kết quả')}</h2>
              {searchQuery.isSuccess && <span className="text-[12px] text-[#8C7782]">{items.length}</span>}
            </div>
            {searchQuery.isPending && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((slot) => (
                  <div key={slot} className="h-[132px] animate-pulse rounded-[22px] bg-white" />
                ))}
              </div>
            )}
            {searchQuery.isSuccess && items.length === 0 && (
              <p className="rounded-[22px] border border-dashed border-[#E7C9D6] bg-white px-4 py-10 text-center text-[13px] text-[#A08B96]">
                {tr('Không có kanji khớp.')}
              </p>
            )}
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const stored = savedIds.has(item.id);
                return (
                  <li key={item.id} className="flex gap-4 rounded-[22px] border border-[#F0E4E9] bg-white p-4 shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
                    <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl bg-[#FDF2F5]">
                      <span className="text-[46px] leading-none text-[#49353F]" style={{ fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' }}>{item.character}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[16px] font-semibold leading-6">{item.meaning}</p>
                        {item.jlptLevelName && (
                          <span className="shrink-0 rounded-full bg-[#FDF2F5] px-2 py-0.5 text-[11px] font-medium text-[#AD3155]">{item.jlptLevelName}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {readings(item).map((part) => (
                          <span key={`${part.label}-${part.value}`} className="rounded-full bg-[#F7F2F4] px-2 py-0.5 text-[12px] text-[#705261]">
                            {part.label ? `${part.label} ${part.value}` : part.value}
                          </span>
                        ))}
                        {item.strokeCount > 0 && (
                          <span className="rounded-full bg-[#F7F2F4] px-2 py-0.5 text-[12px] text-[#705261]">{item.strokeCount} {tr('nét')}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!signedIn || save.isPending || stored}
                        onClick={() => { setNotice(''); save.mutate(item.id); }}
                        className={`mt-3 h-8 rounded-full px-3 text-[12px] font-medium disabled:opacity-50 ${stored ? 'bg-[#E7F6EC] text-[#1E5C36]' : `border border-[#E7C3D0] text-[#AD3155] hover:bg-[#FDF2F5]`} ${focus}`}
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
          {savedQuery.isLoading && <p className="text-[13px] text-[#A08B96]">{tr('Đang tải sổ…')}</p>}
          {!saved.length && !savedQuery.isLoading && (
            <div className="rounded-[22px] border border-dashed border-[#E7C9D6] bg-white px-5 py-10 text-center">
              <p className="text-[42px] leading-none tracking-[0.2em] text-[#F3D5E0]" style={{ fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' }}>漢字</p>
              <p className="mt-3 text-[13px] text-[#8C7782]">{tr('Sổ còn trống. Chọn một chữ phía trên để bắt đầu.')}</p>
            </div>
          )}
          {saved.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {saved.map((row) => (
                <li key={row.noteEntryId || row.kanjiId} className="rounded-[22px] border border-[#F0E4E9] bg-white px-4 py-4 text-center shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
                  <p className="text-[40px] leading-none" style={{ fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' }}>{row.term}</p>
                  <p className="mt-3 truncate text-[13px] font-medium">{row.meaning}</p>
                  {row.reading && <p className="mt-1 truncate text-[12px] text-[#8C7782]">{row.reading}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </LearnerShell>
  );
}
