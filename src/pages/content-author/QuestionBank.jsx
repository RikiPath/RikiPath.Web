import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  FilePlus2,
  HelpCircle,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import { api } from '@/api/client.js';
import { ContentAuthorShell } from '@/layouts';
import {
  Badge,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  FeatureIcon,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  RefreshingIndicator,
  SakuraLoader,
  Tabs,
} from '@/components/ui';
import { getQuestionDetail, searchQuestions } from '@/features/content-author/api/sharedBankApi.js';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { statuses } from '@/features/content-author/utils/contentModel.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const QUESTION_TYPE_LABELS = {
  SingleChoice: 'Trắc nghiệm 1 đáp án',
  MultipleChoice: 'Nhiều đáp án',
  FillInBlank: 'Điền khuyết',
  Ordering: 'Sắp xếp câu',
  TrueFalse: 'Đúng / Sai',
  Listening: 'Nghe hiểu',
};

const STATUS_BADGE_TONES = {
  Draft: 'neutral',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

export default function QuestionBank() {
  const { tr, trf } = useLocale();
  const [activeTab, setActiveTab] = useState('approved');
  const [keyword, setKeyword] = useState('');
  const [levelId, setLevelId] = useState('ALL');
  const [skillId, setSkillId] = useState('ALL');
  const [questionType, setQuestionType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const pageSize = 20;

  const { levels, skills, levelById } = useAuthorLookups();

  const approvedQuery = useQuery({
    queryKey: ['question-bank-approved', keyword.trim(), levelId, skillId, questionType, page],
    queryFn: () =>
      searchQuestions({
        keyword: keyword.trim(),
        jlptLevelId: levelId !== 'ALL' ? Number(levelId) : undefined,
        languageSkillId: skillId !== 'ALL' ? Number(skillId) : undefined,
        questionType: questionType !== 'ALL' ? questionType : undefined,
        page,
        pageSize,
      }),
    enabled: activeTab === 'approved',
    placeholderData: (prev) => prev,
  });

  const detailQuery = useQuery({
    queryKey: ['question-bank-detail', selectedQuestion?.id],
    queryFn: () => getQuestionDetail(selectedQuestion.id),
    enabled: Boolean(selectedQuestion?.id),
  });

  const myDraftsQuery = useQuery({
    queryKey: ['content-approvals-mine'],
    queryFn: async () => {
      const response = await api.get('/content-approvals/mine');
      return Array.isArray(response) ? response : response?.result || [];
    },
    enabled: activeTab === 'drafts',
  });

  const approvedRows = approvedQuery.data?.items || [];
  const totalCount = approvedQuery.data?.totalCount ?? approvedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasFilters = keyword.trim() !== '' || levelId !== 'ALL' || skillId !== 'ALL' || questionType !== 'ALL';

  const draftExerciseRows = useMemo(
    () =>
      (myDraftsQuery.data || []).filter(
        (item) => item.entityType === 'PracticeExercise' || item.entityType === 'MockTest',
      ),
    [myDraftsQuery.data],
  );

  const resetFilters = () => {
    setKeyword('');
    setLevelId('ALL');
    setSkillId('ALL');
    setQuestionType('ALL');
    setPage(1);
  };

  const approvedColumns = [
    {
      key: 'questionText',
      header: tr('Nội dung câu hỏi'),
      render: (row) => (
        <div className="max-w-[360px] space-y-1">
          <p className="rp-jp line-clamp-2 font-medium text-rp-text">{row.questionText}</p>
          <p className="truncate text-xs text-rp-text-muted">
            {[row.mockTestTitle, row.sectionTitle].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'jlptLevelName',
      header: tr('Cấp độ'),
      render: (row) => (
        row.jlptLevelName ? <Badge tone="neutral" size="sm" icon={false}>{row.jlptLevelName}</Badge> : '—'
      ),
    },
    {
      key: 'skillName',
      header: tr('Kỹ năng'),
      render: (row) => (
        row.skillName ? <Badge tone="info" size="sm" icon={false}>{row.skillName}</Badge> : '—'
      ),
    },
    {
      key: 'questionType',
      header: tr('Dạng câu hỏi'),
      render: (row) => (
        <Badge tone="brand" size="sm" icon={false}>
          {tr(QUESTION_TYPE_LABELS[row.questionType] || row.questionType)}
        </Badge>
      ),
    },
  ];

  const draftColumns = [
    {
      key: 'rowKey',
      header: tr('Bộ câu hỏi / Bài luyện'),
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-rp-text">{row.rowKey || '—'}</p>
          {row.reviewNote && (
            <p className="text-xs text-rose-700">{tr('Góp ý')}: {row.reviewNote}</p>
          )}
        </div>
      ),
    },
    {
      key: 'entityType',
      header: tr('Loại'),
      render: (row) => (
        <Badge tone="brand" size="sm" icon={false}>
          {row.entityType === 'MockTest' ? tr('Đề thi thử') : tr('Bài luyện tập')}
        </Badge>
      ),
    },
    {
      key: 'level',
      header: tr('Cấp độ'),
      render: (row) => {
        const code = row.certificateLevelCode || levelById.get(Number(row.certificateLevelId))?.code;
        return code ? <Badge tone="neutral" size="sm" icon={false}>{code}</Badge> : '—';
      },
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (row) => (
        <Badge tone={STATUS_BADGE_TONES[row.status] || 'neutral'} size="sm" icon={false}>
          {tr(statuses[row.status]?.label ?? row.status)}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: tr('Cập nhật'),
      render: (row) => (
        <span className="text-xs text-rp-text-2">{formatVnDateTime(row.updatedAt || row.submittedAt)}</span>
      ),
    },
  ];

  const detailData = detailQuery.data || selectedQuestion;

  return (
    <ContentAuthorShell pathname="/question-bank" breadcrumb={tr('Ngân hàng câu hỏi')}>
      <main data-page="QuestionBank" className="mx-auto w-full min-w-0 max-w-[1280px] space-y-5">
        <PageHeader
          eyebrow={tr('Kho câu hỏi thực tế')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="mock" size="lg" />
              <span>{tr('Ngân hàng câu hỏi')}</span>
              {activeTab === 'approved' && !approvedQuery.isPending && (
                <Badge tone="neutral" size="sm" icon={false}>{totalCount}</Badge>
              )}
            </span>
          }
          description={tr('Tra cứu câu hỏi đã xuất bản theo cấp độ, kỹ năng và dạng bài; hoặc chuyển sang biên soạn bộ câu hỏi mới.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RefreshingIndicator active={approvedQuery.isFetching && !approvedQuery.isPending} />
              <Link
                to="/content-manual/?type=PracticeExercise"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>{tr('Soạn bài luyện tập')}</span>
              </Link>
              <Link
                to="/exam-builder/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                <HelpCircle className="h-4 w-4" />
                <span>{tr('Soạn đề thi thử')}</span>
              </Link>
            </div>
          }
        />

        <Tabs
          variant="pill"
          label={tr('Ngân hàng câu hỏi')}
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: 'approved', label: tr('Câu hỏi đã xuất bản'), count: approvedQuery.data?.totalCount },
            { value: 'drafts', label: tr('Bộ câu hỏi của tôi'), count: draftExerciseRows.length || undefined },
          ]}
        />

        {activeTab === 'approved' ? (
          <>
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="min-w-[200px] flex-1">
                  <Input
                    type="search"
                    icon={Search}
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setPage(1);
                    }}
                    placeholder={tr('Tìm theo nội dung câu hỏi hoặc lời giải…')}
                    aria-label={tr('Tìm câu hỏi')}
                  />
                </div>

                <div className="w-full sm:w-[165px]">
                  <CustomSelect
                    value={levelId}
                    aria-label={tr('Cấp độ')}
                    onChange={(v) => {
                      setLevelId(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: tr('Mọi cấp độ') },
                      ...levels.map((lvl) => ({
                        value: String(lvl.id),
                        label: `${lvl.certificate} · ${lvl.code}`,
                      })),
                    ]}
                  />
                </div>

                <div className="w-full sm:w-[165px]">
                  <CustomSelect
                    value={skillId}
                    aria-label={tr('Kỹ năng')}
                    onChange={(v) => {
                      setSkillId(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: tr('Mọi kỹ năng') },
                      ...skills.map((s) => ({ value: String(s.id), label: s.name })),
                    ]}
                  />
                </div>

                <div className="w-full sm:w-[185px]">
                  <CustomSelect
                    value={questionType}
                    aria-label={tr('Dạng câu hỏi')}
                    onChange={(v) => {
                      setQuestionType(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: tr('Mọi dạng câu') },
                      ...Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => ({
                        value: k,
                        label: tr(label),
                      })),
                    ]}
                  />
                </div>

                {hasFilters && (
                  <Button variant="ghost" size="sm" icon={X} onClick={resetFilters}>
                    {tr('Xóa bộ lọc')}
                  </Button>
                )}
              </div>
            </Card>

            {approvedQuery.isPending ? (
              <SakuraLoader variant="section" context="lesson" delay={140} />
            ) : approvedQuery.isError ? (
              <ContextualErrorState
                error={approvedQuery.error}
                title={tr('Chưa tải được ngân hàng câu hỏi')}
                onRetry={() => approvedQuery.refetch()}
              />
            ) : approvedRows.length === 0 ? (
              <ContextualEmptyState
                title={hasFilters ? tr('Không có câu hỏi khớp bộ lọc') : tr('Ngân hàng câu hỏi đang trống')}
                description={
                  hasFilters
                    ? tr('Hãy thử xóa bộ lọc hoặc đổi từ khóa tìm kiếm.')
                    : tr('Khi đề thi thử hoặc bài luyện được Admin duyệt, các câu hỏi sẽ hiển thị tại đây.')
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={resetFilters}>{tr('Xóa bộ lọc')}</Button>
                  ) : null
                }
              />
            ) : (
              <div className="space-y-4">
                <DataTable
                  columns={approvedColumns}
                  rows={approvedRows}
                  keyField="id"
                  onRowClick={(row) => setSelectedQuestion(row)}
                  rowActions={(row) => (
                    <IconButton
                      icon={Eye}
                      size="sm"
                      variant="ghost"
                      label={tr('Xem đáp án & chi tiết')}
                      onClick={() => setSelectedQuestion(row)}
                    />
                  )}
                />
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-rp-text-muted">
                      {trf('Trang {0} / {1} · Tổng {2} câu hỏi', { 0: page, 1: totalPages, 2: totalCount })}
                    </p>
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalItems={totalCount}
                      showPageSize={false}
                      showTotal={false}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : myDraftsQuery.isPending ? (
          <SakuraLoader variant="section" context="lesson" delay={140} />
        ) : myDraftsQuery.isError ? (
          <ContextualErrorState
            error={myDraftsQuery.error}
            title={tr('Chưa tải được danh sách bộ câu hỏi')}
            onRetry={() => myDraftsQuery.refetch()}
          />
        ) : draftExerciseRows.length === 0 ? (
          <ContextualEmptyState
            title={tr('Chưa có bài luyện hay đề thi nào do bạn tạo')}
            description={tr('Mọi bài luyện tập và đề thi thử bạn soạn sẽ được lưu trực tiếp trên hệ thống.')}
            action={
              <Link
                to="/content-manual/?type=PracticeExercise"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>{tr('Tạo bài luyện tập đầu tiên')}</span>
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={draftColumns}
            rows={draftExerciseRows}
            keyField="id"
            rowActions={(row) => (
              <Link
                to={
                  row.entityType === 'MockTest'
                    ? `/exam-builder/?editId=${row.targetEntityId}`
                    : `/content-manual/?type=PracticeExercise&editId=${row.targetEntityId}`
                }
                className="rp-link text-xs font-semibold text-rp-brand-strong"
              >
                {tr('Mở trình soạn')} →
              </Link>
            )}
          />
        )}

        {/* Question Detail Modal */}
        <Modal
          open={Boolean(selectedQuestion)}
          onClose={() => setSelectedQuestion(null)}
          title={tr('Chi tiết câu hỏi')}
          size="lg"
          footer={
            <div className="flex justify-end">
              <Button onClick={() => setSelectedQuestion(null)}>{tr('Đóng')}</Button>
            </div>
          }
        >
          {detailQuery.isPending ? (
            <SakuraLoader variant="section" context="lesson" delay={120} />
          ) : detailQuery.isError ? (
            <ContextualErrorState
              compact
              error={detailQuery.error}
              title={tr('Không tải được chi tiết câu hỏi')}
              onRetry={() => detailQuery.refetch()}
            />
          ) : detailData ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {detailData.jlptLevelName && <Badge tone="neutral" size="sm" icon={false}>{detailData.jlptLevelName}</Badge>}
                {detailData.skillName && <Badge tone="info" size="sm" icon={false}>{detailData.skillName}</Badge>}
                <Badge tone="brand" size="sm" icon={false}>
                  {tr(QUESTION_TYPE_LABELS[detailData.questionType] || detailData.questionType)}
                </Badge>
              </div>

              {(detailData.mockTestTitle || detailData.sectionTitle) && (
                <p className="text-xs text-rp-text-muted">
                  <strong>{tr('Nguồn đề')}:</strong> {[detailData.mockTestTitle, detailData.sectionTitle].filter(Boolean).join(' · ')}
                </p>
              )}

              <div className="rounded-2xl border border-rp-line bg-rp-bg-2/50 p-4">
                <p className="rp-jp text-base font-semibold text-rp-text">{detailData.questionText}</p>
              </div>

              {detailData.imageUrl && (
                <img
                  src={detailData.imageUrl}
                  alt={tr('Hình minh họa câu hỏi')}
                  className="max-h-52 rounded-xl border border-rp-line object-contain"
                />
              )}

              {detailData.audioUrl && (
                <div className="flex items-center gap-3 rounded-xl border border-rp-line bg-rp-bg-2/40 p-3">
                  <Volume2 className="h-4 w-4 shrink-0 text-rp-brand-strong" />
                  <audio controls src={detailData.audioUrl} className="h-8 w-full" />
                </div>
              )}

              {detailData.options?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-rp-text-muted">{tr('Các phương án trả lời')}</p>
                  <ul className="space-y-2">
                    {detailData.options.map((opt, idx) => (
                      <li
                        key={opt.id || idx}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
                          opt.isCorrect
                            ? 'border-emerald-300 bg-emerald-50/80 font-semibold text-emerald-900'
                            : 'border-rp-line bg-white text-rp-text'
                        }`}
                      >
                        <span className="rp-jp">{opt.optionText}</span>
                        {opt.isCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{tr('Đáp án đúng')}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailData.answerSummary && !detailData.options?.length && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
                  <strong>{tr('Đáp án chuẩn')}:</strong> {detailData.answerSummary}
                </div>
              )}

              {detailData.explanation && (
                <div className="rounded-xl border border-rp-line bg-white p-3.5 text-sm leading-6 text-rp-text-2">
                  <p className="text-xs font-semibold text-rp-text-muted">{tr('Giải thích chi tiết')}</p>
                  <p className="mt-1 whitespace-pre-line">{detailData.explanation}</p>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      </main>
    </ContentAuthorShell>
  );
}
