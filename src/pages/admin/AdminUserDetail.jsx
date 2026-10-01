import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AdminShell } from '../../components/shells';
import { getAdminUser, updateAdminUser } from '../../api/admin.js';

export default function AdminUserDetail() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) return;
    getAdminUser(id).then((data) => setUser(data?.result ?? data)).catch((err) => setError(err.message || 'Không tải được tài khoản.'));
  }, [id]);
  const save = async (changes) => {
    if (!user) return;
    setSaving(true); setError('');
    try {
      const response = await updateAdminUser(id, { ...user, ...changes });
      setUser(response?.result ?? { ...user, ...changes });
    } catch (err) { setError(err.message || 'Không cập nhật được tài khoản.'); }
    finally { setSaving(false); }
  };
  const name = user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Người dùng';
  const role = user?.role?.name || user?.role || 'Learner';
  return (
    <AdminShell pathname={pathname} breadcrumb="Chi tiết người dùng">
      <div className="p-8 text-on-surface" data-page="AdminUserDetail">
        <Link to="/admin/users" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Người dùng
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#eadfd9] bg-white p-6">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fde8ec] font-bold text-[#9E2A4B]">
              {name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user ? name : id ? 'Đang tải hồ sơ…' : 'Chưa chọn người dùng'}</h1>
              <p className="text-sm text-[#6F6669]">{user ? `${user.email || 'Không có email'} · ${role} · ${user.isActive === false ? 'Đã khóa' : 'Đang hoạt động'}` : ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={!user || saving} onClick={() => save({ isActive: user.isActive === false })} className="rounded-lg border border-[#eadfd9] px-3 py-2 text-sm font-semibold disabled:opacity-50">
              {user?.isActive === false ? 'Mở khóa' : 'Tạm khóa'}
            </button>
          </div>
        </header>

        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-[#eadfd9] bg-white p-6 lg:col-span-7">
            <h2 className="text-lg font-bold">Tiến độ học</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                ['ID', id || '—'],
                ['Email xác thực', user?.isEmailVerified ? 'Có' : '—'],
                ['Ngày tạo', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#FFF8F8] py-4">
                  <dt className="text-[11px] font-bold uppercase text-[#A59B9E]">{k}</dt>
                  <dd className="mt-1 text-xl font-extrabold text-[#9E2A4B]">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-6 text-sm font-bold">Thông tin tài khoản</h3>
            <label className="mt-3 block text-sm">Vai trò<select disabled={!user || saving} value={role} onChange={(e) => save({ role: e.target.value })} className="mt-2 w-full rounded-lg border border-[#eadfd9] bg-white p-2">{['Learner', 'ContentAuthor', 'Mentor', 'Admin'].map((item) => <option key={item}>{item}</option>)}</select></label>
          </section>
          <aside className="rounded-2xl border border-[#eadfd9] bg-white p-6 lg:col-span-5">
            <h2 className="text-lg font-bold">Hồ sơ</h2>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-[#A59B9E]">Số điện thoại</dt><dd>{user?.phoneNumber || '—'}</dd></div><div><dt className="text-[#A59B9E]">Ngôn ngữ</dt><dd>{user?.locale || '—'}</dd></div><div><dt className="text-[#A59B9E]">Giới thiệu</dt><dd>{user?.bio || '—'}</dd></div></dl>
            <Link to="/admin/users" className="mt-6 inline-flex text-sm font-bold text-[#D94B68] hover:underline">Quay lại danh sách</Link>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
