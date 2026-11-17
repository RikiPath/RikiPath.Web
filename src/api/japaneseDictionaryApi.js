import { api } from './client.js';

function result(response) {
  return response?.result ?? response;
}

export async function searchJapaneseDictionary(readingKana) {
  return result(await api.get('/japanese-dictionary/search', {
    params: { readingKana },
  }));
}

export async function addPersonalDictionaryEntry() {
  throw new Error('Backend không có API từ điển cá nhân.');
}
