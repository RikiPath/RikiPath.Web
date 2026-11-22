import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translateText, translateTemplate } from '@/locales/locale.js';

describe('Giáo viên display terminology', () => {
  it('keeps Vietnamese labels and translates legacy Japanese dictionary keys', () => {
    assert.equal(translateText('Học nhóm cùng Giáo viên', 'vi'), 'Học nhóm cùng Giáo viên');
    assert.match(translateText('Học nhóm cùng Giáo viên', 'ja'), /教師/);
    assert.doesNotMatch(translateText('Học nhóm cùng Giáo viên', 'ja'), /メンター|Giáo viên/);
    assert.match(translateText('Đã thêm giáo viên mới.', 'ja'), /教師/);
    assert.match(translateTemplate('Buổi {0} · {1} · Giáo viên #{2}', { 0: 1, 1: '11/19', 2: 7 }, 'ja'), /教師/);
  });
});
