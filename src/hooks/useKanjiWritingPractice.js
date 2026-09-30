// src/hooks/useKanjiWritingPractice.js
import { useCallback, useEffect, useState } from 'react';
import { getDueKanjiForWriting, submitKanjiWritingResult } from '../api/kanjiWritingApi';

export function useKanjiWritingPractice(count = 10) {
    const [queue, setQueue] = useState([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastResult, setLastResult] = useState(null);

    const loadQueue = useCallback(async () => {
        setLoading(true);
        setError(null);
        setLastResult(null);
        try {
            // NOTE: giả định api.get() (client.js) đã tự unwrap và trả thẳng phần "data" trong
            // ApiResponse<T> của backend - nếu client.js chỉ unwrap response axios (trả nguyên
            // { success, message, data }), đổi dòng dưới thành: const { data } = await ...
            const data = await getDueKanjiForWriting(count);
            setQueue(data ?? []);
            setIndex(0);
        } catch (err) {
            setError(err.message ?? 'Không thể tải danh sách chữ cần luyện.');
        } finally {
            setLoading(false);
        }
    }, [count]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const currentItem = queue[index] ?? null;
    const isFinished = !loading && queue.length > 0 && index >= queue.length;

    const submitResult = useCallback(
        async (totalMistakes) => {
            if (!currentItem) return;
            try {
                // Cùng giả định unwrap như loadQueue ở trên.
                const result = await submitKanjiWritingResult({
                    kanjiEntryId: currentItem.kanjiEntryId,
                    totalMistakes,
                });
                setLastResult(result);
                setIndex((i) => i + 1);
            } catch (err) {
                setError(err.message ?? 'Không thể ghi nhận kết quả luyện viết.');
            }
        },
        [currentItem]
    );

    return {
        currentItem,
        index,
        total: queue.length,
        isFinished,
        loading,
        error,
        lastResult,
        submitResult,
        reload: loadQueue,
    };
}