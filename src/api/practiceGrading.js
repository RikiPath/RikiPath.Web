import { api } from './client.js';
import { getCertificateTypes, getLevelsByCertificate } from './certificateApi.js';

export async function getPracticeLevelId(levelCode) {
  if (!levelCode) {
    const { result: profile } = await api.get('/UserProfile/me');
    if (!profile?.targetJlptLevelId) throw new Error('Hãy chọn mục tiêu JLPT trước khi chấm bài.');
    return profile.targetJlptLevelId;
  }

  const types = await getCertificateTypes();
  const jlpt = types.find(type => type.name?.trim().toUpperCase() === 'JLPT');
  const levels = jlpt ? await getLevelsByCertificate(jlpt.id) : [];
  const level = levels.find(item => item.code?.trim().toUpperCase() === levelCode);
  if (!level) throw new Error('Cấp độ ' + levelCode + ' chưa khả dụng để chấm bài.');
  return level.id;
}

export async function gradeSpeaking(audioFile, certificateLevelId, topic) {
  const form = new FormData();
  form.append('audioFile', audioFile);
  form.append('certificateLevelId', String(certificateLevelId));
  if (topic?.trim()) form.append('topic', topic.trim());
  const response = await api.post('/Speech/grade', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.result;
}
