import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Flame,
  Keyboard,
  Layers,
  Layers3,
  ListChecks,
  Play,
  Settings2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import {
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  Input,
  Modal,
  PageContainer,
  SakuraLoader,
  Switch,
  confirmAction,
  notify,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { formatSrsCardTypeLabel, formatSrsStudyMode } from '@/features/srs/utils/srsLabels.js';
import { LearnerShell } from '@/layouts';
import {
  abandonSrsSession,
  getActiveSrsSession,
  getDailyReviewQueue,
  getSrsPreferences,
  getSrsSummary,
  startSrsSession,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import SrsReviewPlayer from '@/features/srs/components/SrsReviewPlayer.jsx';
import SrsCardLibraryTab from '@/features/srs/components/SrsCardLibraryTab.jsx';
import SrsTemplateCatalogTab from '@/features/srs/components/SrsTemplateCatalogTab.jsx';
import SrsProgressAnalyticsTab from '@/features/srs/components/SrsProgressAnalyticsTab.jsx';
import SrsPreferencesModal from '@/features/srs/components/SrsPreferencesModal.jsx';
import StartReviewSessionModal from '@/features/srs/components/StartReviewSessionModal.jsx';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const MODE_META = {
  flip: { label: 'Lật thẻ', icon: Layers3, clayIcon: 'srs_flip', description: 'Lật thẻ để ghi nhớ kiến thức.' },
  typing: { label: 'Gõ đáp án', icon: Keyboard, clayIcon: 'srs_typing', description: 'Nhập câu trả lời để kiểm tra trí nhớ.' },
  mcq: { label: 'Trắc nghiệm', icon: ListChecks, clayIcon: 'srs_mcq', description: 'Chọn đáp án đúng để ôn tập.' },
  mixed: { label: 'Hỗn hợp', icon: Shuffle, clayIcon: 'srs_mixed', description: 'Kết hợp nhiều cách ôn trong một phiên.' },
};
const VALID_MODES = new Set(['flip', 'typing', 'mcq', 'mixed']);
const DUE_PREVIEW_LIMIT = 60;

function normalizeMode(value, fallback = 'flip') {
  const key = String(value || '').trim().toLowerCase();
  if (VALID_MODES.has(key)) return key;
  return VALID_MODES.has(fallback) ? fallback : 'flip';
}

function isResumable(session) {
  return Boolean(
    session
    && session.status !== 'Completed'
    && session.status !== 'Abandoned'
    && !session.isFinished
    && !session.isExpired
    && (session.pendingItems || []).length > 0,
  );
}

/**
 * Learner SRS with two independent flows:
 * - Scheduled review (`/daily-srs/due`): the server picks due cards; results update the SRS schedule.
 * - Free practice (`/daily-srs/practice/:mode`): any active personal card, opens straight into the player,
 *   never changes due dates / SM-2 / review history (backend `SessionKind = Practice`).
 * The two session kinds are stored separately, so one never blocks or overwrites the other.
 */
export default function DailySRS({ section = 'today' }) {
  const { pathname } = useLocation();
  const { mode: routeMode } = useParams();
  const [searchParams] = useSearchParams();
  const { tr } = useLocale();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const prefQuery = useQuery({ queryKey: ['srs-preferences'], queryFn: getSrsPreferences, staleTime: 0 });
  const preferredMode = normalizeMode(prefQuery.data?.preferredReviewMode, 'flip');

  // Legacy URLs keep their old meaning (scheduled review by mode) by landing on the due page.
  if (section === 'mode' || section === 'progress') {
    const resume = searchParams.get('resume') === '1';
    if (section === 'progress') return <Navigate to="/daily-srs/#srs-progress" replace />;
    return <Navigate to={resume ? '/daily-srs/due/?resume=1' : '/daily-srs/due/'} replace />;
  }

  const breadcrumb = section === 'due'
    ? tr('Ôn thẻ đến hạn')
    : section === 'practice'
      ? tr(MODE_META[normalizeMode(routeMode)].label)
      : section === 'library'
        ? tr('Thẻ của tôi')
        : section === 'templates'
          ? tr('Thư viện thẻ mẫu')
          : tr('Tổng quan');

  return (
    <LearnerShell pathname={pathname} breadcrumb={breadcrumb}>
      <PageContainer data-page="DailySRS" width="default" density="comfortable" className="space-y-5 pb-24 text-rp-text sm:pb-20">
        {section === 'today' && <OverviewView onOpenPrefs={() => setPrefsOpen(true)} />}
        {section === 'due' && <DueReviewView prefQuery={prefQuery} preferredMode={preferredMode} onOpenPrefs={() => setPrefsOpen(true)} />}
        {section === 'practice' && (
          <FreePracticeView key={normalizeMode(routeMode)} mode={normalizeMode(routeMode)} prefQuery={prefQuery} />
        )}
        {section === 'library' && (
          <>
            <IllustratedPageHeader
              icon="srs"
              tone="lavender"
              eyebrow={tr('Ôn tập cách quãng · Đúng thời điểm')}
              title={tr('Thẻ của tôi')}
              description={tr('Quản lý những thẻ bạn đã lưu và tự tạo.')}
              actions={<SettingsButton onClick={() => setPrefsOpen(true)} />}
            />
            <LibraryRoute preferredMode={preferredMode} />
          </>
        )}
        {section === 'templates' && (
          <>
            <IllustratedPageHeader
              icon="srs"
              tone="lavender"
              eyebrow={tr('Ôn tập cách quãng · Đúng thời điểm')}
              title={tr('Thư viện thẻ mẫu')}
              description={tr('Khám phá và thêm thẻ có sẵn vào bộ thẻ của bạn.')}
            />
            <SrsTemplateCatalogTab />
          </>
        )}
        <SrsPreferencesModal open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      </PageContainer>
    </LearnerShell>
  );
}

function SettingsButton({ onClick }) {
  const { tr } = useLocale();
  return (
    <Button type="button" variant="secondary" icon={SlidersHorizontal} onClick={onClick}>
      {tr('Cài đặt')}
    </Button>
  );
}

function LibraryRoute({ preferredMode }) {
  const navigate = useNavigate();
  return <SrsCardLibraryTab preferredMode={preferredMode} onBrowseTemplates={() => navigate('/daily-srs/templates/')} />;
}

/* ------------------------------------------------------------------ Shared: scheduled session state */

function useScheduledSession() {
  const { tr } = useLocale();
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({ queryKey: ['srs-summary'], queryFn: getSrsSummary });
  const activeQuery = useQuery({ queryKey: ['srs-active-session'], queryFn: () => getActiveSrsSession('Scheduled') });
  const resumable = isResumable(activeQuery.data) ? activeQuery.data : null;

  const abandonMut = useMutation({
    mutationFn: (sessionKey) => abandonSrsSession(sessionKey),
    onSuccess: async () => {
      notify.info(tr('Đã hủy phiên ôn cũ.'));
      await invalidateSrsAndCalendarCaches(queryClient);
    },
    onError: (err) => notify.apiError(err, tr('Không thể hủy phiên ôn')),
  });

  return { summaryQuery, activeQuery, resumable, abandonMut };
}

function ResumeBanner({ resumable, onResume, onAbandon, abandoning }) {
  const { tr, trf } = useLocale();
  if (!resumable) return null;
  return (
    <Banner tone="info" title={tr('Bạn có một phiên ôn tập đang dở')}>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-rp-text-2">
          {trf('Chế độ {0} · Còn {1} thẻ chưa hoàn thành ({2}/{3} đã xong).', {
            0: formatSrsStudyMode(resumable.studyMode, tr),
            1: resumable.pendingItems.length,
            2: (resumable.completedCardIds || []).length,
            3: resumable.totalInitialCards || 0,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" icon={Trash2} loading={abandoning} onClick={onAbandon}>
            {tr('Bỏ phiên cũ')}
          </Button>
          <Button type="button" variant="primary" size="sm" icon={Play} onClick={onResume}>
            {tr('Tiếp tục')}
          </Button>
        </div>
      </div>
    </Banner>
  );
}

async function confirmAbandon(session, tr, trf) {
  return confirmAction({
    title: tr('Bỏ phiên ôn tập đang dở?'),
    description: trf('Phiên {0} còn {1} thẻ chưa hoàn thành. Các thẻ bạn đã ôn xong trước đó vẫn được giữ nguyên trong Lịch sử ôn.', {
      0: formatSrsStudyMode(session.studyMode, tr),
      1: session.pendingItems.length,
    }),
    confirmLabel: tr('Bỏ phiên cũ'),
    cancelLabel: tr('Giữ lại'),
    tone: 'warning',
  });
}

/* ------------------------------------------------------------------ Tổng quan */

function OverviewView({ onOpenPrefs }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const progressRef = useRef(null);
  const { summaryQuery, resumable, abandonMut } = useScheduledSession();
  const summary = summaryQuery.data;
  const totalDue = Number(summary?.totalDueCards ?? summary?.dueTodayCount ?? 0);

  useEffect(() => {
    if (hash !== '#srs-progress') return undefined;
    const id = requestAnimationFrame(() => progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(id);
  }, [hash]);

  return (
    <>
      <IllustratedPageHeader
        icon="srs"
        tone="lavender"
        eyebrow={tr('Ôn tập cách quãng · Đúng thời điểm')}
        title={tr('Ôn tập SRS')}
        description={tr('Theo dõi thẻ cần ôn và tiến độ học tập của bạn.')}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <SettingsButton onClick={onOpenPrefs} />
            <Button
              as={Link}
              to={resumable ? '/daily-srs/due/?resume=1' : '/daily-srs/due/'}
              variant="primary"
              icon={Play}
            >
              {resumable
                ? trf('Tiếp tục ôn ({0})', { 0: resumable.pendingItems.length })
                : trf('Ôn thẻ đến hạn ({0})', { 0: totalDue })}
            </Button>
          </div>
        )}
      />

      <ResumeBanner
        resumable={resumable}
        abandoning={abandonMut.isPending}
        onResume={() => navigate('/daily-srs/due/?resume=1')}
        onAbandon={async () => {
          if (await confirmAbandon(resumable, tr, trf)) abandonMut.mutate(resumable.sessionKey);
        }}
      />

      {summaryQuery.isLoading ? (
        <SakuraLoader variant="inline" />
      ) : summaryQuery.isError ? (
        <Card>
          <ContextualErrorState error={summaryQuery.error} title={tr('Chưa tải được tổng quan ôn tập')} onRetry={() => summaryQuery.refetch()} />
        </Card>
      ) : summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={tr('Cần ôn hôm nay')} icon={<Layers className="h-4 w-4 text-rp-brand-strong" />} value={totalDue}
            hint={trf('Mới {0} · Đang học {1} · Ôn lại {2}', {
              0: summary.newCount,
              1: summary.learningCount + summary.relearningCount,
              2: summary.reviewCount,
            })}
          />
          <StatCard label={tr('Đã ôn hôm nay')} icon={<Target className="h-4 w-4 text-emerald-600" />}
            value={<>{summary.reviewedTodayCount}<span className="ml-1 text-sm font-semibold text-rp-text-muted">/ {summary.dailyReviewLimit}</span></>}
            hint={trf('Độ chính xác: {0}%', { 0: Math.round(summary.todayAccuracyPercent || 0) })}
          />
          <StatCard label={tr('Đã thành thạo')} icon={<Trophy className="h-4 w-4 text-amber-600" />}
            value={<>{summary.masteredCount}<span className="ml-1 text-sm font-semibold text-rp-text-muted">/ {summary.activeCards}</span></>}
            hint={trf('Tổng số thẻ: {0}', { 0: summary.totalCards })}
          />
          <StatCard label={tr('Chuỗi ngày ôn')} icon={<Flame className="h-4 w-4 text-rose-500" />}
            value={<>{summary.currentStreakDays} <span className="text-sm font-semibold">{tr('ngày')}</span></>}
            hint={trf('Kỷ lục: {0} ngày', { 0: summary.longestStreakDays })}
          />
        </div>
      )}

      <div id="srs-progress" ref={progressRef} className="scroll-mt-6">
        <SrsProgressAnalyticsTab
          embedded
          summary={summary}
          summaryLoading={summaryQuery.isLoading}
          summaryError={summaryQuery.isError}
          summaryErrorObj={summaryQuery.error}
          onRetrySummary={() => summaryQuery.refetch()}
        />
      </div>
    </>
  );
}

function StatCard({ label, icon, value, hint }) {
  return (
    <Card padding="md" className="border-[#EAE3E4] bg-[#FFFCF8]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-rp-text-muted">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-rp-navy">{value}</p>
      <p className="mt-1 text-xs text-rp-text-muted">{hint}</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ Ôn thẻ đến hạn (Scheduled) */

function DueReviewView({ prefQuery, preferredMode, onOpenPrefs }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { summaryQuery, activeQuery, resumable, abandonMut } = useScheduledSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [playing, setPlaying] = useState(null);
  const resumeIntent = searchParams.get('resume') === '1';

  // The due list is mode-independent: flip accepts every due card, so it is the canonical "due cards" view.
  const queueQuery = useQuery({
    queryKey: ['srs-queue', { studyMode: 'flip' }],
    queryFn: () => getDailyReviewQueue({ mode: 'flip' }),
    enabled: !playing,
  });

  const startMut = useMutation({
    mutationFn: (config) => startSrsSession({ sessionKind: 'Scheduled', ...config }),
    onSuccess: async (sessionData) => {
      if (!sessionData || (sessionData.pendingItems || []).length === 0) {
        notify.info(tr('Hiện không có thẻ phù hợp để bắt đầu phiên ôn này.'));
        return;
      }
      setModalOpen(false);
      setPlaying(sessionData);
      await invalidateSrsAndCalendarCaches(queryClient);
    },
    onError: (err) => notify.apiError(err, tr('Không thể bắt đầu phiên ôn tập SRS')),
  });

  const displayed = playing || (resumeIntent && resumable ? resumable : null);
  const summary = summaryQuery.data;
  const items = queueQuery.data?.items || [];
  const totalDue = Number(summary?.totalDueCards ?? queueQuery.data?.totalDueCards ?? items.length);

  async function handleStart(config) {
    if (resumable && normalizeMode(resumable.studyMode) !== config.studyMode) {
      const ok = await confirmAction({
        title: tr('Đang có phiên ôn tập chưa hoàn thành'),
        description: trf('Bạn đang có phiên {0} còn {1} thẻ dở. Bắt đầu phiên {2} mới sẽ đóng phiên cũ và giữ nguyên kết quả đã lưu. Tiếp tục tạo phiên mới?', {
          0: formatSrsStudyMode(resumable.studyMode, tr),
          1: resumable.pendingItems.length,
          2: formatSrsStudyMode(config.studyMode, tr),
        }),
        confirmLabel: tr('Bắt đầu phiên mới'),
        cancelLabel: tr('Giữ phiên cũ'),
        tone: 'warning',
      });
      if (!ok) return;
    }
    startMut.mutate(config);
  }

  async function exitPlayer() {
    setPlaying(null);
    if (resumeIntent) navigate('/daily-srs/due/', { replace: true });
    await invalidateSrsAndCalendarCaches(queryClient);
  }

  if (displayed) {
    return (
      <>
        <IllustratedPageHeader
          icon={MODE_META[normalizeMode(displayed.studyMode)].clayIcon}
          tone="lavender"
          eyebrow={tr('Ôn thẻ đến hạn · Ghi vào lịch ôn')}
          title={formatSrsStudyMode(displayed.studyMode, tr)}
          description={tr(MODE_META[normalizeMode(displayed.studyMode)].description)}
        />
        <SrsReviewPlayer
          key={displayed.sessionKey}
          session={displayed}
          preferences={prefQuery.isLoading ? null : (prefQuery.data ?? {})}
          onSessionCompleted={() => invalidateSrsAndCalendarCaches(queryClient)}
          onExitSession={exitPlayer}
        />
      </>
    );
  }

  return (
    <>
      <IllustratedPageHeader
        icon="srs"
        tone="lavender"
        eyebrow={tr('Ôn tập cách quãng · Đúng thời điểm')}
        title={tr('Ôn thẻ đến hạn')}
        description={tr('Hệ thống tự chọn các thẻ cần ôn theo lịch của bạn.')}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <SettingsButton onClick={onOpenPrefs} />
            {resumable ? (
              <Button type="button" variant="primary" icon={Play} onClick={() => setPlaying(resumable)}>
                {trf('Tiếp tục ôn ({0})', { 0: resumable.pendingItems.length })}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                icon={Play}
                disabled={totalDue === 0 || queueQuery.isLoading}
                onClick={() => setModalOpen(true)}
              >
                {trf('Bắt đầu ôn ({0})', { 0: totalDue })}
              </Button>
            )}
          </div>
        )}
      />

      <ResumeBanner
        resumable={resumable}
        abandoning={abandonMut.isPending}
        onResume={() => setPlaying(resumable)}
        onAbandon={async () => {
          if (await confirmAbandon(resumable, tr, trf)) abandonMut.mutate(resumable.sessionKey);
        }}
      />

      <DueCardsSection queueQuery={queueQuery} items={items} totalDue={totalDue} summary={summary} activeLoading={activeQuery.isLoading} />

      <StartReviewSessionModal
        key={modalOpen ? 'open' : 'closed'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMode={preferredMode}
        defaultMaxCards={25}
        totalDueCards={totalDue}
        submitting={startMut.isPending}
        onStart={handleStart}
      />
    </>
  );
}

function DueCardsSection({ queueQuery, items, totalDue, summary }) {
  const { tr, trf } = useLocale();
  if (queueQuery.isLoading) return <SakuraLoader variant="section" context="srs" />;
  if (queueQuery.isError) {
    return (
      <Card>
        <ContextualErrorState
          error={queueQuery.error}
          title={tr('Không tải được danh sách thẻ cần ôn')}
          onRetry={() => queueQuery.refetch()}
          retrying={queueQuery.isFetching}
        />
      </Card>
    );
  }

  const preview = items.slice(0, DUE_PREVIEW_LIMIT);
  const remaining = Math.max(0, totalDue - preview.length);
  const emptyReason = queueQuery.data?.emptyReason || '';

  return (
    <Card padding="lg" className="space-y-4 border-[#EAE3E4] bg-white">
      <div>
        <h3 className="text-[16px] font-extrabold text-rp-navy">{tr('Thẻ cần ôn')}</h3>
        <p className="mt-0.5 text-xs text-rp-text-muted">
          {totalDue > 0
            ? <span className="font-semibold text-rp-cal-srs-text">{trf('{0} thẻ đến hạn', { 0: totalDue })}</span>
            : summary?.nextDueAtUtc
              ? trf('Lượt ôn tiếp theo: {0}', { 0: formatVnDateTime(summary.nextDueAtUtc) })
              : tr('Chưa có thẻ đến hạn')}
        </p>
      </div>

      {items.length === 0 ? (
        emptyReason === 'NoCardsYet' || (summary?.totalCards || 0) === 0 ? (
          <ContextualEmptyState
            variant="compact"
            framed={false}
            context="srs"
            illustration="flashcard"
            title={tr('Bạn chưa có thẻ nào')}
            description={tr('Hoàn thành bài học, lưu từ Sổ tay hoặc thêm từ Thư viện thẻ mẫu để bắt đầu.')}
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Button as={Link} to="/daily-srs/templates/" variant="primary" size="sm" icon={Sparkles}>{tr('Thư viện thẻ mẫu')}</Button>
                <Button as={Link} to="/kanji-notebook/" variant="secondary" size="sm" icon={BookOpen}>{tr('Mở Sổ tay cá nhân')}</Button>
              </div>
            )}
          />
        ) : (
          <ContextualEmptyState
            variant="compact"
            framed={false}
            context="srs"
            illustration="flashcard"
            title={emptyReason === 'DailyLimitReached' ? tr('Bạn đã đạt giới hạn thẻ mới hôm nay') : tr('Chưa có thẻ cần ôn lúc này')}
            description={summary?.nextDueAtUtc ? trf('Lượt ôn tiếp theo: {0}.', { 0: formatVnDateTime(summary.nextDueAtUtc) }) : undefined}
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Button as={Link} to="/daily-srs/practice/flip/" variant="primary" size="sm" icon={Play}>{tr('Ôn tự do')}</Button>
                <Button as={Link} to="/daily-srs/library/" variant="secondary" size="sm">{tr('Quản lý Thẻ của tôi')}</Button>
              </div>
            )}
          />
        )
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,156px),1fr))] gap-2.5" aria-label={tr('Thẻ cần ôn')}>
          {preview.map((card) => (
            <li
              key={card.reviewCardId}
              className="rp-srs-card-hover flex min-w-0 flex-col justify-between gap-2 rounded-2xl border border-rp-cal-srs-border bg-rp-cal-srs-bg px-3.5 py-3"
            >
              <p className="rp-jp min-w-0 break-words text-base font-extrabold leading-snug text-rp-navy" lang="ja">{card.term || '—'}</p>
              <span className="inline-flex w-fit items-center rounded-full border border-rp-cal-srs-border bg-white/90 px-2 py-0.5 text-[11px] font-bold text-rp-cal-srs-accent-text">
                {formatSrsCardTypeLabel(card.cardType || card.contentType, tr)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 && <p className="text-xs font-medium text-rp-text-muted">{trf('Còn {0} thẻ đến hạn.', { 0: remaining })}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ Ôn tự do (Free Practice) */

const PRACTICE_SETTINGS_KEY = 'rp.srs.practice.settings.v1';
const DEFAULT_PRACTICE_SETTINGS = { maxCards: 20, shuffle: true, timeLimitEnabled: false, timeLimitMinutes: 10, cardType: '' };

function readPracticeSettings() {
  try {
    const raw = window.localStorage.getItem(PRACTICE_SETTINGS_KEY);
    return raw ? { ...DEFAULT_PRACTICE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PRACTICE_SETTINGS;
  } catch {
    return DEFAULT_PRACTICE_SETTINGS;
  }
}

function writePracticeSettings(next) {
  try {
    window.localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Per-viewer convenience only; ignore private-mode / quota errors.
  }
}

function FreePracticeView({ mode, prefQuery }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  // Entry from "Thẻ của tôi → Tạo phiên ôn tập": that exact config starts a fresh round once.
  const [entry] = useState(() => (location.state?.practiceConfig
    ? { config: location.state.practiceConfig, nonce: location.state.practiceNonce || Date.now() }
    : null));
  const [settings, setSettings] = useState(() => {
    const stored = readPracticeSettings();
    if (!entry) return stored;
    const { cardType, maxCards, shuffle, timeLimitEnabled, timeLimitMinutes } = entry.config;
    return { ...stored, cardType: cardType || '', maxCards, shuffle: Boolean(shuffle), timeLimitEnabled: Boolean(timeLimitEnabled), timeLimitMinutes };
  });
  // 0 = quick entry from the sidebar (resume same-mode round or auto-start); anything else = fresh round.
  const [generation, setGeneration] = useState(() => (entry ? `entry-${entry.nonce}` : 0));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const summaryQuery = useQuery({ queryKey: ['srs-summary'], queryFn: getSrsSummary });

  // Opening a mode goes straight to the player: resume this mode's unfinished practice round, otherwise
  // start one automatically. Scheduled sessions are a different kind and are never touched here.
  const sessionQuery = useQuery({
    queryKey: ['srs-practice-session', mode, generation],
    queryFn: async () => {
      if (generation === 0) {
        const active = await getActiveSrsSession('Practice');
        if (isResumable(active) && normalizeMode(active.studyMode) === mode) return active;
      }
      return startSrsSession({
        sessionKind: 'Practice',
        studyMode: mode,
        selectionScope: 'all',
        cardType: settings.cardType || undefined,
        shuffle: Boolean(settings.shuffle),
        timeLimitMinutes: settings.timeLimitEnabled ? Number(settings.timeLimitMinutes) : undefined,
        maxCards: Number(settings.maxCards) || 20,
      });
    },
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Once the configured round exists, drop the one-shot navigation state so F5 resumes it instead of
  // starting another round with the same config.
  const sessionReady = sessionQuery.isSuccess;
  useEffect(() => {
    if (sessionReady && location.state?.practiceConfig) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [sessionReady, location.state, location.pathname, navigate]);

  const session = sessionQuery.data;
  const meta = MODE_META[mode];
  const activeCards = Number(summaryQuery.data?.activeCards ?? 0);

  // Audio is a playback preference only: toggling it never restarts the round or touches the deck.
  const roundKeys = ['maxCards', 'shuffle', 'timeLimitEnabled', 'timeLimitMinutes', 'cardType'];
  const practicePreferences = prefQuery.isLoading
    ? null
    : { ...(prefQuery.data ?? {}), ...(settings.autoPlayAudio != null ? { autoPlayAudio: settings.autoPlayAudio } : {}) };

  async function applySettings(next) {
    const roundChanged = roundKeys.some((k) => String(next[k] ?? '') !== String(settings[k] ?? ''));
    if (!roundChanged) {
      writePracticeSettings(next);
      setSettings(next);
      setSettingsOpen(false);
      return;
    }
    const hasProgress = (session?.completedCardIds || []).length > 0;
    if (hasProgress) {
      const ok = await confirmAction({
        title: tr('Áp dụng cài đặt mới?'),
        description: tr('Một lượt luyện mới sẽ bắt đầu với cài đặt này. Lượt hiện tại kết thúc; lịch ôn của bạn không thay đổi.'),
        confirmLabel: tr('Bắt đầu lượt mới'),
        cancelLabel: tr('Giữ lượt hiện tại'),
        tone: 'warning',
      });
      if (!ok) return;
    }
    writePracticeSettings(next);
    setSettings(next);
    setSettingsOpen(false);
    setGeneration(`round-${Date.now()}`);
  }

  const header = (
    <IllustratedPageHeader
      icon={meta.clayIcon}
      tone="lavender"
      eyebrow={tr('Ôn tự do · Không thay đổi lịch ôn')}
      title={tr(meta.label)}
      description={tr(meta.description)}
    />
  );

  if (sessionQuery.isPending) {
    return (
      <>
        {header}
        <SakuraLoader variant="section" context="srs" label={tr('Đang chuẩn bị thẻ luyện tập…')} />
      </>
    );
  }

  if (sessionQuery.isError || !session || (session.pendingItems || []).length === 0) {
    const noCards = activeCards === 0;
    return (
      <>
        {header}
        <Card className="border-[#EAE3E4] bg-white">
          <ContextualEmptyState
            variant="compact"
            framed={false}
            context="srs"
            illustration="flashcard"
            title={noCards ? tr('Bạn chưa có thẻ nào') : trf('Chưa có thẻ phù hợp cho {0}', { 0: tr(meta.label) })}
            description={noCards
              ? tr('Thêm thẻ từ Thư viện thẻ mẫu hoặc tự tạo thẻ để bắt đầu luyện.')
              : mode === 'mcq'
                ? tr('Trắc nghiệm cần thẻ có đủ phương án nhiễu thật. Hãy thử Lật thẻ hoặc Gõ đáp án.')
                : mode === 'typing'
                  ? tr('Gõ đáp án cần thẻ có cách đọc hoặc nghĩa rõ ràng. Hãy thử Lật thẻ.')
                  : (sessionQuery.error?.message || tr('Hãy thử bỏ bộ lọc loại thẻ trong Tùy chỉnh.'))}
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                {noCards ? (
                  <Button as={Link} to="/daily-srs/templates/" variant="primary" size="sm" icon={Sparkles}>{tr('Thư viện thẻ mẫu')}</Button>
                ) : (
                  <>
                    {mode !== 'flip' && <Button as={Link} to="/daily-srs/practice/flip/" variant="primary" size="sm">{tr('Luyện bằng Lật thẻ')}</Button>}
                    <Button type="button" variant="secondary" size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>{tr('Tùy chỉnh')}</Button>
                  </>
                )}
              </div>
            )}
          />
        </Card>
        <PracticeSettingsModal open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onApply={applySettings} />
      </>
    );
  }

  const requested = Math.min(Number(settings.maxCards) || 20, activeCards || Infinity);
  const fewerThanRequested = (session.totalInitialCards || 0) < requested && (mode === 'mcq' || mode === 'typing');

  return (
    <>
      {header}
      {fewerThanRequested && (
        <Banner tone="info" title={trf('Lượt này có {0} thẻ phù hợp với {1}', { 0: session.totalInitialCards, 1: tr(meta.label) })}>
          {mode === 'mcq'
            ? tr('Chỉ những thẻ có đủ 4 phương án thật được dùng cho Trắc nghiệm.')
            : tr('Chỉ những thẻ có đủ cách đọc hoặc nghĩa được dùng cho Gõ đáp án.')}
        </Banner>
      )}
      <SrsReviewPlayer
        key={session.sessionKey}
        session={session}
        preferences={practicePreferences}
        exitLabel={tr('Kết thúc')}
        completedExitLabel={tr('Về Tổng quan')}
        toolbarActions={(
          <Button type="button" variant="ghost" size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>
            {tr('Tùy chỉnh')}
          </Button>
        )}
        onRetryPractice={() => setGeneration(`round-${Date.now()}`)}
        onSessionCompleted={() => queryClient.invalidateQueries({ queryKey: ['srs-active-session', 'Practice'] })}
        onExitSession={() => navigate('/daily-srs/')}
      />
      <PracticeSettingsModal
        open={settingsOpen}
        settings={settings}
        defaultAutoPlay={prefQuery.data?.autoPlayAudio ?? true}
        onClose={() => setSettingsOpen(false)}
        onApply={applySettings}
      />
    </>
  );
}

function PracticeSettingsModal({ open, settings, defaultAutoPlay = true, onClose, onApply }) {
  const { tr } = useLocale();
  return open
    ? <PracticeSettingsForm key="open" settings={settings} defaultAutoPlay={defaultAutoPlay} onClose={onClose} onApply={onApply} tr={tr} />
    : null;
}

function PracticeSettingsForm({ settings, defaultAutoPlay, onClose, onApply, tr }) {
  const [draft, setDraft] = useState(() => ({ ...settings, autoPlayAudio: settings.autoPlayAudio ?? defaultAutoPlay }));
  const count = Number.parseInt(draft.maxCards, 10);
  const minutes = Number.parseInt(draft.timeLimitMinutes, 10);
  const countInvalid = !Number.isInteger(count) || count < 1 || count > 100;
  const timeInvalid = draft.timeLimitEnabled && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180);
  const patch = (next) => setDraft((d) => ({ ...d, ...next }));

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={tr('Tùy chỉnh lượt luyện')}
      footer={(
        <>
          <Button type="button" variant="secondary" size="md" onClick={onClose}>{tr('Hủy')}</Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={countInvalid || timeInvalid}
            onClick={() => onApply({ ...draft, maxCards: count, timeLimitMinutes: draft.timeLimitEnabled ? minutes : draft.timeLimitMinutes })}
          >
            {tr('Áp dụng')}
          </Button>
        </>
      )}
    >
      <div className="space-y-3.5">
        <Field label={tr('Số thẻ')} error={countInvalid ? tr('Số thẻ phải từ 1 đến 100.') : undefined}>
          {({ id, invalid }) => (
            <Input id={id} type="number" inputMode="numeric" min={1} max={100} value={draft.maxCards} invalid={invalid} onChange={(e) => patch({ maxCards: e.target.value })} />
          )}
        </Field>
        <Field label={tr('Loại thẻ')}>
          {({ id }) => (
            <CustomSelect
              id={id}
              value={draft.cardType}
              onChange={(v) => patch({ cardType: v })}
              options={[
                { value: '', label: tr('Tất cả') },
                { value: 'Vocabulary', label: tr('Từ vựng') },
                { value: 'Kanji', label: tr('Kanji') },
              ]}
            />
          )}
        </Field>
        <Switch fullWidth className="flex-row-reverse justify-between" checked={draft.shuffle} onCheckedChange={(v) => patch({ shuffle: v })} label={tr('Xáo trộn thẻ')} description={tr('Đổi thứ tự thẻ ngẫu nhiên.')} />
        <Switch
          fullWidth
          className="flex-row-reverse justify-between"
          checked={Boolean(draft.autoPlayAudio)}
          onCheckedChange={(v) => patch({ autoPlayAudio: v })}
          label={tr('Tự động phát âm')}
          description={tr('Đọc từ khi sang thẻ mới.')}
        />
        <Switch fullWidth className="flex-row-reverse justify-between" checked={draft.timeLimitEnabled} onCheckedChange={(v) => patch({ timeLimitEnabled: v })} label={tr('Giới hạn thời gian')} description={tr('Đếm ngược cho lượt luyện.')} />
        {draft.timeLimitEnabled && (
          <Field label={tr('Thời lượng (phút)')} error={timeInvalid ? tr('Thời lượng phải là số nguyên từ 1 đến 180 phút.') : undefined}>
            {({ id, invalid }) => (
              <Input id={id} type="number" inputMode="numeric" min={1} max={180} value={draft.timeLimitMinutes} invalid={invalid} onChange={(e) => patch({ timeLimitMinutes: e.target.value })} />
            )}
          </Field>
        )}
      </div>
    </Modal>
  );
}
