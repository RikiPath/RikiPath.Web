import fs from 'fs';
import path from 'path';
import { parseDocument } from 'htmlparser2';
const root = 'd:/RikiPath';
const tmp = path.join(root, '_stitch_tmp');
const pages = path.join(root, 'src/pages');

const JOBS = [
  { html: 'ConsultationQueue.html', out: 'ConsultationQueue.jsx', name: 'ConsultationQueue', dataPage: 'ConsultationQueue' },
  { html: 'BookingSchedule.html', out: 'BookingSchedule.jsx', name: 'BookingSchedule', dataPage: 'BookingSchedule' },
  { html: 'ConsultationPayment.html', out: 'ConsultationPayment.jsx', name: 'ConsultationPayment', dataPage: 'ConsultationPayment' },
  { html: 'ConsultantOverview.html', out: 'ConsultantOverview.jsx', name: 'ConsultantOverview', dataPage: 'ConsultantOverview' },
];

function styleToJsx(styleStr) {
  if (!styleStr || !styleStr.trim()) return null;
  const entries = styleStr
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      if (i < 0) return null;
      let key = pair.slice(0, i).trim();
      let val = pair.slice(i + 1).trim();
      // camelCase
      key = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      // keep quotes for string values; numbers for px-less? keep as string
      if (/^['"].*['"]$/.test(val)) {
        // already quoted in CSS rare
      }
      // font-variation-settings etc.
      return `${key}: ${JSON.stringify(val)}`;
    })
    .filter(Boolean);
  if (!entries.length) return null;
  return `{{ ${entries.join(', ')} }}`;
}

function convertAttrs(attribs = {}) {
  const parts = [];
  for (const [rawKey, rawVal] of Object.entries(attribs)) {
    let key = rawKey;
    let val = rawVal ?? '';

    if (key === 'class') key = 'className';
    if (key === 'for') key = 'htmlFor';
    if (key === 'tabindex') key = 'tabIndex';
    if (key === 'readonly') key = 'readOnly';
    if (key === 'maxlength') key = 'maxLength';
    if (key === 'minlength') key = 'minLength';
    if (key === 'autocomplete') key = 'autoComplete';
    if (key === 'stroke-width') key = 'strokeWidth';
    if (key === 'stroke-linecap') key = 'strokeLinecap';
    if (key === 'stroke-linejoin') key = 'strokeLinejoin';
    if (key === 'fill-rule') key = 'fillRule';
    if (key === 'clip-rule') key = 'clipRule';
    if (key === 'xmlns:xlink') continue;

    // boolean attrs
    if (['checked', 'disabled', 'selected', 'required', 'multiple', 'autoplay', 'muted', 'loop', 'controls', 'open'].includes(key) && (val === '' || val === key)) {
      parts.push(key);
      continue;
    }

    if (key === 'style') {
      const jsxStyle = styleToJsx(val);
      if (jsxStyle) parts.push(`style=${jsxStyle}`);
      continue;
    }

    // escape quotes in attribute values
    const safe = String(val).replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
    parts.push(`${key}="${safe}"`);
  }
  return parts.join(' ');
}

const VOID = new Set([
  'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
]);

function serialize(node, indent = 0) {
  if (!node) return '';
  if (node.type === 'text') {
    const t = node.data ?? '';
    if (!t.trim()) return t.includes('\n') ? '\n' : t;
    // Escape JSX special chars in text
    const escaped = t
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
    // If has newlines with indentation from HTML, wrap as expression string for stability
    if (/\n/.test(escaped) && escaped.trim()) {
      return `{"${escaped.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}`;
    }
    // ampersands already entities often
    return escaped
      .replace(/&nbsp;/g, '\u00a0')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }
  if (node.type === 'comment') {
    return `{/* ${String(node.data || '').replace(/\*\//g, '* /')} */}`;
  }
  if (node.type !== 'tag') return '';

  const tag = node.name;
  if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'title') {
    return '';
  }

  const attrs = convertAttrs(node.attribs);
  const pad = '';
  const open = attrs ? `<${tag} ${attrs}` : `<${tag}`;

  if (VOID.has(tag)) {
    return `${open} />`;
  }

  const children = (node.children || []).map((c) => serialize(c, indent + 1)).join('');
  return `${open}>${children}</${tag}>`;
}

function extractBodyAndScripts(html) {
  // body class
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i);
  let bodyAttrs = {};
  let bodyHtml = html;
  if (bodyMatch) {
    const attrStr = bodyMatch[1] || '';
    bodyHtml = bodyMatch[2];
    const classM = attrStr.match(/class="([^"]*)"/);
    if (classM) bodyAttrs.className = classM[1];
    const styleM = attrStr.match(/style="([^"]*)"/);
    if (styleM) bodyAttrs.style = styleM[1];
  }

  // scripts (inline)
  const scripts = [];
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html))) {
    const code = m[1].trim();
    if (code && !code.includes('tailwind.config') && !code.includes('cdn.tailwindcss')) {
      scripts.push(code);
    }
  }

  // strip scripts/styles from body fragment
  bodyHtml = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  return { bodyHtml, bodyAttrs, scripts };
}

function buildComponent({ name, dataPage, bodyHtml, bodyAttrs, scripts }) {
  const doc = parseDocument(bodyHtml, { decodeEntities: false });
  const inner = (doc.children || []).map((c) => serialize(c)).join('\n');

  const className = bodyAttrs.className
    ? `${bodyAttrs.className} min-h-screen`
    : 'min-h-screen bg-background text-on-surface antialiased';

  let styleProp = '';
  if (bodyAttrs.style) {
    const jsxStyle = styleToJsx(bodyAttrs.style);
    if (jsxStyle) styleProp = ` style=${jsxStyle}`;
  }

  let useEffectBlock = '';
  let imports = '';
  if (scripts.length) {
    imports = "import { useEffect } from 'react';\n";
    const joined = scripts
      .map((s) => s.replace(/<\/script>/gi, ''))
      .join('\n\n');
    useEffectBlock = `
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') {
        try { fn(); } catch (err) { console.warn(err); }
        return;
      }
      return orig(type, fn, opts);
    };
    try {
${joined.split('\n').map((l) => '      ' + l).join('\n')}
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);
`;
  }

  return `${imports}export default function ${name}() {${useEffectBlock}
  return (
    <div className=${JSON.stringify(className)}${styleProp} data-page="${dataPage}">
${inner}
    </div>
  );
}
`;
}

for (const job of JOBS) {
  const htmlPath = path.join(tmp, job.html);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const { bodyHtml, bodyAttrs, scripts } = extractBodyAndScripts(html);
  const jsx = buildComponent({
    name: job.name,
    dataPage: job.dataPage,
    bodyHtml,
    bodyAttrs,
    scripts,
  });
  const outPath = path.join(pages, job.out);
  fs.writeFileSync(outPath, jsx, 'utf8');
  console.log('Wrote', job.out, `(${jsx.length} chars)`, 'scripts:', scripts.length);
}
