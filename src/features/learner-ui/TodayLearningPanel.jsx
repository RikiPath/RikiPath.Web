import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, CheckCircle2, ClipboardCheck, Layers, Sparkles } from 'lucide-react';
import { Badge, Button, Card, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import WebClayIcon from './WebClayIcon.jsx';

/**
 * Prioritized "Hôm nay học gì?" action checklist.
 * Strictly renders real backend states (AI day / Standard lesson, SRS queue due, Homework pending, Cohort session).
 */
export default function TodayLearningPanel({
  primaryFlow,
  dueCount = 0,
  completedLessons = 0,
  totalLessons = 0,
  pendingHomework = [],
  upcomingSession = null,
  className,
}) {
  const { tr, trf } = useLocale();

  const isAiReadyStage = primaryFlow?.stage === 'ready-for-ai';

  const tasks = [
    {
      id: 'primary-step',
      icon: primaryFlow?.stage === 'active-roadmap' ? 'roadmap' : primaryFlow?.stage === 'needs-placement' ? 'placement' : 'ai',
      tone: 'sakura',
      title: isAiReadyStage
        ? tr('Khởi tạo lộ trình học theo ngày')
        : (primaryFlow?.ctaLabel ? tr(primaryFlow.ctaLabel) : tr('Tiếp tục lộ trình')),
      meta: isAiReadyStage
        ? tr('Sắp xếp lịch học từng ngày theo kết quả đánh giá năng lực.')
        : (primaryFlow?.hint ? tr(primaryFlow.hint) : (totalLessons > 0 ? trf('Đã hoàn thành {0}/{1} bài học', { 0: completedLessons, 1: totalLessons }) : tr('Sẵn sàng bắt đầu'))),
      to: primaryFlow?.to || '/roadmap/',
      badgeText: primaryFlow?.stage === 'active-roadmap' ? tr('Học ngay') : tr('Bắt đầu'),
      badgeTone: 'brand',
      DoneIcon: primaryFlow?.stage === 'continue-lessons' ? CheckCircle2 : Sparkles,
    },
    {
      id: 'srs-due',
      icon: 'srs',
      tone: 'lavender',
      title: dueCount > 0 ? trf('{0} thẻ đến hạn hôm nay', { 0: dueCount }) : tr('Ôn tập SRS hôm nay'),
      meta: dueCount > 0
        ? tr('Ôn nhanh 5–10 phút để giữ vững từ vựng & Hán tự.')
        : tr('Không còn thẻ tồn đọng · Có thể lưu thêm từ từ Sổ tay.'),
      to: '/daily-srs/',
      badgeText: dueCount > 0 ? trf('{0} thẻ', { 0: dueCount }) : tr('Đã xong'),
      badgeTone: dueCount > 0 ? 'warning' : 'success',
      DoneIcon: Layers,
    },
    {
      id: 'homework-due',
      icon: 'homework',
      tone: 'peach',
      title: pendingHomework.length > 0
        ? trf('{0} bài tập cần hoàn thành', { 0: pendingHomework.length })
        : upcomingSession
          ? tr('Buổi học sắp tới cùng Giáo viên')
          : tr('Bài tập & lịch lớp học'),
      meta: pendingHomework.length > 0
        ? (pendingHomework[0]?.title || tr('Xem hạn nộp và làm bài trực tiếp.'))
        : upcomingSession
          ? (upcomingSession.title || upcomingSession.cohortName || tr('Kiểm tra phòng học và chuẩn bị bài.'))
          : tr('Không có bài tập tồn đọng.'),
      to: pendingHomework.length > 0 ? '/homework/' : upcomingSession ? '/calendar/' : '/cohorts/',
      badgeText: pendingHomework.length > 0
        ? trf('{0} bài', { 0: pendingHomework.length })
        : upcomingSession
          ? tr('Lịch học')
          : tr('Khám phá'),
      badgeTone: pendingHomework.length > 0 ? 'warning' : 'neutral',
      DoneIcon: pendingHomework.length > 0 ? ClipboardCheck : CalendarCheck2,
    },
  ];

  return (
    <Card
      className={cx('flex flex-col justify-between border-rp-line bg-white p-4 shadow-rp-sm', className)}
      data-section="TodayLearningPanel"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <WebClayIcon name="ai" size="xs" tone="peach" hover className="-my-1" />
            <div>
              <h2 className="text-[15.5px] font-extrabold tracking-tight text-rp-navy">
                {tr('Hôm nay học gì?')}
              </h2>
              <p className="text-[11.5px] text-rp-text-muted">
                {tr('Nhiệm vụ ưu tiên theo tiến độ thật')}
              </p>
            </div>
          </div>
          {totalLessons > 0 && (
            <Badge tone="neutral" size="sm" icon={false}>
              {completedLessons}/{totalLessons}
            </Badge>
          )}
        </div>

        <ul className="mt-3 divide-y divide-rp-line/70 rounded-xl border border-rp-line bg-rp-bg-2/45">
          {tasks.map((task) => {
            const StepIcon = task.DoneIcon;
            return (
              <li key={task.id}>
                <Link
                  to={task.to}
                  className="rp-focus group flex items-center gap-3 px-3 py-2.5 transition hover:bg-white"
                >
                  <WebClayIcon name={task.icon} size="xs" tone={task.tone} hover />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-rp-navy group-hover:text-rp-brand-strong">
                      {task.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-rp-text-2">
                      {task.meta}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={task.badgeTone} size="sm" icon={StepIcon}>
                      {task.badgeText}
                    </Badge>
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted transition group-hover:translate-x-0.5 group-hover:text-rp-brand-strong" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line/70 bg-rp-brand-tint/45 px-3 py-2">
        <span className="text-xs font-semibold text-rp-navy">
          {tr('Sẵn sàng thử sức với đề chuẩn JLPT?')}
        </span>
        <Button as={Link} to="/mock-tests/" variant="soft" size="sm" iconRight={ArrowRight}>
          {tr('Thi thử JLPT')}
        </Button>
      </div>
    </Card>
  );
}
