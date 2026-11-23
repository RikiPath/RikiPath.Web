import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, X } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { searchMentors } from '@/features/mentor/api/mentorProfileApi.js';
import {
  Avatar,
  Badge,
  Button,
  CustomSelect,
  EmptyState,
  ErrorState,
  PageContainer,
  RefreshingIndicator,
  SakuraLoader,
  UnifiedToolbar,
  useDebouncedValue,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import Pagination from '@/components/ui/Pagination.jsx';
import { useLocale } from '@/locales/locale.js';

const LEVELS = ['', 'N5', 'N4', 'N3', 'N2'];
const PAGE_SIZE = 9;

/**
 * Group Learning entry: Mentor -> Profile -> Published Cohorts -> Cohort detail -> checkout.
 * Uses `GET /api/mentors` (MentorDiscoveryController); paging is server-side.
 */
export default function MentorDirectory() {
  const { tr, trf } = useLocale();
  const [term, setTerm] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(term.trim(), 350);

  const query = useQuery({
    queryKey: ['mentor-directory', search, level, page],
    queryFn: () =>
      searchMentors({
        searchTerm: search || undefined,
        teachingJlptLevel: level || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const unfilteredCountQuery = useQuery({
    queryKey: ['mentor-directory-unfiltered-count'],
    queryFn: () => searchMentors({ page: 1, pageSize: 1 }),
    staleTime: 60_000,
    enabled: Boolean(search || level),
  });

  const items = query.data?.items || [];
  const total = query.data?.totalCount ?? items.length;
  const hasNoMentors = query.isSuccess && (search || level
    ? unfilteredCountQuery.isSuccess && unfilteredCountQuery.data?.totalCount === 0
    : total === 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const levelOptions = LEVELS.map((l) => ({
    value: l,
    label: l ? trf('Dạy JLPT {0}', { 0: l }) : tr('Mọi trình độ'),
  }));

  const showDirectoryToolbar = !query.isPending && !query.isError && !hasNoMentors;
  const hasFilters = Boolean(term.trim() || level);

  return (
    <LearnerShell breadcrumb={tr('Tìm Giáo viên')}>
      <PageContainer width="default" className="relative space-y-4">
        <IllustratedPageHeader
          icon="group"
          tone="sakura"
          eyebrow={tr('Học cùng Giáo viên')}
          title={tr('Chọn Giáo viên đồng hành')}
          description={tr('Xem hồ sơ Giáo viên, các lớp nhóm đang mở đăng ký và chọn cường độ phù hợp với lịch của bạn. Mỗi lớp 10 tuần, buổi 90 phút, tối đa 4 học viên.')}
        />

        {showDirectoryToolbar && (
          <UnifiedToolbar
            search={{
              value: term,
              onChange: (e) => {
                setTerm(e.target.value);
                setPage(1);
              },
              onClear: () => {
                setTerm('');
                setPage(1);
              },
              placeholder: 'Tìm theo tên hoặc chuyên môn…',
              ariaLabel: tr('Tìm theo tên hoặc chuyên môn'),
            }}
            filters={
              <CustomSelect
                fitContent
                size="md"
                value={level}
                onChange={(nextLevel) => {
                  setLevel(nextLevel);
                  setPage(1);
                }}
                options={levelOptions}
                aria-label={tr('Trình độ giảng dạy')}
              />
            }
            actions={
              hasFilters ? (
                <Button
                  size="md"
                  variant="ghost"
                  icon={X}
                  onClick={() => {
                    setTerm('');
                    setLevel('');
                    setPage(1);
                  }}
                >
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : null
            }
          />
        )}

        {query.isFetching && !query.isPending && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}

        {query.isPending ? (
          <SakuraLoader variant="section" context="profile" label={tr('Đang tải danh sách Giáo viên')} delay={160} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
        ) : items.length === 0 ? (
          <EmptyState
            variant={!hasNoMentors && (search || level) ? 'search' : 'default'}
            illustration={!hasNoMentors && (search || level) ? 'search' : 'mentor'}
            title={!hasNoMentors && (search || level) ? tr('Không tìm thấy Giáo viên phù hợp') : tr('Chưa có Giáo viên công khai')}
            description={
              !hasNoMentors && (search || level)
                ? tr('Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.')
                : tr('Danh sách sẽ hiển thị khi Giáo viên được duyệt hồ sơ.')
            }
            action={!hasNoMentors && (search || level) ? <Button size="sm" variant="outline" onClick={() => { setTerm(''); setLevel(''); setPage(1); }}>{tr('Xóa bộ lọc')}</Button> : null}
          />
        ) : (
          <>
            <ul
              style={{ '--rp-grid-min': '18.5rem' }}
              className={`rp-fluid-grid-fill ${query.isFetching ? 'opacity-70' : ''}`}
              aria-busy={query.isFetching}
            >
              {items.map((m) => (
                <li key={m.mentorId}>
                  <Link
                    to={`/mentors/${m.mentorId}/`}
                    className="rp-focus group flex h-full flex-col rounded-rp-card border border-rp-line bg-rp-surface p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-rp-brand-border hover:shadow-rp-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={m.avatarUrl} name={m.name} size={48} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-rp-text">{m.name}</p>
                        <p className="truncate text-xs text-rp-text-muted">{m.expertise || tr('Giáo viên tiếng Nhật')}</p>
                      </div>
                    </div>
                    {m.bio && <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-rp-text-2">{m.bio}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(m.teachingJlptLevels || []).map((l) => (
                        <Badge key={l} tone="brand" size="sm">
                          {trf('Dạy {0}', { 0: l })}
                        </Badge>
                      ))}
                      {m.jlptLevel && (
                        <Badge tone="neutral" size="sm">
                          {trf('Chứng chỉ {0}', { 0: m.jlptLevel })}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 text-xs text-rp-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase aria-hidden="true" className="h-3.5 w-3.5" />
                        {m.yearsOfExperience != null
                          ? trf('{0} năm kinh nghiệm', { 0: m.yearsOfExperience })
                          : tr('Chưa cập nhật kinh nghiệm')}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-rp-brand-strong">
                        {tr('Xem lớp')}{' '}
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={Math.min(page, totalPages)}
                  totalPages={totalPages}
                  pageSize={PAGE_SIZE}
                  totalItems={total}
                  onPageChange={setPage}
                  showPageSize={false}
                  itemLabel={tr('Giáo viên')}
                  variant="neutral"
                />
              </div>
            )}
          </>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
