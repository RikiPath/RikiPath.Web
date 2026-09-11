import fs from 'fs';

function stripBom(s) {
  return s.replace(/^\uFEFF/, '');
}

const raw = stripBom(fs.readFileSync('d:/RikiPath/_screens.json', 'utf8'));
const data = JSON.parse(raw);
const text = data?.content?.[0]?.text;
if (!text) {
  console.log('keys', Object.keys(data));
  console.log(JSON.stringify(data).slice(0, 500));
  process.exit(0);
}
const parsed = JSON.parse(text);
const screens = parsed.screens || parsed;
console.log('type', Array.isArray(screens) ? 'array' : typeof screens, Array.isArray(screens) ? screens.length : '');
if (Array.isArray(screens)) {
  for (const s of screens) {
    const id = String(s.name || s.id || '').split('/').pop();
    console.log(`${id}\t${s.title || ''}`);
  }
} else {
  console.log(JSON.stringify(parsed).slice(0, 2000));
}
