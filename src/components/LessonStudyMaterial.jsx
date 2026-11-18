import LearnerFeedbackPanel from './LearnerFeedbackPanel.jsx';

export default function LessonStudyMaterial({ detail }) {
  const { content, vocabularies = [], kanjis = [], grammars = [] } = detail;
  const groups = [
    { type: 'vocabulary', title: 'Từ vựng', items: vocabularies.map(item => ({
      id: item.vocabularyId,
      label: [item.word, item.reading, item.meaning].filter(Boolean).join(' · '),
      example: item.exampleSentence,
      translation: item.exampleSentenceMeaning,
      audioUrl: item.audioUrl,
    })) },
    { type: 'kanji', title: 'Hán tự', items: kanjis.map(item => ({
      id: item.kanjiId,
      label: [item.character, item.meaning].filter(Boolean).join(' · '),
      notes: [
        item.sinoVietnamese && 'Âm Hán Việt ' + item.sinoVietnamese,
        item.onYomi && 'On ' + item.onYomi,
        item.kunYomi && 'Kun ' + item.kunYomi,
        item.strokeCount > 0 && item.strokeCount + ' nét',
      ].filter(Boolean).join(' · '),
      imageUrl: item.strokeOrderImageUrl,
      audioUrl: item.audioUrl,
    })) },
    { type: 'grammar', title: 'Ngữ pháp', items: grammars.map(item => ({
      id: item.grammarPatternId,
      label: [item.title, item.structure].filter(Boolean).join(' · '),
      notes: item.usageNotes,
      example: item.exampleSentence,
      translation: item.exampleSentenceMeaning,
    })) },
  ];
  const availableGroups = groups.filter(group => group.items.length > 0);

  return <div className="space-y-4 text-sm leading-relaxed">
    {content && <p className="whitespace-pre-wrap">{content}</p>}
    {detail.audioUrl && <section aria-labelledby={'audio-lesson-' + detail.lessonId}>
      <h3 id={'audio-lesson-' + detail.lessonId} className="font-bold text-primary">Audio bài học</h3>
      <audio className="mt-2 max-w-full" controls preload="none" aria-label={'Nghe ' + detail.title} src={detail.audioUrl} />
    </section>}
    {availableGroups.map(group => <section key={group.title}>
      <h3 className="font-bold text-primary">{group.title} ({group.items.length})</h3>
      <ul className="mt-1 divide-y divide-card-border">
        {group.items.map(item => <li key={item.id} className="py-2">
          <p className="font-semibold">{item.label}</p>
          {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
          {item.example && <p lang="ja" className="mt-1 whitespace-pre-wrap">{item.example}</p>}
          {item.translation && <p className="whitespace-pre-wrap text-[#765E6B]">{item.translation}</p>}
          {item.imageUrl && <img className="mt-1 max-h-28 max-w-full" src={item.imageUrl}
            alt={'Thứ tự nét ' + item.label} loading="lazy" />}
          {item.audioUrl && <audio className="mt-1 max-w-full" controls preload="none"
            aria-label={'Nghe ' + item.label} src={item.audioUrl} />}
          <LearnerFeedbackPanel type={group.type} id={item.id} label="Phản hồi về mục này" />
        </li>)}
      </ul>
    </section>)}
    {!availableGroups.length && <p className="text-[#765E6B]">
      {content || detail.audioUrl
        ? 'Bài này chưa có Hán tự, từ vựng hoặc ngữ pháp được liên kết.'
        : 'Bài này chưa có nội dung tự học.'}
    </p>}
  </div>;
}
