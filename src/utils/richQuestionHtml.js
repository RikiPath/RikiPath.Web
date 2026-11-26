import { createElement, Fragment } from 'react';
import { parseDocument } from 'htmlparser2';

const ALLOWED_TAGS = new Set([
  'u',
  'b',
  'strong',
  'i',
  'em',
  'br',
  'p',
  'div',
  'span',
  'ruby',
  'rt',
  'rp',
  'sub',
  'sup',
  'mark',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'code',
]);

const STRIP_SUBTREE_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template']);
export const HAS_MARKUP_OR_ENTITY = /<[^>]+>|&(?:#\d+|#x[\da-f]+|[a-z]+);/i;

function sanitizeClassName(value) {
  if (!value) return undefined;
  const tokens = String(value)
    .split(/\s+/)
    .filter((token) => /^(rp-[a-z0-9-]+|underline|font-(?:bold|semibold|medium)|italic)$/i.test(token));
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

export function renderRichNodes(nodes, keyPrefix = 'rq') {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  const output = [];

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const key = `${keyPrefix}-${i}`;

    if (node.type === 'text') {
      if (node.data) output.push(createElement(Fragment, { key }, node.data));
      continue;
    }

    if (node.type !== 'tag') continue;

    const tag = String(node.name || '').toLowerCase();
    if (STRIP_SUBTREE_TAGS.has(tag)) continue;

    const children = renderRichNodes(node.children, key);
    if (!ALLOWED_TAGS.has(tag)) {
      if (children) output.push(createElement(Fragment, { key }, children));
      continue;
    }

    if (tag === 'br') {
      output.push(createElement('br', { key }));
      continue;
    }

    const safeClass = sanitizeClassName(node.attribs?.class);
    switch (tag) {
      case 'u':
        output.push(
          createElement('u', {
            key,
            className: 'underline decoration-rp-text/80 decoration-[1.5px] underline-offset-[3px]',
          }, children),
        );
        break;
      case 'b':
      case 'strong':
        output.push(createElement('strong', { key, className: 'font-bold' }, children));
        break;
      case 'i':
      case 'em':
        output.push(createElement('em', { key, className: 'italic' }, children));
        break;
      case 'mark':
        output.push(
          createElement('mark', { key, className: 'rounded bg-rp-brand-tint px-1 text-rp-text' }, children),
        );
        break;
      case 'rt':
        output.push(
          createElement('rt', { key, className: 'text-[0.62em] font-medium text-rp-text-2' }, children),
        );
        break;
      case 'rp':
        output.push(createElement('rp', { key }, children));
        break;
      case 'p':
        output.push(createElement('p', { key, className: safeClass || 'mb-1.5 last:mb-0' }, children));
        break;
      case 'ul':
        output.push(createElement('ul', { key, className: 'my-1.5 list-disc space-y-1 pl-5' }, children));
        break;
      case 'ol':
        output.push(createElement('ol', { key, className: 'my-1.5 list-decimal space-y-1 pl-5' }, children));
        break;
      case 'table':
        output.push(
          createElement(
            'div',
            { key, className: 'my-2 overflow-x-auto' },
            createElement('table', { className: 'w-full border-collapse border border-rp-line text-xs' }, children),
          ),
        );
        break;
      case 'th':
        output.push(
          createElement('th', { key, className: 'border border-rp-line bg-rp-bg-2 px-2 py-1 text-left font-semibold' }, children),
        );
        break;
      case 'td':
        output.push(createElement('td', { key, className: 'border border-rp-line px-2 py-1' }, children));
        break;
      case 'code':
        output.push(
          createElement('code', { key, className: 'rounded bg-rp-bg-2 px-1 py-0.5 font-mono text-[0.9em]' }, children),
        );
        break;
      default:
        output.push(createElement(tag, { key, className: safeClass }, children));
        break;
    }
  }

  return output;
}

export function renderRichQuestionText(text) {
  const raw = text == null ? '' : String(text);
  if (!raw) return null;
  if (!HAS_MARKUP_OR_ENTITY.test(raw)) return raw;
  const doc = parseDocument(raw, { decodeEntities: true });
  return renderRichNodes(doc.children, 'rq');
}
