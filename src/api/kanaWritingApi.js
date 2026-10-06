import { api } from './client.js';

/**
 * GET /api/kana-writing-practice/due
 * @param {{ count?: number, type?: 'Hiragana' | 'Katakana' }} [query]
 */
export async function getDueKanaForWriting({ count = 20, type } = {}) {
  const params = { count };
  if (type) params.type = type;
  const response = await api.get('/kana-writing-practice/due', { params });
  return response?.result ?? response;
}

/**
 * POST /api/kana-writing-practice/submit
 * Body matches SubmitKanaWritingResultRequest: kanaCharacterId, totalMistakes.
 */
export async function submitKanaWritingResult({ kanaCharacterId, totalMistakes }) {
  const response = await api.post('/kana-writing-practice/submit', {
    kanaCharacterId,
    totalMistakes,
  });
  return response?.result ?? response;
}
