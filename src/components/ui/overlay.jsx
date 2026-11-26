import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast';
import { CircleAlert, CircleCheck, Info, SlidersHorizontal, TriangleAlert, X } from 'lucide-react';
import { Button } from './core.jsx';
import { cx } from './cx.js';
import { useFocusTrap } from './hooks.js';
import SakuraToast from './SakuraToast.jsx';
import {
  consumeFlashToast,
  dismissToast,
  registerToastEngine,
  releaseToast,
  setConfirmHandler,
  unregisterToastEngine,
} from './feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

/* ------------------------------------------------------------------ Modal */

/** Exit window (ms) for dialogs closed through `open={false}`; matches --rp-dur-overlay-out + one frame. */
const DIALOG_EXIT_MS = 180;
const DRAWER_EXIT_MS = 230;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * True for a short moment after `open` turns false, so a dialog can play its exit animation before it unmounts.
 * Dialogs removed from the tree by their parent (`{x && <Modal open />}`) simply unmount as before.
 */
function useExitPresence(open, ms = DIALOG_EXIT_MS) {
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setClosing(!open && !prefersReducedMotion());
  }
  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(() => setClosing(false), prefersReducedMotion() ? 0 : ms);
    return () => clearTimeout(timer);
  }, [closing, ms]);
  return closing;
}

const MODAL_SIZES = { sm: 'max-w-[420px]', md: 'max-w-lg', lg: 'max-w-2xl', wizard: 'max-w-[840px]', xl: 'max-w-4xl', '2xl': 'max-w-[1080px]', '3xl': 'max-w-[1160px]' };

export function Modal(props) {
  // `bare`: no header bar — a floating close button and the body owns its own heading (guides, illustrations).
  const { open, onClose, size = 'md', dismissible = true, initialFocusRef, className, describedBy, bare = false, labelledBy } = props;
  const { tr } = useLocale();
  // While the exit animation plays, keep showing what was on screen: parents often clear the data that fed
  // the dialog (selected item, unlock target) in the same tick they close it.
  const [shown, setShown] = useState(props);
  if (open && shown !== props) setShown(props);
  const { title, titleBadge, description, subheader, children, footer } = open ? props : shown;
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(ref, { open, onEscape: dismissible ? onClose : undefined, initialFocusRef });
  const closing = useExitPresence(open);
  if (!open && !closing) return null;
  return (
    <Portal>
      <div inert={closing || undefined} className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          aria-hidden="true"
          className={cx('rp-backdrop absolute inset-0', closing ? 'rp-anim-fade-out' : 'rp-anim-fade')}
          onClick={dismissible && !closing ? onClose : undefined}
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title && !bare ? titleId : labelledBy}
          aria-describedby={description ? descId : describedBy}
          tabIndex={-1}
          className={cx(
            closing ? 'rp-anim-modal-out' : 'rp-anim-modal',
            'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-rp-card-lg bg-rp-surface shadow-[0_30px_70px_-28px_rgba(20,24,35,0.45),0_2px_8px_rgba(20,24,35,0.06)] ring-1 ring-black/[0.06] outline-none sm:rounded-rp-card-lg',
            MODAL_SIZES[size] || MODAL_SIZES.md,
            className,
          )}
        >
          {bare && dismissible && (
            <button type="button" onClick={onClose} aria-label={tr('Đóng')} className="rp-focus absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-rp-text-muted transition-colors hover:bg-rp-muted hover:text-rp-text">
              <X aria-hidden="true" className="h-[18px] w-[18px]" />
            </button>
          )}
          {!bare && (title || dismissible) && (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-rp-line px-5 py-3.5">
              <div className="min-w-0">
                {title && (
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={titleId} className="text-base font-bold leading-6 text-rp-text">
                      {typeof title === 'string' ? tr(title) : title}
                    </h2>
                    {titleBadge}
                  </div>
                )}
                {description && <p id={descId} className="mt-0.5 text-[13px] leading-5 text-rp-text-muted">{tr(description)}</p>}
              </div>
              {dismissible && (
                <button type="button" onClick={onClose} aria-label={tr('Đóng')} className="rp-focus -mr-1 rounded-full p-1.5 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text">
                  <X aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          )}
          {/* Non-scrolling band under the header (wizard steppers, filters): the body scrolls below it, never under it. */}
          {subheader && <div className="shrink-0 border-b border-rp-line bg-rp-surface px-5 py-3">{subheader}</div>}
          <div className={cx('min-h-0 flex-1 overflow-y-auto', bare ? 'px-6 pb-6 pt-7' : 'px-5 py-4')}>{children}</div>
          {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-rp-line bg-rp-bg-2 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

/* ------------------------------------------------------------------ Drawer */

const DRAWER_SIZES = {
  sm: 'w-[min(360px,100vw)]',
  md: 'w-[min(480px,100vw)]',
  lg: 'w-[min(620px,100vw)]',
  xl: 'w-[min(820px,100vw)]',
  '2xl': 'w-full md:w-[min(880px,92vw)] lg:w-[clamp(720px,62vw,920px)]',
};

export function DrawerHeader({ title, titleBadge, subtitle, description, onClose, closeLabel = 'Đóng', titleId, descId, className }) {
  const { tr } = useLocale();
  const sub = subtitle ?? description;
  return (
    <div className={cx('flex shrink-0 items-center justify-between gap-3 border-b border-rp-line bg-rp-surface px-5 py-3.5', className)}>
      <div className="min-w-0 flex-1">
        {(title || titleBadge) && (
          <div className="flex flex-wrap items-center gap-2">
            {title && (
              <h2 id={titleId} className="truncate text-base font-bold text-rp-text">
                {typeof title === 'string' ? tr(title) : title}
              </h2>
            )}
            {titleBadge}
          </div>
        )}
        {sub && (
          <p id={descId} className="mt-0.5 truncate text-[12.5px] leading-5 text-rp-text-muted">
            {typeof sub === 'string' ? tr(sub) : sub}
          </p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={tr(closeLabel)}
          className="rp-focus -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-rp-text-muted transition-colors hover:bg-rp-muted hover:text-rp-text"
        >
          <X aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}

export function DrawerBody({ padded = true, className, children }) {
  return (
    <div className={cx('min-h-0 flex-1 overflow-y-auto', padded && 'px-5 py-4', className)}>
      {children}
    </div>
  );
}

export function DrawerFooter({ className, children }) {
  return (
    <div className={cx('shrink-0 border-t border-rp-line bg-rp-bg-2 px-5 py-3', className)}>
      {children}
    </div>
  );
}

export function SideDrawer(props) {
  const {
    open,
    onClose,
    initialFocusRef,
    dismissible = true,
    zIndexClass = 'z-[95]',
  } = props;
  // Keep snapshot of drawer content while exit slide/fade animation plays so closing transitions never blank or crash.
  const [shown, setShown] = useState(props);
  if (open && shown !== props) setShown(props);
  const active = open ? props : shown;
  const {
    title,
    subtitle,
    description,
    side = 'right',
    size = '2xl',
    width,
    labelledBy,
    className,
    children,
  } = active;

  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  const closing = useExitPresence(open, DRAWER_EXIT_MS);
  useFocusTrap(ref, { open, onEscape: dismissible ? onClose : undefined, initialFocusRef });
  if (!open && !closing) return null;

  const sub = subtitle ?? description;
  const resolvedWidth = side === 'bottom'
    ? 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-rp-card-lg'
    : cx('inset-y-0', width || DRAWER_SIZES[size] || DRAWER_SIZES.md);
  const sidePos = side === 'bottom' ? '' : side === 'left' ? 'left-0' : 'right-0';
  const motionCls = side === 'bottom'
    ? (closing ? 'rp-drawer-out-bottom' : 'rp-drawer-in-bottom')
    : side === 'left'
      ? (closing ? 'rp-drawer-out-left' : 'rp-drawer-in-left')
      : (closing ? 'rp-drawer-out-right' : 'rp-drawer-in-right');

  return (
    <Portal>
      <div inert={closing || undefined} className={cx('fixed inset-0 overflow-hidden', zIndexClass)}>
        <div
          aria-hidden="true"
          className={cx(
            'rp-backdrop absolute inset-0',
            closing ? 'rp-drawer-backdrop-out' : 'rp-drawer-backdrop-in',
          )}
          onClick={dismissible && !closing ? onClose : undefined}
        />
        <aside
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy || (title ? titleId : undefined)}
          aria-describedby={sub ? descId : undefined}
          tabIndex={-1}
          className={cx(
            'absolute flex flex-col bg-rp-surface shadow-rp-pop outline-none',
            sidePos,
            motionCls,
            resolvedWidth,
            className,
          )}
        >
          {typeof children === 'function' ? children({ titleId, descId }) : children}
        </aside>
      </div>
    </Portal>
  );
}

export function Drawer(props) {
  const { open } = props;
  const [shown, setShown] = useState(props);
  if (open && shown !== props) setShown(props);
  const active = open ? props : shown;
  const {
    onClose,
    title,
    titleBadge,
    subtitle,
    description,
    side = 'right',
    size,
    width,
    padded = true,
    dismissible = true,
    initialFocusRef,
    zIndexClass,
    className,
    headerClassName,
    bodyClassName,
    children,
    footer,
    labelledBy,
  } = active;

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      description={description}
      side={side}
      size={size || 'md'}
      width={width}
      labelledBy={labelledBy}
      dismissible={dismissible}
      initialFocusRef={initialFocusRef}
      zIndexClass={zIndexClass}
      className={className}
    >
      {({ titleId, descId }) => (
        <>
          {(title || titleBadge || subtitle || description) && (
            <DrawerHeader
              title={title}
              titleBadge={titleBadge}
              subtitle={subtitle}
              description={description}
              onClose={dismissible ? onClose : undefined}
              titleId={titleId}
              descId={descId}
              className={headerClassName}
            />
          )}
          <DrawerBody padded={padded} className={bodyClassName}>{children}</DrawerBody>
          {footer && <DrawerFooter>{footer}</DrawerFooter>}
        </>
      )}
    </SideDrawer>
  );
}

export const ConfirmDialog = AlertDialog;

/* ------------------------------------------------------------------ AlertDialog + confirm provider */

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  tone = 'danger',
  cancelVariant = 'secondary',
  onConfirm,
  onCancel,
  onClose,
  busy = false,
  loading = false,
  children,
}) {
  const { tr } = useLocale();
  const cancelRef = useRef(null);
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  const resolvedCancel = onCancel || onClose;
  const isBusy = Boolean(busy || loading);
  // Destructive dialogs focus "Hủy" first so Enter never confirms by accident.
  useFocusTrap(ref, { open, onEscape: isBusy ? undefined : resolvedCancel, initialFocusRef: cancelRef });
  if (!open) return null;
  const Icon = tone === 'danger'
    ? TriangleAlert
    : tone === 'warning'
      ? CircleAlert
      : tone === 'success'
        ? CircleCheck
        : Info;
  const iconCls = tone === 'danger'
    ? 'bg-rp-danger-bg text-rp-danger'
    : tone === 'warning'
      ? 'bg-rp-warning-bg text-rp-warning'
      : tone === 'success'
        ? 'bg-rp-success-bg text-rp-success'
        : 'bg-rp-brand-tint text-rp-brand-strong';
  const confirmVariant = tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary';
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
          className="rp-anim-pop relative w-full max-w-[420px] rounded-rp-card-lg bg-rp-surface p-5 shadow-rp-pop outline-none"
        >
          <div className="flex items-start gap-3.5">
            <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconCls)}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-bold leading-6 text-rp-text">{tr(title)}</h2>
              {description && <p id={descId} className="mt-1 text-sm leading-6 text-rp-text-2">{tr(description)}</p>}
              {children && <div className="mt-3">{children}</div>}
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button ref={cancelRef} variant={cancelVariant} onClick={resolvedCancel} disabled={isBusy}>{tr(cancelLabel)}</Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={isBusy}>{tr(confirmLabel)}</Button>
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
          (t) => <SakuraToast t={t} item={item} onDismiss={dismissToast} onExpire={releaseToast} />,
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
      {/* Single global viewport mounted via Portal directly on document.body so no Drawer/Modal/AppShell stacking context can ever obscure toasts. */}
      <Portal>
        <HotToaster
          position={narrow ? 'top-center' : 'top-right'}
          gutter={10}
          containerClassName="rp-toaster-root"
          containerStyle={narrow ? { top: 12, left: 16, right: 16, zIndex: TOAST_Z } : { top: 20, right: 20, left: 20, zIndex: TOAST_Z }}
        />
      </Portal>
      <ConfirmHost />
    </>
  );
}

/* ------------------------------------------------------------------ Popover + Tooltip */

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function Popover({ trigger, children, align = 'end', className, panelClassName, label, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  const updatePanelPosition = useCallback(() => {
    if (!rootRef.current || typeof window === 'undefined') return;
    const rect = rootRef.current.getBoundingClientRect();
    const measuredW = panelRef.current?.offsetWidth || 300;
    const measuredH = panelRef.current?.offsetHeight || 336;
    const width = Math.min(measuredW, window.innerWidth - 24);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < measuredH + 16 && spaceAbove > spaceBelow;
    const left = align === 'end'
      ? Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
      : Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    setPanelStyle({
      position: 'fixed',
      left,
      maxWidth: 'calc(100vw - 24px)',
      zIndex: 130,
      ...(flip ? { bottom: Math.max(12, window.innerHeight - rect.top + 8) } : { top: Math.min(window.innerHeight - 60, rect.bottom + 8) }),
    });
  }, [align]);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }
    updatePanelPosition();
    const raf = window.requestAnimationFrame(updatePanelPosition);
    return () => window.cancelAnimationFrame(raf);
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (event.target?.closest?.('[data-rp-floating-portal="true"]')) return;
      if (!rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        rootRef.current?.querySelector('[data-popover-trigger]')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  const triggerAriaProps = {
    'data-popover-trigger': true,
    'aria-expanded': open,
    'aria-controls': panelId,
    'aria-haspopup': 'dialog',
  };
  const toggleOpen = () => setOpen((v) => !v);
  const renderedTrigger =
    typeof trigger === 'function'
      ? trigger({ open, toggle: toggleOpen, props: triggerAriaProps })
      : isValidElement(trigger)
        ? cloneElement(trigger, {
            ...triggerAriaProps,
            onClick: (e) => {
              trigger.props?.onClick?.(e);
              if (!e.defaultPrevented) toggleOpen();
            },
          })
        : null;
  return (
    <div ref={rootRef} className={cx('relative', className)}>
      {renderedTrigger}
      {open && (
        <Portal>
          <div
            ref={panelRef}
            id={panelId}
            data-rp-floating-portal="true"
            role="dialog"
            aria-label={label}
            style={panelStyle || { position: 'fixed', left: 12, top: 64, zIndex: 130, visibility: 'hidden' }}
            className={cx(
              'rp-anim-pop max-w-[calc(100vw-24px)] rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-pop',
              panelClassName,
            )}
          >
            {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
          </div>
        </Portal>
      )}
    </div>
  );
}

/** Reusable toolbar FilterPopover wrapping Popover with active count badge and reset link. */
export function FilterPopover({
  label = 'Bộ lọc',
  activeCount = 0,
  onReset,
  align = 'end',
  size = 'md',
  panelClassName,
  children,
}) {
  const { tr } = useLocale();
  return (
    <Popover
      align={align}
      label={tr(label)}
      panelClassName={cx('w-[min(340px,calc(100vw-24px))] p-4', panelClassName)}
      trigger={({ open, toggle, props }) => (
        <Button
          {...props}
          variant={activeCount > 0 ? 'soft' : 'secondary'}
          size={size}
          icon={SlidersHorizontal}
          onClick={toggle}
          aria-pressed={open}
        >
          <span>{tr(label)}</span>
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rp-brand-pressed px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      )}
    >
      {({ close }) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-rp-line pb-2">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-rp-text-muted">{tr(label)}</p>
            {onReset && activeCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="rp-link text-xs font-semibold text-rp-brand-strong"
              >
                {tr('Xóa bộ lọc')}
              </button>
            )}
          </div>
          <div>{typeof children === 'function' ? children({ close }) : children}</div>
        </div>
      )}
    </Popover>
  );
}

/** Accessible SegmentedControl backed by sliding-pill Tabs for compact view/filter switchers. */
export function SegmentedControl({ options = [], value, onChange, label, size = 'md', className }) {
  const mapped = options.map((opt) =>
    typeof opt === 'object' ? opt : { value: String(opt), label: String(opt) },
  );
  return <Tabs variant="pill" size={size} tabs={mapped} value={value} onChange={onChange} label={label} className={className} />;
}

/** Floating tooltip rendered via Portal so scroll containers (sidebar) never overflow horizontally. */
const NO_FIT = Object.freeze({ dx: 0, dy: 0, flipped: false });

export function Tooltip({ content, children, side = 'top', fullWidth = false }) {
  const id = useId();
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const [coords, setCoords] = useState(null);
  // Viewport correction measured after the bubble renders: shift (px) and whether the side was flipped.
  const [fit, setFit] = useState(NO_FIT);

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

  const hide = useCallback(() => {
    setCoords(null);
    setFit(NO_FIT);
  }, []);

  // Keep the bubble inside the viewport: flip left/right when it would overflow horizontally, otherwise
  // nudge it along the cross axis (the arrow is moved back so it still points at the trigger).
  useLayoutEffect(() => {
    if (!coords) return;
    const tip = tipRef.current;
    const trigger = triggerRef.current;
    if (!tip || typeof tip.getBoundingClientRect !== 'function' || typeof window === 'undefined') return;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Position from the anchor + measured size (not the rendered rect), so a previous correction never compounds.
    const { width: w, height: h } = tip.getBoundingClientRect();
    const baseLeft = side === 'right' ? coords.left : side === 'left' ? coords.left - w : coords.left - w / 2;
    const baseTop = side === 'right' || side === 'left' ? coords.top - h / 2 : side === 'bottom' ? coords.top : coords.top - h;
    let dx = 0;
    let dy = 0;
    let flipped = false;
    if (side === 'right' || side === 'left') {
      const overflow = side === 'right' ? baseLeft + w > vw - margin : baseLeft < margin;
      if (overflow && trigger?.getBoundingClientRect) {
        const r = trigger.getBoundingClientRect();
        flipped = true;
        dx = side === 'right' ? r.left - 10 - w - baseLeft : r.right + 10 - baseLeft;
      }
      if (baseTop < margin) dy = margin - baseTop;
      else if (baseTop + h > vh - margin) dy = vh - margin - (baseTop + h);
    } else {
      if (baseLeft < margin) dx = margin - baseLeft;
      else if (baseLeft + w > vw - margin) dx = vw - margin - (baseLeft + w);
    }
    setFit((prev) => (prev.dx === dx && prev.dy === dy && prev.flipped === flipped ? prev : { dx, dy, flipped }));
  }, [coords, side, content]);

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
  const arrowSide = fit.flipped ? (side === 'right' ? 'left' : 'right') : side;
  const arrowClass =
    arrowSide === 'right'
      ? 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
      : arrowSide === 'left'
        ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'
        : arrowSide === 'bottom'
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
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ left: `${coords.left + fit.dx}px`, top: `${coords.top + fit.dy}px` }}
            className={cx(
              'rp-anim-fade pointer-events-none fixed z-[140] w-max max-w-[240px] rounded-lg bg-rp-text px-2.5 py-1.5 text-xs font-medium leading-4 text-white shadow-rp-pop',
              posClass,
            )}
          >
            <span
              aria-hidden="true"
              style={fit.dy || (fit.dx && (side === 'top' || side === 'bottom'))
                ? { marginTop: side === 'left' || side === 'right' ? `${-fit.dy}px` : undefined, marginLeft: side === 'top' || side === 'bottom' ? `${-fit.dx}px` : undefined }
                : undefined}
              className={cx('absolute h-2 w-2 rotate-45 rounded-[1px] bg-rp-text', arrowClass)}
            />
            <span className="relative block">{content}</span>
          </span>
        </Portal>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ Tabs */

/** Accessible tabs (roving tabindex, ←/→/Home/End). Controlled via value/onChange. */
/**
 * Last active-pill geometry per tab set. Pages that render a different toolbar for each tab (e.g. Lớp học & ghi danh)
 * remount <Tabs> on every switch; without this memory a fresh mount has nothing to slide from and the pill just appears.
 */
const TAB_INDICATOR_MEMORY = new Map();
/**
 * Where the most recent slide of a tab set started. A click first re-renders the outgoing strip (which already moves its
 * pill to the new tab) and only then swaps the panel that owns the toolbar; the remounted strip restarts from this
 * origin so the movement is still visible.
 */
const TAB_SLIDE_ORIGIN = new Map();
const SLIDE_ORIGIN_TTL_MS = 600;

export function Tabs({
  tabs = [],
  value,
  onChange,
  label,
  className,
  variant = 'line',
  tone = 'default',
  size = 'md',
  fullWidth = false,
}) {
  const { tr } = useLocale();
  const listRef = useRef(null);
  const mountedRef = useRef(false);
  // Pending "slide from remembered position" timers: kept outside effect cleanup so a parent re-render (new `tabs`
  // array identity) cannot cancel the slide halfway; cleared only on unmount.
  const slideRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  const [ready, setReady] = useState(false);
  const memoryKey = `${label || ''}|${tabs.map((t, i) => t.value ?? t.id ?? i).join('|')}`;

  const measureIndicator = useCallback(() => {
    const activeEl = listRef.current?.querySelector('[role="tab"][aria-selected="true"]');
    if (!activeEl) return null;
    return { left: activeEl.offsetLeft, top: activeEl.offsetTop, width: activeEl.offsetWidth, height: activeEl.offsetHeight };
  }, []);

  const updateIndicator = useCallback(() => {
    if (!listRef.current) return;
    const rect = measureIndicator();
    setIndicator(rect);
    if (!rect) return;
    const previous = TAB_INDICATOR_MEMORY.get(memoryKey);
    if (previous && (previous.left !== rect.left || previous.width !== rect.width)) {
      TAB_SLIDE_ORIGIN.set(memoryKey, { rect: previous, at: Date.now() });
    }
    TAB_INDICATOR_MEMORY.set(memoryKey, rect);
  }, [measureIndicator, memoryKey]);

  // First mount of a tab set seen before: start the pill where it was, then slide it to the active tab.
  const startFromRemembered = useCallback(() => {
    const origin = TAB_SLIDE_ORIGIN.get(memoryKey);
    const previous = origin && Date.now() - origin.at < SLIDE_ORIGIN_TTL_MS
      ? origin.rect
      : TAB_INDICATOR_MEMORY.get(memoryKey);
    const next = measureIndicator();
    if (!previous || !next || (previous.left === next.left && previous.width === next.width)) return null;
    setIndicator(previous);
    setReady(true);
    const slide = { first: 0, second: 0, fallback: 0 };
    const finish = () => {
      if (slideRef.current !== slide) return;
      cancelAnimationFrame(slide.first);
      cancelAnimationFrame(slide.second);
      clearTimeout(slide.fallback);
      slideRef.current = null;
      updateIndicator();
    };
    slide.first = requestAnimationFrame(() => {
      slide.second = requestAnimationFrame(finish);
    });
    // Background/hidden documents may not run animation frames: never leave the pill on the previous tab.
    slide.fallback = setTimeout(finish, 120);
    slideRef.current = slide;
    return true;
  }, [measureIndicator, memoryKey, updateIndicator]);

  useEffect(() => () => {
    const slide = slideRef.current;
    if (!slide) return;
    cancelAnimationFrame(slide.first);
    cancelAnimationFrame(slide.second);
    clearTimeout(slide.fallback);
    slideRef.current = null;
  }, []);

  useIsomorphicLayoutEffect(() => {
    const isFirstMount = !mountedRef.current;
    mountedRef.current = true;
    if (isFirstMount && startFromRemembered()) return undefined;
    if (slideRef.current) return undefined; // a slide is in flight; it ends on the active tab
    updateIndicator();
    const activeEl = listRef.current?.querySelector('[role="tab"][aria-selected="true"]');
    const list = listRef.current;
    if (list && activeEl && list.scrollWidth > list.clientWidth) {
      const activeLeft = activeEl.offsetLeft;
      const activeRight = activeLeft + activeEl.offsetWidth;
      if (activeLeft < list.scrollLeft) list.scrollTo({ left: activeLeft, behavior: 'auto' });
      else if (activeRight > list.scrollLeft + list.clientWidth) {
        list.scrollTo({ left: activeRight - list.clientWidth, behavior: 'auto' });
      }
    }
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [value, tabs, updateIndicator, startFromRemembered]);

  useEffect(() => {
    if (!listRef.current || typeof ResizeObserver === 'undefined') return;
    // ResizeObserver also fires once right after observe(); that initial call would snap a remembered pill to the new
    // tab before the old position is painted (no slide). Only react to real size changes.
    let lastWidth = listRef.current.offsetWidth;
    let lastHeight = listRef.current.offsetHeight;
    const observer = new ResizeObserver(() => {
      const node = listRef.current;
      if (!node || slideRef.current || (node.offsetWidth === lastWidth && node.offsetHeight === lastHeight)) return;
      lastWidth = node.offsetWidth;
      lastHeight = node.offsetHeight;
      updateIndicator();
    });
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [updateIndicator]);

  const onKeyDown = (event) => {
    const idx = tabs.findIndex((t, i) => (t.value ?? t.id ?? i) === value);
    let next = null;
    if (event.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next == null) return;
    event.preventDefault();
    onChange(tabs[next].value ?? tabs[next].id ?? next);
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
    <div
      ref={listRef}
      role="tablist"
      data-rp-tab-size={size}
      data-rp-tab-variant={variant}
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        'relative hide-scrollbar flex items-center max-w-full gap-1 overflow-x-auto',
        variant === 'line'
          ? 'border-b border-rp-line'
          : size === 'xs' || size === 'sm'
            ? 'w-fit h-8 rounded-xl border border-rp-line bg-rp-surface p-[3px]'
            : size === 'lg'
              ? 'w-fit h-12 rounded-2xl border border-rp-line bg-rp-surface p-1'
              : 'w-fit h-10 rounded-2xl border border-rp-line bg-rp-surface p-[3px]',
        fullWidth && variant !== 'line' && 'w-full!',
        className,
      )}
    >
      {/* Sliding Active Pill Indicator */}
      {variant === 'pill' && indicator && (
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute top-0 left-0 z-0',
            tone === 'segmented'
              ? 'rounded-xl bg-rp-tab-active-bg ring-1 ring-inset ring-rp-brand-border/80'
              : 'rounded-xl bg-rp-tab-active-bg ring-1 ring-inset ring-rp-brand-border/80',
            ready
              ? 'transition-[transform,width] duration-200 motion-reduce:transition-none'
              : 'opacity-0',
          )}
          style={{
            transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
            width: `${indicator.width}px`,
            height: `${indicator.height}px`,
            transitionTimingFunction: 'var(--rp-ease, cubic-bezier(0.16, 1, 0.3, 1))',
          }}
        />
      )}

      {tabs.map((tab, idx) => {
        const tabValue = tab.value ?? tab.id ?? idx;
        const active = tabValue === value;
        const segmented = tone === 'segmented';
        const isSmall = size === 'xs' || size === 'sm';
        const isLarge = size === 'lg';
        const pillButtonSize = isSmall
          ? 'h-6 rounded-[8px] px-3'
          : isLarge
            ? 'h-[38px] rounded-xl px-5 text-[15px]'
            : 'h-8 rounded-xl px-4';
        return (
          <button
            key={tabValue}
            type="button"
            role="tab"
            id={`tab-${tabValue}`}
            data-testid={tab.testId}
            disabled={Boolean(tab.disabled)}
            title={tab.title ? tr(tab.title) : undefined}
            aria-selected={active}
            aria-controls={tab.panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tabValue)}
            className={cx(
              'rp-focus relative z-10 inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45',
              fullWidth && variant !== 'line' ? 'min-w-0 flex-1' : 'shrink-0',
              isSmall ? 'text-xs' : isLarge ? 'text-[15px]' : 'text-sm',
              variant === 'line'
                ? cx('-mb-px border-b-2 px-3 py-2.5', active ? 'border-rp-brand text-rp-brand-strong' : 'border-transparent text-rp-text-muted hover:text-rp-text')
                : cx(
                    pillButtonSize,
                    active
                      ? (!ready
                          ? (segmented ? 'bg-rp-tab-active-bg text-rp-brand-strong' : 'bg-rp-tab-active-bg text-rp-brand-strong')
                          : 'text-rp-brand-strong')
                      : 'text-rp-text-muted hover:text-rp-text',
                  ),
            )}
          >
            {tab.icon && <tab.icon aria-hidden="true" className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
            {tr(tab.label)}
            {tab.count != null && (
              <span
                className={cx(
                  'inline-flex items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums transition-colors duration-150',
                  active ? 'bg-rp-surface text-rp-brand-strong shadow-[0_1px_1px_rgba(45,40,42,0.05)]' : 'bg-rp-muted text-rp-text-muted',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
