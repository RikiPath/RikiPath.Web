import { FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';

export const MAX_PROPOSAL_ATTACHMENTS = 5;
export const MAX_PROPOSAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_EXTENSIONS = Object.freeze([
  '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.xlsx', '.xls', '.csv', '.txt',
]);

export const UNSUPPORTED_PREVIEW_MESSAGE = 'Tài liệu này chưa hỗ trợ xem trước. Bạn có thể tải xuống để xem.';

const MIME_BY_EXTENSION = Object.freeze({
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
});

export function formatAttachmentSize(sizeBytes) {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export function getAttachmentExtension(name = '', storedFileName = '') {
  const nameRaw = String(name || '').trim().toLowerCase();
  const dot = nameRaw.lastIndexOf('.');
  if (dot > 0 && dot < nameRaw.length - 1) return nameRaw.slice(dot);
  const storedRaw = String(storedFileName || '').trim().toLowerCase();
  const storedDot = storedRaw.lastIndexOf('.');
  return storedDot > 0 && storedDot < storedRaw.length - 1 ? storedRaw.slice(storedDot) : '';
}

export function resolveCanonicalMimeForExtension(ext = '') {
  return MIME_BY_EXTENSION[String(ext || '').trim().toLowerCase()] || '';
}

export function isAllowedAttachmentFile(file) {
  if (!file) return { valid: false, reason: 'Vui lòng chọn tệp hợp lệ.' };
  const ext = getAttachmentExtension(file.name);
  if (!ext || !ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      reason: 'Định dạng tệp chưa được hỗ trợ. Vui lòng chọn PDF, Word, Excel, CSV, TXT hoặc ảnh.',
    };
  }
  if (!(Number(file.size) > 0)) {
    return { valid: false, reason: 'Tệp tải lên đang trống.' };
  }
  if (file.size > MAX_PROPOSAL_ATTACHMENT_BYTES) {
    return { valid: false, reason: 'Dung lượng tệp vượt quá giới hạn 25 MB.' };
  }
  return { valid: true, ext };
}

export function getAttachmentFormatInfo(name = '', contentType = '', storedFileName = '') {
  const ext = getAttachmentExtension(name, storedFileName);
  const mime = String(contentType || '').trim().toLowerCase();
  const extBadge = ext ? ext.slice(1).toUpperCase() : '';

  if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
    return {
      ext,
      badgeLabel: extBadge || 'IMG',
      Icon: ImageIcon,
      iconClass: 'text-violet-600',
      iconBgClass: 'bg-violet-50 border-violet-200',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
      kind: 'image',
      canDirectBlobPreview: true,
      canStructuredPreview: false,
    };
  }

  if (ext === '.pdf' || mime === 'application/pdf') {
    return {
      ext: ext || '.pdf',
      badgeLabel: 'PDF',
      Icon: FileText,
      iconClass: 'text-rose-600',
      iconBgClass: 'bg-rose-50 border-rose-200',
      badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
      kind: 'pdf',
      canDirectBlobPreview: true,
      canStructuredPreview: false,
    };
  }

  if (['.xlsx', '.xls', '.csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return {
      ext,
      badgeLabel: extBadge || 'XLSX',
      Icon: FileSpreadsheet,
      iconClass: 'text-emerald-600',
      iconBgClass: 'bg-emerald-50 border-emerald-200',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      kind: ext === '.xls' ? 'unsupported' : 'spreadsheet',
      canDirectBlobPreview: false,
      canStructuredPreview: ext === '.xlsx' || ext === '.csv',
    };
  }

  if (['.docx', '.doc'].includes(ext) || mime.includes('wordprocessingml') || mime === 'application/msword') {
    return {
      ext,
      badgeLabel: extBadge || 'DOCX',
      Icon: FileText,
      iconClass: 'text-blue-600',
      iconBgClass: 'bg-blue-50 border-blue-200',
      badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
      kind: ext === '.doc' ? 'unsupported' : 'docx',
      canDirectBlobPreview: false,
      canStructuredPreview: ext === '.docx',
    };
  }

  if (ext === '.txt' || mime.startsWith('text/plain')) {
    return {
      ext: ext || '.txt',
      badgeLabel: 'TXT',
      Icon: FileText,
      iconClass: 'text-slate-600',
      iconBgClass: 'bg-slate-100 border-slate-200',
      badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
      kind: 'text',
      canDirectBlobPreview: false,
      canStructuredPreview: true,
    };
  }

  return {
    ext,
    badgeLabel: extBadge || 'FILE',
    Icon: FileText,
    iconClass: 'text-rp-text-muted',
    iconBgClass: 'bg-rp-bg-2 border-rp-line',
    badgeClass: 'border-rp-line bg-rp-bg-2 text-rp-text-2',
    kind: 'unsupported',
    canDirectBlobPreview: false,
    canStructuredPreview: false,
  };
}

export function getAttachmentIconComponent(name = '', contentType = '') {
  return getAttachmentFormatInfo(name, contentType).Icon;
}

export function isAttachmentInlinePreviewable(name = '', contentType = '') {
  const info = getAttachmentFormatInfo(name, contentType);
  return info.canDirectBlobPreview || info.canStructuredPreview;
}

export function resolvePreviewMime(fileName = '', contentType = '', blobType = '') {
  const normalizedBlobType = String(blobType || '').trim().toLowerCase();
  if (normalizedBlobType && normalizedBlobType !== 'application/octet-stream') return normalizedBlobType;
  const normalizedMetaType = String(contentType || '').trim().toLowerCase();
  if (normalizedMetaType && normalizedMetaType !== 'application/octet-stream') return normalizedMetaType;
  const ext = getAttachmentExtension(fileName);
  return resolveCanonicalMimeForExtension(ext);
}

export function alignDownloadFileName(fileName = 'tai-lieu-dinh-kem', contentType = '', blobType = '') {
  const cleanName = String(fileName || 'tai-lieu-dinh-kem').trim() || 'tai-lieu-dinh-kem';
  const currentExt = getAttachmentExtension(cleanName);
  if (currentExt) return cleanName;
  const mime = String(blobType || contentType || '').split(';')[0].trim().toLowerCase();
  const matchedExt = Object.entries(MIME_BY_EXTENSION).find(([, value]) => value.split(';')[0] === mime)?.[0];
  return matchedExt ? `${cleanName}${matchedExt}` : cleanName;
}

export function downloadBlobFile(blob, fileName = 'tai-lieu-dinh-kem', contentType = '') {
  if (!(blob instanceof Blob)) return;
  const resolvedMime = resolvePreviewMime(fileName, contentType, blob.type);
  const effectiveBlob = !blob.type || blob.type === 'application/octet-stream'
    ? (resolvedMime ? new Blob([blob], { type: resolvedMime }) : blob)
    : blob;
  const downloadName = alignDownloadFileName(fileName, contentType, effectiveBlob.type);
  const objectUrl = URL.createObjectURL(effectiveBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

export function openOrDownloadBlob(blob, fileName = 'tai-lieu-dinh-kem', { forceDownload = false, contentType = '' } = {}) {
  if (!(blob instanceof Blob)) return { previewed: false, downloaded: false };
  const resolvedMime = resolvePreviewMime(fileName, contentType, blob.type);
  const effectiveBlob = !blob.type || blob.type === 'application/octet-stream'
    ? (resolvedMime ? new Blob([blob], { type: resolvedMime }) : blob)
    : blob;

  if (forceDownload) {
    downloadBlobFile(effectiveBlob, fileName, contentType);
    return { previewed: false, downloaded: true };
  }

  const info = getAttachmentFormatInfo(fileName, resolvedMime || effectiveBlob.type);
  if (!info.canDirectBlobPreview) {
    return { previewed: false, downloaded: false, unsupported: true };
  }

  const objectUrl = URL.createObjectURL(effectiveBlob);
  const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (popup) {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return { previewed: true, downloaded: false };
  }

  URL.revokeObjectURL(objectUrl);
  return { previewed: false, downloaded: false, blocked: true };
}
