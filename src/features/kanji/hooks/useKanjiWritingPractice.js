// src/hooks/useKanjiWritingPractice.js
import { useCallback, useEffect, useState } from 'react';
import { getAllKanjiForWriting, getDueKanjiForWriting, submitKanjiWritingResult } from '@/features/kanji/api/kanjiWritingApi';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui/feedbackStore.js';

export function useKanjiWritingPractice({ enabled = true, scope = 'due' } = {}) {
    const [queue, setQueue] = useState([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(Boolean(enabled));
    const [error, setError] = useState(null);
    const [lastResult, setLastResult] = useState(null);

    const loadQueue = useCallback(async () => {
        setLoading(true);
        setError(null);
        setLastResult(null);
        try {
            const data = scope === 'all' ? await getAllKanjiForWriting() : await getDueKanjiForWriting(12);
            // Ignore empty records so a malformed item cannot crash the practice page.
            setQueue(Array.isArray(data) ? data.filter(Boolean) : []);
            setIndex(0);
        } catch (err) {
            setError(describeApiError(err).message || 'Không thể tải danh sách chữ cần luyện.');
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        if (!enabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return undefined;
        }
        // Loading remote practice data is the purpose of this effect.
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
                notify.success('Đã ghi nhận kết quả luyện viết Kanji.', '', { key: `kanji-write-${currentItem.kanjiId}` });
            } catch (err) {
                setError(describeApiError(err).message || 'Không thể ghi nhận kết quả luyện viết.');
                notify.apiError(err, 'Không ghi nhận được kết quả luyện viết', { key: 'kanji-write-err' });
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