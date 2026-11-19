import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeContentVersionHash,
  isNotebookCaptureSupportedOnPath,
  matchHighlightAnchorInText,
  parseNotebookEntry,
  parseNotebookList,
  sanitizeNotebookText,
  serializeEntryNote,
  serializeNotebookList,
  suggestKindForSelection,
} from '@/features/notebook/utils/notebookModel.js';

describe('RikiPath Smart Notebook V6.5 — Model, Mobile Parity & Highlight Anchoring', () => {
  it('encodes Folder -> Note Page compatibly for Backend and Mobile', () => {
    const serialized = serializeNotebookList({
      title: 'Từ mới bài 3',
      folder: 'JLPT N4',
      summary: 'Tổng hợp từ và ngữ pháp quan trọng',
      body: '## Ngữ pháp\n- **てみる**: thử làm gì',
      tags: ['N4', 'Bai3'],
      favorite: true,
    });

    assert.equal(serialized.name, 'JLPT N4 :: Từ mới bài 3');
    const parsed = parseNotebookList({
      id: 42,
      name: serialized.name,
      description: serialized.description,
      entryCount: 5,
      createdAt: '2026-11-19T12:00:00Z',
    });

    assert.equal(parsed.id, 42);
    assert.equal(parsed.folder, 'JLPT N4');
    assert.equal(parsed.title, 'Từ mới bài 3');
    assert.equal(parsed.summary, 'Tổng hợp từ và ngữ pháp quan trọng');
    assert.equal(parsed.favorite, true);
    assert.deepEqual(parsed.tags, ['N4', 'Bai3']);
    assert.ok(parsed.body.includes('**てみる**'));
  });

  it('sanitizes XSS payloads and keeps plain Mobile entries compatible', () => {
    const clean = sanitizeNotebookText('<script>alert(1)</script>Lưu ý `勉強` onclick=hack() javascript:void(0)');
    assert.ok(!clean.includes('<script>'));
    assert.ok(!clean.includes('javascript:'));
    assert.ok(!clean.includes('onclick='));
    assert.ok(clean.includes('Lưu ý `勉強`'));

    const mobilePlainEntry = parseNotebookEntry({
      noteEntryId: 9,
      reviewCardId: 15,
      vocabularyId: 101,
      kanjiId: null,
      contentType: 'vocabulary',
      term: '勉強',
      reading: 'べんきょう',
      meaning: 'học tập',
      note: 'Từ Mobile ghi chú',
      addedAt: '2026-11-19T12:00:00Z',
    }, 42);

    assert.equal(mobilePlainEntry.kind, 'vocabulary');
    assert.equal(mobilePlainEntry.hasSrs, true);
    assert.equal(mobilePlainEntry.personalNote, 'Từ Mobile ghi chú');

    const webNote = serializeEntryNote({
      personalNote: 'Nhớ chia động từ nhóm 3',
      kind: 'highlight',
      color: 'amber',
      sourcePath: '/lesson-player/?lessonId=12',
      sourceTitle: 'Bài 3 - N4',
      contentId: 'lesson-12-content',
      contentTextForVersion: '',
      anchorPrefix: '私は毎日日本語を',
      anchorSuffix: 'します。',
    });

    const parsedWebEntry = parseNotebookEntry({
      noteEntryId: 10,
      reviewCardId: null,
      vocabularyId: null,
      kanjiId: null,
      contentType: 'manual',
      term: '勉強',
      meaning: 'Đoạn đánh dấu từ bài học',
      note: webNote,
    }, 42);

    assert.equal(parsedWebEntry.kind, 'highlight');
    assert.equal(parsedWebEntry.color, 'amber');
    assert.equal(parsedWebEntry.hasSrs, false);
    assert.equal(parsedWebEntry.sourcePath, '/lesson-player/?lessonId=12');
  });

  it('anchors highlights reliably and flags stale content versions when lesson text changes', () => {
    const original = '私は毎日日本語を勉強します。週末も友達と勉強します。';
    const hash = computeContentVersionHash(original);
    const entry = {
      term: '勉強',
      contentVersion: hash,
      anchorPrefix: '週末も友達と',
      anchorSuffix: 'します。',
    };

    const match1 = matchHighlightAnchorInText(original, entry);
    assert.equal(match1.matched, true);
    assert.equal(match1.staleVersion, false);
    assert.equal(original.slice(match1.index, match1.index + match1.length), '勉強');
    assert.ok(match1.index > original.indexOf('勉強')); // matched the 2nd occurrence precisely via prefix/suffix!

    const completelyChanged = '今日は図書館で本を読みます。';
    const miss = matchHighlightAnchorInText(completelyChanged, entry);
    assert.equal(miss.matched, false);
    assert.equal(miss.staleVersion, true);
  });

  it('suggests content kinds and strictly enforces exam policy restrictions', () => {
    assert.equal(suggestKindForSelection('学'), 'kanji');
    assert.equal(suggestKindForSelection('〜てみる'), 'grammar');
    assert.equal(suggestKindForSelection('勉強'), 'vocabulary');
    assert.equal(suggestKindForSelection('今日はいい天気ですね。明日も晴れるでしょう。'), 'highlight');

    assert.deepEqual(isNotebookCaptureSupportedOnPath('/lesson-player/'), {
      bubbleAllowed: true,
      selectionAllowed: true,
      reason: 'supported',
    });
    assert.deepEqual(isNotebookCaptureSupportedOnPath('/placement/exam/'), {
      bubbleAllowed: false,
      selectionAllowed: false,
      reason: 'exam-policy',
    });
    assert.deepEqual(isNotebookCaptureSupportedOnPath('/thi-thu/'), {
      bubbleAllowed: false,
      selectionAllowed: false,
      reason: 'exam-policy',
    });
  });
});
