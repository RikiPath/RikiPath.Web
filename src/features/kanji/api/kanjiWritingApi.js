import { api } from '@/api/client.js';

const PAGE_SIZE = 100;

/**
 * 1. GET /api/kanjiwritingpractice/due (Lấy danh sách Kanji cần luyện viết hôm nay)
 * @param {number} count
 */
export async function getDueKanjiForWriting(count = 10) {
    const response = await api.get('/kanjiwritingpractice/due', { params: { count } });
    return response?.result ?? response;
}

export async function getAllKanjiForWriting() {
    const response = await api.get('/kanjiwritingpractice/all');
    return response?.result ?? response;
}

/**
 * Tải toàn bộ danh mục Hán tự Kanji công khai từ SharedBank (N5–N1), tự động nối trang nếu vượt 100 chữ.
 */
export async function getKanjiLibraryCatalog({ jlptLevelId, keyword = '', maxPages = 20 } = {}) {
    const basePayload = {
        keyword: keyword?.trim() || '',
        pageSize: PAGE_SIZE,
        ...(jlptLevelId ? { jlptLevelId: Number(jlptLevelId) } : {}),
    };

    const firstRaw = await api.post('/SharedBank/kanji/search', { ...basePayload, page: 1 });
    const firstPage = firstRaw?.result ?? firstRaw ?? {};
    const firstItems = Array.isArray(firstPage.items) ? firstPage.items : [];
    const totalCount = Number(firstPage.totalCount ?? firstItems.length) || firstItems.length;
    const totalPages = Math.min(maxPages, Math.max(1, Number(firstPage.totalPages ?? Math.ceil(totalCount / PAGE_SIZE)) || 1));

    if (totalPages <= 1) {
        return { items: firstItems, totalCount };
    }

    const restRequests = [];
    for (let page = 2; page <= totalPages; page += 1) {
        restRequests.push(
            api.post('/SharedBank/kanji/search', { ...basePayload, page }).then((res) => res?.result ?? res ?? {}),
        );
    }
    const restPages = await Promise.all(restRequests);
    const items = [...firstItems, ...restPages.flatMap((pageData) => (Array.isArray(pageData?.items) ? pageData.items : []))];

    return { items, totalCount };
}

export async function recognizeDrawnKanji(image) {
    const body = new FormData();
    body.append('image', image, 'kanji.png');
    const response = await api.post('/kanjiwritingpractice/recognize', body, {
        transformRequest: [(payload, headers) => { delete headers['Content-Type']; return payload; }],
    });
    return response?.result ?? response;
}

/**
 * 2. POST /api/kanjiwritingpractice/submit (Ghi nhận kết quả 1 lượt luyện viết)
 * @param {Object} data - { kanjiId, totalMistakes, score, correctStrokeCount, totalStrokeCount, practiceMode }
 */
export async function submitKanjiWritingResult(data) {
    const response = await api.post('/kanjiwritingpractice/submit', data);
    return response?.result ?? response;
}

export async function getKanjiWritingScores() {
    const response = await api.get('/kanjiwritingpractice/scores');
    return response?.result ?? response;
}
