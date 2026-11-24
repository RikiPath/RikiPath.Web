import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { School } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { AdminShell, LearnerShell, MentorShell } from '@/layouts';
import { courseGet, getCohortHomework, getCohorts } from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors.js';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel';
import {
  Banner,
  Button,
  Card,
  CustomSelect,
  EmptyState,
  ErrorState,
  PageContainer,
  RefreshingIndicator,
  SakuraLoader,
  UnifiedToolbar,
  notify,
  useSubmitGuard,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { classifyHomeworkItem } from '@/features/calendar/utils/calendarEventsModel.js';
import { invalidateScheduleAndHomeworkCaches } from '@/features/srs/utils/srsCacheSync.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Group Learning homework hub (Learner / Mentor / Admin).
 * Canonical Cohort homework contract:
 *   GET /homework?cohortId · POST /homework/cohorts/{id} · POST /homework/{id}/submit
 *   POST /homework/{id}/submit-scan · POST /homework/{id}/ai-draft · POST /homework/{id}/grade
 */
export default function HomeworkPage({ mentor = false, admin = false }) {
  const { tr } = useLocale();
  const role = admin ? 'Admin' : mentor ? 'Mentor' : 'Learner';
  const uid = getSession()?.userId ?? 'anon';
  const Shell = admin ? AdminShell : mentor ? MentorShell : LearnerShell;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { busy, guard } = useSubmitGuard();
  const [error, setError] = useState('');

  const coursesQuery = useQuery({ queryKey: ['homework-hub', uid, role, 'courses'], queryFn: () => courseGet() });
  const cohortsListQuery = useQuery({ queryKey: ['homework-hub', uid, role, 'cohorts'], queryFn: () => getCohorts() });
  const cohortNameMap = useMemo(() => {
    const m = new Map();
    (cohortsListQuery.data || []).forEach((ch) => {
      if (ch?.id && ch?.name) m.set(ch.id, ch.name);
    });
    return m;
  }, [cohortsListQuery.data]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const courses = useMemo(
    () => (Array.isArray(coursesQuery.data) ? coursesQuery.data : []).filter((c) => c.cohortId && c.status !== 'Cancelled' && c.status !== 'PendingPayment'),
    [coursesQuery.data],
  );
  const cohorts = useMemo(() => {
    const map = new Map();
    for (const c of courses) {
      if (!map.has(c.cohortId)) {
        map.set(c.cohortId, {
          id: c.cohortId,
          courseId: c.id,
          name: cohortNameMap.get(c.cohortId) || c.cohortName || c.name,
          level: c.level,
        });
      }
    }
    return [...map.values()];
  }, [courses, cohortNameMap]);

  const cohortMap = useMemo(() => new Map(cohorts.map((c) => [c.id, c])), [cohorts]);

  const rawRequested = params.get('cohortId');
  const requested = Number(rawRequested);
  const canQueryAllCohorts = role === 'Learner';
  const cohortId = cohorts.some((c) => c.id === requested)
    ? requested
    : canQueryAllCohorts
      ? 'ALL'
      : cohorts[0]?.id;
  const effectiveCohortId = cohortId === 'ALL' ? undefined : cohortId;
  const coursesInCohort = effectiveCohortId ? courses.filter((c) => c.cohortId === effectiveCohortId) : courses;

  const hwQuery = useQuery({
    queryKey: ['homework-hub', uid, role, 'items', cohortId ?? 'none'],
    queryFn: () => getCohortHomework(effectiveCohortId),
    enabled: canQueryAllCohorts ? courses.length > 0 : Boolean(effectiveCohortId),
  });

  const filteredHomeworks = useMemo(() => {
    const list = Array.isArray(hwQuery.data) ? hwQuery.data : [];
    if (statusFilter === 'ALL') return list;
    return list.filter((hw) => {
      const kind = classifyHomeworkItem(hw);
      if (statusFilter === 'PENDING') return kind === 'pending' || kind === 'dueSoon' || kind === 'overdue';
      return kind === statusFilter.toLowerCase();
    });
  }, [hwQuery.data, statusFilter]);

  // Single in-flight guard via useSubmitGuard for create / submit / AI draft / grade.
  async function onRun(fn, message = 'Đã lưu thay đổi.') {
    return guard(async () => {
      setError('');
      const toastId = notify.loading('Đang xử lý bài tập…', '', { key: 'homework-action' });
      try {
        const result = await fn();
        await invalidateScheduleAndHomeworkCaches(queryClient);
        const resolved = typeof message === 'function' ? message(result) : message;
        const isAiUnavailable = Boolean(result?.available === false || result?.aiDraftUnavailable);
        notify[isAiUnavailable ? 'warning' : 'success'](resolved, '', { id: toastId, key: 'homework-action', replace: true });
        return result;
      } catch (e) {
        const info = describeApiError(e);
        setError(info.message);
        notify.apiError(e, info.status === 409 ? 'Xung đột dữ liệu bài tập' : 'Thao tác thất bại', { id: toastId, key: 'homework-action', replace: true });
        if (info.status === 409) void hwQuery.refetch();
        throw e;
      }
    });
  }

  const title = role === 'Mentor' ? 'Bài tập & chấm điểm' : 'Bài tập về nhà';
  const description =
    role === 'Mentor'
      ? 'Giao bài chung hoặc riêng, xem bài nộp bằng chữ hoặc ảnh/PDF, tham khảo gợi ý chấm bài AI và công bố điểm 0–100 kèm nhận xét.'
      : role === 'Admin'
        ? 'Theo dõi bài tập của các lớp nhóm (chỉ xem).'
        : 'Nộp bài bằng chữ hoặc ảnh/PDF và xem điểm, nhận xét của Giáo viên.';

  const isRefreshingAll = (coursesQuery.isFetching || hwQuery.isFetching || cohortsListQuery.isFetching)
    && !coursesQuery.isPending && !hwQuery.isPending;
  const handleRefresh = () => Promise.all([
    coursesQuery.refetch({ cancelRefetch: true }),
    cohorts.length > 0 ? hwQuery.refetch({ cancelRefetch: true }) : Promise.resolve(),
    cohortsListQuery.isError ? cohortsListQuery.refetch({ cancelRefetch: true }) : Promise.resolve(),
  ]);

  return (
    <Shell breadcrumb={tr(title)}>
      <PageContainer width="default" density="comfortable" className="relative space-y-4 text-rp-text">
        {/* Admin and Mentor workspace pages omit visual title blocks (breadcrumb + sidebar name the page). */}
        {role === 'Admin' || role === 'Mentor' ? (
          <h1 className="sr-only">{tr(title)}</h1>
        ) : (
          <IllustratedPageHeader
            icon="homework"
            tone="peach"
            eyebrow={tr('Học nhóm')}
            title={tr(title)}
            description={tr(description)}
          />
        )}

        {error && (
          <Banner tone="danger" title="Chưa thực hiện được" onDismiss={() => setError('')} className="mb-4">
            {error}
          </Banner>
        )}

        {cohortsListQuery.isError && (
          <Banner
            tone="warning"
            className="mb-4"
            actions={(
              <Button variant="secondary" size="sm" onClick={() => cohortsListQuery.refetch()}>
                {tr('Thử lại')}
              </Button>
            )}
          >
            {tr('Chưa tải được tên đầy đủ của các lớp nhóm. Đang dùng tên hiển thị mặc định.')}
          </Banner>
        )}

        {coursesQuery.isPending ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : coursesQuery.isError ? (
          <Card><ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} retrying={coursesQuery.isFetching} /></Card>
        ) : cohorts.length === 0 ? (
          <Card>
            <EmptyState
              illustration="classroom"
              title={role === 'Learner' ? 'Bạn chưa tham gia lớp nhóm nào' : 'Chưa có lớp nhóm'}
              description={role === 'Learner' ? 'Bài tập về nhà được giao trong lớp học nhóm cùng Giáo viên.' : 'Bài tập xuất hiện khi lớp nhóm có học viên ghi danh.'}
              action={role === 'Learner' && (
                <Link to="/cohorts">
                  <Button variant="primary" icon={School}>{tr('Khám phá lớp học')}</Button>
                </Link>
              )}
            />
          </Card>
        ) : hwQuery.isPending ? (
          <SakuraLoader variant="section" context="homework" delay={160} />
        ) : hwQuery.isError ? (
          <Card><ErrorState error={hwQuery.error} onRetry={() => hwQuery.refetch()} retrying={hwQuery.isFetching} /></Card>
        ) : (
          <div className="space-y-4">
            <UnifiedToolbar
              tabs={{
                label: tr('Lọc trạng thái bài tập'),
                value: statusFilter,
                onChange: setStatusFilter,
                tabs: [
                  { value: 'ALL', label: 'Tất cả' },
                  { value: 'PENDING', label: role === 'Mentor' ? 'Chưa nộp' : 'Cần làm' },
                  { value: 'SUBMITTED', label: role === 'Mentor' ? 'Chờ chấm' : 'Đã nộp' },
                  { value: 'GRADED', label: 'Đã chấm' },
                ],
              }}
              filters={
                (canQueryAllCohorts ? cohorts.length >= 1 : cohorts.length > 1) ? (
                  <CustomSelect
                    fitContent
                    size="md"
                    className="max-w-full sm:max-w-[280px]"
                    label={tr('Chọn lớp')}
                    searchable={cohorts.length > 6}
                    value={String(cohortId ?? '')}
                    onChange={(nextVal) => {
                      if (!nextVal || nextVal === 'ALL') setParams({});
                      else setParams({ cohortId: nextVal });
                    }}
                    options={[
                      ...(canQueryAllCohorts ? [{ value: 'ALL', label: tr('Tất cả lớp') }] : []),
                      ...cohorts.map((c) => ({ value: String(c.id), label: `${c.name}${c.level ? ` · ${c.level}` : ''}` })),
                    ]}
                  />
                ) : null
              }
              actions={
                effectiveCohortId && cohortMap.get(effectiveCohortId)?.courseId && role === 'Learner' ? (
                  <Link to={`/my-courses/${cohortMap.get(effectiveCohortId).courseId}?section=homework`} className="rp-link text-xs font-semibold">
                    {tr('Mở không gian lớp này')}
                  </Link>
                ) : effectiveCohortId && role === 'Mentor' ? (
                  <Link to={`/mentor-study-courses/${effectiveCohortId}/?section=homework`} className="rp-link text-xs font-semibold">
                    {tr('Mở không gian lớp này')}
                  </Link>
                ) : null
              }
              refresh={
                role !== 'Learner'
                  ? {
                      onRefresh: handleRefresh,
                      refreshing: isRefreshingAll,
                      disabled: hwQuery.isPending,
                    }
                  : undefined
              }
            />

            {isRefreshingAll && (
              <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
                <div className="flex justify-end">
                  <div className="pointer-events-auto">
                    <RefreshingIndicator active delay={60} />
                  </div>
                </div>
              </div>
            )}

            <CohortHomeworkPanel
              key={cohortId ?? 'all'}
              cohortId={effectiveCohortId}
              cohortName={effectiveCohortId ? (cohorts.find((c) => c.id === effectiveCohortId)?.name || '') : tr('Tất cả lớp')}
              cohortMap={cohortMap}
              coursesInCohort={coursesInCohort}
              items={filteredHomeworks}
              role={role}
              busy={busy}
              onRun={onRun}
            />
          </div>
        )}
      </PageContainer>
    </Shell>
  );
}
