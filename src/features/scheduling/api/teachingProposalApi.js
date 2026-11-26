import { api } from '@/api/client.js';

// ───────────────────────────── MENTOR ENDPOINTS ─────────────────────────────

export const getTeachingProposalContext = async () =>
  (await api.get('/mentor/teaching-proposals/context')).result;

export const getMyTeachingProposals = async (status = 'ALL') =>
  (await api.get('/mentor/teaching-proposals', { params: status && status !== 'ALL' ? { status } : undefined })).result || [];

export const getMyTeachingProposal = async (id) =>
  (await api.get(`/mentor/teaching-proposals/${id}`)).result;

export const createTeachingProposalDraft = async (body = {}) =>
  (await api.post('/mentor/teaching-proposals/drafts', body)).result;

export const updateTeachingProposalDraft = async (id, body) =>
  (await api.put(`/mentor/teaching-proposals/${id}/draft`, body)).result;

export const deleteTeachingProposalDraft = async (id) =>
  (await api.delete(`/mentor/teaching-proposals/${id}/draft`)).result;

export const validateTeachingProposal = async (body) =>
  (await api.post('/mentor/teaching-proposals/validate', body)).result;

export const submitTeachingProposal = async (id, { idempotencyKey, expectedRevision }) =>
  (await api.post(`/mentor/teaching-proposals/${id}/submit`, {
    idempotencyKey,
    expectedRevision,
  })).result;

export const resubmitTeachingProposal = async (id, body) =>
  (await api.post(`/mentor/teaching-proposals/${id}/resubmit`, body)).result;

export const withdrawTeachingProposal = async (id, { reason = null, expectedRevision = null } = {}) =>
  (await api.post(`/mentor/teaching-proposals/${id}/withdraw`, {
    reason: reason || null,
    expectedRevision,
  })).result;

export const cloneTeachingProposalDraft = async (id) =>
  (await api.post(`/mentor/teaching-proposals/${id}/clone-draft`)).result;

export const fetchMentorProposalAttachmentBlob = async (proposalId, index, { download = false } = {}) =>
  api.get(`/mentor/teaching-proposals/${proposalId}/attachments/${index}`, {
    params: download ? { download: true } : undefined,
    responseType: 'blob',
  });

/**
 * Upload an OPTIONAL reference attachment (syllabus/notes PDF/image).
 * Strictly optional — never required for saving draft, submitting, or approval.
 */
export const uploadOptionalProposalAttachment = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/FileStorage/upload', form, {
    params: { folder: 'mentor-proposals' },
    transformRequest: [(data, headers) => {
      delete headers['Content-Type'];
      return data;
    }],
  });
  return res?.result ?? res;
};

// ───────────────────────────── ADMIN ENDPOINTS ─────────────────────────────

export const getAdminTeachingProposals = async (params = {}) => {
  const query = {};
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.mentorId && params.mentorId !== 'ALL') query.mentorId = Number(params.mentorId);
  if (params.certificateLevelId && params.certificateLevelId !== 'ALL') query.certificateLevelId = Number(params.certificateLevelId);
  return (await api.get('/admin/teaching-proposals', { params: Object.keys(query).length ? query : undefined })).result || [];
};

export const getAdminTeachingProposal = async (id) =>
  (await api.get(`/admin/teaching-proposals/${id}`)).result;

export const fetchAdminProposalAttachmentBlob = async (proposalId, index, { download = false } = {}) =>
  api.get(`/admin/teaching-proposals/${proposalId}/attachments/${index}`, {
    params: download ? { download: true } : undefined,
    responseType: 'blob',
  });

export const reviewAdminTeachingProposal = async (id, { decision, reason = null, expectedRevision }) =>
  (await api.post(`/admin/teaching-proposals/${id}/review`, {
    decision,
    reason: reason || null,
    expectedRevision,
  })).result;

export const prevalidateBulkApproveProposals = async ({ items, reason = null }) =>
  (await api.post('/admin/teaching-proposals/bulk-approve/validate', {
    items,
    reason: reason || null,
  })).result;

export const bulkApproveTeachingProposals = async ({ items, reason = null }) =>
  (await api.post('/admin/teaching-proposals/bulk-approve', {
    items,
    reason: reason || null,
  })).result;
