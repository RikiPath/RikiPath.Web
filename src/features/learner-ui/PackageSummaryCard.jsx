import { Link } from 'react-router-dom';
import { ArrowRight, Bot, CalendarClock, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { Badge, Button, SakuraLoader, cx } from '@/components/ui';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { ACCESS } from '@/features/entitlements/featureAccess.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import WebClayIcon from './WebClayIcon.jsx';

const PLANS_PATH = '/plans/';

function formatExpiryDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(currentIntlTag(), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(parsed);
}

const num = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)));

/**
 * "Gói học của bạn" — reads the shared entitlement query (`/subscriptions/me`, same cache as sidebar locks).
 * State comes only from `studyAccessStatus` (active / pending payment / expired / free / error); AI uses are shown
 * as extra info and never decide the plan state. No payment details are displayed.
 */
export default function PackageSummaryCard({ className }) {
  const { tr, trf } = useLocale();
  const access = useStudyAccess();
  const { status, data, query } = access;
  if (status === ACCESS.NOT_APPLICABLE) return null;

  const aiGrading = num(data?.aiGradingUsesRemaining);
  const aiPath = num(data?.learningPathUsesRemaining);
  // A far-future expiry (e.g. 2100-01-01) is the Backend's "no end date" sentinel — show it as unlimited, not 26 701 days.
  const rawDays = num(data?.selfStudyDaysRemaining);
  const unlimited = rawDays != null && rawDays > 3650;
  const daysLeft = unlimited ? null : rawDays;
  const expiry = unlimited ? '' : formatExpiryDate(data?.selfStudyExpiresAt);

  let badge = null;
  let title = '';
  let body;
  let cta = { to: PLANS_PATH, label: 'Mua gói ngay', variant: 'primary' };

  if (status === ACCESS.LOADING) {
    body = <SakuraLoader variant="inline" size={18} context="data" delay={160} label={tr('Đang tải gói học')} />;
    cta = null;
  } else if (status === ACCESS.ERROR || status === ACCESS.FORBIDDEN) {
    title = tr('Chưa tải được thông tin gói');
    body = (
      <button type="button" onClick={() => query.refetch()} className="rp-focus rp-link inline-flex items-center gap-1 rounded text-xs font-semibold">
        <RefreshCw aria-hidden="true" className={cx('h-3 w-3', query.isFetching && 'animate-spin')} /> {tr('Thử lại')}
      </button>
    );
    cta = null;
  } else if (status === ACCESS.ACTIVE) {
    badge = <Badge tone="success" size="sm" icon={false}>{tr('Đang hoạt động')}</Badge>;
    title = data?.planName || tr('Gói tự học');
    body = (
      <ul className="space-y-1 text-[12px] text-rp-text-2">
        {unlimited && (
          <li className="flex items-center gap-1.5">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
            <span>{tr('Không giới hạn thời gian')}</span>
          </li>
        )}
        {(daysLeft != null || expiry) && (
          <li className="flex items-center gap-1.5">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
            <span>
              {daysLeft != null ? trf('Còn {0} ngày', { 0: daysLeft }) : null}
              {daysLeft != null && expiry ? ' · ' : null}
              {expiry ? trf('Hết hạn {0}', { 0: expiry }) : null}
            </span>
          </li>
        )}
        {aiGrading != null && (
          <li className="flex items-center gap-1.5">
            <Bot aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
            <span>{trf('{0} lượt chấm AI', { 0: aiGrading })}</span>
          </li>
        )}
        {aiPath != null && (
          <li className="flex items-center gap-1.5">
            <RouteIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
            <span>{trf('{0} lượt tạo lộ trình AI', { 0: aiPath })}</span>
          </li>
        )}
      </ul>
    );
    cta = { to: PLANS_PATH, label: 'Xem quyền lợi', variant: 'secondary' };
  } else if (status === ACCESS.PENDING_PAYMENT) {
    badge = <Badge tone="warning" size="sm" icon={false}>{tr('Chờ thanh toán')}</Badge>;
    title = tr('Gói đang chờ thanh toán');
    body = <p className="text-[12px] leading-5 text-rp-text-2">{tr('Hoàn tất thanh toán để bắt đầu học.')}</p>;
    cta = { to: PLANS_PATH, label: 'Xem gói học', variant: 'primary' };
  } else if (status === ACCESS.EXPIRED) {
    badge = <Badge tone="neutral" size="sm" icon={false}>{tr('Đã hết hạn')}</Badge>;
    title = tr('Gói tự học đã hết hạn');
    body = <p className="text-[12px] leading-5 text-rp-text-2">{tr('Tiến độ của bạn vẫn được giữ. Gia hạn khi bạn sẵn sàng học tiếp.')}</p>;
    cta = { to: PLANS_PATH, label: 'Gia hạn gói', variant: 'primary' };
  } else {
    title = tr('Bạn chưa có gói tự học');
    body = <p className="text-[12px] leading-5 text-rp-text-2">{tr('Mở khóa toàn bộ bài học JLPT, luyện đọc, nghe và thi thử.')}</p>;
  }

  return (
    <section
      aria-label={tr('Gói học của bạn')}
      data-section="PackageSummaryCard"
      data-access={status}
      className={cx('flex flex-col gap-3 rounded-2xl border border-rp-line bg-white p-4 shadow-rp-xs', className)}
    >
      <div className="flex items-start gap-3">
        <WebClayIcon name="pass" size="sm" className="-my-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Gói học của bạn')}</p>
            {badge}
          </div>
          {title && <p className="mt-0.5 text-[15px] font-extrabold leading-snug text-rp-navy [overflow-wrap:anywhere]">{title}</p>}
        </div>
      </div>
      <div className="min-h-0 flex-1">{body}</div>
      {cta && (
        <Button as={Link} to={cta.to} variant={cta.variant} size="sm" iconRight={ArrowRight} className="w-full justify-center">
          {tr(cta.label)}
        </Button>
      )}
    </section>
  );
}
