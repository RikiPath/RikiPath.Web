import { useState } from 'react';
import { PenLine, PlayCircle } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import KanjiLesson from '@/features/kanji/components/KanjiLesson.jsx';
import KanaStrokeDialog from '@/features/kanji/components/KanaStrokeDialog.jsx';
import KanaAudioButton from '@/features/kanji/components/KanaAudioButton.jsx';
import { kanaFamily } from '@/features/kanji/components/kanaFamilies.js';
import { useKanjiWritingPractice } from '@/features/kanji/hooks/useKanjiWritingPractice.js';
import { playKanaAudio } from '@/features/kanji/utils/kanaAudio.js';
import { hasKanaStrokeData } from '@/features/kanji/utils/kanaCharData.js';
import { Button, ContextualErrorState, SakuraLoader } from '@/components/ui';
import { useKanaWritingPractice } from '@/features/kanji/hooks/useKanaWritingPractice.js';


export default function KanjiWritingPracticePage() {
  const { trf, locale, tr } = useLocale();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [scope, setScope] = useState('due');
  const [kanaScope, setKanaScope] = useState('all');
  const requestedType = searchParams.get('type');
  const isKana = requestedType === 'hiragana' || requestedType === 'katakana';
  const kanaType = requestedType === 'katakana' ? 'Katakana' : requestedType === 'hiragana' ? 'Hiragana' : null;
  const kana = useKanaWritingPractice(kanaType, kanaScope);
  const [pickedKana, setPickedKana] = useState(null);
  const [openedKana, setOpenedKana] = useState(null);
  const [writingTab, setWritingTab] = useState('guide');
  const kanaLabel = requestedType === 'katakana' ? 'Katakana' : 'Hiragana';
  const practice = useKanjiWritingPractice({ enabled: !isKana, scope });

  const activeScope = isKana ? kanaScope : scope;
  function changeScope(value) {
    setPickedKana(null);
    setOpenedKana(null);
    if (isKana) setKanaScope(value);
    else setScope(value);
  }
  function openKana(character, index, openModal = false, tab = 'guide') {
    kana.selectItem(index);
    const selection = { id: character.kanaCharacterId, type: kanaType, scope: kanaScope };
    setPickedKana(selection);
    setWritingTab(tab);
    setOpenedKana(openModal ? selection : null);
  }

  function handleFamilyTileClick(tile) {
    const matchIndex = kana.queue.findIndex((row) => row.character === tile.kana);
    if (matchIndex >= 0 && hasKanaStrokeData(tile.kana)) {
      const target = kana.queue[matchIndex];
      openKana(target, matchIndex, true, writingTab);
      return;
    }
    playKanaAudio(null, tile.kana);
  }

  const scopeSwitch = (
    <div className="inline-flex rounded-full bg-white p-1">
      {[['due', tr('Cần ôn')], ['all', tr('Cả bảng')]].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => changeScope(value)}
          className={`h-8 rounded-full px-3 text-[12px] ${activeScope === value ? 'bg-rp-brand-strong font-medium text-white' : 'text-rp-text-muted'}`}
        >
          {tr(label)}
        </button>
      ))}
    </div>
  );

  let content;
  if (isKana) {
    const item = pickedKana?.type === kanaType && pickedKana?.scope === kanaScope
      ? kana.queue.find((row) => row.kanaCharacterId === pickedKana.id) || null : null;
    const dialogItem = openedKana?.type === kanaType && openedKana?.scope === kanaScope
      ? kana.queue.find((row) => row.kanaCharacterId === openedKana.id) || null : null;
    const family = item ? kanaFamily(item.character, requestedType === 'katakana' ? 'kata' : 'hira') : null;
    const dialogIndex = dialogItem ? kana.queue.findIndex((row) => row.kanaCharacterId === dialogItem.kanaCharacterId) : -1;
    const nextKana = dialogIndex >= 0 ? kana.queue[dialogIndex + 1] : null;
    content = (
      <section className={`${item ? 'rp-container' : 'rp-container-reading'} rp-cq py-[var(--rp-space-page-y)]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="rp-type-page-title text-rp-text">{locale === 'ja' ? `${kanaLabel}の練習` : trf('Luyện {0}', { 0: kanaLabel })}</h1>
            <p className="rp-type-secondary mt-1 text-rp-text-muted">{item ? (family?.name || item.romaji) : tr('Chọn một chữ trên bảng để xem tenten, maru và âm ghép.')}</p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-3">
            {item ? (
              <button type="button" onClick={() => { setPickedKana(null); setOpenedKana(null); }} className="text-[13px] font-semibold text-rp-brand-strong">{tr('Về bảng')}</button>
            ) : scopeSwitch}
          </div>
        </div>
        {kana.loading && !kana.queue.length && <SakuraLoader variant="section" context="writing" delay={160} />}
        {kana.error && !kana.queue.length && (
          <ContextualErrorState
            className="mt-6"
            error={kana.rawError}
            title={tr('Chưa tải được bảng Kana')}
            description={kana.error}
            onRetry={() => kana.reload()}
            retrying={kana.retrying}
          />
        )}
        {!kana.loading && !kana.error && !kana.queue.length && (
          <div className="mt-8 space-y-3 text-center">
            <p className="text-[14px] text-rp-text-muted">{tr('Chưa có chữ cần ôn.')}</p>
            {kanaScope === 'due' && (
              <Button variant="soft" size="sm" onClick={() => changeScope('all')}>
                {tr('Mở cả bảng Kana')}
              </Button>
            )}
          </div>
        )}
        {!kana.loading && !item && kana.queue.length > 0 && (
          <div
            style={{ '--rp-grid-min': kanaScope === 'all' ? '6.25rem' : '7.5rem' }}
            className="rp-fluid-grid mt-6"
          >
            {kana.queue.map((character, index) => (
              <div key={character.kanaCharacterId} className="rounded-2xl border border-rp-line bg-white p-2 text-center hover:border-rp-brand-strong">
                <button type="button" onClick={() => openKana(character, index, false)}
                  aria-label={'Xem cách viết ' + character.character + ' (' + character.romaji + ')'}
                  className="block w-full rounded-xl px-2 py-3 focus-visible:outline-2 focus-visible:outline-rp-brand-strong">
                <span className="block text-[32px] leading-none text-rp-text" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{character.character}</span>
                <span className="mt-1 block text-[12px] text-rp-text-muted">{character.romaji}</span>
                </button>
                <KanaAudioButton audioUrl={character.audioUrl} character={character.character} compact />
              </div>
            ))}
          </div>
        )}
        {item && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center gap-4">
              <p className="text-[72px] leading-none text-rp-text" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.character}</p>
              <div>
                <p className="text-[18px] font-semibold text-rp-text">{item.romaji}</p>
                <p className="text-[13px] text-rp-text-muted">{family?.name || kanaLabel}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => { setWritingTab('practice'); setOpenedKana(pickedKana); }} className="rp-focus rp-press inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong">
                <PenLine aria-hidden="true" className="h-4 w-4" /> {tr('Bắt đầu luyện viết')}
              </button>
              <button type="button" onClick={() => { setWritingTab('guide'); setOpenedKana(pickedKana); }} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border border-rp-line bg-white px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border">
                <PlayCircle aria-hidden="true" className="h-4 w-4 text-tone-reading" /> {tr('Xem hướng dẫn từng nét')}
              </button>
              <KanaAudioButton audioUrl={item.audioUrl} character={item.character} />
            </div>
            {(family?.sections || []).map((section) => (
              <section key={section.title}>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[15px] font-semibold text-rp-text">{tr(section.title)}</h2>
                  {section.hint ? <p className="text-[12px] text-rp-text-muted">{tr(section.hint)}</p> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {section.items.map((tile) => {
                    const current = tile.kana === item.character;
                    return (
                      <button
                        key={`${section.title}-${tile.kana}`}
                        type="button"
                        onClick={() => handleFamilyTileClick(tile)}
                        aria-label={trf('Nghe hoặc luyện chữ {0} ({1})', { 0: tile.kana, 1: tile.romaji })}
                        className={`rp-focus grid h-[76px] w-[76px] place-items-center rounded-2xl border transition-colors ${
                          current
                            ? 'border-rp-brand-strong bg-rp-brand-strong text-white'
                            : 'border-rp-line bg-white text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint/40'
                        }`}
                      >
                        <span className="text-[28px] leading-none" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{tile.kana}</span>
                        <span className={`text-[11px] ${current ? 'text-white/80' : 'text-rp-text-muted'}`}>{tile.romaji}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {family && family.sections.length === 1 ? (
              <p className="text-[13px] text-rp-text-muted">{tr('Chữ này không thêm tenten, maru hay âm ghép.')}</p>
            ) : null}
          </div>
        )}
        {dialogItem && (
          <KanaStrokeDialog
            key={kanaType + '-' + dialogItem.kanaCharacterId}
            item={dialogItem}
            type={kanaLabel}
            tab={writingTab}
            onTabChange={setWritingTab}
            onClose={() => setOpenedKana(null)}
            onSubmitResult={kana.submitResult}
            lastResult={kana.lastResult}
            saveError={kana.error}
            onNext={nextKana ? () => openKana(nextKana, dialogIndex + 1, true, writingTab) : undefined}
          />
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
      <div className="min-h-[calc(100vh-4rem)] bg-rp-bg-2">{content}</div>
    </LearnerShell>
  );
}
