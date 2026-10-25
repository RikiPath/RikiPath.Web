import { api } from './client.js';

/**
 * Gửi file .xlsx tới POST /api/content-management/bulk-import.
 * API chỉ đọc file, không nhận conflictRule hay targetLevel.
 */
export async function uploadBulkImportFile(file) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'bulk-import.xlsx');

  return api.post('/content-management/bulk-import', formData, {
    timeout: 60000,
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
}
