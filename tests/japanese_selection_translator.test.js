import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  MAX_TRANSLATION_TEXT_LENGTH,
  sanitizeTranslationText,
  validateJapaneseSelection,
} from '../src/utils/japaneseTextValidator.js';
import { isNotebookCaptureSupportedOnPath } from '../src/features/notebook/utils/notebookModel.js';
import { mapTranslationError } from '../src/features/notebook/components/translationErrorMap.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const trIdentity = (s) => s;

describe('JapaneseTextValidator — Strict Japanese-Only Selection Validation', () => {
  it('accepts single Kanji, Hiragana words, Katakana, Half-width Katakana, full sentences, multi-line & mixed text', () => {
    for (const sample of ['駅', '水', '本', '山']) {
      const res = validateJapaneseSelection(sample);
      assert.equal(res.valid, true, `Single Kanji ${sample} must be valid`);
      assert.equal(res.isSingleKanji, true);
    }

    for (const sample of [
      '食べる',
      'ありがとう',
      'コンピューター',
      'ｶﾀｶﾅ',
      '日本語',
      '日本語を勉強しています。',
      '日本語を勉強しています。\n毎日駅まで電車で行きます。',
      '駅まで「電車」で、20分かかります！',
      'JLPT N5の文法を復習する',
    ]) {
      const res = validateJapaneseSelection(sample);
      assert.equal(res.valid, true, `Valid Japanese "${sample}" must pass (got ${res.reason})`);
    }
  });

  it('rejects Vietnamese (including "Thẻ của tôi"), English, Simplified Chinese, whitespace, symbols, URLs, emails, and isolated kana', () => {
    for (const sample of [
      'Thẻ của tôi',
      'Bộ đề luyện tập JLPT',
      'Hello world',
      'Welcome to RikiPath',
      '123456',
      '🎉✨🚀',
      '   \n\t  ',
      'https://rikipath.com/lessons/1',
      'learner@rikipath.local',
      '这是一个中文句子，我们在学习中文。',
      '请打开我的车门',
    ]) {
      const res = validateJapaneseSelection(sample);
      assert.equal(res.valid, false, `Non-Japanese "${sample}" MUST be rejected`);
    }

    const singleHiragana = validateJapaneseSelection('あ');
    assert.equal(singleHiragana.valid, false);
    assert.equal(singleHiragana.reason, 'single-kana');

    const singleKatakana = validateJapaneseSelection('ア');
    assert.equal(singleKatakana.valid, false);
    assert.equal(singleKatakana.reason, 'single-kana');
  });

  it('sanitizes HTML tags & zero-width characters without losing Kanji/Kana and rejects over-limit (>500 chars) without truncating', () => {
    const cleaned = sanitizeTranslationText('駅まで <u>電車</u>\u200Bで 20ぷん <script>x</script> かかります。');
    assert.equal(cleaned, '駅まで 電車で 20ぷん x かかります。');

    const longJp = '日本語'.repeat(170); // 510 chars
    const tooLong = validateJapaneseSelection(longJp);
    assert.equal(tooLong.valid, false);
    assert.equal(tooLong.reason, 'too-long');
    assert.equal(tooLong.maxLength, MAX_TRANSLATION_TEXT_LENGTH);
    assert.equal(tooLong.text.length, 510, 'Must never silently truncate');
  });
});

describe('Translation Scope, Exam Anti-Cheating & Error Mapping', () => {
  it('blocks timed exams and active test attempts while allowing study materials and post-submission reviews', () => {
    assert.deepEqual(isNotebookCaptureSupportedOnPath('/placement/exam/'), {
      bubbleAllowed: false,
      selectionAllowed: false,
      reason: 'exam-policy',
    });
    assert.deepEqual(isNotebookCaptureSupportedOnPath('/mock-tests/attempt/52/'), {
      bubbleAllowed: false,
      selectionAllowed: false,
      reason: 'exam-policy',
    });
    assert.deepEqual(isNotebookCaptureSupportedOnPath('/practice-sets/attempt/50/'), {
      bubbleAllowed: false,
      selectionAllowed: false,
      reason: 'exam-policy',
    });

    assert.equal(isNotebookCaptureSupportedOnPath('/mock-tests/result/52/').selectionAllowed, true);
    assert.equal(isNotebookCaptureSupportedOnPath('/practice-sets/result/50/').selectionAllowed, true);
    assert.equal(isNotebookCaptureSupportedOnPath('/exam-result/').selectionAllowed, true);
    assert.equal(isNotebookCaptureSupportedOnPath('/grammar/').selectionAllowed, true);
    assert.equal(isNotebookCaptureSupportedOnPath('/daily-srs/').selectionAllowed, true);
  });

  it('maps contextual errors accurately and NEVER collapses into generic maintenance/overload message', () => {
    const tooLong = mapTranslationError({ data: { errorCode: 'TRANSLATION_TOO_LONG' }, status: 400 }, trIdentity);
    assert.equal(tooLong.retryable, false);
    assert.ok(tooLong.message.includes('500'));

    const rateLimit = mapTranslationError({ data: { errorCode: 'TRANSLATION_RATE_LIMITED' }, status: 429 }, trIdentity);
    assert.equal(rateLimit.retryable, true);
    assert.equal(rateLimit.message, 'Bạn đang dịch quá nhanh. Vui lòng thử lại sau.');

    const timeout = mapTranslationError({ data: { errorCode: 'TRANSLATION_TIMEOUT' }, status: 504 }, trIdentity);
    assert.equal(timeout.retryable, true);
    assert.equal(timeout.message, 'Bản dịch chưa được tải. Hãy thử lại.');

    const unavailable = mapTranslationError({ data: { errorCode: 'TRANSLATION_PROVIDER_UNAVAILABLE' }, status: 503 }, trIdentity);
    assert.equal(unavailable.retryable, true);
    assert.equal(unavailable.message.includes('bảo trì hoặc quá tải'), false);
  });

  it('enforces architecture rules across SelectionCaptureLayer, SelectionTranslatePopover, and ExamWorkspace', () => {
    const captureSrc = fs.readFileSync(path.join(ROOT, 'src/features/notebook/components/LearnerSelectionCaptureLayer.jsx'), 'utf8');
    const popoverSrc = fs.readFileSync(path.join(ROOT, 'src/features/notebook/components/SelectionTranslatePopover.jsx'), 'utf8');
    const examWsSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/ExamWorkspace.jsx'), 'utf8');

    assert.ok(captureSrc.includes('extractCleanSelectionText'), 'Uses Ruby-aware clean selection extraction');
    assert.ok(captureSrc.includes('validateJapaneseSelection'), 'Validates Japanese script before showing Translate button');
    assert.ok(captureSrc.includes('Dịch sang tiếng Việt'), 'Includes exact tooltip copy');
    assert.equal(popoverSrc.includes('HaruMascot'), false, 'No fox mascot in translation popover');
    assert.equal(popoverSrc.includes('Hệ thống đang bảo trì hoặc quá tải'), false, 'Never uses generic maintenance banner');
    assert.ok(examWsSrc.includes('data-exam-attempt-active'), 'ExamWorkspace stamps DOM anti-cheat guard');
  });
});
