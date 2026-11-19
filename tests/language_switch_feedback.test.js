import assert from 'node:assert/strict';
import { test } from 'node:test';
import { languageSwitchMessage } from '../src/components/brand/languageSwitchFeedback.js';

test('language switch confirmation uses the language before switching', () => {
  assert.equal(languageSwitchMessage('vi', 'ja'), 'Đã chuyển giao diện sang tiếng Nhật.');
  assert.equal(languageSwitchMessage('ja', 'vi'), '表示言語をベトナム語に切り替えました。');
  assert.equal(languageSwitchMessage('vi', 'vi'), '');
  assert.equal(languageSwitchMessage('ja', 'ja'), '');
});
