import { useCallback, useEffect, useState } from 'react';
import { getDueKanaForWriting, submitKanaWritingResult } from '../api/kanaWritingApi.js';

export function useKanaWritingPractice(type, count = 20) {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(Boolean(type));
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const loadQueue = useCallback(async () => {
    if (type !== 'Hiragana' && type !== 'Katakana') return;
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const data = await getDueKanaForWriting({ count, type });
      setQueue(Array.isArray(data) ? data.filter(Boolean) : []);
      setIndex(0);
    } catch (err) {
      setError(err.message ?? 'Không thể tải danh sách Kana cần luyện viết.');
    } finally {
      setLoading(false);
    }
  }, [count, type]);

  useEffect(() => {
    if (type !== 'Hiragana' && type !== 'Katakana') return undefined;
    loadQueue();
    return undefined;
  }, [loadQueue, type]);

  const currentItem = queue[index] ?? null;

  const selectItem = useCallback((itemIndex) => {
    setIndex(Math.max(0, Math.min(itemIndex, queue.length - 1)));
    setLastResult(null);
  }, [queue.length]);

  const submitResult = useCallback(async (totalMistakes) => {
    if (!currentItem?.kanaCharacterId) return;
    try {
      const result = await submitKanaWritingResult({
        kanaCharacterId: currentItem.kanaCharacterId,
        totalMistakes: Math.max(0, totalMistakes ?? 0),
      });
      setLastResult(result);
    } catch (err) {
      setError(err.message ?? 'Không thể ghi nhận kết quả luyện viết Kana.');
    }
  }, [currentItem]);

  return {
    queue,
    currentItem,
    index,
    loading,
    error,
    lastResult,
    submitResult,
    selectItem,
    reload: loadQueue,
  };
}
