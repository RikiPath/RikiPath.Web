// src/hooks/useKanjiWritingPractice.js
import { useCallback, useEffect, useState } from 'react';
import { getDueKanjiForWriting, submitKanjiWritingResult } from '../api/kanjiWritingApi';

export function useKanjiWritingPractice(count = 10, { enabled = true } = {}) {
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
            // Ignore empty records so a malformed item cannot crash the practice page.
            setQueue(Array.isArray(data) ? data.filter(Boolean) : []);
            setIndex(0);
        } catch (err) {
            setError(err.message ?? 'Không thể tải danh sách chữ cần luyện.');
        } finally {
            setLoading(false);
        }
    }, [count]);

    useEffect(() => {
        if (!enabled) return undefined;
        // Loading remote practice data is the purpose of this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadQueue();
        return undefined;
    }, [enabled, loadQueue]);

    const currentItem = queue[index] ?? null;
    const isFinished = !loading && queue.length > 0 && index >= queue.length;

    const selectItem = useCallback((itemIndex) => {
        setIndex(Math.max(0, Math.min(itemIndex, queue.length - 1)));
        setLastResult(null);
    }, [queue.length]);

    const submitResult = useCallback(
        async ({ totalMistakes, score, practiceMode = 'guided' }) => {
            if (!currentItem) return;
            try {
                // Cùng giả định unwrap như loadQueue ở trên.
                const result = await submitKanjiWritingResult({
                    kanjiId: currentItem.kanjiId,
                    totalMistakes,
                    score: Math.max(0, Math.min(100, score ?? (100 - totalMistakes * 10))),
                    correctStrokeCount: Math.max(0, (currentItem.strokeCount || 1) - totalMistakes),
                    totalStrokeCount: currentItem.strokeCount || 1,
                    practiceMode,
                });
                setLastResult(result);
            } catch (err) {
                setError(err.message ?? 'Không thể ghi nhận kết quả luyện viết.');
            }
        },
        [currentItem]
    );

    return {
        queue,
        currentItem,
        index,
        total: queue.length,
        isFinished,
        loading,
        error,
        lastResult,
        submitResult,
        selectItem,
        reload: loadQueue,
    };
}