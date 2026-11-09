import { api } from './client.js';

const result = (data) => data?.result ?? data;

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
