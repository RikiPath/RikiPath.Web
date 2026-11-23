import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Repeat, Search, Volume2 } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageContainer,
  SakuraLoader,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { getSession } from '@/app/auth/session.js';
import { bookmarkVocabulary, createNotebookList, getNotebookLists } from '@/features/notebook/api/notebookApi.js';
import { getVocabulary, searchVocabulary } from '@/features/content-author/api/sharedBankApi.js';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';
import SrsEnrollButton from '@/features/srs/components/SrsEnrollButton.jsx';

function speakJapanese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function VocabWordDetail() {
  const { tr } = useLocale();
  const client = useQueryClient();
  const navigate = useNavigate();
  const signedIn = Boolean(getSession()?.accessToken);
  const [params, setParams] = useSearchParams();
  const wordId = Number(params.get('id')) || 0;
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');

  const listsQuery = useQuery({
    queryKey: ['notebook-lists', getSession()?.userId ?? 'anon'],
    queryFn: getNotebookLists,
    enabled: signedIn && pickerOpen,
  });

  const save = useMutation({
    mutationFn: async (chosenListId) => {
      let learnerNoteId = chosenListId ? Number(chosenListId) : 0;
      if (!learnerNoteId) {
        const lists = await getNotebookLists();
        learnerNoteId = lists[0]?.id || (await createNotebookList({ name: 'Từ vựng' }))?.id;
      }
      return bookmarkVocabulary({ learnerNoteId, vocabularyId: wordId });
    },
    onSuccess: (res) => {
      setPickerOpen(false);
      if (res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Từ này đã có trong Sổ tay'), '', { key: 'vocab-bm-dup' });
      } else {
        notify.success(tr('Đã lưu từ vựng vào Sổ tay'), tr('Từ này đã được lưu vào Sổ tay cá nhân của bạn.'), {
          key: 'vocab-bm-ok',
          action: { label: tr('Mở sổ tay'), onClick: () => navigate('/kanji-notebook/') },
        });
      }
      client.invalidateQueries({ queryKey: ['notebook-lists'] });
      client.invalidateQueries({ queryKey: ['notebook-tree'] });
      client.invalidateQueries({ queryKey: ['notebook-saved-items'] });
    },
    onError: (err) => {
      const code = err?.data?.errorCode || err?.errorCode;
      notify.apiError(err, tr('Chưa lưu được từ'), code === 'SELF_STUDY_PACKAGE_REQUIRED' || err?.status === 403
        ? {
            action: {
              label: tr('Xem gói tự học'),
              onClick: () => navigate('/plans/', { state: { from: { pathname: '/vocabulary-detail/' }, requiredFeatureLabel: tr('Sổ tay cá nhân') } }),
            },
          }
        : undefined);
    },
  });

  const detailQuery = useQuery({
    queryKey: ['vocabulary', wordId],
    queryFn: () => getVocabulary(wordId),
    enabled: wordId > 0,
  });
  const searchQuery = useQuery({
    queryKey: ['vocabulary-search', submitted],
    queryFn: () => searchVocabulary(submitted),
    enabled: submitted.length > 0 && wordId === 0,
  });

  const word = detailQuery.data;
  const items = searchQuery.data?.items || [];
  const lists = listsQuery.data || [];

  const handleOpenSave = async () => {
    if (!signedIn) {
      navigate('/auth/');
      return;
    }
    const existingLists = await client.fetchQuery({
      queryKey: ['notebook-lists', getSession()?.userId ?? 'anon'],
      queryFn: getNotebookLists,
    }).catch(() => []);
    if (existingLists.length > 1) {
      setSelectedListId(String(existingLists[0].id));
      setPickerOpen(true);
    } else {
      save.mutate(existingLists[0]?.id || null);
    }
  };

  return (
    <LearnerShell breadcrumb={word?.word || tr('Chi tiết từ')}>
      <PageContainer width="reading" density="comfortable" className="space-y-4 text-rp-text">
        <IllustratedPageHeader
          icon="vocabulary"
          tone="mint"
          compact
          title={word?.word ? word.word : tr('Tra từ vựng tiếng Nhật')}
          description={tr('Xem cách đọc, nghĩa, ví dụ và lưu nhanh vào Sổ tay cá nhân.')}
          actions={
            <Button as={Link} to="/kanji-notebook/" variant="secondary" size="md" icon={ArrowLeft}>
              {tr('Về Sổ tay cá nhân')}
            </Button>
          }
        />

        <form
          role="search"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setParams({});
            setSubmitted(keyword.trim());
          }}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{tr('Tìm từ đã duyệt')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={tr('Tìm từ: chữ, cách đọc hoặc nghĩa')} className="pl-10" />
          </label>
          <Button type="submit" disabled={!keyword.trim()}>{tr('Tìm')}</Button>
        </form>

        <div className="mt-5 space-y-4">
          {wordId > 0 && detailQuery.isPending && <SakuraLoader variant="section" context="vocabulary" delay={160} />}
          {detailQuery.isError && <Card><ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} retrying={detailQuery.isFetching} /></Card>}

          {word && (
            <Card as="article" className="rp-anim-fade overflow-hidden p-0" aria-labelledby="word-title">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rp-line bg-tone-vocab-bg/60 px-6 py-6">
                <div className="min-w-0">
                  <p lang="ja" className="rp-jp text-sm font-medium text-tone-vocab">{word.reading}</p>
                  <h1 id="word-title" lang="ja" className="rp-kanji mt-1 text-[44px] font-semibold leading-tight text-rp-text">{word.word}</h1>
                  {word.jlptLevelName && <Badge tone="brand" icon={false} className="mt-2">JLPT {word.jlptLevelName}</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!word.audioUrl && (
                    <Button variant="secondary" size="sm" icon={Volume2} onClick={() => speakJapanese(word.word)}>
                      {tr('Nghe')}
                    </Button>
                  )}
                  <SrsEnrollButton
                    vocabularyId={word.id}
                    cardType="Vocabulary"
                    sourceType="VocabBank"
                    sourceId={word.id}
                    sourceLabel={word.word}
                    frontText={word.word}
                    backText={word.meaning}
                    reading={word.reading}
                    meaning={word.meaning}
                    jlptLevel={word.jlptLevelName}
                  />
                  <Button variant="soft" icon={Bookmark} loading={save.isPending} onClick={handleOpenSave}>
                    {signedIn ? tr('Lưu vào sổ') : tr('Đăng nhập để lưu')}
                  </Button>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                {!signedIn && (
                  <Banner tone="info" actions={<Button as={Link} to="/auth/" variant="primary" size="sm">{tr('Đăng nhập')}</Button>}>
                    {tr('Đăng nhập tài khoản để lưu từ vào Sổ tay cá nhân và ôn tập SRS.')}
                  </Banner>
                )}

                {word.audioUrl && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Phát âm chuẩn')}</h2>
                    <audio controls className="mt-2 w-full" src={word.audioUrl} />
                  </section>
                )}

                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Nghĩa')}</h2>
                  <p className="mt-1.5 text-[17px] leading-7 text-rp-text">
                    <HighlightableText
                      text={word.meaning}
                      contentId={`vocab-${word.id}-meaning`}
                      sourceTitle={word.word}
                    />
                  </p>
                </section>

                {word.exampleSentence && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">{tr('Ví dụ')}</h2>
                    <p lang="ja" className="rp-jp mt-1.5 rounded-rp-input border-l-4 border-tone-vocab bg-rp-bg-2 px-4 py-3 text-[16px] leading-8 text-rp-text">
                      <HighlightableText
                        text={word.exampleSentence}
                        contentId={`vocab-${word.id}-example`}
                        sourceTitle={word.word}
                      />
                    </p>
                  </section>
                )}

                <div className="flex flex-wrap gap-2 border-t border-rp-line pt-4">
                  <Link to="/daily-srs/">
                    <Button variant="secondary" size="sm" icon={Repeat}>{tr('Ôn tập SRS')}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {wordId === 0 && !submitted && (
            <Card><EmptyState variant="compact" illustration="flashcard" title={tr('Tìm một từ để xem chi tiết')} description={tr('Gõ chữ Hán, cách đọc hoặc nghĩa tiếng Việt.')} /></Card>
          )}
          {wordId === 0 && submitted && searchQuery.isPending && <SakuraLoader variant="section" context="vocabulary" delay={160} />}
          {wordId === 0 && searchQuery.isError && <Card><ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} retrying={searchQuery.isFetching} compact /></Card>}
          {wordId === 0 && searchQuery.isSuccess && items.length === 0 && (
            <Card><EmptyState variant="search" illustration="search" title={tr('Không tìm thấy từ phù hợp')} description={tr('Thử từ khóa khác hoặc cách viết bằng kana.')} /></Card>
          )}
          {items.length > 0 && wordId === 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setParams({ id: String(item.id) })}
                    className="rp-focus flex w-full items-center justify-between gap-4 rounded-rp-card border border-rp-line bg-rp-surface px-4 py-3 text-left transition-colors hover:border-rp-brand-border"
                  >
                    <span className="min-w-0">
                      <span lang="ja" className="rp-kanji text-[18px] font-semibold text-rp-text">{item.word}</span>
                      <span lang="ja" className="rp-jp ml-2 text-[13px] text-rp-text-muted">{item.reading}</span>
                    </span>
                    <span className="truncate text-[13px] text-rp-text-2">{item.meaning}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Modal
          open={pickerOpen}
          onClose={() => !save.isPending && setPickerOpen(false)}
          title="Chọn sổ từ để lưu"
          size="sm"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setPickerOpen(false)} disabled={save.isPending}>{tr('Hủy')}</Button>
              <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(selectedListId)}>
                {tr('Lưu vào sổ')}
              </Button>
            </>
          )}
        >
          <Field label="Sổ tay từ vựng">
            <CustomSelect
              value={selectedListId}
              onChange={setSelectedListId}
              options={lists.map((l) => ({ value: String(l.id), label: `${l.name} (${l.entryCount ?? 0})` }))}
            />
          </Field>
        </Modal>
      </PageContainer>
    </LearnerShell>
  );
}
