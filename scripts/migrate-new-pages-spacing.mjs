import fs from 'fs';
import path from 'path';

const files = [
  'ConsultationQueue.jsx',
  'BookingSchedule.jsx',
  'ConsultationPayment.jsx',
  'ConsultantOverview.jsx',
];

const map = { xs: 'space-xxs', sm: 'space-sm', md: 'space-md', lg: 'space-lg', xl: 'space-xl' };
const prefixes = 'p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y';

for (const file of files) {
  const p = path.join('d:/RikiPath/src/pages', file);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  for (const k of ['xl', 'lg', 'md', 'sm', 'xs']) {
    const v = map[k];
    const re = new RegExp(`(?<=(?:^|[\\s"'\\\`:]))(${prefixes})-${k}(?=(?:$|[\\s"'\\\`]))`, 'g');
    s = s.replace(re, `$1-${v}`);
  }
  // dedupe min-h-screen
  s = s.replace(/min-h-screen min-h-screen/g, 'min-h-screen');
  fs.writeFileSync(p, s);
  console.log(file, before === s ? 'unchanged' : 'migrated');
}
