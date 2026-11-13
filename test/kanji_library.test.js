import test from 'node:test';
import assert from 'node:assert/strict';
import { filterKanjiLibrary, matchRecognizedKanji } from '../src/utils/kanjiLibrary.js';

const library = [
  { kanjiId: 1, character: '水', sinoVietnamese: 'Thủy', meaning: 'Nước', onYomi: 'スイ', kunYomi: 'みず' },
  { kanjiId: 2, character: '月', sinoVietnamese: 'Nguyệt', meaning: 'Mặt trăng' },
];

test('Kanji lookup supports accent-free Han Viet, meanings, readings and empty search', () => {
  for (const query of ['thuy', ' THỦY ', 'nuoc', '水', 'スイ', 'みず']) {
    assert.deepEqual(filterKanjiLibrary(library, query).map(x => x.kanjiId), [1]);
  }
  assert.equal(filterKanjiLibrary(library, '').length, 2);
  assert.equal(filterKanjiLibrary(library, 'không có').length, 0);
});

test('drawn candidates preserve recognition order, deduplicate and stay within learner library', () => {
  assert.deepEqual(matchRecognizedKanji(library, ['月', '未', '水', '月']).map(x => x.kanjiId), [2, 1]);
  assert.deepEqual(matchRecognizedKanji(library, []), []);
});
