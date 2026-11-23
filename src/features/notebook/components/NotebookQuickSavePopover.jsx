import { useMemo, useState } from 'react';
import { useLocale } from '@/locales/locale.js';
import { Button, CustomSelect, Field, Input, Modal, Textarea, notify } from '@/components/ui';
import { NOTEBOOK_CONTENT_KINDS, suggestKindForSelection } from '@/features/notebook/utils/notebookModel.js';
import { useOptionalSmartNotebook } from '@/features/notebook/context/smartNotebookState.js';

const DEFAULT_PAGE_SENTINEL = '__default__';

function QuickSaveFormBody({ request, nb, notePages, onClose }) {
  const { tr } = useLocale();
  const suggested = request?.kind || suggestKindForSelection(request?.selectedText || '', request?.contextHint || '');
  const initialKind = suggested === 'highlight' ? 'note' : suggested;

  const [targetPageKey, setTargetPageKey] = useState(
    () => (notePages[0]?.id ? String(notePages[0].id) : DEFAULT_PAGE_SENTINEL),
  );
  const [kind, setKind] = useState(initialKind);
  const [term, setTerm] = useState(request?.selectedText || '');
  const [reading, setReading] = useState(request?.reading || '');
  const [meaning, setMeaning] = useState(request?.meaning || '');
  const [personalNote, setPersonalNote] = useState(request?.personalNote || '');
  const [termError, setTermError] = useState('');

  const pageOptions = useMemo(() => [
    { value: DEFAULT_PAGE_SENTINEL, label: tr('Mặc định (Sổ tay chung)') },
    ...notePages.map((p) => ({
      value: String(p.id),
      label: `${p.folderName} › ${p.fileName} › ${p.title}`,
    })),
  ], [notePages, tr]);

  const saving = Boolean(nb.quickSaveCapture?.isPending);

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;

    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setTermError(tr('Vui lòng nhập từ hoặc đoạn kiến thức cần lưu.'));
      return;
    }

    try {
      await nb.quickSaveCapture.mutateAsync({
        targetPageId: targetPageKey !== DEFAULT_PAGE_SENTINEL ? Number(targetPageKey) : null,
        kind,
        term: cleanTerm,
        reading: reading.trim(),
        meaning: meaning.trim(),
        personalNote: personalNote.trim(),
        example: request.example || '',
        sourcePath: request.sourcePath || nb.currentUrlKey || '',
        sourceTitle: request.sourceTitle || '',
        contextSnippet: request.anchorPrefix || request.anchorSuffix
          ? `${request.anchorPrefix || ''}${request.selectedText || ''}${request.anchorSuffix || ''}`
          : '',
        vocabularyId: request.vocabularyId || null,
        kanjiId: request.kanjiId || null,
        grammarPatternId: request.grammarPatternId || null,
        enrollSrs: false,
      });

      notify.success(tr('Đã lưu vào Sổ tay'), '', { key: 'nb-quick-save-ok' });
      onClose?.();
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được vào Sổ tay'), { key: 'nb-quick-save-err' });
    }
  }

  return (
    <form id="nb-quick-save-form" onSubmit={handleSave} data-notebook-ignore="true" className="space-y-3.5">
      <Field label={tr('Chọn trang lưu')}>
        <CustomSelect
          searchable
          value={targetPageKey}
          onChange={(val) => setTargetPageKey(val)}
          options={pageOptions}
        />
      </Field>

      <Field label={tr('Nội dung đã chọn')} required error={termError}>
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setTermError('');
          }}
          maxLength={200}
          className="rp-jp"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={tr('Phân loại')}>
          <CustomSelect
            value={kind}
            onChange={(val) => setKind(val)}
            options={NOTEBOOK_CONTENT_KINDS.filter((k) => k.id !== 'all' && k.id !== 'highlight').map((k) => ({
              value: k.id,
              label: tr(k.label),
            }))}
          />
        </Field>

        <Field label={tr('Cách đọc (tùy chọn)')}>
          <Input
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            maxLength={200}
            className="rp-jp"
            placeholder={tr('Ví dụ: さくら')}
          />
        </Field>
      </div>

      <Field label={tr('Nghĩa / Tóm tắt (tùy chọn)')}>
        <Input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          maxLength={500}
          placeholder={tr('Giải thích ngắn gọn giúp dễ tra cứu…')}
        />
      </Field>

      <Field label={tr('Ghi chú thêm (tùy chọn)')}>
        <Textarea
          rows={2}
          value={personalNote}
          onChange={(e) => setPersonalNote(e.target.value)}
          maxLength={2000}
          placeholder={tr('Ngữ cảnh, ví dụ hoặc lưu ý của riêng bạn…')}
        />
      </Field>
    </form>
  );
}

/**
 * Contextual Quick-Save Modal for Smart Text Selection -> Personal Notebook V3.
 */
export default function NotebookQuickSavePopover({ request, onClose }) {
  const { tr } = useLocale();
  const nb = useOptionalSmartNotebook();
  const notePages = nb?.notePages || [];

  if (!request || !nb) return null;

  const saving = Boolean(nb.quickSaveCapture?.isPending);
  const instanceKey = `${request.selectedText || ''}-${request.contentId || ''}-${request.startOffset ?? 'x'}`;

  return (
    <Modal
      open={Boolean(request)}
      onClose={saving ? undefined : onClose}
      size="md"
      title={tr('Lưu vào Sổ tay cá nhân')}
      description={tr('Lưu kiến thức bạn vừa chọn vào trang ghi chú mong muốn.')}
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button type="submit" form="nb-quick-save-form" variant="primary" size="md" loading={saving} disabled={saving}>
            {tr('Lưu vào Sổ tay')}
          </Button>
        </div>
      )}
    >
      <QuickSaveFormBody key={instanceKey} request={request} nb={nb} notePages={notePages} onClose={onClose} />
    </Modal>
  );
}
