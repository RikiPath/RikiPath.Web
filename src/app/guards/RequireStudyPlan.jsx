import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Layers, RefreshCw, Repeat } from 'lucide-react';

import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { Button, Card, ErrorState, SakuraLoader } from '@/components/ui';
import { ACCESS, findFeatureForPath } from '@/features/entitlements/featureAccess.js';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { StudyUnlockContent } from '@/features/entitlements/components/StudyUnlock.jsx';
import { plansLinkState } from '@/features/entitlements/studyUnlock.js';
import { evaluateStudyPlanAccess, studyFeatureInfo } from './studyPlanGate.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Direct-URL gate for routes whose primary Backend controllers require `[RequireFeature]` / `[RequireSelfStudy]`
 * (`study: true` in routeTable.js or restricted by server `features` policy). Reads the same entitlement source
 * as the sidebar (useStudyAccess), revalidating on mount.
 */
export default function RequireStudyPlan({ children, feature = 'active' }) {
  const { tr } = useLocale();
  const location = useLocation();
  const session = getSession();
  const { isAuthenticated, isLearner } = useAuth();
  const access = useStudyAccess({ freshness: 'strict' });
  const subscriptionQuery = access.query;

  const decision = evaluateStudyPlanAccess({
    pathname: location.pathname,
    isPreview: Boolean(session?.isPreview),
    isAuthenticated,
    isLearner,
    isPending: subscriptionQuery.isPending,
    isError: subscriptionQuery.isError,
    subscriptionData: subscriptionQuery.data,
    feature,
  });

  if (decision === 'allow') return children;
  if (decision === 'login') {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const info = studyFeatureInfo(location.pathname);

  if (decision === 'loading') {
    return (
      <LearnerShell breadcrumb={info.featureLabel}>
        <SakuraLoader variant="page" context="payment" label={tr('Đang kiểm tra quyền gói tự học')} delay={160} />
      </LearnerShell>
    );
  }

  if (decision === 'error') {
    return (
      <LearnerShell breadcrumb={info.featureLabel}>
        <div className="rp-container-reading py-10">
          <Card>
            <ErrorState
              error={subscriptionQuery.error}
              title={access.status === ACCESS.FORBIDDEN ? tr('Tài khoản không có quyền truy cập khu vực này') : tr('Chưa kiểm tra được quyền tự học')}
              onRetry={() => subscriptionQuery.refetch()}
              retrying={subscriptionQuery.isFetching}
            />
          </Card>
        </div>
      </LearnerShell>
    );
  }

  const matchedFeature = findFeatureForPath(location.pathname, subscriptionQuery.data?.features);
  const status = access.status === ACCESS.ACTIVE ? ACCESS.FREE : access.status;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const featureLabel = matchedFeature?.name || info.featureLabel;
  const description = matchedFeature?.lockReason || info.description;

  if (decision === 'disabled') {
    return (
      <LearnerShell breadcrumb={featureLabel}>
        <div className="rp-container-reading py-8 lg:py-12" data-gate="feature-disabled">
          <Card className="p-6 sm:p-8">
            <h1 className="text-xl font-bold text-rp-text sm:text-2xl">{tr('Tính năng tạm thời đóng')}</h1>
            <p className="mt-2 text-sm leading-6 text-rp-text-2">{tr(description)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" icon={RefreshCw} loading={subscriptionQuery.isFetching} onClick={() => subscriptionQuery.refetch()}>
                {tr('Kiểm tra lại quyền')}
              </Button>
              <Link
                to="/app/"
                className="rp-focus rp-press inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong hover:shadow-rp-xs"
              >
                {tr('Về bảng học tập')}
              </Link>
            </div>
          </Card>
        </div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell breadcrumb={featureLabel}>
      <div className="rp-container-reading py-8 lg:py-12" data-gate="self-study-required">
        <Card className="relative overflow-hidden bg-white p-6 sm:p-8">
          <div className="relative">
            <StudyUnlockContent featureLabel={featureLabel} description={description} status={status} headingAs="h1">
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Link
                  to="/plans/"
                  state={plansLinkState(path, featureLabel)}
                  className="rp-focus rp-press rp-btn-primary group inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong"
                >
                  <Layers aria-hidden="true" className="h-4 w-4" />
                  {tr('Khám phá gói tự học')}
                  <ArrowRight aria-hidden="true" className="rp-btn-arrow h-4 w-4" />
                </Link>
                <Button variant="secondary" icon={RefreshCw} loading={subscriptionQuery.isFetching} onClick={() => subscriptionQuery.refetch()}>
                  {tr('Kiểm tra lại quyền')}
                </Button>
                <Link
                  to="/app/"
                  className="rp-focus rp-press inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong hover:shadow-rp-xs"
                >
                  {tr('Về bảng học tập')}
                </Link>
              </div>

              <div className="mt-6 border-t border-rp-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-rp-text-muted">
                  {tr('Bạn vẫn có thể luyện tập miễn phí ngay')}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[13px]">
                  <Link to="/daily-srs/" className="rp-focus rp-press rp-interactive group inline-flex h-9 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong">
                    <Repeat aria-hidden="true" className="rp-icon-tilt h-3.5 w-3.5 text-tone-vocab" />{' '}{tr('Ôn tập SRS')}
                  </Link>
                  <Link to="/kanji-writing?type=kanji" className="rp-focus rp-press inline-flex h-9 items-center rounded-rp-input border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong">
                    {tr('Luyện viết Hán tự')}
                  </Link>
                  <Link to="/grammar/" className="rp-focus rp-press inline-flex h-9 items-center rounded-rp-input border border-rp-line bg-white px-3.5 text-xs font-semibold text-rp-text shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong">
                    {tr('Ngữ pháp JLPT')}
                  </Link>
                </div>
              </div>
            </StudyUnlockContent>
          </div>
        </Card>
      </div>
    </LearnerShell>
  );
}
