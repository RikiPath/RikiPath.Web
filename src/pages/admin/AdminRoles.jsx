import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';

const ROLES = [
  {
    id: 'Admin',
    label: 'Quản trị viên',
    hint: 'Điều hành toàn hệ thống',
    icon: 'admin_panel_settings',
  },
  {
    id: 'ContentAuthor',
    label: 'Biên tập viên',
    hint: 'Soạn và gửi duyệt học liệu',
    icon: 'edit_note',
  },
  {
    id: 'Mentor',
    label: 'Chuyên gia tư vấn',
    hint: 'Lịch hẹn và phòng học',
    icon: 'support_agent',
  },
  {
    id: 'Learner',
    label: 'Học viên',
    hint: 'Lộ trình và luyện tập',
    icon: 'school',
  },
];

const PERMISSIONS = [
  { id: 'overview', group: 'Điều hành', label: 'Xem tổng quan hệ thống', description: 'Số liệu người dùng, gói học và hoạt động.' },
  { id: 'users', group: 'Điều hành', label: 'Quản lý tài khoản', description: 'Tạo, khóa và xem hồ sơ người dùng.' },
  { id: 'roles', group: 'Điều hành', label: 'Phân vai trò', description: 'Gán Admin, biên tập, mentor hoặc học viên.' },
  { id: 'mentors', group: 'Điều hành', label: 'Quản lý mentor', description: 'Hồ sơ sensei và trạng thái tư vấn.' },
  { id: 'plans', group: 'Điều hành', label: 'Gói học và lịch', description: 'Gói bán, tính năng và lịch đặt chỗ.' },
  { id: 'lessons', group: 'Học liệu', label: 'Soạn bài học', description: 'Giáo trình, bài giảng và video.' },
  { id: 'vocab', group: 'Học liệu', label: 'Từ vựng và Hán tự', description: 'Kho từ, kanji và kana.' },
  { id: 'exams', group: 'Học liệu', label: 'Đề thi và ngân hàng câu hỏi', description: 'Câu hỏi theo kỹ năng và đề mock.' },
  { id: 'import', group: 'Học liệu', label: 'Import Excel', description: 'Nạp học liệu từ file .xlsx.' },
  { id: 'review', group: 'Học liệu', label: 'Duyệt nội dung', description: 'Phê duyệt bài trước khi xuất bản.' },
  { id: 'study', group: 'Học tập', label: 'Lộ trình và bài học', description: 'Vào giáo trình và theo dõi tiến độ.' },
  { id: 'writing', group: 'Học tập', label: 'Luyện viết', description: 'Studio Riki và bài luận.' },
  { id: 'srs', group: 'Học tập', label: 'Ôn SRS', description: 'Hàng ôn từ vựng và kanji.' },
  { id: 'booking', group: 'Học tập', label: 'Đặt lịch mentor', description: 'Xem lịch và vào phòng tư vấn.' },
];

const DEFAULT_GRANTS = {
  Admin: PERMISSIONS.map((item) => item.id),
  ContentAuthor: ['lessons', 'vocab', 'exams', 'import', 'study'],
  Mentor: ['booking', 'study'],
  Learner: ['study', 'writing', 'srs', 'booking'],
};

function cloneGrants(source) {
  return Object.fromEntries(Object.entries(source).map(([role, ids]) => [role, [...ids]]));
}

export default function AdminRoles() {
  const { pathname } = useLocation();
  const [selectedId, setSelectedId] = useState('Admin');
  const [grants, setGrants] = useState(() => cloneGrants(DEFAULT_GRANTS));
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  const selected = ROLES.find((role) => role.id === selectedId) ?? ROLES[0];
  const enabled = new Set(grants[selected.id] ?? []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return PERMISSIONS.filter((item) => !term || `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(term));
  }, [query]);

  const groups = [...new Set(visible.map((item) => item.group))];

  function toggle(permissionId) {
    setNotice('');
    setGrants((current) => {
      const next = new Set(current[selected.id] ?? []);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return { ...current, [selected.id]: [...next] };
    });
  }

  function save() {
    setNotice(`Đã cập nhật quyền của vai trò ${selected.label}.`);
  }

  function resetRole() {
    setGrants((current) => ({ ...current, [selected.id]: [...DEFAULT_GRANTS[selected.id]] }));
    setNotice(`Đã khôi phục quyền mặc định của ${selected.label}.`);
  }

  return (
    <AdminShell pathname={pathname} breadcrumb="Vai trò & quyền">
      <main className="mx-auto max-w-6xl px-4 py-6 text-on-surface sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <p className="font-label-md uppercase tracking-[0.18em] text-primary">Admin</p>
          <h1 className="mt-1 font-headline-lg text-headline-lg font-bold">Vai trò và quyền</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Chọn một vai trò bên trái, rồi bật hoặc tắt quyền tương ứng. Danh sách người dùng nằm ở mục Người dùng.
          </p>
        </div>

        {notice && <div className="mb-4 rounded-2xl bg-secondary-container px-4 py-3 text-on-secondary-container">{notice}</div>}

        <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-[#eadfd9] lg:sticky lg:top-4">
            <p className="px-2 pb-2 font-label-sm text-on-surface-variant">4 vai trò hệ thống</p>
            <div className="space-y-2">
              {ROLES.map((role) => {
                const active = role.id === selected.id;
                const count = grants[role.id]?.length ?? 0;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => { setSelectedId(role.id); setNotice(''); }}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ${active ? 'bg-secondary-container/70 ring-1 ring-primary/20' : 'hover:bg-surface-container-low'}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary'}`}>
                      <span className="material-symbols-outlined text-[20px]">{role.icon}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-label-md font-semibold">{role.label}</span>
                      <span className="mt-0.5 block text-label-sm text-on-surface-variant">{role.hint}</span>
                      <span className="mt-1 block text-label-sm text-primary">{count} quyền</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#eadfd9] sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold">{selected.label}</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">{selected.hint}. Mã vai trò: {selected.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={resetRole} className="rounded-full bg-surface-container px-4 py-2 font-label-md text-on-surface">
                  Khôi phục mặc định
                </button>
                <button type="button" onClick={save} className="rounded-full bg-primary px-4 py-2 font-label-md text-on-primary">
                  Lưu ma trận
                </button>
              </div>
            </div>

            <label className="relative mb-5 block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm quyền theo tên hoặc nhóm"
                className="w-full rounded-2xl bg-surface-container-low py-2.5 pl-10 pr-4 text-body-sm outline-none ring-1 ring-transparent focus:ring-primary"
              />
            </label>

            {groups.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Không có quyền khớp với từ khóa.</p>
            ) : groups.map((group) => (
              <div key={group} className="mb-5 last:mb-0">
                <h3 className="mb-2 font-label-md font-semibold text-on-surface-variant">{group}</h3>
                <div className="divide-y divide-[#eadfd9] overflow-hidden rounded-2xl ring-1 ring-[#eadfd9]">
                  {visible.filter((item) => item.group === group).map((item) => {
                    const checked = enabled.has(item.id);
                    return (
                      <label key={item.id} className="flex cursor-pointer items-center justify-between gap-4 bg-white px-4 py-3 hover:bg-surface-container-low">
                        <span className="min-w-0">
                          <span className="block font-label-md font-semibold">{item.label}</span>
                          <span className="mt-0.5 block text-label-sm text-on-surface-variant">{item.description}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(item.id)}
                          className="h-5 w-5 shrink-0 accent-[#a62e4f]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </AdminShell>
  );
}
