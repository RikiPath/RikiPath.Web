import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllKanaForWriting, getDueKanaForWriting, submitKanaWritingResult } from '@/features/kanji/api/kanaWritingApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui/feedbackStore.js';

const isKanaType = (type) => type === 'Hiragana' || type === 'Katakana';

/** Kana writing practice queue (due or all) for Hiragana / Katakana. */
export function useKanaWritingPractice(type, scope = 'due') {
  const enabled = isKanaType(type);
  const query = useQuery({
    queryKey: ['kana-writing-queue', type, scope],
    queryFn: async () => {
      const data = scope === 'all' ? await getAllKanaForWriting(type) : await getDueKanaForWriting({ count: 20, type });
      return Array.isArray(data) ? data.filter(Boolean) : [];
    },
    enabled,
  });
  const queue = enabled ? query.data ?? [] : [];
  const [index, setIndex] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // A freshly loaded queue starts from the first character (adjusted during render).
  const [loadedQueue, setLoadedQueue] = useState(query.data);
  if (loadedQueue !== query.data) {
    setLoadedQueue(query.data);
    setIndex(0);
    setLastResult(null);
  }

  const currentItem = queue[index] ?? null;

  const selectItem = useCallback((itemIndex) => {
    setIndex(Math.max(0, Math.min(itemIndex, queue.length - 1)));
    setLastResult(null);
  }, [queue.length]);

  const submitResult = useCallback(async (totalMistakes) => {
    if (!currentItem?.kanaCharacterId) return;
    setSubmitError(null);
    try {
      const result = await submitKanaWritingResult({
        kanaCharacterId: currentItem.kanaCharacterId,
        totalMistakes: Math.max(0, totalMistakes ?? 0),
      });
      setLastResult(result);
      notify.success('Đã lưu kết quả luyện viết Kana.', '', { key: `kana-write-${currentItem.kanaCharacterId}` });
    } catch (err) {
      setSubmitError(describeApiError(err).message || 'Không thể ghi nhận kết quả luyện viết Kana.');
      notify.apiError(err, 'Không ghi nhận được kết quả luyện viết Kana', { key: 'kana-write-err' });
    }
  }, [currentItem]);

  const reload = useCallback(() => {
    setSubmitError(null);
    setLastResult(null);
    return query.refetch();
  }, [query]);

  const loadError = query.isError ? describeApiError(query.error).message || 'Không thể tải danh sách Kana cần luyện viết.' : null;

  return {
    queue,
    currentItem,
    index,
    loading: enabled && query.isPending,
    retrying: enabled && query.isFetching,
    error: submitError || loadError,
    rawError: query.isError ? query.error : null,
    lastResult,
    submitResult,
    selectItem,
    reload,
  };
}
