import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, Check, Eye, Plus, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  SakuraLoader,
  SearchInput,
  notify,
} from '@/components/ui';
import {
  enrollSrsCard,
  getPublishedSrsTemplates,
} from '@/features/srs/api/reviewApi.js';
import SrsCardPreviewModal from '@/features/srs/components/SrsCardPreviewModal.jsx';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import { formatSrsCardTypeLabel } from '@/features/srs/utils/srsLabels.js';
import { useLocale } from '@/locales/locale.js';

function ExampleContent({ exampleSentence, exampleMeaning, tr }) {
  if (!exampleSentence && !exampleMeaning) return null;
  return (
    <div className="space-y-1 rounded-xl border border-rp-line bg-[#FFFCF8] px-3 py-2.5">
      <p className="text-xs font-semibold text-rp-text-muted">{tr('Câu ví dụ')}</p>
      {exampleSentence && (
        <p className="rp-jp text-sm font-semibold text-rp-navy [overflow-wrap:anywhere]" lang="ja">
          {exampleSentence}
        </p>
      )}
      {exampleMeaning && (
        <p className="text-xs text-rp-text-muted [overflow-wrap:anywhere]">{exampleMeaning}</p>
      )}
    </div>
  );
}

export default function SrsTemplateCatalogTab() {
  const { tr } = useLocale();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [previewTpl, setPreviewTpl] = useState(null);

  const templatesQuery = useQuery({
    queryKey: ['srs-published-templates', { typeFilter, search }],
    queryFn: () =>
      getPublishedSrsTemplates({
        cardType: typeFilter,
        search,
      }),
  });

  const enrollMut = useMutation({
    mutationFn: (tpl) =>
      enrollSrsCard({
        srsCardTemplateId: tpl.id,
        cardType: tpl.cardType || 'Vocabulary',
        sourceType: 'SrsTemplate',
        sourceId: tpl.id,
      }),
    onSuccess: async (res) => {
      const msg =
        res?.action === 'LinkedSource'
          ? 'Thẻ này đã được liên kết với Thẻ của tôi.'
          : 'Đã thêm vào Thẻ của tôi.';
      notify.success(tr(msg));
      await queryClient.invalidateQueries({ queryKey: ['srs-published-templates'] });
      await invalidateSrsAndCalendarCaches(queryClient);
    },
    onError: (err) => notify.apiError(err, tr('Không thể thêm thẻ')),
  });

  const items = templatesQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-rp-line bg-rp-surface p-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder={tr('Tìm thẻ mẫu...')}
            />
          </div>
          <CustomSelect
            fitContent
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            className="min-w-[132px]"
            options={[
              { value: '', label: tr('Mọi loại thẻ') },
              { value: 'Vocabulary', label: tr('Từ vựng') },
              { value: 'Kanji', label: tr('Kanji') },
            ]}
          />
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
          <Sparkles className="h-3.5 w-3.5 text-rp-brand-strong" />
          {tr('Thẻ mẫu chỉ vào lịch ôn khi bạn chủ động chọn thêm')}
        </span>
      </div>

      {templatesQuery.isLoading ? (
        <SakuraLoader variant="section" context="srs" />
      ) : templatesQuery.isError ? (
        <Card className="border-[#EAE3E4] bg-white">
          <ContextualErrorState
            compact
            error={templatesQuery.error}
            title={tr('Chưa tải được danh sách thẻ mẫu')}
            onRetry={() => templatesQuery.refetch()}
            retrying={templatesQuery.isFetching}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-[#EAE3E4] bg-white">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            context="srs"
            illustration={search.trim() || typeFilter ? 'search' : 'flashcard'}
            title={search.trim() || typeFilter ? tr('Không tìm thấy kết quả phù hợp.') : tr('Chưa có thẻ mẫu phù hợp')}
            description={
              search.trim() || typeFilter
                ? tr('Hãy thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ thẻ mẫu.')
                : tr('Các thẻ mẫu có sẵn sẽ xuất hiện tại đây để bạn chọn thêm.')
            }
            action={(search.trim() || typeFilter) ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((tpl) => {
            const isEnrolled = Boolean(tpl.alreadyEnrolled);
            const isBusy = enrollMut.isPending && enrollMut.variables?.id === tpl.id;
            return (
              <Card
                key={tpl.id}
                padding="md"
                className="flex flex-col justify-between gap-3 border border-[#EAE3E4] bg-white hover:border-rp-brand-border transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand" size="sm" icon={false}>
                        {formatSrsCardTypeLabel(tpl.cardType, tr)}
                      </Badge>
                    </div>
                    {isEnrolled && (
                      <Badge tone="success" size="sm" icon={Check}>
                        {tr('Đã thêm')}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="rp-jp text-xl font-extrabold text-rp-navy" lang="ja">
                      {tpl.frontText}
                    </p>
                    {tpl.reading && (
                      <p className="rp-jp mt-0.5 text-xs font-semibold text-rp-brand-strong" lang="ja">
                        {tpl.reading}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium text-rp-text-2">
                      {tpl.meaning || tpl.backText}
                    </p>
                  </div>

                  <ExampleContent
                    exampleSentence={tpl.exampleSentence}
                    exampleMeaning={tpl.exampleMeaning}
                    tr={tr}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-rp-line/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => setPreviewTpl(tpl)}
                  >
                    {tr('Xem trước')}
                  </Button>
                  {isEnrolled ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled
                      icon={BookOpenCheck}
                    >
                      {tr('Đã thêm')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      loading={isBusy}
                      onClick={() => enrollMut.mutate(tpl)}
                    >
                      {tr('Thêm thẻ')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SrsCardPreviewModal
        open={Boolean(previewTpl)}
        item={previewTpl}
        title={previewTpl?.frontText || tr('Xem trước thẻ mẫu')}
        onClose={() => setPreviewTpl(null)}
        footer={previewTpl && (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewTpl(null)}>
              {tr('Đóng')}
            </Button>
            {previewTpl.alreadyEnrolled ? (
              <Button type="button" variant="secondary" size="sm" disabled icon={BookOpenCheck}>
                {tr('Đã thêm')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Plus}
                loading={enrollMut.isPending && enrollMut.variables?.id === previewTpl.id}
                onClick={() => {
                  enrollMut.mutate(previewTpl, { onSuccess: () => setPreviewTpl(null) });
                }}
              >
                {tr('Thêm thẻ')}
              </Button>
            )}
          </>
        )}
      />

    </div>
  );
}
