import { api } from '@/api/client.js';

/**
 * Lấy danh sách chứng chỉ đang hoạt động (IsActive = true).
 * Luồng xử lý: Trả về các chứng chỉ sắp xếp theo sortOrder.
 */
export async function getCertificateTypes() {
  const data = await api.get('/certificate-types');
  const list = Array.isArray(data) ? data : data?.result || [];
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Lấy danh sách cấp độ theo chứng chỉ.
 * @param {number} certificateTypeId - Id của chứng chỉ (CertificateType)
 */
export async function getLevelsByCertificate(certificateTypeId) {
  if (!certificateTypeId) return [];
  const data = await api.get(`/CertificateLevel/by-certificate/${certificateTypeId}`);
  const list = Array.isArray(data) ? data : data?.result || [];
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
