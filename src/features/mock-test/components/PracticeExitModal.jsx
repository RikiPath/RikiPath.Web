import { CheckCircle2, LogOut, RefreshCw, TriangleAlert } from 'lucide-react';
import { Banner, Button, Modal } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function PracticeExitModal({
  open,
  onClose,
  onConfirmExit,
  onRetrySync,
  syncPending = false,
  hasUnsyncedError = false,
  exiting = false,
}) {
  const { tr } = useLocale();

  return (
    <Modal
      open={open}
      onClose={() => !exiting && onClose?.()}
      size="sm"
      title={tr('Bạn muốn tạm dừng bài luyện tập?')}
      description={tr('Tiến độ hiện tại sẽ được lưu lại. Bạn có thể quay lại và tiếp tục bài luyện tập khi sẵn sàng.')}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={exiting}
            onClick={onClose}
          >
            {tr('Tiếp tục làm bài')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={LogOut}
            loading={exiting || syncPending}
            onClick={onConfirmExit}
          >
            {tr('Thoát và lưu')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {hasUnsyncedError ? (
          <Banner
            tone="warning"
            title={tr('Chưa đồng bộ được một số câu trả lời')}
            actions={
              onRetrySync && (
                <Button type="button" size="xs" variant="secondary" icon={RefreshCw} onClick={onRetrySync}>
                  {tr('Đồng bộ lại')}
                </Button>
              )
            }
          >
            {tr('Bấm “Thoát và lưu” sẽ thử đồng bộ lại lên máy chủ trước khi rời bài luyện tập.')}
          </Banner>
        ) : syncPending ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-rp-line bg-rp-bg-2/75 p-3 text-xs text-rp-text-2">
            <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin text-rp-brand-strong" />
            <span>{tr('Đang đồng bộ các đáp án mới nhất lên máy chủ…')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/75 p-3 text-xs font-medium text-emerald-900">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{tr('Các đáp án gần nhất đã được xác nhận lưu trên hệ thống.')}</span>
          </div>
        )}

        <p className="flex items-start gap-2 text-xs text-rp-text-muted">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{tr('Hệ thống giữ nguyên đáp án và tiến độ để bạn tiếp tục bất kỳ lúc nào.')}</span>
        </p>
      </div>
    </Modal>
  );
}
