import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkPlus, Check, ChevronDown, FileText, PenLine } from 'lucide-react';
import { Badge, Button, Collapsible, cx } from '@/components/ui';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';
import { useLocale } from '@/locales/locale.js';
import { itemKey } from '../lessonContentModel.js';

function Highlight({ text, id, source }) {
  if (!text) return null;
  return <HighlightableText text={text} contentId={id} sourceTitle={source} />;
}

function AudioLine({ src, label }) {
  if (!src) return null;
  return <audio className="mt-2 h-9 w-full max-w-sm" controls preload="none" aria-label={label} src={src} />;
}

function ExampleBlock({ example, translation, idPrefix, source }) {
  if (!example && !translation) return null;
  return (
    <div className="mt-2.5 rounded-xl bg-rp-bg-2 px-3 py-2">
      {example && (
        <p lang="ja" className="rp-jp whitespace-pre-wrap break-words text-[15px] leading-7 text-rp-text">
          <Highlight text={example} id={`${idPrefix}-ex`} source={source} />
        </p>
      )}
      {translation && (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-rp-text-2">
          <Highlight text={translation} id={`${idPrefix}-tr`} source={source} />
        </p>
      )}
    </div>
  );
}

function VocabularyCard({ item, lessonId, source }) {
  const { trf } = useLocale();
  const id = `lesson-${lessonId}-vocab-${item.vocabularyId}`;
  return (
    <li className="rounded-rp-card border border-rp-line bg-white p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p lang="ja" className="rp-jp text-[24px] font-semibold leading-tight text-rp-text">
          <Highlight text={item.word} id={`${id}-word`} source={source} />
        </p>
        {item.reading && item.reading !== item.word && (
          <p lang="ja" className="rp-jp text-[15px] text-rp-brand-strong">{item.reading}</p>
        )}
      </div>
      {item.meaning && (
        <p className="mt-1 text-[15px] font-medium leading-6 text-rp-text-2">
          <Highlight text={item.meaning} id={`${id}-meaning`} source={source} />
        </p>
      )}
      <ExampleBlock example={item.exampleSentence} translation={item.exampleSentenceMeaning} idPrefix={id} source={source} />
      {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="mt-2 max-h-32 rounded-xl border border-rp-line" />}
      <AudioLine src={item.audioUrl} label={trf('Nghe {0}', { 0: item.word })} />
    </li>
  );
}

function KanjiCard({ item, lessonId, source }) {
  const { tr, trf } = useLocale();
  const id = `lesson-${lessonId}-kanji-${item.kanjiId}`;
  const readings = [
    item.onYomi && { label: 'On', value: item.onYomi },
    item.kunYomi && { label: 'Kun', value: item.kunYomi },
  ].filter(Boolean);
  return (
    <li className="flex gap-4 rounded-rp-card border border-rp-line bg-white p-4">
      <span lang="ja" className="rp-jp flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint text-[44px] text-rp-brand-strong">
        {item.character}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-6 text-rp-text">
          <Highlight text={item.meaning} id={`${id}-meaning`} source={source} />
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.sinoVietnamese && <Badge tone="brand" size="sm" icon={false}>{trf('Âm Hán Việt {0}', { 0: item.sinoVietnamese })}</Badge>}
          {readings.map((reading) => (
            <span key={reading.label} className="rounded-full border border-rp-line px-2 py-0.5 text-[12px] text-rp-text-2">
              {reading.label} <span lang="ja" className="rp-jp">{reading.value}</span>
            </span>
          ))}
          {item.strokeCount > 0 && <Badge tone="neutral" size="sm" icon={false}>{trf('{0} nét', { 0: item.strokeCount })}</Badge>}
        </div>
        {item.strokeOrderImageUrl && (
          <img className="mt-2 max-h-28 max-w-full rounded-lg border border-rp-line" src={item.strokeOrderImageUrl} alt={trf('Thứ tự nét {0}', { 0: item.character })} loading="lazy" />
        )}
        <AudioLine src={item.audioUrl} label={trf('Nghe {0}', { 0: item.character })} />
        <Link to="/kanji-writing/?type=kanji" className="rp-link mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold">
          <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Luyện viết Hán tự')}
        </Link>
      </div>
    </li>
  );
}

function GrammarCard({ item, lessonId, source, bookmarkState, onBookmark }) {
  const { tr } = useLocale();
  const id = `lesson-${lessonId}-grammar-${item.grammarPatternId}`;
  const showTitle = item.title && item.title !== item.structure;
  return (
    <li className="rounded-rp-card border border-rp-line bg-white p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-rp-brand-strong">{tr('Mẫu ngữ pháp')}</p>
      <p lang="ja" className="rp-jp mt-1 text-[20px] font-semibold leading-8 text-rp-text">
        <Highlight text={item.structure || item.title} id={`${id}-structure`} source={source} />
      </p>
      {showTitle && (
        <p className="mt-0.5 text-[14.5px] font-medium text-rp-text-2">
          <Highlight text={item.title} id={`${id}-title`} source={source} />
        </p>
      )}
      {item.usageNotes && (
        <div className="mt-2">
          <p className="text-[12px] font-semibold text-rp-text-muted">{tr('Cách dùng')}</p>
          <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-rp-text-2">
            <Highlight text={item.usageNotes} id={`${id}-notes`} source={source} />
          </p>
        </div>
      )}
      <ExampleBlock example={item.exampleSentence} translation={item.exampleSentenceMeaning} idPrefix={id} source={source} />
      {item.grammarPatternId && onBookmark && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          icon={bookmarkState === 'saved' ? Check : BookmarkPlus}
          disabled={bookmarkState === 'saving' || bookmarkState === 'saved'}
          onClick={() => onBookmark(item.grammarPatternId, itemKey('grammar', item))}
        >
          {bookmarkState === 'saved' ? tr('Đã đưa vào ôn SRS') : bookmarkState === 'saving' ? tr('Đang lưu…') : tr('Đưa ngữ pháp vào ôn SRS')}
        </Button>
      )}
    </li>
  );
}

/** Lesson body: reading passage / listening audio (transcript collapsed) / video / attachment. */
function LessonBody({ detail, skillName, source, videoProps }) {
  const { tr, trf } = useLocale();
  const isListening = skillName === 'Listening';
  const [transcriptOpen, setTranscriptOpen] = useState(!isListening);
  const content = detail.content?.trim();
  return (
    <div className="space-y-4">
      {detail.videoUrl && (
        <video key={detail.lessonId} className="w-full rounded-rp-card bg-black" controls src={detail.videoUrl} {...videoProps} />
      )}
      {detail.audioUrl && (
        <section className="rounded-rp-card border border-rp-line bg-white p-4">
          <p className="text-[13px] font-semibold text-rp-text">{isListening ? tr('Bài nghe') : tr('Audio bài học')}</p>
          <audio className="mt-2 w-full" controls preload="none" aria-label={trf('Nghe {0}', { 0: detail.title })} src={detail.audioUrl} />
        </section>
      )}
      {content && (
        <section className="rounded-rp-card border border-rp-line bg-white p-4 sm:p-5">
          {isListening ? (
            <>
              <button
                type="button"
                aria-expanded={transcriptOpen}
                onClick={() => setTranscriptOpen((value) => !value)}
                className="rp-focus flex w-full items-center justify-between gap-2 rounded-lg text-left text-[13px] font-semibold text-rp-text"
              >
                <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-rp-brand-strong" aria-hidden="true" />{tr('Nội dung bài nghe')}</span>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-rp-text-muted">
                  {transcriptOpen ? tr('Ẩn') : tr('Hiện sau khi đã nghe')}
                  <ChevronDown className={cx('h-4 w-4 transition-transform', transcriptOpen && 'rotate-180')} aria-hidden="true" />
                </span>
              </button>
              <Collapsible open={transcriptOpen}>
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-rp-text">
                  <Highlight text={content} id={`lesson-${detail.lessonId}-content`} source={source} />
                </p>
              </Collapsible>
            </>
          ) : (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-rp-text">
              <Highlight text={content} id={`lesson-${detail.lessonId}-content`} source={source} />
            </p>
          )}
        </section>
      )}
      {detail.attachmentUrl && (
        <a href={detail.attachmentUrl} target="_blank" rel="noreferrer" className="rp-link inline-flex items-center gap-1.5 text-[13px] font-semibold">
          <FileText className="h-4 w-4" aria-hidden="true" />
          {tr('Mở tài liệu đính kèm')}
        </a>
      )}
    </div>
  );
}

/** Renders one study page of the Lesson Player with the variant matching its knowledge type. */
export default function LessonKnowledgeSections({ page, detail, skillName, bookmarkStates = {}, onBookmarkGrammar, videoProps }) {
  const { tr } = useLocale();
  if (!page || !detail) return null;
  const source = detail.title ? tr(detail.title) : tr('Bài học');

  if (page.part === 'content') {
    return <LessonBody detail={detail} skillName={skillName} source={source} videoProps={videoProps} />;
  }
  return (
    <ul className="grid gap-3">
      {page.items.map((item) => {
        const key = itemKey(page.part, item);
        if (page.part === 'vocab') return <VocabularyCard key={key} item={item} lessonId={detail.lessonId} source={source} />;
        if (page.part === 'kanji') return <KanjiCard key={key} item={item} lessonId={detail.lessonId} source={source} />;
        return (
          <GrammarCard
            key={key}
            item={item}
            lessonId={detail.lessonId}
            source={source}
            bookmarkState={bookmarkStates[key]}
            onBookmark={onBookmarkGrammar}
          />
        );
      })}
    </ul>
  );
}
