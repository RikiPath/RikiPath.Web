import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Search } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { searchMentors } from '@/features/mentor/api/mentorProfileApi.js';
import { Avatar, Badge, EmptyState, ErrorState, Input, PageHeader, RefreshingIndicator, SakuraLoader, Select, useDebouncedValue } from '@/components/ui';
import Pagination from '@/components/ui/Pagination.jsx';
import { useLocale } from '@/locales/locale.js';

const LEVELS = ['', 'N5', 'N4', 'N3', 'N2'];
const PAGE_SIZE = 9;

/**
 * Group Learning entry: Mentor → Profile → Published Cohorts → Cohort detail → checkout.
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
    queryFn: () => searchMentors({ searchTerm: search || undefined, teachingJlptLevel: level || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });
  const items = query.data?.items || [];
  const total = query.data?.totalCount ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <LearnerShell breadcrumb={tr('Tìm Mentor')}>
      <div className="rp-container py-6 lg:py-8">
        <PageHeader
          eyebrow={tr('Học nhóm')}
          title={tr('Chọn Mentor đồng hành')}
          description={tr('Xem hồ sơ Mentor, các lớp nhóm đang mở đăng ký và chọn cường độ phù hợp với lịch của bạn. Mỗi lớp 10 tuần, buổi 90 phút, tối đa 4 học viên.')}
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label className="relative block">
            <span className="sr-only">{tr('Tìm theo tên hoặc chuyên môn')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
            <Input
              type="search"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setPage(1);
              }}
              placeholder={tr('Tìm theo tên hoặc chuyên môn…')}
              className="pl-10"
            />
          </label>
          <label className="block">
            <span className="sr-only">{tr('Trình độ giảng dạy')}</span>
            <Select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
            >
              {LEVELS.map((l) => <option key={l || 'all'} value={l}>{l ? trf('Dạy JLPT {0}', { 0: l }) : tr('Mọi trình độ')}</option>)}
            </Select>
          </label>
        </div>

        <RefreshingIndicator active={query.isFetching && !query.isPending} className="mb-3" />
        {query.isPending ? (
          <SakuraLoader variant="section" context="profile" label={tr('Đang tải danh sách cố vấn')} delay={160} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
        ) : items.length === 0 ? (
          <EmptyState
            art="search"
            title={search || level ? tr('Không tìm thấy Mentor phù hợp') : tr('Chưa có Mentor công khai')}
            description={search || level ? tr('Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.') : tr('Danh sách sẽ hiển thị khi Mentor được duyệt hồ sơ.')}
          />
        ) : (
          <>
            <ul
              style={{ '--rp-grid-min': '18.5rem' }}
              className={`rp-fluid-grid ${query.isFetching ? 'opacity-70' : ''}`}
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
                        <p className="truncate text-xs text-rp-text-muted">{m.expertise || tr('Mentor tiếng Nhật')}</p>
                      </div>
                    </div>
                    {m.bio && <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-rp-text-2">{m.bio}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(m.teachingJlptLevels || []).map((l) => <Badge key={l} tone="brand" size="sm">{trf('Dạy {0}', { 0: l })}</Badge>)}
                      {m.jlptLevel && <Badge tone="neutral" size="sm">{trf('Chứng chỉ {0}', { 0: m.jlptLevel })}</Badge>}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 text-xs text-rp-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase aria-hidden="true" className="h-3.5 w-3.5" />
                        {m.yearsOfExperience != null ? trf('{0} năm kinh nghiệm', { 0: m.yearsOfExperience }) : tr('Chưa cập nhật kinh nghiệm')}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-rp-brand-strong">
                        {tr('Xem lớp')}{' '}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination currentPage={page} totalPages={totalPages} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} showPageSize={false} itemLabel="Mentor" variant="neutral" />
              </div>
            )}
          </>
        )}
      </div>
    </LearnerShell>
  );
}
