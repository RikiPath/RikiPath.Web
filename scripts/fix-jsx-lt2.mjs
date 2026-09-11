import fs from 'fs';
import path from 'path';

const files = [
  'ConsultationQueue.jsx',
  'BookingSchedule.jsx',
  'ConsultationPayment.jsx',
  'ConsultantOverview.jsx',
];

for (const f of files) {
  const p = path.join('d:/RikiPath/src/pages', f);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  s = s.replaceAll('Khẩn cấp < 2 giờ', '{"Khẩn cấp < 2 giờ"}');
  s = s.replace(/>([^<>{\n]*?)<(\s*\d[^<>{\n]*?)</g, (m, a, b) => '>' + JSON.stringify(a + '<' + b) + '<');
  // also > and < comparisons like N3 > N4 rare
  s = s.replace(/>([^<>{\n]*?)\s>\s(\d[^<>{\n]*?)</g, (m, a, b) => '>' + JSON.stringify(a + ' > ' + b) + '<');
  fs.writeFileSync(p, s);
  console.log(f, before === s ? 'ok' : 'fixed');
}
