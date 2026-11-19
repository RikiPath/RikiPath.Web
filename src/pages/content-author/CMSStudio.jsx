import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { api } from '@/api/client.js';
import { getSession } from '@/app/auth/session.js';
import { ContentAuthorShell } from '@/layouts';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale } from '@/locales/locale.js';

const PRIMARY = [
  {
    to: '/content-manual',
    label: 'Soạn thảo thủ công',
    description: 'Tạo, chỉnh sửa bản nháp bài học, từ vựng, Kanji, ngữ pháp và gửi duyệt.',
    icon: 'edit_note',
  },
  {
    to: '/content-plan',
    label: 'Soạn với AI',
    description: 'Lập kế hoạch bài học hoặc gợi ý Kanji bằng AI và lưu thành bản nháp.',
    icon: 'auto_awesome',
  },
  {
    to: '/bulk-import',
    label: 'Import Excel',
    description: 'Xem trước diff từng dòng từ file Excel, chỉnh sửa nhanh rồi lưu lô nháp.',
    icon: 'upload_file',
  },
  {
    to: '/exam-builder',
    label: 'Đề thi thử',
    description: 'Biên soạn đề thi JLPT theo phần thi, lưu bản nháp và gửi duyệt lên hệ thống.',
    icon: 'assignment',
  },
  {
    to: '/author-dashboard',
    label: 'Bảng theo dõi',
    description: 'Theo dõi trạng thái nháp, chờ duyệt, đã duyệt hoặc lý do bị từ chối.',
    icon: 'fact_check',
  },
  {
    to: '/bulk-import?view=history',
    label: 'Lịch sử lô nhập',
    description: 'Xem lại các lô Excel đã lưu, sửa mục lỗi và gửi cả lô lên hàng chờ duyệt.',
    icon: 'history',
  },
];

const LIBRARY = [
  { to: '/lesson-cms', label: 'Bài học', description: 'Quản lý danh sách bài học đã tạo theo cấp độ JLPT.', icon: 'menu_book' },
  { to: '/vocabulary-editor', label: 'Từ vựng đã duyệt', description: 'Tra cứu kho từ vựng đã được xuất bản.', icon: 'translate' },
  { to: '/kanji-editor', label: 'Hán tự đã duyệt', description: 'Tra cứu chữ Hán, âm đọc và số nét đã duyệt.', icon: 'draw' },
  { to: '/content-library', label: 'Ngữ pháp đã duyệt', description: 'Tra cứu các mẫu ngữ pháp đã duyệt theo cấp độ.', icon: 'psychology' },
];

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

function ToolCard({ to, label, description, icon, featured = false }) {
  const { tr } = useLocale();
  return (
    <Link
      to={to}
      className={[
        'group flex h-full flex-col rounded-2xl border bg-white p-4',
        featured ? 'border-rp-brand-border shadow-[0_8px_24px_rgba(173,49,85,0.06)]' : 'border-rp-line',
        'transition hover:-translate-y-0.5 hover:border-rp-brand-border',
        focusClass,
      ].join(' ')}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rp-brand-tint text-rp-brand-strong">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="mt-4 text-[15px] font-semibold text-rp-text">{tr(label)}</span>
      <span className="mt-1 flex-1 text-[13px] leading-6 text-rp-text-muted">{tr(description)}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-rp-brand-strong">
        {tr('Mở')}
        <Icon name="arrow_forward" className="text-[16px] transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function CMSStudio() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const uid = getSession()?.userId ?? 'anon';

  const approvalsQuery = useQuery({
    queryKey: ['my-content-approvals', uid],
    queryFn: async () => {
      const data = await api.get('/content-approvals/mine');
      return Array.isArray(data) ? data : Array.isArray(data?.result) ? data.result : [];
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const rows = approvalsQuery.data || [];
    return {
      draft: rows.filter((r) => r.status === 'Draft').length,
      pending: rows.filter((r) => r.status === 'PendingReview').length,
      rejected: rows.filter((r) => r.status === 'Rejected').length,
      approved: rows.filter((r) => r.status === 'Approved').length,
    };
  }, [approvalsQuery.data]);

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb={tr('Studio')}>
      <div
        data-page="CMSStudio"
        className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text"
      >
        <header className="mb-[var(--rp-space-section)] overflow-hidden rounded-3xl border border-rp-brand-border bg-[linear-gradient(135deg,#FFF7FA_0%,#FCEEF3_55%,#FFFDFC_100%)] p-[var(--rp-space-card-pad)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rp-type-caption font-medium tracking-[0.14em] text-rp-brand-strong">{tr('STUDIO NỘI DUNG')}</p>
              <h1 className="rp-type-page-title mt-2 text-rp-text">{tr('Không gian biên soạn học liệu JLPT')}</h1>
              <p className="rp-type-body mt-2 max-w-2xl text-rp-text-muted">
                {tr('Soạn bài học thủ công, nhập từ Excel hoặc dùng trợ lý AI, lưu bản nháp để kiểm tra rồi gửi Admin xét duyệt.')}
              </p>
            </div>
            {approvalsQuery.isSuccess && (
              <div className="flex flex-wrap gap-2">
                <Link to="/author-dashboard" className="rounded-xl border border-rp-line bg-white px-3.5 py-2 text-xs font-semibold text-rp-text hover:border-rp-brand-border">
                  {tr('Bản nháp')}: <strong className="ml-1">{stats.draft}</strong>
                </Link>
                <Link to="/author-dashboard" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                  {tr('Chờ duyệt')}: <strong className="ml-1">{stats.pending}</strong>
                </Link>
                <Link to="/author-dashboard" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800">
                  {tr('Bị từ chối')}: <strong className="ml-1">{stats.rejected}</strong>
                </Link>
                <Link to="/author-dashboard" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                  {tr('Đã duyệt')}: <strong className="ml-1">{stats.approved}</strong>
                </Link>
              </div>
            )}
          </div>
        </header>

        <section style={{ '--rp-grid-min': '16rem' }} className="rp-fluid-grid">
          {PRIMARY.map((item) => <ToolCard key={item.to} {...item} featured />)}
        </section>

        <section className="mt-[var(--rp-space-section)]">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
            <h2 className="rp-type-card text-rp-text-2">{tr('Bài học & Kho đã duyệt')}</h2>
            <p className="rp-type-caption text-rp-text-muted">{tr('Tra cứu nội dung đã xuất bản (chỉ xem)')}</p>
          </div>
          <div style={{ '--rp-grid-min': '14rem' }} className="rp-fluid-grid">
            {LIBRARY.map((item) => <ToolCard key={item.to} {...item} />)}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 px-1">
            <h2 className="text-[15px] font-semibold text-rp-text-2">{tr('Nháp cục bộ trên trình duyệt')}</h2>
            <p className="mt-1 text-[12px] text-rp-text-muted">{tr('Công cụ phác thảo nhanh câu hỏi thử nghiệm trên phiên trình duyệt hiện tại.')}</p>
          </div>
          <div className="max-w-md">
            <ToolCard to="/question-bank" label={tr('Ngân hàng câu hỏi')} description={tr('Phác thảo câu hỏi tạm thời trong phiên trình duyệt (không tự lưu lên máy chủ).')} icon="quiz" />
          </div>
        </section>
      </div>
    </ContentAuthorShell>
  );
}
