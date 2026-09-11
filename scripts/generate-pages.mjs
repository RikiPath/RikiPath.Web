import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'htmlparser2';

const ROOT = path.resolve('d:/RikiPath');
const HTML_DIR = path.join(ROOT, 'stitch-html');
const PAGES_DIR = path.join(ROOT, 'src/pages');

const PAGES = [
  ['HomeLearner', 'HomeLearner'],
  ['CourseDetail', 'CourseDetail'],
  ['Auth', 'Auth'],
  ['CourseCatalog', 'CourseCatalog'],
  ['HomeLanding', 'HomeLanding'],
  ['Register', 'Register'],
  ['ForgotPassword', 'ForgotPassword'],
  ['OnboardingSurvey', 'OnboardingSurvey'],
  ['Dashboard', 'Dashboard'],
  ['AICounselor', 'AICounselor'],
  ['LessonList', 'LessonList'],
  ['SentenceStudio', 'SentenceStudio'],
  ['KanjiStudio', 'KanjiStudio'],
  ['RoadmapJLPT', 'RoadmapJLPT'],
  ['ExamN3', 'ExamN3'],
  ['Consultation', 'Consultation'],
];

const ATTR_MAP = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  maxlength: 'maxLength',
  minlength: 'minLength',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  playsinline: 'playsInline',
  allowfullscreen: 'allowFullScreen',
  srcset: 'srcSet',
  crossorigin: 'crossOrigin',
  fetchpriority: 'fetchPriority',
  datetime: 'dateTime',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  inputmode: 'inputMode',
  enterkeyhint: 'enterKeyHint',
  novalidate: 'noValidate',
  formnovalidate: 'formNoValidate',
  onclick: 'onClick',
  onsubmit: 'onSubmit',
  onchange: 'onChange',
  oninput: 'onInput',
  onfocus: 'onFocus',
  onblur: 'onBlur',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onkeypress: 'onKeyPress',
  onmouseenter: 'onMouseEnter',
  onmouseleave: 'onMouseLeave',
  strokeWidth: 'strokeWidth',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-family': 'fontFamily',
  'text-anchor': 'textAnchor',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'xlink:href': 'href',
  'xml:space': 'xmlSpace',
  'xmlns:xlink': 'xmlnsXlink',
  'paint-order': 'paintOrder',
  'vector-effect': 'vectorEffect',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'marker-end': 'markerEnd',
  'marker-start': 'markerStart',
  'marker-mid': 'markerMid',
  'gradientunits': 'gradientUnits',
  'gradienttransform': 'gradientTransform',
  'patternunits': 'patternUnits',
  'spreadmethod': 'spreadMethod',
  'stddeviation': 'stdDeviation',
  'viewbox': 'viewBox',
};

const BOOL_ATTRS = new Set([
  'checked', 'disabled', 'selected', 'required', 'readOnly', 'multiple',
  'hidden', 'autoFocus', 'controls', 'loop', 'muted', 'playsInline',
  'defaultChecked', 'autoPlay', 'allowFullScreen', 'noValidate', 'open',
  'reversed', 'scoped', 'async', 'defer', 'itemScope',
]);

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

const EVENT_ATTRS = new Set([
  'onClick', 'onSubmit', 'onChange', 'onInput', 'onFocus', 'onBlur',
  'onKeyDown', 'onKeyUp', 'onKeyPress', 'onMouseEnter', 'onMouseLeave',
]);

function flatten(obj, prefix = '') {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const name = k === 'DEFAULT' ? prefix : prefix ? `${prefix}-${k}` : k;
    if (typeof v === 'string' || typeof v === 'number') {
      if (name) out[name] = String(v);
    } else if (Array.isArray(v)) {
      out[name] = v;
    } else if (v && typeof v === 'object') {
      Object.assign(out, flatten(v, name));
    }
  }
  return out;
}

function extractConfig(html) {
  const start = html.search(/tailwind\.config\s*=/);
  if (start < 0) return null;
  const after = html.slice(html.indexOf('=', start) + 1);
  const end = after.indexOf('</script>');
  if (end < 0) return null;
  let raw = after.slice(0, end).trim().replace(/;+\s*$/, '');
  try {
    return new Function(`return (${raw})`)();
  } catch (err) {
    console.warn('config eval failed', err.message);
    return null;
  }
}

function extractStyles(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
}

function extractScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1].trim())
    .filter((s) => s && !s.includes('tailwind.config'));
}

function cssToJs(style) {
  const entries = [];
  style.split(';').forEach((part) => {
    const idx = part.indexOf(':');
    if (idx < 0) return;
    const prop = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!prop) return;
    if (prop.startsWith('--')) {
      entries.push(`${JSON.stringify(prop)}: ${JSON.stringify(val)}`);
      return;
    }
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    entries.push(`${camel}: ${JSON.stringify(val)}`);
  });
  return `{{ ${entries.join(', ')} }}`;
}

function convertHandler(code) {
  let body = String(code).trim();
  body = body.replace(/\bthis\b/g, 'e.currentTarget');
  body = body.replace(/\bevent\b/g, 'e');
  return `{(e) => { ${body} }}`;
}

function attrName(name) {
  if (ATTR_MAP[name]) return ATTR_MAP[name];
  if (ATTR_MAP[name.toLowerCase()]) return ATTR_MAP[name.toLowerCase()];
  if (name.startsWith('aria-') || name.startsWith('data-') || name.startsWith('stroke') || name.startsWith('fill')) {
    return name;
  }
  return name;
}

function serializeAttrs(attribs = {}) {
  const parts = [];
  for (const [raw, value] of Object.entries(attribs)) {
    if (raw === 'xmlns') {
      parts.push(`xmlns=${JSON.stringify(value)}`);
      continue;
    }
    const name = attrName(raw);
    if (name === 'style') {
      parts.push(`style=${cssToJs(value)}`);
      continue;
    }
    if (EVENT_ATTRS.has(name)) {
      parts.push(`${name}=${convertHandler(value)}`);
      continue;
    }
    if (BOOL_ATTRS.has(name) || BOOL_ATTRS.has(raw)) {
      if (value === 'false') continue;
      parts.push(name);
      continue;
    }
    if (value == null) continue;
    parts.push(`${name}=${JSON.stringify(value)}`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

function jsxText(text) {
  if (!text) return '';
  if (/^\s+$/.test(text)) return text.includes('\n') ? '\n' : text;
  if (/[{}<>]/.test(text) || text.includes('&') || /^\s|\s$/.test(text)) {
    return `{${JSON.stringify(text)}}`;
  }
  return text;
}

function serialize(node, indent = 0) {
  if (!node) return '';
  if (node.type === 'text') return jsxText(node.data || '');
  if (node.type === 'comment') {
    const c = (node.data || '').replace(/\*\//g, '* /');
    return `{/* ${c} */}`;
  }
  if (node.type !== 'tag') return '';
  const tag = node.name;
  if (tag === 'script') return '';
  const attrs = serializeAttrs(node.attribs);
  const kids = node.children || [];
  if (VOID.has(tag) || (node.selfClosing && kids.length === 0)) {
    return `<${tag}${attrs} />`;
  }
  const inner = kids.map((k) => serialize(k, indent + 1)).join('');
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

function bodyInnerAndClass(html) {
  const doc = parseDocument(html, {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
    recognizeSelfClosing: true,
    decodeEntities: true,
  });
  const htmlEl = doc.children.find((n) => n.type === 'tag' && n.name.toLowerCase() === 'html') || doc;
  const stack = [htmlEl];
  let body;
  while (stack.length) {
    const n = stack.pop();
    if (n.type === 'tag' && n.name.toLowerCase() === 'body') {
      body = n;
      break;
    }
    if (n.children) stack.push(...n.children);
  }
  if (!body) return { jsx: '', className: '', style: '' };
  const className = body.attribs?.class || '';
  const style = body.attribs?.style || '';
  const jsx = (body.children || []).map((c) => serialize(c)).join('\n');
  return { jsx, className, style };
}

function tokenCss(colors, shadows, fonts, spacing, radii, fontSizes) {
  const lines = [];
  for (const [k, v] of Object.entries(colors)) {
    if (typeof v === 'string') lines.push(`  --color-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(shadows)) {
    if (typeof v === 'string') lines.push(`  --shadow-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(fonts)) {
    const val = Array.isArray(v) ? v.map((x) => (String(x).includes(' ') ? `"${x}"` : x)).join(', ') : v;
    if (typeof val === 'string') lines.push(`  --font-${k}: ${val}, sans-serif;`);
  }
  for (const [k, v] of Object.entries(spacing)) {
    if (typeof v === 'string' || typeof v === 'number') lines.push(`  --spacing-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(radii)) {
    if (k === 'DEFAULT') continue;
    if (typeof v === 'string') lines.push(`  --radius-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(fontSizes)) {
    if (typeof v === 'string') {
      lines.push(`  --text-${k}: ${v};`);
    } else if (Array.isArray(v)) {
      lines.push(`  --text-${k}: ${v[0]};`);
      const extra = v[1] || {};
      if (typeof extra === 'string') lines.push(`  --text-${k}--line-height: ${extra};`);
      else {
        if (extra.lineHeight) lines.push(`  --text-${k}--line-height: ${extra.lineHeight};`);
        if (extra.letterSpacing) lines.push(`  --text-${k}--letter-spacing: ${extra.letterSpacing};`);
        if (extra.fontWeight) lines.push(`  --text-${k}--font-weight: ${extra.fontWeight};`);
      }
    }
  }
  return lines.join('\n');
}

const colors = {};
const shadows = {};
const fonts = {};
const spacing = {};
const radii = {};
const fontSizes = {};
const extraCss = [];

const preferred = ['HomeLanding.html', 'Auth.html', 'Dashboard.html', 'AICounselor.html', 'KanjiStudio.html', 'LessonList.html', 'SentenceStudio.html', 'Consultation.html', 'CourseCatalog.html'];
const htmlFiles = [
  ...preferred,
  ...fs.readdirSync(HTML_DIR).filter((f) => f.endsWith('.html') && !preferred.includes(f)),
];

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(HTML_DIR, file), 'utf8');
  const cfg = extractConfig(html);
  if (cfg?.theme?.extend) {
    const ex = cfg.theme.extend;
    Object.assign(colors, flatten(ex.colors || {}));
    Object.assign(shadows, flatten(ex.boxShadow || {}));
    Object.assign(fonts, flatten(ex.fontFamily || {}));
    Object.assign(spacing, flatten(ex.spacing || {}));
    Object.assign(radii, flatten(ex.borderRadius || {}));
    Object.assign(fontSizes, flatten(ex.fontSize || {}));
  }
  extraCss.push(...extractStyles(html).map((s) => s.replace(/@layer base\s*\{/g, '').replace(/html,\s*body\s*\{[\s\S]*?\}/g, '')));
}

Object.assign(colors, {
  sakura: undefined,
});
delete colors.sakura;
Object.assign(colors, {
  'sakura-50': '#fff5f7',
  'sakura-100': '#fde8ec',
  'sakura-200': '#fbd0da',
  'sakura-300': '#f8a8bb',
  'sakura-400': '#f17094',
  'sakura-500': '#d94b68',
  'sakura-600': '#c53453',
  'sakura-700': '#a52642',
  'sakura-800': '#89233a',
  'sakura-900': '#732134',
  'sakura-deep': colors['sakura-deep'] || '#9E2A4B',
  'sakura-base': colors['sakura-base'] || '#D94B68',
  'sakura-soft': colors['sakura-soft'] || '#FEE8EE',
  'sakura-cream': colors['sakura-cream'] || '#FAF7F5',
  'sakura-surface': colors['sakura-surface'] || '#FFF7F9',
  'warm-50': '#fffaf8',
  'warm-100': '#fff2ec',
  'warm-200': '#fdf2f4',
  'charcoal-900': '#1f1a1d',
});

if (!shadows['sakura-soft']) shadows['sakura-soft'] = '0 10px 30px -10px rgba(217, 75, 104, 0.25)';
if (!shadows['sakura-glow']) shadows['sakura-glow'] = '0 0 25px rgba(217, 75, 104, 0.15)';
if (!shadows.xs) shadows.xs = '0 1px 2px rgba(45, 40, 42, 0.05)';
fonts.sans = ['Plus Jakarta Sans', 'Noto Sans JP', 'sans-serif'];
fonts.serif = ['Noto Serif JP', 'serif'];
fonts.jp = fonts.jp || ['Noto Sans JP', 'sans-serif'];
fonts.kanji = fonts.kanji || ['Noto Serif JP', 'serif'];

fs.mkdirSync(PAGES_DIR, { recursive: true });

for (const [file, name] of PAGES) {
  const html = fs.readFileSync(path.join(HTML_DIR, `${file}.html`), 'utf8');
  const { jsx, className, style } = bodyInnerAndClass(html);
  const scripts = extractScripts(html);
  const styleProp = style ? ` style=${cssToJs(style)}` : '';
  const scriptBlock = scripts.length
    ? `
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
${scripts.map((s) => s.split('\n').map((l) => '      ' + l).join('\n')).join('\n')}
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);
`
    : '';

  const imports = [];
  if (scriptBlock) imports.push("import { useEffect } from 'react';");

  const content = `${imports.length ? imports.join('\n') + '\n\n' : ''}export default function ${name}() {${scriptBlock}
  return (
    <div className=${JSON.stringify(className || '')}${styleProp} data-page="${name}">
${jsx}
    </div>
  );
}
`;
  fs.writeFileSync(path.join(PAGES_DIR, `${name}.jsx`), content);
  console.log('wrote', name, 'bytes', content.length);
}

const indexCss = `@import "tailwindcss";
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");

@theme {
  --font-sans: "Plus Jakarta Sans", "Noto Sans JP", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Noto Serif JP", ui-serif, serif;
${tokenCss(colors, shadows, fonts, spacing, radii, fontSizes)}
}

html, body, #root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: "Plus Jakarta Sans", "Noto Sans JP", sans-serif;
  background-color: #FAF7F5;
  color: #1f1a1d;
}

.material-symbols-outlined {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}

.material-symbols-outlined.fill-1 {
  font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24;
}

.rikipath-shell aside.fixed {
  top: 3.25rem !important;
  height: calc(100vh - 3.25rem) !important;
}

${extraCss.join('\n\n')}
`;

fs.writeFileSync(path.join(ROOT, 'src/index.css'), indexCss);
console.log('wrote index.css', indexCss.length);
