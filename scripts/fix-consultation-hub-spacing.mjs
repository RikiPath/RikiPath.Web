import fs from 'fs';

const p = 'd:/RikiPath/src/pages/ConsultationHub.jsx';
let s = fs.readFileSync(p, 'utf8');
const map = { xs: 'space-xxs', sm: 'space-sm', md: 'space-md', lg: 'space-lg', xl: 'space-xl' };
const prefixes = 'p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y';
for (const k of ['xl', 'lg', 'md', 'sm', 'xs']) {
  const v = map[k];
  const re = new RegExp(`(?<=(?:^|[\\s"'\\\`:]))(${prefixes})-${k}(?=(?:$|[\\s"'\\\`]))`, 'g');
  s = s.replace(re, `$1-${v}`);
}
s = s.replace('overflow-x-hidden min-h-screen', 'overflow-x-hidden');
fs.writeFileSync(p, s);
console.log('done');
