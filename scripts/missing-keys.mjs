import fs from 'fs';

const rest = fs.readFileSync('src/i18n/learnerRest.js', 'utf8');
const locale = fs.readFileSync('src/i18n/locale.js', 'utf8');
const keys = new Set();
for (const src of [rest, locale]) {
  for (const m of src.matchAll(/^\s+'((?:\\'|[^'])+)':/gm)) {
    keys.add(m[1].replace(/\\'/g, "'"));
  }
}
const vi = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;
const files = process.argv.slice(2);
const missing = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(['"`])((?:\\.|(?!\1).){2,220})\1/g)) {
    const s = m[2].replace(/\\n/g, '\n').replace(/\\'/g, "'");
    if (!vi.test(s)) continue;
    if (s.includes('${')) continue;
    if (keys.has(s.trim())) continue;
    const t = s.trim();
    if (!missing.has(t)) missing.set(t, file);
  }
}
for (const [s, file] of [...missing.entries()].sort((a, b) => a[0].length - b[0].length)) {
  console.log(JSON.stringify(s) + '  // ' + file.split('/').pop());
}
console.error('missing', missing.size, 'keys', keys.size);
