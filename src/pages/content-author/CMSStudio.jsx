import { Link, useLocation } from 'react-router-dom';
import { ContentAuthorShell } from '@/layouts';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale } from '@/locales/locale.js';

const PRIMARY = [
  {
    to: '/content-plan',
    label: 'Soạn với AI',
    description: 'Viết ý tưởng, xem trước rồi gửi duyệt.',
    icon: 'auto_awesome',
  },
  {
    to: '/bulk-import',
    label: 'Import Excel',
    description: 'Đưa cả một bài học vào hàng chờ.',
    icon: 'upload_file',
  },
  {
    to: '/author-dashboard',
    label: 'Bảng theo dõi',
    description: 'Xem bài chờ duyệt, đã duyệt hoặc bị từ chối.',
    icon: 'fact_check',
  },
];

const LIBRARY = [
  { to: '/lesson-cms', label: 'Bài đã gửi', description: 'Danh sách bài đang chờ hoặc đã duyệt.', icon: 'menu_book' },
  { to: '/vocabulary-editor', label: 'Từ vựng', description: 'Kho từ đã được duyệt.', icon: 'translate' },
  { to: '/kanji-editor', label: 'Hán tự', description: 'Chữ, âm đọc và số nét đã duyệt.', icon: 'draw' },
  { to: '/content-library', label: 'Ngữ pháp', description: 'Mẫu câu đã đi cùng bài học.', icon: 'psychology' },
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
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${featured ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-rp-brand-tint text-rp-brand-strong'}`}>
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

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb={tr('Tổng quan')}>
      <div
        data-page="CMSStudio"
        className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text"
      >
        <header className="mb-[var(--rp-space-section)] overflow-hidden rounded-3xl border border-rp-brand-border bg-[linear-gradient(135deg,#FFF7FA_0%,#FCEEF3_55%,#FFFDFC_100%)] p-[var(--rp-space-card-pad)] sm:p-8">
          <p className="rp-type-caption font-medium tracking-[0.14em] text-rp-brand-strong">{tr('STUDIO NỘI DUNG')}</p>
          <h1 className="rp-type-page-title mt-2 text-rp-text">{tr('Xin chào, cùng soạn bài hôm nay.')}</h1>
          <p className="rp-type-body mt-2 max-w-xl text-rp-text-muted">
            {tr('Gửi bài bằng Excel hoặc AI, rồi theo dõi admin duyệt. Kho từ và ngữ pháp hiện những mục đã được xuất bản.')}
          </p>
        </header>

        <section style={{ '--rp-grid-min': '16rem' }} className="rp-fluid-grid">
          {PRIMARY.map((item) => <ToolCard key={item.to} {...item} featured />)}
        </section>

        <section className="mt-[var(--rp-space-section)]">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
            <h2 className="rp-type-card text-rp-text-2">{tr('Kho đã gửi và đã duyệt')}</h2>
            <p className="rp-type-caption text-rp-text-muted">{tr('Xem, không sửa trực tiếp')}</p>
          </div>
          <div style={{ '--rp-grid-min': '14rem' }} className="rp-fluid-grid">
            {LIBRARY.map((item) => <ToolCard key={item.to} {...item} />)}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 px-1">
            <h2 className="text-[15px] font-semibold text-rp-text-2">{tr('Nháp trên trình duyệt')}</h2>
            <p className="mt-1 text-[12px] text-rp-text-muted">{tr('Câu hỏi và đề thi chưa có chỗ lưu trên máy chủ.')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolCard to="/question-bank" label={tr('Ngân hàng câu hỏi')} description={tr('Sắp xếp câu để xem bố cục. Chỉ giữ trong phiên này.')} icon="quiz" />
            <ToolCard to="/exam-builder" label={tr('Dàn ý đề thi')} description={tr('Phác đề theo cấp độ. Chưa gửi lên hàng chờ duyệt.')} icon="assignment" />
          </div>
        </section>
      </div>
    </ContentAuthorShell>
  );
}
