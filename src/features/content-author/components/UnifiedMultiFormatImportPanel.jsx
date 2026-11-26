import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Upload,
} from 'lucide-react';

import {
  confirmUnifiedImport,
  confirmUnifiedZipArchive,
  downloadSkillTemplate,
  previewUnifiedImport,
  triggerBlobDownload,
} from '@/features/content-author/api/contentAuthoringV2Api.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  DataTable,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  formatExamKindLabel,
  formatImportRowStatusLabel,
  formatSkillNameLabel,
} from '@/utils/terminology.js';

const TEMPLATE_ITEMS = [
  { key: 'vocabulary', label: 'Từ vựng (Vocabulary)', hint: 'Word, Reading, Meaning, Câu hỏi' },
  { key: 'kanji', label: 'Hán tự (Kanji)', hint: 'Kanji, On/Kun, Hán Việt, Ngữ cảnh' },
  { key: 'grammar', label: 'Ngữ pháp (Grammar)', hint: 'Pattern, FillBlank, Ordering (★)' },
  { key: 'reading', label: 'Đọc hiểu (Passage → Group)', hint: 'Sheet Passages + ReadingQuestions' },
  { key: 'listening', label: 'Nghe hiểu (Audio → Group)', hint: 'Sheet ListeningGroups + Questions' },
  { key: 'mixed-practice', label: 'Luyện tập hỗn hợp', hint: 'Manifest chọn câu hỏi nhiều kỹ năng' },
  { key: 'full-mock-test', label: 'Đề thi thử JLPT Blueprint', hint: 'ExamBlueprint, Sections, Passages, Q' },
];

const KIND_OPTIONS = [
  { value: 'Auto', label: 'Tự động nhận diện từ tệp' },
  { value: 'Vocabulary', label: 'Từ vựng (Vocabulary)' },
  { value: 'Kanji', label: 'Hán tự (Kanji)' },
  { value: 'Grammar', label: 'Ngữ pháp (Grammar)' },
  { value: 'Reading', label: 'Đọc hiểu (Reading)' },
  { value: 'Listening', label: 'Nghe hiểu (Listening)' },
  { value: 'MixedPractice', label: 'Luyện tập hỗn hợp (Mixed)' },
  { value: 'FullMockTest', label: 'Đề thi thử JLPT (Mock Test)' },
];

export default function UnifiedMultiFormatImportPanel({ onConfirmed }) {
  const { tr, trf } = useLocale();
  const [selectedFile, setSelectedFile] = useState(null);
  const [expectedKind, setExpectedKind] = useState('Auto');
  const [preview, setPreview] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);

  const previewMutation = useMutation({
    mutationFn: ({ file, kind }) => previewUnifiedImport(file, kind),
    onSuccess: (res) => {
      setPreview(res);
      setConfirmResult(null);
      if (res?.canConfirm) {
        notify.success(tr('Đã phân tích tệp xem trước (chưa ghi vào DB).'), '', { key: 'uni-prev-ok' });
      } else {
        notify.info(tr('Tệp có dòng cần sửa hoặc kiểm tra lại.'), '', { key: 'uni-prev-warn' });
      }
    },
    onError: (err) => notify.apiError(err, tr('Không thể đọc tệp nhập liệu'), { key: 'uni-prev-err' }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const idemKey = `ui-${preview.previewId}`;
      if (preview.detectedFormat === 'ZIP' && selectedFile) {
        return confirmUnifiedZipArchive(selectedFile, expectedKind, idemKey);
      }
      return confirmUnifiedImport({
        sourceFileName: preview.fileName,
        sourceFormat: preview.detectedFormat,
        idempotencyKey: idemKey,
        examBlueprint: preview.examBlueprint,
        rows: preview.rows.filter((r) => r.status !== 'Error'),
      });
    },
    onSuccess: (res) => {
      setConfirmResult(res);
      notify.success(tr('Đã lưu bản nháp thành công từ tệp nhập liệu.'), '', { key: 'uni-conf-ok' });
      onConfirmed?.(res);
    },
    onError: (err) => notify.apiError(err, tr('Không xác nhận lưu nháp được'), { key: 'uni-conf-err' }),
  });

  const handleDownloadTemplate = async (kind, fmt) => {
    try {
      const { blob, fileName } = await downloadSkillTemplate(kind, fmt);
      triggerBlobDownload(blob, fileName);
      notify.success(trf('Đã tải mẫu {0}', { 0: fileName }), '', { key: `tpl-${kind}-${fmt}` });
    } catch (err) {
      notify.apiError(err, tr('Không tải được template'));
    }
  };

  const rows = preview?.rows || [];
  const rowColumns = useMemo(
    () => [
      {
        key: 'rowNumber',
        header: tr('Dòng'),
        render: (r) => <span className="font-mono text-xs">{r.rowNumber}</span>,
      },
      {
        key: 'recordType',
        header: tr('Loại'),
        render: (r) => <Badge tone="neutral" size="sm" icon={false}>{r.recordType}</Badge>,
      },
      {
        key: 'levelCode',
        header: tr('Cấp / Kỹ năng'),
        render: (r) => (
          <span className="text-xs font-medium text-rp-text">
            {[r.levelCode, r.skillName].filter(Boolean).join(' · ')}
          </span>
        ),
      },
      {
        key: 'summaryText',
        header: tr('Nội dung'),
        render: (r) => (
          <div className="max-w-md space-y-1">
            <div className="line-clamp-2 text-xs font-medium text-rp-text">{r.summaryText || r.rowKey}</div>
            {r.issues?.length > 0 && (
              <ul className="space-y-0.5 text-[11px] text-rose-700">
                {r.issues.map((iss, idx) => (
                  <li key={idx} className={iss.severity === 'Warning' ? 'text-amber-700' : 'text-rose-700'}>
                    [{iss.severity}] {iss.field}: {iss.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: tr('Trạng thái'),
        render: (r) => {
          const tone = r.status === 'Error' ? 'danger' : r.status === 'Warning' || r.status === 'Duplicate' ? 'warning' : 'success';
          return (
            <div className="flex flex-wrap gap-1">
              <Badge tone={tone} size="sm" icon={false}>{formatImportRowStatusLabel(r.status, tr)}</Badge>
              {r.incompleteMedia && <Badge tone="warning" size="sm" icon={AlertTriangle}>{tr('Thiếu audio')}</Badge>}
            </div>
          );
        },
      },
    ],
    [tr],
  );

  return (
    <div className="space-y-4">
      {/* 1. Template Library (7 Templates) */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-rp-text">{tr('1. Tải template chuẩn theo kỹ năng & cấu trúc đề (v2.0)')}</h3>
            <p className="text-xs text-rp-text-muted">
              {tr('Mỗi mẫu gồm cột bắt buộc/tùy chọn, quy tắc kiểm tra và sheet dữ liệu mẫu riêng biệt.')}
            </p>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_ITEMS.map((item) => (
            <div key={item.key} className="flex flex-col justify-between rounded-xl border border-rp-line bg-white p-3">
              <div>
                <div className="text-xs font-bold text-rp-text">{tr(item.label)}</div>
                <div className="mt-0.5 text-[11px] text-rp-text-muted">{tr(item.hint)}</div>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <Button type="button" variant="secondary" size="sm" icon={Download} onClick={() => handleDownloadTemplate(item.key, 'xlsx')}>
                  Excel
                </Button>
                <Button type="button" variant="ghost" size="sm" icon={FileJson} onClick={() => handleDownloadTemplate(item.key, 'json')}>
                  JSON
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Multi-Format Upload & Preview */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rp-text">{tr('2. Tải lên tệp đa định dạng để xem trước')}</h3>
            <p className="text-xs text-rp-text-muted">
              {tr('Hỗ trợ Excel (.xlsx), JSON (.json), gói ZIP kèm media (.zip) và PDF có lớp văn bản (.pdf).')}
            </p>
          </div>
          <div className="w-64">
            <CustomSelect
              size="sm"
              value={expectedKind}
              onChange={setExpectedKind}
              options={KIND_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-rp-brand-border bg-rp-brand-tint/20 p-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rp-line bg-white px-4 py-2 text-xs font-semibold text-rp-text shadow-rp-xs hover:bg-rp-brand-tint/40">
            <Upload className="h-4 w-4 text-rp-brand-strong" />
            {selectedFile ? selectedFile.name : tr('Chọn tệp .xlsx / .json / .zip / .pdf')}
            <input
              type="file"
              accept=".xlsx,.json,.zip,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSelectedFile(file);
                previewMutation.mutate({ file, kind: expectedKind });
              }}
            />
          </label>

          {selectedFile && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={previewMutation.isPending}
              onClick={() => previewMutation.mutate({ file: selectedFile, kind: expectedKind })}
            >
              {tr('Phân tích lại')}
            </Button>
          )}
        </div>

        {preview && (
          <div className="space-y-3 border-t border-rp-line pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="neutral" icon={preview.detectedFormat === 'ZIP' ? FileArchive : preview.detectedFormat === 'PDF' ? FileText : preview.detectedFormat === 'JSON' ? FileJson : FileSpreadsheet}>
                  {`${preview.detectedFormat} · ${formatSkillNameLabel(preview.detectedKind, tr)}`}
                </Badge>
                <Badge tone="success" icon={CheckCircle2}>{trf('{0} hợp lệ', { 0: preview.validCount })}</Badge>
                {preview.warningCount > 0 && <Badge tone="warning" icon={AlertTriangle}>{trf('{0} cảnh báo', { 0: preview.warningCount })}</Badge>}
                {preview.duplicateCount > 0 && <Badge tone="warning" icon={false}>{trf('{0} trùng', { 0: preview.duplicateCount })}</Badge>}
                {preview.errorCount > 0 && <Badge tone="danger" icon={AlertTriangle}>{trf('{0} lỗi', { 0: preview.errorCount })}</Badge>}
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Sparkles}
                disabled={!preview.canConfirm}
                loading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                {tr('Xác nhận nhập vào Bản nháp (Draft)')}
              </Button>
            </div>

            {preview.fileErrors?.length > 0 && (
              <Banner tone="danger" title={tr('Không thể tiếp tục nhập tệp')}>
                <ul className="list-disc pl-4 text-xs">
                  {preview.fileErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Banner>
            )}

            {preview.fileWarnings?.length > 0 && (
              <Banner tone="warning" title={tr('Cảnh báo phân tích tệp')}>
                <ul className="list-disc pl-4 text-xs">
                  {preview.fileWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </Banner>
            )}

            {preview.mediaAssets?.length > 0 && (
              <Banner tone="info" title={trf('Tìm thấy {0} tệp media trong ZIP (sẽ tải lên khi Xác nhận)', { 0: preview.mediaAssets.length })}>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {preview.mediaAssets.map((m) => (
                    <Badge key={m.archivePath} tone="neutral" size="sm" icon={false}>
                      {`${m.archivePath} (${Math.max(1, Math.round(m.sizeBytes / 1024))} KB)`}
                    </Badge>
                  ))}
                </div>
              </Banner>
            )}

            {preview.examBlueprint && (
              <div className="rounded-xl border border-rp-brand-border bg-rp-brand-tint/25 p-3 text-xs">
                <div className="font-bold text-rp-text">
                  {`${formatExamKindLabel(preview.examBlueprint.examKind, tr)}: ${preview.examBlueprint.title} (${preview.examBlueprint.certificateLevelCode} · ${preview.examBlueprint.timeLimitMinutes} phút)`}
                </div>
                <div className="mt-1 text-rp-text-2">
                  {trf('{0} phần thi cấu trúc sẵn sàng tạo bản nháp.', { 0: preview.examBlueprint.sections?.length || 0 })}
                </div>
              </div>
            )}

            {confirmResult && (
              <Banner tone="success" title={tr('Đã tạo bản nháp (Draft) thành công')}>
                <p className="text-xs">
                  {trf('Batch {0}: {1} đoạn/nhóm, {2} câu hỏi vào Ngân hàng câu hỏi.', {
                    0: confirmResult.batchId,
                    1: confirmResult.passagesDrafted,
                    2: confirmResult.questionsDrafted,
                  })}
                  {confirmResult.examDraftId ? ` ${trf('Đề nháp #{0} sẵn sàng trong Trình tạo đề.', { 0: confirmResult.examDraftId })}` : ''}
                </p>
              </Banner>
            )}

            {rows.length > 0 && (
              <DataTable rows={rows} columns={rowColumns} emptyTitle={tr('Không có dòng dữ liệu')} />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
