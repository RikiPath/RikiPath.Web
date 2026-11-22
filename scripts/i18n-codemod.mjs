// i18n codemod for RikiPath.Web (see docs/standards/UX_WRITING_AND_I18N.md).
//   node scripts/i18n-codemod.mjs extract <files…>   → JSON of Vietnamese strings without a JA entry (stdout)
//   node scripts/i18n-codemod.mjs apply   <files…>   → wrap display strings with tr()/translateText() in place
//
// What "apply" wraps (only strings containing Vietnamese letters):
//   • JSX text                                  <p>Xin chào</p>          → <p>{tr('Xin chào')}</p>
//   • string attributes except data/logic ones  title="Đóng"             → title={tr('Đóng')}
//   • string literals that are rendered values  {ok ? 'Có' : 'Không'}   → {ok ? tr('Có') : tr('Không')}
//   • display members rendered in JSX           {item.label}             → {tr(item.label)}   (tr is a no-op for non-strings)
// It never touches comparisons, object keys, imports, call arguments of non-display functions, or template literals
// with expressions (those are listed by `extract` for manual trf()).
// Scope: components (Capitalised functions / use* hooks) get `const { tr } = useLocale();` so they re-render on a locale
// switch; JSX outside a component uses `translateText` (evaluated during the caller's render).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const MagicString = require('magic-string');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const SKIP_ATTR = new Set(['className', 'key', 'to', 'href', 'id', 'type', 'name', 'value', 'defaultValue', 'role', 'lang', 'htmlFor',
  'src', 'style', 'method', 'action', 'accept', 'autoComplete', 'pattern', 'inputMode', 'form', 'target', 'rel', 'variant', 'tone',
  'size', 'icon', 'as', 'context', 'preset', 'align', 'side', 'mode', 'status', 'kind', 'path', 'element', 'testId', 'data-testid']);
const DISPLAY_MEMBERS = new Set(['label', 'title', 'text', 'hint', 'description', 'desc', 'note', 'placeholder', 'subtitle', 'caption',
  'heading', 'statusLabel', 'shortLabel', 'helper', 'helperText', 'emptyTitle', 'emptyDescription', 'tooltip', 'cta', 'ctaLabel',
  'actionLabel', 'badge', 'eyebrow', 'summary', 'lead', 'intro', 'question', 'answer', 'tip', 'reason', 'message', 'errorMessage',
  'hrefLabel', 'unit', 'name_vi', 'labelVi', 'detailTime']);
const NO_WRAP_CALLEES = new Set(['tr', 'trf', 't', 'translateText', 'translateTemplate', 'console', 'require', 'useQuery', 'navigate',
  'setSearchParams', 'Error', 'RegExp', 'includes', 'startsWith', 'endsWith', 'indexOf', 'split', 'replace', 'match', 'test',
  'localeCompare', 'get', 'set', 'has', 'append', 'sort', 'filter', 'find', 'some', 'every']);

function loadKeys() {
  const keys = new Set();
  const re = /^\s*(['"])((?:(?!\1)[^\\]|\\.)+)\1\s*:/gm;
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const loc = read('src/locales/locale.js');
  const ja = loc.indexOf('  ja: {', loc.indexOf('const ui'));
  for (const m of loc.slice(ja, loc.indexOf('  en: {', ja)).matchAll(re)) keys.add(unescape(m[2]));
  for (const m of read('src/locales/learnerRest.js').matchAll(re)) keys.add(unescape(m[2]));
  for (const f of fs.readdirSync(path.join(root, 'src/locales/ja'))) {
    if (f === 'index.js') continue;
    for (const m of read(`src/locales/ja/${f}`).matchAll(re)) keys.add(unescape(m[2]));
  }
  return keys;
}
const unescape = (s) => s.replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');
const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const normText = (raw) => raw.replace(/\s+/g, ' ').trim();

function parseFile(code) {
  return parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: false });
}

function isComponentFn(p) {
  const n = p.node;
  let name = n.id?.name;
  if (!name && p.parentPath.isVariableDeclarator()) name = p.parentPath.node.id.name;
  if (!name && p.parentPath.isCallExpression()) {
    // memo(function X() {}) / forwardRef((props) => …) assigned to a Capitalised const
    const decl = p.parentPath.parentPath;
    if (decl?.isVariableDeclarator()) name = decl.node.id.name;
    if (n.id?.name) name = n.id.name;
  }
  if (!name && p.parentPath.isExportDefaultDeclaration()) return true;
  return Boolean(name && (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name)));
}

function owningComponent(p) {
  let cur = p.getFunctionParent();
  while (cur) {
    if (isComponentFn(cur)) return cur;
    cur = cur.getFunctionParent();
  }
  return null;
}

/** Is a string literal in a "rendered value" position (not logic)? */
function isRenderedLiteral(p) {
  const parent = p.parentPath;
  if (!parent) return false;
  if (parent.isJSXExpressionContainer()) return true;
  if (parent.isConditionalExpression() && p.key !== 'test') return isRenderedValue(parent);
  if (parent.isLogicalExpression() && p.key === 'right') return isRenderedValue(parent);
  return false;
}
function isRenderedValue(p) {
  const parent = p.parentPath;
  if (!parent) return false;
  if (parent.isJSXExpressionContainer()) {
    const attr = parent.parentPath;
    if (attr.isJSXAttribute()) return !SKIP_ATTR.has(attr.node.name.name) && !String(attr.node.name.name).startsWith('on');
    return true;
  }
  if ((parent.isConditionalExpression() && p.key !== 'test') || (parent.isLogicalExpression() && p.key === 'right')) return isRenderedValue(parent);
  return false;
}
/** Template literal whose value is shown to people (not sent to the API, not a key/URL). */
const DISPLAY_CALLEE = /^(toast|notify|success|error|warning|info|loading|showToast|pushToast|confirm|setError|setMessage|setNotice|setStatus|setInfo|setWarning|alert|announce|fail|reject)$/i;
const DISPLAY_PROP = new Set([...DISPLAY_MEMBERS, 'detail', 'value', 'body', 'content', 'aria-label', 'ariaLabel']);
function isDisplayTemplate(p) {
  if (isRenderedLiteral(p)) return true;
  const parent = p.parentPath;
  if (parent.isJSXExpressionContainer() && parent.parentPath.isJSXAttribute()) {
    const name = String(parent.parentPath.node.name.name);
    return !SKIP_ATTR.has(name) && !name.startsWith('on') && !name.startsWith('data-') && name !== 'key';
  }
  if (parent.isCallExpression() && p.listKey === 'arguments') {
    const callee = parent.node.callee;
    const name = callee.type === 'MemberExpression' ? callee.property.name : callee.name;
    const obj = callee.type === 'MemberExpression' ? callee.object.name : '';
    return DISPLAY_CALLEE.test(name || '') || /^(toast|notify|feedback)$/i.test(obj || '');
  }
  if (parent.isObjectProperty() && p.key === 'value') {
    const key = parent.node.key.name || parent.node.key.value;
    return DISPLAY_PROP.has(key) && key !== 'value' && key !== 'body' && key !== 'content';
  }
  if (parent.isNewExpression() && parent.node.callee.name === 'Error') return true; // thrown messages are shown via error states
  return false;
}

function insideTranslateCall(p) {
  return Boolean(p.findParent((q) => q.isCallExpression() && ['tr', 'trf', 'translateText', 'translateTemplate', 't'].includes(q.node.callee.name)));
}

function processFile(file, mode, keys, out) {
  const abs = path.resolve(root, file);
  const code = fs.readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parseFile(code);
  } catch (e) {
    out.errors.push(`${file}: ${e.message}`);
    return;
  }
  const s = new MagicString(code);
  const needHook = new Set(); // component function nodes
  const needTrf = new Set(); // component function nodes that use trf
  let needTranslateText = false;
  let needTranslateTemplate = false;
  const strings = new Set();
  const templates = [];
  const handled = []; // [start, end] ranges already rewritten as one trf() call
  const inHandled = (n) => handled.some(([a, b]) => n.start >= a && n.end <= b);
  const PRIMITIVE_EXPR = new Set(['Identifier', 'MemberExpression', 'OptionalMemberExpression', 'CallExpression', 'OptionalCallExpression',
    'BinaryExpression', 'NumericLiteral', 'TemplateLiteral', 'StringLiteral', 'UnaryExpression']);
  const ELEMENTISH = /icon|children|node|element|extra|content|badge|button|link|avatar|render|slot/i;

  // <p>Khai giảng: {a} · Kết thúc: {b}</p> → <p>{trf('Khai giảng: {0} · Kết thúc: {1}', { 0: a, 1: b })}</p>
  const tryTemplate = (p) => {
    const kids = p.node.children;
    if (!kids.length) return false;
    if (!kids.some((k) => k.type === 'JSXText' && VI.test(k.value))) return false;
    if (!kids.some((k) => k.type === 'JSXExpressionContainer')) return false;
    let tpl = '';
    const exprs = [];
    for (const k of kids) {
      if (k.type === 'JSXText') { tpl += k.value.replace(/\s+/g, ' '); continue; }
      if (k.type !== 'JSXExpressionContainer') return false; // nested elements → leave to per-text wrapping
      const e = k.expression;
      if (e.type === 'JSXEmptyExpression') return false;
      if (e.type === 'StringLiteral' && !VI.test(e.value)) { tpl += e.value; continue; }
      if (!PRIMITIVE_EXPR.has(e.type)) return false;
      const srcExpr = code.slice(e.start, e.end);
      if (e.type === 'Identifier' && ELEMENTISH.test(e.name)) return false;
      if (/tr\(|trf\(|<[A-Za-z]/.test(srcExpr)) return false;
      tpl += `{${exprs.length}}`;
      exprs.push(srcExpr);
    }
    tpl = tpl.trim();
    if (!VI.test(tpl) || !exprs.length || tpl.includes("'") && false) return false;
    strings.add(tpl);
    if (mode !== 'apply') return true;
    const first = kids[0];
    const last = kids[kids.length - 1];
    const comp = owningComponent(p);
    const fn = comp ? 'trf' : 'translateTemplate';
    if (comp) { needHook.add(comp); needTrf.add(comp); } else needTranslateTemplate = true;
    const lead = first.type === 'JSXText' ? first.value.match(/^\s*/)[0] : '';
    const trail = last.type === 'JSXText' ? last.value.match(/\s*$/)[0] : '';
    const startPos = first.start + (lead.includes('\n') ? lead.length : 0);
    const endPos = last.end - (trail.includes('\n') ? trail.length : 0);
    s.overwrite(startPos, endPos, `{${fn}(${quote(tpl)}, { ${exprs.map((x, i) => `${i}: ${x}`).join(', ')} })}`);
    handled.push([first.start, last.end]);
    return true;
  };

  const wrapExpr = (p, start, end, literal) => {
    const comp = owningComponent(p);
    const fn = comp ? 'tr' : 'translateText';
    if (comp) needHook.add(comp); else needTranslateText = true;
    if (literal !== undefined) s.overwrite(start, end, `${fn}(${quote(literal)})`);
    else { s.appendLeft(start, `${fn}(`); s.prependRight(end, ')'); }
  };

  traverse(ast, {
    ImportDeclaration(p) { p.skip(); },
    JSXElement(p) { if (!inHandled(p.node)) tryTemplate(p); },
    JSXFragment(p) { if (!inHandled(p.node)) tryTemplate(p); },
    JSXText(p) {
      if (inHandled(p.node)) return;
      const raw = p.node.value;
      if (!VI.test(raw)) return;
      const text = normText(raw);
      if (!text) return;
      strings.add(text);
      if (mode !== 'apply') return;
      const lead = raw.match(/^\s*/)[0];
      const trail = raw.match(/\s*$/)[0];
      const comp = owningComponent(p);
      const fn = comp ? 'tr' : 'translateText';
      if (comp) needHook.add(comp); else needTranslateText = true;
      // keep a space between adjacent inline elements/expressions when the source had one on the same line
      const pre = lead && !lead.includes('\n') ? "{' '}" : '';
      const post = trail && !trail.includes('\n') ? "{' '}" : '';
      s.overwrite(p.node.start, p.node.end, `${lead.includes('\n') ? lead : ''}${pre}{${fn}(${quote(text)})}${post}${trail.includes('\n') ? trail : ''}`);
    },
    JSXAttribute(p) {
      if (inHandled(p.node)) return;
      const name = typeof p.node.name.name === 'string' ? p.node.name.name : '';
      const v = p.node.value;
      if (!v || v.type !== 'StringLiteral' || !VI.test(v.value)) return;
      if (SKIP_ATTR.has(name) || name.startsWith('data-') || name.startsWith('on')) return;
      strings.add(v.value);
      if (mode !== 'apply') return;
      const comp = owningComponent(p);
      const fn = comp ? 'tr' : 'translateText';
      if (comp) needHook.add(comp); else needTranslateText = true;
      s.overwrite(v.start, v.end, `{${fn}(${quote(v.value)})}`);
    },
    StringLiteral(p) {
      if (!VI.test(p.node.value) || inHandled(p.node)) return;
      if (p.parentPath.isJSXAttribute() || p.parentPath.isImportDeclaration() || p.parentPath.isObjectProperty({ key: p.node })) return;
      strings.add(p.node.value);
      if (mode !== 'apply' || insideTranslateCall(p) || !isRenderedLiteral(p)) return;
      wrapExpr(p, p.node.start, p.node.end, p.node.value);
    },
    TemplateLiteral(p) {
      const raw = p.node.quasis.map((q) => q.value.cooked).join('{…}');
      if (!VI.test(raw)) return;
      if (p.node.expressions.length === 0) {
        strings.add(raw);
        if (mode === 'apply' && !insideTranslateCall(p) && isRenderedLiteral(p)) wrapExpr(p, p.node.start, p.node.end, raw);
        return;
      }
      if (p.parentPath.isTaggedTemplateExpression() || insideTranslateCall(p)) return;
      if (p.findParent((q) => q.isTemplateLiteral())) return; // nested: travels inside the outer template's placeholder
      // `Buổi ${n}: ${x}` → 'Buổi {0}: {1}' — the JA entry reorders placeholders freely.
      const tpl = p.node.quasis.map((q, i) => q.value.cooked + (i < p.node.expressions.length ? `{${i}}` : '')).join('');
      if ((mode === 'templates' && isDisplayTemplate(p)) || mode === 'templates-all') {
        strings.add(tpl);
        const comp = owningComponent(p);
        const fn = comp ? 'trf' : 'translateTemplate';
        if (comp) { needHook.add(comp); needTrf.add(comp); } else needTranslateTemplate = true;
        const args = p.node.expressions.map((e, i) => `${i}: ${code.slice(e.start, e.end)}`).join(', ');
        s.overwrite(p.node.start, p.node.end, `${fn}(${quote(tpl)}, { ${args} })`);
        return;
      }
      if (mode === 'extract' && isDisplayTemplate(p)) strings.add(tpl);
      templates.push({ file, line: p.node.loc.start.line, text: raw.slice(0, 120) });
    },
    Identifier(p) {
      if (mode !== 'apply' || inHandled(p.node) || !DISPLAY_MEMBERS.has(p.node.name)) return;
      if (!p.parentPath.isJSXExpressionContainer() || p.parentPath.parentPath.isJSXAttribute()) return;
      wrapExpr(p, p.node.start, p.node.end);
    },
    MemberExpression(p) {
      if (mode !== 'apply' || inHandled(p.node)) return;
      const prop = p.node.property;
      if (p.node.computed || prop.type !== 'Identifier' || !DISPLAY_MEMBERS.has(prop.name)) return;
      if (!p.parentPath.isJSXExpressionContainer() || p.parentPath.parentPath.isJSXAttribute() && SKIP_ATTR.has(p.parentPath.parentPath.node.name.name)) return;
      if (p.parentPath.parentPath.isJSXAttribute() && String(p.parentPath.parentPath.node.name.name).startsWith('on')) return;
      if (insideTranslateCall(p)) return;
      wrapExpr(p, p.node.start, p.node.end);
    },
  });

  for (const t of strings) if (!keys.has(t)) out.missing.add(t);
  out.templates.push(...templates);
  if (mode !== 'apply' && mode !== 'templates' && mode !== 'templates-all') return;

  const changed = needHook.size > 0 || needTranslateText || needTranslateTemplate;
  for (const comp of needHook) {
    const body = comp.node.body;
    // Never redeclare: skip names already bound in the component (props such as `{ tr }`, earlier destructuring, …).
    const wanted = (needTrf.has(comp) ? ['tr', 'trf'] : ['tr']).filter((w) => !comp.scope.hasOwnBinding(w));
    if (!wanted.length) continue;
    if (body.type === 'BlockStatement') {
      const src = code.slice(body.start, body.end);
      const existing = src.match(/const\s*\{([^}]*)\}\s*=\s*useLocale\(\)/);
      if (existing) {
        const have = existing[1].split(',').map((x) => x.trim().split(':')[0].trim());
        const add = wanted.filter((w) => !have.includes(w));
        if (!add.length) continue;
        const at = body.start + src.indexOf(existing[0]) + existing[0].indexOf('{') + 1;
        s.appendLeft(at, ` ${add.join(', ')},`);
      } else s.appendLeft(body.start + 1, `\n  const { ${wanted.join(', ')} } = useLocale();`);
    } else {
      s.appendLeft(body.start, `{\n  const { ${wanted.join(', ')} } = useLocale();\n  return (`);
      s.prependRight(body.end, ');\n}');
    }
  }
  if (!changed) return;
  let header = '';
  const hasUseLocale = /import\s*\{[^}]*\buseLocale\b[^}]*\}\s*from\s*'@\/locales\/locale\.js'/.test(code);
  const hasTT = /import\s*\{[^}]*\btranslateText\b[^}]*\}\s*from\s*'@\/locales\/locale\.js'/.test(code);
  const hasTTpl = /import\s*\{[^}]*\btranslateTemplate\b[^}]*\}\s*from\s*'@\/locales\/locale\.js'/.test(code);
  const wantTTpl = needTranslateTemplate && !hasTTpl;
  const localeImport = code.match(/import\s*\{([^}]*)\}\s*from\s*'@\/locales\/locale\.js';?/);
  const wantHook = needHook.size > 0 && !hasUseLocale;
  const wantTT = needTranslateText && !hasTT;
  if (localeImport && (wantHook || wantTT || wantTTpl)) {
    const names = localeImport[1].split(',').map((x) => x.trim()).filter(Boolean);
    if (wantHook) names.push('useLocale');
    if (wantTT) names.push('translateText');
    if (wantTTpl) names.push('translateTemplate');
    s.overwrite(localeImport.index, localeImport.index + localeImport[0].length, `import { ${names.join(', ')} } from '@/locales/locale.js';`);
  } else if (wantHook || wantTT || wantTTpl) {
    header = `import { ${[wantHook && 'useLocale', wantTT && 'translateText', wantTTpl && 'translateTemplate'].filter(Boolean).join(', ')} } from '@/locales/locale.js';\n`;
    const imports = ast.program.body.filter((n) => n.type === 'ImportDeclaration');
    const last = imports[imports.length - 1];
    if (last) s.appendRight(last.end, `\n${header.trimEnd()}`); else s.prepend(header);
  }
  fs.writeFileSync(abs, s.toString());
  out.changed.push(file);
}

const [mode, ...files] = process.argv.slice(2);
const out = { missing: new Set(), templates: [], changed: [], errors: [] };
const keys = loadKeys();
for (const f of files) processFile(f, mode, keys, out);
if (mode === 'extract') {
  console.log(JSON.stringify({ missing: [...out.missing], templates: out.templates, errors: out.errors }, null, 1));
} else {
  console.log(`changed ${out.changed.length} files; errors ${out.errors.length}`);
  for (const e of out.errors) console.log('  ', e);
}
