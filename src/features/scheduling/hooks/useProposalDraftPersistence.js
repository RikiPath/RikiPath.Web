import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTeachingProposalDraft,
  updateTeachingProposalDraft,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  clearAllLocalDraftsForOtherUsers,
  clearAllLocalDraftsForUser,
  clearLocalDraft,
  DRAFT_SAVE_STATUS,
  hasActiveWeeklySelection,
  readLocalDraft,
  reconcileDraftWithServer,
  serializeDraftForCompare,
  writeLocalDraft,
} from '@/features/scheduling/utils/proposalDraftStorage.js';
import { describeApiError } from '@/api/apiErrors.js';

const AUTOSAVE_DEBOUNCE_MS = 900;

function toDraftApiPayload(draft, expectedRevision) {
  return {
    certificateLevelId: draft.certificateLevelId ? Number(draft.certificateLevelId) : null,
    programType: draft.programType || 'StandardJlpt',
    coursePlanId: draft.coursePlanId ? Number(draft.coursePlanId) : null,
    courseTitle: (draft.courseTitle || '').trim() || null,
    courseObjective: (draft.courseObjective || '').trim() || null,
    expectedStartDate: draft.expectedStartDate || null,
    courseDurationWeeks: Number(draft.courseDurationWeeks || 10),
    sessionDurationMinutes: Number(draft.sessionDurationMinutes || 90),
    weeklySessions: (draft.weeklySessions || []).map((s) => ({
      weekday: Number(s.weekday),
      startMinute: Number(s.startMinute),
      endMinute: Number(s.endMinute || Number(s.startMinute) + Number(draft.sessionDurationMinutes || 90)),
    })),
    optionalNotes: (draft.optionalNotes || '').trim() || null,
    optionalAttachments: (draft.optionalAttachments || []).map((a) => ({
      name: a.name,
      url: a.url,
      storedFileName: a.storedFileName || null,
      contentType: a.contentType || null,
      sizeBytes: a.sizeBytes ?? null,
    })),
    expectedRevision: expectedRevision ?? null,
  };
}

/**
 * Manages debounced server-side draft autosave + optimistic revision tracking +
 * account-scoped local offline recovery + conflict reconciliation.
 */
export function useProposalDraftPersistence({
  userId,
  draft,
  isEditable,
  onServerSynced,
  onRestoreDraft,
  onReconnectRevalidate,
}) {
  const [saveStatus, setSaveStatus] = useState(DRAFT_SAVE_STATUS.IDLE);
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [conflictState, setConflictState] = useState(null);
  const [syncedFingerprint, setSyncedFingerprint] = useState('');
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine !== false : true));

  const lastSyncedHashRef = useRef('');
  const savingInFlightRef = useRef(false);
  const mutationGenRef = useRef(0);
  const timerRef = useRef(null);
  const draftRef = useRef(draft);
  const onServerSyncedRef = useRef(onServerSynced);
  const onRestoreDraftRef = useRef(onRestoreDraft);
  const onReconnectRevalidateRef = useRef(onReconnectRevalidate);

  useEffect(() => {
    draftRef.current = draft;
    onServerSyncedRef.current = onServerSynced;
    onRestoreDraftRef.current = onRestoreDraft;
    onReconnectRevalidateRef.current = onReconnectRevalidate;
  });

  // Purge stale drafts belonging to other accounts on mount/account switch
  useEffect(() => {
    if (userId) clearAllLocalDraftsForOtherUsers(userId);
  }, [userId]);

  const syncNow = useCallback(async ({ forceRevision = null } = {}) => {
    const current = draftRef.current;
    // Strict Official Proposal Protection: autosave may ONLY persist unsent 'Draft' selections
    if (!current || current.status !== 'Draft' || !isEditable || !userId) return null;
    // Zero Selection Invariant: never create or persist a 0-session Draft to Backend
    if (!hasActiveWeeklySelection(current)) return null;
    if (savingInFlightRef.current) return null;

    const currentHash = serializeDraftForCompare(current);
    if (!forceRevision && current.id && currentHash === lastSyncedHashRef.current) {
      setSaveStatus(DRAFT_SAVE_STATUS.SAVED);
      return current;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      writeLocalDraft(userId, current.id || 'new', {
        draft: current,
        dirty: true,
        baseServerRevision: current.revision || 0,
      });
      setSaveStatus(DRAFT_SAVE_STATUS.OFFLINE_PENDING);
      return null;
    }

    const gen = mutationGenRef.current;
    savingInFlightRef.current = true;
    setSaveStatus(DRAFT_SAVE_STATUS.SAVING);
    setSaveError('');

    try {
      const payload = toDraftApiPayload(current, forceRevision ?? current.revision ?? null);
      const saved = current.id
        ? await updateTeachingProposalDraft(current.id, payload)
        : await createTeachingProposalDraft(payload);

      // Discard late autosave response if selection was cleared or submitted while request was in flight
      if (mutationGenRef.current !== gen) {
        return null;
      }

      if (saved && saved.id && hasActiveWeeklySelection(saved)) {
        if (!current.id) clearLocalDraft(userId, 'new');
        const savedHash = serializeDraftForCompare(saved);
        lastSyncedHashRef.current = savedHash;
        setSyncedFingerprint(savedHash);
        writeLocalDraft(userId, saved.id, {
          draft: saved,
          dirty: false,
          baseServerRevision: saved.revision,
        });
        setLastSavedAt(saved.lastSavedAtUtc || new Date().toISOString());
        setConflictState(null);
        setSaveStatus(DRAFT_SAVE_STATUS.SAVED);
        onServerSyncedRef.current?.(saved);
        return saved;
      }
      return null;
    } catch (err) {
      if (mutationGenRef.current !== gen) {
        return null;
      }
      const info = describeApiError(err);
      const isConflict = err?.status === 409 || info.code === 'PROPOSAL_REVISION_CONFLICT';
      if (isConflict) {
        setSaveStatus(DRAFT_SAVE_STATUS.CONFLICT);
        setSaveError(info.message);
        setConflictState({
          localDraft: current,
          message: info.message,
        });
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        writeLocalDraft(userId, current.id || 'new', {
          draft: current,
          dirty: true,
          baseServerRevision: current.revision || 0,
        });
        setSaveStatus(DRAFT_SAVE_STATUS.OFFLINE_PENDING);
      } else {
        writeLocalDraft(userId, current.id || 'new', {
          draft: current,
          dirty: true,
          baseServerRevision: current.revision || 0,
        });
        setSaveStatus(DRAFT_SAVE_STATUS.SYNC_FAILED);
        setSaveError(info.message || 'Không thể lưu lịch đang chọn lên máy chủ.');
      }
      return null;
    } finally {
      savingInFlightRef.current = false;
    }
  }, [isEditable, userId]);

  // Online / offline listeners -> auto-retry pending sync upon reconnect + revalidate availability
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isEditable) {
        void syncNow();
        onReconnectRevalidateRef.current?.();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      const current = draftRef.current;
      if (current && current.status === 'Draft' && isEditable && userId && hasActiveWeeklySelection(current)) {
        writeLocalDraft(userId, current.id || 'new', {
          draft: current,
          dirty: true,
          baseServerRevision: current.revision || 0,
        });
        setSaveStatus(DRAFT_SAVE_STATUS.OFFLINE_PENDING);
      }
    };
    const handleStorage = (event) => {
      const current = draftRef.current;
      if (!current || current.status !== 'Draft' || !isEditable || !userId || !event?.key || !event?.newValue) return;
      const prefix = `rikipath:v4:proposal-draft:${String(userId)}:`;
      if (!event.key.startsWith(prefix)) return;
      const watchedKey = `${prefix}${current.id || 'new'}`;
      if (event.key !== watchedKey) return;
      try {
        const incoming = JSON.parse(event.newValue);
        if (!incoming?.draft || incoming.dirty) return;
        const incomingRev = Number(incoming.baseServerRevision || incoming.draft.revision || 0);
        const currentRev = Number(current.revision || 0);
        const incomingHash = serializeDraftForCompare(incoming.draft);
        const currentHash = serializeDraftForCompare(current);
        if (incomingRev > currentRev && incomingHash !== currentHash) {
          setSaveStatus(DRAFT_SAVE_STATUS.CONFLICT);
          setConflictState({
            localDraft: current,
            serverDraft: incoming.draft,
            meta: { serverRevision: incomingRev, localBaseRevision: currentRev },
            message: 'Lịch đang chọn vừa được cập nhật từ tab khác.',
          });
        }
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isEditable, syncNow, userId]);

  // Debounced autosave whenever active selection (>= 1 weekly session) changes
  const draftFingerprint = serializeDraftForCompare(draft);
  const hasMeaningfulContent = hasActiveWeeklySelection(draft);

  useEffect(() => {
    if (!draft || draft.status !== 'Draft' || !isEditable || !userId || conflictState) return undefined;
    if (draftFingerprint === lastSyncedHashRef.current && draft.id) return undefined;
    if (!hasMeaningfulContent) return undefined;

    writeLocalDraft(userId, draft.id || 'new', {
      draft,
      dirty: true,
      baseServerRevision: draft.revision || 0,
    });

    if (!isOnline) {
      return undefined;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void syncNow();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [conflictState, draft, draftFingerprint, hasMeaningfulContent, isEditable, isOnline, syncNow, userId]);

  /**
   * Called when loading a server proposal into the editor.
   * Reconciles with any account-scoped local offline cache safely.
   */
  const hydrateFromServer = useCallback((serverDraft) => {
    if (!userId) return serverDraft;
    if (serverDraft?.status && serverDraft.status !== 'Draft') {
      return serverDraft;
    }
    const localRecord = readLocalDraft(userId, serverDraft?.id || 'new');
    const reconciled = reconcileDraftWithServer({ serverDraft, localRecord });

    if (reconciled.action === 'conflict') {
      const sHash = serializeDraftForCompare(serverDraft);
      lastSyncedHashRef.current = sHash;
      setSyncedFingerprint(sHash);
      setConflictState({
        localDraft: reconciled.localDraft,
        serverDraft: reconciled.serverDraft,
        meta: reconciled.conflict,
        message: 'Lịch đang chọn trên máy chủ đã được cập nhật từ thiết bị hoặc tab khác.',
      });
      setSaveStatus(DRAFT_SAVE_STATUS.CONFLICT);
      return serverDraft;
    }

    if (reconciled.action === 'restore_local' && reconciled.needsSync) {
      const sHash = serverDraft ? serializeDraftForCompare(serverDraft) : '';
      lastSyncedHashRef.current = sHash;
      setSyncedFingerprint(sHash);
      setConflictState(null);
      setSaveStatus(isOnline ? DRAFT_SAVE_STATUS.UNSYNCED : DRAFT_SAVE_STATUS.OFFLINE_PENDING);
      onRestoreDraftRef.current?.(reconciled.draft, { restoredFromLocal: true });
      return reconciled.draft;
    }

    const sHash = serverDraft ? serializeDraftForCompare(serverDraft) : '';
    lastSyncedHashRef.current = sHash;
    setSyncedFingerprint(sHash);
    setConflictState(null);
    setLastSavedAt(serverDraft?.lastSavedAtUtc || serverDraft?.updatedAtUtc || null);
    setSaveStatus(serverDraft?.id ? DRAFT_SAVE_STATUS.SAVED : DRAFT_SAVE_STATUS.IDLE);
    return serverDraft;
  }, [isOnline, userId]);

  const resolveKeepServer = useCallback((latestServerDraft) => {
    if (!userId) return;
    const target = latestServerDraft || conflictState?.serverDraft;
    if (target?.id) clearLocalDraft(userId, target.id);
    const tHash = target ? serializeDraftForCompare(target) : '';
    lastSyncedHashRef.current = tHash;
    setSyncedFingerprint(tHash);
    setConflictState(null);
    setSaveError('');
    setSaveStatus(DRAFT_SAVE_STATUS.SAVED);
    if (target) onRestoreDraftRef.current?.(target, { resolvedConflict: 'server' });
  }, [conflictState, userId]);

  const resolveOverwriteWithLocal = useCallback(async (latestServerRevision) => {
    if (!conflictState?.localDraft) return null;
    const merged = { ...conflictState.localDraft, revision: latestServerRevision };
    draftRef.current = merged;
    setConflictState(null);
    return syncNow({ forceRevision: latestServerRevision });
  }, [conflictState, syncNow]);

  const cancelPendingAndClear = useCallback(() => {
    mutationGenRef.current += 1;
    clearTimeout(timerRef.current);
    if (userId) clearAllLocalDraftsForUser(userId);
    lastSyncedHashRef.current = '';
    setSyncedFingerprint('');
    setConflictState(null);
    setSaveError('');
    setSaveStatus(DRAFT_SAVE_STATUS.IDLE);
  }, [userId]);

  const markCleanAfterSubmit = useCallback(() => {
    mutationGenRef.current += 1;
    clearTimeout(timerRef.current);
    if (userId) clearAllLocalDraftsForUser(userId);
    lastSyncedHashRef.current = '';
    setSyncedFingerprint('');
    setConflictState(null);
    setSaveError('');
    setSaveStatus(DRAFT_SAVE_STATUS.IDLE);
  }, [userId]);

  const effectiveSaveStatus = (() => {
    if (!hasMeaningfulContent) {
      return DRAFT_SAVE_STATUS.IDLE;
    }
    if (!isOnline && isEditable && saveStatus !== DRAFT_SAVE_STATUS.CONFLICT) {
      return DRAFT_SAVE_STATUS.OFFLINE_PENDING;
    }
    if (saveStatus === DRAFT_SAVE_STATUS.CONFLICT || saveStatus === DRAFT_SAVE_STATUS.SYNC_FAILED || saveStatus === DRAFT_SAVE_STATUS.SAVING) {
      return saveStatus;
    }
    if (isEditable && (!draft?.id || draftFingerprint !== syncedFingerprint)) {
      return DRAFT_SAVE_STATUS.UNSYNCED;
    }
    return DRAFT_SAVE_STATUS.SAVED;
  })();

  return {
    saveStatus: effectiveSaveStatus,
    saveError,
    lastSavedAt,
    isOnline,
    conflictState,
    syncNow,
    hydrateFromServer,
    resolveKeepServer,
    resolveOverwriteWithLocal,
    cancelPendingAndClear,
    markCleanAfterSubmit,
  };
}
