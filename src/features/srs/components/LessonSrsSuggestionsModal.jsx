import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Layers, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Modal,
  SakuraLoader,
  cx,
  notify,
} from '@/components/ui';
import {
  batchEnrollSrsCards,
  getLessonSrsSuggestions,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import { useLocale } from '@/locales/locale.js';

const TYPE_LABEL = {
  Vocabulary: 'Từ vựng',
  Kanji: 'Kanji',
  Grammar: 'Ngữ pháp',
};

export default function LessonSrsSuggestionsModal({
  open,
  onClose,
  lessonId,
  initialSuggestions = null,
  lessonTitle = '',
}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const suggestionsQuery = useQuery({
    queryKey: ['lesson-srs-suggestions', lessonId],
    queryFn: () => getLessonSrsSuggestions(lessonId),
    enabled: Boolean(open && lessonId),
  });

  const items = useMemo(
    () => ((suggestionsQuery.data && suggestionsQuery.data.length > 0)
      ? suggestionsQuery.data
      : (initialSuggestions || [])),
    [suggestionsQuery.data, initialSuggestions],
  );

  const [deselectedKeys, setDeselectedKeys] = useState({});
  const selectableItems = useMemo(() => items.filter((i) => !i.alreadyEnrolled), [items]);
  const selectedKeys = useMemo(
    () => selectableItems.filter((i) => !deselectedKeys[i.suggestedKey]).map((i) => i.suggestedKey),
    [selectableItems, deselectedKeys],
  );

  const batchMut = useMutation({
    mutationFn: (cards) => batchEnrollSrsCards(cards),
    onSuccess: async (res) => {
      const added = Number(res?.createdCount || 0) + Number(res?.reactivatedCount || 0) + Number(res?.linkedCount || 0);
      notify.success(
        added > 0
          ? trf('Đã thêm {0} thẻ mới vào Thẻ của tôi.', { 0: added })
          : tr('Các thẻ đã chọn đều đã có trong Thẻ của tôi.'),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lesson-srs-suggestions', lessonId] }),
        invalidateSrsAndCalendarCaches(queryClient),
      ]);
      onClose?.();
    },
    onError: (err) => notify.apiError(err, tr('Không thể thêm thẻ gợi ý')),
  });

  function toggleKey(key) {
    setDeselectedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAll() {
    if (selectedKeys.length === selectableItems.length) {
      const next = {};
      for (const i of selectableItems) next[i.suggestedKey] = true;
      setDeselectedKeys(next);
    } else {
      setDeselectedKeys({});
    }
  }

  function handleSaveSelected() {
    const picked = items
      .filter((i) => selectedKeys.includes(i.suggestedKey) && !i.alreadyEnrolled)
      .map((i) => ({
        vocabularyId: i.vocabularyId || undefined,
        kanjiId: i.kanjiId || undefined,
        grammarPatternId: i.grammarPatternId || undefined,
        srsCardTemplateId: i.srsCardTemplateId || undefined,
        lessonId: i.lessonId || lessonId || undefined,
        cardType: i.cardType || 'Vocabulary',
        sourceType: i.sourceType || 'Lesson',
        sourceId: i.sourceId || lessonId || undefined,
        sourceLabel: i.sourceLabel || lessonTitle || undefined,
        frontText: i.frontText,
        backText: i.backText,
        reading: i.reading || undefined,
        meaning: i.meaning || undefined,
        exampleSentence: i.exampleSentence || undefined,
        exampleMeaning: i.exampleMeaning || undefined,
        audioUrl: i.audioUrl || undefined,
      }));
    if (picked.length === 0) return;
    batchMut.mutate(picked);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr('Thẻ gợi ý từ bài học')}
      description={
        lessonTitle
          ? trf('Chọn những kiến thức trong bài “{0}” mà bạn muốn đưa vào bộ thẻ ôn tập.', { 0: tr(lessonTitle) })
          : tr('Chọn kiến thức bạn muốn đưa vào bộ thẻ ôn tập.')
      }
      size="lg"
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr('Để sau')}
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={Layers}
            disabled={selectedKeys.length === 0 || batchMut.isPending}
            loading={batchMut.isPending}
            onClick={handleSaveSelected}
          >
            {trf('Thêm {0} thẻ', { 0: selectedKeys.length })}
          </Button>
        </>
      )}
    >
      {suggestionsQuery.isLoading && items.length === 0 ? (
        <SakuraLoader variant="inline" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-6 text-center text-sm text-rp-text-muted">
          {tr('Bài học này chưa có thẻ từ vựng, Hán tự hay ngữ pháp khả dụng để gợi ý.')}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE3E4] bg-[#FFFCF8] px-3.5 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-rp-navy">
              <Sparkles className="h-3.5 w-3.5 text-rp-brand-strong" />
              {trf('{0} mục gợi ý · {1} mục mới', { 0: items.length, 1: selectableItems.length })}
            </span>
            {selectableItems.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="rp-link rp-underline font-bold"
              >
                {selectedKeys.length === selectableItems.length ? tr('Bỏ chọn tất cả') : tr('Chọn tất cả thẻ mới')}
              </button>
            )}
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => {
              const checked = selectedKeys.includes(item.suggestedKey);
              return (
                <label
                  key={item.suggestedKey}
                  className={cx(
                    'flex items-start gap-3 rounded-2xl border p-3 transition-colors',
                    item.alreadyEnrolled
                      ? 'border-emerald-200 bg-emerald-50/40 opacity-80'
                      : checked
                        ? 'cursor-pointer border-rp-brand-border bg-[#FFF9FA]'
                        : 'cursor-pointer border-[#EAE3E4] bg-white hover:bg-[#FFFCF8]',
                  )}
                >
                  <input
                    type="checkbox"
                    disabled={item.alreadyEnrolled}
                    checked={item.alreadyEnrolled || checked}
                    onChange={() => toggleKey(item.suggestedKey)}
                    className="mt-1 h-4 w-4 accent-rp-brand-strong"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand" size="sm" icon={false}>
                        {tr(TYPE_LABEL[item.cardType] || item.cardType)}
                      </Badge>
                      {item.alreadyEnrolled && (
                        <Badge tone="success" size="sm" icon={Check}>
                          {tr('Đã thêm')}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="rp-jp text-base font-extrabold text-rp-navy" lang="ja">
                        {item.frontText}
                      </span>
                      {item.reading && (
                        <span className="rp-jp text-xs font-semibold text-rp-brand-strong" lang="ja">
                          {item.reading}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-rp-text-2">{item.meaning || item.backText}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
