import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import KanjiLesson from '../../components/kanji_writer/KanjiLesson.jsx';
import { kanaFamily } from '../../components/kanji_writer/kanaFamilies.js';
import { useKanjiWritingPractice } from '../../hooks/useKanjiWritingPractice.js';
import { useKanaWritingPractice } from '../../hooks/useKanaWritingPractice.js';


export default function KanjiWritingPracticePage() {
  const { locale, tr } = useLocale();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [scope, setScope] = useState('due');
  const requestedType = searchParams.get('type');
  const isKana = requestedType === 'hiragana' || requestedType === 'katakana';
  const kanaType = requestedType === 'katakana' ? 'Katakana' : requestedType === 'hiragana' ? 'Hiragana' : null;
  const kana = useKanaWritingPractice(kanaType, scope);
  const [pickedId, setPickedId] = useState(null);
  const kanaLabel = requestedType === 'katakana' ? 'Katakana' : 'Hiragana';
  const practice = useKanjiWritingPractice({ enabled: !isKana, scope });

  useEffect(() => {
    setPickedId(null);
  }, [kana.queue]);

  const scopeSwitch = (
    <div className="inline-flex rounded-full bg-white p-1">
      {[['due', tr('Cần ôn')], ['all', tr('Cả bảng')]].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setScope(value)}
          className={`h-8 rounded-full px-3 text-[12px] ${scope === value ? 'bg-[#AD3155] font-medium text-white' : 'text-[#8C7782]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  let content;
  if (isKana) {
    const item = kana.queue.find((row) => row.kanaCharacterId === pickedId) || null;
    const family = item ? kanaFamily(item.character, requestedType === 'katakana' ? 'kata' : 'hira') : null;
    content = (
      <section className={`mx-auto px-5 py-6 sm:px-7 ${item ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-[#3C2A33]">{locale === 'ja' ? `${kanaLabel}の練習` : `Luyện ${kanaLabel}`}</h1>
            <p className="mt-1 text-[14px] text-[#8C7782]">{item ? (family?.name || item.romaji) : tr('Chọn một chữ trên bảng để xem tenten, maru và âm ghép.')}</p>
          </div>
          <div className="flex items-center gap-3">
            {item ? (
              <button type="button" onClick={() => setPickedId(null)} className="text-[13px] font-semibold text-[#AD3155]">{tr('Về bảng')}</button>
            ) : scopeSwitch}
          </div>
        </div>
        {kana.loading && <p className="mt-8 text-center text-[14px] text-[#8C7782]">{tr('Đang tải chữ cần ôn…')}</p>}
        {kana.error && !kana.queue.length && <p className="mt-8 text-center text-[14px] text-[#A33357]">{kana.error}</p>}
        {!kana.loading && !kana.error && !kana.queue.length && <p className="mt-8 text-center text-[14px] text-[#8C7782]">{tr('Chưa có chữ cần ôn.')}</p>}
        {!kana.loading && !item && kana.queue.length > 0 && (
          <div className={`mt-6 grid gap-3 ${scope === 'all' ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-5'}`}>
            {kana.queue.map((character) => (
              <button
                key={character.kanaCharacterId}
                type="button"
                onClick={() => setPickedId(character.kanaCharacterId)}
                className="relative rounded-2xl border border-[#E7DAE1] bg-white px-2 py-3 text-center hover:border-[#AD3155]"
              >
                {character.isNew ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#AD3155]" /> : null}
                <span className="block text-[32px] leading-none text-[#3C2A33]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{character.character}</span>
                <span className="mt-1 block text-[12px] text-[#8C7782]">{character.romaji}</span>
              </button>
            ))}
          </div>
        )}
        {item && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center gap-4">
              <p className="text-[72px] leading-none text-[#3C2A33]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.character}</p>
              <div>
                <p className="text-[18px] font-semibold text-[#3C2A33]">{item.romaji}</p>
                <p className="text-[13px] text-[#8C7782]">{family?.name || kanaLabel}</p>
              </div>
            </div>
            {(family?.sections || []).map((section) => (
              <section key={section.title}>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[15px] font-semibold text-[#3C2A33]">{section.title}</h2>
                  {section.hint ? <p className="text-[12px] text-[#8C7782]">{section.hint}</p> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {section.items.map((tile) => {
                    const current = tile.kana === item.character;
                    return (
                      <div
                        key={`${section.title}-${tile.kana}`}
                        className={`grid h-[76px] w-[76px] place-items-center rounded-2xl border ${current ? 'border-[#AD3155] bg-[#AD3155] text-white' : 'border-[#E7DAE1] bg-white text-[#3C2A33]'}`}
                      >
                        <span className="text-[28px] leading-none" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{tile.kana}</span>
                        <span className={`text-[11px] ${current ? 'text-white/80' : 'text-[#8C7782]'}`}>{tile.romaji}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            {family && family.sections.length === 1 ? (
              <p className="text-[13px] text-[#8C7782]">Chữ này không thêm tenten, maru hay âm ghép.</p>
            ) : null}
          </div>
        )}
      </section>
    );
  } else {
    content = (
      <KanjiLesson
        practice={practice}
        scope={scope}
        onScope={setScope}
      />
    );
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Riki - Viết")}>
      <div className="min-h-[calc(100vh-4rem)] bg-[#FAF7F5]">{content}</div>
    </LearnerShell>
  );
}
