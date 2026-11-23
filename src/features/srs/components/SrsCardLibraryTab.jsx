import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pencil, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  deleteSrsCard,
  enrollSrsCard,
  getSrsCards,
  updateSrsCard,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import CreatePracticeModal from '@/features/srs/components/CreatePracticeModal.jsx';
import SrsCardPreviewModal from '@/features/srs/components/SrsCardPreviewModal.jsx';
import {
  formatSrsCardTypeLabel,
  normalizeSrsCardType,
} from '@/features/srs/utils/srsLabels.js';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  IconButton,
  Input,
  Modal,
  Pagination,
  Popover,
  SakuraLoader,
  SearchInput,
  confirmAction,
  cx,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

// 20 divides evenly by 1, 2, 4, and 5 columns so full pages never leave a partial last row.
const LIBRARY_PAGE_SIZE = 20;

/**
 * "Thẻ của tôi": manage personal cards only (view, search, create, edit, delete).
 * Practice starts directly from Ôn tự do — there is no per-card selection step here.
 */
export default function SrsCardLibraryTab({
  onBrowseTemplates,
  preferredMode = 'flip',
}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [cardTypeFilter, setCardTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceStarting, setPracticeStarting] = useState(false);
  const navigate = useNavigate();
  const [editingCard, setEditingCard] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);

  const libraryQuery = useQuery({
    queryKey: ['srs-library', { search, cardType: cardTypeFilter, page }],
    queryFn: () =>
      getSrsCards({
        status: 'Active',
        cardType: cardTypeFilter,
        search,
        page,
        pageSize: LIBRARY_PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const totalCountQuery = useQuery({
    queryKey: ['srs-library', { search: '', cardType: '', page: 1, meta: 'activeCount' }],
    queryFn: () => getSrsCards({ status: 'Active', page: 1, pageSize: 1 }),
  });

  const refreshAll = async () => {
    await invalidateSrsAndCalendarCaches(queryClient);
  };

  const items = useMemo(() => libraryQuery.data?.items || [], [libraryQuery.data?.items]);
  const totalCount = libraryQuery.data?.totalCount || 0;
  const totalActiveCards = totalCountQuery.data?.totalCount ?? totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIBRARY_PAGE_SIZE));
  const hasActiveFilters = Boolean(search.trim() || cardTypeFilter);

  const removeMut = useMutation({
    mutationFn: (id) => deleteSrsCard(id),
    onSuccess: async (_, deletedId) => {
      if (previewCard?.reviewCardId === deletedId) setPreviewCard(null);
      if (items.length <= 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
      await refreshAll();
      notify.success(tr('Đã xóa thẻ khỏi bộ thẻ của bạn'));
    },
    onError: (err) => notify.apiError(err, tr('Chưa xóa được thẻ')),
  });

  async function handleRemoveCard(card) {
    const ok = await confirmAction({
      title: tr('Xóa thẻ này?'),
      description: tr('Thẻ sẽ không còn trong lịch ôn cá nhân. Học liệu gốc và ghi chú Sổ tay vẫn được giữ nguyên.'),
      confirmLabel: tr('Xóa thẻ'),
      cancelLabel: tr('Hủy'),
      tone: 'danger',
    });
    if (ok) removeMut.mutate(card.reviewCardId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-rp-line bg-rp-surface p-3">
        <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(typeof e === 'string' ? e : (e?.target?.value ?? ''));
                setPage(1);
              }}
              onClear={() => {
                setSearch('');
                setPage(1);
              }}
              placeholder={tr('Tìm thẻ...')}
            />
          </div>
          <div className="w-[140px]">
            <CustomSelect
              size="md"
              value={cardTypeFilter}
              onChange={(val) => {
                setCardTypeFilter(val);
                setPage(1);
              }}
              options={[
                { value: '', label: tr('Mọi loại thẻ') },
                { value: 'Vocabulary', label: tr('Từ vựng') },
                { value: 'Kanji', label: tr('Kanji') },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={Plus}
            onClick={() => setCreateOpen(true)}
          >
            {tr('Tạo thẻ')}
          </Button>
          {totalActiveCards > 0 && (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Play}
              onClick={() => setPracticeOpen(true)}
            >
              {trf('Ôn tự do ({0})', { 0: totalActiveCards })}
            </Button>
          )}
        </div>
      </div>

      {libraryQuery.isPending ? (
        <SakuraLoader variant="section" context="srs" label={tr('Đang tải thẻ của bạn…')} />
      ) : libraryQuery.isError ? (
        <Card>
          <ContextualErrorState
            error={libraryQuery.error}
            title={tr('Chưa tải được danh sách thẻ của bạn')}
            onRetry={() => libraryQuery.refetch()}
            retrying={libraryQuery.isFetching}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-[#EAE3E4] bg-white">
          {hasActiveFilters ? (
            <ContextualEmptyState
              variant="compact"
              framed={false}
              illustration="search"
              title={tr('Không tìm thấy thẻ phù hợp')}
              description={tr('Thử từ khóa khác, đổi loại thẻ hoặc tạo thẻ mới.')}
              action={(
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setCardTypeFilter('');
                      setPage(1);
                    }}
                  >
                    {tr('Xóa bộ lọc')}
                  </Button>
                  <Button type="button" variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
                    {tr('Tạo thẻ')}
                  </Button>
                </div>
              )}
            />
          ) : (
            <ContextualEmptyState
              variant="compact"
              framed={false}
              context="srs"
              illustration="flashcard"
              title={tr('Chưa có thẻ nào')}
              description={tr('Thêm thẻ để bắt đầu ôn tập.')}
              action={(
                <div className="flex flex-wrap justify-center gap-2">
                  {onBrowseTemplates && (
                    <Button type="button" variant="primary" size="sm" icon={Sparkles} onClick={onBrowseTemplates}>
                      {tr('Thư viện thẻ mẫu')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={onBrowseTemplates ? 'secondary' : 'primary'}
                    size="sm"
                    icon={Plus}
                    onClick={() => setCreateOpen(true)}
                  >
                    {tr('Tạo thẻ')}
                  </Button>
                </div>
              )}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2.5">
            {items.map((card) => {
              const typeNormalized = normalizeSrsCardType(card.cardType || card.contentType);
              const typeLabel = formatSrsCardTypeLabel(card.cardType || card.contentType, tr);
              return (
                <Card
                  key={card.reviewCardId}
                  padding="md"
                  className="rp-srs-card-hover group relative flex w-full min-w-0 flex-col justify-between gap-2.5 border border-[#EAE3E4] bg-white hover:border-rp-brand-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={typeNormalized === 'Kanji' ? 'lavender' : 'neutral'} size="sm" icon={false}>
                        {typeLabel}
                      </Badge>
                    </div>

                    <div className="shrink-0">
                      <Popover
                        align="end"
                        label={tr('Thao tác thẻ')}
                        panelClassName="w-40 p-1"
                        trigger={({ props, toggle }) => (
                          <IconButton
                            {...props}
                            icon={MoreVertical}
                            size="sm"
                            variant="ghost"
                            label={tr('Thao tác thẻ')}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle();
                            }}
                          />
                        )}
                      >
                        {({ close }) => (
                          <div className="space-y-0.5">
                            {String(card.sourceType).toLowerCase() === 'manual' && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  close();
                                  setEditingCard(card);
                                }}
                                className="rp-focus flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-rp-navy hover:bg-rp-muted"
                              >
                                <Pencil aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span>{tr('Chỉnh sửa')}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              disabled={removeMut.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                close();
                                handleRemoveCard(card);
                              }}
                              className="rp-focus flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-rp-danger hover:bg-rp-danger-bg/60 disabled:opacity-50"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                              <span>{tr('Xóa thẻ')}</span>
                            </button>
                          </div>
                        )}
                      </Popover>
                    </div>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${tr('Xem thẻ')}: ${card.term || ''}`}
                    onClick={() => {
                      if (window.getSelection?.()?.isCollapsed) setPreviewCard(card);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setPreviewCard(card);
                      }
                    }}
                    className="rp-focus flex min-w-0 flex-1 cursor-pointer select-text flex-col items-start rounded-xl text-left [overflow-wrap:anywhere]"
                  >
                    <p className="rp-jp max-w-full text-lg font-extrabold leading-6 text-rp-navy" lang="ja">
                      {card.term || '—'}
                    </p>
                    {card.reading && (
                      <p className="rp-jp mt-0.5 max-w-full text-xs font-semibold leading-5 text-rp-brand-strong" lang="ja">
                        {card.reading}
                      </p>
                    )}
                    <p className="mt-1 text-sm leading-5 text-rp-text-2">
                      {card.meaning || card.backText || '—'}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={Math.min(page, totalPages)}
              totalPages={totalPages}
              pageSize={LIBRARY_PAGE_SIZE}
              totalItems={totalCount}
              showPageSize={false}
              itemLabel="thẻ"
              onPageChange={setPage}
              className="rounded-2xl border border-rp-line"
            />
          )}
        </div>
      )}

      {createOpen && (
        <CreateSrsCardModal
          onClose={() => setCreateOpen(false)}
          onSaved={refreshAll}
        />
      )}

      {editingCard && (
        <CreateSrsCardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={refreshAll}
        />
      )}

      {/* Configured entry into the shared free-practice engine: the practice route creates the session once. */}
      <CreatePracticeModal
        key={practiceOpen ? 'open' : 'closed'}
        open={practiceOpen}
        onClose={() => setPracticeOpen(false)}
        defaultMode={preferredMode}
        totalActiveCards={totalActiveCards}
        submitting={practiceStarting}
        onStart={(config) => {
          if (practiceStarting) return;
          setPracticeStarting(true);
          navigate(`/daily-srs/practice/${config.studyMode}/`, {
            state: { practiceConfig: config, practiceNonce: Date.now() },
          });
        }}
      />

      <SrsCardPreviewModal
        open={Boolean(previewCard)}
        item={previewCard}
        title={previewCard?.term || tr('Chi tiết thẻ')}
        onClose={() => setPreviewCard(null)}
        footer={previewCard && (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="danger-soft"
              size="sm"
              icon={Trash2}
              loading={removeMut.isPending}
              onClick={() => handleRemoveCard(previewCard)}
            >
              {tr('Xóa thẻ')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewCard(null)}>
              {tr('Đóng')}
            </Button>
            {String(previewCard.sourceType).toLowerCase() === 'manual' ? (
              <Button type="button" variant="primary" size="sm" onClick={() => { setEditingCard(previewCard); setPreviewCard(null); }}>
                {tr('Chỉnh sửa')}
              </Button>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}

function CreateSrsCardModal({ card, onClose, onSaved }) {
  const { tr } = useLocale();
  const formId = useId();
  const [cardType, setCardType] = useState(normalizeSrsCardType(card?.cardType || card?.contentType || 'Vocabulary'));
  const [frontText, setFrontText] = useState(card?.term || card?.frontText || '');
  const [reading, setReading] = useState(card?.reading || '');
  const [meaning, setMeaning] = useState(card?.meaning || card?.backText || '');
  const [exampleSentence, setExampleSentence] = useState(card?.exampleSentence || '');
  const [exampleMeaning, setExampleMeaning] = useState(card?.exampleMeaning || '');
  const [showExamples, setShowExamples] = useState(Boolean(card?.exampleSentence || card?.exampleMeaning));
  const [submitted, setSubmitted] = useState(false);

  const trimmedFront = frontText.trim();
  const trimmedMeaning = meaning.trim();
  const frontError = submitted && !trimmedFront ? tr('Vui lòng nhập mặt trước') : undefined;
  const meaningError = submitted && !trimmedMeaning ? tr('Vui lòng nhập nghĩa') : undefined;

  const createMut = useMutation({
    mutationFn: () => {
      const nextExampleSentence = showExamples ? exampleSentence.trim() : '';
      const nextExampleMeaning = showExamples ? exampleMeaning.trim() : '';
      const fields = {
        cardType: cardType === 'Kanji' ? 'Kanji' : 'Vocabulary',
        frontText: trimmedFront,
        backText: trimmedMeaning,
        reading: reading.trim() || (card ? '' : undefined),
        meaning: trimmedMeaning,
        ...(card
          ? { exampleSentence: nextExampleSentence, exampleMeaning: nextExampleMeaning }
          : {
              ...(nextExampleSentence ? { exampleSentence: nextExampleSentence } : {}),
              ...(nextExampleMeaning ? { exampleMeaning: nextExampleMeaning } : {}),
            }),
      };
      return card ? updateSrsCard(card.reviewCardId, fields) : enrollSrsCard({
        sourceType: 'Manual',
        sourceLabel: 'Thẻ cá nhân',
        ...fields,
      });
    },
    onSuccess: async (outcome) => {
      await onSaved?.();
      if (outcome?.action === 'AlreadyExists' || outcome?.action === 'LinkedSource') {
        notify.info(tr('Thẻ này đã có trong Thẻ của tôi'));
      } else {
        notify.success(tr(card ? 'Đã cập nhật thẻ' : 'Đã tạo thẻ mới'));
      }
      onClose?.();
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được thẻ')),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (createMut.isPending) return;
    setSubmitted(true);
    if (!trimmedFront || !trimmedMeaning) return;
    createMut.mutate();
  }

  return (
    <Modal
      open
      onClose={createMut.isPending ? undefined : onClose}
      title={tr(card ? 'Chỉnh sửa thẻ' : 'Tạo thẻ mới')}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="md" disabled={createMut.isPending} onClick={onClose}>
            {tr('Hủy')}
          </Button>
          <Button type="submit" form={formId} variant="primary" size="md" loading={createMut.isPending} disabled={createMut.isPending}>
            {tr(card ? 'Lưu thay đổi' : 'Tạo thẻ')}
          </Button>
        </>
      )}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-3.5">
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
                  onClick={() => setCardType(opt.id)}
                  className={cx(
                    'rp-focus flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-colors',
                    cardType === opt.id
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
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
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
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="としょかん / すい・みず"
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Field label={tr('Nghĩa')} required error={meaningError}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder={tr('Ví dụ: Thư viện')}
              invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Checkbox
          checked={showExamples}
          onChange={(e) => setShowExamples(e.target.checked)}
          label={tr('Thêm câu ví dụ')}
        />
        {showExamples && (
          <div className="space-y-3 rounded-xl border border-[#EAE3E4] bg-[#FFFCF8] p-3">
            <Field label={tr('Câu ví dụ')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  placeholder="図書館で本を読みます。"
                />
              )}
            </Field>
            <Field label={tr('Dịch câu ví dụ')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={exampleMeaning}
                  onChange={(e) => setExampleMeaning(e.target.value)}
                  placeholder={tr('Tôi đọc sách ở thư viện.')}
                />
              )}
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}
