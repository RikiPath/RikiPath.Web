import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/layouts';
import { getAdminUser, updateAdminUser } from '@/features/admin/api/adminApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const ROLES = [
  ['Learner', 'Người ôn luyện'],
  ['ContentAuthor', 'Biên tập viên'],
  ['Mentor', 'Cố vấn'],
  ['Admin', 'Quản trị viên'],
];

const roleLabel = (role) => ROLES.find(([value]) => value === role)?.[1] || 'Vai trò chưa xác định';

export default function AdminUserDetail() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUser = useCallback(() => {
    let alive = true;
    if (!id) {
      Promise.resolve().then(() => {
        if (!alive) return;
        setLoading(false);
        setLoadError(null);
      });
      return () => { alive = false; };
    }
    Promise.resolve()
      .then(() => {
        if (!alive) return null;
        setLoading(true);
        setLoadError(null);
        return getAdminUser(id);
      })
      .then((data) => {
        if (!alive) return;
        setUser(data?.result ?? data);
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => loadUser(), [loadUser]);

  const save = async (changes) => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const response = await updateAdminUser(id, { ...user, ...changes });
      setUser(response?.result ?? { ...user, ...changes });
      notify.success('Đã cập nhật tài khoản.', '', { key: `admin-user-update-${id}` });
    } catch (err) {
      setError(describeApiError(err).message || 'Không cập nhật được tài khoản.');
      notify.apiError(err, 'Chưa cập nhật được tài khoản', { key: `admin-user-update-err-${id}` });
    } finally {
      setSaving(false);
    }
  };

  const name = user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Người dùng';
  const role = user?.role?.name || user?.role || 'Learner';
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Chi tiết người dùng')}>
      <main className="rp-container py-6 text-rp-text lg:py-8">
        <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-[13px] text-rp-text-muted hover:text-rp-brand-strong">
          <Icon name="arrow_back" className="text-[18px]" />
          {tr('Người dùng')}
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-rp-line bg-white p-5">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rp-brand-soft text-[13px] font-semibold text-rp-brand-strong">
              {initials}
            </div>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight">
                {user ? name : loading ? <SakuraLoader variant="inline" size={18} context="profile" label={tr('Đang tải hồ sơ')} delay={160} /> : id ? tr('Không tải được hồ sơ') : tr('Chưa chọn người dùng')}
              </h1>
              {user && (
                <p className="mt-1 text-[13px] text-rp-text-muted">
                  {user.email || tr('Không có email')} · {roleLabel(role)} · {user.isActive === false ? tr('Đã khóa') : tr('Hoạt động')}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={!user || saving}
            onClick={() => save({ isActive: user.isActive === false })}
            className="h-9 rounded-lg border border-rp-line px-3 text-[13px] text-rp-text-2 hover:bg-rp-bg-2 disabled:opacity-50"
          >
            {user?.isActive === false ? tr('Mở khóa') : tr('Khóa tài khoản')}
          </button>
        </header>

        {loadError && (
          <div className="mt-4 rounded-xl border border-rp-line bg-white px-5">
            <ContextualErrorState
              compact
              error={loadError}
              title={tr('Không tải được tài khoản')}
              onRetry={loadUser}
              retrying={loading}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-[10px] bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">{error}</p>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-12">
          <section className="rounded-xl border border-rp-line bg-white p-5 lg:col-span-7">
            <h2 className="text-[15px] font-semibold">{tr('Tài khoản')}</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-center min-[380px]:grid-cols-3">
              {[
                ['Mã', id || '—'],
                ['Email xác thực', user?.isEmailVerified ? 'Có' : '—'],
                ['Ngày tạo', user?.createdAt ? new Date(user.createdAt).toLocaleDateString(currentIntlTag()) : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-rp-brand-tint px-2 py-3">
                  <dt className="text-[12px] text-rp-text-muted">{tr(label)}</dt>
                  <dd className="mt-1 text-[14px] font-medium text-rp-brand-strong">{value}</dd>
                </div>
              ))}
            </dl>
            <label className="mt-5 block text-[13px] font-medium">
              {tr('Vai trò')}
              <select
                disabled={!user || saving}
                value={role}
                onChange={(event) => save({ role: event.target.value })}
                className="mt-2 h-10 w-full rounded-lg border border-rp-line bg-white px-3 text-[14px] outline-none focus:border-rp-brand-border"
              >
                {ROLES.map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}
              </select>
            </label>
          </section>

          <aside className="rounded-xl border border-rp-line bg-white p-5 lg:col-span-5">
            <h2 className="text-[15px] font-semibold">{tr('Hồ sơ')}</h2>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div>
                <dt className="text-[12px] text-rp-text-muted">{tr('Số điện thoại')}</dt>
                <dd className="mt-0.5">{user?.phoneNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-rp-text-muted">{tr('Ngôn ngữ')}</dt>
                <dd className="mt-0.5">{user?.locale || '—'}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-rp-text-muted">{tr('Giới thiệu')}</dt>
                <dd className="mt-0.5">{user?.bio || '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </AdminShell>
  );
}
