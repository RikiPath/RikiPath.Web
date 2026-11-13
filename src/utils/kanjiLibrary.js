export function normalizeKanjiSearch(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function filterKanjiLibrary(items, keyword) {
  const query = normalizeKanjiSearch(keyword);
  return items.filter(item => !query || [item.character, item.sinoVietnamese, item.meaning, item.onYomi, item.kunYomi]
    .some(value => normalizeKanjiSearch(value).includes(query)));
}

export function matchRecognizedKanji(items, characters) {
  return [...new Set(characters)].flatMap(character => items.filter(item => item.character === character));
}
