import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExternalLink, Volume2 } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Button,
  ContextualErrorState,
  EmptyState,
  SakuraLoader,
  SearchInput,
  notify,
} from '@/components/ui';
import { searchVocabulary } from '@/features/content-author/api/sharedBankApi.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';

const VOCAB_SAMPLES = ['さくら', '勉強', '日本語', '駅', '約束'];

function speakJapanese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * Shared-bank Vocabulary search & save panel integrated directly into Sổ tay cá nhân.
 * Preserves published vocabulary lookup, audio playback, detail navigation, and SRS enrollment.
 */
export default function NotebookVocabLookupSection({
  nb,
  activeNotePage,
  notePages,
  enrollSrs = false,
  onBackToWorkspace,
}) {
  const { tr } = useLocale();
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');

  const vocabSearchQuery = useQuery({
    queryKey: ['notebook-vocab-search', submitted],
    queryFn: () => searchVocabulary(submitted),
    enabled: submitted.length > 0,
  });

  const savedVocabIds = useMemo(
    () => new Set(nb.allEntries.map((e) => e.vocabularyId).filter(Boolean)),
    [nb.allEntries],
  );

  const saveVocabBookmark = useMutation({
    mutationFn: async (vocabItem) => {
      const targetId = activeNotePage?.id || notePages[0]?.id || null;
      if (nb.addSavedItem) {
        return nb.addSavedItem.mutateAsync({
          notebookPageId: targetId,
          vocabularyId: vocabItem.id,
          itemKind: 'vocabulary',
          word: vocabItem.word,
          reading: vocabItem.reading || '',
          meaning: vocabItem.meaning || '',
          enrollSrs: Boolean(enrollSrs),
        });
      }
      return nb.quickSaveCapture.mutateAsync({
        targetPageId: targetId,
        kind: 'vocabulary',
        term: vocabItem.word,
        reading: vocabItem.reading || '',
        meaning: vocabItem.meaning || '',
        vocabularyId: vocabItem.id,
        enrollSrs: Boolean(enrollSrs),
      });
    },
    onSuccess: (res) => {
      if (res?.isAlreadyExisting || res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Từ này đã có trong Sổ tay'), '', { key: 'nb-vocab-dup' });
      } else {
        notify.success(tr('Đã lưu từ vựng vào Sổ tay'), '', { key: 'nb-vocab-save' });
      }
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được từ vựng')),
  });

  const items = vocabSearchQuery.data?.items || [];

  return (
    <section className="space-y-4 rounded-2xl border border-rp-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-rp-text">{tr('Tra cứu & lưu từ vựng từ kho dùng chung')}</h2>
          <p className="text-[12.5px] text-rp-text-muted">
            {tr('Tìm từ theo mặt chữ, cách đọc hoặc nghĩa rồi lưu thẳng vào trang Sổ tay hiện tại.')}
          </p>
        </div>
        {onBackToWorkspace && (
          <Button type="button" variant="secondary" size="sm" onClick={onBackToWorkspace}>
            {tr('Đóng')}
          </Button>
        )}
      </div>

      <form
        className="flex flex-wrap items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(keyword.trim());
        }}
      >
        <div className="min-w-[200px] flex-1">
          <SearchInput
            value={keyword}
            onChange={(e) => setKeyword(typeof e === 'string' ? e : (e?.target?.value ?? ''))}
            onClear={() => {
              setKeyword('');
              setSubmitted('');
            }}
            aria-label={tr('Tìm từ vựng')}
            placeholder={tr('Tìm từ: chữ Kanji, Hiragana/Katakana hoặc nghĩa tiếng Việt…')}
          />
        </div>
        <Button type="submit" variant="primary" size="md" disabled={!keyword.trim()}>
          {tr('Tìm')}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-rp-text-muted">{tr('Gợi ý')}:</span>
        {VOCAB_SAMPLES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setKeyword(sample);
              setSubmitted(sample);
            }}
            className="rp-focus h-7.5 rounded-full bg-rp-brand-tint px-3 text-[13px] font-semibold text-rp-brand-strong hover:bg-rp-brand-soft"
          >
            {sample}
          </button>
        ))}
      </div>

      {!submitted && (
        <EmptyState
          variant="compact"
          illustration="flashcard"
          title={tr('Nhập từ khóa để tra từ vựng đã xuất bản')}
          description={tr('Kết quả có phát âm, ví dụ câu và nút lưu thẳng vào trang Sổ tay hiện tại.')}
        />
      )}

      {submitted && vocabSearchQuery.isPending && (
        <SakuraLoader variant="section" context="vocabulary" delay={140} />
      )}

      {vocabSearchQuery.isError && (
        <ContextualErrorState
          variant="inline"
          compact
          error={vocabSearchQuery.error}
          title={tr('Chưa tải được dữ liệu từ vựng')}
          onRetry={() => vocabSearchQuery.refetch()}
          retrying={vocabSearchQuery.isFetching}
        />
      )}

      {vocabSearchQuery.isSuccess && items.length === 0 && (
        <EmptyState
          variant="search"
          illustration="search"
          title={tr('Không tìm thấy từ phù hợp')}
          description={tr('Thử từ khóa khác hoặc cách viết bằng kana.')}
        />
      )}

      {vocabSearchQuery.isSuccess && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const stored = savedVocabIds.has(item.id);
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-rp-line bg-white p-4 transition-colors hover:border-rp-brand-border"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {item.reading && (
                        <p lang="ja" className="truncate text-[11.5px] font-medium text-rp-brand-strong">
                          {item.reading}
                        </p>
                      )}
                      <Link
                        to={`/vocabulary-detail/?id=${item.id}`}
                        className="rp-focus rp-kanji block truncate text-[22px] font-bold leading-snug text-rp-text hover:text-rp-brand-strong"
                      >
                        {item.word}
                      </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.jlptLevelName && (
                        <Badge tone="brand" icon={false} size="sm">
                          {formatJlptLevel(item.jlptLevelName)}
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => speakJapanese(item.word)}
                        aria-label={`${tr('Nghe')} ${item.word}`}
                        className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rp-line text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                      >
                        <Volume2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-[13px] text-rp-text-2">{item.meaning}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-2.5">
                  <Link
                    to={`/vocabulary-detail/?id=${item.id}`}
                    className="rp-focus rp-link inline-flex items-center gap-1 text-[12px] font-semibold"
                  >
                    <span>{tr('Xem chi tiết')}</span>
                    <ExternalLink aria-hidden="true" className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    disabled={stored || saveVocabBookmark.isPending}
                    onClick={() => saveVocabBookmark.mutate(item)}
                    className={`rp-focus h-7.5 rounded-full px-3 text-[11.5px] font-semibold transition-colors ${
                      stored
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'border border-rp-brand-border bg-rp-brand-tint/60 text-rp-brand-strong hover:bg-rp-brand-tint'
                    }`}
                  >
                    {stored ? tr('Đã có trong sổ') : tr('Lưu từ')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
