import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, History, Layers, PlayCircle } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import {
  getMockTestInfo,
  getPracticeSets,
  startMockTest,
} from '@/features/mock-test/api/mockTestApi.js';
import { exportExamFile, triggerBlobDownload } from '@/features/content-author/api/contentAuthoringV2Api.js';
import { api } from '@/api/client.js';
import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  CustomSelect,
  EmptyState,
  Input,
  PageContainer,
  SakuraLoader,
  notify,
} from '@/components/ui';
import { ControlGroup, filterSupportedJlptLevels, IllustratedPageHeader, LevelTabs } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';

export default function PracticeSetsPage() {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('testId')) || null;
  const levelParam = params.get('level') || 'ALL';

  const [skillFilter, setSkillFilter] = useState('ALL');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const levelsQuery = useQuery({
    queryKey: ['jlpt-levels-supported'],
    queryFn: async () => {
      const { result } = await api.get('/CertificateLevel/jlpt');
      return filterSupportedJlptLevels(result || []);
    },
  });

  const activeLevelObj = (levelsQuery.data || []).find((l) => l.code === levelParam) || null;

  const practiceQuery = useQuery({
    queryKey: ['learner-practice-sets', activeLevelObj?.id, skillFilter],
    queryFn: () =>
      getPracticeSets({
        levelId: activeLevelObj?.id || undefined,
        skill: skillFilter !== 'ALL' ? skillFilter : undefined,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['practice-set-info', selectedId],
    queryFn: () => getMockTestInfo(selectedId),
    enabled: Boolean(selectedId),
  });

  const startMutation = useMutation({
    mutationFn: (testId) => startMockTest(testId),
    onSuccess: (attempt) => {
      navigate(`/mock-tests?attemptId=${attempt.attemptId}`);
    },
    onError: (err) => notify.apiError(err, tr('Không thể bắt đầu bộ đề luyện tập'), { key: 'ps-start-err' }),
  });

  const items = useMemo(() => {
    const raw = practiceQuery.data || [];
    const q = keyword.trim().toLowerCase();
    return raw.filter((item) => {
      if (kindFilter !== 'ALL' && item.examKind !== kindFilter) return false;
      if (!q) return true;
      return (
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q)
      );
    });
  }, [practiceQuery.data, kindFilter, keyword]);

  async function handleDownloadPdf(examId) {
    try {
      const { blob, fileName } = await exportExamFile(examId, 'pdf', false);
      triggerBlobDownload(blob, fileName);
      notify.success(tr('Đã tải xuống bản PDF đề luyện tập.'), '', { key: 'ps-pdf-ok' });
    } catch (err) {
      notify.apiError(err, tr('Chưa tải được file PDF đề luyện tập'), { key: 'ps-pdf-err' });
    }
  }

  return (
    <LearnerShell breadcrumb={tr('Bộ đề luyện tập')}>
      <PageContainer data-page="PracticeSetsPage" width="default" className="space-y-4">
        <IllustratedPageHeader
          icon="mock"
          tone="sakura"
          eyebrow={tr('Luyện tập theo kỹ năng & Hỗn hợp')}
          title={tr('Bộ đề luyện tập JLPT')}
          description={tr('Ôn tập linh hoạt từng kỹ năng (Từ vựng, Kanji, Ngữ pháp, Đọc hiểu, Nghe hiểu) hoặc bài tập hỗn hợp nhiều kỹ năng. Thi thử JLPT đầy đủ nằm ở mục riêng.')}
          actions={
            <ControlGroup>
              {levelsQuery.data?.length > 0 && !selectedId && (
                <LevelTabs
                  label={tr('Cấp độ luyện tập')}
                  value={levelParam}
                  onChange={(code) => setParams(code && code !== 'ALL' ? { level: code } : {})}
                  levels={[{ id: 'ALL', code: 'ALL', label: tr('Tất cả') }, ...levelsQuery.data]}
                />
              )}
              <Button as={Link} to="/mock-tests/" variant="outline" size="md">
                {tr('Sang Thi thử JLPT')}
              </Button>
              <Button as={Link} to="/exam-result/" variant="primary" size="md" icon={History}>
                {tr('Lịch sử & kết quả')}
              </Button>
            </ControlGroup>
          }
        />

        {selectedId ? (
          detailQuery.isPending ? (
            <SakuraLoader variant="section" context="mocktest" delay={140} />
          ) : detailQuery.isError ? (
            <Card>
              <ContextualErrorState error={detailQuery.error} compact onRetry={() => detailQuery.refetch()} />
            </Card>
          ) : detailQuery.data ? (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand" icon={false}>{detailQuery.data.jlptLevelName}</Badge>
                  <Badge tone="info" icon={false}>
                    {detailQuery.data.examKind === 'MixedPractice' ? tr('Hỗn hợp nhiều kỹ năng') : tr('Luyện tập kỹ năng')}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={() => handleDownloadPdf(selectedId)}>
                  {tr('Tải đề PDF')}
                </Button>
              </div>
              <div>
                <h2 className="text-xl font-bold text-rp-text">{tr(detailQuery.data.title)}</h2>
                {detailQuery.data.description && (
                  <p className="mt-1 text-sm text-rp-text-2">{tr(detailQuery.data.description)}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-rp-text-2">
                <span>{trf('{0} phút', { 0: detailQuery.data.timeLimitMinutes })}</span>
                <span>{trf('{0} câu', { 0: detailQuery.data.questionCount })}</span>
              </div>
              <ul className="divide-y divide-rp-line rounded-xl border border-rp-line">
                {(detailQuery.data.sections || []).map((section, idx) => (
                  <li key={idx} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-rp-text">{section.title}</span>
                    <span className="text-rp-text-muted">
                      {section.skillName ? `${section.skillName} · ` : ''}
                      {trf('{0} câu', { 0: section.questionCount })}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="secondary" onClick={() => setParams(levelParam !== 'ALL' ? { level: levelParam } : {})}>
                  {tr('Về danh sách bộ đề')}
                </Button>
                <Button
                  variant="primary"
                  icon={PlayCircle}
                  loading={startMutation.isPending}
                  onClick={() => startMutation.mutate(selectedId)}
                >
                  {tr('Bắt đầu luyện tập')}
                </Button>
              </div>
            </Card>
          ) : null
        ) : (
          <>
            <Card className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-[200px] flex-1">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={tr('Tìm bộ đề theo tên hoặc chủ đề…')}
                />
              </div>
              <CustomSelect
                fitContent
                size="sm"
                value={skillFilter}
                onChange={setSkillFilter}
                options={[
                  { value: 'ALL', label: tr('Mọi kỹ năng') },
                  { value: 'Vocabulary', label: 'Từ vựng (Vocabulary)' },
                  { value: 'Kanji', label: 'Hán tự (Kanji)' },
                  { value: 'Grammar', label: 'Ngữ pháp (Grammar)' },
                  { value: 'Reading', label: 'Đọc hiểu (Reading)' },
                  { value: 'Listening', label: 'Nghe hiểu (Listening)' },
                ]}
              />
              <CustomSelect
                fitContent
                size="sm"
                value={kindFilter}
                onChange={setKindFilter}
                options={[
                  { value: 'ALL', label: tr('Mọi dạng bộ đề') },
                  { value: 'PracticeSet', label: tr('Đơn kỹ năng') },
                  { value: 'MixedPractice', label: tr('Hỗn hợp (Mixed)') },
                ]}
              />
            </Card>

            {startMutation.error && (
              <Banner tone="danger">{formatApiError(startMutation.error, tr('Không mở được lượt luyện tập.'))}</Banner>
            )}

            {practiceQuery.isPending ? (
              <SakuraLoader variant="section" context="mocktest" delay={140} />
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
                  description={tr('Hãy chọn cấp độ hoặc kỹ năng khác, hoặc thử các đề Thi thử JLPT đầy đủ.')}
                />
              </Card>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <li key={item.mockTestId}>
                    <Card className="flex h-full flex-col justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand" size="sm" icon={false}>{item.jlptLevelName}</Badge>
                          <Badge tone={item.examKind === 'MixedPractice' ? 'warning' : 'info'} size="sm" icon={false}>
                            <Layers className="mr-1 h-3 w-3" />
                            {item.examKind === 'MixedPractice' ? tr('Hỗn hợp nhiều kỹ năng') : tr('Luyện tập kỹ năng')}
                          </Badge>
                          <Badge tone="neutral" size="sm" icon={false}>
                            {trf('{0} phút', { 0: item.timeLimitMinutes })}
                          </Badge>
                          <Badge tone="neutral" size="sm" icon={false}>
                            {trf('{0} câu', { 0: item.questionCount })}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-rp-text">{tr(item.title)}</h3>
                        {item.description && <p className="text-sm text-rp-text-2">{tr(item.description)}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={() =>
                          setParams({
                            ...(levelParam !== 'ALL' ? { level: levelParam } : {}),
                            testId: String(item.mockTestId),
                          })
                        }
                      >
                        {tr('Xem & làm bài')}
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
