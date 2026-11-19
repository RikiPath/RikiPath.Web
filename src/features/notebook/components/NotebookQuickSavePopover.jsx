import { useMemo, useState } from 'react';
import { BookMarked, Check, FolderPlus, Repeat, Sparkles, X } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { notify } from '@/components/ui/feedbackStore.js';
import {
  DEFAULT_FOLDER_NAME,
  groupNotePagesByFolder,
  HIGHLIGHT_COLORS,
  NOTEBOOK_CONTENT_KINDS,
  suggestKindForSelection,
} from '@/features/notebook/utils/notebookModel.js';
import { useOptionalSmartNotebook } from '@/features/notebook/context/SmartNotebookContext.jsx';

export default function NotebookQuickSavePopover({ request, onClose }) {
  const { tr } = useLocale();
  const nb = useOptionalSmartNotebook();

  const notePages = nb?.notePages || [];
  const folders = useMemo(() => groupNotePagesByFolder(notePages), [notePages]);

  const initialKind = request?.kind || suggestKindForSelection(request?.selectedText || '', request?.contextHint || '');
  const [kind, setKind] = useState(initialKind);
  const [term, setTerm] = useState(request?.selectedText || '');
  const [reading, setReading] = useState(request?.reading || '');
  const [meaning, setMeaning] = useState(request?.meaning || '');
  const [example, setExample] = useState(request?.example || '');
  const [personalNote, setPersonalNote] = useState(request?.personalNote || '');
  const [color, setColor] = useState(request?.color || 'rose');
  const [tagsInput, setTagsInput] = useState('');
  const [enrollSrs, setEnrollSrs] = useState(initialKind === 'vocabulary');

  const defaultPage = notePages[0] || null;
  const [selectedFolder, setSelectedFolder] = useState(defaultPage?.folder || DEFAULT_FOLDER_NAME);
  const pagesInFolder = useMemo(
    () => (folders.find((f) => f.name === selectedFolder)?.pages || notePages),
    [folders, selectedFolder, notePages]
  );

  const [targetNoteId, setTargetNoteId] = useState(defaultPage?.id ? String(defaultPage.id) : '__new__');
  const [newFolderName, setNewFolderName] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  if (!request || !nb) return null;

  const isCreatingNewPage = targetNoteId === '__new__' || pagesInFolder.length === 0 || Boolean(creatingFolder && newFolderName.trim());

  async function handleSave(e) {
    e.preventDefault();
    if (!term.trim() || nb.quickSaveCapture.isPending) return;

    const effectiveFolder = creatingFolder && newFolderName.trim()
      ? newFolderName.trim()
      : selectedFolder || DEFAULT_FOLDER_NAME;

    try {
      await nb.quickSaveCapture.mutateAsync({
        targetNoteId: isCreatingNewPage ? null : Number(targetNoteId),
        newNoteTitle: isCreatingNewPage ? (newNoteTitle.trim() || 'Ghi chú bài học') : '',
        folderName: effectiveFolder,
        kind,
        term: term.trim(),
        reading: reading.trim(),
        meaning: meaning.trim(),
        personalNote: personalNote.trim(),
        example: example.trim(),
        color,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        sourcePath: request.sourcePath || nb.currentUrlKey || '',
        sourceTitle: request.sourceTitle || document.title?.replace(/\s*\|\s*RikiPath.*$/, '') || 'Bài học hiện tại',
        contentId: request.contentId || '',
        contentTextForVersion: request.contentTextForVersion || '',
        anchorPrefix: request.anchorPrefix || '',
        anchorSuffix: request.anchorSuffix || '',
        vocabularyId: request.vocabularyId || null,
        kanjiId: request.kanjiId || null,
        grammarPatternId: request.grammarPatternId || null,
        enrollSrs,
      });

      notify.success(tr('Đã lưu vào Sổ tay'), '', { key: 'nb-quick-save-ok' });
      onClose?.();
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được vào Sổ tay'), { key: 'nb-quick-save-err' });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr('Lưu nhanh vào Sổ tay')}
      data-notebook-ignore="true"
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#2D282A]/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <form
        onSubmit={handleSave}
        className="rp-anim-pop w-full max-w-[460px] overflow-hidden rounded-2xl border border-rp-brand-border bg-white shadow-[0_24px_60px_-15px_rgba(181,61,92,0.28)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-rp-line bg-[#FFF5F7] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BookMarked className="h-4 w-4 shrink-0 text-rp-brand-strong" />
            <h2 className="truncate text-[14.5px] font-bold text-rp-text">{tr('Lưu vào Sổ tay thông minh')}</h2>
          </div>
          <button
            type="button"
            aria-label={tr('Đóng')}
            onClick={onClose}
            className="rounded-lg p-1 text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-3.5 overflow-y-auto px-4 py-3.5 text-[13px]">
          {/* Source pill */}
          {request.sourceTitle && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-1.5 text-[11.5px] text-rp-text-2">
              <span className="truncate font-medium">
                {tr('Nguồn')}: <strong className="text-rp-text">{request.sourceTitle}</strong>
              </span>
              <span className="shrink-0 rounded-full bg-rp-brand-tint px-2 py-0.5 text-[10.5px] font-semibold text-rp-brand-strong">
                {tr('Giữ nguyên vị trí học')}
              </span>
            </div>
          )}

          {/* Kind pills */}
          <div className="flex flex-wrap gap-1.5">
            {NOTEBOOK_CONTENT_KINDS.filter((k) => k.id !== 'all').map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setKind(k.id);
                  if (k.id === 'vocabulary' || k.id === 'kanji') setEnrollSrs(true);
                  else if (k.id === 'highlight' || k.id === 'note') setEnrollSrs(false);
                }}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                  kind === k.id
                    ? 'bg-rp-brand-pressed text-white shadow-2xs'
                    : 'border border-rp-line bg-white text-rp-text-2 hover:bg-rp-brand-tint'
                }`}
              >
                {tr(k.label)}
              </button>
            ))}
          </div>

          {/* Selected term */}
          <label className="block">
            <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Nội dung / Từ đã chọn')} *</span>
            <input
              required
              maxLength={200}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="mt-1 h-9.5 w-full rounded-xl border border-rp-line bg-white px-3 text-[13.5px] font-semibold text-rp-text"
            />
          </label>

          {/* Highlight color selector */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Màu đánh dấu')}</span>
            <div className="flex items-center gap-2">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={tr(c.label)}
                  onClick={() => setColor(c.id)}
                  style={{ backgroundColor: c.markBg, borderColor: c.markBorder }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-transform ${
                    color === c.id ? 'scale-110 ring-2 ring-rp-brand-pressed ring-offset-1' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  {color === c.id && <Check className="h-3 w-3 text-rp-text" />}
                </button>
              ))}
            </div>
          </div>

          {/* Reading & Meaning */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Cách đọc (Furigana / Romaji)')}</span>
              <input
                maxLength={200}
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder={tr('Tùy chọn')}
                className="mt-1 h-9 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Nghĩa ngắn')}</span>
              <input
                maxLength={500}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder={tr('Nhập nghĩa (nếu có)')}
                className="mt-1 h-9 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px]"
              />
            </label>
          </div>

          {/* Folder -> Note Page */}
          <div className="rounded-xl border border-rp-line bg-[#FCFAFB] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-rp-text-muted">
                {tr('Thư mục & Trang ghi chú')}
              </span>
              <button
                type="button"
                onClick={() => setCreatingFolder((v) => !v)}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rp-brand-strong hover:underline"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                {creatingFolder ? tr('Chọn thư mục có sẵn') : tr('+ Thư mục mới')}
              </button>
            </div>

            {creatingFolder ? (
              <input
                maxLength={80}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={tr('Tên thư mục mới (VD: JLPT N4)')}
                className="h-9 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px]"
              />
            ) : (
              <select
                value={selectedFolder}
                onChange={(e) => {
                  const nextF = e.target.value;
                  setSelectedFolder(nextF);
                  const first = folders.find((f) => f.name === nextF)?.pages?.[0];
                  setTargetNoteId(first?.id ? String(first.id) : '__new__');
                }}
                className="h-9 w-full rounded-xl border border-rp-line bg-white px-2.5 text-[13px]"
              >
                {folders.map((f) => (
                  <option key={f.name} value={f.name}>
                    {tr(f.name)} ({f.pages.length} {tr('trang')})
                  </option>
                ))}
              </select>
            )}

            <select
              value={isCreatingNewPage ? '__new__' : targetNoteId}
              onChange={(e) => setTargetNoteId(e.target.value)}
              className="h-9 w-full rounded-xl border border-rp-line bg-white px-2.5 text-[13px]"
            >
              {!creatingFolder && pagesInFolder.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.title} ({p.entryCount})
                </option>
              ))}
              <option value="__new__">{tr('+ Tạo trang ghi chú mới')}</option>
            </select>

            {isCreatingNewPage && (
              <input
                maxLength={120}
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder={tr('Tên trang mới (VD: Từ mới bài 3)')}
                className="h-9 w-full rounded-xl border border-rp-brand-border bg-white px-3 text-[13px]"
              />
            )}
          </div>

          {/* Example + Personal note */}
          <label className="block">
            <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Ví dụ / Ngữ cảnh')}</span>
            <input
              maxLength={400}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder={tr('Câu ví dụ kèm theo (tùy chọn)')}
              className="mt-1 h-9 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px]"
            />
          </label>

          <label className="block">
            <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Ghi chú cá nhân')}</span>
            <textarea
              rows={2}
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder={tr('Mẹo nhớ, lưu ý ngữ pháp hoặc câu hỏi...')}
              className="mt-1 w-full rounded-xl border border-rp-line bg-white px-3 py-2 text-[13px]"
            />
          </label>

          <label className="block">
            <span className="text-[11.5px] font-semibold text-rp-text-2">{tr('Thẻ (phân cách bằng dấu phẩy)')}</span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="N4, Động từ, Nghe hiểu"
              className="mt-1 h-9 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px]"
            />
          </label>

          {/* SRS opt-in */}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={enrollSrs}
              onChange={(e) => setEnrollSrs(e.target.checked)}
              className="accent-rp-brand-pressed"
            />
            <Repeat className="h-3.5 w-3.5 text-rp-brand-strong" />
            <span className="font-medium text-rp-text">{tr('Thêm vào hàng chờ ôn tập SRS')}</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-rp-line bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
          >
            {tr('Hủy')}
          </button>
          <button
            type="submit"
            disabled={!term.trim() || nb.quickSaveCapture.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white shadow-2xs hover:bg-rp-brand-strong disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{nb.quickSaveCapture.isPending ? tr('Đang lưu…') : tr('Lưu vào Sổ tay')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
