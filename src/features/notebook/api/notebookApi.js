import { api } from '@/api/client.js';

function resultOf(data) {
  return data?.result ?? data?.Result ?? null;
}

// =============================================================================
// Personal Notebook V3 Endpoints (Folder -> File -> Page -> Saved Item)
// =============================================================================

export async function getNotebookTree() {
  const data = await api.get('/Notebook/tree');
  return resultOf(data);
}

export async function getNotebookFolders() {
  const data = await api.get('/Notebook/folders');
  const result = resultOf(data);
  return Array.isArray(result) ? result : [];
}

export async function createNotebookFolder(payload) {
  const data = await api.post('/Notebook/folders', payload);
  return resultOf(data);
}

export async function updateNotebookFolder(folderId, payload) {
  const data = await api.put(`/Notebook/folders/${folderId}`, payload);
  return resultOf(data);
}

export function deleteNotebookFolder(folderId, { cascade = false } = {}) {
  return api.delete(`/Notebook/folders/${folderId}`, { params: { cascade } });
}

export async function getNotebookFile(fileId) {
  const data = await api.get(`/Notebook/files/${fileId}`);
  return resultOf(data);
}

export async function createNotebookFile(payload) {
  const data = await api.post('/Notebook/files', payload);
  return resultOf(data);
}

export async function updateNotebookFile(fileId, payload) {
  const data = await api.put(`/Notebook/files/${fileId}`, payload);
  return resultOf(data);
}

export function deleteNotebookFile(fileId, { cascade = false } = {}) {
  return api.delete(`/Notebook/files/${fileId}`, { params: { cascade } });
}

export async function getNotebookPage(pageId) {
  const data = await api.get(`/Notebook/pages/${pageId}`);
  return resultOf(data);
}

export async function createNotebookPage(payload) {
  const data = await api.post('/Notebook/pages', payload);
  return resultOf(data);
}

export async function updateNotebookPage(pageId, payload) {
  const data = await api.put(`/Notebook/pages/${pageId}`, payload);
  return resultOf(data);
}

export async function toggleNotebookPageFavorite(pageId, isFavorite) {
  const data = await api.patch(`/Notebook/pages/${pageId}/favorite`, { isFavorite });
  return resultOf(data);
}

export function deleteNotebookPage(pageId) {
  return api.delete(`/Notebook/pages/${pageId}`);
}

export async function getFavoriteNotebookPages() {
  const data = await api.get('/Notebook/pages/favorites');
  const result = resultOf(data);
  return Array.isArray(result) ? result : [];
}

export async function getSavedNotebookItems(params = {}) {
  const data = await api.get('/Notebook/saved-items', { params });
  return resultOf(data);
}

export async function searchNotebook(q, limit = 20) {
  const data = await api.get('/Notebook/search', { params: { q, limit } });
  return resultOf(data);
}

export async function quickSaveToNotebook(payload) {
  const data = await api.post('/Notebook/quick-save', payload);
  return resultOf(data);
}

// =============================================================================
// Legacy + Shared Compatibility Endpoints
// =============================================================================

export async function getNotebookLists() {
  const data = await api.get('/Notebook/lists');
  const result = resultOf(data);
  return Array.isArray(result) ? result : [];
}

export async function createNotebookList(payload) {
  const data = await api.post('/Notebook/lists', payload);
  return resultOf(data);
}

export async function updateNotebookList(listId, payload) {
  const data = await api.put(`/Notebook/lists/${listId}`, payload);
  return resultOf(data);
}

export async function bookmarkVocabulary({ learnerNoteId = 0, notebookPageId = null, vocabularyId, enrollSrs = false }) {
  const data = await api.post('/Notebook/bookmark/vocabulary', {
    learnerNoteId,
    notebookPageId,
    vocabularyId,
    enrollSrs,
  });
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

export async function updateNotebookEntry(noteEntryId, payload) {
  const data = await api.put(`/Notebook/entries/${noteEntryId}`, payload);
  return resultOf(data);
}

export async function enrollNotebookEntryToSrs(noteEntryId) {
  const data = await api.post(`/Notebook/entries/${noteEntryId}/srs`);
  return resultOf(data);
}

export function removeNotebookEntry(noteEntryId) {
  return api.delete(`/Notebook/entries/${noteEntryId}`);
}

export async function bookmarkKanji({ learnerNoteId = 0, notebookPageId = null, kanjiId, enrollSrs = false }) {
  const data = await api.post('/Notebook/bookmark/kanji', {
    learnerNoteId,
    notebookPageId,
    kanjiId,
    enrollSrs,
  });
  return resultOf(data);
}

export async function bookmarkGrammar(grammarPatternId) {
  const data = await api.post(`/Notebook/bookmark/grammar/${grammarPatternId}`);
  return resultOf(data);
}

export function deleteNotebookList(listId) {
  return api.delete(`/Notebook/lists/${listId}`);
}
