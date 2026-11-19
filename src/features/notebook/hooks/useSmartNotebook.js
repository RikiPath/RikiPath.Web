import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/app/auth/session.js';
import {
  addNotebookEntry,
  bookmarkGrammar,
  bookmarkKanji,
  bookmarkVocabulary,
  createNotebookList,
  deleteNotebookList,
  enrollNotebookEntryToSrs,
  getNotebookEntries,
  getNotebookLists,
  removeNotebookEntry,
  updateNotebookEntry,
  updateNotebookList,
} from '@/features/notebook/api/notebookApi.js';
import {
  computeContentVersionHash,
  DEFAULT_FOLDER_NAME,
  parseNotebookEntry,
  parseNotebookList,
  serializeEntryNote,
  serializeNotebookList,
} from '@/features/notebook/utils/notebookModel.js';

export const NOTEBOOK_LISTS_QUERY_KEY = 'notebook-lists';
export const NOTEBOOK_ENTRIES_QUERY_KEY = 'notebook-entries';

/**
 * Shared React Query Smart Notebook workspace controller.
 * Persists all data in PostgreSQL via Backend API using the exact same LearnerNote / LearnerNoteEntry
 * endpoints as RikiPath.Mobile so Web and Mobile always stay in sync.
 */
export function useSmartNotebook({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const signedIn = Boolean(session?.accessToken) && !session?.isPreview && String(session?.role || '').toLowerCase() === 'learner';
  const active = Boolean(enabled && signedIn);

  const [saveState, setSaveState] = useState({ status: 'idle', error: '', updatedAt: null });

  const listsQuery = useQuery({
    queryKey: [NOTEBOOK_LISTS_QUERY_KEY, uid],
    queryFn: getNotebookLists,
    enabled: active,
    staleTime: 30_000,
  });

  const rawLists = useMemo(() => (Array.isArray(listsQuery.data) ? listsQuery.data : []), [listsQuery.data]);
  const notePages = useMemo(() => rawLists.map(parseNotebookList).filter(Boolean), [rawLists]);

  const entryQueries = useQueries({
    queries: notePages.map((page) => ({
      queryKey: [NOTEBOOK_ENTRIES_QUERY_KEY, uid, page.id],
      queryFn: () => getNotebookEntries(page.id),
      enabled: active && Boolean(page.id),
      staleTime: 30_000,
    })),
  });

  const entriesByPageId = useMemo(() => {
    const map = new Map();
    notePages.forEach((page, idx) => {
      const raw = entryQueries[idx]?.data;
      const parsed = (Array.isArray(raw) ? raw : []).map((row) => parseNotebookEntry(row, page.id)).filter(Boolean);
      map.set(page.id, parsed);
    });
    return map;
  }, [notePages, entryQueries]);

  const allEntries = useMemo(() => {
    const list = [];
    for (const page of notePages) {
      const items = entriesByPageId.get(page.id) || [];
      for (const item of items) {
        list.push({
          ...item,
          notePageTitle: page.title,
          folderName: page.folder || DEFAULT_FOLDER_NAME,
        });
      }
    }
    return list.sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
  }, [notePages, entriesByPageId]);

  const loadingEntries = entryQueries.some((q) => q.isPending);

  const invalidateAll = useCallback(async (pageId = null) => {
    await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_LISTS_QUERY_KEY, uid] });
    if (pageId) {
      await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_ENTRIES_QUERY_KEY, uid, pageId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_ENTRIES_QUERY_KEY, uid] });
    }
    await queryClient.invalidateQueries({ queryKey: ['kanji-saved', uid] });
  }, [queryClient, uid]);

  const markSaving = () => setSaveState((prev) => ({ ...prev, status: 'saving', error: '' }));
  const markSaved = () => setSaveState({ status: 'saved', error: '', updatedAt: new Date().toISOString() });
  const markError = (err) => setSaveState((prev) => ({ ...prev, status: 'error', error: err?.message || 'Chưa lưu được thay đổi.' }));

  const createNotePage = useMutation({
    mutationFn: async ({ title, folder = DEFAULT_FOLDER_NAME, summary = '', body = '', tags = [], favorite = false, sourcePath = '', sourceTitle = '' }) => {
      markSaving();
      const payload = serializeNotebookList({ title, folder, summary, body, tags, favorite, sourcePath, sourceTitle });
      return createNotebookList(payload);
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const updateNotePage = useMutation({
    mutationFn: async ({ id, title, folder, summary, body, tags, favorite, sourcePath, sourceTitle }) => {
      markSaving();
      const payload = serializeNotebookList({ title, folder, summary, body, tags, favorite, sourcePath, sourceTitle });
      return updateNotebookList(id, payload);
    },
    onSuccess: async (_, vars) => {
      await invalidateAll(vars.id);
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const removeNotePage = useMutation({
    mutationFn: async (id) => {
      markSaving();
      return deleteNotebookList(id);
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const ensureTargetNotePage = useCallback(async ({ targetNoteId, newNoteTitle, folderName }) => {
    if (newNoteTitle && String(newNoteTitle).trim()) {
      const created = await createNotebookList(
        serializeNotebookList({
          title: newNoteTitle.trim(),
          folder: folderName || DEFAULT_FOLDER_NAME,
        })
      );
      if (created?.id) return created.id;
    }
    if (targetNoteId) return Number(targetNoteId);
    if (notePages[0]?.id) return notePages[0].id;
    const fallback = await createNotebookList(
      serializeNotebookList({
        title: 'Ghi chú học tập',
        folder: folderName || DEFAULT_FOLDER_NAME,
      })
    );
    return fallback?.id;
  }, [notePages]);

  const quickSaveCapture = useMutation({
    mutationFn: async ({
      targetNoteId,
      newNoteTitle,
      folderName = DEFAULT_FOLDER_NAME,
      kind = 'highlight',
      term,
      reading = '',
      meaning = '',
      personalNote = '',
      example = '',
      exampleMeaning = '',
      color = 'rose',
      tags = [],
      sourcePath = '',
      sourceTitle = '',
      contentId = '',
      contentTextForVersion = '',
      anchorPrefix = '',
      anchorSuffix = '',
      vocabularyId = null,
      kanjiId = null,
      grammarPatternId = null,
      enrollSrs = false,
    }) => {
      markSaving();
      const learnerNoteId = await ensureTargetNotePage({ targetNoteId, newNoteTitle, folderName });
      const cleanTerm = String(term || '').trim();
      if (!cleanTerm) throw new Error('Nội dung cần lưu không được để trống.');

      if (vocabularyId && !personalNote && !anchorPrefix) {
        return bookmarkVocabulary({ learnerNoteId, vocabularyId });
      }
      if (kanjiId && !personalNote && !anchorPrefix) {
        return bookmarkKanji({ learnerNoteId, kanjiId });
      }

      const contentVersion = contentTextForVersion
        ? computeContentVersionHash(contentTextForVersion)
        : '';

      const encodedNote = serializeEntryNote({
        personalNote,
        kind,
        color,
        example,
        exampleMeaning,
        tags,
        sourcePath,
        sourceTitle,
        contentId,
        contentVersion,
        anchorPrefix,
        anchorSuffix,
        grammarPatternId,
      });

      const resolvedMeaning = String(meaning || '').trim() || (
        kind === 'highlight'
          ? 'Đoạn đánh dấu từ bài học'
          : kind === 'note'
            ? 'Ghi chú học tập'
            : kind === 'grammar'
              ? 'Mẫu ngữ pháp đã lưu'
              : 'Từ vựng đã lưu'
      );

      if (grammarPatternId && enrollSrs) {
        try {
          await bookmarkGrammar(grammarPatternId);
        } catch {
          // Best-effort grammar SRS card; manual entry in the selected note still persists.
        }
      }

      return addNotebookEntry({
        learnerNoteId,
        word: cleanTerm.slice(0, 200),
        reading: reading ? String(reading).trim().slice(0, 200) : null,
        meaning: resolvedMeaning.slice(0, 500),
        note: encodedNote,
        enrollSrs: Boolean(enrollSrs),
      });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ noteEntryId, learnerNoteId, word, reading, meaning, personalNote, meta }) => {
      markSaving();
      const note = serializeEntryNote({
        ...(meta || {}),
        personalNote: personalNote ?? '',
      });
      return updateNotebookEntry(noteEntryId, {
        learnerNoteId: learnerNoteId ?? null,
        word: word ?? null,
        reading: reading ?? null,
        meaning: meaning ?? null,
        note,
      });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const enrollToSrs = useMutation({
    mutationFn: async (noteEntryId) => {
      markSaving();
      return enrollNotebookEntryToSrs(noteEntryId);
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const deleteEntry = useMutation({
    mutationFn: async (noteEntryId) => {
      markSaving();
      return removeNotebookEntry(noteEntryId);
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const highlightsForPath = useCallback((pathnameWithSearch = '') => {
    const cleanTarget = String(pathnameWithSearch || '').replace(/\/+(?=\?|$)/, '') || '/';
    return allEntries.filter((entry) => {
      if (!entry.sourcePath) return false;
      const cleanSource = String(entry.sourcePath).replace(/\/+(?=\?|$)/, '') || '/';
      return cleanSource === cleanTarget || (entry.kind === 'highlight' && cleanSource.split('?')[0] === cleanTarget.split('?')[0] && cleanTarget === cleanSource);
    });
  }, [allEntries]);

  return {
    uid,
    signedIn,
    active,
    listsQuery,
    notePages,
    entriesByPageId,
    allEntries,
    loadingEntries,
    saveState,
    refetchAll: invalidateAll,
    createNotePage,
    updateNotePage,
    removeNotePage,
    quickSaveCapture,
    updateEntry,
    enrollToSrs,
    deleteEntry,
    highlightsForPath,
  };
}
