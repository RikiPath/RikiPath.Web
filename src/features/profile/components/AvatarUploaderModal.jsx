import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload, ZoomIn } from 'lucide-react';
import { AlertDialog, Button, Modal, UserAvatar, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { deleteAvatar, updateAvatar } from '../api/profileApi.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const EXPORT_SIZE = 512;

async function renderCroppedBlob(imageEl, zoom, offsetX, offsetY) {
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const iw = imageEl.naturalWidth || imageEl.width;
  const ih = imageEl.naturalHeight || imageEl.height;
  if (!iw || !ih) return null;

  const baseScale = Math.max(EXPORT_SIZE / iw, EXPORT_SIZE / ih);
  const scale = baseScale * zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const maxShiftX = Math.max(0, (drawW - EXPORT_SIZE) / 2);
  const maxShiftY = Math.max(0, (drawH - EXPORT_SIZE) / 2);

  const dx = (EXPORT_SIZE - drawW) / 2 - (offsetX / 100) * maxShiftX;
  const dy = (EXPORT_SIZE - drawH) / 2 - (offsetY / 100) * maxShiftY;

  ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
  ctx.drawImage(imageEl, dx, dy, drawW, drawH);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

export default function AvatarUploaderModal({
  open,
  onClose,
  profile,
  onAvatarUpdated,
}) {
  const { tr } = useLocale();
  const inputRef = useRef(null);
  const previewImgRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fullName = profile?.fullName || profile?.email || 'User';

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function resetSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setError('');
  }

  function handleClose() {
    if (busy) return;
    resetSelection();
    onClose();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      const msg = tr('Chỉ hỗ trợ ảnh định dạng JPEG, PNG hoặc WebP.');
      setError(msg);
      notify.error(msg, '', { key: 'avatar-validate-err' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      const msg = tr('Dung lượng ảnh tối đa là 5 MB.');
      setError(msg);
      notify.error(msg, '', { key: 'avatar-validate-err' });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  async function handleSave() {
    if (!selectedFile || busy) return;
    setBusy(true);
    setError('');
    notify.loading(tr('Đang tải ảnh đại diện lên...'), '', { key: 'avatar-upload-ok', maxWaitMs: 30000 });
    try {
      let uploadFile = selectedFile;
      if (previewImgRef.current && (zoom !== 1 || offsetX !== 0 || offsetY !== 0)) {
        const blob = await renderCroppedBlob(previewImgRef.current, zoom, offsetX, offsetY);
        if (blob) {
          uploadFile = new File([blob], 'avatar.png', { type: 'image/png' });
        }
      }
      const updated = await updateAvatar(uploadFile);
      onAvatarUpdated?.(updated);
      notify.success(tr('Đã cập nhật ảnh đại diện.'), '', { key: 'avatar-upload-ok', replace: true });
      resetSelection();
      onClose();
    } catch (err) {
      const msg = err?.message || tr('Không thể tải ảnh đại diện lúc này.');
      setError(msg);
      notify.apiError(err, tr('Tải ảnh đại diện thất bại'), { key: 'avatar-upload-ok', replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    setBusy(true);
    setError('');
    try {
      const updated = await deleteAvatar();
      onAvatarUpdated?.(updated);
      notify.success(tr('Đã gỡ ảnh đại diện.'), '', { key: 'avatar-delete-ok' });
      setConfirmDeleteOpen(false);
      resetSelection();
      onClose();
    } catch (err) {
      const msg = err?.message || tr('Không thể xóa ảnh đại diện.');
      setError(msg);
      notify.apiError(err, tr('Gỡ ảnh đại diện thất bại'), { key: 'avatar-delete-err' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        dismissible={!busy}
        size="sm"
        title="Ảnh đại diện"
        description="Hỗ trợ ảnh JPEG, PNG hoặc WebP tối đa 5 MB. Kéo thanh căn chỉnh để chọn khung hình đẹp nhất."
        footer={(
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {profile?.avatarUrl ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={busy}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                {tr('Gỡ ảnh hiện tại')}
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={handleClose}>
                {tr('Hủy')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Upload}
                loading={busy}
                disabled={!selectedFile}
                onClick={handleSave}
              >
                {tr('Lưu ảnh')}
              </Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAE3E4] bg-[#FAF7F8] p-5">
            {previewUrl ? (
              <div className="relative h-36 w-36 overflow-hidden rounded-full border-2 border-rp-brand-border bg-white shadow-rp-xs">
                <img
                  ref={previewImgRef}
                  src={previewUrl}
                  alt={tr('Xem trước ảnh đại diện')}
                  className="h-full w-full select-none object-cover transition-transform duration-100"
                  style={{
                    transform: `translate(${-offsetX * 0.25}%, ${-offsetY * 0.25}%) scale(${zoom})`,
                  }}
                />
              </div>
            ) : (
              <UserAvatar src={profile?.avatarUrl} name={fullName} size={112} eager className="ring-2 ring-white shadow-rp-xs" />
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={ImagePlus}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {selectedFile ? tr('Chọn ảnh khác') : tr('Chọn ảnh từ thiết bị')}
              </Button>
              {selectedFile && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={resetSelection}
                  className="rp-focus rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-rp-text-muted hover:bg-white hover:text-rp-text"
                >
                  {tr('Bỏ chọn')}
                </button>
              )}
            </div>
          </div>

          {previewUrl && (
            <div className="space-y-3 rounded-xl border border-[#EAE3E4] bg-white p-3.5 text-[12px]">
              <label className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-rp-text-2">
                  <ZoomIn aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                  {tr('Thu phóng')} ({zoom.toFixed(1)}x)
                </span>
                <input
                  type="range"
                  min="1"
                  max="2.4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-40 accent-rp-brand-strong"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-medium text-rp-text-2">{tr('Căn ngang')}</span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={offsetX}
                  disabled={zoom <= 1.02}
                  onChange={(e) => setOffsetX(Number(e.target.value))}
                  className="w-40 accent-rp-brand-strong disabled:opacity-40"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-medium text-rp-text-2">{tr('Căn dọc')}</span>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={offsetY}
                  disabled={zoom <= 1.02}
                  onChange={(e) => setOffsetY(Number(e.target.value))}
                  className="w-40 accent-rp-brand-strong disabled:opacity-40"
                />
              </label>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <AlertDialog
        open={confirmDeleteOpen}
        onCancel={() => !busy && setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirmed}
        busy={busy}
        tone="danger"
        title="Gỡ ảnh đại diện?"
        description="Hệ thống sẽ trở về hiển thị chữ cái viết tắt tên của bạn ở thanh điều hướng và hồ sơ."
        confirmLabel="Gỡ ảnh"
        cancelLabel="Giữ lại"
      />
    </>
  );
}
