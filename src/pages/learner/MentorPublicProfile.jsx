import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { getPublicMentorProfile } from '@/features/mentor/api/mentorProfileApi.js';
import { getCohorts, getMentorCohortReviewSummary } from '@/features/cohorts/api/cohortApi';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { useCohortEnrollmentFlow } from '@/features/cohorts/hooks/useCohortEnrollmentFlow.js';
import CohortDiscoveryCard from '@/features/cohorts/components/CohortDiscoveryCard.jsx';
import CohortDetailModal from '@/features/cohorts/components/CohortDetailModal.jsx';
import CohortConfirmEnrollModal from '@/features/cohorts/components/CohortConfirmEnrollModal.jsx';
import { cohortDiscoveryStatusOf } from '@/features/cohorts/utils/cohortCardModel';
import { formatDate } from '@/utils/dateTimeFormat.js';
import {
  Avatar,
  BackButton,
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  PageContainer,
  RatingStars,
  SakuraLoader,
  Tabs,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const TAB_ALIASES = {
  overview: 'info',
  info: 'info',
  cohorts: 'cohorts',
  reviews: 'reviews',
};

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-rp-line bg-rp-surface px-3.5 py-3 shadow-rp-xs">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-rp-text-muted">
        <span className="truncate">{label}</span>
        {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-brand" />}
      </div>
      <p className="m-0 mt-1.5 text-lg font-bold leading-tight tabular-nums text-rp-text sm:text-xl">
        {value}
      </p>
      {hint && <p className="m-0 mt-1 truncate text-[11.5px] text-rp-text-muted">{hint}</p>}
    </div>
  );
}

/** Detail page for Mentor Public Profile (/mentors/:mentorId/). */
export default function MentorPublicProfile() {
  const { tr, trf } = useLocale();
  const { mentorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [starFilter, setStarFilter] = useState('all');
  const [reviewSort, setReviewSort] = useState('newest');

  const id = Number(mentorId);
  const valid = Number.isInteger(id) && id > 0;
  const rawTab = searchParams.get('tab') || 'info';
  const activeTab = TAB_ALIASES[rawTab] || 'info';

  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    setSearchParams(next, { replace: true, state: location.state });
  };

  const profileQuery = useQuery({
    queryKey: ['public-mentor', id],
    queryFn: () => getPublicMentorProfile(id),
    enabled: valid,
  });

  const reviewQuery = useQuery({
    queryKey: ['mentor-cohort-reviews', id],
    queryFn: () => getMentorCohortReviewSummary(id),
    enabled: valid,
  });

  const cohortQuery = useQuery({
    queryKey: ['public-mentor-cohorts', id],
    queryFn: () => getCohorts({ mentorId: id }),
    enabled: valid,
  });

  const workspace = useLearnerCohortWorkspace({
    includeCohorts: false,
    includeEntitlements: false,
  });

  const rawMentorCohorts = useMemo(
    () => (Array.isArray(cohortQuery.data) ? cohortQuery.data : []).filter((c) => Number(c.mentorId) === id),
    [cohortQuery.data, id],
  );

  const handleRefreshCohorts = () => Promise.all([
    cohortQuery.refetch({ cancelRefetch: true }),
    workspace.coursesQuery.refetch({ cancelRefetch: true }).catch(() => null),
  ]);

  const handleCohortEnrolled = (courseId, actionKind) => {
    if (courseId && actionKind !== 'resume_payment') {
      navigate(`/my-courses/${courseId}`);
    } else {
      navigate('/my-courses');
    }
  };

  const {
    statusByCohortId,
    detailCohort,
    detailStatusInfo,
    confirmCohort,
    setConfirmCohort,
    checkingCohortId,
    handleOpenDetail,
    handleCloseDetail,
    handleRequestEnroll,
    handleConfirmEnroll,
  } = useCohortEnrollmentFlow({
    cohorts: rawMentorCohorts,
    baseRows: rawMentorCohorts,
    enrolledCourses: workspace.courses,
    onRefresh: handleRefreshCohorts,
    onRun: workspace.runAction,
    onEnrolled: handleCohortEnrolled,
  });

  // Chỉ giữ lớp đang tuyển sinh (loại bỏ lớp đóng tuyển sinh, đang dạy, hoàn thành, hủy, nháp);
  // lớp còn chỗ đứng trước, lớp đã đủ sĩ số (chưa qua hạn) xếp ở cuối danh sách.
  const recruitingCohorts = useMemo(() => {
    const eligible = rawMentorCohorts.filter((c) => {
      const st = statusByCohortId.get(Number(c.id)) || cohortDiscoveryStatusOf(c);
      return !st.isExpiredOrHidden;
    });
    eligible.sort((a, b) => {
      const aFull = (statusByCohortId.get(Number(a.id))?.isFull) ? 1 : 0;
      const bFull = (statusByCohortId.get(Number(b.id))?.isFull) ? 1 : 0;
      if (aFull !== bFull) return aFull - bFull;
      return new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime();
    });
    return eligible;
  }, [rawMentorCohorts, statusByCohortId]);

  const profile = profileQuery.data;
  const review = reviewQuery.data;
  const hasReviews = Number(review?.reviewCount || 0) > 0;

  const ratingRows = useMemo(() => {
    const serverRows = Array.isArray(review?.ratingDistribution) ? review.ratingDistribution : [];
    const byStar = new Map(serverRows.map((row) => [Number(row.star ?? row.Star), Number(row.count ?? row.Count ?? 0)]));
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: byStar.get(star) || 0,
    }));
  }, [review]);

  const reviewComments = useMemo(() => {
    const base = Array.isArray(review?.comments) ? review.comments : [];
    const filtered = starFilter === 'all'
      ? base
      : base.filter((item) => Math.round(Number(item.rating)) === Number(starFilter));
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.createdAtUtc || 0).getTime();
      const timeB = new Date(b.createdAtUtc || 0).getTime();
      return reviewSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [review, starFilter, reviewSort]);

  const starFilterOptions = useMemo(() => [
    { value: 'all', label: tr('Tất cả') },
    ...[5, 4, 3, 2, 1].map((star) => ({
      value: String(star),
      label: trf('{0} sao', { 0: star }),
    })),
  ], [tr, trf]);

  const sortOptions = useMemo(() => [
    { value: 'newest', label: tr('Mới nhất') },
    { value: 'oldest', label: tr('Cũ nhất') },
  ], [tr]);

  return (
    <LearnerShell breadcrumb={profile?.name || tr('Chi tiết Giáo viên')}>
      <PageContainer width="wide" density="comfortable" className="space-y-4 text-rp-text">
        <div className="flex items-center">
          <BackButton
            variant="link"
            fallbackTo="/mentors/"
            label="Quay lại danh sách giáo viên"
            defaultOriginLabel="Quay lại"
            restoreListKey="/mentors"
          />
        </div>

        {!valid ? (
          <Card>
            <ContextualEmptyState
              illustration="mentor"
              title={tr('Không tìm thấy Giáo viên')}
              description={tr('Đường dẫn hồ sơ không hợp lệ.')}
            />
          </Card>
        ) : profileQuery.isPending ? (
          <SakuraLoader variant="section" context="profile" label={tr('Đang tải hồ sơ Giáo viên')} delay={160} />
        ) : profileQuery.isError ? (
          <Card>
            <ContextualErrorState
              error={profileQuery.error}
              title={tr('Chưa tải được hồ sơ Giáo viên')}
              onRetry={() => profileQuery.refetch()}
              retrying={profileQuery.isFetching}
            />
          </Card>
        ) : (
          <>
            {/* Compact Detail Page Header Card: 1 hàng ngang 2 vùng (trái thông tin, phải sliding pill tabs) */}
            <header
              data-page-header="true"
              className="rounded-rp-card border border-rp-line bg-rp-surface px-4 py-4 shadow-rp-xs sm:px-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar src={profile.avatarUrl} name={profile.name} size={72} className="shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="m-0 break-words text-xl font-bold leading-snug text-rp-text sm:text-2xl">
                        {profile.name}
                      </h1>
                      {profile.isBookable && (
                        <Badge tone="success" size="sm" icon={ShieldCheck}>
                          {tr('Đã xác minh')}
                        </Badge>
                      )}
                    </div>
                    <p className="m-0 text-sm font-medium text-rp-text-2">
                      {profile.expertise || tr('Giáo viên tiếng Nhật')}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-rp-text-muted">
                      {profile.jlptLevel && (
                        <span className="inline-flex items-center gap-1 font-medium text-rp-text-2">
                          <Award aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
                          {trf('Chứng chỉ JLPT {0}', { 0: profile.jlptLevel })}
                        </span>
                      )}
                      {profile.workplace && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
                          {profile.workplace}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-start lg:self-center">
                  <Tabs
                    variant="pill"
                    size="md"
                    value={activeTab}
                    onChange={handleTabChange}
                    label={tr('Hồ sơ Giáo viên')}
                    tabs={[
                      { value: 'info', label: tr('Thông tin') },
                      {
                        value: 'cohorts',
                        label: tr('Lớp học'),
                        count: !cohortQuery.isPending && recruitingCohorts.length > 0
                          ? recruitingCohorts.length
                          : undefined,
                        badgeTone: 'danger',
                      },
                      { value: 'reviews', label: tr('Đánh giá') },
                    ]}
                  />
                </div>
              </div>
            </header>

            {workspace.actionError && (
              <Banner tone="danger" title={tr('Chưa thực hiện được')} onDismiss={() => workspace.setActionError('')}>
                {workspace.actionError}
              </Banner>
            )}
            {workspace.actionNotice && (
              <Banner tone="success" title={tr('Thông báo')} onDismiss={() => workspace.setActionNotice('')}>
                {workspace.actionNotice}
              </Banner>
            )}

            {activeTab === 'info' && (
              <div className="space-y-4">
                <section aria-label={tr('Thống kê Giáo viên')}>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile
                      icon={Star}
                      label={tr('Đánh giá trung bình')}
                      value={reviewQuery.isPending ? '…' : reviewQuery.isError ? '—' : (hasReviews ? `${Number(review.averageRating).toFixed(1)}/5` : '—')}
                      hint={hasReviews ? tr('Từ học viên lớp nhóm') : tr('Chưa có đánh giá')}
                    />
                    <StatTile
                      icon={MessageSquareText}
                      label={tr('Lượt đánh giá')}
                      value={reviewQuery.isPending ? '…' : reviewQuery.isError ? '—' : (review?.reviewCount ?? 0)}
                      hint={tr('Đánh giá công khai')}
                    />
                    <StatTile
                      icon={Briefcase}
                      label={tr('Kinh nghiệm')}
                      value={profile.yearsOfExperience != null
                        ? trf('{0} năm', { 0: profile.yearsOfExperience })
                        : '—'}
                      hint={profile.yearsOfExperience == null ? tr('Chưa cập nhật') : tr('Giảng dạy tiếng Nhật')}
                    />
                    <StatTile
                      icon={CheckCircle2}
                      label={tr('Lớp đã hoàn thành')}
                      value={profile.completedCohortCount ?? 0}
                      hint={tr('Khóa học nhóm đã xong')}
                    />
                  </div>
                </section>

                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                  <Card className="space-y-3 p-5">
                    <h2 className="m-0 text-base font-bold text-rp-text">{tr('Giới thiệu Giáo viên')}</h2>
                    <p className="m-0 whitespace-pre-wrap text-sm leading-7 text-rp-text-2">
                      {profile.bio || tr('Giáo viên chưa cập nhật phần giới thiệu.')}
                    </p>
                  </Card>

                  <Card className="space-y-3 p-5">
                    <h2 className="m-0 text-base font-bold text-rp-text">{tr('Chuyên môn & chứng chỉ')}</h2>
                    <dl className="m-0 space-y-2.5 text-sm">
                      <div className="flex items-start justify-between gap-3 border-b border-rp-line/60 pb-2">
                        <dt className="text-xs font-medium text-rp-text-muted">{tr('Chuyên môn chính')}</dt>
                        <dd className="m-0 text-right font-semibold text-rp-text">
                          {profile.expertise || tr('Giáo viên tiếng Nhật')}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3 border-b border-rp-line/60 pb-2">
                        <dt className="text-xs font-medium text-rp-text-muted">{tr('Chứng chỉ JLPT')}</dt>
                        <dd className="m-0 text-right font-semibold text-rp-text">
                          {profile.jlptLevel || tr('Chưa cập nhật')}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3 border-b border-rp-line/60 pb-2">
                        <dt className="text-xs font-medium text-rp-text-muted">{tr('Trình độ giảng dạy')}</dt>
                        <dd className="m-0 text-right font-semibold text-rp-text">
                          {(profile.teachingJlptLevels || []).length > 0
                            ? profile.teachingJlptLevels.join(', ')
                            : tr('Chưa cập nhật')}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3 border-b border-rp-line/60 pb-2">
                        <dt className="text-xs font-medium text-rp-text-muted">{tr('Kinh nghiệm')}</dt>
                        <dd className="m-0 text-right font-semibold text-rp-text">
                          {profile.yearsOfExperience != null
                            ? trf('{0} năm', { 0: profile.yearsOfExperience })
                            : tr('Chưa cập nhật')}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-xs font-medium text-rp-text-muted">{tr('Nơi công tác')}</dt>
                        <dd className="m-0 text-right font-semibold text-rp-text">
                          {profile.workplace || tr('Chưa cập nhật')}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'cohorts' && (
              <section aria-labelledby="mentor-recruiting-cohorts" className="space-y-4">
                <h2 id="mentor-recruiting-cohorts" className="m-0 text-base font-bold text-rp-text">
                  {tr('Danh sách lớp đang tuyển sinh')}
                </h2>

                {cohortQuery.isPending ? (
                  <SakuraLoader variant="section" context="cohort" delay={160} />
                ) : cohortQuery.isError ? (
                  <Card>
                    <ContextualErrorState
                      compact
                      error={cohortQuery.error}
                      title={tr('Chưa tải được danh sách lớp')}
                      onRetry={() => cohortQuery.refetch()}
                      retrying={cohortQuery.isFetching}
                    />
                  </Card>
                ) : recruitingCohorts.length === 0 ? (
                  <Card>
                    <ContextualEmptyState
                      variant="compact"
                      illustration="classroom"
                      title={tr('Giáo viên hiện chưa có lớp đang tuyển sinh.')}
                      description={tr('Các lớp học nhóm mới sẽ hiển thị tại đây khi được duyệt và mở tuyển sinh.')}
                    />
                  </Card>
                ) : (
                  <div className="@container">
                    <div className="grid grid-cols-1 gap-4 @[940px]:grid-cols-2">
                      {recruitingCohorts.map((cohort) => {
                        const statusInfo = statusByCohortId.get(Number(cohort.id)) || cohortDiscoveryStatusOf(cohort);
                        return (
                          <CohortDiscoveryCard
                            key={cohort.id}
                            cohort={cohort}
                            statusInfo={statusInfo}
                            busy={workspace.busy}
                            checking={Number(checkingCohortId) === Number(cohort.id)}
                            showMentorRow={false}
                            onOpenDetail={handleOpenDetail}
                            onEnroll={handleRequestEnroll}
                            onViewCourse={handleCohortEnrolled}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'reviews' && (
              <section aria-labelledby="mentor-reviews-heading" className="space-y-4">
                <h2 id="mentor-reviews-heading" className="sr-only">{tr('Đánh giá của học viên')}</h2>
                {reviewQuery.isPending ? (
                  <SakuraLoader variant="section" context="cohort" label={tr('Đang tải đánh giá…')} delay={160} />
                ) : reviewQuery.isError ? (
                  <Card>
                    <ContextualErrorState
                      compact
                      error={reviewQuery.error}
                      title={tr('Chưa tải được đánh giá')}
                      onRetry={() => reviewQuery.refetch()}
                      retrying={reviewQuery.isFetching}
                    />
                  </Card>
                ) : !hasReviews ? (
                  <Card>
                    <ContextualEmptyState
                      variant="compact"
                      illustration="classroom"
                      title={tr('Chưa có đánh giá của học viên.')}
                      description={tr('Đánh giá sẽ hiển thị sau khi học viên hoàn thành khóa học và gửi phản hồi.')}
                    />
                  </Card>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
                    <Card className="space-y-4 p-5">
                      <div>
                        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
                          {tr('Điểm đánh giá trung bình')}
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold tabular-nums text-rp-text">
                            {Number(review.averageRating).toFixed(1)}
                          </span>
                          <span className="text-sm font-semibold text-rp-text-muted">/ 5</span>
                        </div>
                        <div className="mt-2">
                          <RatingStars
                            rating={review.averageRating}
                            reviewCount={review.reviewCount}
                            size="md"
                            showCount
                            countSuffix="đánh giá"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-rp-line/70 pt-3">
                        <p className="m-0 text-xs font-semibold text-rp-text-2">{tr('Phân bố điểm đánh giá')}</p>
                        {ratingRows.map((row) => {
                          const percent = review.reviewCount > 0
                            ? Math.round((row.count / review.reviewCount) * 100)
                            : 0;
                          return (
                            <button
                              key={row.star}
                              type="button"
                              onClick={() =>
                                setStarFilter((prev) => (prev === String(row.star) ? 'all' : String(row.star)))
                              }
                              className={`rp-focus flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-xs transition-colors ${
                                starFilter === String(row.star)
                                  ? 'bg-rp-brand-soft/60 text-rp-brand-strong'
                                  : 'hover:bg-rp-surface-2'
                              }`}
                            >
                              <span className="w-8 shrink-0 font-semibold tabular-nums text-rp-text-2">
                                {row.star} ★
                              </span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-rp-bg-2">
                                <div
                                  className="h-full rounded-full bg-amber-400 transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="w-7 shrink-0 text-right tabular-nums text-rp-text-muted">
                                {row.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Card>

                    <Card className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Nhận xét gần đây')}</h3>
                          <Badge tone="neutral" size="sm">{reviewComments.length}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CustomSelect
                            fitContent
                            size="sm"
                            value={starFilter}
                            onChange={setStarFilter}
                            options={starFilterOptions}
                            aria-label={tr('Số sao')}
                          />
                          <CustomSelect
                            fitContent
                            size="sm"
                            value={reviewSort}
                            onChange={setReviewSort}
                            options={sortOptions}
                            aria-label={tr('Sắp xếp')}
                          />
                        </div>
                      </div>

                      {reviewComments.length === 0 ? (
                        <ContextualEmptyState
                          variant="inline"
                          size="sm"
                          illustration="classroom"
                          title={
                            starFilter !== 'all'
                              ? tr('Không có nhận xét cho mức sao đã chọn.')
                              : tr('Chưa có nhận xét bằng chữ')
                          }
                          description={
                            starFilter !== 'all'
                              ? tr('Thử chọn mức sao khác hoặc xem toàn bộ đánh giá.')
                              : tr('Học viên đã gửi điểm đánh giá sao cho các khóa học của Giáo viên.')
                          }
                          action={
                            starFilter !== 'all' ? (
                              <Button size="xs" variant="outline" onClick={() => setStarFilter('all')}>
                                {tr('Xem tất cả sao')}
                              </Button>
                            ) : null
                          }
                        />
                      ) : (
                        <ul className="m-0 list-none divide-y divide-rp-line/70 p-0">
                          {reviewComments.map((item) => (
                            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <RatingStars rating={item.rating} size="sm" />
                                  <span className="text-xs font-medium text-rp-text-muted">
                                    {tr('Học viên lớp nhóm')}
                                  </span>
                                  {item.cohortName && (
                                    <span className="rounded-md bg-rp-surface-2 px-2 py-0.5 text-[11px] font-medium text-rp-text-2">
                                      {item.cohortName}
                                    </span>
                                  )}
                                </div>
                                {item.createdAtUtc && (
                                  <span className="text-xs tabular-nums text-rp-text-muted">
                                    {formatDate(item.createdAtUtc)}
                                  </span>
                                )}
                              </div>
                              <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-rp-text-2">
                                {item.comment}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </div>
                )}
              </section>
            )}

            {/* Modal Chi tiết lớp & Xác nhận ghi danh (giữ luồng Tìm Giáo viên -> Hồ sơ -> Chi tiết lớp -> Ghi danh -> Thanh toán) */}
            <CohortDetailModal
              cohort={detailCohort}
              statusInfo={detailStatusInfo}
              busy={workspace.busy}
              checkingEligibility={Boolean(detailCohort && Number(checkingCohortId) === Number(detailCohort.id))}
              hideMentorProfileLink
              onClose={handleCloseDetail}
              onEnroll={handleRequestEnroll}
              onViewCourse={handleCohortEnrolled}
            />

            <CohortConfirmEnrollModal
              cohort={confirmCohort}
              busy={workspace.busy}
              onClose={() => setConfirmCohort(null)}
              onConfirm={handleConfirmEnroll}
            />
          </>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
