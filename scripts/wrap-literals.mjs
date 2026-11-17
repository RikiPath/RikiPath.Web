import fs from 'fs';

const rest = fs.readFileSync('src/i18n/learnerRest.js', 'utf8');
const localeSrc = fs.readFileSync('src/i18n/locale.js', 'utf8');
const keys = new Set();
for (const src of [rest, localeSrc]) {
  for (const m of src.matchAll(/^\s+'((?:\\'|[^'])+)':/gm)) {
    keys.add(m[1].replace(/\\'/g, "'"));
  }
}

const files = process.argv.slice(2);
const sorted = [...keys].sort((a, b) => b.length - a.length);

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const hookAt = text.indexOf('useLocale()');
  if (hookAt < 0) {
    console.log(file, 'no hook');
    continue;
  }
  const head = text.slice(0, hookAt);
  let body = text.slice(hookAt);
  let count = 0;

  body = body.replace(/(\s)([A-Za-z][\w-]*)=(["'])([^"'\n]+)\3/g, (full, sp, name, q, val) => {
    if (!keys.has(val)) return full;
    count += 1;
    return `${sp}${name}={tr(${JSON.stringify(val)})}`;
  });

  body = body.replace(/(['"])([^'"\n]{1,400})\1/g, (full, q, inner, offset, whole) => {
    const value = inner.replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!keys.has(value)) return full;
    const before = whole.slice(Math.max(0, offset - 24), offset);
    if (/tr\(\s*$/.test(before)) return full;
    if (/[=!]==\s*$/.test(before)) return full;
    if (/setStatus\(\s*$/.test(before)) return full;
    if (/useState\(\s*$/.test(before)) return full;
    count += 1;
    return `tr(${JSON.stringify(value)})`;
  });

  body = body.replace(/\{"((?:\\.|[^"\\])*)"\}/g, (full, inner) => {
    const raw = inner.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    const flat = raw.replace(/\s+/g, ' ').trim();
    const key = keys.has(raw) ? raw : keys.has(flat) ? flat : null;
    if (!key) return full;
    count += 1;
    return `{tr(${JSON.stringify(key)})}`;
  });

  for (const key of sorted) {
    if (key.length < 2) continue;
    if (body.includes(`tr(${JSON.stringify(key)})`)) continue;
    const pattern = new RegExp(`>\\s*${escapeRe(key)}\\s*<`);
    if (!pattern.test(body)) continue;
    body = body.replace(new RegExp(pattern.source, 'g'), `>{tr(${JSON.stringify(key)})}<`);
    count += 1;
  }

  fs.writeFileSync(file, head + body);
  console.log(file, count);
}
