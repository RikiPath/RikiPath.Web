import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { getMeetingPlans } from '../../api/mentorBookingApi.js';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';

function money(value) {
  if (
    value == null ||
    value === '' ||
    !Number.isFinite(Number(value))
  ) {
    return 'Chưa có giá';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const CP1252 = {
  8364: 0x80,
  8218: 0x82,
  402: 0x83,
  8222: 0x84,
  8230: 0x85,
  8224: 0x86,
  8225: 0x87,
  710: 0x88,
  8240: 0x89,
  352: 0x8a,
  8249: 0x8b,
  338: 0x8c,
  381: 0x8e,
  8216: 0x91,
  8217: 0x92,
  8220: 0x93,
  8221: 0x94,
  8226: 0x95,
  8211: 0x96,
  8212: 0x97,
  732: 0x98,
  8482: 0x99,
  353: 0x9a,
  8250: 0x9b,
  339: 0x9c,
  382: 0x9e,
  376: 0x9f,
};

function readText(value) {
  const text = String(value ?? '');
  if (!text.includes('Ã') && !text.includes('á»')) return text;
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code < 256) bytes.push(code);
    else if (CP1252[code] != null) bytes.push(CP1252[code]);
    else return text;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return text;
  }
}

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function PlanCard({ plan }) {
  const { locale, tr } = useLocale();
  const name = readText(plan.name) || tr('Gói tư vấn');
  const description = readText(plan.description).trim();
  const sessions = Number(plan.meetingSessionCount) || 0;
  const price = Number(plan.price);
  const perSession = sessions > 1 && Number.isFinite(price) ? price / sessions : null;
  const features = (Array.isArray(plan.features) ? plan.features : [])
    .map((feature) => readText(feature?.name).trim())
    .filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#EADFE5] bg-white p-5">
      <h3 className="text-[16px] font-semibold leading-6 text-[#5A3E4C]">{name}</h3>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[#7A6170]">
        {sessions > 0 && (
          <span className="rounded-full bg-[#FAEDF3] px-2.5 py-1">{sessions} {locale === 'ja' ? '回' : 'buổi'}</span>
        )}
        {plan.durationDays != null && (
          <span className="rounded-full bg-[#FAEDF3] px-2.5 py-1">{plan.durationDays} {tr('ngày')}</span>
        )}
      </div>
      {description && (
        <p className="mt-3 whitespace-pre-line break-words text-[13px] leading-6 text-[#8D7481]">{description}</p>
      )}
      {features.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[13px] leading-5 text-[#705261]">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <Icon name="check" className="mt-0.5 text-[16px] text-[#AD3155]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#F3E8ED] pt-4">
        <div>
          <p className="text-[22px] font-semibold tracking-tight text-[#A33357]">{money(plan.price)}</p>
          <p className="mt-0.5 text-[12px] text-[#A48D99]">
            {perSession != null ? `${money(perSession)} / ${locale === 'ja' ? '回' : 'buổi'}` : tr('Giá trọn gói')}
          </p>
        </div>
        <Link
          to={`/consultation-payment/?planId=${plan.id}`}
          className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
        >
          {tr('Mua gói này')}
        </Link>
      </div>
    </article>
  );
}

export default function Consultation() {
  const { pathname } = useLocation();
  const { tr } = useLocale();

  const plansQuery = useQuery({
    queryKey: ['meeting-plans'],
    queryFn: getMeetingPlans,
    retry: false,
  });

  const plans = (Array.isArray(plansQuery.data) ? plansQuery.data : [])
    .slice()
    .sort((a, b) => (Number(a.meetingSessionCount) || 0) - (Number(b.meetingSessionCount) || 0)
      || (Number(a.price) || 0) - (Number(b.price) || 0));

  return (
    <LearnerShell pathname={pathname} breadcrumb="Tư vấn 1-1">
      <div
        data-page="Consultation"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight text-[#49353F]">
              {tr('Tư vấn cùng Mentor')}
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">
              {tr('Mua gói để cộng lượt, rồi chọn lịch. Mỗi tiết dùng 1 lượt.')}
            </p>
          </div>
          <Link
            to="/booking-schedule/"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E7DAE1] bg-white px-3 text-[13px] font-medium text-[#705261] hover:bg-[#FFF6FA] ${focusClass}`}
          >
            {tr('Đã có lượt, chọn lịch')}
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </header>

        <section aria-labelledby="plans-title">
          <h2 id="plans-title" className="mb-3 text-[15px] font-semibold text-[#705261]">
            {tr('Chọn gói')}
          </h2>

          <div aria-busy={plansQuery.isFetching}>
            {plansQuery.isPending ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#EADFE5] bg-white px-5 py-10 text-[13px] text-[#9A8390]"
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[#EBD9E2] border-t-[#AD3155] motion-reduce:animate-none"
                />
                {tr('Đang tải gói tư vấn…')}
              </div>
            ) : plansQuery.isError ? (
              <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6">
                <p
                  role="alert"
                  className="text-[13px] leading-6 text-[#A33357]"
                >
                  {plansQuery.error?.message ||
                    tr('Không tải được gói tư vấn.')}
                </p>

                <button
                  type="button"
                  disabled={plansQuery.isFetching}
                  onClick={() => plansQuery.refetch()}
                  className={[
                    'mt-3 inline-flex items-center gap-1.5 rounded',
                    'text-[12px] font-medium text-[#AD3155]',
                    'disabled:opacity-50',
                    focusClass,
                  ].join(' ')}
                >
                  <Icon name="refresh" className="text-[17px]" />
                  {plansQuery.isFetching ? tr('Đang tải…') : tr('Thử lại')}
                </button>
              </div>
            ) : plans.length === 0 ? (
              <div className="flex items-start gap-3 rounded-2xl border border-[#EADFE5] bg-white px-5 py-6">
                <Icon
                  name="inventory_2"
                  className="mt-0.5 text-[22px] text-[#B499A7]"
                />

                <div>
                  <p className="text-[14px] font-medium text-[#806371]">
                    {tr('Chưa có gói tư vấn đang mở')}
                  </p>

                  <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">
                    {tr('Bạn có thể quay lại kiểm tra sau.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="mt-4 px-1 text-[12px] leading-6 text-[#A18A97]">
          {tr('Lượt có hạn kể từ lúc thanh toán. Gói hết hạn sớm được dùng trước khi đặt lịch.')}
        </p>
      </div>
    </LearnerShell>
  );
}
