import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  FilePenLine,
  MapPin,
  Repeat,
  Save,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import CascadingLocationPicker from './CascadingLocationPicker.jsx';
import {
  Badge,
  Button,
  Drawer,
  Field,
  Input,
  Textarea,
  confirmAction,
  notify,
} from '@/components/ui';
import {
  HIGHLIGHT_COLORS,
  getEntryKindLabel,
} from '@/features/notebook/utils/notebookModel.js';

function speakJapanese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function SavedItemDrawerContent({
  item,
  allPages,
  folders,
  busy,
  enrolling,
  onClose,
  onOpenPage,
  onUpdateItem,
  onMoveItem,
  onEnrollSrs,
}) {
  const { tr } = useLocale();
  const isBankLinked = Boolean(item.vocabularyId || item.kanjiId);

  const [word, setWord] = useState(item.term || '');
  const [reading, setReading] = useState(item.reading || '');
  const [meaning, setMeaning] = useState(item.meaning || '');
  const [note, setNote] = useState(item.personalNote || item.note || '');
  const [exampleSentence, setExampleSentence] = useState(item.exampleSentence || '');
  const [highlightColor, setHighlightColor] = useState(item.highlightColor || '');
  const [targetPageId, setTargetPageId] = useState(item.notebookPageId ? String(item.notebookPageId) : '');
  const [errors, setErrors] = useState({});


  async function handleSave(e) {
    e.preventDefault();
    if (busy) return;

    const nextErrors = {};
    if (!isBankLinked) {
      if (!word.trim()) nextErrors.word = tr('Vui lòng nhập từ hoặc nội dung chính.');
      if (!meaning.trim()) nextErrors.meaning = tr('Vui lòng nhập nghĩa hoặc giải thích.');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      await onUpdateItem({
        noteEntryId: item.noteEntryId,
        notebookPageId: targetPageId ? Number(targetPageId) : item.notebookPageId,
        word: isBankLinked ? null : word.trim(),
        reading: isBankLinked ? null : reading.trim(),
        meaning: isBankLinked ? null : meaning.trim(),
        note: note.trim(),
        exampleSentence: exampleSentence.trim(),
        highlightColor: highlightColor || null,
        expectedRevision: item.revision,
      });
      notify.success(tr('Đã lưu thay đổi mục ghi chú'), '', { key: 'nb-item-saved' });
      onClose?.();
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được thay đổi'));
    }
  }

  async function handleMove(nextPageIdStr) {
    setTargetPageId(nextPageIdStr);
    const nextPid = Number(nextPageIdStr);
    if (!nextPid || nextPid === item.notebookPageId || busy) return;
    try {
      await onMoveItem(item.noteEntryId, nextPid, item.revision);
      notify.success(tr('Đã di chuyển mục sang trang mới'), '', { key: 'nb-item-moved' });
    } catch (err) {
      setTargetPageId(item.notebookPageId ? String(item.notebookPageId) : '');
      notify.apiError(err, tr('Chưa di chuyển được mục'));
    }
  }

  async function handleEnrollSrs() {
    if (busy || item.hasSrs) return;
    try {
      await onEnrollSrs(item.noteEntryId);
      notify.success(tr('Đã thêm vào hàng chờ ôn tập SRS'), '', { key: 'nb-item-srs-ok' });
    } catch (err) {
      notify.apiError(err, tr('Chưa thể thêm vào SRS'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rp-line bg-rp-bg-2 p-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Badge tone="sakura" size="sm">{tr(getEntryKindLabel(item.kind))}</Badge>
          <button
            type="button"
            onClick={() => speakJapanese(item.term)}
            title={tr('Nghe phát âm')}
            aria-label={tr('Nghe phát âm')}
            className="rp-focus inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rp-line bg-white text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.hasSrs ? (
            <Link
              to="/daily-srs/"
              onClick={onClose}
              className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>{tr('Đã thêm SRS · Mở ôn tập')}</span>
            </Link>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Repeat}
              loading={enrolling}
              disabled={busy}
              onClick={handleEnrollSrs}
            >
              {tr('Thêm vào SRS')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {item.notebookPageId && onOpenPage && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={FilePenLine}
            onClick={() => {
              onOpenPage(item.notebookPageId);
              onClose?.();
            }}
          >
            {tr('Mở trang chứa mục')}
          </Button>
        )}
        {item.vocabularyId && (
          <Link
            to={`/vocabulary-detail/?id=${item.vocabularyId}`}
            onClick={onClose}
            className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-[12.5px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{tr('Xem từ điển')}</span>
          </Link>
        )}
        {item.sourcePath && (
          <Link
            to={item.sourcePath}
            onClick={onClose}
            className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-[12.5px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="max-w-[200px] truncate">{item.sourceTitle || tr('Mở nguồn bài học')}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        )}
      </div>

      <form id="saved-item-detail-form" onSubmit={handleSave} className="space-y-3.5">
        {isBankLinked ? (
          <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3.5 space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="rp-jp text-[18px] font-bold text-rp-text">{item.term}</span>
              {item.reading && <span className="rp-jp text-[13.5px] text-rp-brand-strong">{item.reading}</span>}
            </div>
            <p className="text-[13.5px] text-rp-text-2">{item.meaning}</p>
          </div>
        ) : (
          <>
            <Field label={tr('Từ / Cụm kiến thức')} required error={errors.word}>
              <Input
                value={word}
                onChange={(e) => {
                  setWord(e.target.value);
                  setErrors((prev) => ({ ...prev, word: '' }));
                }}
                maxLength={200}
                className="rp-jp"
              />
            </Field>
            <Field label={tr('Cách đọc (Furigana / Romaji)')}>
              <Input
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                maxLength={200}
                className="rp-jp"
                placeholder={tr('Ví dụ: さくら')}
              />
            </Field>
            <Field label={tr('Nghĩa / Giải thích')} required error={errors.meaning}>
              <Textarea
                rows={2}
                value={meaning}
                onChange={(e) => {
                  setMeaning(e.target.value);
                  setErrors((prev) => ({ ...prev, meaning: '' }));
                }}
                maxLength={500}
              />
            </Field>
          </>
        )}

        <Field label={tr('Ghi chú cá nhân')}>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder={tr('Mẹo ghi nhớ, lưu ý ngữ cảnh, cách dùng…')}
          />
        </Field>

        <Field label={tr('Câu ví dụ')}>
          <Input
            value={exampleSentence}
            onChange={(e) => setExampleSentence(e.target.value)}
            maxLength={500}
            className="rp-jp"
            placeholder={tr('Ví dụ tiếng Nhật đi kèm (nếu có)')}
          />
        </Field>

        {item.contextSnippet && (
          <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-[12.5px] text-rp-text-2">
            <span className="block text-[11px] font-semibold text-rp-text-muted">{tr('Ngữ cảnh đã lưu')}</span>
            <p className="rp-jp mt-1">{item.contextSnippet}</p>
          </div>
        )}

        {allPages.length > 0 && (
          <Field label={tr('Trang lưu trữ')}>
            {({ id }) => (
              <CascadingLocationPicker
                id={id}
                folders={folders}
                level="page"
                value={targetPageId}
                disabled={busy}
                onChange={(pid) => handleMove(String(pid))}
              />
            )}
          </Field>
        )}

        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-rp-text">{tr('Nhãn màu thẻ (tùy chọn)')}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHighlightColor('')}
              className={`rp-focus rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
                !highlightColor
                  ? 'border-rp-brand-pressed bg-rp-brand-tint text-rp-brand-strong'
                  : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border'
              }`}
            >
              {tr('Mặc định')}
            </button>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setHighlightColor(c.id)}
                className={`rp-focus inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
                  highlightColor === c.id
                    ? 'border-rp-brand-pressed bg-rp-brand-tint text-rp-brand-strong'
                    : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${c.dotClass}`} />
                <span>{tr(c.label)}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}

/**
 * Contextual Detail Drawer for a single Saved Item inside a Page or All Saved Items.
 */
export default function SavedItemDetailDrawer({
  item,
  open,
  onClose,
  allPages = [],
  folders = [],
  onOpenPage,
  onUpdateItem,
  onMoveItem,
  onEnrollSrs,
  onDeleteItem,
  updating = false,
  enrolling = false,
  deleting = false,
}) {
  const { tr, trf } = useLocale();
  if (!item) return null;

  const busy = updating || enrolling || deleting;

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: tr('Xóa mục này khỏi sổ tay?'),
      message: item.hasSrs
        ? trf('“{0}” sẽ bị xóa khỏi sổ tay. Các thẻ ôn tập SRS đã tạo trước đó vẫn được giữ nguyên.', { 0: item.term })
        : trf('“{0}” sẽ bị xóa khỏi sổ tay cá nhân của bạn.', { 0: item.term }),
      confirmText: tr('Xóa mục'),
      cancelText: tr('Hủy'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await onDeleteItem(item.noteEntryId);
      notify.success(tr('Đã xóa mục khỏi sổ tay'), '', { key: 'nb-item-deleted' });
      onClose?.();
    } catch (err) {
      notify.apiError(err, tr('Không thể xóa mục này'));
    }
  }

  return (
    <Drawer
      open={open}
      onClose={busy ? undefined : onClose}
      size="md"
      title={item.term || tr('Chi tiết mục đã lưu')}
      description={`${item.folderName} › ${item.fileName}${item.notebookPageTitle ? ` › ${item.notebookPageTitle}` : ''}`}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="danger"
            size="md"
            icon={Trash2}
            disabled={busy}
            onClick={handleDelete}
          >
            {tr('Xóa mục')}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="md" disabled={busy} onClick={onClose}>
              {tr('Đóng')}
            </Button>
            <Button
              type="submit"
              form="saved-item-detail-form"
              variant="primary"
              size="md"
              icon={Save}
              loading={updating}
              disabled={busy}
            >
              {tr('Lưu thay đổi')}
            </Button>
          </div>
        </div>
      )}
    >
      <SavedItemDrawerContent
        key={`${item.noteEntryId}-${item.revision ?? 1}-${item.notebookPageId ?? 0}`}
        item={item}
        allPages={allPages}
        folders={folders}
        busy={busy}
        enrolling={enrolling}
        onClose={onClose}
        onOpenPage={onOpenPage}
        onUpdateItem={onUpdateItem}
        onMoveItem={onMoveItem}
        onEnrollSrs={onEnrollSrs}
      />
    </Drawer>
  );
}
