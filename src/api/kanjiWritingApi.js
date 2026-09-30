import { api } from './client.js';

/**
 * 1. GET /api/kanjiwritingpractice/due (Lấy danh sách Kanji cần luyện viết hôm nay)
 * @param {number} count
 */
export async function getDueKanjiForWriting(count = 10) {
    return await api.get('/kanjiwritingpractice/due', { params: { count } });
}

/**
 * 2. POST /api/kanjiwritingpractice/submit (Ghi nhận kết quả 1 lượt luyện viết)
 * @param {Object} data - { kanjiEntryId, totalMistakes }
 */
export async function submitKanjiWritingResult(data) {
    return await api.post('/kanjiwritingpractice/submit', data);
}