import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  ExternalLink,
  Eye,
  FileWarning,
  Loader2,
} from 'lucide-react';
import { Button } from './core.jsx';
import { cx } from './cx.js';
import { Modal } from './overlay.jsx';
import { SakuraLoader } from './SakuraLoader.jsx';
import { notify } from './feedbackStore.js';
import { describeApiError, isSafeUserMessage } from '@/api/apiErrors.js';
import {
  UNSUPPORTED_PREVIEW_MESSAGE,
  downloadBlobFile,
  formatAttachmentSize,
  getAttachmentFormatInfo,
  resolvePreviewMime,
} from '@/features/scheduling/utils/attachmentHelpers.js';
import { useLocale } from '@/locales/locale.js';

const URL_SPLIT_REGEX = /(https?:\/\/[^\s<>"')]+)/g;

function normalizeSafeExternalHref(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url).trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}

function renderInlineTextWithLinks(text, baseKey) {
  const str = String(text || '');
  if (!str) return null;
  if (!str.includes('http://') && !str.includes('https://')) return str;

  const parts = str.split(URL_SPLIT_REGEX);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      const cleaned = part.replace(/[.,;!?]+$/, '');
      const trailing = part.slice(cleaned.length);
      const safeHref = normalizeSafeExternalHref(cleaned);
      if (safeHref) {
        return (
          <span key={`${baseKey}-u-${idx}`}>
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rp-brand-strong underline decoration-rp-brand/60 underline-offset-2 hover:opacity-80"
            >
              {cleaned}
            </a>
            {trailing}
          </span>
        );
      }
    }
    return <span key={`${baseKey}-t-${idx}`}>{part}</span>;
  });
}

function DocxRunList({ runs = [], prefixKey = 'r' }) {
  if (!Array.isArray(runs) || runs.length === 0) return null;
  return runs.map((run, idx) => {
    const key = `${prefixKey}-${idx}`;
    const safeHref = normalizeSafeExternalHref(run?.href);
    const className = cx(
      run?.bold && 'font-semibold',
      run?.italic && 'italic',
      'whitespace-pre-wrap break-words',
    );
    if (safeHref) {
      return (
        <a
          key={key}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(className, 'text-rp-brand-strong underline decoration-rp-brand/60 underline-offset-2 hover:opacity-80')}
        >
          {run.text}
        </a>
      );
    }
    return (
      <span key={key} className={className}>
        {renderInlineTextWithLinks(run?.text || '', key)}
      </span>
    );
  });
}

async function resolveBlobFriendlyError(err, fallbackMessage) {
  const rawBlob = err?.data;
  if (typeof Blob !== 'undefined' && rawBlob instanceof Blob) {
    try {
      const txt = await rawBlob.text();
      if (txt && txt.trim().startsWith('{')) {
        const parsed = JSON.parse(txt);
        const candidate = parsed?.errorMessage || parsed?.message || parsed?.Message;
        if (candidate && isSafeUserMessage(candidate)) {
          return candidate;
        }
      }
    } catch {
      // ignore parse failure and fall back to safe API error description
    }
  }
  const msg = describeApiError(err)?.message || err?.message;
  return msg && isSafeUserMessage(msg) ? msg : fallbackMessage;
}

export function useAttachmentPreview() {
  const { tr } = useLocale();
  const objectUrlRef = useRef(null);
  const requestSeqRef = useRef(0);

  const [busyKey, setBusyKey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const activeDownloadSpecRef = useRef(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const closePreview = useCallback(() => {
    requestSeqRef.current += 1;
    revokeObjectUrl();
    setModalOpen(false);
    setPreviewLoading(false);
    setPreviewError('');
    setPreviewData(null);
    setActiveAttachment(null);
    activeDownloadSpecRef.current = null;
  }, [revokeObjectUrl]);

  const downloadAttachment = useCallback(async ({ key, attachment, fetchBlob }) => {
    if (!attachment || !fetchBlob || busyKey) return;
    setBusyKey(key || 'download');
    try {
      const raw = await fetchBlob();
      const blob = raw instanceof Blob ? raw : new Blob([raw]);
      downloadBlobFile(blob, attachment.name || 'tai-lieu-dinh-kem', attachment.contentType);
    } catch (err) {
      const msg = await resolveBlobFriendlyError(err, tr('Không thể tải xuống tài liệu lúc này.'));
      notify.error(msg);
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, tr]);

  const openPreview = useCallback(async ({ key, attachment, fetchBlob, fetchDownloadBlob, fetchPreview }) => {
    if (!attachment || busyKey) return;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    revokeObjectUrl();

    const fileName = attachment.name || 'tai-lieu-dinh-kem';
    const format = getAttachmentFormatInfo(fileName, attachment.contentType, attachment.storedFileName);
    const hasDeclaredFormat = Boolean(format.ext || String(attachment.contentType || '').trim());
    const effectiveDownloadFetch = fetchDownloadBlob || fetchBlob;
    activeDownloadSpecRef.current = effectiveDownloadFetch
      ? { key: `${key || 'att'}-modal-dl`, attachment, fetchBlob: effectiveDownloadFetch }
      : null;

    setActiveAttachment(attachment);
    setPreviewData(null);
    setPreviewError('');
    setModalOpen(true);

    if (hasDeclaredFormat && !format.canDirectBlobPreview && !format.canStructuredPreview) {
      setPreviewLoading(false);
      setPreviewData({
        kind: 'unsupported',
        fileName,
        extension: format.ext,
        sizeBytes: attachment.sizeBytes || 0,
        message: UNSUPPORTED_PREVIEW_MESSAGE,
      });
      return;
    }

    setBusyKey(key || 'preview');
    setPreviewLoading(true);
    try {
      if ((format.canDirectBlobPreview || !hasDeclaredFormat) && fetchBlob) {
        const raw = await fetchBlob();
        if (requestSeqRef.current !== seq) return;
        const rawBlob = raw instanceof Blob ? raw : new Blob([raw]);
        const effectiveMime = resolvePreviewMime(fileName, attachment.contentType, rawBlob.type);
        const typedBlob = !rawBlob.type || rawBlob.type === 'application/octet-stream'
          ? (effectiveMime ? new Blob([rawBlob], { type: effectiveMime }) : rawBlob)
          : rawBlob;

        if (effectiveMime.startsWith('text/plain')) {
          const text = await typedBlob.text();
          if (requestSeqRef.current !== seq) return;
          setPreviewData({
            kind: 'text',
            fileName,
            extension: '.txt',
            contentType: effectiveMime,
            sizeBytes: attachment.sizeBytes || typedBlob.size || 0,
            text,
            truncated: false,
          });
          return;
        }

        const actualFormat = getAttachmentFormatInfo(fileName, effectiveMime, attachment.storedFileName);
        if (actualFormat.kind === 'pdf' || actualFormat.kind === 'image') {
          const objectUrl = URL.createObjectURL(typedBlob);
          objectUrlRef.current = objectUrl;
          setPreviewData({
            kind: actualFormat.kind,
            fileName,
            extension: actualFormat.ext,
            contentType: effectiveMime,
            sizeBytes: attachment.sizeBytes || typedBlob.size || 0,
            objectUrl,
          });
          return;
        }

        if (!hasDeclaredFormat && !fetchPreview) {
          setPreviewData({
            kind: 'unsupported',
            fileName,
            extension: actualFormat.ext,
            contentType: effectiveMime,
            sizeBytes: attachment.sizeBytes || typedBlob.size || 0,
            message: UNSUPPORTED_PREVIEW_MESSAGE,
          });
          return;
        }
      }

      if (fetchPreview) {
        const payload = await fetchPreview();
        if (requestSeqRef.current !== seq) return;
        if (payload && (payload.kind === 'pdf' || payload.kind === 'image') && fetchBlob) {
          const raw = await fetchBlob();
          if (requestSeqRef.current !== seq) return;
          const rawBlob = raw instanceof Blob ? raw : new Blob([raw]);
          const effectiveMime = resolvePreviewMime(payload.fileName || fileName, payload.contentType || attachment.contentType, rawBlob.type);
          const typedBlob = !rawBlob.type || rawBlob.type === 'application/octet-stream'
            ? (effectiveMime ? new Blob([rawBlob], { type: effectiveMime }) : rawBlob)
            : rawBlob;
          const objectUrl = URL.createObjectURL(typedBlob);
          objectUrlRef.current = objectUrl;
          setPreviewData({
            ...payload,
            objectUrl,
          });
          return;
        }
        setPreviewData(payload || {
          kind: 'unsupported',
          fileName,
          message: UNSUPPORTED_PREVIEW_MESSAGE,
        });
        return;
      }

      setPreviewData({
        kind: 'unsupported',
        fileName,
        message: UNSUPPORTED_PREVIEW_MESSAGE,
      });
    } catch (err) {
      if (requestSeqRef.current !== seq) return;
      const msg = await resolveBlobFriendlyError(err, tr('Không thể mở tài liệu đính kèm lúc này.'));
      setPreviewError(msg);
    } finally {
      if (requestSeqRef.current === seq) {
        setPreviewLoading(false);
        setBusyKey(null);
      }
    }
  }, [busyKey, downloadAttachment, revokeObjectUrl, tr]);

  const handleDownloadActive = useCallback(() => {
    if (activeDownloadSpecRef.current) {
      void downloadAttachment(activeDownloadSpecRef.current);
    }
  }, [downloadAttachment]);

  return {
    busyKey,
    modalOpen,
    activeAttachment,
    previewData,
    previewLoading,
    previewError,
    openPreview,
    downloadAttachment,
    closePreview,
    handleDownloadActive,
  };
}

export function AttachmentItemRow({
  name,
  contentType = '',
  storedFileName = '',
  sizeBytes = null,
  onView = null,
  onDownload = null,
  viewing = false,
  downloading = false,
  disabled = false,
  trailingExtra = null,
  showFormatBadge = true,
  compact = false,
  className = '',
}) {
  const { tr, trf } = useLocale();
  const displayName = String(name || 'tai-lieu-dinh-kem').trim() || 'tai-lieu-dinh-kem';
  const format = getAttachmentFormatInfo(displayName, contentType, storedFileName);
  const IconComp = format.Icon;
  const sizeText = formatAttachmentSize(sizeBytes);

  return (
    <div
      className={cx(
        'flex min-w-0 max-w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-rp-line bg-white text-rp-text',
        compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-[13px]',
        className,
      )}
    >
      <div title={displayName} className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cx(
            'inline-flex shrink-0 items-center justify-center rounded-md border',
            compact ? 'h-6 w-6' : 'h-7 w-7',
            format.iconBgClass,
          )}
          aria-hidden="true"
        >
          <IconComp className={cx(compact ? 'h-3.5 w-3.5' : 'h-4 w-4', format.iconClass)} />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="min-w-0 truncate font-medium text-rp-text">{displayName}</span>
          {showFormatBadge && format.badgeLabel && format.badgeLabel !== 'FILE' && (
            <span
              className={cx(
                'shrink-0 rounded border px-1.5 py-0.25 text-[10px] font-bold tracking-wide uppercase leading-tight',
                format.badgeClass,
              )}
            >
              {format.badgeLabel}
            </span>
          )}
          {sizeText && (
            <span className="shrink-0 text-[11.5px] font-normal tabular-nums text-rp-text-muted">
              ({sizeText})
            </span>
          )}
        </div>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1.5">
        {trailingExtra}
        {onView && (
          <button
            type="button"
            disabled={disabled || viewing}
            onClick={onView}
            aria-label={trf('Xem {0}', { 0: displayName })}
            className={cx(
              'rp-focus inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/70 font-medium text-rp-text transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-50',
              compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
            )}
          >
            {viewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            <span>{tr('Xem')}</span>
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            disabled={disabled || downloading}
            onClick={onDownload}
            aria-label={trf('Tải xuống {0}', { 0: displayName })}
            className={cx(
              'rp-focus inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/70 font-medium text-rp-text transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-50',
              compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
            )}
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            <span>{tr('Tải')}</span>
          </button>
        )}
      </span>
    </div>
  );
}

export function AttachmentPreviewModal({
  open,
  onClose,
  attachment = null,
  loading = false,
  error = '',
  preview = null,
  onDownload = null,
  downloading = false,
}) {
  const { tr } = useLocale();
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const fileName = preview?.fileName || attachment?.name || tr('Xem tài liệu đính kèm');
  const format = getAttachmentFormatInfo(fileName, preview?.contentType || attachment?.contentType, attachment?.storedFileName);
  const sizeText = formatAttachmentSize(preview?.sizeBytes || attachment?.sizeBytes);

  const sheets = Array.isArray(preview?.sheets) ? preview.sheets : [];
  const safeSheetIdx = activeSheetIndex < sheets.length ? activeSheetIndex : 0;
  const activeSheet = sheets[safeSheetIdx] || null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate" title={fileName}>
            {fileName}
          </span>
          {format.badgeLabel && (
            <span
              className={cx(
                'shrink-0 rounded border px-1.5 py-0.5 text-[10.5px] font-bold uppercase leading-tight',
                format.badgeClass,
              )}
            >
              {format.badgeLabel}
            </span>
          )}
          {sizeText && (
            <span className="shrink-0 text-xs font-normal tabular-nums text-rp-text-muted">
              {sizeText}
            </span>
          )}
        </div>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {preview?.objectUrl && (preview?.kind === 'pdf' || preview?.kind === 'image') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                iconRight={ExternalLink}
                onClick={() => window.open(preview.objectUrl, '_blank', 'noopener,noreferrer')}
              >
                {tr('Mở ở tab mới')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              {tr('Đóng')}
            </Button>
            {onDownload && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={Download}
                loading={downloading}
                onClick={onDownload}
              >
                {tr('Tải xuống')}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 py-8">
          <SakuraLoader size={40} label={tr('Đang tải nội dung tài liệu...')} />
        </div>
      ) : error ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="m-0 max-w-md text-sm font-medium text-red-900">{error}</p>
        </div>
      ) : preview?.kind === 'pdf' && preview.objectUrl ? (
        <iframe
          src={preview.objectUrl}
          title={fileName}
          className="h-[70vh] w-full rounded-xl border border-rp-line bg-white"
        />
      ) : preview?.kind === 'image' && preview.objectUrl ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2/40 p-3">
          <img
            src={preview.objectUrl}
            alt={fileName}
            className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-xs"
          />
        </div>
      ) : preview?.kind === 'text' ? (
        <div className="space-y-2">
          {preview.truncated && (
            <p className="m-0 text-xs text-rp-text-muted">
              {tr('Đang hiển thị phần đầu của tài liệu văn bản. Tải xuống để xem toàn bộ nội dung.')}
            </p>
          )}
          <pre className="m-0 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 font-mono text-xs leading-6 text-rp-text">
            {renderInlineTextWithLinks(preview.text || '', 'txt-preview')}
          </pre>
        </div>
      ) : preview?.kind === 'docx' ? (
        <div className="space-y-2">
          {preview.truncated && (
            <p className="m-0 text-xs text-rp-text-muted">
              {tr('Tài liệu khá dài nên bản xem trước chỉ hiển thị phần đầu. Tải xuống để xem đầy đủ.')}
            </p>
          )}
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-rp-line bg-white p-5 sm:p-6 space-y-2.5 text-[14px] leading-relaxed text-rp-text">
            {(!preview.blocks || preview.blocks.length === 0) ? (
              <p className="m-0 text-sm text-rp-text-muted">{tr('Tài liệu Word này chưa có nội dung văn bản.')}</p>
            ) : (
              preview.blocks.map((block, bIdx) => {
                if (block.type === 'table' && Array.isArray(block.rows)) {
                  return (
                    <div key={`tbl-${bIdx}`} className="overflow-x-auto rounded-lg border border-rp-line my-2">
                      <table className="min-w-full border-collapse text-xs">
                        <tbody>
                          {block.rows.map((row, rIdx) => (
                            <tr key={`r-${rIdx}`} className={rIdx === 0 ? 'bg-rp-bg-2/70 font-semibold' : 'border-t border-rp-line'}>
                              {row.map((cellRuns, cIdx) => (
                                <td key={`c-${cIdx}`} className="border-r last:border-r-0 border-rp-line px-2.5 py-1.5 align-top">
                                  <DocxRunList runs={cellRuns} prefixKey={`t-${bIdx}-${rIdx}-${cIdx}`} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                if (!block.runs || block.runs.length === 0) {
                  return <div key={`sp-${bIdx}`} className="h-2" aria-hidden="true" />;
                }

                if (block.type === 'heading1') {
                  return (
                    <h3 key={`h1-${bIdx}`} className="m-0 pt-2 text-lg font-bold text-rp-text">
                      <DocxRunList runs={block.runs} prefixKey={`h1-${bIdx}`} />
                    </h3>
                  );
                }
                if (block.type === 'heading2') {
                  return (
                    <h4 key={`h2-${bIdx}`} className="m-0 pt-1.5 text-base font-bold text-rp-text">
                      <DocxRunList runs={block.runs} prefixKey={`h2-${bIdx}`} />
                    </h4>
                  );
                }
                if (block.type === 'heading3') {
                  return (
                    <h5 key={`h3-${bIdx}`} className="m-0 pt-1 text-[14.5px] font-semibold text-rp-text">
                      <DocxRunList runs={block.runs} prefixKey={`h3-${bIdx}`} />
                    </h5>
                  );
                }
                if (block.type === 'list-item') {
                  return (
                    <div key={`li-${bIdx}`} className="flex items-start gap-2 pl-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rp-brand" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <DocxRunList runs={block.runs} prefixKey={`li-${bIdx}`} />
                      </div>
                    </div>
                  );
                }
                return (
                  <p key={`p-${bIdx}`} className="m-0">
                    <DocxRunList runs={block.runs} prefixKey={`p-${bIdx}`} />
                  </p>
                );
              })
            )}
          </div>
        </div>
      ) : preview?.kind === 'spreadsheet' && sheets.length > 0 ? (
        <div className="space-y-3">
          {sheets.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {sheets.map((s, sIdx) => (
                <button
                  key={`${s.name}-${sIdx}`}
                  type="button"
                  onClick={() => setActiveSheetIndex(sIdx)}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                    safeSheetIdx === sIdx
                      ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2',
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {activeSheet?.truncated && (
            <p className="m-0 text-xs text-rp-text-muted">
              {tr('Bảng tính có nhiều dòng/cột nên bản xem trước hiển thị phần dữ liệu chính. Tải xuống để xem đầy đủ.')}
            </p>
          )}
          {(!activeSheet?.rows || activeSheet.rows.length === 0) ? (
            <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-6 text-center text-sm text-rp-text-muted">
              {tr('Trang tính này chưa có dữ liệu.')}
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-xl border border-rp-line bg-white">
              <table className="min-w-full border-collapse text-xs">
                <tbody>
                  {activeSheet.rows.map((row, rIdx) => (
                    <tr key={`sr-${rIdx}`} className={rIdx === 0 ? 'sticky top-0 bg-rp-bg-2 font-semibold text-rp-text' : 'border-t border-rp-line'}>
                      {row.map((cell, cIdx) => {
                        const safeHref = normalizeSafeExternalHref(cell?.href);
                        return (
                          <td key={`sc-${cIdx}`} className="max-w-[280px] border-r last:border-r-0 border-rp-line px-2.5 py-1.5 align-top break-words">
                            {safeHref ? (
                              <a
                                href={safeHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-rp-brand-strong underline hover:opacity-80"
                              >
                                {cell?.text || safeHref}
                              </a>
                            ) : (
                              renderInlineTextWithLinks(cell?.text || '', `sc-${rIdx}-${cIdx}`)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-rp-line bg-rp-bg-2/40 p-6 text-center">
          <FileWarning className="h-9 w-9 text-rp-text-muted" aria-hidden="true" />
          <p className="m-0 max-w-md text-sm font-medium text-rp-text">
            {preview?.message || tr(UNSUPPORTED_PREVIEW_MESSAGE)}
          </p>
        </div>
      )}
    </Modal>
  );
}
