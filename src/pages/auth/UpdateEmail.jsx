import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, patchSession, savePendingVerify } from '../../auth/session.js';
import { useUpdateEmailMutation } from '../../hooks/useAuth.js';

export default function UpdateEmail() {
  const navigate = useNavigate();
  const session = getSession();
  const mutation = useUpdateEmailMutation();
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const loading = mutation.isPending;

  function goToVerify(email, notice) {
    savePendingVerify({ email, userId: session?.userId });
    navigate(`/verify-email?email=${encodeURIComponent(email)}&userId=${session?.userId || ''}`, {
      state: notice ? { notice } : undefined,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!session?.userId || !session?.accessToken) {
      navigate('/auth', { replace: true, state: { notice: 'Đăng nhập để đổi email.' } });
      return;
    }
    mutation.mutate(
      { userId: session.userId, newEmail: newEmail.trim() },
      {
        onSuccess: () => {
          patchSession({ email: newEmail.trim() });
          goToVerify(newEmail.trim());
        },
        onError: (err) => {
          const msg = err.message || 'Cập nhật email thất bại.';
          if (msg.includes('Đã cập nhật email')) {
            patchSession({ email: newEmail.trim() });
            goToVerify(newEmail.trim(), msg);
            return;
          }
          setError(msg);
        },
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F5] text-[#2D282A]" data-page="UpdateEmail">
      <div className="w-full max-w-md rounded-3xl border border-sakura-100 bg-white p-8 shadow-xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sakura-600">Tài khoản</p>
        <h1 className="mt-2 text-2xl font-extrabold">Đổi email</h1>
        <p className="mt-2 text-sm text-slate-500">
          Đổi địa chỉ email. Hệ thống gửi mã xác thực tới email mới; bạn phải xác thực trước khi đăng nhập lại.
        </p>
        <p className="mt-2 text-xs text-slate-400">Email hiện tại: {session?.email || 'chưa đăng nhập'}</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">{error}</p> : null}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="newEmail">Email mới</label>
            <input
              id="newEmail"
              required
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="block w-full px-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 rounded-[10px] bg-[#d94b68] text-white text-sm font-bold disabled:opacity-60">
            {loading ? 'Đang cập nhật...' : 'Cập nhật email'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">
          <Link className="font-bold text-[#d94b68]" to="/change-password">Đổi mật khẩu</Link>
          {' · '}
          <Link className="font-bold text-[#d94b68]" to="/settings">Cài đặt</Link>
        </p>
      </div>
    </div>
  );
}
