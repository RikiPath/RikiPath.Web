import fs from 'fs';

const src = fs.readFileSync('d:/RikiPath/src/pages/Consultation.jsx', 'utf8');
const out = src
  .replace('function Consultation', 'function ConsultationHub')
  .replace('data-page="Consultation"', 'data-page="ConsultationHub"')
  .replaceAll('RikiPath Consultation', 'RikiPath Consultation Hub');
fs.writeFileSync('d:/RikiPath/src/pages/ConsultationHub.jsx', out);
console.log('ConsultationHub.jsx written', out.length);
