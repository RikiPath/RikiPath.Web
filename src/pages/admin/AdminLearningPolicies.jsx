import { AdminShell } from '@/layouts';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import AdminMentorGroupPolicy from './AdminMentorGroupPolicy.jsx';
import { useLocale } from '@/locales/locale.js';

export default function AdminLearningPolicies() {
  const { tr } = useLocale();

  return (
    <AdminShell breadcrumb={tr('Chính sách lớp học')}>
      <AdminWorkspace>
        <AdminMentorGroupPolicy />
      </AdminWorkspace>
    </AdminShell>
  );
}
