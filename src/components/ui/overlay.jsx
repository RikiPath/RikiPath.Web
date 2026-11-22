import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast';
import { CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { Button } from './core.jsx';
import { cx } from './cx.js';
import { useFocusTrap } from './hooks.js';
import SakuraToast from './SakuraToast.jsx';
import {
  consumeFlashToast,
  dismissToast,
  registerToastEngine,
  setConfirmHandler,
  unregisterToastEngine,
} from './feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

/* ------------------------------------------------------------------ Modal */

const MODAL_SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true, initialFocusRef, className }) {
  const { tr } = useLocale();
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(ref, { open, onEscape: dismissible ? onClose : undefined, initialFocusRef });
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          aria-hidden="true"
          className="rp-anim-fade rp-backdrop absolute inset-0"
          onClick={dismissible ? onClose : undefined}
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cx(
            'rp-anim-modal relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-rp-card-lg bg-rp-surface shadow-[0_30px_70px_-28px_rgba(20,24,35,0.45),0_2px_8px_rgba(20,24,35,0.06)] ring-1 ring-black/[0.06] outline-none sm:rounded-rp-card-lg',
            MODAL_SIZES[size] || MODAL_SIZES.md,
            className,
          )}
        >
          {(title || dismissible) && (
            <div className="flex items-start justify-between gap-4 border-b border-rp-line px-5 py-4">
              <div className="min-w-0">
                {title && <h2 id={titleId} className="text-base font-bold leading-6 text-rp-text">{tr(title)}</h2>}
                {description && <p id={descId} className="mt-0.5 text-[13px] leading-5 text-rp-text-muted">{tr(description)}</p>}
              </div>
              {dismissible && (
                <button type="button" onClick={onClose} aria-label={tr('Đóng')} className="rp-focus -mr-1 rounded-full p-1.5 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text">
                  <X aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-rp-line bg-rp-bg-2 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

/* ------------------------------------------------------------------ Drawer */

export function Drawer({ open, onClose, title, side = 'right', width = 'w-[min(420px,100vw)]', children, footer, labelledBy }) {
  const { tr } = useLocale();
  const ref = useRef(null);
  const titleId = useId();
  useFocusTrap(ref, { open, onEscape: onClose });
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[95]">
        <div aria-hidden="true" className="rp-anim-fade rp-backdrop absolute inset-0" onClick={onClose} />
        <aside
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy || (title ? titleId : undefined)}
          tabIndex={-1}
          className={cx(
            'absolute inset-y-0 flex flex-col bg-rp-surface shadow-rp-pop outline-none',
            side === 'left' ? 'rp-anim-left left-0' : 'rp-anim-right right-0',
            width,
          )}
        >
          {title && (
            <div className="flex items-center justify-between gap-3 border-b border-rp-line px-5 py-4">
              <h2 id={titleId} className="text-base font-bold text-rp-text">{tr(title)}</h2>
              <button type="button" onClick={onClose} aria-label={tr('Đóng')} className="rp-focus rounded-full p-1.5 text-rp-text-muted hover:bg-rp-muted">
                <X aria-hidden="true" className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t border-rp-line px-5 py-3">{footer}</div>}
        </aside>
      </div>
    </Portal>
  );
}

/* ------------------------------------------------------------------ AlertDialog + confirm provider */

export function AlertDialog({ open, title, description, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', tone = 'danger', onConfirm, onCancel, busy = false, children }) {
  const { tr } = useLocale();
  const cancelRef = useRef(null);
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  // Destructive dialogs focus "Hủy" first so Enter never confirms by accident.
  useFocusTrap(ref, { open, onEscape: busy ? undefined : onCancel, initialFocusRef: cancelRef });
  if (!open) return null;
  const Icon = tone === 'danger' ? TriangleAlert : tone === 'warning' ? CircleAlert : Info;
  const iconCls = tone === 'danger' ? 'bg-rp-danger-bg text-rp-danger' : tone === 'warning' ? 'bg-rp-warning-bg text-rp-warning' : 'bg-rp-brand-tint text-rp-brand-strong';
  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div aria-hidden="true" className="rp-anim-fade rp-backdrop absolute inset-0" />
        <div
          ref={ref}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className="rp-anim-pop relative w-full max-w-md rounded-rp-card-lg bg-rp-surface p-6 shadow-rp-pop outline-none"
        >
          <div className="flex items-start gap-4">
            <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', iconCls)}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-bold leading-6 text-rp-text">{tr(title)}</h2>
              {description && <p id={descId} className="mt-1 text-sm leading-6 text-rp-text-2">{tr(description)}</p>}
              {children && <div className="mt-3">{children}</div>}
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function ConfirmHost() {
  const { tr } = useLocale();
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  useEffect(() => setConfirmHandler((options) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setState(options || {});
  })), []);

  const settle = useCallback((value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  return (
    <AlertDialog
      open={Boolean(state)}
      title={state?.title || tr('Bạn chắc chắn chứ?')}
      description={state?.description}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      tone={state?.tone || 'danger'}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}

/* ------------------------------------------------------------------ Toaster (react-hot-toast) */

/** Mount once at the app root: react-hot-toast viewport + promise-based confirm dialog. */
const TOAST_Z = 2147483000;
const NARROW_QUERY = '(max-width: 639px)';

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(NARROW_QUERY).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_QUERY);
    if (!mq) return undefined;
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

export function FeedbackProvider({ children }) {
  const narrow = useNarrowViewport();
  useEffect(() => {
    registerToastEngine({
      show: (item) => {
        hotToast.custom(
          (t) => <SakuraToast t={t} item={item} onDismiss={dismissToast} />,
          {
            id: item.id,
            duration: item.duration,
          },
        );
      },
      dismiss: (id) => {
        hotToast.dismiss(id);
      },
      dismissAll: () => {
        hotToast.dismiss();
      },
    });
    consumeFlashToast();
    return () => unregisterToastEngine();
  }, []);

  return (
    <>
      {children}
      {/* Single global viewport, rendered at the app root (outside AppShell's overflow/transform containers). */}
      <HotToaster
        position={narrow ? 'top-center' : 'top-right'}
        gutter={10}
        containerClassName="rp-toaster-root"
        containerStyle={narrow ? { top: 12, left: 16, right: 16, zIndex: TOAST_Z } : { top: 20, right: 20, left: 20, zIndex: TOAST_Z }}
      />
      <ConfirmHost />
    </>
  );
}

/* ------------------------------------------------------------------ Popover + Tooltip */

export function Popover({ trigger, children, align = 'end', className, panelClassName, label, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const rootRef = useRef(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector('[data-popover-trigger]')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return (
    <div ref={rootRef} className={cx('relative', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), props: { 'data-popover-trigger': true, 'aria-expanded': open, 'aria-controls': panelId, 'aria-haspopup': 'dialog' } })}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cx(
            'rp-anim-pop absolute top-[calc(100%+8px)] z-[90] rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-pop',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}

/** Floating tooltip rendered via Portal so scroll containers (sidebar) never overflow horizontally. */
export function Tooltip({ content, children, side = 'top', fullWidth = false }) {
  const id = useId();
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof el.getBoundingClientRect !== 'function') {
      setCoords({ left: 0, top: 0 });
      return;
    }
    const r = el.getBoundingClientRect();
    if (side === 'right') {
      setCoords({ left: r.right + 10, top: r.top + r.height / 2 });
    } else if (side === 'left') {
      setCoords({ left: r.left - 10, top: r.top + r.height / 2 });
    } else if (side === 'bottom') {
      setCoords({ left: r.left + r.width / 2, top: r.bottom + 8 });
    } else {
      setCoords({ left: r.left + r.width / 2, top: r.top - 8 });
    }
  }, [side]);

  const hide = useCallback(() => setCoords(null), []);

  // Focus only opens the tooltip for keyboard focus. Mouse/touch focus and focus *restored* by a closing dialog
  // (focus trap returning to its trigger) are not :focus-visible, so the tooltip no longer pops up on its own
  // after e.g. "Để sau" in the unlock dialog.
  const onFocus = useCallback((event) => {
    let keyboard;
    try {
      keyboard = event.target.matches(':focus-visible');
    } catch {
      keyboard = true; // very old engines without :focus-visible keep the previous behaviour
    }
    if (keyboard) show();
  }, [show]);

  useEffect(() => {
    if (!coords) return undefined;
    const onScroll = () => setCoords(null);
    const onKey = (e) => {
      if (e.key === 'Escape') setCoords(null);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [coords]);

  const posClass =
    side === 'right'
      ? '-translate-y-1/2'
      : side === 'left'
        ? '-translate-x-full -translate-y-1/2'
        : side === 'bottom'
          ? '-translate-x-1/2'
          : '-translate-x-1/2 -translate-y-full';
  // Small pointer on the edge facing the trigger (rotated square, same fill as the bubble).
  const arrowClass =
    side === 'right'
      ? 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
      : side === 'left'
        ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'
        : side === 'bottom'
          ? 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2'
          : 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2';

  return (
    <span
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onPointerDown={hide}
      onFocus={onFocus}
      onBlur={hide}
      aria-describedby={coords ? id : undefined}
      className={fullWidth ? 'flex w-full justify-center' : 'inline-flex'}
    >
      {children}
      {coords && (
        <Portal>
          <span
            id={id}
            role="tooltip"
            style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
            className={cx(
              'rp-anim-fade pointer-events-none fixed z-[140] w-max max-w-[240px] rounded-lg bg-rp-text px-2.5 py-1.5 text-xs font-medium leading-4 text-white shadow-rp-pop',
              posClass,
            )}
          >
            <span aria-hidden="true" className={cx('absolute h-2 w-2 rotate-45 rounded-[1px] bg-rp-text', arrowClass)} />
            <span className="relative block">{content}</span>
          </span>
        </Portal>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ Tabs */

/** Accessible tabs (roving tabindex, ←/→/Home/End). Controlled via value/onChange. */
export function Tabs({ tabs, value, onChange, label, className, variant = 'line' }) {
  const { tr } = useLocale();
  const listRef = useRef(null);
  const onKeyDown = (event) => {
    const idx = tabs.findIndex((t) => t.value === value);
    let next = null;
    if (event.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next == null) return;
    event.preventDefault();
    onChange(tabs[next].value);
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        'hide-scrollbar flex max-w-full gap-1 overflow-x-auto',
        variant === 'line' ? 'border-b border-rp-line' : 'rounded-rp-input bg-rp-muted p-1',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={active}
            aria-controls={tab.panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cx(
              'rp-focus inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition-colors duration-150',
              variant === 'line'
                ? cx('-mb-px border-b-2 px-3 py-2.5', active ? 'border-rp-brand text-rp-brand-strong' : 'border-transparent text-rp-text-muted hover:text-rp-text')
                : cx('rounded-[10px] px-3 py-1.5', active ? 'bg-rp-surface text-rp-brand-strong shadow-rp-xs' : 'text-rp-text-muted hover:text-rp-text'),
            )}
          >
            {tab.icon && <tab.icon aria-hidden="true" className="h-4 w-4" />}
            {tr(tab.label)}
            {tab.count != null && (
              <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-rp-muted text-rp-text-muted')}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
