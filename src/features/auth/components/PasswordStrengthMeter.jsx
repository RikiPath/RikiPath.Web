import { CheckCircle2, Circle } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const BAR_COLORS = {
  neutral: 'bg-[#EAE3E4]',
  red: 'bg-[#DC2626]',
  orange: 'bg-[#EA580C]',
  amber: 'bg-[#D97706]',
  teal: 'bg-[#0D9488]',
  green: 'bg-[#16A34A]',
};

const LABEL_COLORS = {
  neutral: 'text-rp-text-muted',
  red: 'text-[#DC2626]',
  orange: 'text-[#C2410C]',
  amber: 'text-[#B45309]',
  teal: 'text-[#0F766E]',
  green: 'text-[#15803D]',
};

/**
 * Real-time password strength bar (5 states: Rất yếu → Rất mạnh)
 * paired with live policy checklist matching Backend rules (no forced arbitrary character classes).
 */
export default function PasswordStrengthMeter({
  evaluation,
  hasCurrentPasswordField = false,
  compact = false,
}) {
  const { tr } = useLocale();
  const { score = 0, label = '', colorKey = 'neutral', checks = {} } = evaluation || {};
  const isEntered = score > 0;

  const requirements = [
    {
      key: 'minLength',
      met: Boolean(checks.minLength),
      text: 'Tối thiểu 6 ký tự (khuyên dùng ≥ 8 hoặc cụm từ dài)',
    },
    {
      key: 'notCommonOrPredictable',
      met: Boolean(checks.notCommonOrPredictable),
      text: 'Không phải mật khẩu phổ biến hoặc chuỗi dễ đoán',
    },
    {
      key: 'notPersonal',
      met: isEntered && Boolean(checks.notPersonal),
      text: 'Không trùng với email hoặc họ tên tài khoản',
    },
    ...(hasCurrentPasswordField
      ? [{
          key: 'differentFromCurrent',
          met: isEntered && Boolean(checks.differentFromCurrent),
          text: 'Khác với mật khẩu hiện tại',
        }]
      : []),
  ];

  return (
    <div
      className={cx(
        'rounded-xl border border-[#EAE3E4] bg-[#FAF7F8]',
        compact ? 'px-3 py-2.5' : 'px-3.5 py-3',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-rp-text-2">{tr('Độ mạnh mật khẩu')}</span>
        <span
          role="status"
          aria-live="polite"
          className={cx(
            'min-h-[18px] font-semibold transition-colors duration-200 motion-reduce:transition-none',
            LABEL_COLORS[colorKey] || LABEL_COLORS.neutral,
          )}
        >
          {isEntered ? tr(label) : tr('Chưa nhập')}
        </span>
      </div>

      {/* 5-step smooth progress bar without layout jump */}
      <div
        aria-hidden="true"
        className="mt-2 grid grid-cols-5 gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((step) => {
          const filled = score >= step;
          return (
            <span
              key={step}
              className="relative h-1.5 overflow-hidden rounded-full bg-[#E8DFE1]"
            >
              <span
                className={cx(
                  'absolute inset-0 origin-left rounded-full transition-[transform,background-color,opacity] duration-200 ease-out motion-reduce:transition-none',
                  filled ? (BAR_COLORS[colorKey] || BAR_COLORS.neutral) : 'bg-transparent',
                  filled ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
                )}
              />
            </span>
          );
        })}
      </div>

      <ul className={cx('mt-2.5 grid gap-1.5 text-[11.5px]', !compact && 'sm:grid-cols-2')}>
        {requirements.map((req) => (
          <li
            key={req.key}
            className={cx(
              'flex items-start gap-1.5 leading-4 transition-colors duration-150 motion-reduce:transition-none',
              req.met ? 'font-medium text-[#15803D]' : 'text-rp-text-muted',
            )}
          >
            {req.met ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
            ) : (
              <Circle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C6B7BC]" />
            )}
            <span>{tr(req.text)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
