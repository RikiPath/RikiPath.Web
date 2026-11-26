import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { PublicShell } from '@/layouts';
import { BackButton } from '@/components/ui';
import { FEATURES, FEATURE_LIST } from './featureContent.js';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale } from '@/locales/locale.js';

export default function FeatureDetail() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const { slug } = useParams();
  const feature = FEATURES[slug];

  if (!feature) return <Navigate to="/" replace />;

  return (
    <PublicShell pathname={pathname}>
      <div className="min-h-screen bg-rp-bg text-rp-text" data-page="FeatureDetail">
        <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <BackButton fallbackTo="/" label="Quay lại trang chủ" />
            <nav className="flex items-center gap-2 text-xs font-semibold text-rp-text-2">
              <Link className="hover:text-rp-brand" to="/">{tr('Trang chủ')}</Link>
              <Icon name="chevron_right" className="text-[16px]" />
              <span className="text-rp-text">{tr(feature.title)}</span>
            </nav>
          </div>

          <section className="rp-catalog-card overflow-hidden rounded-[28px]">
            <div className="grid lg:grid-cols-12">
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rp-brand">{tr(feature.eyebrow)}</p>
                <div className={`mt-5 flex h-16 w-16 items-center justify-center rounded-2xl ${feature.iconWrap}`}>
                  <Icon name={feature.icon} className="text-[32px]" />
                </div>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-[44px] sm:leading-[1.1]">{tr(feature.title)}</h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-rp-text-2">{tr(feature.lead)}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to={feature.tryTo}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rp-brand to-rp-brand-strong px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#D94B68]/25"
                  >
                    {feature.tryLabel}
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </Link>
                  <Link
                    to="/register/"
                    className="inline-flex items-center gap-2 rounded-full border border-rp-brand-border/70 bg-white px-6 py-3 text-sm font-bold text-rp-brand-strong hover:border-rp-brand/40"
                  >
                    {tr('Đăng ký học thử')}
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 border-t border-rp-line bg-white p-[var(--rp-space-card-pad)] min-[380px]:grid-cols-3 lg:col-span-5 lg:border-l lg:border-t-0 sm:p-10">
                {feature.stats.map((s) => (
                  <div key={s.k} className="rounded-2xl bg-white p-4 ring-1 ring-rp-line/80">
                    <div className="text-xl font-extrabold text-rp-brand">{s.k}</div>
                    <div className="mt-1 text-[11px] font-semibold leading-snug text-rp-text-2">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-10 grid gap-6 lg:grid-cols-12">
            <section className="rp-catalog-card rounded-[28px] p-8 lg:col-span-7">
              <h2 className="text-xl font-extrabold tracking-tight">{tr('Cách phương pháp vận hành')}</h2>
              <ol className="mt-6 space-y-5">
                {feature.steps.map((step, i) => (
                  <li key={step.t} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint text-sm font-extrabold text-rp-brand">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-bold">{step.t}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-rp-text-2">{step.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <ul className="mt-7 space-y-2.5 border-t border-rp-line pt-6">
                {feature.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <Icon name="check_circle" className="mt-0.5 text-[18px] text-rp-brand" />
                    {p}
                  </li>
                ))}
              </ul>
            </section>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rp-catalog-card rounded-[28px] p-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rp-brand">{tr(feature.demo.title)}</p>
                <p className="mt-4 font-jp text-xl font-bold leading-relaxed">{feature.demo.line}</p>
                <p className="mt-2 text-sm text-rp-text-2">{tr(feature.demo.note)}</p>
                <Link to={feature.tryTo} className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-rp-brand">
                  {tr(feature.ctaLabel)}
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
              <div className="rp-catalog-card rounded-[28px] p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rp-text-muted">{tr('Các trụ cột khác')}</p>
                <div className="mt-4 space-y-2">
                  {FEATURE_LIST.filter((f) => f.slug !== feature.slug).map((f) => (
                    <Link
                      key={f.slug}
                      to={`/feature/${f.slug}`}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-rp-brand-tint"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.iconWrap}`}>
                        <Icon name={f.icon} className="text-[20px]" />
                      </span>
                      <span className="text-sm font-bold">{tr(f.title)}</span>
                      <Icon name="chevron_right" className="ml-auto text-[18px] text-rp-text-muted" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
