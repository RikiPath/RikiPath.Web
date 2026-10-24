import { api } from './client.js';

export const CONTENT_IMPORT_TYPES = [
  { value: 'Kanji', label: 'Hán tự (Kanji)' },
  { value: 'Vocabulary', label: 'Từ vựng (Vocabulary)' },
  { value: 'Grammar', label: 'Ngữ pháp (Grammar)' },
  { value: 'Lesson', label: 'Bài học (Lesson)' },
  { value: 'MockTest', label: 'Đề thi thử (Mock Test)' },
  { value: 'PracticeExercise', label: 'Bài tập luyện tập (Practice Exercise)' },
];

/**
 * Preview content import Excel file before committing changes.
 * @param {File|Blob} file 
 * @param {string} [entityType] 
 * @returns {Promise<any>}
 */
export async function previewContentImport(file, entityType) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'import.xlsx');
  if (entityType) {
    formData.append('entityType', entityType);
  }

  const response = await api.post('/content-import/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response?.result ?? response;
}


/**
 * Confirm previewed content import and create moderation drafts.
 * @param {{ sourceFileName: string, rows: Array<object> }} payload
 * @returns {Promise<any>}
 */
export async function confirmContentImport(payload) {
  const response = await api.post('/content-import/confirm', payload, {
    timeout: 60000,
  });
  return response?.result ?? response;
}
