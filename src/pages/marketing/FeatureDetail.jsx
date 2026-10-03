import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';
import { FEATURES, FEATURE_LIST } from './featureContent.js';

export default function FeatureDetail() {
  const { pathname } = useLocation();
  const { slug } = useParams();
  const feature = FEATURES[slug];

  if (!feature) return <Navigate to="/" replace />;

  return (
    <MarketingShell pathname={pathname}>
      <div className="min-h-screen text-[#2D282A]" data-page="FeatureDetail">
        <main className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
          <nav className="mb-8 flex items-center gap-2 text-xs font-semibold text-[#6F6669]">
            <Link className="hover:text-[#D94B68]" to="/">Trang chủ</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-on-surface">{feature.title}</span>
          </nav>

          <section className="rp-catalog-card overflow-hidden rounded-[28px]">
            <div className="grid lg:grid-cols-12">
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D94B68]">{feature.eyebrow}</p>
                <div className={`mt-5 flex h-16 w-16 items-center justify-center rounded-2xl ${feature.iconWrap}`}>
                  <span className="material-symbols-outlined text-[32px]">{feature.icon}</span>
                </div>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-[44px] sm:leading-[1.1]">{feature.title}</h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6F6669]">{feature.lead}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to={feature.tryTo}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#D94B68]/25"
                  >
                    {feature.tryLabel}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dfbfc1]/70 bg-white px-6 py-3 text-sm font-bold text-[#9E2A4B] hover:border-[#D94B68]/40"
                  >
                    Đăng ký học thử
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-[#eadfd9] bg-[#FFF8F8] p-8 lg:col-span-5 lg:border-l lg:border-t-0 sm:p-12">
                {feature.stats.map((s) => (
                  <div key={s.k} className="rounded-2xl bg-white p-4 ring-1 ring-[#eadfd9]/80">
                    <div className="text-xl font-extrabold text-[#D94B68]">{s.k}</div>
                    <div className="mt-1 text-[11px] font-semibold leading-snug text-[#6F6669]">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-10 grid gap-6 lg:grid-cols-12">
            <section className="rp-catalog-card rounded-[28px] p-8 lg:col-span-7">
              <h2 className="text-xl font-extrabold tracking-tight">Cách phương pháp vận hành</h2>
              <ol className="mt-6 space-y-5">
                {feature.steps.map((step, i) => (
                  <li key={step.t} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F5] text-sm font-extrabold text-[#D94B68]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-bold">{step.t}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#6F6669]">{step.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <ul className="mt-7 space-y-2.5 border-t border-[#eadfd9] pt-6">
                {feature.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#D94B68]">check_circle</span>
                    {p}
                  </li>
                ))}
              </ul>
            </section>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rp-catalog-card rounded-[28px] p-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D94B68]">{feature.demo.title}</p>
                <p className="mt-4 font-jp text-xl font-bold leading-relaxed">{feature.demo.line}</p>
                <p className="mt-2 text-sm text-[#6F6669]">{feature.demo.note}</p>
                <Link to={feature.tryTo} className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[#D94B68]">
                  {feature.ctaLabel}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              <div className="rp-catalog-card rounded-[28px] p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Các trụ cột khác</p>
                <div className="mt-4 space-y-2">
                  {FEATURE_LIST.filter((f) => f.slug !== feature.slug).map((f) => (
                    <Link
                      key={f.slug}
                      to={`/feature/${f.slug}`}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[#FFF8F8]"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.iconWrap}`}>
                        <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
                      </span>
                      <span className="text-sm font-bold">{f.title}</span>
                      <span className="material-symbols-outlined ml-auto text-[18px] text-[#A59B9E]">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </MarketingShell>
  );
}
