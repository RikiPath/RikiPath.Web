import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getSession } from '../../auth/session.js';
import { bookmarkGrammar } from '../../api/notebookApi.js';
import { getGrammar, searchGrammar } from '../../api/sharedBankApi.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const SAMPLES = ['ている', 'たら', 'ながら'];

export default function GrammarBank() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const signedIn = Boolean(getSession()?.accessToken);
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selectedId, setSelectedId] = useState(0);
  const [notice, setNotice] = useState('');

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
    onSuccess: () => setNotice(tr('Đã lưu vào sổ.')),
  });

  const items = searchQuery.data?.items || [];
  const pattern = detailQuery.data;
  const error = searchQuery.error || detailQuery.error || save.error;

  function runSearch(value) {
    const next = value.trim();
    setKeyword(next);
    setSubmitted(next);
    setSelectedId(0);
    setNotice('');
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Ngữ pháp')}>
      <main className="mx-auto max-w-[1040px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7">
        <section className="rounded-[24px] border border-[#F0E4E9] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(90,40,58,0.04)] sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">{tr('NGÂN HÀNG')}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{tr('Tra mẫu ngữ pháp')}</h1>
          <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); runSearch(keyword); }}>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={tr('Gõ mẫu câu hoặc nghĩa')}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-[#EADFE5] bg-[#FFFBFC] px-4 text-[14px] outline-none focus:border-[#AD3155]"
            />
            <button type="submit" className={`h-12 rounded-2xl bg-[#AD3155] px-5 text-[13px] font-semibold text-white ${focus}`}>{tr('Tìm')}</button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[#A08B96]">{tr('Thử')}</span>
            {SAMPLES.map((sample) => (
              <button key={sample} type="button" onClick={() => runSearch(sample)} className={`h-8 rounded-full bg-[#FDF2F5] px-3 text-[13px] text-[#AD3155] ${focus}`}>{sample}</button>
            ))}
          </div>
        </section>

        {(error || notice) && (
          <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-2xl px-4 py-3 text-[13px] ${error ? 'bg-[#FCF4F8] text-[#A33357]' : 'bg-[#E7F6EC] text-[#1E5C36]'}`}>
            {error?.message || notice}
          </p>
        )}

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-[22px] border border-[#F0E4E9] bg-white">
            {searchQuery.isPending && submitted && <p className="px-4 py-6 text-[13px] text-[#A08B96]">{tr('Đang tìm…')}</p>}
            {!submitted && <p className="px-4 py-8 text-center text-[13px] text-[#A08B96]">{tr('Nhập một mẫu để bắt đầu.')}</p>}
            {searchQuery.isSuccess && items.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-[#A08B96]">{tr('Không có mẫu khớp.')}</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSelectedId(item.id); setNotice(''); }}
                className={`block w-full border-b border-[#F6F0F3] px-4 py-3 text-left last:border-b-0 ${item.id === selectedId ? 'bg-[#FDF2F5]' : 'hover:bg-[#FFFBFC]'} ${focus}`}
              >
                <span className="block text-[15px] font-semibold" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.title || item.structure}</span>
                <span className="mt-1 block truncate text-[12px] text-[#8C7782]">{item.jlptLevelName}</span>
              </button>
            ))}
          </section>

          {pattern && (
            <article className="rounded-[22px] border border-[#F0E4E9] bg-white p-5 shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-medium text-[#AD3155]">{pattern.jlptLevelName}</p>
                <button
                  type="button"
                  disabled={!signedIn || save.isPending}
                  onClick={() => save.mutate(pattern.id)}
                  className={`h-8 rounded-full bg-[#AD3155] px-3 text-[12px] font-medium text-white disabled:opacity-40 ${focus}`}
                >
                  {tr('Lưu vào sổ')}
                </button>
              </div>
              <h2 className="mt-3 text-[28px] font-semibold leading-snug" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{pattern.structure || pattern.title}</h2>
              <p className="mt-3 text-[14px] leading-6">{pattern.explanation}</p>
              {pattern.exampleSentence && (
                <p className="mt-4 rounded-2xl bg-[#FDF2F5] px-4 py-3 text-[16px] leading-7" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>
                  {pattern.exampleSentence}
                </p>
              )}
            </article>
          )}
        </div>
      </main>
    </LearnerShell>
  );
}
