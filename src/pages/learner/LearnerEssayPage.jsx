import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import {
  deleteLearnerEssay,
  getLearnerEssay,
  getLearnerEssays,
  rescanLearnerEssay,
  scanLearnerEssay,
  updateLearnerEssay,
} from '../../api/learnerEssayApi.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function validateFile(file) {
  if (!file) return 'Vui lòng chọn ảnh bài viết.';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  if (file.size > MAX_SIZE) return 'Ảnh bài viết tối đa 10MB.';
  return '';
}

export default function LearnerEssayPage() {
  const { pathname } = useLocation();
  const inputRef = useRef(null);
  const [essays, setEssays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadEssays() {
    setLoading(true);
    try {
      setEssays(await getLearnerEssays());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The initial API load synchronizes this screen with the server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEssays();
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseFile(nextFile) {
    const validationError = validateFile(nextFile);
    setError(validationError);
    if (validationError) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function scan() {
    if (!file) {
      setError('Vui lòng chọn ảnh trước khi quét.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await scanLearnerEssay(file);
      setSelected(result);
      setText(result.contentText);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(result.imageUrl);
      await loadEssays();
      setNotice('Quét và lưu bài viết thành công. Bạn có thể chỉnh sửa nội dung rồi bấm Lưu thay đổi.');
    } catch (err) {
      setError(err.message || 'Quét văn bản thất bại.');
    } finally {
      setBusy(false);
    }
  }

  async function openEssay(id) {
    setBusy(true);
    setError('');
    try {
      const result = await getLearnerEssay(id);
      setSelected(result);
      setText(result.contentText);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(result.imageUrl);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveText() {
    if (!selected || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await updateLearnerEssay(selected.id, text);
      setSelected(result);
      setText(result.contentText);
      await loadEssays();
      setNotice('Đã lưu nội dung bài viết.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function rescan() {
    const validationError = validateFile(file);
    if (validationError || !selected) {
      setError(validationError || 'Vui lòng chọn ảnh mới.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await rescanLearnerEssay(selected.id, file);
      setSelected(result);
      setText(result.contentText);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(result.imageUrl);
      setFile(null);
      await loadEssays();
      setNotice('Đã quét lại. Nội dung OCR cũ đã được ghi đè.');
    } catch (err) {
      setError(err.message || 'Quét lại văn bản thất bại.');
    } finally {
      setBusy(false);
    }
  }

  async function removeEssay(id) {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này không?')) return;
    setBusy(true);
    setError('');
    try {
      await deleteLearnerEssay(id);
      if (selected?.id === id) {
        setSelected(null);
        setText('');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      await loadEssays();
      setNotice('Đã xóa bài viết.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb="Riki - Luyện Làm Văn">
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-6 py-8 text-on-surface">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-label-md uppercase tracking-[0.2em] text-primary">Riki</p>
            <h1 className="mt-2 font-headline-lg text-headline-lg font-bold">Luyện Làm Văn</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Tải ảnh bài viết tiếng Nhật để hệ thống nhận diện chữ, sau đó bạn có thể chỉnh sửa và lưu lại.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-label-md text-on-primary shadow-sm hover:opacity-90"
          >
            <span className="material-symbols-outlined">add_photo_alternate</span>
            Chọn ảnh mới
          </button>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
        </div>

        {error && <div className="mb-4 rounded-2xl bg-error-container px-4 py-3 text-on-error-container">{error}</div>}
        {notice && <div className="mb-4 rounded-2xl bg-secondary-container px-4 py-3 text-on-secondary-container">{notice}</div>}

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#eadfd9]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold">Bài đã quét</h2>
              <span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-primary">{essays.length}</span>
            </div>
            {loading ? <p className="text-body-sm text-on-surface-variant">Đang tải...</p> : essays.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Chưa có bài viết nào.</p>
            ) : (
              <div className="space-y-2">
                {essays.map((essay) => (
                  <div key={essay.id} className={`rounded-2xl p-3 ${selected?.id === essay.id ? 'bg-secondary-container/60' : 'bg-surface-container-low'}`}>
                    <button type="button" onClick={() => openEssay(essay.id)} className="w-full text-left">
                      <p className="line-clamp-2 font-label-md font-semibold">{essay.title}</p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">{formatDate(essay.scannedAt)}</p>
                    </button>
                    <button type="button" onClick={() => removeEssay(essay.id)} className="mt-2 text-label-sm text-error hover:underline">Xóa bài</button>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#eadfd9] sm:p-7">
            {selected ? (
              <>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-headline-md text-headline-md font-bold">{selected.title}</h2>
                    <p className="mt-1 text-label-sm text-on-surface-variant">Quét lúc {formatDate(selected.scannedAt)}</p>
                  </div>
                  <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full bg-surface-container px-4 py-2 text-label-md text-primary hover:bg-surface-container-high">Chọn ảnh để quét lại</button>
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <div>
                    <p className="mb-2 font-label-md font-semibold">Ảnh bài viết</p>
                    <img src={file ? previewUrl : selected.imageUrl} alt="Bài viết đã quét" className="max-h-[520px] w-full rounded-2xl object-contain bg-surface-container-low p-2" />
                    {file && <button type="button" onClick={rescan} disabled={busy} className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 font-label-md text-on-primary disabled:opacity-50">{busy ? 'Đang quét...' : 'Quét lại ảnh này'}</button>}
                  </div>
                  <div>
                    <label htmlFor="essay-content" className="mb-2 block font-label-md font-semibold">Nội dung OCR (có thể chỉnh sửa)</label>
                    <textarea id="essay-content" value={text} onChange={(event) => setText(event.target.value)} className="min-h-[360px] w-full rounded-2xl border border-[#eadfd9] bg-surface-container-low p-4 text-body-md leading-8 outline-none focus:border-primary" />
                    <button type="button" onClick={saveText} disabled={busy || !text.trim()} className="mt-3 rounded-xl bg-primary px-5 py-2.5 font-label-md text-on-primary disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#eadfd9] bg-surface-container-low p-8 text-center">
                <span className="material-symbols-outlined text-6xl text-primary">document_scanner</span>
                <h2 className="mt-4 font-headline-md text-headline-md font-bold">Chọn ảnh để bắt đầu</h2>
                <p className="mt-2 max-w-md text-body-md text-on-surface-variant">Hỗ trợ JPG, PNG, WEBP tối đa 10MB. Sau khi OCR thành công, bài viết sẽ được lưu tự động.</p>
                {file && <div className="mt-5 w-full max-w-sm"><img src={previewUrl} alt="Ảnh xem trước" className="max-h-56 w-full rounded-2xl object-contain bg-white p-2" /><button type="button" onClick={scan} disabled={busy} className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 font-label-md text-on-primary disabled:opacity-50">{busy ? 'Đang quét...' : 'Quét văn bản'}</button></div>}
              </div>
            )}
          </section>
        </div>
      </main>
    </LearnerShell>
  );
}
