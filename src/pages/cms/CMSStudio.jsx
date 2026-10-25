import { Link, useLocation } from 'react-router-dom';
import { CmsShell } from '../../components/shells';

const SECTIONS = [
  {
    id: 'content',
    label: 'Soạn nội dung',
    description: 'Bài luyện tập và kho kiến thức',
    items: [
      {
        to: '/lesson-cms',
        label: 'Bài luyện tập',
        description: 'Biên soạn và chỉnh sửa bài luyện.',
        icon: 'menu_book',
      },
      {
        to: '/vocabulary-editor',
        label: 'Từ vựng & Hán tự',
        description: 'Quản lý từ, cách đọc và ví dụ.',
        icon: 'translate',
      },
      {
        to: '/content-library',
        label: 'Ngữ pháp',
        description: 'Cập nhật mẫu câu và cách dùng.',
        icon: 'edit_note',
      },
    ],
  },
  {
    id: 'exam',
    label: 'Chuẩn bị đề thi',
    description: 'Từ câu hỏi đến bộ đề hoàn chỉnh',
    items: [
      {
        to: '/question-bank',
        label: 'Ngân hàng câu hỏi',
        description: 'Biên soạn và quản lý câu hỏi.',
        icon: 'quiz',
      },
      {
        to: '/exam-builder',
        label: 'Quản lý đề thi',
        description: 'Sắp xếp câu hỏi thành bộ đề.',
        icon: 'assignment',
      },
    ],
  },
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

function ToolRow({ to, label, description, icon }) {
  return (
    <Link
      to={to}
      className={[
        'group flex items-center gap-3 px-4 py-3.5 sm:px-5',
        'transition-colors hover:bg-[#FFF7FA]',
        'focus-visible:relative focus-visible:z-10',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-inset focus-visible:ring-[#AD3155]/35',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF0F5] text-[#B07891] transition-colors group-hover:bg-[#F7E5EE] group-hover:text-[#AD3155]">
        <Icon name={icon} className="text-[21px]" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-5">
        <span className="text-[14px] font-medium text-[#543E49] sm:w-[185px] sm:shrink-0">
          {label}
        </span>

        <span className="text-[12px] leading-5 text-[#9A8590]">
          {description}
        </span>
      </span>

      <Icon
        name="chevron_right"
        className="shrink-0 text-[19px] text-[#C8B4BF] transition-colors group-hover:text-[#AD3155]"
      />
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
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">
              Tổng quan
            </h1>

            <p className="mt-1 text-[13px] leading-6 text-[#96808C]">
              Không gian biên soạn nội dung RikiPath.
            </p>
          </div>

          <Link
            to="/bulk-import"
            className={[
              'inline-flex h-10 items-center justify-center gap-2',
              'rounded-lg border border-[#E7DAE1] bg-white px-3.5',
              'text-[13px] text-[#866777]',
              'transition-colors hover:border-[#DBBACA] hover:bg-[#FFF6FA]',
              focusClass,
            ].join(' ')}
          >
            <Icon name="upload_file" className="text-[18px]" />
            Nhập từ Excel
          </Link>
        </header>

        <section
          aria-labelledby="author-workspace-title"
          className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#ECD9E3] bg-[#FCEDF4] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EBCFDA] bg-white/70 text-[#AD3155]">
              <Icon name="fact_check" className="text-[23px]" />
            </span>

            <div>
              <h2
                id="author-workspace-title"
                className="text-[16px] font-medium text-[#79465D]"
              >
                Theo dõi nội dung của bạn
              </h2>

              <p className="mt-1 max-w-lg text-[13px] leading-6 text-[#A0788B]">
                Xem trạng thái xét duyệt và phản hồi để chỉnh sửa.
              </p>
            </div>
          </div>

          <Link
            to="/author-dashboard"
            className={[
              'inline-flex min-h-10 shrink-0 items-center justify-center gap-2',
              'self-start rounded-lg bg-[#AD3155] px-4 py-2',
              'text-[13px] font-medium text-white sm:self-auto',
              'transition-colors hover:bg-[#982B4B]',
              focusClass,
            ].join(' ')}
          >
            Mở bảng theo dõi
            <Icon name="arrow_forward" className="text-[17px]" />
          </Link>
        </section>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-title`}
            >
              <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
                <h2
                  id={`${section.id}-title`}
                  className="text-[14px] font-semibold text-[#705261]"
                >
                  {section.label}
                </h2>

                <p className="text-[12px] text-[#AA929F]">
                  {section.description}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#EADFE5] bg-white">
                <div className="divide-y divide-[#F2EAF0]">
                  {section.items.map((item) => (
                    <ToolRow key={item.to} {...item} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-5 flex items-start gap-2 px-1 text-[12px] leading-6 text-[#AA929F]">
          <Icon
            name="info"
            className="mt-0.5 shrink-0 text-[16px] text-[#B89DAA]"
          />
          Kiểm tra nội dung trước khi gửi duyệt.
        </p>
      </div>
    </CmsShell>
  );
}
