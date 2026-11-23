import { useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Eye, Layers, Plus, Send, Trash2 } from 'lucide-react';
import { ContentAuthorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  Input,
  Modal,
  PageContainer,
  SakuraLoader,
  SearchInput,
  confirmAction,
  cx,
  notify,
} from '@/components/ui';
import {
  createSrsTemplate,
  deleteSrsTemplate,
  getMySrsTemplates,
  submitSrsTemplate,
  updateSrsTemplate,
} from '@/features/content-author/api/srsTemplatesApi.js';
import SrsCardPreviewModal from '@/features/srs/components/SrsCardPreviewModal.jsx';
import {
  formatSrsCardTypeLabel,
  getSrsTemplateStatusMeta,
  normalizeSrsCardType,
} from '@/features/srs/utils/srsLabels.js';
import { useLocale } from '@/locales/locale.js';

const EMPTY_FORM = {
  cardType: 'Vocabulary',
  frontText: '',
  reading: '',
  meaning: '',
  exampleSentence: '',
  exampleMeaning: '',
  showExamples: false,
};

function canEditTemplate(status) {
  return (
    status === 'Draft' ||
    status === 0 ||
    status === 'Rejected' ||
    status === 3 ||
    status === 'Unpublished' ||
    status === 4
  );
}

function canDeleteTemplate(status) {
  return status === 'Draft' || status === 0 || status === 'Rejected' || status === 3;
}

export default function SrsTemplatesPage() {
  const { pathname } = useLocation();
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const formId = useId();

  const [search, setSearch] = useState('');
  const [cardTypeFilter, setCardTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editorState, setEditorState] = useState(null); // null | { mode: 'create'|'edit', id?, form }
  const [submitted, setSubmitted] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const trimmedSearch = search.trim();
  const hasActiveFilters = Boolean(trimmedSearch || cardTypeFilter || statusFilter);

  const listQuery = useQuery({
    queryKey: ['author-srs-templates', { status: statusFilter, cardType: cardTypeFilter, search: trimmedSearch }],
    queryFn: () =>
      getMySrsTemplates({
        status: statusFilter,
        cardType: cardTypeFilter,
        search: trimmedSearch,
      }),
    placeholderData: (prev) => prev,
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['author-srs-templates'] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const f = editorState.form;
      const trimmedFront = f.frontText.trim();
      const trimmedMeaning = f.meaning.trim();
      const includeExamples = Boolean(f.showExamples);
      const trimmedExample = includeExamples ? f.exampleSentence.trim() : '';
      const trimmedExampleMeaning = includeExamples ? f.exampleMeaning.trim() : '';

      const payload = {
        cardType: f.cardType === 'Kanji' ? 'Kanji' : 'Vocabulary',
        frontText: trimmedFront,
        backText: trimmedMeaning,
        reading: f.reading.trim() || null,
        meaning: trimmedMeaning,
        exampleSentence: trimmedExample || null,
        exampleMeaning: trimmedExampleMeaning || null,
      };
      if (editorState.mode === 'edit' && editorState.id) {
        return updateSrsTemplate(editorState.id, payload);
      }
      return createSrsTemplate(payload);
    },
    onSuccess: async () => {
      notify.success(tr('Đã lưu thẻ mẫu SRS (bản nháp).'));
      setEditorState(null);
      setSubmitted(false);
      await refreshAll();
    },
    onError: (err) => notify.apiError(err, tr('Không thể lưu thẻ mẫu SRS')),
  });

  const submitMut = useMutation({
    mutationFn: (id) => submitSrsTemplate(id),
    onSuccess: async () => {
      notify.success(tr('Đã gửi thẻ mẫu lên Admin phê duyệt.'));
      await refreshAll();
    },
    onError: (err) => notify.apiError(err, tr('Không thể gửi duyệt')),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteSrsTemplate(id),
    onSuccess: async () => {
      notify.info(tr('Đã xóa thẻ mẫu nháp.'));
      await refreshAll();
    },
    onError: (err) => notify.apiError(err, tr('Không thể xóa thẻ mẫu')),
  });

  function openCreate() {
    setSubmitted(false);
    setEditorState({ mode: 'create', form: { ...EMPTY_FORM } });
  }

  function openEdit(item) {
    setSubmitted(false);
    const hasExample = Boolean(item.exampleSentence || item.exampleMeaning);
    setEditorState({
      mode: 'edit',
      id: item.id,
      form: {
        cardType: normalizeSrsCardType(item.cardType),
        frontText: item.frontText || '',
        reading: item.reading || '',
        meaning: item.meaning || item.backText || '',
        exampleSentence: item.exampleSentence || '',
        exampleMeaning: item.exampleMeaning || '',
        showExamples: hasExample,
      },
    });
  }

  function updateForm(patch) {
    setEditorState((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev));
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!editorState || saveMut.isPending) return;
    setSubmitted(true);
    const front = editorState.form.frontText.trim();
    const meaning = editorState.form.meaning.trim();
    if (!front || !meaning) return;
    saveMut.mutate();
  }

  async function handleDelete(item) {
    const ok = await confirmAction({
      title: tr('Xóa thẻ mẫu SRS?'),
      description: trf('Xóa bản nháp “{0}” khỏi danh sách biên soạn?', { 0: item.frontText }),
      confirmLabel: tr('Xóa'),
      tone: 'danger',
    });
    if (ok) deleteMut.mutate(item.id);
  }

  const items = listQuery.data || [];
  const form = editorState?.form;
  const frontError = submitted && !form?.frontText.trim() ? tr('Vui lòng nhập mặt trước') : undefined;
  const meaningError = submitted && !form?.meaning.trim() ? tr('Vui lòng nhập nghĩa tiếng Việt') : undefined;

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb={tr('Thẻ mẫu SRS')}>
      <PageContainer width="default" density="comfortable" className="space-y-5 text-rp-text">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rp-brand-strong">
              <Layers className="h-4 w-4" />
              <span>{tr('Biên soạn SRS · Tác giả nội dung')}</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-rp-navy">
              {tr('Thẻ mẫu SRS cho Học viên')}
            </h1>
            <p className="mt-1 text-sm text-rp-text-2">
              {tr('Biên soạn thẻ Từ vựng và Kanji, xem trước như Học viên và gửi Admin phê duyệt.')}
            </p>
          </div>
          <Button type="button" variant="primary" size="md" icon={Plus} onClick={openCreate}>
            {tr('Tạo thẻ mẫu SRS')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-rp-line bg-rp-surface p-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder={tr('Tìm mặt trước, cách đọc hoặc nghĩa...')}
              />
            </div>
            <CustomSelect
              fitContent
              value={cardTypeFilter}
              onChange={setCardTypeFilter}
              className="min-w-[140px]"
              options={[
                { value: '', label: tr('Mọi loại thẻ') },
                { value: 'Vocabulary', label: tr('Từ vựng') },
                { value: 'Kanji', label: tr('Kanji') },
              ]}
            />
            <CustomSelect
              fitContent
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-[164px]"
              options={[
                { value: '', label: tr('Tất cả trạng thái') },
                { value: 'Draft', label: tr('Bản nháp') },
                { value: 'PendingReview', label: tr('Chờ duyệt') },
                { value: 'Published', label: tr('Đã xuất bản') },
                { value: 'Rejected', label: tr('Bị từ chối') },
                { value: 'Unpublished', label: tr('Ngừng xuất bản') },
              ]}
            />
          </div>
        </div>

        {listQuery.isLoading ? (
          <SakuraLoader variant="section" />
        ) : listQuery.isError ? (
          <Card className="border-[#EAE3E4] bg-white">
            <ContextualErrorState
              compact
              error={listQuery.error}
              title={tr('Chưa tải được danh sách thẻ mẫu SRS')}
              onRetry={() => listQuery.refetch()}
              retrying={listQuery.isFetching}
            />
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-[#EAE3E4] bg-white">
            <ContextualEmptyState
              variant="compact"
              framed={false}
              illustration={hasActiveFilters ? 'search' : 'flashcard'}
              title={hasActiveFilters ? tr('Không tìm thấy kết quả phù hợp.') : tr('Chưa có thẻ mẫu SRS nào')}
              description={
                hasActiveFilters
                  ? tr('Hãy thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ thẻ mẫu của bạn.')
                  : tr('Nhấn “Tạo thẻ mẫu SRS” để biên soạn thẻ mới, xem trước và gửi Admin phê duyệt.')
              }
              action={hasActiveFilters ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setCardTypeFilter('');
                    setStatusFilter('');
                  }}
                >
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : (
                <Button type="button" variant="primary" size="sm" icon={Plus} onClick={openCreate}>
                  {tr('Tạo thẻ mẫu SRS')}
                </Button>
              )}
            />
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const statusMeta = getSrsTemplateStatusMeta(item.status);
              const editable = canEditTemplate(item.status);
              const deletable = canDeleteTemplate(item.status);
              const isSubmitting = submitMut.isPending && submitMut.variables === item.id;
              const isDeleting = deleteMut.isPending && deleteMut.variables === item.id;

              return (
                <Card
                  key={item.id}
                  padding="md"
                  className="flex flex-col justify-between gap-3 border border-[#EAE3E4] bg-white"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={statusMeta.tone} size="sm">
                          {tr(statusMeta.label)}
                        </Badge>
                        <Badge tone="brand" size="sm" icon={false}>
                          {formatSrsCardTypeLabel(item.cardType, tr)}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-semibold text-rp-text-muted">v{item.version || 1}</span>
                    </div>

                    <div>
                      <p className="rp-jp text-xl font-extrabold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
                        {item.frontText}
                      </p>
                      {item.reading && (
                        <p className="rp-jp mt-0.5 text-xs font-semibold text-rp-brand-strong [overflow-wrap:anywhere]" lang="ja">
                          {item.reading}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium text-rp-text-2 line-clamp-2 [overflow-wrap:anywhere]">
                        {item.meaning || item.backText}
                      </p>
                    </div>

                    {item.reviewNote && (
                      <Banner tone={item.status === 'Rejected' || item.status === 3 ? 'danger' : 'info'}>
                        <strong>{tr('Ghi chú duyệt')}:</strong> {item.reviewNote}
                      </Banner>
                    )}

                    {item.unpublishedReason && (item.status === 'Unpublished' || item.status === 4) && (
                      <Banner tone="warning">
                        <strong>{tr('Lý do ngừng xuất bản')}:</strong> {item.unpublishedReason}
                      </Banner>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-rp-line/60 pt-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewItem(item)}
                    >
                      {tr('Xem trước')}
                    </Button>
                    {editable && (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={Edit3}
                          onClick={() => openEdit(item)}
                        >
                          {tr('Sửa')}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          icon={Send}
                          loading={isSubmitting}
                          disabled={isSubmitting || isDeleting}
                          onClick={() => submitMut.mutate(item.id)}
                        >
                          {tr('Gửi duyệt')}
                        </Button>
                      </>
                    )}
                    {deletable && (
                      <Button
                        type="button"
                        variant="danger-soft"
                        size="sm"
                        icon={Trash2}
                        aria-label={tr('Xóa thẻ mẫu')}
                        loading={isDeleting}
                        disabled={isSubmitting || isDeleting}
                        onClick={() => handleDelete(item)}
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Modal
          open={Boolean(editorState)}
          onClose={saveMut.isPending ? undefined : () => setEditorState(null)}
          title={editorState?.mode === 'edit' ? tr('Chỉnh sửa thẻ mẫu SRS') : tr('Tạo thẻ mẫu SRS mới')}
          size="md"
          footer={(
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={saveMut.isPending}
                onClick={() => setEditorState(null)}
              >
                {tr('Hủy')}
              </Button>
              <Button
                type="submit"
                form={formId}
                variant="primary"
                loading={saveMut.isPending}
                disabled={saveMut.isPending}
              >
                {tr('Lưu bản nháp')}
              </Button>
            </>
          )}
        >
          {form && (
            <form id={formId} noValidate onSubmit={handleFormSubmit} className="space-y-3.5">
              <Field label={tr('Loại thẻ')}>
                {() => (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Vocabulary', label: tr('Từ vựng') },
                      { id: 'Kanji', label: tr('Kanji') },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateForm({ cardType: opt.id })}
                        className={cx(
                          'rp-focus flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-colors',
                          form.cardType === opt.id
                            ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                            : 'border-[#EAE3E4] bg-white text-rp-navy hover:bg-rp-muted/50',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <Field label={tr('Mặt trước')} required error={frontError}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    value={form.frontText}
                    maxLength={200}
                    onChange={(e) => updateForm({ frontText: e.target.value })}
                    placeholder={tr('Ví dụ: 図書館 hoặc 水')}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <Field label={tr('Cách đọc')}>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    value={form.reading}
                    maxLength={200}
                    onChange={(e) => updateForm({ reading: e.target.value })}
                    placeholder="としょかん / すい・みず"
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <Field label={tr('Nghĩa tiếng Việt')} required error={meaningError}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    value={form.meaning}
                    maxLength={400}
                    onChange={(e) => updateForm({ meaning: e.target.value })}
                    placeholder={tr('Ví dụ: Thư viện')}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <Checkbox
                checked={Boolean(form.showExamples)}
                onChange={(e) => updateForm({ showExamples: e.target.checked })}
                label={tr('Thêm câu ví dụ')}
              />

              {form.showExamples && (
                <div className="space-y-3 rounded-xl border border-[#EAE3E4] bg-[#FFFCF8] p-3">
                  <Field label={tr('Câu ví dụ')}>
                    {({ id }) => (
                      <Input
                        id={id}
                        value={form.exampleSentence}
                        maxLength={500}
                        onChange={(e) => updateForm({ exampleSentence: e.target.value })}
                        placeholder="図書館で本を読みます。"
                      />
                    )}
                  </Field>
                  <Field label={tr('Nghĩa câu ví dụ')}>
                    {({ id }) => (
                      <Input
                        id={id}
                        value={form.exampleMeaning}
                        maxLength={500}
                        onChange={(e) => updateForm({ exampleMeaning: e.target.value })}
                        placeholder={tr('Tôi đọc sách ở thư viện.')}
                      />
                    )}
                  </Field>
                </div>
              )}
            </form>
          )}
        </Modal>

        <SrsCardPreviewModal
          open={Boolean(previewItem)}
          item={previewItem}
          title={tr('Xem trước thẻ mẫu (như Học viên nhìn thấy)')}
          statusBadge={previewItem ? (
            <Badge tone={getSrsTemplateStatusMeta(previewItem.status).tone} size="sm">
              {tr(getSrsTemplateStatusMeta(previewItem.status).label)}
            </Badge>
          ) : null}
          versionLabel={previewItem ? `v${previewItem.version || 1}` : ''}
          onClose={() => setPreviewItem(null)}
          footer={previewItem && (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
                {tr('Đóng')}
              </Button>
              {canEditTemplate(previewItem.status) && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => {
                    const target = previewItem;
                    setPreviewItem(null);
                    openEdit(target);
                  }}
                >
                  {tr('Chỉnh sửa')}
                </Button>
              )}
            </>
          )}
        />
      </PageContainer>
    </ContentAuthorShell>
  );
}
