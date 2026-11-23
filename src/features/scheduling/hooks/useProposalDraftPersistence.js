import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTeachingProposalDraft,
  updateTeachingProposalDraft,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  clearAllLocalDraftsForOtherUsers,
  clearLocalDraft,
  DRAFT_SAVE_STATUS,
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
}) {
  const [saveStatus, setSaveStatus] = useState(DRAFT_SAVE_STATUS.IDLE);
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [conflictState, setConflictState] = useState(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine !== false : true));

  const lastSyncedHashRef = useRef('');
  const savingInFlightRef = useRef(false);
  const timerRef = useRef(null);
  const draftRef = useRef(draft);
  const onServerSyncedRef = useRef(onServerSynced);
  const onRestoreDraftRef = useRef(onRestoreDraft);

  useEffect(() => {
    draftRef.current = draft;
    onServerSyncedRef.current = onServerSynced;
    onRestoreDraftRef.current = onRestoreDraft;
  });

  // Purge stale drafts belonging to other accounts on mount/account switch
  useEffect(() => {
    if (userId) clearAllLocalDraftsForOtherUsers(userId);
  }, [userId]);

  const syncNow = useCallback(async ({ forceRevision = null } = {}) => {
    const current = draftRef.current;
    if (!current || !isEditable || !userId) return null;
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

    savingInFlightRef.current = true;
    setSaveStatus(DRAFT_SAVE_STATUS.SAVING);
    setSaveError('');

    try {
      const payload = toDraftApiPayload(current, forceRevision ?? current.revision ?? null);
      const saved = current.id
        ? await updateTeachingProposalDraft(current.id, payload)
        : await createTeachingProposalDraft(payload);

      if (saved) {
        if (!current.id) clearLocalDraft(userId, 'new');
        lastSyncedHashRef.current = serializeDraftForCompare(saved);
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
        setSaveError(info.message || 'Không thể đồng bộ bản nháp lên máy chủ.');
      }
      return null;
    } finally {
      savingInFlightRef.current = false;
    }
  }, [isEditable, userId]);

  // Online / offline listeners -> auto-retry pending sync upon reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isEditable) {
        void syncNow();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      const current = draftRef.current;
      if (current && isEditable && userId) {
        writeLocalDraft(userId, current.id || 'new', {
          draft: current,
          dirty: true,
          baseServerRevision: current.revision || 0,
        });
        setSaveStatus(DRAFT_SAVE_STATUS.OFFLINE_PENDING);
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isEditable, syncNow, userId]);

  // Debounced autosave whenever draft content changes
  const draftFingerprint = serializeDraftForCompare(draft);
  useEffect(() => {
    if (!draft || !isEditable || !userId || conflictState) return undefined;
    if (draftFingerprint === lastSyncedHashRef.current && draft.id) return undefined;

    // Avoid creating empty untitled draft on server before the user has typed or picked anything
    const hasMeaningfulContent = Boolean(
      draft.id
      || draft.certificateLevelId
      || draft.coursePlanId
      || (draft.courseTitle || '').trim()
      || (draft.courseObjective || '').trim()
      || draft.expectedStartDate
      || (draft.weeklySessions || []).length > 0
      || (draft.optionalNotes || '').trim()
      || (draft.optionalAttachments || []).length > 0
    );
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
  }, [conflictState, draft, draftFingerprint, isEditable, isOnline, syncNow, userId]);

  /**
   * Called when loading a server proposal into the editor.
   * Reconciles with any account-scoped local offline cache safely.
   */
  const hydrateFromServer = useCallback((serverDraft) => {
    if (!userId) return serverDraft;
    const localRecord = readLocalDraft(userId, serverDraft?.id || 'new');
    const reconciled = reconcileDraftWithServer({ serverDraft, localRecord });

    if (reconciled.action === 'conflict') {
      lastSyncedHashRef.current = serializeDraftForCompare(serverDraft);
      setConflictState({
        localDraft: reconciled.localDraft,
        serverDraft: reconciled.serverDraft,
        meta: reconciled.conflict,
        message: 'Bản nháp trên máy chủ đã được cập nhật từ thiết bị hoặc tab khác.',
      });
      setSaveStatus(DRAFT_SAVE_STATUS.CONFLICT);
      return serverDraft;
    }

    if (reconciled.action === 'restore_local' && reconciled.needsSync) {
      lastSyncedHashRef.current = serverDraft ? serializeDraftForCompare(serverDraft) : '';
      setConflictState(null);
      setSaveStatus(isOnline ? DRAFT_SAVE_STATUS.SAVING : DRAFT_SAVE_STATUS.OFFLINE_PENDING);
      onRestoreDraftRef.current?.(reconciled.draft, { restoredFromLocal: true });
      return reconciled.draft;
    }

    lastSyncedHashRef.current = serverDraft ? serializeDraftForCompare(serverDraft) : '';
    setConflictState(null);
    setLastSavedAt(serverDraft?.lastSavedAtUtc || serverDraft?.updatedAtUtc || null);
    setSaveStatus(serverDraft?.id ? DRAFT_SAVE_STATUS.SAVED : DRAFT_SAVE_STATUS.IDLE);
    return serverDraft;
  }, [isOnline, userId]);

  const resolveKeepServer = useCallback((latestServerDraft) => {
    if (!userId) return;
    const target = latestServerDraft || conflictState?.serverDraft;
    if (target?.id) clearLocalDraft(userId, target.id);
    lastSyncedHashRef.current = target ? serializeDraftForCompare(target) : '';
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

  const markCleanAfterSubmit = useCallback((submittedProposal) => {
    if (userId && submittedProposal?.id) {
      clearLocalDraft(userId, submittedProposal.id);
      clearLocalDraft(userId, 'new');
    }
    lastSyncedHashRef.current = submittedProposal ? serializeDraftForCompare(submittedProposal) : '';
    setConflictState(null);
    setSaveError('');
    setSaveStatus(DRAFT_SAVE_STATUS.SAVED);
  }, [userId]);

  const effectiveSaveStatus = !isOnline && isEditable && saveStatus !== DRAFT_SAVE_STATUS.CONFLICT
    ? DRAFT_SAVE_STATUS.OFFLINE_PENDING
    : saveStatus;

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
    markCleanAfterSubmit,
  };
}
