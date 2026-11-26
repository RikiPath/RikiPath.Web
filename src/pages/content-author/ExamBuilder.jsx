import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
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
  RichQuestionText,
  DataTable,
  FeatureIcon,
  Field,
  IconButton,
  Input,
  Modal,
  PageContainer,
  PageHeader,
  SakuraLoader,
  Tabs,
  Textarea,
  UnifiedToolbar,
  confirmAction,
  notify,
} from '@/components/ui';
import { ManualContentWorkspace } from './ManualContentPage.jsx';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import {
  createExamNewVersionV2,
  deleteExamDraftV2,
  exportExamFile,
  getAuthorExamDetailV2,
  listAuthorExamsV2,
  saveExamDraftV2,
  searchQuestionBankV2,
  submitExamV2,
  triggerBlobDownload,
  validateExamBlueprintV2,
  verifyExamRoundTripV2,
} from '@/features/content-author/api/contentAuthoringV2Api.js';
import SkillQuestionEditor from '@/features/content-author/components/SkillQuestionEditor.jsx';
import {
  createBlankCanonicalQuestion,
} from '@/features/content-author/utils/canonicalQuestionTemplates.js';
import { useLocale } from '@/locales/locale.js';
import {
  formatApprovalStatusLabel,
  formatQuestionTypeLabel,
  formatSkillNameLabel,
} from '@/utils/terminology.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

const EXAM_KIND_LABELS = {
  FullMockTest: 'Đề thi thử JLPT Blueprint',
  PracticeSet: 'Bộ đề luyện tập đơn kỹ năng',
  MixedPractice: 'Đề luyện tập hỗn hợp nhiều kỹ năng',
};

const PUBLISH_BADGES = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  PendingReview: { label: 'Chờ duyệt', tone: 'warning' },
  ChangesRequested: { label: 'Cần sửa', tone: 'warning' },
  Approved: { label: 'Đã duyệt', tone: 'info' },
  Published: { label: 'Đã xuất bản', tone: 'success' },
  Rejected: { label: 'Từ chối', tone: 'danger' },
};

function createBlankExam(examKind = 'PracticeSet', levelId = 1, defaultSkillId = 1, defaultSection = null) {
  return {
    id: null,
    examKind,
    publishStatus: 'Draft',
    version: 1,
    title: '',
    description: '',
    certificateLevelId: levelId,
    timeLimitMinutes: examKind === 'FullMockTest' ? 95 : 25,
    focusSkillId: examKind === 'PracticeSet' ? defaultSkillId : null,
    sourceType: 'Manual',
    sourceReference: '',
    rightsStatus: 'Owned',
    blueprintPolicy: {
      scoringPolicy: examKind === 'FullMockTest' ? 'SimulatedJlpt' : 'Standard',
      showAnswersAfterSubmit: true,
      showExplanationsAfterSubmit: true,
      passingScore: 60,
    },
    sections: [
      {
        sortOrder: 1,
        title: examKind === 'FullMockTest' ? 'Kiến thức ngôn ngữ (Từ vựng - Hán tự - Ngữ pháp)' : 'Phần 1',
        languageSkillId: defaultSkillId,
        certificateSectionId: defaultSection?.id || 0,
        certificateSectionCode: defaultSection?.code || '',
        durationMinutes: examKind === 'FullMockTest' ? 30 : 20,
        instructions: '',
        questions: [],
      },
    ],
  };
}

export default function ExamBuilder() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const { levels, skills, sectionsForLevel } = useAuthorLookups();

  const [modeTab, setModeTab] = useState('builder-v2');
  const [filterKind, setFilterKind] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const [editingExam, setEditingExam] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [roundTripReport, setRoundTripReport] = useState(null);
  const [bankPickerTarget, setBankPickerTarget] = useState(null); // sectionIdx
  const [inlineModalTarget, setInlineModalTarget] = useState(null); // { sectionIdx, slotIdx, initial }

  const examsQuery = useQuery({
    queryKey: ['author-exams-v2', filterKind, filterStatus, keyword.trim()],
    queryFn: () =>
      listAuthorExamsV2({
        examKind: filterKind !== 'ALL' ? filterKind : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        keyword: keyword.trim() || undefined,
        page: 1,
        pageSize: 50,
      }),
    enabled: modeTab === 'builder-v2',
  });

  const bankPickerQuery = useQuery({
    queryKey: ['exam-bank-picker', bankPickerTarget !== null, editingExam?.certificateLevelId],
    queryFn: () =>
      searchQuestionBankV2({
        certificateLevelId: editingExam?.certificateLevelId || undefined,
        page: 1,
        pageSize: 50,
      }),
    enabled: bankPickerTarget !== null && Boolean(editingExam),
  });

  const refreshExams = () => {
    void queryClient.invalidateQueries({ queryKey: ['author-exams-v2'] });
    void invalidateSidebarCounters(queryClient);
  };

  const saveExamMutation = useMutation({
    mutationFn: (payload) => saveExamDraftV2(payload),
    onSuccess: (saved) => {
      setEditingExam(saved);
      refreshExams();
      notify.success(tr('Đã lưu nháp đề thi / bộ luyện tập.'), '', { key: 'exam-save-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Không lưu được đề thi'), { key: 'exam-save-err' }),
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const saved = await saveExamDraftV2(editingExam);
      setEditingExam(saved);
      return validateExamBlueprintV2(saved.id);
    },
    onSuccess: (res) => {
      setValidationResult(res);
      if (res?.isValid) notify.success(tr('Cấu trúc đề thi hợp lệ.'), '', { key: 'exam-val-ok' });
      else notify.info(tr('Đề thi còn mục cần bổ sung trước khi xuất bản.'), '', { key: 'exam-val-warn' });
    },
    onError: (err) => notify.apiError(err, tr('Không kiểm tra được cấu trúc đề thi'), { key: 'exam-val-err' }),
  });

  const submitMutation = useMutation({
    mutationFn: async (examId) => {
      let id = examId;
      if (editingExam && editingExam.id === examId && ['Draft', 'Rejected', 'ChangesRequested'].includes(editingExam.publishStatus)) {
        const saved = await saveExamDraftV2(editingExam);
        id = saved.id;
      }
      return submitExamV2(id);
    },
    onSuccess: (submitted) => {
      setEditingExam(submitted);
      refreshExams();
      notify.success(tr('Đã gửi đề thi để Quản trị viên kiểm duyệt.'), '', { key: 'exam-sub-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa gửi duyệt được đề thi'), { key: 'exam-sub-err' }),
  });

  const newVersionMutation = useMutation({
    mutationFn: (examId) => createExamNewVersionV2(examId),
    onSuccess: (created) => {
      setEditingExam(created);
      setValidationResult(null);
      setRoundTripReport(null);
      refreshExams();
      notify.success(trf('Đã tạo phiên bản nháp v{0} (không làm ảnh hưởng lịch sử học viên).', { 0: created?.version ?? 2 }), '', {
        key: 'exam-ver-ok',
      });
    },
    onError: (err) => notify.apiError(err, tr('Không tạo được phiên bản mới'), { key: 'exam-ver-err' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (examId) => deleteExamDraftV2(examId),
    onSuccess: () => {
      refreshExams();
      notify.success(tr('Đã xóa bản nháp đề thi.'), '', { key: 'exam-del-ok' });
    },
    onError: (err) => notify.apiError(err, tr('Không xóa được đề thi'), { key: 'exam-del-err' }),
  });

  const roundTripMutation = useMutation({
    mutationFn: ({ examId, format }) => verifyExamRoundTripV2(examId, format),
    onSuccess: (report) => {
      setRoundTripReport(report);
      if (report?.passed) notify.success(tr('Kiểm tra Round-Trip Excel/JSON khép kín đạt chuẩn 100%.'), '', { key: 'rt-ok' });
      else notify.info(tr('Phát hiện sai lệch trong Round-Trip kiểm chứng.'), '', { key: 'rt-warn' });
    },
    onError: (err) => notify.apiError(err, tr('Không chạy được kiểm chứng Round-Trip'), { key: 'rt-err' }),
  });

  async function openExamDetail(examId) {
    try {
      const detail = await getAuthorExamDetailV2(examId);
      setEditingExam(detail);
      setValidationResult(null);
      setRoundTripReport(null);
    } catch (err) {
      notify.apiError(err, tr('Không tải được chi tiết đề thi'), { key: 'exam-load-err' });
    }
  }

  async function handleExportExam(examId, format, includeAnswers = false) {
    try {
      const { blob, fileName } = await exportExamFile(examId, format, includeAnswers);
      triggerBlobDownload(blob, fileName);
      notify.success(trf('Đã tải xuống {0}.', { 0: fileName }), '', { key: 'exam-exp-ok' });
    } catch (err) {
      notify.apiError(err, tr('Không xuất được đề thi'), { key: 'exam-exp-err' });
    }
  }

  function startNewExam(kind) {
    const defaultLvl = levels[0]?.id || 1;
    const defaultSkill = skills[0]?.id || 1;
    const levelSecs = sectionsForLevel(defaultLvl);
    setEditingExam(createBlankExam(kind, defaultLvl, defaultSkill, levelSecs[0] || null));
    setValidationResult(null);
    setRoundTripReport(null);
  }

  const updateExamField = (patch) => setEditingExam((prev) => ({ ...prev, ...patch }));

  const addSection = () => {
    const levelSecs = sectionsForLevel(editingExam.certificateLevelId);
    setEditingExam((prev) => ({
      ...prev,
      sections: [
        ...(prev.sections || []),
        {
          sortOrder: (prev.sections?.length || 0) + 1,
          title: `Phần ${(prev.sections?.length || 0) + 1}`,
          languageSkillId: skills[0]?.id || 1,
          certificateSectionId: levelSecs[0]?.id || 0,
          certificateSectionCode: levelSecs[0]?.code || '',
          durationMinutes: 20,
          instructions: '',
          questions: [],
        },
      ],
    }));
  };

  const updateSection = (idx, patch) =>
    setEditingExam((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) => (i === idx ? { ...sec, ...patch } : sec)),
    }));

  const moveSection = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= editingExam.sections.length) return;
    setEditingExam((prev) => {
      const copy = [...prev.sections];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return { ...prev, sections: copy.map((s, i) => ({ ...s, sortOrder: i + 1 })) };
    });
  };

  const removeSection = (idx) =>
    setEditingExam((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i + 1 })),
    }));

  const addBankQuestionsToSection = (sectionIdx, bankRow) => {
    setEditingExam((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) => {
        if (i !== sectionIdx) return sec;
        const alreadyExists = (sec.questions || []).some((q) => Number(q.questionBankItemId) === Number(bankRow.id));
        if (alreadyExists) return sec;
        return {
          ...sec,
          questions: [
            ...(sec.questions || []),
            {
              questionBankItemId: bankRow.id,
              sortOrder: (sec.questions?.length || 0) + 1,
              inlineQuestion: {
                ...bankRow,
                id: bankRow.id,
              },
            },
          ],
        };
      }),
    }));
    notify.success(tr('Đã gắn câu hỏi từ Ngân hàng vào phần thi (không nhân bản).'), '', { key: 'pick-ok' });
  };

  const removeQuestionSlot = (sectionIdx, slotIdx) =>
    setEditingExam((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIdx
          ? {
              ...sec,
              questions: sec.questions.filter((_, qIdx) => qIdx !== slotIdx).map((q, k) => ({ ...q, sortOrder: k + 1 })),
            }
          : sec,
      ),
    }));

  const isLocked = editingExam && ['Published', 'Approved', 'PendingReview'].includes(editingExam.publishStatus);
  const rows = examsQuery.data?.items || [];

  const examColumns = [
    {
      key: 'title',
      header: tr('Tên đề / Bộ luyện'),
      render: (row) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand" size="sm" icon={false}>{tr(EXAM_KIND_LABELS[row.examKind] || row.examKind)}</Badge>
            <Badge tone="neutral" size="sm" icon={false}>v{row.version || 1}</Badge>
          </div>
          <p className="font-semibold text-rp-text">{row.title}</p>
          {row.reviewNote && <p className="text-xs text-amber-800">{tr('Phản hồi Quản trị viên')}: {row.reviewNote}</p>}
        </div>
      ),
    },
    {
      key: 'certificateLevelCode',
      header: tr('Cấp độ & Thời lượng'),
      compact: true,
      render: (row) => (
        <div className="space-y-1 text-xs">
          <Badge tone="neutral" size="sm" icon={false}>{row.certificateLevelCode || 'JLPT'}</Badge>
          <p className="text-rp-text-muted">{row.timeLimitMinutes}p · {row.sections?.length || 0} phần</p>
        </div>
      ),
    },
    {
      key: 'publishStatus',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => {
        const meta = PUBLISH_BADGES[row.publishStatus] || { label: row.publishStatus, tone: 'neutral' };
        return <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>;
      },
    },
  ];

  const levelSections = useMemo(
    () => (editingExam ? sectionsForLevel(editingExam.certificateLevelId) : []),
    [editingExam, sectionsForLevel],
  );

  return (
    <ContentAuthorShell pathname="/exam-builder" breadcrumb={tr('Xây đề thi')}>
      <PageContainer as="div" data-page="ExamBuilder" width="default" className="space-y-5">
        <PageHeader
          eyebrow={tr('Bộ đề luyện tập · Mixed Practice · Full JLPT Blueprint')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="mock" size="lg" />
              <span>{tr('Xây đề thi & Bộ đề luyện tập')}</span>
            </span>
          }
          description={tr('Thiết kế Practice Set, ghép Mixed Practice tái sử dụng câu hỏi từ Ngân hàng hoặc dựng Full Mock Test JLPT, kiểm tra Blueprint, xuất tệp và xác minh Round-Trip.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" icon={Layers} onClick={() => startNewExam('PracticeSet')}>
                {tr('+ Bộ đề luyện tập')}
              </Button>
              <Button variant="secondary" size="sm" icon={Layers} onClick={() => startNewExam('MixedPractice')}>
                {tr('+ Đề hỗn hợp (Mixed)')}
              </Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => startNewExam('FullMockTest')}>
                {tr('+ Full Mock Test JLPT')}
              </Button>
            </div>
          }
        />

        <Tabs
          variant="pill"
          value={modeTab}
          onChange={setModeTab}
          tabs={[
            { value: 'builder-v2', label: tr('Trình xây đề chuẩn (V2)') },
            { value: 'legacy', label: tr('Đề thi thử kiểu cũ') },
          ]}
        />

        {modeTab === 'legacy' ? (
          <ManualContentWorkspace heading={tr('Xây đề thi')} pageName="ExamBuilder" examOnly />
        ) : editingExam ? (
          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-line pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingExam(null)}>
                    ← {tr('Về danh sách đề')}
                  </Button>
                  <Badge tone="brand" size="sm" icon={false}>{tr(EXAM_KIND_LABELS[editingExam.examKind] || editingExam.examKind)}</Badge>
                  <Badge tone={PUBLISH_BADGES[editingExam.publishStatus]?.tone || 'neutral'} size="sm" icon={false}>
                    {tr(PUBLISH_BADGES[editingExam.publishStatus]?.label || editingExam.publishStatus)} · v{editingExam.version || 1}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {editingExam.id && (
                    <>
                      <Button variant="outline" size="sm" icon={FileSpreadsheet} onClick={() => handleExportExam(editingExam.id, 'xlsx', false)}>
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" icon={FileJson} onClick={() => handleExportExam(editingExam.id, 'json', true)}>
                        JSON
                      </Button>
                      <Button variant="outline" size="sm" icon={FileArchive} onClick={() => handleExportExam(editingExam.id, 'zip', true)}>
                        ZIP
                      </Button>
                      <Button variant="outline" size="sm" icon={FileText} onClick={() => handleExportExam(editingExam.id, 'pdf', false)}>
                        PDF Đề thi
                      </Button>
                      <Button variant="outline" size="sm" icon={Download} onClick={() => handleExportExam(editingExam.id, 'pdf', true)}>
                        PDF Đáp án
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RefreshCw}
                        loading={roundTripMutation.isPending}
                        onClick={() => roundTripMutation.mutate({ examId: editingExam.id, format: 'xlsx' })}
                      >
                        {tr('Kiểm chứng Round-Trip')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isLocked && (
                <Banner tone="info" title={tr('Đề thi đang khóa chỉnh sửa trực tiếp')}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{tr('Đề thi đang chờ duyệt hoặc đã xuất bản không thể sửa trực tiếp để bảo vệ lịch sử làm bài của học viên.')}</span>
                    {['Published', 'Approved'].includes(editingExam.publishStatus) && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={GitBranch}
                        loading={newVersionMutation.isPending}
                        onClick={() => newVersionMutation.mutate(editingExam.id)}
                      >
                        {tr('Tạo phiên bản mới để chỉnh sửa')}
                      </Button>
                    )}
                  </div>
                </Banner>
              )}

              {roundTripReport && (
                <Banner tone={roundTripReport.passed ? 'success' : 'warning'} title={tr('Kết quả kiểm chứng Round-Trip (Export → Re-parse → So sánh)')}>
                  <p className="text-sm">
                    {trf('Câu hỏi gốc: {0} · Đọc lại: {1} · Thiếu: {2}', {
                      0: roundTripReport.sourceQuestionCount ?? 0,
                      1: roundTripReport.reparsedQuestionCount ?? 0,
                      2: roundTripReport.missingCount ?? 0,
                    })}
                  </p>
                  {Array.isArray(roundTripReport.discrepancies) && roundTripReport.discrepancies.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs">
                      {roundTripReport.discrepancies.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  )}
                </Banner>
              )}

              {validationResult && (
                <Banner tone={validationResult.isValid ? 'success' : 'warning'} title={tr('Kiểm tra Blueprint & Media')}>
                  <p className="text-sm">
                    {trf('Tổng câu hỏi: {0} · Thiếu Audio Nghe: {1} · Kỹ năng: {2}', {
                      0: validationResult.totalQuestions,
                      1: validationResult.missingAudioCount,
                      2: (validationResult.coveredSkills || []).join(', ') || '—',
                    })}
                  </p>
                  {validationResult.issues?.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                      {validationResult.issues.map((iss, i) => (
                        <li key={i}><strong>[{iss.severity}] {iss.field}:</strong> {iss.message}</li>
                      ))}
                    </ul>
                  )}
                </Banner>
              )}

              <fieldset disabled={isLocked} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={tr('Tiêu đề đề thi / bộ luyện')} required className="sm:col-span-2">
                  <Input
                    value={editingExam.title}
                    onChange={(e) => updateExamField({ title: e.target.value })}
                    placeholder="VD: JLPT N4 Bộ luyện Ngữ pháp & Đọc hiểu"
                  />
                </Field>
                <Field label={tr('Loại đề')} required>
                  <CustomSelect
                    value={editingExam.examKind}
                    onChange={(v) => updateExamField({ examKind: v })}
                    options={Object.entries(EXAM_KIND_LABELS).map(([k, label]) => ({ value: k, label: tr(label) }))}
                  />
                </Field>
                <Field label={tr('Cấp độ JLPT')} required>
                  <CustomSelect
                    value={String(editingExam.certificateLevelId)}
                    onChange={(v) => updateExamField({ certificateLevelId: Number(v) })}
                    options={levels.map((l) => ({ value: String(l.id), label: `${l.certificate} · ${l.code}` }))}
                  />
                </Field>
                <Field label={tr('Thời lượng tổng (phút)')} required>
                  <Input
                    type="number"
                    min={1}
                    max={300}
                    value={editingExam.timeLimitMinutes}
                    onChange={(e) => updateExamField({ timeLimitMinutes: Number(e.target.value) || 20 })}
                  />
                </Field>
                <Field label={tr('Chính sách chấm & hiển thị')}>
                  <CustomSelect
                    value={editingExam.blueprintPolicy?.scoringPolicy || 'Standard'}
                    onChange={(v) =>
                      updateExamField({
                        blueprintPolicy: { ...(editingExam.blueprintPolicy || {}), scoringPolicy: v },
                      })
                    }
                    options={[
                      { value: 'SimulatedJlpt', label: tr('Simulated JLPT (thi thử)') },
                      { value: 'Standard', label: tr('Luyện tập tiêu chuẩn') },
                    ]}
                  />
                </Field>
                <Field label={tr('Mô tả chi tiết')} className="sm:col-span-2 lg:col-span-3">
                  <Textarea
                    rows={2}
                    value={editingExam.description || ''}
                    onChange={(e) => updateExamField({ description: e.target.value })}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
                  <Checkbox
                    label={tr('Cho xem đáp án sau khi nộp bài')}
                    checked={editingExam.blueprintPolicy?.showAnswersAfterSubmit ?? true}
                    onChange={(e) =>
                      updateExamField({
                        blueprintPolicy: {
                          ...(editingExam.blueprintPolicy || {}),
                          showAnswersAfterSubmit: e.target.checked,
                        },
                      })
                    }
                  />
                  <Checkbox
                    label={tr('Hiển thị giải thích sau khi nộp bài')}
                    checked={editingExam.blueprintPolicy?.showExplanationsAfterSubmit ?? true}
                    onChange={(e) =>
                      updateExamField({
                        blueprintPolicy: {
                          ...(editingExam.blueprintPolicy || {}),
                          showExplanationsAfterSubmit: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
              </fieldset>
            </Card>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-rp-text">
                  {tr('Danh sách Phần thi & Câu hỏi')} ({editingExam.sections?.length || 0})
                </h2>
                {!isLocked && (
                  <Button variant="secondary" size="sm" icon={Plus} onClick={addSection}>
                    {tr('Thêm phần thi')}
                  </Button>
                )}
              </div>

              {(editingExam.sections || []).map((section, sIdx) => (
                <Card key={sIdx} className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line pb-2.5">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand" size="sm" icon={false}>{tr('Phần')} {sIdx + 1}</Badge>
                      <span className="text-sm font-semibold text-rp-text">{section.title || '—'}</span>
                      <Badge tone="neutral" size="sm" icon={false}>{section.questions?.length || 0} câu</Badge>
                    </div>
                    {!isLocked && (
                      <div className="flex items-center gap-1">
                        <IconButton icon={ArrowUp} size="xs" variant="ghost" label={tr('Lên')} onClick={() => moveSection(sIdx, -1)} />
                        <IconButton icon={ArrowDown} size="xs" variant="ghost" label={tr('Xuống')} onClick={() => moveSection(sIdx, 1)} />
                        {editingExam.sections.length > 1 && (
                          <IconButton icon={Trash2} size="xs" variant="ghost" label={tr('Xóa phần')} onClick={() => removeSection(sIdx)} />
                        )}
                      </div>
                    )}
                  </div>

                  <fieldset disabled={isLocked} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label={tr('Tên phần thi')}>
                      <Input value={section.title || ''} onChange={(e) => updateSection(sIdx, { title: e.target.value })} />
                    </Field>
                    <Field label={tr('Kỹ năng')}>
                      <CustomSelect
                        value={section.languageSkillId ? String(section.languageSkillId) : ''}
                        onChange={(v) => updateSection(sIdx, { languageSkillId: Number(v) })}
                        options={skills.map((sk) => ({ value: String(sk.id), label: sk.name }))}
                      />
                    </Field>
                    <Field label={tr('Phần Quản trị viên cấu hình')}>
                      <CustomSelect
                        value={section.certificateSectionId ? String(section.certificateSectionId) : ''}
                        onChange={(v) => {
                          const found = levelSections.find((item) => Number(item.id) === Number(v));
                          updateSection(sIdx, {
                            certificateSectionId: Number(v),
                            certificateSectionCode: found?.code || '',
                          });
                        }}
                        options={levelSections.map((item) => ({
                          value: String(item.id),
                          label: `${item.name} (${item.code})`,
                        }))}
                      />
                    </Field>
                    <Field label={tr('Thời lượng phần (phút)')}>
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={section.durationMinutes ?? 20}
                        onChange={(e) => updateSection(sIdx, { durationMinutes: Number(e.target.value) || 15 })}
                      />
                    </Field>
                  </fieldset>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">{tr('Câu hỏi trong phần này')}</p>
                      {!isLocked && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="xs" variant="outline" icon={Layers} onClick={() => setBankPickerTarget(sIdx)}>
                            {tr('+ Chọn từ Ngân hàng')}
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            icon={Plus}
                            onClick={() => {
                              const skillObj = skills.find((sk) => Number(sk.id) === Number(section.languageSkillId));
                              const levelObj = levels.find((lv) => Number(lv.id) === Number(editingExam.certificateLevelId));
                              setInlineModalTarget({
                                sectionIdx: sIdx,
                                initial: createBlankCanonicalQuestion(skillObj?.name || 'Vocabulary', levelObj?.code || 'N4'),
                              });
                            }}
                          >
                            {tr('+ Soạn câu mới vào đề')}
                          </Button>
                        </div>
                      )}
                    </div>

                    {(!section.questions || section.questions.length === 0) ? (
                      <p className="rounded-xl border border-dashed border-rp-line p-4 text-center text-xs text-rp-text-muted">
                        {tr('Chưa có câu hỏi nào. Hãy chọn từ Ngân hàng câu hỏi hoặc soạn trực tiếp.')}
                      </p>
                    ) : (
                      <ul className="divide-y divide-rp-line rounded-xl border border-rp-line bg-slate-50/40">
                        {section.questions.map((slot, qIdx) => {
                          const q = slot.inlineQuestion || {};
                          return (
                            <li key={qIdx} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge tone="brand" size="sm" icon={false}>#{qIdx + 1}</Badge>
                                  {slot.questionBankItemId && (
                                    <Badge tone="success" size="sm" icon={false}>Bank #{slot.questionBankItemId}</Badge>
                                  )}
                                  {q.templateKind && <Badge tone="neutral" size="sm" icon={false}>{q.templateKind}</Badge>}
                                  {q.questionType && <Badge tone="info" size="sm" icon={false}>{q.questionType}</Badge>}
                                </div>
                                <p className="rp-jp truncate font-medium text-rp-text">
                                  {q.questionText ? <RichQuestionText text={q.questionText} /> : trf('Câu hỏi liên kết Ngân hàng #{0}', { 0: slot.questionBankItemId })}
                                </p>
                              </div>
                              {!isLocked && (
                                <IconButton
                                  icon={Trash2}
                                  size="xs"
                                  variant="ghost"
                                  label={tr('Gỡ khỏi phần thi')}
                                  onClick={() => removeQuestionSlot(sIdx, qIdx)}
                                />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {!isLocked && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rp-line pt-4">
                <Button
                  variant="outline"
                  icon={ShieldCheck}
                  loading={validateMutation.isPending}
                  onClick={() => validateMutation.mutate()}
                >
                  {tr('Kiểm tra Blueprint')}
                </Button>
                <Button
                  variant="secondary"
                  icon={CheckCircle2}
                  loading={saveExamMutation.isPending}
                  onClick={() => saveExamMutation.mutate(editingExam)}
                >
                  {tr('Lưu bản nháp')}
                </Button>
                <Button
                  variant="primary"
                  icon={Send}
                  loading={submitMutation.isPending}
                  disabled={!editingExam.title?.trim()}
                  onClick={async () => {
                    const saved = editingExam.id ? editingExam : await saveExamMutation.mutateAsync(editingExam);
                    if (saved?.id) submitMutation.mutate(saved.id);
                  }}
                >
                  {tr('Gửi Quản trị viên duyệt')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <UnifiedToolbar
              search={{
                value: keyword,
                onChange: (e) => setKeyword(e.target.value),
                onClear: () => setKeyword(''),
                placeholder: 'Tìm đề thi / bộ luyện tập…',
                ariaLabel: 'Tìm đề thi',
              }}
              filters={
                <>
                  <CustomSelect
                    fitContent
                    size="sm"
                    value={filterKind}
                    onChange={setFilterKind}
                    options={[
                      { value: 'ALL', label: tr('Mọi loại đề') },
                      ...Object.entries(EXAM_KIND_LABELS).map(([k, label]) => ({ value: k, label: tr(label) })),
                    ]}
                  />
                  <CustomSelect
                    fitContent
                    size="sm"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                      { value: 'ALL', label: tr('Mọi trạng thái') },
                      ...Object.entries(PUBLISH_BADGES).map(([k, meta]) => ({ value: k, label: tr(meta.label) })),
                    ]}
                  />
                </>
              }
              refresh={{
                onRefresh: () => examsQuery.refetch({ cancelRefetch: true }),
                refreshing: examsQuery.isFetching && !examsQuery.isPending,
              }}
            />

            <DataRefreshBoundary
              query={examsQuery}
              hasData={rows.length > 0}
              context="mocktest"
              loadingLabel={tr('Đang tải danh sách đề thi…')}
              errorTitle={tr('Chưa tải được danh sách đề thi')}
            >
              {rows.length === 0 ? (
                <ContextualEmptyState
                  illustration="certificate"
                  title={tr('Chưa có đề thi hoặc bộ luyện tập nào')}
                  description={tr('Hãy tạo Bộ đề luyện tập, Đề hỗn hợp Mixed Practice hoặc Full Mock Test JLPT mới.')}
                  action={
                    <Button variant="primary" icon={Plus} onClick={() => startNewExam('FullMockTest')}>
                      {tr('Tạo đề thi thử JLPT')}
                    </Button>
                  }
                />
              ) : (
                <DataTable
                  columns={examColumns}
                  rows={rows}
                  keyField="id"
                  onRowClick={(row) => openExamDetail(row.id)}
                  rowActions={(row) => (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="xs" variant="outline" onClick={() => openExamDetail(row.id)}>
                        {tr('Mở')}
                      </Button>
                      {['Draft', 'Rejected', 'ChangesRequested'].includes(row.publishStatus) && (
                        <>
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
                                title: tr('Xóa bản nháp đề thi?'),
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
                          label={tr('Tạo phiên bản v+1')}
                          onClick={() => newVersionMutation.mutate(row.id)}
                        />
                      )}
                    </div>
                  )}
                />
              )}
            </DataRefreshBoundary>
          </>
        )}

        {/* Pick Existing Question Bank Item Modal */}
        <Modal
          open={bankPickerTarget !== null}
          onClose={() => setBankPickerTarget(null)}
          title={tr('Chọn câu hỏi từ Ngân hàng (Tái sử dụng không nhân bản)')}
          size="xl"
        >
          {bankPickerQuery.isPending ? (
            <SakuraLoader variant="section" context="lesson" delay={120} />
          ) : bankPickerQuery.isError ? (
            <ContextualErrorState compact error={bankPickerQuery.error} onRetry={() => bankPickerQuery.refetch()} />
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {(bankPickerQuery.data?.items || []).map((q) => (
                <Card key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral" size="sm" icon={false}>{q.certificateLevelCode}</Badge>
                      <Badge tone="info" size="sm" icon={false}>{formatSkillNameLabel(q.skillName, tr)}</Badge>
                      <Badge tone="brand" size="sm" icon={false}>{formatQuestionTypeLabel(q.questionType, tr)}</Badge>
                      <Badge tone={PUBLISH_BADGES[q.publishStatus]?.tone || 'neutral'} size="sm" icon={false}>
                        {formatApprovalStatusLabel(q.publishStatus, tr)}
                      </Badge>
                    </div>
                    <p className="rp-jp text-sm font-medium text-rp-text">{q.questionText}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => addBankQuestionsToSection(bankPickerTarget, q)}
                  >
                    {tr('Gắn vào phần thi')}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Modal>

        {/* Inline Question Authoring Modal for Exam Section */}
        <Modal
          open={Boolean(inlineModalTarget)}
          onClose={() => setInlineModalTarget(null)}
          title={tr('Soạn câu hỏi mới vào phần thi')}
          size="xl"
        >
          {inlineModalTarget && (
            <SkillQuestionEditor
              mode="question"
              initialQuestion={inlineModalTarget.initial}
              onSaved={(savedQuestion) => {
                if (savedQuestion?.id) {
                  addBankQuestionsToSection(inlineModalTarget.sectionIdx, savedQuestion);
                  setInlineModalTarget(null);
                }
              }}
            />
          )}
        </Modal>
      </PageContainer>
    </ContentAuthorShell>
  );
}
