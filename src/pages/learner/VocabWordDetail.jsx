import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getVocabulary, searchVocabulary } from '../../api/sharedBankApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function VocabWordDetail() {
  const { tr } = useLocale();
  const [params, setParams] = useSearchParams();
  const wordId = Number(params.get('id')) || 0;
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');

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
    <LearnerShell pathname="/vocabulary-detail" breadcrumb={tr('Chi tiết từ')}>
      <main className="mx-auto max-w-[820px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7">
        <Link to="/vocabulary/" className={`text-[13px] font-medium text-[#AD3155] ${focus}`}>{tr('Về sổ từ')}</Link>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setParams({});
            setSubmitted(keyword.trim());
          }}
        >
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={tr('Tìm từ đã duyệt')}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#EADFE5] px-3 text-[14px] outline-none focus:border-[#AD3155]"
          />
          <button type="submit" className={`h-11 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white ${focus}`}>{tr('Tìm')}</button>
        </form>

        {detailQuery.isError && <p role="alert" className="mt-4 text-[13px] text-[#A33357]">{detailQuery.error.message}</p>}
        {word && (
          <article className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-6 py-6">
            <p className="text-[13px] text-[#AD3155]">{word.reading}</p>
            <h1 className="mt-1 text-[42px] font-semibold" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{word.word}</h1>
            <p className="mt-2 text-[16px]">{word.meaning}</p>
            {word.jlptLevelName && <p className="mt-2 text-[12px] text-[#8C7782]">{word.jlptLevelName}</p>}
            {word.exampleSentence && (
              <p className="mt-4 rounded-xl bg-[#FCF7F9] px-4 py-3 text-[15px] leading-7" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>
                {word.exampleSentence}
              </p>
            )}
          </article>
        )}

        {items.length > 0 && wordId === 0 && (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setParams({ id: String(item.id) })}
                  className={`flex w-full items-center justify-between rounded-xl border border-[#EADFE5] bg-white px-4 py-3 text-left hover:bg-[#FCF5F8] ${focus}`}
                >
                  <span>
                    <span className="text-[16px] font-medium" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.word}</span>
                    <span className="ml-2 text-[13px] text-[#8C7782]">{item.reading}</span>
                  </span>
                  <span className="text-[13px] text-[#6F5C66]">{item.meaning}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </LearnerShell>
  );
}
