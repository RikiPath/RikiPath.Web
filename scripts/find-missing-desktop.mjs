import fs from 'fs';

const API_KEY = process.env.STITCH_API_KEY;
if (!API_KEY) {
  console.error('Missing STITCH_API_KEY env var');
  process.exit(1);
}

const headers = {
  'X-Goog-Api-Key': API_KEY,
  'Content-Type': 'application/json',
};

const body = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'list_screens',
    arguments: { projectId: '1305752429523066747' },
  },
});

const res = await fetch('https://stitch.googleapis.com/mcp', {
  method: 'POST',
  headers,
  body,
});
const data = await res.json();
const parsed = JSON.parse(data.result.content[0].text);
const screens = parsed.screens || [];

const already = {
  fcf969df153b4f79b1d334ca59b587ee: 'HomeLearner',
  '5f2ddfd2ade1435abcf03160a6f5063d': 'CourseDetail',
  b3ff423bf787451484323ac12f24a636: 'Auth',
  d2f52206246b42f68b71a9660e1e6002: 'CourseCatalog',
  de689f6040db4793892d4e09eb99307b: 'HomeLanding',
  ec2c503717fd450690fefec029587919: 'Register',
  '0906aa7deeef4c558543899e6c6f9c3d': 'ForgotPassword',
  '3ebad278385247858f2f34fce25e8a06': 'OnboardingSurvey',
  b8e677f79dae41079644baa2f0c2a5e7: 'Dashboard',
  '0cbda6e1549d471cace11aab27df1c0e': 'AICounselor',
  '30f4f278a1ef41b4b4ba49ab0d8e5960': 'LessonList',
  '8607a4bbb81440bca3bb9156c0dedfb0': 'SentenceStudio',
  '943bbf62671448048f6e24fea8456253': 'KanjiStudio',
  fc8e166fa35a4b87803b8cdf7a703c0e: 'RoadmapJLPT',
  '9196b53890af42a887271193fe19295b': 'ExamN3',
  '8bc6dd6da59343a4ac4aba5f9729ede1': 'Consultation',
  af6d9b41eaf14ecdb669fddb87cace28: 'VocabularyNotebook',
  a1433be5c3534ea298e6f6fe1e721ada: 'DailySRS',
  '59999b8080174d5497f8f92bf5ed67a9': 'ConsultationQueue',
  '5b7f5cdd6ba544a88431fb1e477f8e88': 'BookingSchedule',
  '7f8baf104d8044729bdda7ada2e24237': 'ConsultationPayment',
  '3a1859d8950a45389e4681b1bfb413ae': 'ConsultantOverview',
  // ConsultationHub used same ID as Consultation
};

function slugify(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

const desktop = screens.filter((s) => /Desktop|1440/i.test(s.title || ''));
const missing = [];
for (const s of desktop) {
  const id = String(s.name || '').split('/').pop();
  if (already[id]) continue;
  // also skip if Consultation hub duplicate
  missing.push({
    id,
    title: s.title,
    suggested: slugify(s.title.replace(/\(.*?\)/g, '').replace(/-|–/g, ' ')),
  });
}

console.log('Desktop total:', desktop.Count || desktop.length);
console.log('Already mapped:', Object.keys(already).length);
console.log('Missing desktop:', missing.length);
fs.writeFileSync(
  'd:/RikiPath/_missing_desktop.json',
  JSON.stringify(missing, null, 2),
  'utf8'
);
missing.forEach((m, i) => console.log(`${i + 1}. ${m.id}\t${m.suggested}\t${m.title}`));
