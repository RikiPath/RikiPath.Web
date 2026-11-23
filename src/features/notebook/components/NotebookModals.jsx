import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FilePlus2, Volume2 } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Button,
  Checkbox,
  ContextualErrorState,
  CustomSelect,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  SakuraLoader,
  SearchInput,
  Tabs,
  Textarea,
  notify,
} from '@/components/ui';
import { searchKanji } from '@/features/content-author/api/sharedBankApi.js';
import NotebookVocabLookupSection from './NotebookVocabLookupSection.jsx';
import CascadingLocationPicker from './CascadingLocationPicker.jsx';
import { resolveCreatePageTargetFile } from '../utils/notebookModel.js';

const KANJI_SAMPLES = ['日', '水', '学', '人', '月'];

function speakJapanese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function CreateNodeFormBody({
  initialFolderId,
  initialFileId,
  initialPageId,
  folders,
  allFiles,
  allPages,
  onCreateFolder,
  onCreateFile,
  onCreatePage,
  onAddSavedItem,
  onSuccessCreated,
  onClose,
  kind,
  onKindChange,
  submitting,
  setSubmitting,
}) {
  const { tr } = useLocale();
  // Preselect from the open Folder/File/Page context; otherwise the "Sổ tay chung" defaults — never an arbitrary item.
  const contextFolder = initialFolderId ? folders.find((f) => f.id === Number(initialFolderId)) || null : null;
  const contextPage = initialPageId ? allPages.find((p) => p.id === Number(initialPageId)) || null : null;
  const defaultFile = resolveCreatePageTargetFile({ contextFileId: initialFileId, allFiles });
  const defaultPage = contextPage || allPages.find((p) => p.isDefault) || null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentFolderId, setParentFolderId] = useState(
    (contextFolder || folders.find((f) => f.isDefault))?.id ?? null,
  );
  const [parentFileId, setParentFileId] = useState(defaultFile?.id ?? null);
  const [parentPageId, setParentPageId] = useState(defaultPage?.id ?? null);
  const [reading, setReading] = useState('');
  const [meaning, setMeaning] = useState('');
  const [note, setNote] = useState('');
  const [itemKind, setItemKind] = useState('vocabulary');
  const [errors, setErrors] = useState({});

  const pageBlocked = kind === 'page' && allFiles.length === 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || pageBlocked) return;

    const cleanName = name.trim();
    const nextErrors = {};
    if (!cleanName) {
      nextErrors.name = kind === 'folder'
        ? tr('Vui lòng nhập tên thư mục.')
        : kind === 'file'
          ? tr('Vui lòng nhập tên tệp ghi chú.')
          : kind === 'page'
            ? tr('Vui lòng nhập tiêu đề trang.')
            : tr('Vui lòng nhập từ hoặc kiến thức.');
    }
    if (kind === 'file' && folders.length > 0 && !parentFolderId) {
      nextErrors.parent = tr('Vui lòng chọn thư mục.');
    }
    if (kind === 'page' && !parentFileId) {
      nextErrors.parent = tr('Vui lòng chọn tệp ghi chú.');
    }
    if (kind === 'item' && allPages.length > 0 && !parentPageId) {
      nextErrors.parent = tr('Vui lòng chọn trang.');
    }
    if (kind === 'item' && !meaning.trim()) {
      nextErrors.meaning = tr('Vui lòng nhập nghĩa hoặc giải thích.');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      let created = null;
      if (kind === 'folder') {
        created = await onCreateFolder({ name: cleanName });
        notify.success(tr('Đã tạo thư mục mới'), '', { key: 'nb-create-folder' });
      } else if (kind === 'file') {
        created = await onCreateFile({
          folderId: parentFolderId ? Number(parentFolderId) : null,
          name: cleanName,
          description: description.trim() || null,
          createInitialPage: true,
        });
        notify.success(tr('Đã tạo tệp ghi chú mới'), '', { key: 'nb-create-file' });
      } else if (kind === 'page') {
        created = await onCreatePage({
          fileId: Number(parentFileId),
          title: cleanName,
        });
        notify.success(tr('Đã tạo trang ghi chú mới'), '', { key: 'nb-create-page' });
      } else {
        created = await onAddSavedItem({
          notebookPageId: parentPageId ? Number(parentPageId) : null,
          itemKind,
          word: cleanName,
          reading: reading.trim(),
          meaning: meaning.trim(),
          note: note.trim(),
          enrollSrs: false,
        });
        notify.success(tr('Đã thêm mục vào trang'), '', { key: 'nb-create-item' });
      }
      onSuccessCreated?.({ kind, created });
      onClose?.();
    } catch (err) {
      notify.apiError(err, tr('Chưa thể tạo mới'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        variant="pill"
        tone="segmented"
        fullWidth
        label={tr('Loại nội dung cần tạo')}
        value={kind}
        onChange={(next) => {
          onKindChange(next);
          setErrors({});
        }}
        tabs={[
          { id: 'folder', label: tr('Thư mục') },
          { id: 'file', label: tr('Tệp ghi chú') },
          { id: 'page', label: tr('Trang') },
          { id: 'item', label: tr('Mục đã lưu') },
        ]}
      />

      <form id="nb-create-node-form" onSubmit={handleSubmit} className="space-y-3.5">
        {kind === 'file' && folders.length > 0 && (
          <Field label={tr('Thư mục')} required error={errors.parent}>
            {({ id }) => (
              <CascadingLocationPicker
                id={id}
                folders={folders}
                level="folder"
                value={parentFolderId}
                invalid={Boolean(errors.parent)}
                onChange={(val) => {
                  setParentFolderId(val);
                  setErrors((p) => ({ ...p, parent: '' }));
                }}
              />
            )}
          </Field>
        )}

        {kind === 'page' && !pageBlocked && (
          <Field label={tr('Tệp ghi chú')} required error={errors.parent}>
            {({ id }) => (
              <CascadingLocationPicker
                id={id}
                folders={folders}
                level="file"
                value={parentFileId}
                invalid={Boolean(errors.parent)}
                onChange={(val) => {
                  setParentFileId(val);
                  setErrors((p) => ({ ...p, parent: '' }));
                }}
              />
            )}
          </Field>
        )}
        {pageBlocked && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-rp-line bg-rp-bg-2/70 px-3 py-2.5">
            <p className="text-[12.5px] text-rp-text-2">
              {tr('Hãy mở một tệp ghi chú hoặc tạo tệp trước khi thêm trang.')}
            </p>
            <Button type="button" variant="secondary" size="sm" icon={FilePlus2} onClick={() => onKindChange('file')}>
              {tr('Tạo tệp ghi chú')}
            </Button>
          </div>
        )}

        {kind === 'item' && allPages.length > 0 && (
          <Field label={tr('Trang')} required error={errors.parent}>
            {({ id }) => (
              <CascadingLocationPicker
                id={id}
                folders={folders}
                level="page"
                value={parentPageId}
                invalid={Boolean(errors.parent)}
                onChange={(val) => {
                  setParentPageId(val);
                  setErrors((p) => ({ ...p, parent: '' }));
                }}
              />
            )}
          </Field>
        )}

        {!pageBlocked && (
          <Field
            label={
              kind === 'folder' ? tr('Tên thư mục')
                : kind === 'file' ? tr('Tên tệp ghi chú')
                  : kind === 'page' ? tr('Tiêu đề trang')
                    : tr('Từ / Cụm từ / Kanji')
            }
            required
            error={errors.name}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({ ...p, name: '' }));
              }}
              maxLength={kind === 'folder' ? 120 : 200}
              className={kind === 'item' ? 'rp-jp' : ''}
              placeholder={
                kind === 'folder' ? tr('Ví dụ: JLPT N4, Giao tiếp, Bài học trên lớp…')
                  : kind === 'file' ? tr('Ví dụ: Minna no Nihongo, Ngữ pháp bài 1–5…')
                    : kind === 'page' ? tr('Ví dụ: Bài 1 – Từ vựng')
                      : tr('Ví dụ: 桜, 図書館, 〜てしまう…')
              }
            />
          </Field>
        )}

        {kind === 'file' && (
          <Field label={tr('Mô tả ngắn (tùy chọn)')}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder={tr('Mục tiêu hoặc nội dung tóm tắt của tệp ghi chú')}
            />
          </Field>
        )}

        {kind === 'item' && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={tr('Loại nội dung')}>
                <CustomSelect
                  value={itemKind}
                  onChange={(val) => setItemKind(val)}
                  options={[
                    { value: 'vocabulary', label: tr('Từ vựng') },
                    { value: 'kanji', label: tr('Hán tự') },
                    { value: 'grammar', label: tr('Ngữ pháp') },
                    { value: 'note', label: tr('Ghi chú') },
                  ]}
                />
              </Field>
              <Field label={tr('Cách đọc')}>
                <Input
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  maxLength={200}
                  className="rp-jp"
                  placeholder={tr('Ví dụ: さくら')}
                />
              </Field>
            </div>
            <Field label={tr('Nghĩa / Giải thích')} required error={errors.meaning}>
              <Input
                value={meaning}
                onChange={(e) => {
                  setMeaning(e.target.value);
                  setErrors((p) => ({ ...p, meaning: '' }));
                }}
                maxLength={500}
                placeholder={tr('Ví dụ: Hoa anh đào')}
              />
            </Field>
            <Field label={tr('Ghi chú cá nhân (tùy chọn)')}>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder={tr('Ví dụ câu hoặc mẹo ghi nhớ riêng…')}
              />
            </Field>
          </>
        )}
      </form>
    </div>
  );
}

/**
 * Unified Create Modal for Personal Notebook V3 (+ Tạo mới).
 * Parents come from the workspace context (open folder / file / page); a page is never
 * created in an arbitrary file — see `resolveCreatePageTargetFile`.
 */
export function NotebookCreateModal({
  open,
  onClose,
  initialKind = 'page',
  initialFolderId = null,
  initialFileId = null,
  initialPageId = null,
  folders = [],
  allFiles = [],
  allPages = [],
  onCreateFolder,
  onCreateFile,
  onCreatePage,
  onAddSavedItem,
  onSuccessCreated,
}) {
  const { tr } = useLocale();
  const [selectedKind, setSelectedKind] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const kind = open ? (selectedKind || initialKind || 'page') : (initialKind || 'page');
  const pageBlocked = kind === 'page' && allFiles.length === 0;

  const titleByKind = {
    folder: tr('Tạo thư mục'),
    file: tr('Tạo tệp ghi chú'),
    page: tr('Tạo trang'),
    item: tr('Thêm mục'),
  };

  function handleClose() {
    setSelectedKind(null);
    setSubmitting(false);
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : handleClose}
      size="md"
      title={titleByKind[kind] || tr('Tạo mới')}
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="md" disabled={submitting} onClick={handleClose}>
            {tr('Hủy')}
          </Button>
          <Button
            type="submit"
            form="nb-create-node-form"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting || pageBlocked}
          >
            {titleByKind[kind] || tr('Tạo mới')}
          </Button>
        </div>
      )}
    >
      {open && (
        <CreateNodeFormBody
          key={`${initialKind}-${initialFolderId ?? 0}-${initialFileId ?? 0}-${initialPageId ?? 0}`}
          initialFolderId={initialFolderId}
          initialFileId={initialFileId}
          initialPageId={initialPageId}
          folders={folders}
          allFiles={allFiles}
          allPages={allPages}
          onCreateFolder={onCreateFolder}
          onCreateFile={onCreateFile}
          onCreatePage={onCreatePage}
          onAddSavedItem={onAddSavedItem}
          onSuccessCreated={onSuccessCreated}
          onClose={handleClose}
          kind={kind}
          onKindChange={setSelectedKind}
          submitting={submitting}
          setSubmitting={setSubmitting}
        />
      )}
    </Modal>
  );
}

function RenameMoveFormBody({
  target,
  folders,
  allFiles,
  submitting,
  setSubmitting,
  onRenameFolder,
  onUpdateFile,
  onUpdatePage,
  onClose,
}) {
  const { tr } = useLocale();
  const [name, setName] = useState(
    target.kind === 'page' ? (target.item.title || '') : (target.item.name || ''),
  );
  const [parentId, setParentId] = useState(
    target.kind === 'file'
      ? (target.item.folderId ? String(target.item.folderId) : '')
      : target.kind === 'page'
        ? (target.item.fileId ? String(target.item.fileId) : '')
        : '',
  );
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    if (submitting) return;
    const clean = name.trim();
    if (!clean) {
      setError(tr('Tên không được để trống.'));
      return;
    }

    const originalName = (target.kind === 'page' ? target.item.title : target.item.name) || '';
    const originalParent = target.kind === 'file'
      ? String(target.item.folderId ?? '')
      : target.kind === 'page' ? String(target.item.fileId ?? '') : '';
    if (clean === originalName.trim() && parentId === originalParent) {
      onClose?.();
      return;
    }

    setSubmitting(true);
    try {
      if (target.kind === 'folder') {
        await onRenameFolder({
          folderId: target.item.id,
          name: clean,
          expectedRevision: target.item.revision,
        });
      } else if (target.kind === 'file') {
        await onUpdateFile({
          fileId: target.item.id,
          name: clean,
          folderId: parentId ? Number(parentId) : undefined,
          expectedRevision: target.item.revision,
        });
      } else {
        await onUpdatePage({
          pageId: target.item.id,
          title: clean,
          fileId: !target.renameOnly && parentId ? Number(parentId) : undefined,
          expectedRevision: target.item.revision,
        });
      }
      notify.success(tr('Đã cập nhật thành công'), '', { key: 'nb-rename-move-ok' });
      onClose?.();
    } catch (err) {
      const code = String(err?.data?.errorCode || err?.errorCode || '');
      if (code.endsWith('_DUPLICATE')) {
        setError(tr('Tên này đã tồn tại ở cùng vị trí. Hãy chọn tên khác.'));
        return;
      }
      notify.apiError(err, tr('Chưa lưu được thay đổi'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="nb-rename-move-form" onSubmit={handleSave} className="space-y-3.5">
      <Field label={target.kind === 'page' ? tr('Tiêu đề trang') : tr('Tên mới')} required error={error}>
        <Input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          maxLength={target.kind === 'folder' ? 120 : 200}
        />
      </Field>

      {!target.renameOnly && target.kind === 'file' && folders.length > 0 && (
        <Field label={tr('Thư mục chứa')}>
          {({ id }) => (
            <CascadingLocationPicker
              id={id}
              folders={folders}
              level="folder"
              value={parentId}
              onChange={(val) => setParentId(String(val))}
            />
          )}
        </Field>
      )}

      {!target.renameOnly && target.kind === 'page' && allFiles.length > 0 && (
        <Field label={tr('Tệp ghi chú chứa')}>
          {({ id }) => (
            <CascadingLocationPicker
              id={id}
              folders={folders}
              level="file"
              value={parentId}
              onChange={(val) => setParentId(String(val))}
            />
          )}
        </Field>
      )}
    </form>
  );
}

/**
 * Clean Modal to rename a Folder, File, or Page, and optionally move a File/Page to a new parent.
 */
export function NotebookRenameMoveModal({
  target,
  onClose,
  folders = [],
  allFiles = [],
  onRenameFolder,
  onUpdateFile,
  onUpdatePage,
}) {
  const { tr } = useLocale();
  const [submitting, setSubmitting] = useState(false);

  if (!target?.item) return null;

  const title = target.kind === 'folder'
    ? tr('Đổi tên thư mục')
    : target.kind === 'file'
      ? tr('Đổi tên hoặc di chuyển tệp')
      : target.renameOnly
        ? tr('Đổi tên trang')
        : tr('Đổi tên hoặc di chuyển trang');

  return (
    <Modal
      open={Boolean(target)}
      onClose={submitting ? undefined : onClose}
      size="sm"
      title={title}
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="md" disabled={submitting} onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button type="submit" form="nb-rename-move-form" variant="primary" size="md" loading={submitting} disabled={submitting}>
            {tr('Lưu')}
          </Button>
        </div>
      )}
    >
      <RenameMoveFormBody
        key={`${target.kind}-${target.item.id}-${target.item.revision ?? 1}`}
        target={target}
        folders={folders}
        allFiles={allFiles}
        submitting={submitting}
        setSubmitting={setSubmitting}
        onRenameFolder={onRenameFolder}
        onUpdateFile={onUpdateFile}
        onUpdatePage={onUpdatePage}
        onClose={onClose}
      />
    </Modal>
  );
}

function LookupDrawerBody({ initialMode, nb, activePage, notePages, onClose }) {
  const { tr } = useLocale();
  const [tab, setTab] = useState(initialMode === 'kanji-bank' ? 'kanji-bank' : 'vocab-bank');
  const [kanjiQuery, setKanjiQuery] = useState('');
  const [kanjiSubmitted, setKanjiSubmitted] = useState('');
  const [enrollLookupSrs, setEnrollLookupSrs] = useState(false);

  const kanjiSearchQuery = useQuery({
    queryKey: ['notebook-kanji-search', kanjiSubmitted],
    queryFn: () => searchKanji(kanjiSubmitted),
    enabled: tab === 'kanji-bank' && kanjiSubmitted.length > 0,
  });

  const saveKanjiToPage = useMutation({
    mutationFn: async (kanjiItem) => {
      const targetPageId = activePage?.id || notePages[0]?.id || null;
      return nb.addSavedItem.mutateAsync({
        notebookPageId: targetPageId,
        kanjiId: kanjiItem.id,
        itemKind: 'kanji',
        word: kanjiItem.character,
        meaning: kanjiItem.meaning || '',
        enrollSrs: enrollLookupSrs,
      });
    },
    onSuccess: (res) => {
      if (res?.isAlreadyExisting) {
        notify.info(tr('Chữ Kanji này đã có trong trang'), '', { key: 'nb-kanji-dup' });
      } else {
        notify.success(tr('Đã lưu Hán tự vào trang ghi chú'), '', { key: 'nb-kanji-ok' });
      }
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được Hán tự')),
  });

  const kanjiItems = kanjiSearchQuery.data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          variant="pill"
          tone="segmented"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'vocab-bank', label: tr('Từ vựng') },
            { id: 'kanji-bank', label: tr('Hán tự') },
          ]}
        />
        <Checkbox
          checked={enrollLookupSrs}
          onChange={setEnrollLookupSrs}
          label={tr('Đồng thời tạo thẻ ôn tập SRS')}
        />
      </div>

      {tab === 'vocab-bank' ? (
        <NotebookVocabLookupSection
          nb={nb}
          activeNotePage={activePage}
          notePages={notePages}
          enrollSrs={enrollLookupSrs}
          onBackToWorkspace={onClose}
        />
      ) : (
        <div className="space-y-4 rounded-2xl border border-rp-line bg-white p-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setKanjiSubmitted(kanjiQuery.trim());
            }}
          >
            <div className="min-w-[200px] flex-1">
              <SearchInput
                value={kanjiQuery}
                onChange={(e) => setKanjiQuery(typeof e === 'string' ? e : (e?.target?.value ?? ''))}
                onClear={() => {
                  setKanjiQuery('');
                  setKanjiSubmitted('');
                }}
                placeholder={tr('Nhập chữ Hán, âm Hán Việt hoặc nghĩa tiếng Việt…')}
              />
            </div>
            <Button type="submit" variant="primary" size="md" disabled={!kanjiQuery.trim()}>
              {tr('Tìm')}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-rp-text-muted">{tr('Gợi ý')}:</span>
            {KANJI_SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setKanjiQuery(sample);
                  setKanjiSubmitted(sample);
                }}
                className="rp-focus h-7.5 rounded-full bg-rp-brand-tint px-3 text-[13px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft"
              >
                {sample}
              </button>
            ))}
          </div>

          {!kanjiSubmitted && (
            <EmptyState
              variant="compact"
              illustration="flashcard"
              title={tr('Nhập từ khóa để tra Hán tự đã xuất bản')}
              description={tr('Kết quả cho phép nghe phát âm và lưu nhanh vào trang hiện tại.')}
            />
          )}
          {kanjiSubmitted && kanjiSearchQuery.isPending && <SakuraLoader variant="section" context="writing" />}
          {kanjiSearchQuery.isError && (
            <ContextualErrorState
              variant="inline"
              compact
              error={kanjiSearchQuery.error}
              title={tr('Chưa tải được dữ liệu Hán tự')}
              onRetry={() => kanjiSearchQuery.refetch()}
            />
          )}
          {kanjiSearchQuery.isSuccess && kanjiItems.length === 0 && (
            <EmptyState
              variant="compact"
              illustration="search"
              title={tr('Không tìm thấy chữ Hán phù hợp')}
              description={tr('Thử nhập chữ Kanji đơn lẻ hoặc nghĩa ngắn hơn.')}
            />
          )}
          {kanjiItems.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {kanjiItems.map((k) => (
                <div key={k.id} className="flex items-start justify-between gap-2 rounded-xl border border-rp-line p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rp-jp text-[22px] font-bold text-rp-text">{k.character}</span>
                      {k.sinoVietnamese && <Badge tone="sakura" size="sm">{k.sinoVietnamese}</Badge>}
                    </div>
                    <p className="mt-1 text-[12.5px] font-medium text-rp-text-2">{k.meaning}</p>
                    {(k.onYomi || k.kunYomi) && (
                      <p className="rp-jp mt-0.5 text-[11.5px] text-rp-text-muted">
                        {[k.onYomi, k.kunYomi].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      aria-label={tr('Nghe phát âm')}
                      onClick={() => speakJapanese(k.onYomi || k.kunYomi || k.character)}
                      className="rp-focus rounded-lg border border-rp-line p-1.5 text-rp-text-2 hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={saveKanjiToPage.isPending}
                      onClick={() => saveKanjiToPage.mutate(k)}
                    >
                      {tr('Lưu vào trang')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Contextual Dictionary & Kanji Lookup Drawer moved out of the primary banner.
 */
export function NotebookLookupDrawer({
  open,
  onClose,
  initialMode = 'vocab-bank',
  nb,
  activePage,
  notePages = [],
}) {
  const { tr } = useLocale();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={tr('Tra cứu từ vựng & Hán tự')}
      description={activePage
        ? `${tr('Lưu trực tiếp vào trang')}: ${activePage.title}`
        : tr('Tìm kiến thức đã xuất bản từ kho dùng chung và thêm nhanh vào Sổ tay.')}
    >
      {open && (
        <LookupDrawerBody
          key={initialMode}
          initialMode={initialMode}
          nb={nb}
          activePage={activePage}
          notePages={notePages}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
}
