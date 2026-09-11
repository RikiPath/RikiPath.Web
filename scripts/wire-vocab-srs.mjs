import fs from 'fs';

const p = 'd:/RikiPath/src/pages/VocabularyNotebook.jsx';
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('react-router-dom')) {
  s = "import { Link } from 'react-router-dom';\n" + s;
}
s = s.replace(
  /<button className="([^"]*)" id="btn-top-review">([\s\S]*?)<\/button>/,
  '<Link to="/daily-srs" className="$1" id="btn-top-review">$2</Link>'
);
fs.writeFileSync(p, s);
console.log('wired', s.includes('to="/daily-srs"'));
