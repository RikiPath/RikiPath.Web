const STORAGE_PREFIX = 'rikipath:v4:proposal-draft';

export const DRAFT_SAVE_STATUS = Object.freeze({
  IDLE: 'idle',
  SAVING: 'saving',
  SAVED: 'saved',
  OFFLINE_PENDING: 'offline_pending',
  SYNC_FAILED: 'sync_failed',
  CONFLICT: 'conflict',
});

export function buildDraftStorageKey(userId, proposalId) {
  const uid = String(userId || 'anon');
  const pid = proposalId ? String(proposalId) : 'new';
  return `${STORAGE_PREFIX}:${uid}:${pid}`;
}

export function buildSubmitIdempotencyKey(userId, proposalId, revision) {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `prop-${userId || 'm'}-${proposalId || 'new'}-r${revision || 1}-${randomPart}`.slice(0, 128);
}

export function serializeDraftForCompare(draft) {
  if (!draft) return '';
  const sessions = [...(draft.weeklySessions || [])]
    .map((s) => `${Number(s.weekday)}:${Number(s.startMinute)}-${Number(s.endMinute || Number(s.startMinute) + 90)}`)
    .sort()
    .join('|');
  const attachments = [...(draft.optionalAttachments || [])]
    .map((a) => `${a.name || ''}:${a.url || ''}`)
    .join('|');
  return JSON.stringify({
    certificateLevelId: draft.certificateLevelId ? Number(draft.certificateLevelId) : null,
    programType: draft.programType || 'StandardJlpt',
    coursePlanId: draft.coursePlanId ? Number(draft.coursePlanId) : null,
    courseTitle: (draft.courseTitle || '').trim(),
    courseObjective: (draft.courseObjective || '').trim(),
    expectedStartDate: draft.expectedStartDate || '',
    courseDurationWeeks: Number(draft.courseDurationWeeks || 10),
    sessionDurationMinutes: Number(draft.sessionDurationMinutes || 90),
    sessions,
    optionalNotes: (draft.optionalNotes || '').trim(),
    attachments,
  });
}

export function readLocalDraft(userId, proposalId, storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(buildDraftStorageKey(userId, proposalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (String(parsed.userId || '') !== String(userId || 'anon')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDraft(userId, proposalId, payload, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(
      buildDraftStorageKey(userId, proposalId),
      JSON.stringify({
        ...payload,
        userId: String(userId || 'anon'),
        proposalId: proposalId || null,
        savedLocallyAtMs: Date.now(),
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function clearLocalDraft(userId, proposalId, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.removeItem(buildDraftStorageKey(userId, proposalId));
  } catch {
    // ignore storage errors
  }
}

export function clearAllLocalDraftsForOtherUsers(currentUserId, storage = globalThis.localStorage) {
  if (!storage || typeof storage.length !== 'number') return;
  const keepPrefix = `${STORAGE_PREFIX}:${String(currentUserId || 'anon')}:`;
  const toDelete = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(`${STORAGE_PREFIX}:`) && !key.startsWith(keepPrefix)) {
      toDelete.push(key);
    }
  }
  toDelete.forEach((k) => storage.removeItem(k));
}

/**
 * Reconciles a locally cached offline draft with the authoritative server draft.
 * Rule: NEVER silently overwrite a newer server revision with stale local data!
 *
 * Returns:
 * - { action: 'use_server', draft: serverDraft, needsSync: false, conflict: null }
 * - { action: 'restore_local', draft: localDraft.draft, needsSync: true, conflict: null }
 * - { action: 'conflict', draft: serverDraft, localDraft: localDraft.draft, serverDraft, needsSync: false, conflict: { ... } }
 */
export function reconcileDraftWithServer({ serverDraft, localRecord }) {
  if (!localRecord || !localRecord.draft) {
    return { action: 'use_server', draft: serverDraft, needsSync: false, conflict: null };
  }

  if (!serverDraft) {
    return {
      action: 'restore_local',
      draft: localRecord.draft,
      needsSync: Boolean(localRecord.dirty),
      conflict: null,
    };
  }

  const serverHash = serializeDraftForCompare(serverDraft);
  const localHash = serializeDraftForCompare(localRecord.draft);

  // If content is identical, server is authoritative and clean
  if (serverHash === localHash) {
    return { action: 'use_server', draft: serverDraft, needsSync: false, conflict: null };
  }

  // If local cache is not dirty, always trust server
  if (!localRecord.dirty) {
    return { action: 'use_server', draft: serverDraft, needsSync: false, conflict: null };
  }

  const serverRev = Number(serverDraft.revision || 1);
  const localBaseRev = Number(localRecord.baseServerRevision || 0);

  // Server has moved ahead since local edits were made -> Conflict detected! Never silently overwrite!
  if (serverRev > localBaseRev) {
    return {
      action: 'conflict',
      draft: serverDraft,
      serverDraft,
      localDraft: localRecord.draft,
      needsSync: false,
      conflict: {
        serverRevision: serverRev,
        localBaseRevision: localBaseRev,
        serverUpdatedAt: serverDraft.updatedAtUtc || serverDraft.lastSavedAtUtc || null,
        localSavedAtMs: localRecord.savedLocallyAtMs || null,
      },
    };
  }

  // Same base revision + local has unsynced edits -> safe offline recovery & auto-sync!
  return {
    action: 'restore_local',
    draft: localRecord.draft,
    needsSync: true,
    conflict: null,
  };
}
