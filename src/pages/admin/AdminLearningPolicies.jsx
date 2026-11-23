import { useState } from 'react';
import { ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { Card, UnifiedToolbar } from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import AdminMentorGroupPolicy from './AdminMentorGroupPolicy.jsx';
import { useLocale } from '@/locales/locale.js';

const OPERATIONAL_BOUNDARIES = [
  {
    title: 'Bảo toàn thông tin đơn hàng & gói học',
    detail: 'Mọi giao dịch đã tạo hoặc đã thanh toán luôn lưu giá trị thực thu, tên gói và thời hạn tại thời điểm thanh toán. Việc chỉnh sửa bảng giá hoặc ngừng bán chỉ áp dụng cho các đơn phát sinh sau đó.',
  },
  {
    title: 'Chuyển lớp sau khi khai giảng',
    detail: 'Học viên chỉ có thể gửi yêu cầu chuyển lớp trước thời điểm khai giảng (khi tính năng chuyển lớp được bật) và bắt buộc có phê duyệt của Admin. Sau khi khóa học bắt đầu, chuyển lớp bị khóa bởi nghiệp vụ.',
  },
  {
    title: 'Xác thực thanh toán tự động',
    detail: 'Trạng thái thanh toán chỉ được chuyển sang Đã thanh toán sau khi hệ thống xác minh giao dịch tự động với cổng thanh toán; Admin không thao tác đánh dấu đã thanh toán thủ công.',
  },
  {
    title: 'Kiểm soát chất lượng & lịch dạy Giáo viên',
    detail: 'Chỉ Giáo viên đã được Admin xét duyệt hồ sơ và cấp quyền cấp độ mới được phân công lớp học nhóm. Khung giờ mới và thay đổi lịch đều qua quy trình duyệt hoặc kiểm tra xung đột.',
  },
];

export default function AdminLearningPolicies() {
  const { tr } = useLocale();
  const [tab, setTab] = useState('configurable');
  const policyTabs = {
    label: tr('Danh mục chính sách học tập'),
    value: tab,
    onChange: setTab,
    tabs: [
      { value: 'configurable', label: tr('Quy tắc cấu hình theo phiên bản'), icon: SlidersHorizontal },
      { value: 'guardrails', label: tr('Nguyên tắc vận hành cố định'), icon: ShieldAlert },
    ],
  };

  return (
    <AdminShell breadcrumb={tr('Chính sách học tập')}>
      <main className="rp-container py-[var(--rp-space-page-y)] space-y-4 text-rp-text">
        <AdminPageHeader
          icon={SlidersHorizontal}
          title="Chính sách học tập"
        />

        {tab === 'configurable' && (
          <div className="min-w-0">
            {/* The policy's actions (Làm mới, Ban hành phiên bản mới) share the tab row. */}
            <AdminMentorGroupPolicy renderToolbar={(actions) => <UnifiedToolbar tabs={policyTabs} actions={actions} />} />
          </div>
        )}

        {tab === 'guardrails' && <UnifiedToolbar tabs={policyTabs} />}

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
