import { romajiToHiragana } from './romaji.js';

export function normalizeReading(value = '') {
  let text = String(value).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '');
  text = text.replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60));
  // n' separates the nasal from a following vowel; terminal nn is another common IME spelling.
  text = text.replace(/n['’]/g, 'ん').replace(/nn(?=[aiueoy])/g, 'んn').replace(/nn$/, 'ん');
  return romajiToHiragana(text);
}

export function getAcceptedReadings(card) {
  const type = String(card?.contentType ?? '').toLowerCase();
  if (type === '2' || type === 'grammar') return [];
  return [...new Set(String(card?.reading ?? '').split(/[;；,、/|]/)
    .map(reading => normalizeReading(reading.replace(/[.・]/g, '')))
    .filter(reading => /^[ぁ-ゖー]+$/.test(reading)))];
}

export function checkTypedReading(card, answer) {
  const accepted = getAcceptedReadings(card);
  return { supported: accepted.length > 0, correct: Boolean(answer.trim()) && accepted.includes(normalizeReading(answer)) };
}
