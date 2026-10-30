import fs from 'fs';

const src = fs.readFileSync('src/i18n/learnerRest.js', 'utf8');
const keys = [...src.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1]);
const files = [
  'src/pages/learner/VocabularyNotebook.jsx',
  'src/pages/learner/KanjiNotebook.jsx',
  'src/pages/learner/LearnerEssayPage.jsx',
  'src/pages/learner/ExamN3.jsx',
  'src/pages/learner/ExamResult.jsx',
  'src/pages/learner/VocabWordDetail.jsx',
  'src/pages/learner/AIScoringResult.jsx',
  'src/pages/learner/SentenceStudio.jsx',
  'src/pages/learner/SpeakingPracticePage.jsx',
  'src/pages/learner/KanjiWritingPracticePage.jsx',
  'src/pages/consultation/ConsultationPayment.jsx',
  'src/pages/consultation/ConsultationReceipt.jsx',
  'src/pages/consultation/LocalCheckout.jsx',
  'src/pages/consultation/MentorPayments.jsx',
  'src/pages/consultation/MentorPrivateChat.jsx',
];
console.log('keys', keys.length, keys.includes('Luyện nói tiếng Nhật'), keys.includes('Sổ tay Hán tự'));
const sorted = keys.sort((a, b) => b.length - a.length);

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log('missing', file);
    continue;
  }
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes("from '../../i18n/locale.js'")) {
    text = text.replace(
      "import { LearnerShell } from '../../components/shells';",
      "import { LearnerShell } from '../../components/shells';\nimport { useLocale } from '../../i18n/locale.js';",
    );
  }
  if (!text.includes('useLocale()')) {
    text = text.replace(/(export default function \w+\([^)]*\) \{\r?\n)/, (match) => `${match}  const { tr } = useLocale();\n`);
  }
  let count = 0;
  for (const key of sorted) {
    if (key.length < 2) continue;
    const token = `tr('${key.replace(/'/g, "\\'")}')`;
    if (text.includes(token)) continue;
    const pattern = new RegExp(`>\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`);
    if (!pattern.test(text)) continue;
    text = text.replace(new RegExp(pattern.source, 'g'), `>{${token}}<`);
    count += 1;
  }
  fs.writeFileSync(file, text);
  console.log(file, count, text.includes('useLocale()'));
}
