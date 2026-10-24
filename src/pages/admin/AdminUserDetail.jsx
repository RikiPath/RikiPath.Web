import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AdminShell } from '../../components/shells';
import { getAdminUser, updateAdminUser } from '../../api/admin.js';

const ROLES = [
  ['Learner', 'Người ôn luyện'],
  ['ContentAuthor', 'Biên tập viên'],
  ['Mentor', 'Mentor'],
  ['Admin', 'Quản trị viên'],
];

const roleLabel = (role) => ROLES.find(([value]) => value === role)?.[1] || role;

export default function AdminUserDetail() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAdminUser(id)
      .then((data) => setUser(data?.result ?? data))
      .catch((err) => setError(err.message || 'Không tải được tài khoản.'));
  }, [id]);

  const save = async (changes) => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const response = await updateAdminUser(id, { ...user, ...changes });
      setUser(response?.result ?? { ...user, ...changes });
    } catch (err) {
      setError(err.message || 'Không cập nhật được tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  const name = user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Người dùng';
  const role = user?.role?.name || user?.role || 'Learner';
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AdminShell pathname={pathname} breadcrumb="Chi tiết người dùng">
      <main className="mx-auto max-w-6xl px-4 py-6 text-[#352C31] sm:px-6 lg:px-8">
        <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-[13px] text-[#82737B] hover:text-[#AD3155]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Người dùng
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#EAE1E6] bg-white p-5">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F6ECEF] text-[13px] font-semibold text-[#AD3155]">
              {initials}
            </div>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight">
                {user ? name : id ? 'Đang tải…' : 'Chưa chọn người dùng'}
              </h1>
              {user && (
                <p className="mt-1 text-[13px] text-[#82737B]">
                  {user.email || 'Không có email'} · {roleLabel(role)} · {user.isActive === false ? 'Đã khóa' : 'Hoạt động'}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={!user || saving}
            onClick={() => save({ isActive: user.isActive === false })}
            className="h-9 rounded-lg border border-[#EAE1E6] px-3 text-[13px] text-[#75616C] hover:bg-[#F8F3F5] disabled:opacity-50"
          >
            {user?.isActive === false ? 'Mở khóa' : 'Khóa tài khoản'}
          </button>
        </header>

        {error && (
          <p role="alert" className="mt-4 rounded-[10px] bg-[#FFF0F2] px-4 py-3 text-[13px] text-[#A13950]">{error}</p>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-12">
          <section className="rounded-xl border border-[#EAE1E6] bg-white p-5 lg:col-span-7">
            <h2 className="text-[15px] font-semibold">Tài khoản</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                ['Mã', id || '—'],
                ['Email xác thực', user?.isEmailVerified ? 'Có' : '—'],
                ['Ngày tạo', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#FBF7F9] px-2 py-3">
                  <dt className="text-[12px] text-[#8C7D84]">{label}</dt>
                  <dd className="mt-1 text-[14px] font-medium text-[#AD3155]">{value}</dd>
                </div>
              ))}
            </dl>
            <label className="mt-5 block text-[13px] font-medium">
              Vai trò
              <select
                disabled={!user || saving}
                value={role}
                onChange={(event) => save({ role: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-[#EAE1E6] bg-white px-3 text-[14px] outline-none focus:border-[#C8889D]"
              >
                {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </section>

          <aside className="rounded-xl border border-[#EAE1E6] bg-white p-5 lg:col-span-5">
            <h2 className="text-[15px] font-semibold">Hồ sơ</h2>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div>
                <dt className="text-[12px] text-[#8C7D84]">Số điện thoại</dt>
                <dd className="mt-0.5">{user?.phoneNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[#8C7D84]">Ngôn ngữ</dt>
                <dd className="mt-0.5">{user?.locale || '—'}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[#8C7D84]">Giới thiệu</dt>
                <dd className="mt-0.5">{user?.bio || '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </AdminShell>
  );
}
