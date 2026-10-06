import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import RomajiJapaneseInput from '../../components/essay/RomajiJapaneseInput.jsx';
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
  const [dragging, setDragging] = useState(false);

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

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
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

  const previewSrc = file ? previewUrl : selected?.imageUrl;

  return (
    <LearnerShell pathname={pathname} breadcrumb="Riki - Luyện Làm Văn">
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-6 text-on-surface sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-label-md uppercase tracking-[0.2em] text-primary">Riki</p>
            <h1 className="mt-1 font-headline-lg text-headline-lg font-bold">Luyện Làm Văn</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Chọn ảnh, quét chữ tiếng Nhật, rồi sửa nội dung ngay bên dưới.
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

        <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#eadfd9] lg:sticky lg:top-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold">Bài đã quét</h2>
              <span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-primary">{essays.length}</span>
            </div>
            {loading ? <p className="text-body-sm text-on-surface-variant">Đang tải...</p> : essays.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                {error ? 'Chưa tải được danh sách.' : 'Chưa có bài viết nào.'}
              </p>
            ) : (
              <div className="space-y-2">
                {essays.map((essay) => (
                  <div key={essay.id} className={`flex items-start gap-2 rounded-2xl p-3 ${selected?.id === essay.id ? 'bg-secondary-container/70 ring-1 ring-primary/20' : 'bg-surface-container-low'}`}>
                    <button type="button" onClick={() => openEssay(essay.id)} className="min-w-0 flex-1 text-left">
                      <p className="line-clamp-2 font-label-md font-semibold">{essay.title}</p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">{formatDate(essay.scannedAt)}</p>
                    </button>
                    <button type="button" onClick={() => removeEssay(essay.id)} aria-label={`Xóa ${essay.title}`} className="rounded-full p-1 text-error hover:bg-error-container">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#eadfd9]">
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-b border-[#eadfd9] px-5 py-5 sm:px-6 ${dragging ? 'bg-primary-light' : 'bg-surface-container-low'}`}
            >
              {previewSrc ? (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-center">
                  <img src={previewSrc} alt="Ảnh bài viết" className="max-h-52 w-full rounded-2xl bg-white object-contain p-2 ring-1 ring-[#eadfd9]" />
                  <div className="min-w-0">
                    <h2 className="font-headline-sm text-headline-sm font-bold">{selected?.title || file?.name || 'Ảnh đã chọn'}</h2>
                    <p className="mt-1 text-label-sm text-on-surface-variant">
                      {selected ? `Quét lúc ${formatDate(selected.scannedAt)}` : 'Ảnh chưa được quét. Bấm quét để nhận diện chữ.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {file && (
                        <button type="button" onClick={selected ? rescan : scan} disabled={busy} className="rounded-full bg-primary px-4 py-2 font-label-md text-on-primary disabled:opacity-50">
                          {busy ? 'Đang quét...' : selected ? 'Quét lại ảnh này' : 'Quét văn bản'}
                        </button>
                      )}
                      {selected && (
                        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full bg-white px-4 py-2 font-label-md text-primary ring-1 ring-[#eadfd9]">
                          Đổi ảnh
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-primary ring-1 ring-[#eadfd9]">
                    <span className="material-symbols-outlined text-3xl">document_scanner</span>
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-headline-sm text-headline-sm font-bold">Kéo ảnh vào đây hoặc chọn từ máy</h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">JPG, PNG, WEBP, tối đa 10MB. Sau khi quét, bài được lưu và hiện ở cột bên trái.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <RomajiJapaneseInput value={text} onChange={setText} disabled={busy} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-label-sm text-on-surface-variant">
                  Gõ Romaji rồi nhấn Space để chọn từ, hoặc dùng micro để nói tiếng Nhật.
                </p>
                <button type="button" onClick={saveText} disabled={busy || !selected || !text.trim()} className="rounded-full bg-primary px-5 py-2.5 font-label-md text-on-primary disabled:opacity-50">
                  {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </LearnerShell>
  );
}
