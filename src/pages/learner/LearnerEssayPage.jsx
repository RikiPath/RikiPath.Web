import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
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

const BUTTON_CLASS =
  'inline-flex min-h-9 items-center justify-center gap-1.5 ' +
  'rounded-lg border border-[#E7D7DF] bg-white px-3 py-2 ' +
  'text-[12px] text-[#9C6B80] transition hover:bg-[#FCF3F7] ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

const PRIMARY_CLASS =
  'inline-flex min-h-9 items-center justify-center gap-1.5 ' +
  'rounded-lg bg-[#AD3155] px-4 py-2 text-[12px] font-medium ' +
  'text-white transition hover:bg-[#982B4B] ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function validateFile(file) {
  if (!file) return 'Vui lòng chọn ảnh bài viết.';
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  }
  if (file.size > MAX_SIZE) return 'Ảnh tối đa 10MB.';
  return '';
}

export default function LearnerEssayPage() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const inputRef = useRef(null);

  const [essays, setEssays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [text, setText] = useState('');

  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState('');
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);

  const busy = Boolean(operation);
  const scanning = operation === 'scan' || operation === 'rescan';
  const previewSrc = file ? previewUrl : selected?.imageUrl;
  const changed = Boolean(
    selected && text !== (selected.contentText || ''),
  );

  const loadEssays = useCallback(async () => {
    setLoading(true);
    setListError('');

    try {
      const result = await getLearnerEssays();

      if (!Array.isArray(result)) {
        throw new Error(tr("Danh sách bài viết chưa đúng định dạng."));
      }

      setEssays(result);
    } catch (err) {
      setListError(err.message || tr("Không tải được danh sách."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEssays();
  }, [loadEssays]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearMessages() {
    setError('');
    setNotice('');
  }

  function confirmDiscard() {
    return (
      !changed ||
      window.confirm(tr("Bài viết có thay đổi chưa lưu. Bạn muốn tiếp tục?"))
    );
  }

  function newEssay() {
    if (busy || !confirmDiscard()) return;

    setSelected(null);
    setFile(null);
    setPreviewUrl('');
    setText('');
    clearMessages();

    if (inputRef.current) inputRef.current.value = '';
  }

  function chooseFile(nextFile) {
    if (busy || !nextFile) return;

    const validationError = validateFile(nextFile);
    if (validationError) {
      setError(tr(validationError));
      return;
    }

    clearMessages();
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!busy) chooseFile(event.dataTransfer.files?.[0]);
  }

  async function openEssay(id) {
    if (busy || !confirmDiscard()) return;

    setOperation('open');
    clearMessages();

    try {
      const result = await getLearnerEssay(id);

      setSelected(result);
      setText(result.contentText || '');
      setFile(null);
      setPreviewUrl('');
    } catch (err) {
      setError(err.message || tr("Không mở được bài viết."));
    } finally {
      setOperation('');
    }
  }

  async function scanImage() {
    if (busy) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(tr(validationError));
      return;
    }

    if (
      (changed || (!selected && text.trim())) &&
      !window.confirm(tr("Nhận dạng ảnh sẽ thay thế nội dung đang nhập. Tiếp tục?"))
    ) {
      return;
    }

    clearMessages();
    setOperation(selected ? 'rescan' : 'scan');

    try {
      if (selected) {
        const result = await rescanLearnerEssay(selected.id, file);

        setSelected(result);
        setText(result.contentText ?? result.text ?? '');
        setFile(null);
        setPreviewUrl('');
        setNotice(tr("Đã nhận dạng lại. Bạn hãy kiểm tra nội dung."));
      } else {
        const result = await scanLearnerEssay(file);
        const content = result.contentText ?? result.text ?? '';

        setText(content);

        // Chỉ coi là bản ghi có thể cập nhật khi API trả về ID.
        if (result.id != null) {
          setSelected({
            ...result,
            contentText: content,
          });

          if (result.imageUrl) {
            setFile(null);
            setPreviewUrl('');
          }

          setNotice(tr("Đã nhận dạng văn bản. Bạn có thể chỉnh sửa nội dung."));
        } else {
          setNotice(
            tr("Đã nhận dạng văn bản. API chưa trả mã bài viết để lưu chỉnh sửa."),
          );
        }
      }

      await loadEssays();
    } catch (err) {
      setError(err.message || tr("Không thể nhận dạng văn bản."));
    } finally {
      setOperation('');
    }
  }

  async function saveText() {
    if (busy || !selected || !text.trim() || !changed) return;

    setOperation('save');
    clearMessages();

    try {
      const result = await updateLearnerEssay(selected.id, text);

      setSelected(result);
      setText(result.contentText ?? text);
      setNotice(tr("Đã lưu thay đổi."));
      await loadEssays();
    } catch (err) {
      setError(err.message || tr("Không lưu được bài viết."));
    } finally {
      setOperation('');
    }
  }

  async function removeEssay(essay) {
    if (
      busy ||
      !window.confirm(`Xóa "${essay.title || 'bài viết này'}"?`)
    ) {
      return;
    }

    setOperation('delete');
    clearMessages();

    try {
      await deleteLearnerEssay(essay.id);

      if (selected?.id === essay.id) {
        setSelected(null);
        setText('');
        setFile(null);
        setPreviewUrl('');
      }

      setNotice(tr("Đã xóa bài viết."));
      await loadEssays();
    } catch (err) {
      setError(err.message || tr("Không xóa được bài viết."));
    } finally {
      setOperation('');
    }
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Luyện viết")}>
      <main
        className="mx-auto max-w-[1320px] px-5 py-6
                   text-[#49353F] lg:px-7"
      >
        <header
          className="mb-5 flex flex-wrap items-center
                     justify-between gap-3"
        >
          <div>
            <h1
              className="text-[25px] font-semibold
                         leading-tight tracking-tight"
            >{tr('Luyện viết tiếng Nhật')}</h1>
            <p className="mt-1.5 text-[13px] text-[#967F8A]">{tr('Tải ảnh bài viết, nhận dạng chữ và chỉnh sửa nội dung.')}</p>
          </div>

          <button
            type="button"
            onClick={newEssay}
            disabled={busy}
            className={BUTTON_CLASS}
          >
            <Icon name="add" className="text-[18px]" />{tr('Bài mới')}</button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2
                       rounded-lg bg-[#FFF0F3] px-4 py-3
                       text-[12px] leading-5 text-[#A15A70]"
          >
            <Icon
              name="error_outline"
              className="mt-0.5 shrink-0 text-[16px]"
            />
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-start justify-between
                       gap-3 rounded-lg bg-[#F7F0F4]
                       px-4 py-3 text-[12px] leading-5 text-[#987385]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label={tr("Đóng thông báo")}
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          hidden
          type="file"
          disabled={busy}
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <div
          className="grid items-start gap-4
                     lg:grid-cols-[220px_minmax(0,1fr)]"
        >
          {/* Lịch sử */}
          <aside
            className="overflow-hidden rounded-xl border
                       border-[#EADFE5] bg-white
                       lg:sticky lg:top-[84px]"
          >
            <header
              className="flex items-center justify-between
                         border-b border-[#F0E7EC] px-4 py-3"
            >
              <h2 className="text-[13px] font-medium">{tr('Bài viết của tôi')}<span className="ml-2 text-[11px] text-[#B08E9E]">
                  {loading ? '…' : essays.length}
                </span>
              </h2>

              <button
                type="button"
                onClick={loadEssays}
                disabled={loading || busy}
                aria-label={tr("Tải lại danh sách")}
                className="rounded p-1 text-[#B08E9E]
                           hover:bg-[#FCF2F6] disabled:opacity-40"
              >
                <Icon
                  name="refresh"
                  className={`text-[17px] ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </header>

            {loading ? (
              <p className="px-4 py-6 text-[12px] text-[#A08A95]">{tr("Đang tải…")}</p>
            ) : listError ? (
              <div className="px-4 py-5">
                <p role="alert" className="text-[12px] leading-5 text-[#A15A70]">
                  {listError}
                </p>
                <button
                  type="button"
                  onClick={loadEssays}
                  disabled={busy}
                  className="mt-2 text-[12px] text-[#AD3155] underline"
                >{tr("Thử lại")}</button>
              </div>
            ) : essays.length === 0 ? (
              <div className="px-4 py-6">
                <Icon
                  name="description"
                  className="text-[25px] text-[#CBB2BE]"
                />
                <p className="mt-2 text-[12px] text-[#967F8A]">{tr('Chưa có bài viết.')}</p>
                <p className="mt-1 text-[11px] leading-5 text-[#B09AA5]">{tr('Bắt đầu bằng cách tải ảnh bài viết của bạn.')}</p>
              </div>
            ) : (
              <ul className="max-h-[65vh] divide-y divide-[#F5EDF1] overflow-y-auto">
                {essays.map((essay) => (
                  <li
                    key={essay.id}
                    className={`flex items-start gap-1 px-3 py-3 ${
                      selected?.id === essay.id
                        ? 'bg-[#FCEEF4]'
                        : 'hover:bg-[#FFFAFC]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openEssay(essay.id)}
                      disabled={busy}
                      className="min-w-0 flex-1 text-left disabled:opacity-50"
                    >
                      <span className="block truncate text-[12px] font-medium">
                        {essay.title || tr("Bài viết tiếng Nhật")}
                      </span>
                      <span className="mt-1 block text-[10px] text-[#AD95A1]">
                        {formatDate(essay.scannedAt)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeEssay(essay)}
                      disabled={busy}
                      aria-label={`Xóa ${essay.title || 'bài viết'}`}
                      className="rounded p-1 text-[#C09BAA]
                                 hover:bg-[#F8E4EC]
                                 hover:text-[#AD3155]
                                 disabled:opacity-40"
                    >
                      <Icon name="delete_outline" className="text-[16px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Không gian làm bài */}
          <section
            aria-label={tr("Biên tập bài viết")}
            className="min-w-0 overflow-hidden rounded-2xl
                       border border-[#EADFE5] bg-white"
          >
            <header
              className="flex flex-wrap items-center justify-between
                         gap-2 border-b border-[#F0E7EC] px-5 py-3.5"
            >
              <h2 className="min-w-0 break-words text-[14px] font-medium">
                {selected?.title || tr("Bài viết mới")}
              </h2>
              <span className="text-[11px] text-[#AE95A1]">
                {changed ? tr("Có thay đổi chưa lưu") : tr("Ảnh → Văn bản → Chỉnh sửa")}
              </span>
            </header>

            <div
              className="grid items-start
                         xl:grid-cols-[260px_minmax(0,1fr)]"
            >
              {/* Ảnh gốc */}
              <div
                className="border-b border-[#F0E7EC]
                           bg-[#FFFBFD] p-4
                           xl:border-b-0 xl:border-r"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-[#947584]">{tr('Ảnh bài viết')}</h3>
                  {previewSrc && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => inputRef.current?.click()}
                      className="text-[11px] text-[#B2748D]
                                 hover:text-[#AD3155] disabled:opacity-40"
                    >{tr('Đổi ảnh')}</button>
                  )}
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!busy) setDragging(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setDragging(false);
                    }
                  }}
                  onDrop={handleDrop}
                  className={[
                    'relative overflow-hidden rounded-xl border',
                    dragging
                      ? 'border-[#C87C99] bg-[#FBEAF1]'
                      : 'border-[#EBDDE5] bg-white',
                  ].join(' ')}
                >
                  {previewSrc ? (
                    <div className="relative p-2">
                      <img
                        src={previewSrc}
                        alt={tr("Ảnh gốc của bài viết tiếng Nhật")}
                        className="max-h-[350px] w-full object-contain"
                      />

                      {scanning && (
                        <div
                          className="absolute inset-0 flex items-center
                                     justify-center bg-white/80"
                        >
                          <span
                            role="status"
                            className="inline-flex items-center gap-2
                                       text-[12px] text-[#AD627F]"
                          >
                            <Icon
                              name="progress_activity"
                              className="animate-spin text-[19px]"
                            />{tr('Đang nhận dạng…')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={busy}
                      className="flex min-h-[190px] w-full
                                 flex-col items-center justify-center
                                 px-4 py-6 text-center
                                 hover:bg-[#FFF8FB]
                                 disabled:opacity-50"
                    >
                      <span
                        className="flex h-11 w-11 items-center justify-center
                                   rounded-xl bg-[#FAEAF1] text-[#BB8199]"
                      >
                        <Icon name="add_photo_alternate" className="text-[25px]" />
                      </span>
                      <span className="mt-3 text-[13px] font-medium">{tr('Chọn ảnh bài viết')}</span>
                      <span className="mt-1 text-[11px] text-[#AE95A1]">{tr('hoặc kéo ảnh vào đây')}</span>
                    </button>
                  )}
                </div>

                <p className="mt-2 text-[10px] leading-5 text-[#AF98A3]">{tr('JPG, PNG, WEBP · Tối đa 10MB')}</p>

                {file && (
                  <>
                    <p
                      title={file.name}
                      className="mt-2 truncate text-[11px] text-[#A0808E]"
                    >
                      {file.name}
                    </p>
                    <button
                      type="button"
                      onClick={scanImage}
                      disabled={busy}
                      className={`${PRIMARY_CLASS} mt-3 w-full`}
                    >
                      <Icon
                        name={scanning ? 'progress_activity' : 'document_scanner'}
                        className={`text-[17px] ${
                          scanning ? 'animate-spin' : ''
                        }`}
                      />
                      {scanning
                        ? tr("Đang nhận dạng…")
                        : selected
                          ? tr("Nhận dạng lại")
                          : tr("Nhận dạng chữ")}
                    </button>
                  </>
                )}

                <p className="mt-4 text-[11px] leading-5 text-[#AE95A1]">{tr('Chụp rõ chữ, đủ sáng và giữ ảnh ngay ngắn.')}</p>
              </div>

              {/* Nội dung */}
              <div className="min-w-0 p-4 sm:p-5">
                {operation === 'open' ? (
                  <div
                    role="status"
                    className="flex min-h-[260px] items-center
                               justify-center gap-2 text-[13px] text-[#A0808E]"
                  >
                    <Icon
                      name="progress_activity"
                      className="animate-spin text-[19px]"
                    />{tr('Đang mở bài viết…')}</div>
                ) : (
                  <RomajiJapaneseInput
                    value={text}
                    onChange={setText}
                    disabled={busy}
                  />
                )}

                <div
                  className="mt-4 flex flex-wrap items-center justify-between
                             gap-3 border-t border-[#F0E7EC] pt-4"
                >
                  <p className="text-[11px] leading-5 text-[#AE95A1]">{tr('Kiểm tra lại chữ được nhận dạng trước khi lưu.')}</p>

                  <button
                    type="button"
                    onClick={saveText}
                    disabled={busy || !selected || !text.trim() || !changed}
                    className={PRIMARY_CLASS}
                  >
                    <Icon
                      name={operation === 'save' ? 'progress_activity' : 'check'}
                      className={`text-[16px] ${
                        operation === 'save' ? 'animate-spin' : ''
                      }`}
                    />
                    {operation === 'save' ? tr("Đang lưu…") : tr("Lưu thay đổi")}
                  </button>
                </div>

                {!selected && text.trim() && (
                  <p className="mt-3 text-[11px] leading-5 text-[#AA8495]">
                    {tr('Chưa có mã bài viết để lưu. Nếu bài đã xuất hiện trong lịch sử, hãy mở bài đó để chỉnh sửa.')}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </LearnerShell>
  );
}
