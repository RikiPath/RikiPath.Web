import { useState } from 'react';
import { ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { Card, FeatureIcon, PageHeader, Tabs } from '@/components/ui';
import AdminMentorGroupPolicy from './AdminMentorGroupPolicy.jsx';
import { useLocale } from '@/locales/locale.js';

const OPERATIONAL_BOUNDARIES = [
  {
    title: 'Bảo toàn snapshot đơn hàng & gói học',
    detail: 'Mọi giao dịch đã tạo hoặc đã thanh toán luôn lưu giá (AmountPaid), tên gói và thời hạn (DurationDaysSnapshot) tại thời điểm checkout. Việc chỉnh sửa bảng giá hoặc ngừng bán chỉ áp dụng cho đơn phát sinh sau đó.',
  },
  {
    title: 'Chuyển lớp sau khi khai giảng',
    detail: 'Học viên chỉ có thể gửi yêu cầu chuyển lớp trước thời điểm khai giảng (khi tính năng chuyển lớp được bật) và bắt buộc có phê duyệt của Admin. Sau khi khóa học bắt đầu, chuyển lớp bị khóa bởi nghiệp vụ.',
  },
  {
    title: 'Xác thực thanh toán PayOS (Fail-Closed)',
    detail: 'Trạng thái thanh toán chỉ được chuyển sang Paid qua chữ ký HMAC-SHA256 hợp lệ từ webhook PayOS hoặc truy vấn xác minh server-to-server; Admin không thao tác đánh dấu đã thanh toán thủ công.',
  },
  {
    title: 'Kiểm soát chất lượng & lịch dạy Giáo viên',
    detail: 'Chỉ Giáo viên đã được Admin xét duyệt hồ sơ và cấp quyền cấp độ mới được phân công lớp học nhóm. Khung giờ mới và thay đổi lịch đều qua quy trình duyệt hoặc khóa xung đột.',
  },
];

export default function AdminLearningPolicies() {
  const { tr } = useLocale();
  const [tab, setTab] = useState('configurable');

  return (
    <AdminShell breadcrumb={tr('Chính sách học tập')}>
      <main className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Cấu hình nghiệp vụ')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="mentor" size="lg" />
              <span>{tr('Chính sách học tập')}</span>
            </span>
          }
          description={tr('Quản lý phiên bản quy tắc vận hành lớp học nhóm, bài tập, đánh giá năng lực và các ranh giới bảo toàn dữ liệu.')}
        />

        <Tabs
          variant="pill"
          className="w-full sm:w-fit"
          value={tab}
          onChange={setTab}
          label={tr('Danh mục chính sách học tập')}
          tabs={[
            { value: 'configurable', label: tr('Quy tắc cấu hình theo phiên bản'), icon: SlidersHorizontal },
            { value: 'guardrails', label: tr('Nguyên tắc vận hành cố định'), icon: ShieldAlert },
          ]}
        />

        {tab === 'configurable' && (
          <div className="min-w-0">
            <AdminMentorGroupPolicy />
          </div>
        )}

        {tab === 'guardrails' && (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {OPERATIONAL_BOUNDARIES.map((rule) => (
              <Card key={rule.title} className="min-w-0 space-y-2 p-5">
                <h3 className="text-[15px] font-semibold text-rp-text">{tr(rule.title)}</h3>
                <p className="text-[13px] leading-6 text-rp-text-2">{tr(rule.detail)}</p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </AdminShell>
  );
}
