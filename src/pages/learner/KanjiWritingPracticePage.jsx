import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import KanjiKnowledgePanel from '../../components/kanji_writer/KanjiKnowledgePanel.jsx';
import { useKanjiWritingPractice } from '../../hooks/useKanjiWritingPractice.js';
import { useKanaWritingPractice } from '../../hooks/useKanaWritingPractice.js';


export default function KanjiWritingPracticePage() {
  const { locale, tr } = useLocale();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const isKana = requestedType === 'hiragana' || requestedType === 'katakana';
  const kanaType = requestedType === 'katakana' ? 'Katakana' : requestedType === 'hiragana' ? 'Hiragana' : null;
  const kana = useKanaWritingPractice(kanaType);
  const [mistakes, setMistakes] = useState(0);
  const kanaLabel = requestedType === 'katakana' ? 'Katakana' : 'Hiragana';
  const practice = useKanjiWritingPractice({ enabled: !isKana });

  let content;
  if (isKana) {
    const item = kana.currentItem;
    content = (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-3xl font-bold text-[#2D282A]">{locale === 'ja' ? `${kanaLabel}の練習` : `Luyện ${kanaLabel}`}</h1>
        <p className="mt-2 text-sm text-[#6F6669]">{locale === 'ja' ? `${kanaLabel}のすべての文字とローマ字` : `Toàn bộ ký tự ${kanaLabel} và cách đọc Romaji.`}</p>
        {kana.loading && <p className="mt-6 text-sm text-[#6F6669]">{tr('Đang tải chữ cần ôn…')}</p>}
        {kana.error && <p className="mt-6 text-sm text-red-600">{kana.error}</p>}
        {!kana.loading && !kana.error && !item && <p className="mt-6 text-sm text-[#6F6669]">{tr('Chưa có chữ cần ôn.')}</p>}
        {!kana.loading && !kana.error && kana.queue.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {kana.queue.map((character, index) => (
              <button key={character.kanaCharacterId} type="button" onClick={() => { kana.selectItem(index); setMistakes(0); }}
                className={`rounded-2xl border bg-white p-4 text-center transition hover:border-[#B52F55] ${kana.index === index ? 'border-[#B52F55] ring-1 ring-[#B52F55]' : 'border-[#eadfd9]'}`}>
                <span className="block text-4xl text-[#2D282A]">{character.character}</span>
                <span className="mt-2 block text-sm text-[#6F6669]">{character.romaji}</span>
              </button>
            ))}
          </div>
        )}
        {item && (
          <div className="mt-6 rounded-3xl border border-[#eadfd9] bg-white p-6 text-center shadow-sm">
            <p className="text-7xl" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.character}</p>
            <p className="mt-3 text-sm text-[#6F6669]">{item.romaji}</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setMistakes((value) => Math.max(0, value - 1))} className="h-9 w-9 rounded-lg border border-[#eadfd9]">−</button>
              <span className="min-w-16 text-sm">{mistakes} {tr('lỗi')}</span>
              <button type="button" onClick={() => setMistakes((value) => value + 1)} className="h-9 w-9 rounded-lg border border-[#eadfd9]">+</button>
            </div>
            <button
              type="button"
              onClick={async () => { await kana.submitResult(mistakes); setMistakes(0); }}
              className="mt-4 rounded-full bg-[#B52F55] px-5 py-2.5 text-sm font-bold text-white"
            >
              {tr('Ghi nhận')}
            </button>
            {kana.lastResult && (
              <p className="mt-3 text-sm text-[#2F6B45]">
                {tr('Lần ôn kế')} {new Date(kana.lastResult.nextReviewDate).toLocaleDateString('vi-VN')}
              </p>
            )}
            <div className="mt-4 flex justify-center gap-4 text-sm">
              <button type="button" disabled={kana.index === 0} onClick={() => kana.selectItem(kana.index - 1)} className="text-[#6F6669] disabled:opacity-40">{tr('Trước')}</button>
              <span>{kana.index + 1}/{kana.queue.length}</span>
              <button type="button" disabled={kana.index >= kana.queue.length - 1} onClick={() => kana.selectItem(kana.index + 1)} className="text-[#6F6669] disabled:opacity-40">{tr('Sau')}</button>
            </div>
          </div>
        )}
      </section>
    );
  } else {
    content = <KanjiKnowledgePanel practice={practice} />;
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Riki - Viết")}>
      <div className="min-h-[calc(100vh-4rem)] bg-[#FAF7F5]">{content}</div>
    </LearnerShell>
  );
}
