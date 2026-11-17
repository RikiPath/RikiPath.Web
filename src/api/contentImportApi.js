import { api } from './client.js';

export const CONTENT_IMPORT_TYPES = [
  { value: 'Kanji', label: 'Hán tự (Kanji)' },
  { value: 'Vocabulary', label: 'Từ vựng (Vocabulary)' },
  { value: 'Grammar', label: 'Ngữ pháp (Grammar)' },
  { value: 'Lesson', label: 'Bài học (Lesson)' },
  { value: 'MockTest', label: 'Đề thi thử (Mock Test)' },
  { value: 'PracticeExercise', label: 'Bài tập luyện tập (Practice Exercise)' },
];

export async function previewExcelWorkbook(file) {
  const formData = new FormData();
  formData.append('file', file, file.name);
  const response = await api.post('/content-import/workbook-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return response.result;
}

export async function editExcelWorkbook(file, edits) {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('edits', JSON.stringify(edits));
  const result = await api.post('/content-import/workbook-edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
    timeout: 60000,
    validateStatus: status => status >= 200 && status < 500,
  });
  if (result.type.includes('json')) {
    const error = JSON.parse(await result.text());
    throw new Error(error.errorMessage || error.title || 'Không thể áp dụng thay đổi vào file Excel.');
  }
  return new File([result], file.name, { type: result.type });
}

/**
 * Preview content import Excel file before committing changes.
 * @param {File|Blob} file 
 * @param {string} [entityType] 
 * @returns {Promise<any>}
 */
export async function previewContentImport(file, entityType) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'import.xlsx');


  const response = await api.post('/content-import/preview', formData, {
    params: { entityType: entityType || undefined },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
    transformRequest: [(payload, headers) => {
      delete headers['Content-Type'];
      return payload;
    }],
  });
  return response?.result ?? response;
}


/**
 * Save previewed content as author drafts.
 * @param {{ batchId: string, sourceFileName: string, rows: Array<object> }} payload
 * @returns {Promise<any>}
 */
export async function confirmContentImport(payload) {
  const response = await api.post('/content-import/confirm', payload, {
    timeout: 60000,
  });
  return response?.result ?? response;
}

export async function uploadListeningAudio(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/content-import/listening-audio', formData, { timeout: 60000 });
  return response?.result ?? response;
}

export async function getAuthorImportBatches() {
  return api.get('/content-author/manual/import-batches');
}

export async function getAuthorImportBatch(batchId) {
  return api.get('/content-author/manual/import-batches/' + batchId);
}

export async function submitAuthorImportBatch(batchId) {
  const response = await api.post('/content-author/manual/import-batches/' + batchId + '/submit');
  return response.result;
}
