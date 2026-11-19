import { CheckmarkIcon, ErrorIcon, LoaderIcon } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { cx } from './cx.js';

/*
 * Compact react-hot-toast look: a white horizontal bar, status icon on the left, message on the right.
 * Width follows the content (short messages stay on one line) up to ~440px, then wraps by word.
 * Success / error / loading reuse react-hot-toast's own animated icons; warning / info are matching
 * 20px badges. Colours: success emerald-500, error rose-500, warning amber-500, info sky-500.
 */
function GlyphBadge({ cls, children }) {
  return (
    <span className={cx('rp-toast-glyph flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold leading-none text-white', cls)}>
      {children}
    </span>
  );
}

const TONE_META = {
  success: { label: 'Thành công', icon: () => <CheckmarkIcon primary="#10b981" secondary="#fff" /> },
  error: { label: 'Lỗi', icon: () => <ErrorIcon primary="#f43f5e" secondary="#fff" /> },
  warning: { label: 'Lưu ý', icon: () => <GlyphBadge cls="bg-amber-500">!</GlyphBadge> },
  info: { label: 'Thông tin', icon: () => <GlyphBadge cls="bg-sky-500">i</GlyphBadge> },
  loading: { label: 'Đang xử lý', icon: () => <LoaderIcon primary="#E05A7A" secondary="#F6D3DD" /> },
};

export default function SakuraToast({ t, item, onDismiss }) {
  const { tr } = useLocale();
  const meta = TONE_META[item?.tone] || TONE_META.info;
  const isError = item?.tone === 'error';
  const statusLabel = tr(meta.label);
  const headline = item?.title || item?.message;
  const detail = item?.title && item?.message ? item.message : null;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-toast-tone={item?.tone || 'info'}
      className={cx(
        'rp-toast group pointer-events-auto flex w-max max-w-[min(440px,calc(100vw-32px))] gap-2.5 rounded-[10px] bg-white py-2 pl-3 pr-1.5 text-[#363636]',
        detail || item?.action ? 'items-start' : 'items-center',
        t?.visible ? 'rp-toast-enter' : 'rp-toast-leave',
      )}
    >
      <span aria-hidden="true" className={cx('flex h-5 w-5 shrink-0 items-center justify-center', (detail || item?.action) && 'mt-px')}>
        {meta.icon()}
      </span>

      <div className="min-w-0 py-0.5 [overflow-wrap:break-word] [text-wrap:pretty]">
        <p className={cx('text-sm leading-5', detail ? 'font-semibold' : 'font-medium')}>
          <span className="sr-only">{tr(statusLabel)}: </span>
          {headline}
        </p>
        {detail && <p className="mt-0.5 text-[13px] leading-5 text-[#5f5a5c]">{detail}</p>}
        {item?.action && (
          <button
            type="button"
            onClick={() => {
              item.action.onClick?.();
              onDismiss(item.id);
            }}
            className="rp-focus rp-link mt-1 rounded-sm text-[13px]"
          >
            {tr(item.action.label)}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label={tr('Đóng thông báo')}
        className={cx(
          'rp-focus flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#9a9396] opacity-60 transition-opacity hover:bg-black/5 hover:text-[#363636] hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100',
          (detail || item?.action) && 'self-start',
        )}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
