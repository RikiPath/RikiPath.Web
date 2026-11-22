
import { useLocale } from '@/locales/locale.js';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';

export default function LessonStudyMaterial({ detail }) {
  const { tr, trf } = useLocale();
  const { content, vocabularies = [], kanjis = [], grammars = [] } = detail;
  const lessonSourceTitle = detail?.title ? tr(detail.title) : tr('Bài học');
  const groups = [
    {
      title: 'Từ vựng',
      items: vocabularies.map((item) => ({
        id: item.vocabularyId,
        contentKey: `lesson-${detail.lessonId}-vocab-${item.vocabularyId}`,
        label: [item.word, item.reading, item.meaning].filter(Boolean).join(' · '),
        example: item.exampleSentence,
        translation: item.exampleSentenceMeaning,
        audioUrl: item.audioUrl,
      })),
    },
    {
      title: 'Hán tự',
      items: kanjis.map((item) => ({
        id: item.kanjiId,
        contentKey: `lesson-${detail.lessonId}-kanji-${item.kanjiId}`,
        label: [item.character, item.meaning].filter(Boolean).join(' · '),
        notes: [
          item.sinoVietnamese && trf('Âm Hán Việt {0}', { 0: item.sinoVietnamese }),
          item.onYomi && `On ${item.onYomi}`,
          item.kunYomi && `Kun ${item.kunYomi}`,
          item.strokeCount > 0 && trf('{0} nét', { 0: item.strokeCount }),
        ].filter(Boolean).join(' · '),
        imageUrl: item.strokeOrderImageUrl,
        audioUrl: item.audioUrl,
      })),
    },
    {
      title: 'Ngữ pháp',
      items: grammars.map((item) => ({
        id: item.grammarPatternId,
        contentKey: `lesson-${detail.lessonId}-grammar-${item.grammarPatternId}`,
        label: [item.title, item.structure].filter(Boolean).join(' · '),
        notes: item.usageNotes,
        example: item.exampleSentence,
        translation: item.exampleSentenceMeaning,
      })),
    },
  ];
  const availableGroups = groups.filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {content && (
        <p className="whitespace-pre-wrap">
          <HighlightableText
            text={content}
            contentId={`lesson-${detail.lessonId}-content`}
            sourceTitle={lessonSourceTitle}
          />
        </p>
      )}
      {detail.audioUrl && (
        <section aria-labelledby={`audio-lesson-${detail.lessonId}`}>
          <h3 id={`audio-lesson-${detail.lessonId}`} className="font-bold text-rp-brand-strong">{tr('Audio bài học')}</h3>
          <audio className="mt-2 max-w-full" controls preload="none" aria-label={trf('Nghe {0}', { 0: detail.title })} src={detail.audioUrl} />
        </section>
      )}
      {availableGroups.map((group) => (
        <section key={group.title}>
          <h3 className="font-bold text-rp-brand-strong">{tr(group.title)} ({group.items.length})</h3>
          <ul className="mt-1 divide-y divide-rp-line">
            {group.items.map((item) => (
              <li key={item.id} className="py-2">
                <p className="font-semibold">
                  <HighlightableText text={item.label} contentId={`${item.contentKey}-label`} sourceTitle={lessonSourceTitle} />
                </p>
                {item.notes && (
                  <p className="whitespace-pre-wrap">
                    <HighlightableText text={item.notes} contentId={`${item.contentKey}-notes`} sourceTitle={lessonSourceTitle} />
                  </p>
                )}
                {item.example && (
                  <p lang="ja" className="mt-1 whitespace-pre-wrap">
                    <HighlightableText text={item.example} contentId={`${item.contentKey}-ex`} sourceTitle={lessonSourceTitle} />
                  </p>
                )}
                {item.translation && (
                  <p className="whitespace-pre-wrap text-rp-text-2">
                    <HighlightableText text={item.translation} contentId={`${item.contentKey}-tr`} sourceTitle={lessonSourceTitle} />
                  </p>
                )}
                {item.imageUrl && (
                  <img
                    className="mt-1 max-h-28 max-w-full"
                    src={item.imageUrl}
                    alt={`Thứ tự nét ${item.label}`}
                    loading="lazy"
                  />
                )}
                {item.audioUrl && (
                  <audio
                    className="mt-1 max-w-full"
                    controls
                    preload="none"
                    aria-label={`Nghe ${item.label}`}
                    src={item.audioUrl}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!availableGroups.length && (
        <p className="text-rp-text-2">
          {content || detail.audioUrl
            ? tr('Bài này chưa có Hán tự, từ vựng hoặc ngữ pháp được liên kết.')
            : tr('Bài này chưa có nội dung tự học.')}
        </p>
      )}
    </div>
  );
}
