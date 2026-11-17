import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/data/kanaStrokes.json', import.meta.url), 'utf8'));

test('stroke guide covers all 46 basic characters in each Kana alphabet', () => {
  const hiragana = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'];
  const katakana = [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'];
  for (const character of [...hiragana, ...katakana]) {
    assert.ok(data[character]?.length > 0, `Missing strokes for ${character}`);
    for (const stroke of data[character]) assert.match(stroke, /^M[\d.,\s-]+/);
  }
  assert.equal(Object.keys(data).length, 92);
  for (const [character, count] of [['あ', 3], ['ア', 2], ['き', 4], ['キ', 3], ['の', 1], ['ン', 2]]) {
    assert.equal(data[character].length, count);
  }
});
