import { api } from '@/api/client.js';

function unwrap(response) {
  return response?.result ?? response?.data?.result ?? response;
}

// =====================================================================
// Unified Question Bank & Passages V2
// =====================================================================

export async function searchQuestionBankV2(params = {}) {
  return unwrap(await api.get('/content-author/question-bank', { params }));
}

export async function getQuestionBankDetailV2(id) {
  return unwrap(await api.get(`/content-author/question-bank/${id}`));
}

export async function saveQuestionDraftV2(payload) {
  return unwrap(await api.post('/content-author/question-bank/draft', payload));
}

export async function createQuestionNewVersionV2(id, updates = null) {
  return unwrap(await api.post(`/content-author/question-bank/${id}/new-version`, updates));
}

export async function submitQuestionV2(id) {
  return unwrap(await api.post(`/content-author/question-bank/${id}/submit`));
}

export async function deleteQuestionDraftV2(id) {
  await api.delete(`/content-author/question-bank/${id}`);
}

export async function checkQuestionDuplicatesV2(candidate, excludeId = null) {
  return unwrap(
    await api.post('/content-author/question-bank/check-duplicates', candidate, {
      params: excludeId ? { excludeId } : undefined,
    }),
  );
}

export async function listPassagesV2(params = {}) {
  return unwrap(await api.get('/content-author/question-bank/passages', { params })) ?? [];
}

export async function getPassageGroupV2(passageId) {
  return unwrap(await api.get(`/content-author/question-bank/passages/${passageId}`));
}

export async function savePassageGroupDraftV2(payload) {
  return unwrap(await api.post('/content-author/question-bank/passages/draft', payload));
}

export async function submitPassageGroupV2(passageId) {
  return unwrap(await api.post(`/content-author/question-bank/passages/${passageId}/submit`));
}

// =====================================================================
// Inline AI Question Assistant V2
// =====================================================================

export async function assistQuestionAiV2(payload) {
  return unwrap(await api.post('/content-author/question-bank/ai/assist', payload, { timeout: 120000 }));
}

// =====================================================================
// Exam & Practice Set Builder V2
// =====================================================================

export async function listAuthorExamsV2(params = {}) {
  return unwrap(await api.get('/content-author/exams', { params }));
}

export async function getAuthorExamDetailV2(examId) {
  return unwrap(await api.get(`/content-author/exams/${examId}`));
}

export async function saveExamDraftV2(payload) {
  return unwrap(await api.post('/content-author/exams/draft', payload));
}

export async function createExamNewVersionV2(examId) {
  return unwrap(await api.post(`/content-author/exams/${examId}/new-version`));
}

export async function validateExamBlueprintV2(examId) {
  return unwrap(await api.post(`/content-author/exams/${examId}/validate`));
}

export async function submitExamV2(examId) {
  return unwrap(await api.post(`/content-author/exams/${examId}/submit`));
}

export async function deleteExamDraftV2(examId) {
  await api.delete(`/content-author/exams/${examId}`);
}

// =====================================================================
// Skill Templates, Unified Multi-Format Import & Export V2
// =====================================================================

export async function downloadSkillTemplate(templateKind, format = 'xlsx') {
  const blob = await api.get(`/content-author/templates/${templateKind}`, {
    params: { format },
    responseType: 'blob',
  });
  return {
    blob,
    fileName: `rikipath-template-${templateKind}-v2.${format === 'json' ? 'json' : 'xlsx'}`,
  };
}

export async function previewUnifiedImport(file, expectedKind = 'Auto') {
  const formData = new FormData();
  formData.append('file', file, file.name);
  const res = await api.post('/content-import/unified/preview', formData, {
    params: { expectedKind },
    timeout: 90000,
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
  return unwrap(res);
}

export async function confirmUnifiedImport(payload) {
  return unwrap(await api.post('/content-import/unified/confirm', payload, { timeout: 90000 }));
}

export async function confirmUnifiedZipArchive(file, expectedKind = 'Auto', idempotencyKey = null) {
  const formData = new FormData();
  formData.append('file', file, file.name);
  const res = await api.post('/content-import/unified/confirm-archive', formData, {
    params: { expectedKind, ...(idempotencyKey ? { idempotencyKey } : {}) },
    timeout: 90000,
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
  return unwrap(res);
}

export async function exportExamFile(examId, format = 'pdf', includeAnswers = false) {
  const blob = await api.get(`/content-export/exams/${examId}`, {
    params: { format, includeAnswers },
    responseType: 'blob',
    timeout: 90000,
  });
  const ext = format === 'excel' ? 'xlsx' : format;
  return {
    blob,
    fileName: `rikipath-exam-${examId}${includeAnswers ? '-answers' : ''}.${ext}`,
  };
}

export async function exportQuestionBankFile(params = {}, format = 'xlsx', includeAnswers = true) {
  const blob = await api.get('/content-export/question-bank', {
    params: { ...params, format, includeAnswers },
    responseType: 'blob',
    timeout: 90000,
  });
  return {
    blob,
    fileName: `rikipath-question-bank.${format === 'json' ? 'json' : 'xlsx'}`,
  };
}

export async function verifyExamRoundTripV2(examId, format = 'xlsx') {
  return unwrap(await api.post(`/content-import/verify-roundtrip/${examId}`, null, { params: { format }, timeout: 90000 }));
}

export async function uploadAuthorMedia(file, folder = 'jlpt-media') {
  const formData = new FormData();
  formData.append('file', file, file.name);
  const res = await api.post('/FileStorage/upload', formData, {
    params: { folder },
    timeout: 90000,
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
  return unwrap(res);
}

export function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
