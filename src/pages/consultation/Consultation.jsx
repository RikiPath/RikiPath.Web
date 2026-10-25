import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { getMeetingPlans } from '../../api/mentorBookingApi.js';
import { LearnerShell } from '../../components/shells';

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

function PlanRow({ plan }) {
  const name = readText(plan.name) || 'Gói tư vấn';
  const description = readText(plan.description).trim();

  return (
    <article className="px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FAEDF3] text-[#AF6C88]">
            <Icon name="forum" className="text-[21px]" />
          </span>

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-6 text-[#5A3E4C]">
              {name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#947B88]">
              {plan.meetingSessionCount != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon
                    name="chat_bubble_outline"
                    className="text-[16px] text-[#B393A3]"
                  />
                  {plan.meetingSessionCount} buổi tư vấn
                </span>
              )}

              {plan.durationDays != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon
                    name="calendar_today"
                    className="text-[15px] text-[#B393A3]"
                  />
                  Thời hạn {plan.durationDays} ngày
                </span>
              )}
            </div>

            {description && (
              <details className="group mt-3">
                <summary
                  className={[
                    'inline-flex cursor-pointer list-none items-center',
                    'gap-1 rounded text-[12px] text-[#A36680]',
                    'hover:text-[#AD3155]',
                    '[&::-webkit-details-marker]:hidden',
                    focusClass,
                  ].join(' ')}
                >
                  Xem quyền lợi
                  <Icon
                    name="expand_more"
                    className="text-[17px] transition-transform group-open:rotate-180"
                  />
                </summary>

                <p className="mt-2 max-w-xl whitespace-pre-line break-words text-[13px] leading-6 text-[#8D7481]">
                  {description}
                </p>
              </details>
            )}
          </div>
        </div>

        <div className="pl-[52px] sm:shrink-0 sm:pl-0 sm:pt-0.5 sm:text-right">
          <p className="text-[22px] font-semibold tracking-tight text-[#A33357]">
            {money(plan.price)}
          </p>

          <p className="mt-1 text-[11px] text-[#A48D99]">
            Giá trọn gói
          </p>
        </div>
      </div>
    </article>
  );
}

export default function Consultation() {
  const { pathname } = useLocation();

  const plansQuery = useQuery({
    queryKey: ['meeting-plans'],
    queryFn: getMeetingPlans,
    retry: false,
  });

  const plans = Array.isArray(plansQuery.data)
    ? plansQuery.data
    : [];

  return (
    <LearnerShell pathname={pathname} breadcrumb="Tư vấn 1-1">
      <div
        data-page="Consultation"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-5">
          <h1 className="text-[25px] font-semibold tracking-tight text-[#49353F]">
            Tư vấn cùng Mentor
          </h1>

          <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">
            Trao đổi những phần còn vướng trong quá trình ôn luyện.
          </p>
        </header>

        <section
          aria-labelledby="booking-title"
          className="mb-6 rounded-2xl border border-[#ECD9E2] bg-[#FCEDF4] px-5 py-5 sm:px-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ECD3DF] bg-white/80 text-[#AD3155]">
                <Icon name="event_available" className="text-[24px]" />
              </span>

              <div>
                <h2
                  id="booking-title"
                  className="text-[16px] font-semibold text-[#75465B]"
                >
                  Tìm một lịch hẹn phù hợp
                </h2>

                <p className="mt-1 text-[13px] leading-6 text-[#9A7587]">
                  Chọn mentor và khung giờ trước.
                  Gói tư vấn được chọn khi thanh toán.
                </p>
              </div>
            </div>

            <Link
              to="/booking-schedule"
              className={[
                'inline-flex min-h-10 shrink-0 items-center',
                'justify-center gap-2 self-start rounded-lg',
                'bg-[#AD3155] px-4 py-2 text-[13px]',
                'font-medium text-white sm:self-auto',
                'transition-colors hover:bg-[#982B4B]',
                focusClass,
              ].join(' ')}
            >
              Chọn lịch hẹn
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="plans-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h2
              id="plans-title"
              className="text-[15px] font-semibold text-[#705261]"
            >
              Gói tư vấn
            </h2>

            <p className="text-[12px] text-[#A28B98]">
              Tham khảo trước khi đặt lịch
            </p>
          </div>

          <div
            aria-busy={plansQuery.isFetching}
            className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white"
          >
            {plansQuery.isPending ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 px-5 py-10 text-[13px] text-[#9A8390]"
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[#EBD9E2] border-t-[#AD3155] motion-reduce:animate-none"
                />
                Đang tải gói tư vấn…
              </div>
            ) : plansQuery.isError ? (
              <div className="px-5 py-6">
                <p
                  role="alert"
                  className="text-[13px] leading-6 text-[#A33357]"
                >
                  {plansQuery.error?.message ||
                    'Không tải được gói tư vấn.'}
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
                  {plansQuery.isFetching ? 'Đang tải…' : 'Thử lại'}
                </button>
              </div>
            ) : plans.length === 0 ? (
              <div className="flex items-start gap-3 px-5 py-6">
                <Icon
                  name="inventory_2"
                  className="mt-0.5 text-[22px] text-[#B499A7]"
                />

                <div>
                  <p className="text-[14px] font-medium text-[#806371]">
                    Chưa có gói tư vấn đang mở
                  </p>

                  <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">
                    Bạn có thể quay lại kiểm tra sau.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#F0E7EC]">
                {plans.map((plan) => (
                  <PlanRow key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="mt-4 flex items-start gap-2 px-1 text-[12px] leading-6 text-[#A18A97]">
          <Icon
            name="info"
            className="mt-0.5 shrink-0 text-[16px] text-[#B395A5]"
          />
          Xem kỹ số buổi, thời hạn và quyền lợi của gói trước khi
          thanh toán.
        </p>
      </div>
    </LearnerShell>
  );
}
