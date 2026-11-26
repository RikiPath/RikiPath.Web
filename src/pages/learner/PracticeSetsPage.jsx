import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  captureMainScrollTop,
  captureNavigationOrigin,
  saveListViewState,
} from '@/utils/navigationContext.js';
import {
  ChevronDown,
  ChevronRight,
  FileCheck2,
  History,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import {
  getPracticeSets,
  startMockTest,
} from '@/features/mock-test/api/mockTestApi.js';
import { exportExamFile, triggerBlobDownload } from '@/features/content-author/api/contentAuthoringV2Api.js';
import { api } from '@/api/client.js';
import { useAuth } from '@/app/auth/authContext.js';
import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import ExamCatalogCard, { ExamCatalogCardSkeleton } from '@/features/mock-test/components/ExamCatalogCard.jsx';
import ExamFilterToolbar from '@/features/mock-test/components/ExamFilterToolbar.jsx';
import PracticeSetInfoModal from '@/features/mock-test/components/PracticeSetInfoModal.jsx';
import ResumeOrRestartModal from '@/features/mock-test/components/ResumeOrRestartModal.jsx';
import {
  PRACTICE_STATUS_FILTER_OPTIONS,
  SKILL_FILTER_OPTIONS,
  formatMockDateTime,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  EmptyState,
  PageContainer,
  ProgressBar,
  notify,
} from '@/components/ui';
import { ControlGroup, filterSupportedJlptLevels, IllustratedPageHeader } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';

export default function PracticeSetsPage() {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  function openPracticeAttempt(attemptId, { result = false } = {}) {
    saveListViewState('/practice-sets', {
      search: location.search,
      scrollTop: captureMainScrollTop(),
    });
    const path = result ? `/practice-sets/result/${attemptId}/` : `/practice-sets/attempt/${attemptId}/`;
    navigate(path, {
      state: {
        navigationOrigin: captureNavigationOrigin(location, { backLabel: 'Quay lại bộ đề' }),
      },
    });
  }

  const deepLinkTestId = Number(params.get('testId')) || null;
  const levelParam = params.get('level') || 'ALL';

  const [skillFilter, setSkillFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const [infoModalTestId, setInfoModalTestId] = useState(null);
  const [deepLinkDismissed, setDeepLinkDismissed] = useState(false);
  const [resumeTarget, setResumeTarget] = useState(null);
  const [showAllInProgress, setShowAllInProgress] = useState(false);

  const activeInfoModalTestId = infoModalTestId ?? (!deepLinkDismissed ? deepLinkTestId : null);

  const levelsQuery = useQuery({
    queryKey: ['jlpt-levels-supported'],
    queryFn: async () => {
      const { result } = await api.get('/CertificateLevel/jlpt');
      return filterSupportedJlptLevels(result || []);
    },
  });

  const activeLevelObj = (levelsQuery.data || []).find((l) => l.code === levelParam) || null;

  const practiceQuery = useQuery({
    queryKey: ['learner-practice-sets', user?.userId, activeLevelObj?.id, statusFilter],
    queryFn: () =>
      getPracticeSets({
        levelId: activeLevelObj?.id || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const startMutation = useMutation({
    mutationFn: ({ testId, forceNew }) => startMockTest(testId, { forceNew }),
    onSuccess: (attempt) => {
      setResumeTarget(null);
      closeInfoModal();
      void queryClient.invalidateQueries({ queryKey: ['learner-practice-sets'] });
      openPracticeAttempt(attempt.attemptId);
    },
    onError: (err) => notify.apiError(err, tr('Không thể bắt đầu bộ đề luyện tập'), { key: 'ps-start-err' }),
  });

  const allItems = useMemo(() => practiceQuery.data || [], [practiceQuery.data]);

  const items = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return allItems.filter((item) => {
      if (skillFilter === 'Mixed') {
        if (item.examKind !== 'MixedPractice' && (item.includedSkills || []).length < 3) {
          return false;
        }
      } else if (skillFilter !== 'ALL') {
        const skills = (item.includedSkills || []).join(' ').toLowerCase();
        const title = String(item.title || '').toLowerCase();
        const target = skillFilter.toLowerCase();
        const matchesKanjiAlias = target === 'kanji' && (skills.includes('kanji') || title.includes('kanji') || title.includes('hán tự'));
        if (!skills.includes(target) && !title.includes(target) && !matchesKanjiAlias) {
          return false;
        }
      }
      if (!q) return true;
      return (
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q) ||
        String(item.jlptLevelName || '').toLowerCase().includes(q)
      );
    });
  }, [allItems, skillFilter, keyword]);

  const inProgressItems = useMemo(
    () => allItems.filter((item) => item.userStatus === 'IN_PROGRESS' && item.activeAttemptId),
    [allItems],
  );

  const infoInitialSummary = useMemo(
    () => allItems.find((item) => item.mockTestId === activeInfoModalTestId) || null,
    [allItems, activeInfoModalTestId],
  );

  const hasActiveFilters =
    levelParam !== 'ALL' ||
    skillFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    keyword.trim().length > 0;

  function handleResetFilters() {
    setKeyword('');
    setSkillFilter('ALL');
    setStatusFilter('ALL');
    setParams({});
  }

  function openInfoModal(testId) {
    setDeepLinkDismissed(false);
    setInfoModalTestId(testId);
  }

  function closeInfoModal() {
    setInfoModalTestId(null);
    setDeepLinkDismissed(true);
    if (deepLinkTestId) {
      const next = new URLSearchParams(params);
      next.delete('testId');
      setParams(next, { replace: true });
    }
  }

  function handleCardPrimaryAction(item) {
    if (!item || startMutation.isPending) return;
    if (item.userStatus === 'UNAVAILABLE' || (item.canStart === false && item.userStatus !== 'IN_PROGRESS')) {
      notify.info(item.unavailableReason || tr('Bộ đề hiện chưa khả dụng.'), '', { key: 'ps-unavail' });
      return;
    }
    if (item.userStatus === 'IN_PROGRESS' && item.activeAttemptId) {
      setResumeTarget(item);
      return;
    }
    startMutation.mutate({ testId: item.mockTestId, forceNew: false });
  }

  async function handleDownloadPdf(examId) {
    try {
      const { blob, fileName } = await exportExamFile(examId, 'pdf', false);
      triggerBlobDownload(blob, fileName);
      notify.success(tr('Đã tải xuống bản PDF bộ đề luyện tập.'), '', { key: 'ps-pdf-ok' });
    } catch (err) {
      notify.apiError(err, tr('Chưa tải được file PDF bộ đề luyện tập'), { key: 'ps-pdf-err' });
    }
  }

  const levelOptions = useMemo(
    () => [{ code: 'ALL', label: 'Tất cả' }, ...(levelsQuery.data || []).map((l) => ({ code: l.code, label: l.code }))],
    [levelsQuery.data],
  );

  return (
    <LearnerShell breadcrumb={tr('Bộ đề luyện tập')}>
      <PageContainer data-page="PracticeSetsPage" width="default" className="space-y-4">
        <IllustratedPageHeader
          icon="mock"
          tone="sakura"
          eyebrow={tr('Luyện tập theo kỹ năng')}
          title={tr('Bộ đề luyện tập JLPT')}
          description={tr('Rèn luyện từng kỹ năng hoặc kết hợp nhiều kỹ năng để từng bước nâng cao năng lực tiếng Nhật.')}
          actions={
            <ControlGroup>
              <Button as={Link} to="/mock-tests/" variant="outline" size="md" icon={FileCheck2}>
                {tr('Thi thử JLPT')}
              </Button>
              <Button as={Link} to="/exam-result/" variant="primary" size="md" icon={History}>
                {tr('Lịch sử & kết quả')}
              </Button>
            </ControlGroup>
          }
        />

        <ExamFilterToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Tìm bộ đề luyện tập…"
          levels={levelOptions}
          activeLevel={levelParam}
          onLevelChange={(code) => {
            const next = new URLSearchParams(params);
            if (code && code !== 'ALL') next.set('level', code);
            else next.delete('level');
            setParams(next);
          }}
          selects={[
            { key: 'skill', label: 'Kỹ năng', value: skillFilter, onChange: setSkillFilter, options: SKILL_FILTER_OPTIONS },
            { key: 'status', label: 'Trạng thái', value: statusFilter, onChange: setStatusFilter, options: PRACTICE_STATUS_FILTER_OPTIONS },
          ]}
          hasActiveFilters={hasActiveFilters}
          onReset={handleResetFilters}
        />

        {inProgressItems.length > 0 && (
          <Card className="rp-resume-strip border-amber-200/80 bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF7FA] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
              <div className="flex items-center gap-2">
                <Badge tone="warning" size="sm" icon={PlayCircle}>{tr('Tiếp tục luyện tập')}</Badge>
                <span className="text-xs font-medium text-rp-text-muted">
                  {trf('Bạn có {0} bộ đề đang làm dở', { 0: inProgressItems.length })}
                </span>
              </div>
              {inProgressItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  iconRight={ChevronDown}
                  onClick={() => setShowAllInProgress((v) => !v)}
                >
                  {showAllInProgress
                    ? tr('Thu gọn')
                    : trf('Xem thêm ({0})', { 0: inProgressItems.length - 1 })}
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              {(showAllInProgress ? inProgressItems : inProgressItems.slice(0, 1)).map((active) => {
                const answered = active.activeAnsweredCount ?? 0;
                const total = active.activeTotalQuestions ?? active.questionCount ?? 0;
                const pct = active.activeProgressPercent ?? (total > 0 ? Math.round((answered / total) * 100) : 0);
                return (
                  <div
                    key={active.mockTestId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rp-line/80 bg-white px-3.5 py-3"
                  >
                    <div className="min-w-[200px] flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand" size="sm" icon={false}>{active.jlptLevelName}</Badge>
                        <p className="text-sm font-bold text-rp-text">{tr(active.title)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-rp-text-muted">
                        <span className="font-semibold text-rp-brand-strong tabular-nums">
                          {trf('Đã hoàn thành {0}/{1} câu ({2}%)', { 0: answered, 1: total, 2: pct })}
                        </span>
                        {active.activeLastSavedAt && (
                          <span>{trf('Lưu gần nhất: {0}', { 0: formatMockDateTime(active.activeLastSavedAt) })}</span>
                        )}
                      </div>
                      <ProgressBar value={pct} max={100} label={active.title} />
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={RotateCcw}
                        onClick={() => setResumeTarget(active)}
                      >
                        {tr('Bắt đầu lại')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        iconRight={ChevronRight}
                        onClick={() => openPracticeAttempt(active.activeAttemptId)}
                      >
                        {tr('Làm tiếp')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {startMutation.error && (
          <Banner tone="danger">{formatApiError(startMutation.error, tr('Không mở được lượt luyện tập.'))}</Banner>
        )}

        {practiceQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <ExamCatalogCardSkeleton key={n} />
            ))}
          </div>
        ) : practiceQuery.isError ? (
          <Card>
            <ContextualErrorState error={practiceQuery.error} compact onRetry={() => practiceQuery.refetch()} />
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              variant="compact"
              illustration="book"
              title={tr('Chưa có bộ đề luyện tập phù hợp.')}
              description={tr('Hãy thử bỏ bớt bộ lọc đang chọn hoặc sang mục Thi thử JLPT để làm đề tổng hợp.')}
              action={
                hasActiveFilters ? (
                  <Button type="button" variant="outline" size="sm" icon={RotateCcw} onClick={handleResetFilters}>
                    {tr('Đặt lại bộ lọc')}
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-rp-text-muted">
              <span>{trf('Hiển thị {0} bộ đề luyện tập phù hợp', { 0: items.length })}</span>
            </div>

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li key={item.mockTestId} className="min-w-0">
                  <ExamCatalogCard
                    item={item}
                    variant="practice"
                    pending={startMutation.isPending}
                    onViewInfo={(target) => openInfoModal(target.mockTestId)}
                    onViewResult={(target) => openPracticeAttempt(target.latestCompletedAttemptId, { result: true })}
                    onPrimaryAction={(target) => handleCardPrimaryAction(target)}
                    onRequestRestart={(target) => setResumeTarget(target)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        <PracticeSetInfoModal
          open={Boolean(activeInfoModalTestId)}
          testId={activeInfoModalTestId}
          initialSummary={infoInitialSummary}
          onClose={closeInfoModal}
          onDownloadPdf={handleDownloadPdf}
          starting={startMutation.isPending}
          onStartOrResume={(summary) => handleCardPrimaryAction(summary)}
        />

        <ResumeOrRestartModal
          open={Boolean(resumeTarget)}
          summary={resumeTarget}
          onClose={() => setResumeTarget(null)}
          loading={startMutation.isPending}
          onContinue={(summary) => {
            setResumeTarget(null);
            openPracticeAttempt(summary.activeAttemptId);
          }}
          onStartNew={(summary) => startMutation.mutate({ testId: summary.mockTestId, forceNew: true })}
        />
      </PageContainer>
    </LearnerShell>
  );
}
