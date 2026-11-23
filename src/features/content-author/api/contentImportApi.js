import { api } from '@/api/client.js';

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
    validateStatus: status => status === 200 || (status >= 400 && status < 500 && status !== 401),
  });
  if (result?.type?.includes('json')) {
    const errPayload = JSON.parse(await result.text());
    const apiErr = new Error(errPayload.errorMessage || errPayload.title || 'Không thể áp dụng thay đổi vào file Excel.');
    apiErr.data = errPayload;
    apiErr.code = errPayload.errorCode;
    apiErr.correlationId = errPayload.correlationId;
    throw apiErr;
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
  if (!/\.mp3$/i.test(file.name) || file.size < 4 || file.size > 500 * 1024 * 1024) {
    throw new Error('Chọn file MP3 có dữ liệu, tối đa 500 MB.');
  }
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/content-import/listening-audio', formData, {
    timeout: 300000,
    transformRequest: [(payload, headers) => {
      delete headers['Content-Type'];
      return payload;
    }],
  });
  return response?.result ?? response;
}

export async function uploadContentImage(file) {
  if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name) || file.size < 12 || file.size > 10 * 1024 * 1024) {
    throw new Error('Chọn ảnh JPG, PNG, WebP hoặc GIF có dữ liệu, tối đa 10 MB.');
  }
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/content-import/content-image', formData, {
    timeout: 120000,
    transformRequest: [(payload, headers) => {
      delete headers['Content-Type'];
      return payload;
    }],
  });
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
