import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquareText, Star } from 'lucide-react';

import { AdminShell, MentorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Modal,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
  UnifiedToolbar,
} from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import { getMentorCohortReviewSummary } from '@/features/cohorts/api/cohortApi.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

import { formatDateTime } from '@/utils/dateTimeFormat.js';

function when(value) {
  return formatDateTime(value, '');
}

function StarRow({ rating, label }) {
  const count = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span className="inline-flex items-center gap-0.5 text-rp-brand-strong" aria-label={label}>
      {Array.from({ length: 5 }, (_, idx) => (
        <Star
          key={idx}
          aria-hidden="true"
          className={`h-4 w-4 ${idx < count ? 'fill-current text-amber-500' : 'text-rp-line-strong'}`}
        />
      ))}
    </span>
  );
}

function CohortReviewCard({ review, onOpenDetail }) {
  const { trf, tr } = useLocale();
  const hasComment = Boolean(String(review.comment || '').trim());
  return (
    <Card interactive className="flex flex-col justify-between gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold text-rp-text">
              {review.cohortName || tr('Học viên lớp nhóm')}
            </p>
            {review.level && <Badge size="sm" tone="brand" icon={false}>JLPT {review.level}</Badge>}
          </div>
          <p className="mt-1 text-xs text-rp-text-muted">
            {when(review.updatedAtUtc || review.createdAtUtc)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StarRow rating={review.rating} label={trf('{0} trên 5 sao', { 0: review.rating })} />
          <span className="text-xs font-bold text-rp-text">{Number(review.rating || 0).toFixed(1)}</span>
        </div>
      </div>

      <p className={`whitespace-pre-wrap text-sm leading-6 ${hasComment ? 'text-rp-text' : 'italic text-rp-text-muted'}`}>
        {hasComment ? review.comment : tr('Học viên chấm điểm sao và không để lại nhận xét văn bản.')}
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onOpenDetail(review)}
          className="rp-focus rp-link inline-flex items-center gap-1 text-xs"
        >
          <MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" />
          {tr('Xem chi tiết')}
        </button>
      </div>
    </Card>
  );
}

export default function MentorReviews() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const mentorId = Number(user?.userId);
  const isAdminViewer = String(user?.role || '').toLowerCase() === 'admin';

  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedReview, setSelectedReview] = useState(null);

  const summary = useQuery({
    queryKey: ['mentor-cohort-review-summary', mentorId],
    queryFn: () => getMentorCohortReviewSummary(mentorId),
    enabled: mentorId > 0 && !isAdminViewer,
  });

  const data = summary.data;
  const rows = useMemo(() => (Array.isArray(data?.recentReviews) ? data.recentReviews : []), [data]);
  const average = Number(data?.averageRating);
  const total = data?.reviewCount ?? rows.length;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const next = rows.filter((r) => {
      const rating = Math.round(Number(r.rating) || 0);
      if (ratingFilter === 'commented' && !String(r.comment || '').trim()) return false;
      if (ratingFilter === '5' && rating !== 5) return false;
      if (ratingFilter === '4' && rating !== 4) return false;
      if (ratingFilter === 'low' && rating > 3) return false;
      if (q) {
        const hay = `${r.cohortName || ''} ${r.level || ''} ${r.comment || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    next.sort((a, b) => {
      if (sortOrder === 'highest') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortOrder === 'lowest') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
      const ta = parseUtcDate(a.updatedAtUtc || a.createdAtUtc)?.getTime() || 0;
      const tb = parseUtcDate(b.updatedAtUtc || b.createdAtUtc)?.getTime() || 0;
      return tb - ta;
    });
    return next;
  }, [rows, ratingFilter, search, sortOrder]);

  if (isAdminViewer) {
    return (
      <AdminShell pathname={pathname} breadcrumb={tr('Đánh giá lớp nhóm')}>
        <div className="rp-container py-6">
          <Banner
            tone="info"
            title={tr('Trang này hiển thị đánh giá riêng cho tài khoản Giáo viên')}
            actions={(
              <Button as={Link} to="/admin/mentors/" variant="primary" size="sm">
                {tr('Xem danh sách Giáo viên')}
              </Button>
            )}
          >
            {tr('Tài khoản Quản trị viên vui lòng xem đánh giá tổng hợp từng Giáo viên trong mục Quản trị.')}
          </Banner>
        </div>
      </AdminShell>
    );
  }

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Đánh giá lớp nhóm')}>
      <div className="rp-container py-6 text-rp-text lg:py-8 space-y-5">
        <h1 className="sr-only">{tr('Đánh giá từ học viên lớp nhóm')}</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button as={Link} to="/mentor-study-courses/" variant="secondary" size="sm">
            {tr('Về lớp phụ trách')}
          </Button>
        </div>

        {summary.isFetching && !summary.isPending && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}

        {mentorId <= 0 ? (
          <Card>
            <ContextualErrorState
              title={tr('Không xác định được tài khoản Giáo viên')}
              description={tr('Vui lòng đăng nhập lại để tải thông tin đánh giá.')}
            />
          </Card>
        ) : summary.isPending ? (
          <SakuraLoader variant="section" context="cohort" label={tr('Đang tải đánh giá lớp nhóm')} delay={160} />
        ) : summary.isError && !data ? (
          <Card>
            <ContextualErrorState
              error={summary.error}
              title={tr('Chưa tải được đánh giá lớp nhóm')}
              onRetry={() => summary.refetch()}
              retrying={summary.isFetching}
            />
          </Card>
        ) : (
          <>
            {summary.isError && data && (
              <StaleDataBar onRetry={() => summary.refetch()} retrying={summary.isFetching} />
            )}

            {rows.length > 0 && (
              <section className="grid gap-3 sm:grid-cols-3">
                <Card density="compact">
                  <p className="text-xs text-rp-text-muted">{tr('Điểm trung bình')}</p>
                  <p className="mt-1 text-2xl font-bold text-rp-brand-strong">
                    {Number.isFinite(average) && total > 0 ? `${average.toFixed(1)} / 5` : tr('Chưa có')}
                  </p>
                </Card>
                <Card density="compact">
                  <p className="text-xs text-rp-text-muted">{tr('Số lượt đánh giá công khai')}</p>
                  <p className="mt-1 text-2xl font-bold text-rp-text">{total}</p>
                </Card>
                <Card density="compact">
                  <p className="text-xs text-rp-text-muted">{tr('Nhận xét kèm văn bản')}</p>
                  <p className="mt-1 text-2xl font-bold text-rp-text">
                    {rows.filter((r) => Boolean(String(r.comment || '').trim())).length}
                  </p>
                </Card>
              </section>
            )}

            {rows.length > 0 && (
              <UnifiedToolbar
                tabs={{
                  label: tr('Lọc đánh giá'),
                  value: ratingFilter,
                  onChange: setRatingFilter,
                  tabs: [
                    { value: 'all', label: 'Tất cả', count: rows.length },
                    { value: 'commented', label: 'Có nhận xét' },
                    { value: '5', label: '5 sao' },
                    { value: '4', label: '4 sao' },
                    { value: 'low', label: 'Từ 3 sao trở xuống' },
                  ],
                }}
                search={{
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  onClear: () => setSearch(''),
                  placeholder: 'Tìm theo lớp hoặc nội dung…',
                  ariaLabel: tr('Tìm đánh giá'),
                }}
                filters={
                  <CustomSelect
                    fitContent
                    size="sm"
                    value={sortOrder}
                    onChange={setSortOrder}
                    label={tr('Sắp xếp')}
                    options={[
                      { value: 'newest', label: 'Mới nhất' },
                      { value: 'highest', label: 'Điểm cao trước' },
                      { value: 'lowest', label: 'Cần lưu ý trước' },
                    ]}
                  />
                }
                refresh={{
                  onRefresh: () => summary.refetch({ cancelRefetch: true }),
                  refreshing: summary.isFetching && !summary.isPending,
                  disabled: summary.isPending,
                }}
              />
            )}

            {filteredRows.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredRows.map((review, idx) => (
                  <CohortReviewCard
                    key={review.id || `${review.createdAtUtc}-${idx}`}
                    review={review}
                    onOpenDetail={setSelectedReview}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <ContextualEmptyState
                  variant={rows.length === 0 ? 'compact' : 'search'}
                  illustration={rows.length === 0 ? 'review' : 'search'}
                  title={rows.length === 0 ? tr('Chưa có đánh giá lớp nhóm công khai.') : tr('Không có đánh giá khớp bộ lọc')}
                  description={
                    rows.length === 0
                      ? tr('Khi học viên hoàn tất đánh giá lớp học nhóm của bạn, nhận xét sẽ hiển thị tại đây.')
                      : tr('Thử thay đổi bộ lọc số sao hoặc từ khóa tìm kiếm.')
                  }
                  action={
                    rows.length > 0 && (ratingFilter !== 'all' || search.trim() !== '') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRatingFilter('all');
                          setSearch('');
                        }}
                      >
                        {tr('Xóa bộ lọc')}
                      </Button>
                    ) : null
                  }
                />
              </Card>
            )}
          </>
        )}

        <Modal
          open={Boolean(selectedReview)}
          onClose={() => setSelectedReview(null)}
          title={selectedReview?.cohortName || tr('Chi tiết đánh giá lớp nhóm')}
          size="md"
        >
          {selectedReview && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedReview.level && <Badge size="sm" tone="brand" icon={false}>JLPT {selectedReview.level}</Badge>}
                  <span className="text-xs text-rp-text-muted">{when(selectedReview.updatedAtUtc || selectedReview.createdAtUtc)}</span>
                </div>
                <StarRow rating={selectedReview.rating} label={`${selectedReview.rating}/5`} />
              </div>
              <p className="whitespace-pre-wrap leading-6 text-rp-text">
                {String(selectedReview.comment || '').trim() || tr('Học viên chỉ chấm điểm sao cho buổi học/lớp học này.')}
              </p>
              <p className="text-xs text-rp-text-muted">
                {tr('Nhận xét được ẩn danh thông tin học viên để đảm bảo đánh giá khách quan.')}
              </p>
            </div>
          )}
        </Modal>
      </div>
    </MentorShell>
  );
}
