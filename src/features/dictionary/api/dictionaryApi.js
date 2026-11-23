import { api } from '@/api/client.js';

function unwrap(data) {
  return data?.result ?? data?.data ?? data;
}

export async function lookupDictionary({ q = '', level = '' } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (level) params.set('level', level);
  const data = await api.get(`/Dictionary/lookup?${params.toString()}`);
  return unwrap(data);
}

export async function translateSelection({ text, contextSentence = '', targetLanguage = 'vi' }) {
  const data = await api.post('/Dictionary/translate', {
    text,
    contextSentence,
    targetLanguage,
  });
  return unwrap(data);
}
