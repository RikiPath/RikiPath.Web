import { api } from './client.js';

/**
 * 1. POST /api/admin/consultants (Thêm Consultant mới)
 * @param {Object} data - { email, password, firstName, lastName, phoneNumber }
 */
export async function createConsultant(data) {
  return await api.post('/admin/consultants', data);
}

/**
 * 2. GET /api/admin/consultants (Lấy danh sách Consultant)
 */
export async function getConsultants() {
  return await api.get('/admin/consultants');
}

/**
 * 3. PUT /api/admin/consultants/{consultantId}/active (Bật/tắt kích hoạt Consultant)
 * @param {number|string} consultantId
 * @param {boolean} isActive
 */
export async function toggleConsultantActive(consultantId, isActive) {
  return await api.put(`/admin/consultants/${consultantId}/active`, null, {
    params: { isActive },
  });
}

/**
 * 4. POST /api/admin/consultants/packages (Thêm Package mới)
 * @param {Object} data - { name, description, type: "Meeting"|"WrittenAnswer", price, durationMinutes }
 */
export async function createConsultationPackage(data) {
  return await api.post('/admin/consultants/packages', data);
}

/**
 * 5. GET /api/admin/consultants/packages (Lấy danh sách Package)
 */
export async function getConsultationPackages() {
  return await api.get('/admin/consultants/packages');
}

/**
 * 6. PUT /api/admin/consultants/packages/{packageId} (Cập nhật thông tin Package)
 * @param {number|string} packageId
 * @param {Object} data - { name, description, price, durationMinutes }
 */
export async function updateConsultationPackage(packageId, data) {
  return await api.put(`/admin/consultants/packages/${packageId}`, data);
}

/**
 * 7. PUT /api/admin/consultants/packages/{packageId}/active (Bật/tắt kích hoạt Package)
 * @param {number|string} packageId
 * @param {boolean} isActive
 */
export async function togglePackageActive(packageId, isActive) {
  return await api.put(`/admin/consultants/packages/${packageId}/active`, null, {
    params: { isActive },
  });
}
