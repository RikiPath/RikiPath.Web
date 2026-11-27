import { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from './feedbackStore.js';
import { describeApiError, isSafeUserMessage } from '@/api/apiErrors.js';
import {
  UNSUPPORTED_PREVIEW_MESSAGE,
  downloadBlobFile,
  getAttachmentFormatInfo,
  resolvePreviewMime,
} from '@/features/scheduling/utils/attachmentHelpers.js';
import { useLocale } from '@/locales/locale.js';

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
  }, [busyKey, revokeObjectUrl, tr]);

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
