import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminShell } from '@/layouts';
import { NOTIFICATION_EVENT } from '@/features/notifications/hooks/useNotification.js';
import {
  ContextualErrorState,
  DataRefreshBoundary,
  GroupClassIcon,
  RefreshButton,
  notify,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import { courseGet, getCohorts } from '@/features/cohorts/api/cohortApi.js';
import { getCurrentMentorGroupPolicy } from '@/features/admin/api/adminApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import AdminCohortConsolePanel from '@/features/cohorts/components/AdminCohortConsolePanel.jsx';
import AdminRetakeSupportPanel from '@/features/cohorts/components/AdminRetakeSupportPanel.jsx';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import AdminMentorReplacementPanel from '@/features/cohorts/components/AdminMentorReplacementPanel.jsx';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

const LEGACY_SECTION_IDS = ['cohorts', 'enrollments', 'requests', 'cases'];

async function fetchAdminGroupSnapshot(includeMentors = false) {
  return Promise.all([
    courseGet(),
    getCohorts(),
    includeMentors ? courseGet('/mentors').catch(() => []) : Promise.resolve([]),
  ]);
}

export default function AdminGroupWorkspace() {
  const { tr } = useLocale();
  const [searchParams] = useSearchParams();

  const cohortIdParam = searchParams.get('cohortId');
  const courseIdParam = searchParams.get('courseId');
  const scheduleReqIdParam = searchParams.get('cohortScheduleRequestId');
  const transferReqIdParam = searchParams.get('transferRequestId');
  const complaintIdParam = searchParams.get('complaintId');
  const rawSection = searchParams.get('section');

  const activeSection = LEGACY_SECTION_IDS.includes(rawSection)
    ? rawSection
    : courseIdParam
      ? 'enrollments'
      : scheduleReqIdParam
        ? 'requests'
        : transferReqIdParam || complaintIdParam
          ? 'cases'
          : 'cohorts';

  const includeMentors = activeSection === 'requests';

  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(() => (courseIdParam ? Number(courseIdParam) : null));
  const [groupPolicy, setGroupPolicy] = useState(null);
  const [policyError, setPolicyError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const initialAppliedRef = useRef(false);
  const refreshSeqRef = useRef(0);

  function applySnapshot([c, ch, m]) {
    const list = Array.isArray(c) ? c : [];
    setCourses(list);
    setCohorts(Array.isArray(ch) ? ch : []);
    setMentors(Array.isArray(m) ? m : []);
    setLoadError(null);

    if (!initialAppliedRef.current && courseIdParam) {
      initialAppliedRef.current = true;
      const cid = Number(courseIdParam);
      if (list.some((x) => x.id === cid)) setSelectedCourseId(cid);
    } else {
      setSelectedCourseId((cur) => (cur && list.some((x) => x.id === cur) ? cur : list[0]?.id || null));
    }
  }

  async function loadSnapshot() {
    applySnapshot(await fetchAdminGroupSnapshot(includeMentors));
  }

  async function refreshSnapshot() {
    if (refreshing || loading) return;
    const seq = ++refreshSeqRef.current;
    setRefreshing(true);
    try {
      const [snapshotData, policyData] = await Promise.all([
        fetchAdminGroupSnapshot(includeMentors),
        getCurrentMentorGroupPolicy().catch(() => groupPolicy),
      ]);
      if (seq !== refreshSeqRef.current) return;
      applySnapshot(snapshotData);
      if (policyData !== undefined) {
        setGroupPolicy(policyData || null);
        setPolicyError(null);
      }
    } catch (e) {
      if (seq === refreshSeqRef.current) {
        setLoadError(e);
      }
    } finally {
      if (seq === refreshSeqRef.current) {
        setRefreshing(false);
      }
    }
  }

  const refreshLatestRef = useRef(refreshSnapshot);
  useEffect(() => {
    refreshLatestRef.current = refreshSnapshot;
  });

  // Realtime sync on payments, enrollments, refunds, and cohort notifications
  useEffect(() => {
    let timerId = null;
    const scheduleRefresh = () => {
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        timerId = null;
        refreshLatestRef.current?.();
      }, 450);
    };

    const onNotification = (event) => {
      const detail = event?.detail;
      const hay = `${detail?.type || ''} ${detail?.linkUrl || ''} ${detail?.link || ''}`.toLowerCase();
      if (
        !hay.trim()
        || hay.includes('payment')
        || hay.includes('cohort')
        || hay.includes('study-course')
        || hay.includes('enrollment')
      ) {
        scheduleRefresh();
      }
    };

    const onPaymentUpdated = () => scheduleRefresh();
    const onStorage = (event) => {
      if (event?.key === 'rikipath:payment-updated') scheduleRefresh();
    };
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return;
      scheduleRefresh();
    };

    window.addEventListener(NOTIFICATION_EVENT, onNotification);
    window.addEventListener('rikipath:payment-updated', onPaymentUpdated);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      if (timerId) window.clearTimeout(timerId);
      window.removeEventListener(NOTIFICATION_EVENT, onNotification);
      window.removeEventListener('rikipath:payment-updated', onPaymentUpdated);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchAdminGroupSnapshot(includeMentors).then((data) => { if (alive) applySnapshot(data); }),
      getCurrentMentorGroupPolicy()
        .then((p) => { if (alive) { setGroupPolicy(p || null); setPolicyError(null); } })
        .catch((e) => { if (alive) { setGroupPolicy(null); setPolicyError(e); } }),
    ])
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeMentors]);

  async function runAction(fn, message = 'Đã lưu thay đổi.', opts = {}) {
    if (busy) return;
    setBusy(true);
    const key = opts.key || 'admin-group-action';
    const toastId = opts.silentLoading ? null : notify.loading(opts.loading || 'Đang xử lý…', '', { key });
    try {
      const result = await fn();
      await loadSnapshot();
      const resolved = typeof message === 'function' ? message(result) : message;
      if (resolved) {
        notify.success(resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
    } catch (e) {
      const info = describeApiError(e);
      notify.apiError(e, opts.errorTitle || 'Chưa thực hiện được', { id: toastId || undefined, key, replace: true });
      if (info.code === 'CONCURRENCY_CONFLICT' || info.code === 'COHORT_SCHEDULE_REVISION_CONFLICT' || info.code === 'COHORT_FULL') {
        loadSnapshot().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  const lockViewport = activeSection === 'cohorts' && !loading && !(loadError && courses.length === 0 && cohorts.length === 0);
  const hasLoadedSnapshot = !loading && !(loadError && courses.length === 0 && cohorts.length === 0);
  const toolbarOwnsRefresh = hasLoadedSnapshot && activeSection === 'cohorts' && cohorts.length > 0;

  return (
    <AdminShell breadcrumb={tr('Lớp học & ghi danh')}>
      <AdminWorkspace viewportLocked={lockViewport}>
        <AdminPageHeader
          icon={GroupClassIcon}
          title="Lớp học & ghi danh"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {hasLoadedSnapshot && !toolbarOwnsRefresh && (
                <RefreshButton
                  onRefresh={refreshSnapshot}
                  refreshing={refreshing}
                  disabled={busy || loading}
                />
              )}
            </div>
          }
        />

        {policyError && (
          <ContextualErrorState
            compact
            error={policyError}
            title={tr('Chưa tải được chính sách lớp nhóm hiện hành')}
            onRetry={() => getCurrentMentorGroupPolicy().then((p) => { setGroupPolicy(p || null); setPolicyError(null); }).catch(setPolicyError)}
          />
        )}

        <DataRefreshBoundary
          fillHeight
          loading={loading}
          refreshing={refreshing}
          error={loadError}
          hasData={hasLoadedSnapshot}
          isEmpty={false}
          loadingContext="cohort"
          loadingLabel={tr('Đang tải dữ liệu lớp học nhóm')}
          loadingDelay={160}
          errorTitle={tr('Chưa tải được dữ liệu lớp học nhóm')}
          onRetry={refreshSnapshot}
        >
          {hasLoadedSnapshot && (
            <>
              {activeSection === 'cohorts' && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <AdminCohortConsolePanel
                    cohorts={cohorts}
                    courses={courses}
                    initialCohortId={cohortIdParam}
                    groupPolicy={groupPolicy}
                    onRefresh={refreshSnapshot}
                    refreshing={refreshing}
                    busy={busy}
                    fillHeight
                  />
                </div>
              )}

              {/* Legacy notification deep-link views */}
              {activeSection === 'enrollments' && (
                <AdminRetakeSupportPanel
                  courses={courses}
                  cohorts={cohorts}
                  selectedCourseId={selectedCourseId}
                  onSelectCourse={setSelectedCourseId}
                  busy={busy}
                  onRun={runAction}
                />
              )}

              {activeSection === 'requests' && (
                <div className="space-y-5">
                  <AdminCohortScheduleRequestsPanel busy={busy} initialRequestId={scheduleReqIdParam} onRun={runAction} />
                  <AdminMentorReplacementPanel cohorts={cohorts} mentors={mentors} busy={busy} onRun={runAction} />
                </div>
              )}

              {activeSection === 'cases' && (
                <div className="space-y-5">
                  <AdminCohortTransferQueuePanel busy={busy} initialTransferId={transferReqIdParam} onRun={runAction} />
                  <AdminCohortComplaintsPanel busy={busy} initialComplaintId={complaintIdParam} onRun={runAction} />
                </div>
              )}
            </>
          )}
        </DataRefreshBoundary>
      </AdminWorkspace>
    </AdminShell>
  );
}
