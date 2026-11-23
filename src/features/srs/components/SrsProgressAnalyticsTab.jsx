import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  History,
  Layers,
  Target,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  Drawer,
  SakuraLoader,
  cx,
} from '@/components/ui';
import {
  getSrsCalendar,
  getSrsCardHistory,
  getSrsCards,
} from '@/features/srs/api/reviewApi.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { formatSrsStudyMode } from '@/features/srs/utils/srsLabels.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const PREVIEW_LIMIT = 5;

const LEARNING_STATES = [
  { key: 'newCount', label: 'Thẻ mới', dotCls: 'bg-slate-400', segCls: 'bg-slate-400' },
  { key: 'learningCount', label: 'Đang học', dotCls: 'bg-sky-500', segCls: 'bg-sky-500' },
  { key: 'relearningCount', label: 'Cần ôn lại', dotCls: 'bg-amber-500', segCls: 'bg-amber-500' },
  { key: 'reviewCount', label: 'Đang ôn', dotCls: 'bg-[#D9467A]', segCls: 'bg-[#D9467A]' },
  { key: 'masteredCount', label: 'Đã thành thạo', dotCls: 'bg-emerald-600', segCls: 'bg-emerald-600' },
];

const STATE_BADGE_MAP = {
  0: { label: 'Thẻ mới', tone: 'neutral' },
  New: { label: 'Thẻ mới', tone: 'neutral' },
  1: { label: 'Đang học', tone: 'info' },
  Learning: { label: 'Đang học', tone: 'info' },
  2: { label: 'Đang ôn', tone: 'brand' },
  Review: { label: 'Đang ôn', tone: 'brand' },
  3: { label: 'Cần ôn lại', tone: 'warning' },
  Relearning: { label: 'Cần ôn lại', tone: 'warning' },
  4: { label: 'Đã thành thạo', tone: 'success' },
  Mastered: { label: 'Đã thành thạo', tone: 'success' },
};

function formatDateOnlyLabel(dateStr) {
  if (!dateStr) return '—';
  try {
    const dt = new Date(`${String(dateStr).slice(0, 10)}T00:00:00+07:00`);
    if (Number.isNaN(dt.getTime())) return String(dateStr);
    return dt.toLocaleDateString(currentIntlTag(), {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

function getPreviousMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export default function SrsProgressAnalyticsTab({
  summary,
  summaryLoading,
  summaryError,
  summaryErrorObj,
  onRetrySummary,
}) {
  const { tr, trf } = useLocale();
  const [historyCard, setHistoryCard] = useState(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  const rawStudyToday = summary?.studyTodayDate;
  const studyTodayKey = (rawStudyToday && String(rawStudyToday).slice(0, 10)) || toVnDateKey(new Date());

  const { curYear, curMonth, prevYear, prevMonth } = useMemo(() => {
    const [yStr, mStr] = studyTodayKey.split('-');
    const y = Number(yStr) || 2026;
    const m = Number(mStr) || 1;
    const prev = getPreviousMonth(y, m);
    return { curYear: y, curMonth: m, prevYear: prev.year, prevMonth: prev.month };
  }, [studyTodayKey]);

  const currentMonthCalendarQuery = useQuery({
    queryKey: ['srs-calendar', curYear, curMonth],
    queryFn: () => getSrsCalendar(curYear, curMonth),
  });

  const previousMonthCalendarQuery = useQuery({
    queryKey: ['srs-calendar', prevYear, prevMonth],
    queryFn: () => getSrsCalendar(prevYear, prevMonth),
  });

  const cardsQuery = useQuery({
    queryKey: ['srs-progress-reviewed-cards'],
    queryFn: () => getSrsCards({ page: 1, pageSize: 100 }),
  });

  const cardHistoryQuery = useQuery({
    queryKey: ['srs-card-history', historyCard?.reviewCardId],
    queryFn: () => getSrsCardHistory(historyCard.reviewCardId),
    enabled: Boolean(historyCard?.reviewCardId),
  });

  const forecast = useMemo(() => summary?.forecastNext7Days || [], [summary]);
  const maxForecast = Math.max(1, ...forecast.map((d) => Number(d.dueCount || 0)));
  const totalForecastDue = useMemo(
    () => forecast.reduce((sum, d) => sum + Number(d.dueCount || 0), 0),
    [forecast],
  );

  const completedHistoryDays = useMemo(() => {
    const byDate = new Map();
    const sources = [
      ...(previousMonthCalendarQuery.data || []),
      ...(currentMonthCalendarQuery.data || []),
    ];
    for (const day of sources) {
      const dateKey = String(day?.date || '').slice(0, 10);
      if (!dateKey || dateKey > studyTodayKey) continue;
      if (Number(day?.reviewedCount || 0) <= 0) continue;
      byDate.set(dateKey, { ...day, date: dateKey });
    }
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [previousMonthCalendarQuery.data, currentMonthCalendarQuery.data, studyTodayKey]);

  const visibleHistoryDays = useMemo(
    () => (showAllDays ? completedHistoryDays : completedHistoryDays.slice(0, PREVIEW_LIMIT)),
    [completedHistoryDays, showAllDays],
  );

  const recentlyReviewedCards = useMemo(() => {
    const items = cardsQuery.data?.items || [];
    return items
      .filter((c) => Boolean(c.lastReviewedAt) || Number(c.correctCount || 0) + Number(c.incorrectCount || 0) > 0)
      .sort((a, b) => String(b.lastReviewedAt || '').localeCompare(String(a.lastReviewedAt || '')));
  }, [cardsQuery.data]);

  const visibleReviewedCards = useMemo(
    () => (showAllCards ? recentlyReviewedCards : recentlyReviewedCards.slice(0, PREVIEW_LIMIT)),
    [recentlyReviewedCards, showAllCards],
  );

  const activeCardsCount = Number(summary?.activeCards || 0);
  const distributionSegments = useMemo(
    () => LEARNING_STATES.map((st) => {
      const count = Number(summary?.[st.key] || 0);
      const pct = activeCardsCount > 0 ? Math.round((count / activeCardsCount) * 100) : 0;
      const widthPct = activeCardsCount > 0 ? (count / activeCardsCount) * 100 : 0;
      return { ...st, count, pct, widthPct };
    }),
    [summary, activeCardsCount],
  );

  const historyDaysLoading = currentMonthCalendarQuery.isLoading || previousMonthCalendarQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* SECTION: TIẾN ĐỘ HỌC TẬP */}
      <section aria-labelledby="srs-learning-progress-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="srs-learning-progress-heading" className="text-base font-extrabold text-rp-navy">
            {tr('Tiến độ học tập')}
          </h2>
          {summary && (
            <span className="text-xs text-rp-text-muted">
              {(summary.suspendedCards || 0) > 0
                ? trf('Tổng số thẻ: {0} ({1} đang tạm ngừng)', {
                  0: summary.totalCards,
                  1: summary.suspendedCards || 0,
                })
                : trf('Tổng số thẻ: {0}', { 0: summary.totalCards })}
            </span>
          )}
        </div>

        {summaryLoading ? (
          <Card padding="lg" className="border-[#EAE3E4] bg-[#FFFCF8]">
            <SakuraLoader variant="inline" />
          </Card>
        ) : summaryError ? (
          <Card>
            <ContextualErrorState
              compact
              error={summaryErrorObj}
              title={tr('Không tải được thống kê ôn tập')}
              onRetry={onRetrySummary}
            />
          </Card>
        ) : summary && (
          <div className="grid gap-4 lg:grid-cols-2 items-stretch">
            {/* A. Tiến độ ghi nhớ */}
            <Card padding="lg" className="border-[#EAE3E4] bg-white flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-rp-brand-strong" />
                  <h3 className="text-sm font-extrabold text-rp-navy">
                    {tr('Tiến độ ghi nhớ')}
                  </h3>
                </div>
                <span className="text-xs font-medium tabular-nums text-rp-text-muted">
                  {trf('{0} thẻ đang học', { 0: activeCardsCount })}
                </span>
              </div>

              {/* Stacked Progress Distribution Bar */}
              <div
                className="flex h-3.5 w-full overflow-hidden rounded-full border border-[#EAE3E4] bg-[#F6F1F2]"
                role="img"
                aria-label={tr('Phân bổ trạng thái ghi nhớ thẻ')}
              >
                {activeCardsCount > 0 && distributionSegments.map((seg) => (
                  seg.widthPct > 0 ? (
                    <div
                      key={seg.key}
                      className={cx('h-full transition-all duration-300', seg.segCls)}
                      style={{ width: `${seg.widthPct}%` }}
                      title={`${tr(seg.label)}: ${seg.count} (${seg.pct}%)`}
                    />
                  ) : null
                ))}
              </div>

              {/* Concise Legend */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {distributionSegments.map((seg) => (
                  <div
                    key={seg.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#F0EAEB] bg-[#FFFCF8] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', seg.dotCls)} />
                      <span className="truncate font-semibold text-rp-navy">{tr(seg.label)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="font-extrabold text-rp-navy">{seg.count}</span>
                      <span className="w-10 text-right text-rp-text-muted">{seg.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* B. Dự báo 7 ngày */}
            <Card padding="lg" className="border-[#EAE3E4] bg-[#FFFCF8] flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-rp-brand-strong" />
                  <h3 className="text-sm font-extrabold text-rp-navy">
                    {tr('Dự báo 7 ngày')}
                  </h3>
                </div>
                <span className="text-xs font-medium tabular-nums text-rp-text-muted">
                  {trf('{0} lượt đến hạn', { 0: totalForecastDue })}
                </span>
              </div>

              {forecast.length === 0 ? (
                <ContextualEmptyState
                  variant="compact"
                  framed={false}
                  illustration="flashcard"
                  title="Chưa có thẻ sắp đến hạn"
                  description="Khi bạn có thẻ đang ôn tập, dự báo 7 ngày tới sẽ hiển thị tại đây."
                />
              ) : (
                <div className="grid grid-cols-7 gap-2 items-end h-44 pt-2">
                  {forecast.map((d) => {
                    const due = Number(d.dueCount || 0);
                    const pct = due === 0 ? 4 : Math.max(10, Math.round((due / maxForecast) * 100));
                    return (
                      <div
                        key={d.date}
                        className="flex flex-col items-center gap-1.5 h-full justify-end"
                        title={trf('{0}: {1} thẻ đến hạn', { 0: d.label, 1: due })}
                      >
                        <span className="text-[11px] font-bold tabular-nums text-rp-navy">
                          {due}
                        </span>
                        <div className="w-full max-w-[34px] flex-1 flex items-end rounded-lg bg-white border border-[#EAE3E4] p-1">
                          <div
                            className={cx(
                              'w-full rounded-md transition-all',
                              due > 0
                                ? 'bg-gradient-to-t from-rp-brand-strong to-[#F5A9C4]'
                                : 'bg-[#EFE8E9]',
                            )}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-rp-text-muted">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[11px] text-rp-text-muted">
                {tr('Số lượng thẻ dự kiến đến hạn theo lịch ôn thực tế trong 7 ngày tới.')}
              </p>
            </Card>
          </div>
        )}
      </section>

      {/* SECTION: LỊCH SỬ ÔN */}
      <section aria-labelledby="srs-review-history-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="srs-review-history-heading" className="text-base font-extrabold text-rp-navy">
            {tr('Lịch sử ôn')}
          </h2>
          <span className="text-xs text-rp-text-muted">
            {tr('Các lượt ôn tập đã hoàn thành')}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 items-start">
          {/* Completed daily review sessions */}
          <Card padding="lg" className="border-[#EAE3E4] bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-rp-brand-strong" />
                <h3 className="text-sm font-extrabold text-rp-navy">
                  {tr('Nhật ký theo ngày')}
                </h3>
              </div>
              {completedHistoryDays.length > PREVIEW_LIMIT && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllDays((v) => !v)}
                >
                  {showAllDays
                    ? tr('Thu gọn')
                    : trf('Xem tất cả ({0})', { 0: completedHistoryDays.length })}
                </Button>
              )}
            </div>

            {historyDaysLoading ? (
              <SakuraLoader variant="inline" />
            ) : completedHistoryDays.length === 0 ? (
              <ContextualEmptyState
                variant="compact"
                framed={false}
                illustration="flashcard"
                title="Chưa có ngày ôn tập nào"
                description="Hoàn thành phiên ôn để ghi nhận kết quả hàng ngày tại đây."
              />
            ) : (
              <div className="divide-y divide-rp-line">
                {visibleHistoryDays.map((day) => {
                  const total = Number(day.reviewedCount || 0);
                  const ok = Number(day.rememberedCount ?? day.correctCount ?? 0);
                  const missed = Math.max(0, total - ok);
                  const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
                  return (
                    <div key={day.date} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-rp-navy">{formatDateOnlyLabel(day.date)}</p>
                        <p className="text-rp-text-muted tabular-nums">
                          {trf('{0} lượt ôn · {1} nhớ · {2} chưa nhớ', {
                            0: total,
                            1: ok,
                            2: missed,
                          })}
                        </p>
                      </div>
                      <Badge tone={pct >= 80 ? 'success' : 'brand'} size="sm" icon={false}>
                        {pct}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Reviewed cards list + Detail Drawer */}
          <Card padding="lg" className="border-[#EAE3E4] bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-rp-brand-strong" />
                <h3 className="text-sm font-extrabold text-rp-navy">
                  {tr('Thẻ đã ôn gần đây')}
                </h3>
              </div>
              {recentlyReviewedCards.length > PREVIEW_LIMIT && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllCards((v) => !v)}
                >
                  {showAllCards
                    ? tr('Thu gọn')
                    : trf('Xem tất cả ({0})', { 0: recentlyReviewedCards.length })}
                </Button>
              )}
            </div>

            {cardsQuery.isLoading ? (
              <SakuraLoader variant="inline" />
            ) : recentlyReviewedCards.length === 0 ? (
              <ContextualEmptyState
                variant="compact"
                framed={false}
                illustration="flashcard"
                title="Chưa có thẻ nào được ôn gần đây"
                description="Sau khi bạn ôn tập thẻ, kết quả và chi tiết các lượt ôn sẽ hiển thị tại đây."
              />
            ) : (
              <div className="divide-y divide-rp-line">
                {visibleReviewedCards.map((card) => {
                  const stMeta = STATE_BADGE_MAP[card.learningState] || { label: 'Đang ôn', tone: 'brand' };
                  return (
                    <div key={card.reviewCardId} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rp-jp truncate text-sm font-bold text-rp-navy" lang="ja">
                            {card.term}
                          </span>
                          <Badge tone={stMeta.tone} size="sm" icon={false}>
                            {tr(stMeta.label)}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-rp-text-muted tabular-nums">
                          {trf('Nhớ {0} · Chưa nhớ {1}', {
                            0: card.correctCount ?? 0,
                            1: card.incorrectCount ?? 0,
                          })}
                          {card.lastReviewedAt ? ` · ${formatVnDateTime(card.lastReviewedAt)}` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={History}
                        onClick={() => setHistoryCard(card)}
                      >
                        {tr('Chi tiết')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </section>

      <Drawer
        open={Boolean(historyCard)}
        onClose={() => setHistoryCard(null)}
        title={historyCard ? `${tr('Lịch sử ôn')}: ${historyCard.term}` : ''}
      >
        {cardHistoryQuery.isPending ? (
          <SakuraLoader variant="section" />
        ) : (cardHistoryQuery.data || []).length === 0 ? (
          <p className="text-sm text-rp-text-muted">{tr('Thẻ này chưa có lượt ôn nào.')}</p>
        ) : (
          <div className="space-y-2.5">
            {(cardHistoryQuery.data || []).map((h) => (
              <div key={h.id} className="rounded-xl border border-[#EAE3E4] bg-[#FFFCF8] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    tone={h.rating === 'Again' || h.rating === 0 ? 'warning' : 'success'}
                    size="sm"
                    icon={false}
                  >
                    {h.rating === 'Again' || h.rating === 0 ? tr('Chưa nhớ') : tr('Đã nhớ')}
                  </Badge>
                  <span className="text-rp-text-muted tabular-nums">{formatVnDateTime(h.reviewedAt)}</span>
                </div>
                <p className="text-rp-text-2">
                  {tr('Chế độ')}: <strong>{formatSrsStudyMode(h.studyMode, tr)}</strong>
                </p>
                {h.userAnswer && (
                  <p className="text-rp-text-muted">{tr('Đã nhập')}: “{h.userAnswer}”</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
