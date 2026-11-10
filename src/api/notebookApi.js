import { api } from './client.js';

function resultOf(data) {
  return data?.result ?? data?.Result ?? null;
}

export async function getNotebookLists() {
  const data = await api.get('/Notebook/lists');
  const result = resultOf(data);
  return Array.isArray(result) ? result : [];
}

export async function createNotebookList(payload) {
  const data = await api.post('/Notebook/lists', payload);
  return resultOf(data);
}

export async function getNotebookEntries(listId) {
  const data = await api.get(`/Notebook/lists/${listId}/entries`);
  const result = resultOf(data);
  return Array.isArray(result) ? result : [];
}

export async function addNotebookEntry(payload) {
  const data = await api.post('/Notebook/entries', payload);
  return resultOf(data);
}

export function removeNotebookEntry(noteEntryId) {
  return api.delete(`/Notebook/entries/${noteEntryId}`);
}

export async function bookmarkKanji({ learnerNoteId, kanjiId }) {
  const data = await api.post('/Notebook/bookmark/kanji', { learnerNoteId, kanjiId });
  return resultOf(data);
}

export async function bookmarkGrammar(grammarPatternId) {
  const data = await api.post(`/Notebook/bookmark/grammar/${grammarPatternId}`);
  return resultOf(data);
}

export function deleteNotebookList(listId) {
  return api.delete(`/Notebook/lists/${listId}`);
}
