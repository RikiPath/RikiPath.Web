import fs from 'fs';
import path from 'path';

const files = [
  'ConsultationQueue.jsx',
  'BookingSchedule.jsx',
  'ConsultationPayment.jsx',
  'ConsultantOverview.jsx',
];

for (const file of files) {
  const p = path.join('d:/RikiPath/src/pages', file);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  // Fix bare < and > inside JSX text nodes between tags (not part of tags)
  // Pattern: >text with < digits or words</
  s = s.replace(/>([^<{]*?)<(\s*\d)/g, (m, a, b) => `>{${JSON.stringify(a + '<' + b.slice(1).replace(/^\s*/, (x)=> ' ' + x.trimStart ? b : b))}}`);
  // simpler targeted fixes for common patterns
  s = s.replace(/Khẩn cấp < 2 giờ/g, '{"Khẩn cấp < 2 giờ"}');
  s = s.replace(/>([^<{}]*?)\s<\s(\d+[^<]*?)</g, (m, pre, rest) => `>{${JSON.stringify(pre + ' < ' + rest)}}<`);
  // Fix cases already double-wrapped poorly
  s = s.replace(/>\{\s*"([^"]*)"\s*\}\{\s*"([^"]*)"\s*\}</g, '>$1$2<');
  fs.writeFileSync(p, s);
  console.log(file, before === s ? 'no change' : 'fixed');
}

// More robust: scan for invalid JSX < in text
for (const file of files) {
  const p = path.join('d:/RikiPath/src/pages', file);
  const s = fs.readFileSync(p, 'utf8');
  const lines = s.split(/\n/);
  lines.forEach((line, i) => {
    // find < that is not start of tag and not </ and not <= and not in string
    if (/[^\s"'=\/\{]<(?![\/a-zA-Z!?:])/.test(line) && !line.includes('{"') ) {
      // potential issue
      if (line.includes('< ') || /[a-záàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]\s*</i.test(line)) {
        console.log('suspect', file + ':' + (i+1), line.trim().slice(0, 120));
      }
    }
  });
}
