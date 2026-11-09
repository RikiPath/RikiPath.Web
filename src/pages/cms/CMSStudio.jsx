import { Link, useLocation } from 'react-router-dom';
import { CmsShell } from '../../components/shells';

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
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

function ToolCard({ to, label, description, icon, featured = false }) {
  return (
    <Link
      to={to}
      className={[
        'group flex h-full flex-col rounded-2xl border bg-white p-4',
        featured ? 'border-[#E7C9D6] shadow-[0_8px_24px_rgba(173,49,85,0.06)]' : 'border-[#EADFE5]',
        'transition hover:-translate-y-0.5 hover:border-[#E7C9D6]',
        focusClass,
      ].join(' ')}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${featured ? 'bg-[#FCEEF3] text-[#AD3155]' : 'bg-[#FAF6F7] text-[#A67C8E]'}`}>
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="mt-4 text-[15px] font-semibold text-[#543E49]">{label}</span>
      <span className="mt-1 flex-1 text-[13px] leading-6 text-[#927B88]">{description}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#AD3155]">
        Mở
        <Icon name="arrow_forward" className="text-[16px] transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function CMSStudio() {
  const { pathname } = useLocation();

  return (
    <CmsShell pathname={pathname} breadcrumb="Tổng quan">
      <div
        data-page="CMSStudio"
        className="mx-auto w-full max-w-[1160px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-6 overflow-hidden rounded-3xl border border-[#E7C9D6] bg-[linear-gradient(135deg,#FFF7FA_0%,#FCEEF3_55%,#FFFDFC_100%)] px-6 py-6 sm:px-8">
          <p className="text-[12px] font-medium tracking-[0.14em] text-[#AD3155]">STUDIO NỘI DUNG</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#49353F]">Xin chào, cùng soạn bài hôm nay.</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#8D7481]">
            Gửi bài bằng Excel hoặc AI, rồi theo dõi admin duyệt. Kho từ và ngữ pháp hiện những mục đã được xuất bản.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {PRIMARY.map((item) => <ToolCard key={item.to} {...item} featured />)}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between px-1">
            <h2 className="text-[15px] font-semibold text-[#705261]">Kho đã gửi và đã duyệt</h2>
            <p className="text-[12px] text-[#AA929F]">Xem, không sửa trực tiếp</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {LIBRARY.map((item) => <ToolCard key={item.to} {...item} />)}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 px-1">
            <h2 className="text-[15px] font-semibold text-[#705261]">Nháp trên trình duyệt</h2>
            <p className="mt-1 text-[12px] text-[#AA929F]">Câu hỏi và đề thi chưa có chỗ lưu trên máy chủ.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolCard to="/question-bank" label="Ngân hàng câu hỏi" description="Sắp xếp câu để xem bố cục. Chỉ giữ trong phiên này." icon="quiz" />
            <ToolCard to="/exam-builder" label="Dàn ý đề thi" description="Phác đề theo cấp độ. Chưa gửi lên hàng chờ duyệt." icon="assignment" />
          </div>
        </section>
      </div>
    </CmsShell>
  );
}
