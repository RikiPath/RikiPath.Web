import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Building2, Star } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { getPublicMentorProfile } from '@/features/mentor/api/mentorProfileApi.js';
import { getCohorts, getMentorCohortReviewSummary } from '@/features/cohorts/api/cohortApi';
import CohortSummaryCard from '@/features/cohorts/components/CohortSummaryCard';
import { Avatar, Badge, Card, EmptyState, ErrorState, PageContainer, SakuraLoader } from '@/components/ui';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

/** Group Learning: Mentor -> Profile -> Published Cohorts -> Cohort Discovery. */
export default function MentorPublicProfile() {
  const { tr, trf } = useLocale();
  const { mentorId } = useParams();
  const id = Number(mentorId);
  const valid = Number.isInteger(id) && id > 0;

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

  const profile = profileQuery.data;
  const cohorts = (cohortQuery.data || []).filter((c) => c.mentorId === id);
  const review = reviewQuery.data;

  return (
    <LearnerShell breadcrumb={profile?.name || tr('Hồ sơ Giáo viên')}>
      <PageContainer width="default">
        <Link to="/mentors/" className="rp-focus rp-link mb-4 inline-flex items-center gap-1.5 rounded text-sm font-semibold">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {' '}
          {tr('Tất cả Giáo viên')}
        </Link>

        {!valid ? (
          <Card>
            <EmptyState art="search" title={tr('Không tìm thấy Giáo viên')} description={tr('Đường dẫn hồ sơ không hợp lệ.')} />
          </Card>
        ) : profileQuery.isPending ? (
          <SakuraLoader variant="section" context="profile" label={tr('Đang tải hồ sơ Giáo viên')} delay={160} />
        ) : profileQuery.isError ? (
          <Card>
            <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} retrying={profileQuery.isFetching} />
          </Card>
        ) : (
          <Card as="header" className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar src={profile.avatarUrl} name={profile.name} size={72} />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-rp-text">{profile.name}</h1>
                <p className="mt-1 text-sm text-rp-text-2">{profile.expertise || tr('Giáo viên tiếng Nhật')}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(profile.teachingJlptLevels || []).map((l) => (
                    <Badge key={l} tone="brand">
                      {trf('Dạy JLPT {0}', { 0: l })}
                    </Badge>
                  ))}
                  {profile.jlptLevel && <Badge tone="neutral">{trf('Chứng chỉ {0}', { 0: profile.jlptLevel })}</Badge>}
                </div>
                <dl className="mt-4 grid gap-2 text-[13px] text-rp-text-2 sm:grid-cols-3">
                  <div className="flex items-center gap-1.5">
                    <Briefcase aria-hidden="true" className="h-4 w-4 text-rp-text-muted" />
                    <dt className="sr-only">{tr('Kinh nghiệm')}</dt>
                    <dd>
                      {profile.yearsOfExperience != null
                        ? trf('{0} năm kinh nghiệm', { 0: profile.yearsOfExperience })
                        : tr('Chưa cập nhật')}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 aria-hidden="true" className="h-4 w-4 text-rp-text-muted" />
                    <dt className="sr-only">{tr('Nơi công tác')}</dt>
                    <dd className="truncate">{profile.workplace || tr('Chưa cập nhật nơi công tác')}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star aria-hidden="true" className="h-4 w-4 text-tone-grammar" />
                    <dt className="sr-only">{tr('Đánh giá lớp nhóm')}</dt>
                    <dd>
                      {reviewQuery.isPending ? (
                        <SakuraLoader variant="inline" size={14} context="cohort" label={tr('Đang tải đánh giá…')} delay={160} />
                      ) : reviewQuery.isError ? (
                        <span className="inline-flex flex-wrap items-center gap-2 text-rp-brand-strong">
                          <span>{tr('Chưa tải được đánh giá')}</span>
                          <button type="button" onClick={() => reviewQuery.refetch()} className="rp-focus rp-link text-xs font-semibold">
                            {tr('Thử lại')}
                          </button>
                        </span>
                      ) : review?.reviewCount ? (
                        trf('{0}/5 · {1} đánh giá lớp nhóm', {
                          0: Number(review.averageRating).toFixed(1),
                          1: review.reviewCount,
                        })
                      ) : (
                        tr('Chưa có đánh giá lớp nhóm')
                      )}
                    </dd>
                  </div>
                </dl>
                {/* Bio is rendered as text (React escapes it) — never as HTML. */}
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-rp-text">
                  {profile.bio || tr('Giáo viên chưa cập nhật phần giới thiệu.')}
                </p>
              </div>
            </div>
          </Card>
        )}

        <section aria-labelledby="mentor-cohorts" className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="mentor-cohorts" className="text-lg font-bold text-rp-text">
                {tr('Lớp nhóm đang mở')}
              </h2>
              <p className="text-sm text-rp-text-muted">
                {tr('10 tuần · 90 phút/buổi · 1–4 học viên · học phí trọn khóa')}
              </p>
            </div>
            {cohorts.length > 0 && (
              <Link to={`/cohorts?mentorId=${id}`} className="rp-focus rp-link inline-flex items-center gap-1.5 rounded text-sm font-semibold">
                {tr('Lọc & đăng ký trong Khám phá lớp học')}{' '}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </div>
          {cohortQuery.isPending ? (
            <SakuraLoader variant="section" context="cohort" delay={160} />
          ) : cohortQuery.isError ? (
            <Card>
              <ErrorState error={cohortQuery.error} onRetry={() => cohortQuery.refetch()} retrying={cohortQuery.isFetching} compact />
            </Card>
          ) : cohorts.length === 0 ? (
            <Card>
              <EmptyState
                art="calendar"
                title={tr('Giáo viên chưa có lớp đang mở đăng ký')}
                description={tr('Bạn có thể quay lại sau hoặc xem lớp của Giáo viên khác.')}
              />
            </Card>
          ) : (
            <div className="course-page" style={{ padding: 0 }}>
              <div className="course-grid">
                {cohorts.map((cohort) => (
                  <CohortSummaryCard key={cohort.id} cohort={cohort} showFullSchedule={false}>
                    <Link className="course-pill-link" to={`/cohorts?mentorId=${id}`} style={{ marginTop: 10 }}>
                      {tr('Xem chi tiết & giữ chỗ')}
                    </Link>
                  </CohortSummaryCard>
                ))}
              </div>
            </div>
          )}
        </section>
      </PageContainer>
    </LearnerShell>
  );
}
