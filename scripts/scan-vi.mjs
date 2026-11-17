import fs from 'fs';

const files = process.argv.slice(2);
const vi = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    if (!vi.test(line)) return;
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    if (/tr\(/.test(line) && !/['"`][^'"`]*[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệ]/.test(line.replace(/tr\([^)]*\)/g, ''))) {
      // line only has vi inside tr() — skip if no leftover vi
    }
    const stripped = line.replace(/tr\(\s*(['"`])(?:\\.|(?!\1).)*\1\s*\)/g, '');
    if (!vi.test(stripped)) return;
    hits.push(`${i + 1}: ${line.trim().slice(0, 180)}`);
  });
  if (hits.length) {
    console.log('\n== ' + file + ' ' + hits.length);
    hits.slice(0, 80).forEach((h) => console.log(h));
    if (hits.length > 80) console.log('... +' + (hits.length - 80));
  } else {
    console.log('\n== ' + file + ' clean');
  }
}
