import { api } from './client.js';
const root = '/study-courses';
export const courseGet = async (path = '') => (await api.get(root + path)).result;
export const coursePost = async (path, body = {}) => (await api.post(root + path, body)).result;
export const saveCoursePlan = async (plan) => (await (plan.id
  ? api.put(`${root}/plans/${plan.id}`, plan) : api.post(`${root}/plans`, plan))).result;
export const uploadRetakeEvidence = async (id, form) => (await api.post(`${root}/${id}/retake`, form, {
  transformRequest: [(data, headers) => { delete headers['Content-Type']; return data; }],
})).result;
export async function openRetakeEvidence(courseId, requestId) {
  const blob = await api.get(`${root}/${courseId}/retake/${requestId}/evidence`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `JLPT-${courseId}-${requestId}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'}`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
