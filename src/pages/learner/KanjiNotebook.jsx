import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getSession } from '../../auth/session.js';
import { bookmarkKanji, createNotebookList, getNotebookLists } from '../../api/notebookApi.js';
import { searchKanji } from '../../api/sharedBankApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

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
  const searchQuery = useQuery({
    queryKey: ['kanji-search', submitted],
    queryFn: () => searchKanji(submitted),
    enabled: submitted.length > 0,
  });

  const ensureList = useMutation({
    mutationFn: async () => {
      const lists = listsQuery.data || [];
      if (lists[0]?.id || lists[0]?.learnerNoteId) return lists[0].id || lists[0].learnerNoteId;
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
    onSuccess: () => setNotice(tr('Đã lưu vào sổ.')),
  });

  const items = searchQuery.data?.items || [];
  const error = searchQuery.error || save.error;

  return (
    <LearnerShell pathname="/kanji-notebook" breadcrumb={tr('Sổ kanji')}>
      <main className="mx-auto max-w-[920px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('KHO ĐÃ DUYỆT')}</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Tra và lưu kanji')}</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice('');
            setSubmitted(keyword.trim());
          }}
        >
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={tr('Gõ chữ, âm đọc hoặc nghĩa')}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#EADFE5] px-3 text-[14px] outline-none focus:border-[#AD3155]"
          />
          <button type="submit" className={`h-11 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>
            {tr('Tìm')}
          </button>
        </form>
        {(error || notice) && <p role={error ? 'alert' : 'status'} className={`mt-3 text-[13px] ${error ? 'text-[#A33357]' : 'text-[#2F6B45]'}`}>{error?.message || notice}</p>}
        {!signedIn && <p className="mt-3 text-[13px] text-[#8C7782]">{tr('Đăng nhập để lưu chữ vào sổ.')}</p>}
        {searchQuery.isPending && submitted && <p className="mt-4 text-[13px] text-[#8C7782]">{tr('Đang tìm…')}</p>}
        {searchQuery.isSuccess && items.length === 0 && <p className="mt-4 text-[13px] text-[#8C7782]">{tr('Không có kanji khớp.')}</p>}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[36px] leading-none" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.character}</p>
                <button
                  type="button"
                  disabled={!signedIn || save.isPending}
                  onClick={() => { setNotice(''); save.mutate(item.id); }}
                  className={`h-8 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-40 ${focus}`}
                >
                  {tr('Lưu')}
                </button>
              </div>
              <p className="mt-3 text-[14px] font-medium">{item.meaning}</p>
              <p className="mt-1 text-[12px] text-[#8C7782]">
                {[item.onYomi, item.kunYomi, item.sinoVietnamese].filter(Boolean).join(' · ')}
                {item.jlptLevelName ? ` · ${item.jlptLevelName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </LearnerShell>
  );
}
