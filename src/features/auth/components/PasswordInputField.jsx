import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Field, Input, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared accessible password field with lock icon, optional trailing status badge
 * (e.g. match checkmark), and cursor-preserving visibility toggle.
 * Preserves Password Manager AutoFill and Paste without trimming characters.
 */
const PasswordInputField = forwardRef(function PasswordInputField(
  {
    id: idProp,
    name,
    label,
    hint,
    error,
    required = false,
    placeholder,
    autoComplete = 'current-password',
    value,
    onChange,
    disabled = false,
    trailingAdornment = null,
    inputClassName,
    ...rest
  },
  forwardedRef,
) {
  const { tr } = useLocale();
  const [visible, setVisible] = useState(false);
  const localInputRef = useRef(null);

  useImperativeHandle(forwardedRef, () => localInputRef.current, []);

  function toggleVisibility() {
    const input = localInputRef.current;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible((prev) => !prev);
    if (input) {
      window.requestAnimationFrame(() => {
        if (!localInputRef.current) return;
        localInputRef.current.focus({ preventScroll: true });
        if (start !== null && end !== null && typeof localInputRef.current.setSelectionRange === 'function') {
          try {
            localInputRef.current.setSelectionRange(start, end);
          } catch {
            // Ignore selection range errors on unsupported browsers
          }
        }
      });
    }
  }

  return (
    <Field
      id={idProp}
      label={typeof label === 'string' ? tr(label) : label}
      hint={typeof hint === 'string' ? tr(hint) : hint}
      error={typeof error === 'string' ? tr(error) : error}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative flex items-center">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted"
          />
          <Input
            {...rest}
            ref={localInputRef}
            id={id}
            name={name}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            placeholder={typeof placeholder === 'string' ? tr(placeholder) : placeholder}
            value={value}
            onChange={onChange}
            className={cx(
              'pl-10',
              trailingAdornment ? 'pr-[4.5rem]' : 'pr-11',
              inputClassName,
            )}
          />
          {trailingAdornment && (
            <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2">
              {trailingAdornment}
            </span>
          )}
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleVisibility}
            aria-label={visible ? tr('Ẩn mật khẩu') : tr('Hiện mật khẩu')}
            aria-pressed={visible}
            className="rp-focus absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-rp-text-muted transition-colors hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-40"
          >
            {visible
              ? <EyeOff aria-hidden="true" className="h-4 w-4" />
              : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      )}
    </Field>
  );
});

export default PasswordInputField;
