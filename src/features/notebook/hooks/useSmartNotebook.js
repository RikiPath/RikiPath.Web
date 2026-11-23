import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '@/app/auth/session.js';
import {
  addNotebookEntry,
  bookmarkGrammar,
  bookmarkKanji,
  bookmarkVocabulary,
  createNotebookFile,
  createNotebookFolder,
  createNotebookPage,
  deleteNotebookFile,
  deleteNotebookFolder,
  deleteNotebookPage,
  enrollNotebookEntryToSrs,
  getFavoriteNotebookPages,
  getNotebookTree,
  getSavedNotebookItems,
  quickSaveToNotebook,
  removeNotebookEntry,
  toggleNotebookPageFavorite,
  updateNotebookEntry,
  updateNotebookFile,
  updateNotebookFolder,
  updateNotebookPage,
} from '@/features/notebook/api/notebookApi.js';
import {
  createHighlight,
  deleteHighlight,
  getHighlights,
  promoteHighlightToSrs,
  updateHighlight,
} from '@/features/notebook/api/highlightsApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import {
  DEFAULT_FOLDER_NAME,
  mapSavedItemDto,
  normalizeHighlightColorId,
} from '@/features/notebook/utils/notebookModel.js';

export const NOTEBOOK_TREE_QUERY_KEY = 'notebook-tree';
export const NOTEBOOK_PAGE_QUERY_KEY = 'notebook-page';
export const NOTEBOOK_FAVORITES_QUERY_KEY = 'notebook-favorites';
export const NOTEBOOK_SAVED_ITEMS_QUERY_KEY = 'notebook-saved-items';
export const NOTEBOOK_LISTS_QUERY_KEY = 'notebook-lists';
export const NOTEBOOK_ENTRIES_QUERY_KEY = 'notebook-entries';
export const LEARNER_HIGHLIGHTS_QUERY_KEY = 'learner-highlights';

/**
 * Shared React Query controller for Personal Notebook V3.
 * Supports Folder -> File -> Page -> Saved Item hierarchy, safe optimistic revision control,
 * and backward-compatible Floating Widget / Selection Capture access.
 */
export function useSmartNotebook({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const signedIn = Boolean(session?.accessToken) && !session?.isPreview && String(session?.role || '').toLowerCase() === 'learner';
  const active = Boolean(enabled && signedIn);

  const [saveState, setSaveState] = useState({ status: 'idle', error: '', errorCode: '', updatedAt: null });

  const treeQuery = useQuery({
    queryKey: [NOTEBOOK_TREE_QUERY_KEY, uid],
    queryFn: getNotebookTree,
    enabled: active,
    staleTime: 25_000,
  });

  const favoritesQuery = useQuery({
    queryKey: [NOTEBOOK_FAVORITES_QUERY_KEY, uid],
    queryFn: getFavoriteNotebookPages,
    enabled: active,
    staleTime: 25_000,
  });

  const recentSavedItemsQuery = useQuery({
    queryKey: [NOTEBOOK_SAVED_ITEMS_QUERY_KEY, uid, 'recent-widget'],
    queryFn: () => getSavedNotebookItems({ page: 1, pageSize: 60, sortBy: 'recent' }),
    enabled: active,
    staleTime: 25_000,
  });

  const highlightsQuery = useQuery({
    queryKey: [LEARNER_HIGHLIGHTS_QUERY_KEY, uid],
    queryFn: () => getHighlights(),
    enabled: active,
    staleTime: 30_000,
  });

  const folders = useMemo(
    () => (Array.isArray(treeQuery.data?.folders) ? treeQuery.data.folders : []),
    [treeQuery.data],
  );

  const stats = useMemo(
    () => treeQuery.data?.stats || { totalFolders: 0, totalFiles: 0, totalPages: 0, totalSavedItems: 0, favoritePagesCount: 0 },
    [treeQuery.data],
  );

  const allFiles = useMemo(() => {
    const out = [];
    for (const folder of folders) {
      for (const file of folder.files || []) {
        out.push({ ...file, folderId: folder.id, folderName: folder.name });
      }
    }
    return out;
  }, [folders]);

  const notePages = useMemo(() => {
    const out = [];
    for (const folder of folders) {
      for (const file of folder.files || []) {
        for (const page of file.pages || []) {
          out.push({
            ...page,
            folder: folder.name,
            folderId: folder.id,
            folderName: folder.name,
            fileId: file.id,
            fileName: file.name,
            favorite: Boolean(page.isFavorite),
            entryCount: page.savedItemCount ?? 0,
          });
        }
      }
    }
    return out;
  }, [folders]);

  const allEntries = useMemo(() => {
    const raw = recentSavedItemsQuery.data?.items;
    return (Array.isArray(raw) ? raw : []).map(mapSavedItemDto).filter(Boolean);
  }, [recentSavedItemsQuery.data]);

  const favoritePages = useMemo(
    () => (Array.isArray(favoritesQuery.data) ? favoritesQuery.data : []),
    [favoritesQuery.data],
  );

  const invalidateAll = useCallback(async (pageId = null) => {
    await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_TREE_QUERY_KEY, uid] });
    await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_FAVORITES_QUERY_KEY, uid] });
    await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_SAVED_ITEMS_QUERY_KEY, uid] });
    await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_LISTS_QUERY_KEY] });
    await queryClient.invalidateQueries({ queryKey: [LEARNER_HIGHLIGHTS_QUERY_KEY, uid] });
    await queryClient.invalidateQueries({ queryKey: ['kanji-saved', uid] });
    await queryClient.invalidateQueries({ queryKey: ['notebook-search', uid] });
    if (pageId) {
      await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_PAGE_QUERY_KEY, uid, Number(pageId)] });
    } else {
      await queryClient.invalidateQueries({ queryKey: [NOTEBOOK_PAGE_QUERY_KEY, uid] });
    }
  }, [queryClient, uid]);

  const markSaving = useCallback(() => {
    setSaveState((prev) => ({ ...prev, status: 'saving', error: '', errorCode: '' }));
  }, []);

  const markSaved = useCallback(() => {
    setSaveState({ status: 'saved', error: '', errorCode: '', updatedAt: new Date().toISOString() });
  }, []);

  const markError = useCallback((err) => {
    const code = err?.data?.errorCode || err?.errorCode || '';
    setSaveState((prev) => ({
      ...prev,
      status: 'error',
      errorCode: code,
      error: err?.message || 'Chưa lưu được thay đổi.',
    }));
  }, []);

  // --- Folder Mutations ---
  const createFolder = useMutation({
    mutationFn: async ({ name }) => {
      markSaving();
      return createNotebookFolder({ name });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ folderId, name, expectedRevision }) => {
      markSaving();
      return updateNotebookFolder(folderId, { name, expectedRevision });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const removeFolder = useMutation({
    mutationFn: async ({ folderId, cascade = false }) => {
      markSaving();
      return deleteNotebookFolder(folderId, { cascade });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  // --- File Mutations ---
  const createFile = useMutation({
    mutationFn: async ({ folderId, name, description = null, createInitialPage = true }) => {
      markSaving();
      return createNotebookFile({ folderId, name, description, createInitialPage });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const updateFile = useMutation({
    mutationFn: async ({ fileId, name, description, folderId, sortOrder, expectedRevision }) => {
      markSaving();
      return updateNotebookFile(fileId, { name, description, folderId, sortOrder, expectedRevision });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const removeFile = useMutation({
    mutationFn: async ({ fileId, cascade = false }) => {
      markSaving();
      return deleteNotebookFile(fileId, { cascade });
    },
    onSuccess: async () => {
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  // --- Page Mutations ---
  const createPage = useMutation({
    mutationFn: async ({ fileId, title, contentJson = null, sourcePath = null, sourceTitle = null }) => {
      markSaving();
      return createNotebookPage({ fileId, title, contentJson, sourcePath, sourceTitle });
    },
    onSuccess: async (created) => {
      await invalidateAll(created?.id);
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const updatePage = useMutation({
    mutationFn: async ({ pageId, title, contentJson, fileId, isFavorite, sortOrder, expectedRevision }) => {
      markSaving();
      return updateNotebookPage(pageId, { title, contentJson, fileId, isFavorite, sortOrder, expectedRevision });
    },
    onSuccess: async (updated, vars) => {
      const pid = updated?.id || vars.pageId;
      if (updated) {
        queryClient.setQueryData([NOTEBOOK_PAGE_QUERY_KEY, uid, Number(pid)], updated);
      }
      await invalidateAll(pid);
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const toggleFavoritePage = useMutation({
    mutationFn: async ({ pageId, isFavorite }) => toggleNotebookPageFavorite(pageId, isFavorite),
    onSuccess: async (_, vars) => {
      await invalidateAll(vars.pageId);
    },
    onError: (err) => markError(err),
  });

  const removePage = useMutation({
    mutationFn: async (pageId) => {
      markSaving();
      return deleteNotebookPage(pageId);
    },
    onSuccess: async (_, pageId) => {
      // Drop the deleted page's cached detail so no view can render stale content for it.
      queryClient.removeQueries({ queryKey: [NOTEBOOK_PAGE_QUERY_KEY, uid, Number(pageId)], exact: true });
      await invalidateAll();
      markSaved();
    },
    onError: (err) => markError(err),
  });

  // --- Saved Items & Quick Save ---
  const quickSaveCapture = useMutation({
    mutationFn: async ({
      targetPageId = null,
      targetNoteId = null,
      kind = 'note',
      term,
      reading = '',
      meaning = '',
      personalNote = '',
      example = '',
      exampleMeaning = '',
      sourcePath = '',
      sourceTitle = '',
      sourceType = '',
      sourceId = null,
      contextSnippet = '',
      vocabularyId = null,
      kanjiId = null,
      grammarPatternId = null,
      enrollSrs = false,
    }) => {
      markSaving();
      const chosenPageId = targetPageId || targetNoteId || null;
      const cleanTerm = String(term || '').trim();
      if (!cleanTerm) throw new Error('Nội dung cần lưu không được để trống.');

      if (grammarPatternId && enrollSrs) {
        try {
          await bookmarkGrammar(grammarPatternId);
        } catch {
          // Best effort SRS link when learner explicitly checked enrollSrs.
        }
      }

      return quickSaveToNotebook({
        notebookPageId: chosenPageId ? Number(chosenPageId) : null,
        text: cleanTerm.slice(0, 200),
        reading: reading ? String(reading).trim().slice(0, 200) : null,
        meaning: meaning ? String(meaning).trim().slice(0, 500) : null,
        note: personalNote ? String(personalNote).trim().slice(0, 2000) : null,
        itemKind: kind || null,
        exampleSentence: example ? String(example).trim().slice(0, 500) : null,
        exampleMeaning: exampleMeaning ? String(exampleMeaning).trim().slice(0, 500) : null,
        sourceType: sourceType || 'Selection',
        sourceId: sourceId ?? null,
        sourcePath: sourcePath || null,
        sourceTitle: sourceTitle || null,
        contextSnippet: contextSnippet ? String(contextSnippet).trim().slice(0, 600) : null,
        vocabularyId: vocabularyId ? Number(vocabularyId) : null,
        kanjiId: kanjiId ? Number(kanjiId) : null,
        grammarPatternId: grammarPatternId ? Number(grammarPatternId) : null,
        enrollSrs: Boolean(enrollSrs),
      });
    },
    onSuccess: async (res) => {
      await invalidateAll(res?.notebookPageId || null);
      if (res?.reviewCardId) {
        await invalidateSrsAndCalendarCaches(queryClient);
      }
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const addSavedItem = useMutation({
    mutationFn: async ({
      learnerNoteId = 0,
      notebookPageId = null,
      vocabularyId = null,
      kanjiId = null,
      grammarPatternId = null,
      itemKind = 'manual',
      word,
      reading = '',
      meaning,
      note = '',
      highlightColor = null,
      exampleSentence = '',
      exampleMeaning = '',
      tags = [],
      sourcePath = null,
      sourceTitle = null,
      enrollSrs = false,
    }) => {
      markSaving();
      if (vocabularyId) {
        return bookmarkVocabulary({
          learnerNoteId,
          notebookPageId,
          vocabularyId,
          enrollSrs: Boolean(enrollSrs),
        });
      }
      if (kanjiId) {
        return bookmarkKanji({
          learnerNoteId,
          notebookPageId,
          kanjiId,
          enrollSrs: Boolean(enrollSrs),
        });
      }
      return addNotebookEntry({
        learnerNoteId,
        notebookPageId,
        grammarPatternId,
        itemKind,
        word,
        reading: reading || null,
        meaning,
        note: note || null,
        highlightColor,
        exampleSentence: exampleSentence || null,
        exampleMeaning: exampleMeaning || null,
        tags,
        sourcePath,
        sourceTitle,
        enrollSrs: Boolean(enrollSrs),
      });
    },
    onSuccess: async (res) => {
      await invalidateAll(res?.notebookPageId || null);
      if (res?.reviewCardId) {
        await invalidateSrsAndCalendarCaches(queryClient);
      }
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const updateEntry = useMutation({
    mutationFn: async ({
      noteEntryId,
      notebookPageId = null,
      learnerNoteId = null,
      word = null,
      reading = null,
      meaning = null,
      personalNote = null,
      note = null,
      itemKind = null,
      highlightColor = null,
      exampleSentence = null,
      exampleMeaning = null,
      tags = null,
      isFavorite = null,
      expectedRevision = null,
    }) => {
      markSaving();
      return updateNotebookEntry(noteEntryId, {
        notebookPageId,
        learnerNoteId,
        word,
        reading,
        meaning,
        note: note !== null ? note : personalNote,
        itemKind,
        highlightColor,
        exampleSentence,
        exampleMeaning,
        tags,
        isFavorite,
        expectedRevision,
      });
    },
    onSuccess: async (res) => {
      await invalidateAll(res?.notebookPageId || null);
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const enrollToSrs = useMutation({
    mutationFn: async (noteEntryId) => {
      markSaving();
      return enrollNotebookEntryToSrs(noteEntryId);
    },
    onSuccess: async (res) => {
      await invalidateAll(res?.notebookPageId || null);
      await invalidateSrsAndCalendarCaches(queryClient);
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

  // --- Lesson Highlights (separate system from Saved Items) ---
  const saveHighlight = useMutation({
    mutationFn: async (payload) => {
      markSaving();
      return createHighlight({
        ...payload,
        color: normalizeHighlightColorId(payload?.color),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [LEARNER_HIGHLIGHTS_QUERY_KEY, uid] });
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const patchHighlight = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      markSaving();
      return updateHighlight(id, payload.color ? { ...payload, color: normalizeHighlightColorId(payload.color) } : payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [LEARNER_HIGHLIGHTS_QUERY_KEY, uid] });
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const removeHighlight = useMutation({
    mutationFn: async (highlightId) => {
      markSaving();
      return deleteHighlight(highlightId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [LEARNER_HIGHLIGHTS_QUERY_KEY, uid] });
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const promoteHighlightSrs = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      markSaving();
      return promoteHighlightToSrs(id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [LEARNER_HIGHLIGHTS_QUERY_KEY, uid] });
      await invalidateSrsAndCalendarCaches(queryClient);
      markSaved();
    },
    onError: (err) => markError(err),
  });

  const highlightsForPath = useCallback((pathnameWithSearch = '') => {
    const cleanTarget = String(pathnameWithSearch || '').replace(/\/+(?=\?|$)/, '') || '/';
    const targetPathOnly = cleanTarget.split('?')[0];

    const dbHighlights = (Array.isArray(highlightsQuery.data) ? highlightsQuery.data : [])
      .filter((h) => {
        if (!h?.sourcePath) return false;
        const cleanSrc = String(h.sourcePath).replace(/\/+(?=\?|$)/, '') || '/';
        return cleanSrc === cleanTarget || cleanSrc.split('?')[0] === targetPathOnly;
      })
      .map((h) => ({
        highlightId: h.id,
        noteEntryId: h.linkedNoteEntryId || `hl-${h.id}`,
        linkedNoteEntryId: h.linkedNoteEntryId || null,
        linkedReviewCardId: h.linkedReviewCardId || null,
        hasSrs: Boolean(h.linkedReviewCardId),
        term: h.selectedText,
        selectedText: h.selectedText,
        color: normalizeHighlightColorId(h.color),
        personalNote: h.note || '',
        translationSnapshot: h.translationSnapshot || '',
        sourcePath: h.sourcePath || '',
        sourceTitle: h.sourceTitle || '',
        contentId: h.targetKey || '',
        contentVersion: h.contentVersionHash || '',
        contentVersionHash: h.contentVersionHash || '',
        anchorPrefix: h.anchorPrefix || '',
        anchorSuffix: h.anchorSuffix || '',
        startOffset: h.startOffset ?? null,
        endOffset: h.endOffset ?? null,
        isBackendHighlight: true,
      }));

    const noteHighlightEntries = allEntries.filter((entry) => {
      if (!entry.sourcePath || entry.kind !== 'highlight') return false;
      const cleanSource = String(entry.sourcePath).replace(/\/+(?=\?|$)/, '') || '/';
      return cleanSource === cleanTarget || (cleanSource.split('?')[0] === targetPathOnly && cleanTarget === cleanSource);
    });

    const dbTexts = new Set(dbHighlights.map((h) => `${h.contentId}::${h.selectedText}`));
    const merged = [...dbHighlights];
    for (const ne of noteHighlightEntries) {
      if (!dbTexts.has(`${ne.contentId || ''}::${ne.term}`)) {
        merged.push(ne);
      }
    }
    return merged;
  }, [allEntries, highlightsQuery.data]);

  return {
    uid,
    signedIn,
    active,
    treeQuery,
    favoritesQuery,
    recentSavedItemsQuery,
    listsQuery: treeQuery,
    highlightsQuery,
    folders,
    allFiles,
    notePages,
    favoritePages,
    allEntries,
    stats,
    loadingEntries: recentSavedItemsQuery.isPending,
    entriesError: recentSavedItemsQuery.error || null,
    saveState,
    markSaving,
    markSaved,
    markError,
    refetchAll: invalidateAll,
    // Hierarchy & V3 Mutations
    createFolder,
    renameFolder,
    removeFolder,
    createFile,
    updateFile,
    removeFile,
    createPage,
    updatePage,
    toggleFavoritePage,
    removePage,
    // Saved Items & Highlights
    quickSaveCapture,
    addSavedItem,
    updateEntry,
    enrollToSrs,
    deleteEntry,
    saveHighlight,
    patchHighlight,
    removeHighlight,
    promoteHighlightSrs,
    highlightsForPath,
    defaultFolderName: DEFAULT_FOLDER_NAME,
  };
}
