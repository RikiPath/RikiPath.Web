import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  deleteSrsCard,
  enrollSrsCard,
  getSrsCardById,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import { Button, Checkbox, Collapsible, CustomSelect, Input, Modal, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function SelectionSrsModal({ request, onClose }) {
  const { tr } = useLocale();
  const queryClient = useQueryClient();

  const reqKey = request
    ? `${request.linkedReviewCardId || ''}|${request.selectedText || ''}|${request.highlightId || ''}`
    : '';

  const lookupQuery = useQuery({
    queryKey: ['selection-srs-lookup', reqKey],
    queryFn: () => getSrsCardById(request.linkedReviewCardId),
    enabled: Boolean(request?.linkedReviewCardId),
    retry: false,
    staleTime: 30 * 1000,
  });

  const [overrideCard, setOverrideCard] = useState(null);
  const [draft, setDraft] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const examplesId = useId();

  const existingCard =
    overrideCard?.key === reqKey ? overrideCard.card : (lookupQuery.data || null);

  const activeDraft = useMemo(() => {
    const base = {
      cardType: 'Vocabulary',
      frontText: request?.selectedText || '',
      reading: request?.reading || '',
      meaning: request?.meaning || '',
      exampleSentence: '',
      exampleMeaning: '',
    };
    return draft?.key === reqKey ? { ...base, ...draft.fields } : base;
  }, [request, draft, reqKey]);

  const setField = (field, value) => {
    setDraft((prev) => ({
      key: reqKey,
      fields: {
        ...(prev?.key === reqKey ? prev.fields : {}),
        [field]: value,
      },
    }));
  };

  const invalidate = async () => {
    await invalidateSrsAndCalendarCaches(queryClient);
    await queryClient.invalidateQueries({ queryKey: ['learner-highlights'] });
    await queryClient.invalidateQueries({ queryKey: ['selection-srs-lookup', reqKey] });
  };

  const enrollMutation = useMutation({
    mutationFn: () => {
      const payload = {
        sourceType: request?.sourceType || 'Reading',
        sourceLabel: request?.sourceTitle || 'Tài liệu học tập',
        lessonId: request?.lessonId || undefined,
        cardType: activeDraft.cardType === 'Kanji' ? 'Kanji' : 'Vocabulary',
        frontText: activeDraft.frontText.trim(),
        backText: activeDraft.meaning.trim(),
        reading: activeDraft.reading.trim() || undefined,
        meaning: activeDraft.meaning.trim(),
        ...(showExamples && activeDraft.exampleSentence.trim() ? { exampleSentence: activeDraft.exampleSentence.trim() } : {}),
        ...(showExamples && activeDraft.exampleMeaning.trim() ? { exampleMeaning: activeDraft.exampleMeaning.trim() } : {}),
      };
      return enrollSrsCard(payload);
    },
    onSuccess: async (outcome) => {
      setOverrideCard({ key: reqKey, card: outcome?.card || null });
      notify.success(
        outcome?.action === 'Reactivated'
          ? tr('Đã kích hoạt lại thẻ vào Thẻ của tôi')
          : outcome?.action === 'AlreadyExists' || outcome?.action === 'LinkedSource'
            ? tr('Thẻ đã có trong Thẻ của tôi')
            : tr('Đã thêm vào Thẻ của tôi'),
        '',
        { key: 'sel-srs-enroll', replace: true },
      );
      await Promise.allSettled([invalidate()]);
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được thẻ')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSrsCard(existingCard.reviewCardId),
    onSuccess: async () => {
      setOverrideCard({ key: reqKey, card: null });
      notify.success(tr('Đã xóa thẻ khỏi Thẻ của tôi'), '', { key: 'sel-srs-delete', replace: true });
      onClose?.();
      await Promise.allSettled([invalidate()]);
    },
    onError: (err) => notify.apiError(err, tr('Chưa xóa được thẻ')),
  });

  if (!request) return null;

  const lookupLoading = Boolean(request?.linkedReviewCardId) && lookupQuery.isLoading;

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title={existingCard ? tr('Đã thêm') : tr('Thêm thẻ')}
      size="md"
    >
      {lookupLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-rp-text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-rp-brand-strong" />
          <span>{tr('Đang kiểm tra thẻ & từ điển…')}</span>
        </div>
      ) : existingCard ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {tr('Đã thêm')}
              </span>
            </div>
            <p className="rp-jp mt-3 text-2xl font-bold text-rp-navy">{existingCard.term}</p>
            {existingCard.reading && <p className="rp-jp mt-1 text-sm font-semibold text-rp-brand-strong">{existingCard.reading}</p>}
            <p className="mt-2 text-sm text-rp-text-2">{existingCard.meaning || existingCard.backText}</p>
            {existingCard.exampleSentence && (
              <p className="rp-jp mt-2 border-t border-[#EAE3E4] pt-2 text-xs text-rp-text-muted">{existingCard.exampleSentence}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="danger-soft"
              size="sm"
              icon={Trash2}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {tr('Xóa thẻ')}
            </Button>
            <Button as={Link} to="/daily-srs/library/" variant="primary" size="sm" icon={Eye}>
              {tr('Mở Thẻ của tôi')}
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (activeDraft.frontText.trim().length > 500) {
              notify.warning(tr('Mặt trước quá dài'), tr('Vui lòng rút ngắn còn tối đa 500 ký tự.'));
              return;
            }
            if (!activeDraft.frontText.trim() || !activeDraft.meaning.trim()) {
              notify.warning(tr('Thiếu nội dung mặt trước hoặc nghĩa'), tr('Vui lòng điền đủ cả hai trước khi tạo thẻ.'));
              return;
            }
            if (!enrollMutation.isPending) enrollMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <CustomSelect
            size="sm"
            label={tr('Loại thẻ')}
            value={activeDraft.cardType}
            onChange={(val) => setField('cardType', val)}
            options={[
              { value: 'Vocabulary', label: tr('Từ vựng') },
              { value: 'Kanji', label: tr('Kanji') },
            ]}
          />
          <div>
            <Input
              label={tr('Mặt trước')}
              required
              invalid={activeDraft.frontText.length > 500}
              value={activeDraft.frontText}
              onChange={(e) => setField('frontText', e.target.value)}
              maxLength={500}
            />
            {activeDraft.frontText.length > 500 && <p className="mt-1 text-xs text-rp-danger">{tr('Vui lòng rút ngắn còn tối đa 500 ký tự.')}</p>}
          </div>
          <Input
            label={tr('Cách đọc')}
            value={activeDraft.reading}
            onChange={(e) => setField('reading', e.target.value)}
            maxLength={300}
            placeholder="がっこう"
          />
          <Input
            label={tr('Nghĩa')}
            required
            value={activeDraft.meaning}
            onChange={(e) => setField('meaning', e.target.value)}
            maxLength={500}
            placeholder={tr('Nhập nghĩa tiếng Việt…')}
          />
          <div>
            <Checkbox label={tr('Thêm câu ví dụ')} checked={showExamples} onChange={(e) => setShowExamples(e.target.checked)} aria-controls={examplesId} />
            <Collapsible open={showExamples} id={examplesId} innerClassName="pt-3.5">
              <div className="space-y-3.5">
                <Input
                  label={tr('Câu ví dụ')}
                  value={activeDraft.exampleSentence}
                  onChange={(e) => setField('exampleSentence', e.target.value)}
                  maxLength={1000}
                  placeholder="毎日日本語を勉強しています。"
                />
                <Input
                  label={tr('Dịch câu ví dụ')}
                  value={activeDraft.exampleMeaning}
                  onChange={(e) => setField('exampleMeaning', e.target.value)}
                  maxLength={1000}
                  placeholder={tr('Mỗi ngày tôi đều học tiếng Nhật.')}
                />
              </div>
            </Collapsible>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              {tr('Hủy')}
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={enrollMutation.isPending} disabled={enrollMutation.isPending || activeDraft.frontText.trim().length > 500}>
              {tr('Thêm thẻ')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
