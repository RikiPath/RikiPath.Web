import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Layers, Plus } from 'lucide-react';
import { Button, notify } from '@/components/ui';
import {
  enrollSrsCard,
  previewEnrollSrsCard,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import { getSession } from '@/app/auth/session.js';
import { useLocale } from '@/locales/locale.js';

export default function SrsEnrollButton({
  vocabularyId = null,
  kanjiId = null,
  grammarPatternId = null,
  srsCardTemplateId = null,
  lessonId = null,
  cardType = 'Vocabulary',
  sourceType = 'Bank',
  sourceId = null,
  sourceLabel = null,
  frontText = '',
  backText = '',
  reading = '',
  meaning = '',
  jlptLevel = '',
  size = 'sm',
  variant = 'soft',
  className = '',
}) {
  const { tr } = useLocale();
  const queryClient = useQueryClient();
  const session = getSession();
  const signedIn = Boolean(session?.accessToken && !session?.isPreview);
  const [enrolledKey, setEnrolledKey] = useState(null);

  const entityKey = `${cardType}-${vocabularyId || ''}-${kanjiId || ''}-${grammarPatternId || ''}-${srsCardTemplateId || ''}`;

  const previewQuery = useQuery({
    queryKey: ['srs-preview', entityKey],
    queryFn: () =>
      previewEnrollSrsCard({
        vocabularyId: vocabularyId || undefined,
        kanjiId: kanjiId || undefined,
        grammarPatternId: grammarPatternId || undefined,
        srsCardTemplateId: srsCardTemplateId || undefined,
        lessonId: lessonId || undefined,
        cardType,
        sourceType,
        sourceId: sourceId || vocabularyId || kanjiId || grammarPatternId || srsCardTemplateId || undefined,
        sourceLabel: sourceLabel || undefined,
        frontText: frontText || undefined,
        backText: backText || meaning || undefined,
        reading: reading || undefined,
        meaning: meaning || backText || undefined,
        jlptLevel: jlptLevel || undefined,
      }),
    enabled: signedIn && Boolean(vocabularyId || kanjiId || grammarPatternId || srsCardTemplateId || frontText),
    staleTime: 60 * 1000,
    retry: false,
  });

  const enrollMut = useMutation({
    mutationFn: () =>
      enrollSrsCard({
        vocabularyId: vocabularyId || undefined,
        kanjiId: kanjiId || undefined,
        grammarPatternId: grammarPatternId || undefined,
        srsCardTemplateId: srsCardTemplateId || undefined,
        lessonId: lessonId || undefined,
        cardType,
        sourceType,
        sourceId: sourceId || vocabularyId || kanjiId || grammarPatternId || srsCardTemplateId || undefined,
        sourceLabel: sourceLabel || undefined,
        frontText: frontText || undefined,
        backText: backText || meaning || undefined,
        reading: reading || undefined,
        meaning: meaning || backText || undefined,
        jlptLevel: jlptLevel || undefined,
      }),
    onSuccess: async (res) => {
      setEnrolledKey(entityKey);
      if (res?.action === 'AlreadyExists') {
        notify.info(tr('Kiến thức này đã có trong Thẻ của tôi.'));
      } else if (res?.action === 'Reactivated') {
        notify.success(tr('Đã kích hoạt lại thẻ vào Thẻ của tôi.'));
      } else if (res?.action === 'LinkedSource') {
        notify.success(tr('Đã gắn thêm nguồn bài học vào thẻ hiện có.'));
      } else {
        notify.success(tr('Đã thêm vào Thẻ của tôi!'));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['srs-preview', entityKey] }),
        invalidateSrsAndCalendarCaches(queryClient),
      ]);
    },
    onError: (err) => notify.apiError(err, tr('Không thể thêm thẻ')),
  });

  if (!signedIn) return null;

  const previewCard = previewQuery.data?.card || previewQuery.data;
  const existingCardId = Number(previewCard?.reviewCardId || 0);
  const existingStatus = previewCard?.status;
  const isInactive = existingStatus === 'Deleted' || existingStatus === 'Archived' || existingStatus === 2;
  const alreadyActive =
    enrolledKey === entityKey ||
    (existingCardId > 0 && !isInactive);

  if (alreadyActive) {
    return (
      <Button
        type="button"
        variant="secondary"
        size={size}
        icon={Check}
        disabled
        className={className}
      >
        {tr('Đã thêm')}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      icon={existingStatus === 'Deleted' || existingStatus === 2 ? Layers : Plus}
      loading={enrollMut.isPending}
      className={className}
      onClick={() => enrollMut.mutate()}
    >
      {tr('Thêm thẻ')}
    </Button>
  );
}
