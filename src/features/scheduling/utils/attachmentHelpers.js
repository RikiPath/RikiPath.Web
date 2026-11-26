import { FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';

export const MAX_PROPOSAL_ATTACHMENTS = 5;
export const MAX_PROPOSAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_EXTENSIONS = Object.freeze([
  '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.xlsx', '.xls', '.csv', '.txt',
]);

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
  const raw = String(name || storedFileName || '').trim().toLowerCase();
  const dot = raw.lastIndexOf('.');
  return dot >= 0 ? raw.slice(dot) : '';
}

export function getAttachmentIconComponent(name = '', contentType = '') {
  const ext = getAttachmentExtension(name);
  const mime = String(contentType || '').toLowerCase();
  if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
    return ImageIcon;
  }
  if (['.xlsx', '.xls', '.csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return FileSpreadsheet;
  }
  return FileText;
}

export function isAttachmentInlinePreviewable(name = '', contentType = '') {
  const ext = getAttachmentExtension(name);
  const mime = String(contentType || '').toLowerCase();
  return ext === '.pdf'
    || ext === '.txt'
    || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)
    || mime === 'application/pdf'
    || mime.startsWith('image/')
    || mime.startsWith('text/plain');
}

export function openOrDownloadBlob(blob, fileName = 'tai-lieu-dinh-kem', { forceDownload = false, contentType = '' } = {}) {
  if (!(blob instanceof Blob)) return;
  const objectUrl = URL.createObjectURL(blob);
  const shouldOpenInline = !forceDownload && isAttachmentInlinePreviewable(fileName, contentType || blob.type);
  if (shouldOpenInline) {
    const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (popup) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
  }
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || 'tai-lieu-dinh-kem';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
