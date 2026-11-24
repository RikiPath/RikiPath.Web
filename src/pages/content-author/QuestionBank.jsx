import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  GitBranch,
  HelpCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { api } from '@/api/client.js';
import { ContentAuthorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataRefreshBoundary,
  DataTable,
  FeatureIcon,
  IconButton,
  Modal,
  PageContainer,
  PageHeader,
  SakuraLoader,
  UnifiedToolbar,
  confirmAction,
  notify,
} from '@/components/ui';
import { getQuestionDetail, searchQuestions } from '@/features/content-author/api/sharedBankApi.js';
import {
  createQuestionNewVersionV2,
  deleteQuestionDraftV2,
  exportQuestionBankFile,
  getPassageGroupV2,
  getQuestionBankDetailV2,
  listPassagesV2,
  searchQuestionBankV2,
  submitQuestionV2,
  triggerBlobDownload,
} from '@/features/content-author/api/contentAuthoringV2Api.js';
import SkillQuestionEditor from '@/features/content-author/components/SkillQuestionEditor.jsx';
import {
  createBlankCanonicalQuestion,
  createBlankPassageGroup,
} from '@/features/content-author/utils/canonicalQuestionTemplates.js';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { statuses } from '@/features/content-author/utils/contentModel.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

const QUESTION_TYPE_LABELS = {
  SingleChoice: 'Trắc nghiệm 1 đáp án',
  MultipleChoice: 'Nhiều đáp án',
  FillBlank: 'Điền khuyết',
  FillInBlank: 'Điền khuyết',
  Ordering: 'Sắp xếp câu',
  VisualMultipleChoice: 'Trắc nghiệm hình ảnh',
  TrueFalse: 'Đúng / Sai',
  Listening: 'Nghe hiểu',
};

const PUBLISH_STATUS_BADGES = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  PendingReview: { label: 'Chờ duyệt', tone: 'warning' },
  ChangesRequested: { label: 'Cần sửa', tone: 'warning' },
  Approved: { label: 'Đã duyệt', tone: 'info' },
  Published: { label: 'Đã xuất bản', tone: 'success' },
  Rejected: { label: 'Từ chối', tone: 'danger' },
};

const STATUS_BADGE_TONES = {
  Draft: 'neutral',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

export default function QuestionBank() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('v2-bank');
  const [keyword, setKeyword] = useState('');
  const [levelId, setLevelId] = useState('ALL');
  const [skillId, setSkillId] = useState('ALL');
  const [questionType, setQuestionType] = useState('ALL');
  const [publishStatus, setPublishStatus] = useState('ALL');
  const [sourceType, setSourceType] = useState('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedV2Question, setSelectedV2Question] = useState(null);
  const [editorModal, setEditorModal] = useState(null); // { mode: 'question' | 'passage', question?, passageGroup? }

  const { levels, skills, levelById } = useAuthorLookups();

  const v2Query = useQuery({
    queryKey: [
      'question-bank-v2',
      keyword.trim(),
      levelId,
      skillId,
      questionType,
      publishStatus,
      sourceType,
      onlyMine,
      includeArchived,
      page,
      pageSize,
    ],
    queryFn: () =>
      searchQuestionBankV2({
        keyword: keyword.trim() || undefined,
        certificateLevelId: levelId !== 'ALL' ? Number(levelId) : undefined,
        languageSkillId: skillId !== 'ALL' ? Number(skillId) : undefined,
        questionType: questionType !== 'ALL' ? questionType : undefined,
        publishStatus: publishStatus !== 'ALL' ? publishStatus : undefined,
        sourceType: sourceType !== 'ALL' ? sourceType : undefined,
        onlyMine,
        includeArchived,
        page,
        pageSize,
      }),
    enabled: activeTab === 'v2-bank',
    placeholderData: (prev) => prev,
  });

  const passagesQuery = useQuery({
    queryKey: ['passages-v2', levelId, skillId, publishStatus, keyword.trim()],
    queryFn: () =>
      listPassagesV2({
        levelId: levelId !== 'ALL' ? Number(levelId) : undefined,
        skillId: skillId !== 'ALL' ? Number(skillId) : undefined,
        status: publishStatus !== 'ALL' ? publishStatus : undefined,
        keyword: keyword.trim() || undefined,
      }),
    enabled: activeTab === 'passages',
  });

  const approvedQuery = useQuery({
    queryKey: ['question-bank-approved', keyword.trim(), levelId, skillId, questionType, page, pageSize],
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

  const v2Rows = v2Query.data?.items || [];
  const v2TotalCount = v2Query.data?.totalCount ?? v2Rows.length;
  const approvedRows = approvedQuery.data?.items || [];
  const approvedTotalCount = approvedQuery.data?.totalCount ?? approvedRows.length;
  const passageRows = passagesQuery.data || [];
  const totalCount =
    activeTab === 'v2-bank'
      ? v2TotalCount
      : activeTab === 'passages'
        ? passageRows.length
        : approvedTotalCount;

  const hasFilters =
    keyword.trim() !== '' ||
    levelId !== 'ALL' ||
    skillId !== 'ALL' ||
    questionType !== 'ALL' ||
    publishStatus !== 'ALL' ||
    sourceType !== 'ALL' ||
    onlyMine ||
    includeArchived;

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
    setPublishStatus('ALL');
    setSourceType('ALL');
    setOnlyMine(false);
    setIncludeArchived(false);
    setPage(1);
  };

  const invalidateBank = () => {
    void queryClient.invalidateQueries({ queryKey: ['question-bank-v2'] });
    void queryClient.invalidateQueries({ queryKey: ['passages-v2'] });
    void queryClient.invalidateQueries({ queryKey: ['question-bank-approved'] });
    void queryClient.invalidateQueries({ queryKey: ['my-content-approvals'] });
    void invalidateSidebarCounters(queryClient);
  };

  const submitMutation = useMutation({
    mutationFn: (id) => submitQuestionV2(id),
    onSuccess: () => {
      notify.success(tr('Đã gửi câu hỏi cho Admin xét duyệt.'), '', { key: 'qb-v2-submit' });
      invalidateBank();
    },
    onError: (err) => notify.apiError(err, tr('Chưa thể gửi duyệt câu hỏi'), { key: 'qb-v2-submit-err' }),
  });

  const versionMutation = useMutation({
    mutationFn: (id) => createQuestionNewVersionV2(id),
    onSuccess: (created) => {
      notify.success(trf('Đã tạo phiên bản nháp mới v{0}.', { 0: created?.version ?? 2 }), '', { key: 'qb-v2-ver' });
      invalidateBank();
      if (created?.passageId) {
        void openPassageEditor(created.passageId);
      } else if (created) {
        setEditorModal({ mode: 'question', question: created });
      }
    },
    onError: (err) => notify.apiError(err, tr('Không tạo được phiên bản mới'), { key: 'qb-v2-ver-err' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteQuestionDraftV2(id),
    onSuccess: () => {
      notify.success(tr('Đã xóa bản nháp câu hỏi.'), '', { key: 'qb-v2-del' });
      invalidateBank();
    },
    onError: (err) => notify.apiError(err, tr('Không xóa được bản nháp'), { key: 'qb-v2-del-err' }),
  });

  async function openV2Edit(row) {
    try {
      if (row.passageId) {
        await openPassageEditor(row.passageId);
        return;
      }
      const detail = await getQuestionBankDetailV2(row.id);
      if (detail?.skillName === 'Reading' || detail?.skillName === 'Listening') {
        setEditorModal({
          mode: 'passage',
          passageGroup: {
            passage: {
              certificateLevelId: detail.certificateLevelId,
              certificateLevelCode: detail.certificateLevelCode,
              languageSkillId: detail.languageSkillId,
              skillName: detail.skillName,
              title: detail.questionGroupTitle || detail.topic || 'Nhóm câu hỏi',
              audioUrl: detail.audioUrl || '',
              audioTranscript: detail.audioTranscript || '',
              playbackPolicy: detail.playbackPolicy || { maxReplays: 2, allowPause: true, allowSeek: false, showTranscriptAfterSubmit: true },
              sourceType: detail.sourceType || 'Manual',
              sourceReference: detail.sourceReference || '',
              rightsStatus: detail.rightsStatus || 'Owned',
            },
            questions: [detail],
          },
        });
      } else {
        setEditorModal({ mode: 'question', question: detail });
      }
    } catch (err) {
      notify.apiError(err, tr('Không mở được trình biên soạn câu hỏi'), { key: 'qb-edit-err' });
    }
  }

  async function openPassageEditor(passageId) {
    try {
      const detail = await getPassageGroupV2(passageId);
      setEditorModal({ mode: 'passage', passageGroup: detail });
    } catch (err) {
      notify.apiError(err, tr('Không tải được chi tiết đoạn đọc / nhóm nghe'), { key: 'pg-edit-err' });
    }
  }

  async function handleExportBank(format) {
    try {
      const { blob, fileName } = await exportQuestionBankFile(
        {
          certificateLevelId: levelId !== 'ALL' ? Number(levelId) : undefined,
          languageSkillId: skillId !== 'ALL' ? Number(skillId) : undefined,
          questionType: questionType !== 'ALL' ? questionType : undefined,
          keyword: keyword.trim() || undefined,
        },
        format,
        true,
      );
      triggerBlobDownload(blob, fileName);
      notify.success(tr('Đã xuất ngân hàng câu hỏi.'), '', { key: 'qb-export-ok' });
    } catch (err) {
      notify.apiError(err, tr('Không xuất được ngân hàng câu hỏi'), { key: 'qb-export-err' });
    }
  }

  const v2Columns = [
    {
      key: 'questionText',
      header: tr('Nội dung câu hỏi'),
      render: (row) => (
        <div className="max-w-[440px] space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral" size="sm" icon={false}>v{row.version || 1}</Badge>
            {row.passageCode && <Badge tone="info" size="sm" icon={false}>{row.passageCode}</Badge>}
            {row.audioUrl && <Badge tone="brand" size="sm" icon={false}>Audio</Badge>}
            {row.aiProvenance?.aiAssisted && (
              <Badge tone="warning" size="sm" icon={false}>{tr('AI hỗ trợ')}</Badge>
            )}
          </div>
          <p title={row.questionText || ''} className="rp-jp line-clamp-2 font-medium text-rp-text">
            {row.questionText}
          </p>
          {row.reviewNote && (
            <p className="text-xs font-medium text-amber-800">{tr('Phản hồi Admin')}: {row.reviewNote}</p>
          )}
        </div>
      ),
    },
    {
      key: 'certificateLevelCode',
      header: tr('Cấp độ & Kỹ năng'),
      compact: true,
      render: (row) => (
        <div className="space-y-1">
          <Badge tone="neutral" size="sm" icon={false}>{row.certificateLevelCode || '—'}</Badge>
          <p className="text-xs text-rp-text-muted">{row.skillName || '—'}</p>
        </div>
      ),
    },
    {
      key: 'templateKind',
      header: tr('Mẫu & Dạng câu'),
      compact: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-rp-text">{row.templateKind}</p>
          <Badge tone="brand" size="sm" icon={false}>
            {tr(QUESTION_TYPE_LABELS[row.questionType] || row.questionType)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'publishStatus',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => {
        const meta = PUBLISH_STATUS_BADGES[row.publishStatus] || { label: row.publishStatus, tone: 'neutral' };
        return (
          <div className="space-y-1">
            <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>
            <p className="text-[11px] text-rp-text-muted">{row.sourceType || 'Manual'}</p>
          </div>
        );
      },
    },
  ];

  const passageColumns = [
    {
      key: 'title',
      header: tr('Đoạn đọc / Nhóm nghe'),
      render: (row) => (
        <div className="max-w-[420px] space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral" size="sm" icon={false}>{row.passageCode}</Badge>
            <Badge tone="info" size="sm" icon={false}>{row.skillName}</Badge>
            <Badge tone="neutral" size="sm" icon={false}>{row.certificateLevelCode}</Badge>
          </div>
          <p className="font-semibold text-rp-text">{row.title}</p>
          {row.passageText && <p className="line-clamp-2 text-xs text-rp-text-muted">{row.passageText}</p>}
          {row.audioUrl && <p className="truncate text-xs text-emerald-700">{row.audioUrl}</p>}
        </div>
      ),
    },
    {
      key: 'publishStatus',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => {
        const meta = PUBLISH_STATUS_BADGES[row.publishStatus] || { label: row.publishStatus, tone: 'neutral' };
        return <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>;
      },
    },
  ];

  const approvedColumns = [
    {
      key: 'questionText',
      header: tr('Nội dung câu hỏi'),
      render: (row) => (
        <div className="mx-auto max-w-[440px] space-y-1">
          <p title={row.questionText || ''} className="rp-jp line-clamp-2 font-medium text-rp-text">{row.questionText}</p>
          <p className="truncate text-xs text-rp-text-muted">
            {[row.mockTestTitle, row.sectionTitle].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'jlptLevelName',
      header: tr('Cấp độ'),
      compact: true,
      render: (row) => (
        row.jlptLevelName ? <Badge tone="neutral" size="sm" icon={false}>{row.jlptLevelName}</Badge> : '—'
      ),
    },
    {
      key: 'skillName',
      header: tr('Kỹ năng'),
      compact: true,
      render: (row) => (
        row.skillName ? <Badge tone="info" size="sm" icon={false}>{row.skillName}</Badge> : '—'
      ),
    },
    {
      key: 'questionType',
      header: tr('Dạng câu hỏi'),
      compact: true,
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
      compact: true,
      render: (row) => (
        <Badge tone="brand" size="sm" icon={false}>
          {row.entityType === 'MockTest' ? tr('Đề thi thử') : tr('Bài luyện tập')}
        </Badge>
      ),
    },
    {
      key: 'level',
      header: tr('Cấp độ'),
      compact: true,
      render: (row) => {
        const code = row.certificateLevelCode || levelById.get(Number(row.certificateLevelId))?.code;
        return code ? <Badge tone="neutral" size="sm" icon={false}>{code}</Badge> : '—';
      },
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => (
        <Badge tone={STATUS_BADGE_TONES[row.status] || 'neutral'} size="sm" icon={false}>
          {tr(statuses[row.status]?.label ?? row.status)}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: tr('Cập nhật'),
      compact: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-rp-text-2">{formatVnDateTime(row.updatedAt || row.submittedAt)}</span>
      ),
    },
  ];

  const detailData = detailQuery.data || selectedQuestion;

  return (
    <ContentAuthorShell pathname="/question-bank" breadcrumb={tr('Ngân hàng câu hỏi')}>
      <PageContainer as="div" data-page="QuestionBank" width="default" className="space-y-5">
        <PageHeader
          eyebrow={tr('Kho câu hỏi chuẩn & Nhóm bài Đọc/Nghe')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="mock" size="lg" />
              <span>{tr('Ngân hàng câu hỏi')}</span>
              {!v2Query.isPending && activeTab === 'v2-bank' && (
                <Badge tone="neutral" size="sm" icon={false}>{totalCount}</Badge>
              )}
            </span>
          }
          description={tr('Quản lý câu hỏi 5 kỹ năng, đoạn đọc & nhóm nghe, phát hiện trùng lặp, versioning an toàn và tái sử dụng vào đề thi.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={BookOpen}
                onClick={() => setEditorModal({ mode: 'passage', passageGroup: createBlankPassageGroup('Reading', 'N4') })}
              >
                {tr('Soạn Đọc/Nghe nhóm')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setEditorModal({ mode: 'question', question: createBlankCanonicalQuestion('Vocabulary', 'N4') })}
              >
                {tr('Soạn câu hỏi + AI')}
              </Button>
              <Link
                to="/exam-builder/"
                className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                <HelpCircle className="h-4 w-4" />
                <span>{tr('Xây đề thi')}</span>
              </Link>
            </div>
          }
        />

        <UnifiedToolbar
          tabs={{
            label: tr('Ngân hàng câu hỏi'),
            value: activeTab,
            onChange: (next) => {
              setActiveTab(next);
              setPage(1);
            },
            tabs: [
              { value: 'v2-bank', label: tr('Kho câu hỏi chuẩn'), count: v2Query.data?.totalCount },
              { value: 'passages', label: tr('Đoạn đọc & Nhóm nghe'), count: passageRows.length || undefined },
              { value: 'approved', label: tr('Câu hỏi đề thi cũ'), count: approvedQuery.data?.totalCount },
              { value: 'drafts', label: tr('Lô đề/bài luyện cũ'), count: draftExerciseRows.length || undefined },
            ],
          }}
          search={
            (activeTab === 'v2-bank' || activeTab === 'passages' || (activeTab === 'approved' && approvedQuery.isSuccess)) && (totalCount > 0 || hasFilters)
              ? {
                  value: keyword,
                  onChange: (e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  },
                  onClear: () => {
                    setKeyword('');
                    setPage(1);
                  },
                  placeholder: 'Tìm nội dung câu hỏi, từ vựng, grammar…',
                  ariaLabel: 'Tìm câu hỏi',
                  className: 'sm:max-w-[230px]',
                }
              : undefined
          }
          filters={
            (activeTab === 'v2-bank' || activeTab === 'passages' || (activeTab === 'approved' && approvedQuery.isSuccess)) && (totalCount > 0 || hasFilters) ? (
              <>
                <CustomSelect
                  fitContent
                  size="sm"
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

                <CustomSelect
                  fitContent
                  size="sm"
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

                {activeTab !== 'passages' && (
                  <CustomSelect
                    fitContent
                    size="sm"
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
                )}

                {(activeTab === 'v2-bank' || activeTab === 'passages') && (
                  <CustomSelect
                    fitContent
                    size="sm"
                    value={publishStatus}
                    aria-label={tr('Trạng thái')}
                    onChange={(v) => {
                      setPublishStatus(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: tr('Mọi trạng thái') },
                      ...Object.entries(PUBLISH_STATUS_BADGES).map(([k, meta]) => ({
                        value: k,
                        label: tr(meta.label),
                      })),
                    ]}
                  />
                )}

                {activeTab === 'v2-bank' && (
                  <>
                    <CustomSelect
                      fitContent
                      size="sm"
                      value={sourceType}
                      aria-label={tr('Nguồn')}
                      onChange={(v) => {
                        setSourceType(v);
                        setPage(1);
                      }}
                      options={[
                        { value: 'ALL', label: tr('Mọi nguồn') },
                        { value: 'Manual', label: 'Manual' },
                        { value: 'AiAssisted', label: 'AiAssisted' },
                        { value: 'Excel', label: 'Excel' },
                        { value: 'Json', label: 'Json' },
                        { value: 'Pdf', label: 'Pdf' },
                      ]}
                    />

                    <div className="flex items-center gap-3 px-1">
                      <Checkbox
                        label={tr('Của tôi')}
                        checked={onlyMine}
                        onChange={(e) => {
                          setOnlyMine(e.target.checked);
                          setPage(1);
                        }}
                      />
                      <Checkbox
                        label={tr('Bản cũ')}
                        checked={includeArchived}
                        onChange={(e) => {
                          setIncludeArchived(e.target.checked);
                          setPage(1);
                        }}
                      />
                    </div>
                  </>
                )}
              </>
            ) : undefined
          }
          actions={
            <div className="flex flex-wrap items-center gap-1.5">
              {hasFilters && (
                <Button variant="ghost" size="sm" icon={X} onClick={resetFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              )}
              {activeTab === 'v2-bank' && (
                <>
                  <Button variant="outline" size="sm" icon={Download} onClick={() => handleExportBank('xlsx')}>
                    {tr('Xuất Excel')}
                  </Button>
                  <Button variant="outline" size="sm" icon={Download} onClick={() => handleExportBank('json')}>
                    {tr('Xuất JSON')}
                  </Button>
                </>
              )}
            </div>
          }
          refresh={{
            onRefresh: () => {
              if (activeTab === 'v2-bank') return v2Query.refetch({ cancelRefetch: true });
              if (activeTab === 'passages') return passagesQuery.refetch({ cancelRefetch: true });
              if (activeTab === 'approved') return approvedQuery.refetch({ cancelRefetch: true });
              return myDraftsQuery.refetch({ cancelRefetch: true });
            },
            refreshing:
              activeTab === 'v2-bank'
                ? v2Query.isFetching && !v2Query.isPending
                : activeTab === 'passages'
                  ? passagesQuery.isFetching && !passagesQuery.isPending
                  : activeTab === 'approved'
                    ? approvedQuery.isFetching && !approvedQuery.isPending
                    : myDraftsQuery.isFetching && !myDraftsQuery.isPending,
          }}
        />

        {activeTab === 'v2-bank' && (
          <DataRefreshBoundary
            query={v2Query}
            hasData={v2Rows.length > 0}
            context="lesson"
            loadingLabel={tr('Đang tải kho câu hỏi chuẩn…')}
            errorTitle={tr('Chưa tải được ngân hàng câu hỏi')}
          >
            {v2Rows.length === 0 ? (
              <ContextualEmptyState
                illustration="homework"
                title={hasFilters ? tr('Không tìm thấy câu hỏi phù hợp') : tr('Kho câu hỏi chuẩn chưa có mục nào')}
                description={tr('Soạn câu hỏi thủ công kèm Trợ lý AI hoặc nhập tệp Excel/JSON/ZIP/PDF để lưu nháp vào kho chung.')}
                action={
                  <Button
                    variant="primary"
                    icon={Sparkles}
                    onClick={() => setEditorModal({ mode: 'question', question: createBlankCanonicalQuestion('Vocabulary', 'N4') })}
                  >
                    {tr('Soạn câu hỏi đầu tiên')}
                  </Button>
                }
              />
            ) : (
              <DataTable
                columns={v2Columns}
                rows={v2Rows}
                keyField="id"
                page={page}
                pageSize={pageSize}
                total={v2TotalCount}
                itemLabel="câu hỏi"
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
                onRowClick={(row) => setSelectedV2Question(row)}
                rowActions={(row) => (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      icon={Eye}
                      size="sm"
                      variant="ghost"
                      label={tr('Xem chi tiết')}
                      onClick={() => setSelectedV2Question(row)}
                    />
                    {['Draft', 'Rejected', 'ChangesRequested'].includes(row.publishStatus) && (
                      <>
                        <IconButton
                          icon={Pencil}
                          size="sm"
                          variant="ghost"
                          label={tr('Chỉnh sửa')}
                          onClick={() => openV2Edit(row)}
                        />
                        <IconButton
                          icon={Send}
                          size="sm"
                          variant="ghost"
                          label={tr('Gửi duyệt')}
                          onClick={() => submitMutation.mutate(row.id)}
                        />
                        <IconButton
                          icon={Trash2}
                          size="sm"
                          variant="ghost"
                          label={tr('Xóa nháp')}
                          onClick={async () => {
                            const ok = await confirmAction({
                              title: tr('Xóa bản nháp câu hỏi?'),
                              description: tr('Thao tác này chỉ áp dụng với câu hỏi chưa gửi duyệt hoặc bị từ chối.'),
                              confirmLabel: tr('Xóa bản nháp'),
                              tone: 'danger',
                            });
                            if (ok) deleteMutation.mutate(row.id);
                          }}
                        />
                      </>
                    )}
                    {['Published', 'Approved'].includes(row.publishStatus) && (
                      <IconButton
                        icon={GitBranch}
                        size="sm"
                        variant="ghost"
                        label={tr('Tạo phiên bản mới')}
                        onClick={() => versionMutation.mutate(row.id)}
                      />
                    )}
                  </div>
                )}
              />
            )}
          </DataRefreshBoundary>
        )}

        {activeTab === 'passages' && (
          <DataRefreshBoundary
            query={passagesQuery}
            hasData={passageRows.length > 0}
            context="lesson"
            loadingLabel={tr('Đang tải đoạn đọc và nhóm nghe…')}
            errorTitle={tr('Chưa tải được danh sách đoạn đọc / nhóm nghe')}
          >
            {passageRows.length === 0 ? (
              <ContextualEmptyState
                illustration="book"
                title={tr('Chưa có đoạn đọc hoặc nhóm nghe hiểu')}
                description={tr('Tạo Passage Đọc hiểu hoặc Nhóm Audio Nghe hiểu liên kết nhiều câu hỏi mà không cần sao chép đoạn văn.')}
                action={
                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => setEditorModal({ mode: 'passage', passageGroup: createBlankPassageGroup('Reading', 'N4') })}
                  >
                    {tr('Tạo Đoạn đọc / Nhóm nghe')}
                  </Button>
                }
              />
            ) : (
              <DataTable
                columns={passageColumns}
                rows={passageRows}
                keyField="id"
                onRowClick={(row) => openPassageEditor(row.id)}
                rowActions={(row) => (
                  <Button
                    size="xs"
                    variant="outline"
                    icon={Pencil}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPassageEditor(row.id);
                    }}
                  >
                    {tr('Mở nhóm câu hỏi')}
                  </Button>
                )}
              />
            )}
          </DataRefreshBoundary>
        )}

        {activeTab === 'approved' && (
          <DataRefreshBoundary
            query={approvedQuery}
            hasData={approvedRows.length > 0}
            context="lesson"
            loadingLabel={tr('Đang tải ngân hàng câu hỏi…')}
            errorTitle={tr('Chưa tải được ngân hàng câu hỏi')}
          >
            {approvedRows.length === 0 ? (
              <ContextualEmptyState
                illustration="search"
                title={hasFilters ? tr('Không tìm thấy câu hỏi phù hợp') : tr('Chưa có câu hỏi đề thi cũ')}
                description={tr('Hãy sử dụng tab "Kho câu hỏi chuẩn" để quản lý ngân hàng câu hỏi hợp nhất.')}
              />
            ) : (
              <DataTable
                columns={approvedColumns}
                rows={approvedRows}
                keyField="id"
                page={page}
                pageSize={pageSize}
                total={approvedTotalCount}
                itemLabel="câu hỏi"
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
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
            )}
          </DataRefreshBoundary>
        )}

        {activeTab === 'drafts' && (
          <DataRefreshBoundary
            query={myDraftsQuery}
            hasData={draftExerciseRows.length > 0}
            context="lesson"
            loadingLabel={tr('Đang tải bộ câu hỏi của bạn…')}
            errorTitle={tr('Chưa tải được danh sách bộ câu hỏi')}
          >
            {draftExerciseRows.length === 0 ? (
              <ContextualEmptyState
                illustration="homework"
                title={tr('Chưa có bài luyện hay đề thi cũ nào')}
                description={tr('Các đề mới xây dựng bằng Trình tạo đề thi (V2) sẽ hiển thị trực tiếp trong trang Xây đề thi.')}
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
          </DataRefreshBoundary>
        )}

        {/* V2 Question Detail Modal */}
        <Modal
          open={Boolean(selectedV2Question)}
          onClose={() => setSelectedV2Question(null)}
          title={tr('Chi tiết câu hỏi chuẩn')}
          size="lg"
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {selectedV2Question && ['Draft', 'Rejected', 'ChangesRequested'].includes(selectedV2Question.publishStatus) && (
                <Button
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => {
                    const target = selectedV2Question;
                    setSelectedV2Question(null);
                    void openV2Edit(target);
                  }}
                >
                  {tr('Chỉnh sửa')}
                </Button>
              )}
              {selectedV2Question && ['Published', 'Approved'].includes(selectedV2Question.publishStatus) && (
                <Button
                  variant="secondary"
                  icon={GitBranch}
                  onClick={() => {
                    const id = selectedV2Question.id;
                    setSelectedV2Question(null);
                    versionMutation.mutate(id);
                  }}
                >
                  {tr('Tạo phiên bản v+1')}
                </Button>
              )}
              <Button onClick={() => setSelectedV2Question(null)}>{tr('Đóng')}</Button>
            </div>
          }
        >
          {selectedV2Question && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral" size="sm" icon={false}>{selectedV2Question.certificateLevelCode}</Badge>
                <Badge tone="info" size="sm" icon={false}>{selectedV2Question.skillName}</Badge>
                <Badge tone="brand" size="sm" icon={false}>{selectedV2Question.templateKind}</Badge>
                <Badge tone={PUBLISH_STATUS_BADGES[selectedV2Question.publishStatus]?.tone || 'neutral'} size="sm" icon={false}>
                  {tr(PUBLISH_STATUS_BADGES[selectedV2Question.publishStatus]?.label || selectedV2Question.publishStatus)} · v{selectedV2Question.version || 1}
                </Badge>
                {selectedV2Question.aiProvenance?.aiAssisted && (
                  <Badge tone="warning" size="sm" icon={false}>AI: {selectedV2Question.aiProvenance.model || 'Assisted'}</Badge>
                )}
              </div>

              {selectedV2Question.passage?.passageText && (
                <Card className="bg-slate-50/70 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase text-rp-text-muted">{selectedV2Question.passage.title}</p>
                  <p className="rp-jp mt-1 whitespace-pre-wrap">{selectedV2Question.passage.passageText}</p>
                </Card>
              )}

              <p className="rp-jp whitespace-pre-wrap text-base font-medium text-rp-text">{selectedV2Question.questionText}</p>

              {selectedV2Question.audioUrl && (
                <div className="space-y-1 rounded-xl border border-rp-line bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rp-text-muted">
                    <Volume2 className="h-4 w-4" />
                    <span>{tr('File nghe')}</span>
                  </div>
                  <audio controls src={selectedV2Question.audioUrl} className="w-full" />
                  {selectedV2Question.audioTranscript && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-rp-text-2">
                      <strong>{tr('Transcript')}:</strong> {selectedV2Question.audioTranscript}
                    </p>
                  )}
                </div>
              )}

              {selectedV2Question.options?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Các đáp án')}</p>
                  {selectedV2Question.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        opt.isCorrect ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950' : 'border-rp-line bg-white'
                      }`}
                    >
                      {opt.isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                      <span className="rp-jp">{opt.optionText}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedV2Question.skillMetadata?.acceptedAnswers?.filter(Boolean).length > 0 && (
                <Banner tone="success" title={tr('Đáp án chấp nhận (Điền khuyết)')}>
                  {selectedV2Question.skillMetadata.acceptedAnswers.filter(Boolean).join(' · ')}
                </Banner>
              )}

              {selectedV2Question.skillMetadata?.orderingAnswer?.filter(Boolean).length > 0 && (
                <Banner tone="success" title={tr('Thứ tự đúng (Ordering ★)')}>
                  {selectedV2Question.skillMetadata.orderingAnswer.join(' / ')}
                </Banner>
              )}

              {selectedV2Question.explanation && (
                <div className="rounded-xl border border-rp-line bg-rp-brand-tint/30 p-3 text-sm">
                  <p className="text-xs font-semibold text-rp-brand-strong">{tr('Giải thích')}</p>
                  <p className="mt-1 whitespace-pre-wrap">{selectedV2Question.explanation}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Legacy Question Detail Modal */}
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
              <p className="rp-jp whitespace-pre-wrap text-base font-medium text-rp-text">{detailData.questionText}</p>
              {detailData.audioUrl && <audio controls src={detailData.audioUrl} className="w-full" />}
              {Array.isArray(detailData.options) && detailData.options.length > 0 && (
                <div className="space-y-2">
                  {detailData.options.map((opt) => (
                    <div
                      key={opt.optionId}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        opt.isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rp-line bg-white'
                      }`}
                    >
                      {opt.isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      <span className="rp-jp">{opt.optionText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Modal>

        {/* Authoring / Editing Modal */}
        <Modal
          open={Boolean(editorModal)}
          onClose={() => setEditorModal(null)}
          title={
            editorModal?.mode === 'passage'
              ? tr('Biên soạn Đoạn đọc / Nhóm câu nghe')
              : tr('Biên soạn câu hỏi chuẩn (5 kỹ năng + AI)')
          }
          size="xl"
        >
          {editorModal && (
            <SkillQuestionEditor
              mode={editorModal.mode}
              initialQuestion={editorModal.question}
              initialPassageGroup={editorModal.passageGroup}
              onSaved={() => invalidateBank()}
              onSubmitted={() => {
                invalidateBank();
                setEditorModal(null);
              }}
            />
          )}
        </Modal>
      </PageContainer>
    </ContentAuthorShell>
  );
}
