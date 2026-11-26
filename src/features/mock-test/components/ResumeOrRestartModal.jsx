import { useState } from 'react';
import { PlayCircle, RotateCcw } from 'lucide-react';
import {
  formatMockDateTime,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
import { Badge, Button, Modal, ProgressBar } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function ResumeOrRestartModal({
  open,
  summary,
  onClose,
  onContinue,
  onStartNew,
  loading = false,
}) {
  const { tr, trf } = useLocale();
  const [confirmRestart, setConfirmRestart] = useState(false);

  if (!summary) return null;

  const answered = summary.activeAnsweredCount ?? 0;
  const total = summary.activeTotalQuestions ?? summary.questionCount ?? 0;
  const pct = summary.activeProgressPercent ?? (total > 0 ? Math.round((answered / total) * 100) : 0);

  function handleClose() {
    if (loading) return;
    setConfirmRestart(false);
    onClose?.();
  }

  if (confirmRestart) {
    return (
      <Modal
        open={open}
        onClose={() => !loading && setConfirmRestart(false)}
        size="sm"
        title={tr('Bắt đầu lượt luyện tập mới?')}
        description={tr('Tiến độ của lượt làm hiện tại sẽ không còn được tiếp tục. Bạn có chắc chắn muốn bắt đầu lại không?')}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={loading}
              onClick={() => setConfirmRestart(false)}
            >
              {tr('Giữ bài hiện tại')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              icon={RotateCcw}
              loading={loading}
              onClick={() => onStartNew?.(summary)}
            >
              {tr('Bắt đầu mới')}
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-900">
          <p className="font-semibold">{tr(summary.title)}</p>
          <p className="mt-1 text-xs text-amber-800">
            {trf('Lượt đang làm đã trả lời {0}/{1} câu ({2}%). Lịch sử các lượt đã hoàn thành trước đó vẫn được giữ nguyên.', {
              0: answered,
              1: total,
              2: pct,
            })}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      title={tr('Tiếp tục bài luyện tập của bạn?')}
      description={tr('Bạn đang có một lượt luyện tập chưa hoàn thành. Bạn có thể tiếp tục từ nơi đã dừng hoặc bắt đầu một lượt mới.')}
      footer={
        <>
          {summary.canRestart !== false && (
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={RotateCcw}
              disabled={loading}
              onClick={() => setConfirmRestart(true)}
            >
              {tr('Bắt đầu mới')}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={PlayCircle}
            loading={loading}
            onClick={() => onContinue?.(summary)}
          >
            {tr('Làm tiếp')}
          </Button>
        </>
      }
    >
      <div className="space-y-3 rounded-xl border border-rp-line bg-rp-bg-2/75 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {summary.jlptLevelName && (
            <Badge tone="brand" size="sm" icon={false}>{summary.jlptLevelName}</Badge>
          )}
          {summary.activeLastSavedAt && (
            <span className="text-xs text-rp-text-muted">
              {trf('Lưu lúc {0}', { 0: formatMockDateTime(summary.activeLastSavedAt) })}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-rp-text">{tr(summary.title)}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-rp-text-2">
            <span>{tr('Tiến độ hiện tại')}</span>
            <span className="tabular-nums text-rp-brand-strong">
              {trf('{0}/{1} câu ({2}%)', { 0: answered, 1: total, 2: pct })}
            </span>
          </div>
          <ProgressBar value={pct} max={100} label={tr('Tiến độ lượt đang làm')} />
        </div>
      </div>
    </Modal>
  );
}
