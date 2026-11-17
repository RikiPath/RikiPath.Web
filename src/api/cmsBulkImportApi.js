import { api } from './client.js';

/**
 * Preview rồi confirm file .xlsx theo API content-import.
 * Không gọi /content-management/bulk-import vì controller đó đã tắt.
 */
export async function uploadBulkImportFile(file) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'import.xlsx');
  const preview = await api.post('/content-import/preview', formData, {
    timeout: 60000,
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
  const body = preview?.result ?? preview;
  const sheets = body?.sheets || [];
  const allRows = sheets.flatMap((sheet) => (sheet.rows || []).map((row) => ({ sheet, row })));
  const errors = allRows
    .filter((item) => item.row.action === 'Error')
    .flatMap((item) => (item.row.errors || ['Dòng lỗi']).map((message) => ({
      row: item.row.sourceRowNumber,
      message,
    })));
  const totalRows = sheets.reduce((sum, sheet) => sum + (sheet.totalRows || 0), 0);
  if (errors.length) {
    return { result: { successCount: 0, totalRows, failedCount: errors.length, errors } };
  }
  const rows = allRows
    .filter((item) => item.row.action === 'New' || item.row.action === 'Modified')
    .map(({ sheet, row }) => ({
      entityType: sheet.entityType,
      action: row.action,
      targetEntityId: row.targetEntityId,
      rowKey: row.rowKey,
      sourceRowNumber: row.sourceRowNumber,
      payloadJson: row.payloadJson,
      changedFields: row.changedFields,
    }));
  const confirmed = await api.post('/content-import/confirm', {
    sourceFileName: file.name,
    rows,
  }, { timeout: 60000 });
  const result = confirmed?.result ?? confirmed;
  return {
    result: {
      successCount: result?.draftsCreatedCount || 0,
      totalRows: totalRows || rows.length,
      failedCount: result?.skippedCount || 0,
      errors: [],
    },
  };
}
