import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTypedReading, getAcceptedReadings, normalizeReading } from '../src/utils/srsTypedAnswer.js';

test('typed SRS accepts Kana, Katakana and Romaji but rejects wrong or empty answers', () => {
  const card = { contentType: 'Kanji', reading: 'スイ; みず' };
  for (const answer of ['スイ', 'すい', ' SUI ', 'みず', 'mizu']) assert.equal(checkTypedReading(card, answer).correct, true);
  for (const answer of ['', ' ', '水', 'nước', 'miso']) assert.equal(checkTypedReading(card, answer).correct, false);
});

test('normalization preserves small kana and long vowels and handles Japanese nasal input', () => {
  assert.equal(normalizeReading('gakkou'), 'がっこう');
  assert.equal(normalizeReading("kin'youbi"), 'きんようび');
  assert.equal(normalizeReading('nihonn'), 'にほん');
  assert.equal(normalizeReading('ｶﾀｶﾅ'), 'かたかな');
  assert.equal(checkTypedReading({ reading: 'きょう' }, 'きよう').correct, false);
  assert.equal(checkTypedReading({ reading: 'こう' }, 'こ').correct, false);
});

test('grammar, missing and annotated readings fall back to self assessment', () => {
  assert.deepEqual(getAcceptedReadings({ contentType: 'Grammar', reading: 'ている' }), []);
  assert.deepEqual(getAcceptedReadings({ reading: null }), []);
  assert.deepEqual(getAcceptedReadings({ reading: 'see note (special reading)' }), []);
  assert.deepEqual(getAcceptedReadings({ reading: 'ニチ、ジツ' }), ['にち', 'じつ']);
});
