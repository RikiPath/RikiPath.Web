import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDueKanjiForWriting,
  getKanjiLibraryCatalog,
  getKanjiWritingScores,
  submitKanjiWritingResult,
} from '@/features/kanji/api/kanjiWritingApi.js';
import { getJlptLevels } from '@/features/lessons/api/lessonApi.js';
import { computeWritingScore, mergeKanjiLibrary, summarizeKanjiCatalog } from '@/features/kanji/utils/kanjiLibrary.js';
import { getSession } from '@/app/auth/session.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { translateText } from '@/locales/locale.js';

export function useKanjiLibrary({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const session = getSession();
  const signedIn = Boolean(session?.accessToken);
  const userKey = session?.userId ?? 'anon';
  const [lastResult, setLastResult] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const catalogQuery = useQuery({
    queryKey: ['kanji-library-catalog'],
    queryFn: () => getKanjiLibraryCatalog(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const jlptQuery = useQuery({
    queryKey: ['jlpt-levels'],
    queryFn: async () => {
      try {
        return await getJlptLevels();
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) return [];
        return [];
      }
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  const scoresQuery = useQuery({
    queryKey: ['kanji-writing-scores', userKey],
    queryFn: async () => {
      try {
        const res = await getKanjiWritingScores();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: enabled && signedIn,
    retry: false,
  });

  const dueQuery = useQuery({
    queryKey: ['kanji-writing-due', userKey],
    queryFn: async () => {
      try {
        const res = await getDueKanjiForWriting(50);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: enabled && signedIn,
    retry: false,
  });

  const items = useMemo(
    () => mergeKanjiLibrary(catalogQuery.data?.items || [], scoresQuery.data || [], dueQuery.data || []),
    [catalogQuery.data, scoresQuery.data, dueQuery.data],
  );

  const summary = useMemo(
    () => summarizeKanjiCatalog(items, jlptQuery.data || []),
    [items, jlptQuery.data],
  );

  const submitMutation = useMutation({
    mutationFn: async ({ item, totalMistakes = 0, score: explicitScore, practiceMode = 'guided' }) => {
      const calculated = computeWritingScore(totalMistakes, item.strokeCount || 1);
      const score = explicitScore != null ? Math.max(0, Math.min(100, explicitScore)) : calculated.score;
      const result = await submitKanjiWritingResult({
        kanjiId: item.kanjiId,
        totalMistakes: calculated.totalMistakes,
        score,
        correctStrokeCount: calculated.correctStrokeCount,
        totalStrokeCount: calculated.totalStrokeCount,
        practiceMode,
      });
      return {
        ...result,
        kanjiId: item.kanjiId,
        score,
        correctStrokeCount: calculated.correctStrokeCount,
        totalStrokeCount: calculated.totalStrokeCount,
        practiceMode,
      };
    },
    onSuccess: (res) => {
      setSaveError(null);
      setLastResult(res);
      queryClient.setQueryData(['kanji-writing-scores', userKey], (prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const filtered = existing.filter((entry) => Number(entry?.kanjiId) !== Number(res.kanjiId));
        return [
          ...filtered,
          {
            kanjiId: res.kanjiId,
            score: res.score,
            correctStrokeCount: res.correctStrokeCount,
            totalStrokeCount: res.totalStrokeCount,
            practiceMode: res.practiceMode,
            completedAt: new Date().toISOString(),
          },
        ];
      });
      queryClient.invalidateQueries({ queryKey: ['kanji-writing-scores'] });
      queryClient.invalidateQueries({ queryKey: ['kanji-writing-due'] });
      queryClient.invalidateQueries({ queryKey: ['learner'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      notify.success(translateText('Đã ghi nhận kết quả luyện viết Kanji.'), '', {
        key: `kanji-write-${res.kanjiId}`,
      });
    },
    onError: (err) => {
      setSaveError(err);
      notify.apiError(err, translateText('Không ghi nhận được kết quả luyện viết'), {
        key: 'kanji-write-err',
      });
    },
  });

  const submitResult = useCallback(
    async (payload) => submitMutation.mutateAsync(payload),
    [submitMutation],
  );

  const clearFeedback = useCallback(() => {
    setLastResult(null);
    setSaveError(null);
  }, []);

  const reload = useCallback(() => {
    const tasks = [
      catalogQuery.refetch({ cancelRefetch: true }),
      jlptQuery.refetch({ cancelRefetch: true }),
    ];
    if (signedIn) {
      tasks.push(
        scoresQuery.refetch({ cancelRefetch: true }),
        dueQuery.refetch({ cancelRefetch: true }),
      );
    }
    return Promise.all(tasks);
  }, [catalogQuery, jlptQuery, scoresQuery, dueQuery, signedIn]);

  return {
    items,
    summary,
    signedIn,
    loading: catalogQuery.isPending && !catalogQuery.data,
    fetching: catalogQuery.isFetching || scoresQuery.isFetching || dueQuery.isFetching,
    error: catalogQuery.isError ? catalogQuery.error : null,
    submitting: submitMutation.isPending,
    lastResult,
    saveError,
    submitResult,
    clearFeedback,
    reload,
  };
}
