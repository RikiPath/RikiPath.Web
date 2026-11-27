import { Children, createContext, Fragment, isValidElement, useContext } from 'react';

export const FloatingLabelScopeContext = createContext(false);
export const FieldFloatingContext = createContext(null);

export function useFloatingLabelEnabled(explicitProp) {
  const scoped = useContext(FloatingLabelScopeContext);
  if (explicitProp === false) return false;
  if (explicitProp === true) return true;
  return scoped;
}

export function useFieldFloatingContext() {
  return useContext(FieldFloatingContext);
}

/** Merges multiple React refs (callback refs or mutable ref objects). */
export function mergeRefs(...refs) {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    }
  };
}

const OUTER_LAYOUT_TOKEN_RE =
  /^(?:(?:sm|md|lg|xl|2xl|max-sm|max-md|max-lg):)*!?(?:w-|min-w-|max-w-|flex$|flex-(?:1|auto|initial|none|grow|shrink)|grow|shrink|basis-|col-|row-|m-|mt-|mr-|mb-|ml-|mx-|my-|ms-|me-|-?mt-|-?mb-|self-|justify-self-|order-)/;

/** Splits layout/width/margin utility classes from inner typography/padding classes. */
export function splitFieldOuterClasses(className) {
  if (!className || typeof className !== 'string') {
    return { outerClassName: '', innerClassName: className || '' };
  }
  const outer = [];
  const inner = [];
  for (const token of className.trim().split(/\s+/)) {
    if (!token) continue;
    if (OUTER_LAYOUT_TOKEN_RE.test(token)) outer.push(token);
    else inner.push(token);
  }
  return {
    outerClassName: outer.join(' '),
    innerClassName: inner.join(' '),
  };
}

/** Unwraps single-child React Fragments and detects controls supporting floating labels. */
export function isFloatingControlElement(node) {
  let current = node;
  while (isValidElement(current) && current.type === Fragment) {
    const kids = Children.toArray(current.props?.children);
    if (kids.length !== 1) return false;
    current = kids[0];
  }
  if (!isValidElement(current)) return false;
  const isFloatingType = Boolean(current.type?.rpFloatingLabel || current.type?.render?.rpFloatingLabel);
  if (!isFloatingType) return false;
  if (current.props?.floatingLabel === false) return false;
  const inputType = current.props?.type;
  if (inputType === 'password' || inputType === 'file' || inputType === 'hidden') return false;
  return true;
}

/**
 * Checks whether a control has a non-empty value.
 * Preserves numeric `0` and boolean `false` as valid non-empty values.
 */
export function hasFloatingValue(val) {
  if (val === 0 || val === false) return true;
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).length > 0;
}

const FAKE_PLACEHOLDER_OPTION_RE =
  /^(?:[-–—•\s]*)?(?:chọn\b|vui lòng\s+(?:chọn|lựa chọn)|hãy chọn\b|lựa chọn\b|chưa chọn\b|select\b|please\s+select\b|choose\b|pick\b|選択して|お選び|選んで)/i;

/**
 * Detects fake placeholder-only empty options (e.g. `{ value: '', label: 'Chọn trình độ JLPT' }`)
 * while keeping genuine filter or semantic empty-value options (e.g. "Tất cả trạng thái", "Mọi loại thẻ").
 */
export function isFakePlaceholderOption(opt, tr) {
  if (!opt || String(opt.value ?? '') !== '') return false;
  const raw = String(opt.label ?? '').trim();
  const translated = typeof tr === 'function' ? String(tr(raw) ?? '').trim() : raw;
  if (!raw && !translated) return true;
  return FAKE_PLACEHOLDER_OPTION_RE.test(raw) || FAKE_PLACEHOLDER_OPTION_RE.test(translated);
}

/** Converts placeholders such as "Tìm theo tên..." into clean floating labels. */
export function stripTrailingEllipsis(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/(?:\.\.\.|…)+\s*$/, '').trim();
}

const REDUNDANT_PLACEHOLDER_PREFIX_RE =
  /^(?:vui lòng\s+)?(?:nhập|chọn|điền|select|choose|enter)\s+/i;

/** Prevents inner placeholder text from colliding with a resting or redundant floating label. */
export function resolveFloatingPlaceholder({ hasFloatingLabel, isFloated, focused, hasValue, label, placeholder }) {
  if (!placeholder) return undefined;
  if (!hasFloatingLabel) return placeholder;
  if (!isFloated) return undefined;
  if (focused && !hasValue) {
    const cleanP = stripTrailingEllipsis(String(placeholder)).toLowerCase();
    const cleanL = stripTrailingEllipsis(String(label || '')).toLowerCase();
    if (!cleanP || (cleanL && cleanP === cleanL)) return undefined;
    const strippedP = cleanP.replace(REDUNDANT_PLACEHOLDER_PREFIX_RE, '').trim();
    const strippedL = cleanL.replace(REDUNDANT_PLACEHOLDER_PREFIX_RE, '').trim();
    if (strippedP && cleanL && (strippedP === cleanL || (strippedL && strippedP === strippedL))) {
      return undefined;
    }
    return placeholder;
  }
  return undefined;
}
