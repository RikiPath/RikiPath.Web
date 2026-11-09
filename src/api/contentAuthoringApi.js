import { api } from './client.js';

const result = (data) => data?.result ?? data;

export function planContent(prompt) {
  return api.post('/content-authoring/plan', { prompt }).then(result);
}

export function executeContentPlan(tasks) {
  return api.post('/content-authoring/plan/execute', { tasks }).then(result);
}

export function confirmContentPlan(body) {
  return api.post('/content-authoring/plan/confirm', body).then(result);
}

export function suggestKanji({ prompt, maxItems = 8, lessonId, certificateLevelId }) {
  return api.post('/content-authoring/kanji/suggest', {
    prompt,
    maxItems,
    ...(lessonId ? { lessonId } : {}),
    ...(certificateLevelId ? { certificateLevelId } : {}),
  }).then(result);
}

export function confirmKanjiSuggestions(body) {
  return api.post('/content-authoring/kanji/confirm', body).then(result);
}

export function scanContentAccuracy(batchId) {
  return api.post('/content-authoring/scan-accuracy', batchId ? { batchId } : {}).then(result);
}

export function toConfirmPlanBody(results) {
  const body = {
    kanjiGroups: [],
    vocabularyGroups: [],
    grammarGroups: [],
    lessons: [],
    practiceExercises: [],
    mockTests: [],
  };

  for (const row of results || []) {
    if (row.status !== 'Succeeded') continue;
    if (row.kanji?.length) {
      body.kanjiGroups.push({
        certificateLevelId: row.certificateLevelId ?? undefined,
        lessonId: row.existingLessonId ?? undefined,
        items: row.kanji.map((item) => ({
          character: item.character,
          meaning: item.meaning,
          sinoVietnamese: item.sinoVietnamese,
          onYomi: item.onYomi,
          kunYomi: item.kunYomi,
          strokeCount: item.strokeCount || 0,
          isDuplicate: Boolean(item.isDuplicate),
          existingKanjiId: item.existingKanjiId ?? undefined,
        })),
      });
    }
    if (row.vocabulary?.length) {
      body.vocabularyGroups.push({
        certificateLevelId: row.certificateLevelId ?? undefined,
        lessonId: row.existingLessonId ?? undefined,
        items: row.vocabulary.map((item) => ({
          word: item.word,
          reading: item.reading,
          meaning: item.meaning,
          exampleSentence: item.exampleSentence,
          exampleSentenceMeaning: item.exampleSentenceMeaning,
          isDuplicate: Boolean(item.isDuplicate),
          existingVocabularyId: item.existingVocabularyId ?? undefined,
        })),
      });
    }
    if (row.grammar?.length) {
      body.grammarGroups.push({
        certificateLevelId: row.certificateLevelId ?? undefined,
        lessonId: row.existingLessonId ?? undefined,
        items: row.grammar.map((item) => ({
          title: item.title,
          structure: item.structure,
          usageNotes: item.usageNotes,
          exampleSentence: item.exampleSentence,
          exampleSentenceMeaning: item.exampleSentenceMeaning,
          isDuplicate: Boolean(item.isDuplicate),
          existingGrammarPatternId: item.existingGrammarPatternId ?? undefined,
        })),
      });
    }
    if (row.lesson) {
      const lesson = row.lesson;
      const idsOf = (list) => (list || []).filter((item) => item.existingId).map((item) => item.existingId);
      body.lessons.push({
        certificateLevelId: lesson.certificateLevelId,
        languageSkillId: lesson.languageSkillId,
        title: lesson.title,
        description: lesson.description,
        sortOrder: lesson.sortOrder || 0,
        kanjiIds: idsOf(lesson.kanji),
        vocabularyIds: idsOf(lesson.vocabulary),
        grammarPatternIds: idsOf(lesson.grammar),
        newKanji: (lesson.kanji || []).filter((item) => !item.existingId).map((item) => item.key),
        newVocabulary: (lesson.vocabulary || []).filter((item) => !item.existingId).map((item) => ({
          word: item.key,
          reading: item.reading || '',
        })),
        newGrammar: (lesson.grammar || []).filter((item) => !item.existingId).map((item) => item.key),
      });
    }
    if (row.practiceExercise) {
      const exercise = row.practiceExercise;
      body.practiceExercises.push({
        existingLessonId: exercise.existingLessonId ?? undefined,
        newLessonTitle: exercise.existingLessonId ? undefined : exercise.newLessonTitle,
        languageSkillId: exercise.languageSkillId,
        title: exercise.title,
        description: exercise.description,
        questions: exercise.questions || [],
      });
    }
    if (row.mockTest) {
      const test = row.mockTest;
      body.mockTests.push({
        certificateLevelId: test.certificateLevelId,
        title: test.title,
        timeLimitMinutes: test.timeLimitMinutes,
        sections: (test.sections || []).map((section) => ({
          title: section.title,
          sortOrder: section.sortOrder,
          certificateSectionId: section.certificateSectionId,
          languageSkillId: section.languageSkillId,
          questions: section.questions || [],
        })),
      });
    }
  }

  return body;
}
