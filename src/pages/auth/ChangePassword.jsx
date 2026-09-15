import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession } from '../../auth/session.js';
import { useChangePasswordMutation } from '../../hooks/useAuth.js';

export default function ChangePassword() {
  const navigate = useNavigate();
  const session = getSession();
  const mutation = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loading = mutation.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!session?.userId || !session?.accessToken) {
      navigate('/auth', { replace: true, state: { notice: 'Đăng nhập để đổi mật khẩu. API không có quên mật khẩu.' } });
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    mutation.mutate(
      { userId: session.userId, currentPassword, newPassword, confirmPassword },
      {
        onSuccess: () => {
          setNotice('Đổi mật khẩu thành công.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => setError(err.message || 'Đổi mật khẩu thất bại.'),
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F5] text-[#2D282A]" data-page="ChangePassword">
      <div className="w-full max-w-md rounded-3xl border border-sakura-100 bg-white p-8 shadow-xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sakura-600">Tài khoản</p>
        <h1 className="mt-2 text-2xl font-extrabold">Đổi mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-500">
          Đổi mật khẩu khi đã đăng nhập (cần mật khẩu hiện tại). API không hỗ trợ quên mật khẩu.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {notice ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</p> : null}
          {error ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">{error}</p> : null}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="currentPassword">Mật khẩu hiện tại</label>
            <input
              id="currentPassword"
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="block w-full px-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="newPassword">Mật khẩu mới</label>
            <input
              id="newPassword"
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full px-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
            <input
              id="confirmPassword"
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full px-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 rounded-[10px] bg-[#d94b68] text-white text-sm font-bold disabled:opacity-60">
            {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">
          <Link className="font-bold text-[#d94b68]" to="/update-email">Đổi email</Link>
          {' · '}
          <Link className="font-bold text-[#d94b68]" to="/auth">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
