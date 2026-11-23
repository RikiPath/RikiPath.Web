export const SKILL_TEMPLATES = {
  Vocabulary: [
    { value: 'VocabMeaning', label: 'Từ vựng · Nhận diện nghĩa' },
    { value: 'VocabReading', label: 'Từ vựng · Cách đọc (Kana)' },
    { value: 'VocabContextFill', label: 'Từ vựng · Điền từ vào ngữ cảnh' },
    { value: 'VocabUsage', label: 'Từ vựng · Cách dùng từ' },
  ],
  Kanji: [
    { value: 'KanjiReading', label: 'Hán tự · Chọn cách đọc' },
    { value: 'KanjiMeaning', label: 'Hán tự · Nhận diện chữ Hán' },
    { value: 'KanjiContextSelect', label: 'Hán tự · Hán tự theo ngữ cảnh' },
  ],
  Grammar: [
    { value: 'GrammarMultipleChoice', label: 'Ngữ pháp · Trắc nghiệm cấu trúc' },
    { value: 'GrammarFillBlank', label: 'Ngữ pháp · Điền vào chỗ trống' },
    { value: 'GrammarOrdering', label: 'Ngữ pháp · Sắp xếp câu (★)' },
  ],
  Reading: [
    { value: 'ReadingPassageMcq', label: 'Đọc hiểu · Đoạn văn + Nhóm câu hỏi' },
  ],
  Listening: [
    { value: 'ListeningAudioMcq', label: 'Nghe hiểu · Audio + Trắc nghiệm' },
    { value: 'ListeningVisualMcq', label: 'Nghe hiểu · Trắc nghiệm có hình ảnh' },
  ],
};

export function blankOption(sortOrder, isCorrect = false) {
  return { sortOrder, optionText: '', imageUrl: '', isCorrect };
}

export function createBlankCanonicalQuestion(skillName = 'Vocabulary', levelCode = 'N4') {
  const defaultTemplate = SKILL_TEMPLATES[skillName]?.[0]?.value || 'VocabMeaning';
  return {
    id: null,
    version: 1,
    publishStatus: 'Draft',
    certificateLevelCode: levelCode,
    skillName,
    templateKind: defaultTemplate,
    questionType: 'SingleChoice',
    questionText: '',
    explanation: '',
    topic: '',
    difficulty: 'Medium',
    sourceType: 'Manual',
    sourceReference: '',
    rightsStatus: 'Owned',
    audioUrl: '',
    audioTranscript: '',
    imageUrl: '',
    playbackPolicy: { maxReplays: 2, allowPause: true, allowSeek: false, showTranscriptAfterSubmit: true },
    options: [blankOption(1, true), blankOption(2, false), blankOption(3, false), blankOption(4, false)],
    skillMetadata: {
      word: '',
      reading: '',
      meaning: '',
      kanjiCharacter: '',
      sinoVietnamese: '',
      onYomi: '',
      kunYomi: '',
      strokeCount: null,
      grammarPattern: '',
      structure: '',
      usageExplanation: '',
      exampleSentence: '',
      exampleSentenceMeaning: '',
      acceptedAnswers: [''],
      orderingTokens: ['', '', '', ''],
      orderingAnswer: ['', '', '', ''],
      starIndexZeroBased: 2,
    },
  };
}

export function createBlankPassageGroup(skillName = 'Reading', levelCode = 'N4') {
  return {
    passage: {
      id: null,
      passageCode: '',
      certificateLevelCode: levelCode,
      skillName,
      title: '',
      topic: '',
      passageText: '',
      instructions: skillName === 'Reading'
        ? 'Đọc đoạn văn sau và chọn đáp án đúng cho từng câu hỏi.'
        : 'Nghe audio và chọn đáp án đúng nhất.',
      listeningSection: skillName === 'Listening' ? 'Mondai 1' : '',
      audioUrl: '',
      audioDurationSeconds: null,
      audioTranscript: '',
      imageUrl: '',
      playbackPolicy: { maxReplays: 2, allowPause: true, allowSeek: false, showTranscriptAfterSubmit: true },
      sourceType: 'Manual',
      sourceReference: '',
      rightsStatus: 'Owned',
    },
    questionGroupTitle: skillName === 'Reading' ? 'Nhóm câu hỏi đọc hiểu' : 'Nhóm câu hỏi nghe hiểu',
    questions: [createBlankCanonicalQuestion(skillName, levelCode)],
  };
}
