import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { School } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { AdminShell, MentorShell, LearnerShell } from '@/layouts';
import { courseGet, getCohorts, getCohortHomework } from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors.js';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel';
import { Banner, Card, EmptyState, ErrorState, PageHeader, SakuraLoader, Select, cx, notify } from '@/components/ui';
import { classifyHomeworkItem } from '@/features/calendar/utils/calendarEventsModel.js';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

/**
 * Group Learning homework hub (Learner / Mentor / Admin).
 * Uses the canonical Cohort homework contract only:
 *   GET /homework?cohortId · POST /homework/cohorts/{id} · POST /homework/{id}/scan
 *   POST /homework/{id}/ai-draft (Mentor) · PUT /homework/{id}/grade {submissionId, score 0–100, feedback ≤ 2000}
 * The former 1-1 booking homework (audio upload, batch AI drafts, /homework/group) is retired:
 * those Backend routes do not exist.
 */
export default function HomeworkPage({ mentor = false, admin = false }) {
  const { tr } = useLocale();
  const role = admin ? 'Admin' : mentor ? 'Mentor' : 'Learner';
  const uid = getSession()?.userId ?? 'anon';
  const Shell = admin ? AdminShell : mentor ? MentorShell : LearnerShell;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
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
  const courses = useMemo(() => (Array.isArray(coursesQuery.data) ? coursesQuery.data : []).filter((c) => c.cohortId && c.status !== 'Cancelled'), [coursesQuery.data]);
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

  // Single in-flight guard for create / submit / AI draft / grade (no double submit).
  async function onRun(fn, message = 'Đã lưu thay đổi.') {
    if (busy) return;
    setBusy(true);
    setError('');
    const toastId = notify.loading('Đang xử lý bài tập…', '', { key: 'homework-action' });
    try {
      const result = await fn();
      await queryClient.invalidateQueries({ queryKey: ['homework-hub', uid, role, 'items'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-calendar', 'homeworks', uid] });
      const resolved = typeof message === 'function' ? message(result) : message;
      const isAiUnavailable = Boolean(result?.aiDraftUnavailable || (typeof resolved === 'string' && resolved.includes('AI chưa tạo được')));
      notify[isAiUnavailable ? 'warning' : 'success'](resolved, '', { id: toastId, key: 'homework-action', replace: true });
    } catch (e) {
      const info = describeApiError(e);
      setError(info.message);
      notify.apiError(e, info.status === 409 ? 'Xung đột dữ liệu bài tập' : 'Thao tác thất bại', { id: toastId, key: 'homework-action', replace: true });
      // 409 HOMEWORK_SUBMISSION_CHANGED: the learner re-submitted — reload so the Mentor grades the latest version.
      if (info.status === 409) void hwQuery.refetch();
    } finally {
      setBusy(false);
    }
  }

  const title = role === 'Mentor' ? 'Bài tập & chấm điểm' : role === 'Admin' ? 'Bài tập về nhà' : 'Bài tập về nhà';
  const description =
    role === 'Mentor'
      ? 'Giao bài chung hoặc riêng, xem bài nộp (chữ/ảnh/PDF ≤ 10 MB), dùng gợi ý AI/OCR khi có và chấm điểm 0–100 kèm nhận xét.'
      : role === 'Admin'
        ? 'Theo dõi bài tập của các lớp nhóm (chỉ xem).'
        : 'Nộp bài bằng chữ hoặc ảnh/PDF và xem điểm, nhận xét của Giáo viên.';

  return (
    <Shell breadcrumb={title}>
      <div className="rp-container py-6 lg:py-8">
        <PageHeader
          eyebrow={tr('Học nhóm')}
          title={title}
          description={description}
          actions={
            (canQueryAllCohorts ? cohorts.length >= 1 : cohorts.length > 1) && (
              <label className="block w-full sm:w-80">
                <span className="sr-only">{tr('Chọn lớp')}</span>
                <Select
                  value={cohortId ?? ''}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    if (!nextVal || nextVal === 'ALL') setParams({});
                    else setParams({ cohortId: nextVal });
                  }}
                >
                  {canQueryAllCohorts && <option value="ALL">{tr('Tất cả lớp')}</option>}
                  {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.level ? ` · ${c.level}` : ''}</option>)}
                </Select>
              </label>
            )
          }
        />

        {error && <Banner tone="danger" title={tr('Chưa thực hiện được')} onDismiss={() => setError('')} className="mb-4">{error}</Banner>}

        {coursesQuery.isPending ? (
          <SakuraLoader variant="section" context="cohort" delay={160} />
        ) : coursesQuery.isError ? (
          <Card><ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} retrying={coursesQuery.isFetching} /></Card>
        ) : cohorts.length === 0 ? (
          <Card>
            <EmptyState
              art="empty"
              title={role === 'Learner' ? tr('Bạn chưa tham gia lớp nhóm nào') : tr('Chưa có lớp nhóm')}
              description={role === 'Learner' ? tr('Bài tập về nhà được giao trong lớp học nhóm cùng Giáo viên.') : tr('Bài tập xuất hiện khi lớp nhóm có học viên ghi danh.')}
              action={role === 'Learner' && (
                <Link to="/cohorts" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white rp-press"><School aria-hidden="true" className="h-4 w-4" />{' '}{tr('Khám phá lớp học')}</Link>
              )}
            />
          </Card>
        ) : hwQuery.isPending ? (
          <SakuraLoader variant="section" context="homework" delay={160} />
        ) : hwQuery.isError ? (
          <Card><ErrorState error={hwQuery.error} onRetry={() => hwQuery.refetch()} retrying={hwQuery.isFetching} /></Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'PENDING', label: 'Cần làm' },
                  { id: 'SUBMITTED', label: 'Đã nộp' },
                  { id: 'GRADED', label: 'Đã chấm' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id)}
                    className={cx(
                      'rp-focus rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      statusFilter === chip.id
                        ? 'bg-rp-brand-strong text-white'
                        : 'border border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border',
                    )}
                  >
                    {tr(chip.label)}
                  </button>
                ))}
              </div>
              {effectiveCohortId && cohortMap.get(effectiveCohortId)?.courseId && role === 'Learner' && (
                <Link
                  to={`/my-courses/${cohortMap.get(effectiveCohortId).courseId}?section=homework`}
                  className="text-xs font-semibold rp-link"
                >
                  {tr('Mở không gian lớp này')}
                </Link>
              )}
              {effectiveCohortId && role === 'Mentor' && (
                <Link
                  to={`/mentor-study-courses/${effectiveCohortId}/?section=homework`}
                  className="text-xs font-semibold rp-link"
                >
                  {tr('Mở không gian lớp này')}
                </Link>
              )}
            </div>
            <div className="course-page" style={{ padding: 0 }}>
              <CohortHomeworkPanel
                key={`${cohortId}-${statusFilter}`}
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
          </div>
        )}
      </div>
    </Shell>
  );
}
