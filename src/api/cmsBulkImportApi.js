import axios from 'axios';
import { getSession } from '../auth/session.js';
import { api } from './client.js';

const DIRECT_BACKEND_URL = 'https://localhost:7237/api/content-management/bulk-import';

/**
 * Uploads file to bulk import API endpoint.
 *
 * @param {File|Blob} file - The file to upload
 * @param {Object} [options] - Additional options or metadata
 * @returns {Promise<any>}
 */
export async function uploadBulkImportFile(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'bulk-import.csv');

  if (options.conflictRule) {
    formData.append('conflictRule', options.conflictRule);
  }
  if (options.targetLevel) {
    formData.append('targetLevel', options.targetLevel);
  }

  const token = getSession()?.accessToken;
  const headers = {
    'Content-Type': 'multipart/form-data',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Try direct backend endpoint first as requested
  try {
    const response = await axios.post(DIRECT_BACKEND_URL, formData, {
      headers,
      timeout: 60000,
    });
    return response.data;
  } catch (directErr) {
    // If the server responded with a 4xx validation or format error, extract the backend error details directly
    if (directErr.response && directErr.response.data) {
      const d = directErr.response.data;
      const errorList = Array.isArray(d?.errors) && d.errors.length > 0 ? d.errors.join(' | ') : '';
      const fullMsg = [d?.errorMessage || d?.message, errorList].filter(Boolean).join(': ') || `Lỗi từ máy chủ (${directErr.response.status})`;
      const error = new Error(fullMsg);
      error.response = directErr.response;
      error.data = d;
      throw error;
    }

    console.warn('Direct backend call to 7237 failed or blocked by CORS, trying proxied /api/content-management/bulk-import...', directErr);
    // Fallback to configured api proxy
    try {
      return await api.post('/content-management/bulk-import', formData, {
        headers,
        timeout: 60000,
      });
    } catch (proxyErr) {
      const d = proxyErr.response?.data || directErr.response?.data;
      const errorList = Array.isArray(d?.errors) && d.errors.length > 0 ? d.errors.join(' | ') : '';
      const fullMsg = [d?.errorMessage || d?.message, errorList].filter(Boolean).join(': ') || proxyErr.message || 'Không thể kết nối đến máy chủ Bulk Import (cổng 7237).';
      const error = new Error(fullMsg);
      error.response = proxyErr.response || directErr.response;
      error.data = d;
      throw error;
    }
  }
}
