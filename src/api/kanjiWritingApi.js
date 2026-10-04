import { api } from './client.js';

/**
 * 1. GET /api/kanjiwritingpractice/due (Lấy danh sách Kanji cần luyện viết hôm nay)
 * @param {number} count
 */
export async function getDueKanjiForWriting(count = 10) {
    const response = await api.get('/kanjiwritingpractice/due', { params: { count } });
    return response?.result ?? response;
}

export async function getAllKanjiForWriting(count = 100) {
    const response = await api.get('/kanjiwritingpractice/all', { params: { count } });
    return response?.result ?? response;
}

/**
 * 2. POST /api/kanjiwritingpractice/submit (Ghi nhận kết quả 1 lượt luyện viết)
 * @param {Object} data - { kanjiEntryId, totalMistakes }
 */
export async function submitKanjiWritingResult(data) {
    const response = await api.post('/kanjiwritingpractice/submit', data);
    return response?.result ?? response;
}

export async function getKanjiWritingScores() {
    const response = await api.get('/kanjiwritingpractice/scores');
    return response?.result ?? response;
}