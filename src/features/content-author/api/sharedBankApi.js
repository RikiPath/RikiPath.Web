import { api } from '@/api/client.js';

const result = (data) => data?.result ?? data;

export function searchSharedBank(endpoint, { keyword = '', jlptLevelId, languageSkillId, questionType, page = 1, pageSize = 24 } = {}) {
  const payload = {
    keyword: keyword?.trim() || '',
    page,
    pageSize,
    ...(jlptLevelId ? { jlptLevelId: Number(jlptLevelId) } : {}),
    ...(languageSkillId ? { languageSkillId: Number(languageSkillId) } : {}),
    ...(questionType ? { questionType } : {}),
  };
  return api.post(endpoint, payload).then(result);
}

export function getSharedBankDetail(endpoint, id) {
  return api.get(`${endpoint}/${id}`).then(result);
}

export function searchVocabulary(keyword) {
  return api.post('/SharedBank/vocabulary/search', { keyword, page: 1, pageSize: 12 }).then(result);
}

export function getVocabulary(id) {
  return api.get(`/SharedBank/vocabulary/${id}`).then(result);
}

export function searchKanji(keyword) {
  return api.post('/SharedBank/kanji/search', { keyword, page: 1, pageSize: 12 }).then(result);
}

export function getKanji(id) {
  return api.get(`/SharedBank/kanji/${id}`).then(result);
}

export function searchGrammar(keyword) {
  return api.post('/SharedBank/grammar/search', { keyword, page: 1, pageSize: 12 }).then(result);
}

export function getGrammar(id) {
  return api.get(`/SharedBank/grammar/${id}`).then(result);
}

export function searchQuestions(filter) {
  return api.post('/SharedBank/questions/search', filter).then(result);
}

export function getQuestionDetail(id) {
  return api.get(`/SharedBank/questions/${id}`).then(result);
}
