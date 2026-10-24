import { useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  clearPendingVerify,
  getPendingVerify,
} from '../../auth/session.js';
import { useVerifyEmailMutation } from '../../hooks/useAuth.js';

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/40 focus-visible:ring-offset-2';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const pending = getPendingVerify();
  const email = params.get('email') || pending?.email || '';
  const userId = Number(
    params.get('userId') || pending?.userId || 0,
  );

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [notice] = useState(location.state?.notice || '');

  const verifyMutation = useVerifyEmailMutation();
  const loading = verifyMutation.isPending;

  const validSession = Number.isInteger(userId) && userId > 0;

  function handleCodeChange(event) {
    const next = event.target.value
      .replace(/\D/g, '')
      .slice(0, 6);

    setCode(next);
    if (error) setError('');
  }

  function handleVerify(event) {
    event.preventDefault();

    if (loading) return;

    setError('');

    if (!validSession) {
      setError(
        'Không tìm thấy phiên đăng ký. Bạn vui lòng đăng ký lại.',
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Bạn nhập đủ 6 chữ số trong email nhé.');
      return;
    }

    verifyMutation.mutate(
      {
        userId,
        verificationCode: code,
      },
      {
        onSuccess: () => {
          clearPendingVerify();

          navigate('/auth', {
            replace: true,
            state: {
              email,
              notice:
                'Email đã xác thực. Đăng nhập để tiếp tục.',
            },
          });
        },
        onError: (err) => {
          setError(
            err?.message ||
              'Chưa xác thực được. Vui lòng kiểm tra lại mã.',
          );
        },
      },
    );
  }

  return (
    <div
      data-page="VerifyEmail"
      className="flex min-h-screen flex-col bg-[#FCF8FA] font-['Be_Vietnam_Pro',sans-serif] text-[#49353F]"
    >
      {/* Nhận diện */}
      <header className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link
          to="/"
          aria-label="RikiPath — Trang chủ"
          className={`inline-flex items-center gap-2.5 rounded-md ${focusClass}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5E3EB] text-[#AD3155]">
            <Icon name="spa" className="text-[22px]" />
          </span>

          <span className="text-[20px] font-semibold tracking-tight">
            Riki<span className="text-[#AD3155]">Path</span>
          </span>
        </Link>

        <Link
          to="/auth"
          state={email ? { email } : undefined}
          className={`inline-flex items-center gap-1.5 rounded text-[13px] text-[#947A88] transition-colors hover:text-[#AD3155] ${focusClass}`}
        >
          <Icon name="arrow_back" className="text-[16px]" />
          Đăng nhập
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-6 sm:px-8 sm:py-10">
        <div className="grid w-full max-w-[900px] overflow-hidden rounded-[24px] border border-[#EBDDE5] bg-white shadow-[0_12px_40px_-24px_rgba(95,48,70,0.25)] md:grid-cols-[0.85fr_1.15fr]">
          {/* Phần nhận diện bên trái */}
          <aside className="relative overflow-hidden border-b border-[#EBDDE5] bg-[#F8EAF0] px-6 py-6 md:flex md:flex-col md:justify-between md:border-b-0 md:border-r md:px-8 md:py-9">
            <div>
              <div className="flex items-center gap-2 text-[12px] text-[#9B6F83]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#BE819B]" />
                Hoàn tất đăng ký
              </div>

              <h2 className="mt-4 max-w-[260px] text-[25px] font-medium leading-[1.45] tracking-tight text-[#684353] md:text-[29px]">
                Một bước nữa,
                <br />
                bắt đầu cùng RikiPath.
              </h2>

              <p className="mt-3 max-w-[250px] text-[13px] leading-6 text-[#9A7888]">
                Xác thực email để tiếp tục hành trình ôn luyện
                tiếng Nhật của bạn.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="my-8 hidden justify-center md:flex"
            >
              <svg
                viewBox="0 0 220 168"
                className="h-[158px] w-[208px]"
                fill="none"
              >
                <circle
                  cx="110"
                  cy="90"
                  r="68"
                  stroke="#E7CDDA"
                />
                <circle cx="110" cy="90" r="52" fill="#F3DEE8" />

                <rect
                  x="74"
                  y="46"
                  width="72"
                  height="46"
                  rx="6"
                  fill="#FFFBFC"
                  stroke="#E4C9D6"
                />
                <path
                  d="M86 60H118"
                  stroke="#D7A8BC"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M86 70H132"
                  stroke="#F0E0E7"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M86 80H122"
                  stroke="#F0E0E7"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <path
                  d="M48 78H172C176 78 178 82 176 85L118 128C114 131 106 131 102 128L44 85C42 82 44 78 48 78Z"
                  fill="#F8E7F0"
                  stroke="#E2C3D2"
                />
                <path
                  d="M50 78L104 112C107 114 113 114 116 112L170 78"
                  stroke="#E7D0DC"
                  strokeWidth="1.5"
                />

                <circle
                  cx="162"
                  cy="118"
                  r="16"
                  fill="#AD3155"
                  stroke="#F8EAF0"
                  strokeWidth="4"
                />
                <path
                  d="M154 118L160 124L171 112"
                  stroke="white"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="mt-5 hidden items-center justify-between border-t border-[#E7D2DC] pt-4 text-[11px] text-[#A38393] md:flex">
              <span>Ôn luyện mỗi ngày</span>
              <span lang="ja">一歩ずつ</span>
            </div>
          </aside>

          {/* Form */}
          <section
            aria-labelledby="verify-title"
            className="px-6 py-7 sm:px-9 sm:py-9"
          >
            <div className="mb-5">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0E2E9] bg-[#FFF6FA] text-[#AD3155]">
                <Icon name="mark_email_read" className="text-[23px]" />
              </span>

              <h1
                id="verify-title"
                className="text-[24px] font-semibold tracking-tight"
              >
                Kiểm tra email của bạn
              </h1>

              <p className="mt-2 text-[13px] leading-6 text-[#927C89]">
                Nhập mã 6 số đã gửi đến
              </p>

              <p className="mt-0.5 break-all text-[14px] font-medium text-[#775162]">
                {email || 'email bạn dùng để đăng ký'}
              </p>
            </div>

            {notice && (
              <p
                role="status"
                className="mb-4 rounded-lg border border-[#EBDDE5] bg-[#FCF5F9] px-3 py-2.5 text-[12px] leading-5 text-[#8F6A7C]"
              >
                {notice}
              </p>
            )}

            <form onSubmit={handleVerify} aria-busy={loading}>
              <label
                htmlFor="verification-code"
                className="mb-2 block text-[13px] font-medium text-[#705563]"
              >
                Mã xác thực
              </label>

              <input
                id="verification-code"
                name="verificationCode"
                type="text"
                required
                minLength={6}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                autoCapitalize="off"
                spellCheck={false}
                value={code}
                onChange={handleCodeChange}
                disabled={loading}
                placeholder="000000"
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? 'verification-hint verification-error'
                    : 'verification-hint'
                }
                className={[
                  'h-[58px] w-full rounded-xl border bg-[#FFFCFE]',
                  'pl-[0.35em] text-center font-mono text-[27px]',
                  'font-medium tracking-[0.35em] text-[#704355]',
                  'placeholder:text-[#D8C6D0]',
                  'outline-none transition-colors',
                  'disabled:cursor-wait disabled:opacity-60',
                  error
                    ? 'border-[#CE8FA5] focus:ring-2 focus:ring-[#AD3155]/10'
                    : 'border-[#E7D5DF] focus:border-[#BF819B] focus:ring-2 focus:ring-[#AD3155]/10',
                ].join(' ')}
              />

              <p
                id="verification-hint"
                className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A08A96]"
              >
                <Icon name="schedule" className="text-[14px]" />
                Mã có hiệu lực trong 30 phút.
              </p>

              {error && (
                <p
                  id="verification-error"
                  role="alert"
                  className="mt-3 rounded-lg bg-[#FFF0F4] px-3 py-2.5 text-[12px] leading-5 text-[#A33357]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={[
                  'mt-5 inline-flex h-11 w-full items-center',
                  'justify-center gap-2 rounded-lg bg-[#AD3155]',
                  'text-[13px] font-medium text-white',
                  'transition-colors hover:bg-[#982B4B]',
                  'disabled:cursor-wait disabled:opacity-60',
                  focusClass,
                ].join(' ')}
              >
                {loading ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                    />
                    Đang xác thực…
                  </>
                ) : (
                  <>
                    Xác thực email
                    <Icon
                      name="arrow_forward"
                      className="text-[17px]"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Hỗ trợ gọn, mở khi cần */}
            <div className="mt-5 border-t border-[#F0E7EC] pt-4">
              <button
                type="button"
                aria-expanded={showHelp}
                aria-controls="email-help"
                onClick={() => setShowHelp((current) => !current)}
                className={`flex w-full items-center justify-between gap-2 rounded py-1 text-left text-[12px] text-[#927687] hover:text-[#AD3155] ${focusClass}`}
              >
                Chưa thấy email?

                <Icon
                  name={showHelp ? 'expand_less' : 'expand_more'}
                  className="text-[18px]"
                />
              </button>

              {showHelp && (
                <div
                  id="email-help"
                  className="mt-2 rounded-lg bg-[#FCF6F9] px-3 py-3 text-[12px] leading-6 text-[#947B89]"
                >
                  Kiểm tra mục Spam / Thư rác và chờ thêm vài phút.
                  Nếu nhập sai địa chỉ email, bạn có thể{' '}
                  <Link
                    to="/register"
                    className={`rounded font-medium text-[#AD3155] underline underline-offset-2 ${focusClass}`}
                  >
                    đăng ký lại
                  </Link>
                  .
                </div>
              )}

              <p className="mt-4 text-center text-[12px] text-[#A08A96]">
                Đã xác thực?{' '}
                <Link
                  to="/auth"
                  state={email ? { email } : undefined}
                  className={`rounded font-medium text-[#AD3155] hover:underline hover:underline-offset-4 ${focusClass}`}
                >
                  Đăng nhập
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="px-5 pb-5 pt-3 text-center text-[11px] text-[#AD97A3]">
        RikiPath · Ôn luyện tiếng Nhật theo nhịp của bạn
      </footer>
    </div>
  );
}
