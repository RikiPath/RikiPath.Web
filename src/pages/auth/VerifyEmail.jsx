import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingVerify, getPendingVerify } from '../../auth/session.js';
import { useVerifyEmailMutation } from '../../hooks/useAuth.js';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const pending = getPendingVerify();
  const email = params.get('email') || pending?.email || '';
  const [userId, setUserId] = useState(params.get('userId') || pending?.userId || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice] = useState(location.state?.notice || '');
  const verifyMutation = useVerifyEmailMutation();
  const loading = verifyMutation.isPending;

  function handleVerify(e) {
    e.preventDefault();
    setError('');
    const id = Number(userId);
    if (!id) {
      setError('Cần mã người dùng (userId) theo API xác thực.');
      return;
    }
    verifyMutation.mutate(
      { userId: id, verificationCode: code.trim() },
      {
        onSuccess: () => {
          clearPendingVerify();
          navigate('/auth', { replace: true, state: { email, notice: 'Email đã xác thực. Đăng nhập để tiếp tục.' } });
        },
        onError: (err) => {
          setError(err.message || 'Xác thực thất bại.');
        },
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F5] text-[#2D282A]" data-page="VerifyEmail">
      <div className="w-full max-w-md rounded-3xl border border-sakura-100 bg-white p-8 shadow-xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sakura-600">Xác thực email</p>
        <h1 className="mt-2 text-2xl font-extrabold">Nhập mã 6 số</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mã 6 số gửi tới{email ? ` ${email}` : ' email của bạn'}, hiệu lực 30 phút. Nhập userId và mã, rồi đăng nhập.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          {notice ? <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">{notice}</p> : null}
          {error ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">{error}</p> : null}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="userId">Mã người dùng (userId)</label>
            <input
              id="userId"
              required
              type="number"
              min="1"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="block w-full px-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="code">Mã xác thực</label>
            <input
              id="code"
              required
              minLength={6}
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="block w-full px-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 text-sm tracking-[0.4em] text-center font-bold focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-[10px] bg-[#d94b68] text-white text-sm font-bold disabled:opacity-60"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực email'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">
          Đã xác thực? <Link className="font-bold text-[#d94b68]" to="/auth" state={email ? { email } : undefined}>Đăng nhập</Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          Sai email? <Link className="font-bold text-[#d94b68]" to="/register">Đăng ký lại</Link>
        </p>
      </div>
    </div>
  );
}
