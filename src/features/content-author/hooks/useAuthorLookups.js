import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client.js';

export function useAuthorLookups() {
  const query = useQuery({
    queryKey: ['manual-content-lookups'],
    queryFn: () => api.get('/content-author/manual/lookups'),
    staleTime: 120_000,
  });

  const rawLevels = useMemo(() => query.data?.levels || [], [query.data]);
  const skills = useMemo(() => query.data?.skills || [], [query.data]);
  const sections = useMemo(() => query.data?.sections || [], [query.data]);
  const topics = useMemo(() => query.data?.topics || [], [query.data]);

  const levels = useMemo(
    () =>
      [...rawLevels].sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || (a.id ?? 0) - (b.id ?? 0),
      ),
    [rawLevels],
  );

  const levelById = useMemo(() => {
    const map = new Map();
    levels.forEach((lvl) => map.set(Number(lvl.id), lvl));
    return map;
  }, [levels]);

  const levelByCode = useMemo(() => {
    const map = new Map();
    levels.forEach((lvl) => {
      const code = String(lvl.code || '').trim().toUpperCase();
      if (!map.has(code)) map.set(code, lvl);
    });
    return map;
  }, [levels]);

  const sectionsForLevel = useMemo(
    () => (levelId) =>
      sections
        .filter((s) => Number(s.certificateLevelId) === Number(levelId))
        .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)),
    [sections],
  );

  return {
    ...query,
    lookups: query.data || { levels: [], skills: [], sections: [], topics: [] },
    levels,
    skills,
    sections,
    topics,
    levelById,
    levelByCode,
    sectionsForLevel,
  };
}
