import fs from 'fs';

const p = 'd:/RikiPath/src/pages/ConsultationQueue.jsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  /<(span|option|p|div|label|button|h[1-6]|td|th|li|a)([^>]*)>"([^"]*<[^"]*)"<\/\1>/g,
  '<$1$2>{"$3"}</$1>'
);

fs.writeFileSync(p, s);

const lines = s.split(/\n/);
lines.forEach((l, i) => {
  if (/>"[^"]*</.test(l)) {
    console.log((i + 1) + ':', l.trim().slice(0, 140));
  }
});
console.log('file length', s.length);
