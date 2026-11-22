// Locale dictionary check (docs/standards/UX_WRITING_AND_I18N.md, rule 7).
//   node scripts/check-locales.mjs          → report
//   node scripts/check-locales.mjs --strict → exit 1 on missing JA or duplicate keys in src/locales/ja/
// Checks: every literal tr('…') / tr("…") / trf('…') in src has a Japanese entry; every navigation label has one;
// no key is defined in more than one src/locales/ja/*.js dictionary or duplicated against locale.js / learnerRest.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const locDir = path.join(src, 'locales');
const keyRe = /^\s*(['"])((?:(?!\1)[^\\]|\\.)+)\1\s*:/gm;
const callRe = /\btrf?\(\s*(['"])((?:(?!\1)[^\\]|\\.)+)\1\s*[,)]/g;

const owners = new Map();
function addKeys(text, label) {
  for (const m of text.matchAll(keyRe)) {
    if (!owners.has(m[2])) owners.set(m[2], []);
    owners.get(m[2]).push(label);
  }
}
const localeJs = fs.readFileSync(path.join(locDir, 'locale.js'), 'utf8');
const uiStart = localeJs.indexOf('const ui');
const jaStart = localeJs.indexOf('  ja: {', uiStart);
const enStart = localeJs.indexOf('  en: {', jaStart);
addKeys(localeJs.slice(jaStart, enStart), 'locale.js ui.ja');
addKeys(fs.readFileSync(path.join(locDir, 'learnerRest.js'), 'utf8'), 'learnerRest.js');
for (const f of fs.readdirSync(path.join(locDir, 'ja'))) {
  if (f !== 'index.js') addKeys(fs.readFileSync(path.join(locDir, 'ja', f), 'utf8'), `ja/${f}`);
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== locDir) walk(p); } else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(p);
  }
})(src);

const missing = new Map();
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(callRe)) {
    if (!owners.has(m[2]) && !missing.has(m[2])) missing.set(m[2], path.relative(root, f).replace(/\\/g, '/'));
  }
}
const navSrc = ['layouts/appNav.js', 'layouts/navConfig.js'].map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
for (const m of navSrc.matchAll(/(?:label|area|title):\s*'([^']+)'/g)) {
  if (!owners.has(m[1]) && !missing.has(m[1])) missing.set(m[1], 'layouts (navigation)');
}

const newDups = [...owners].filter(([, o]) => o.length > 1 && o.some((x) => x.startsWith('ja/')));
const legacyDups = [...owners].filter(([, o]) => o.length > 1 && !o.some((x) => x.startsWith('ja/')));

console.log(`JA keys: ${owners.size} · missing JA for tr/trf literals & nav labels: ${missing.size}`);
for (const [k, f] of missing) console.log(`  missing  ${JSON.stringify(k)}  (${f})`);
console.log(`duplicate keys involving src/locales/ja: ${newDups.length}`);
for (const [k, o] of newDups) console.log(`  dup      ${JSON.stringify(k)}  ${o.join(' + ')}`);
console.log(`legacy duplicates between locale.js and learnerRest.js (first match wins): ${legacyDups.length}`);
console.log('Note: dynamic tr(variable) calls are not covered; keep their source strings in constants and add JA entries.');

if (process.argv.includes('--strict') && (missing.size || newDups.length)) process.exit(1);
