import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeWritingScore,
  filterKanjiCatalog,
  filterKanjiLibrary,
  matchRecognizedKanji,
  mergeKanjiLibrary,
  parseJlptLevels,
  summarizeKanjiCatalog,
} from '@/features/kanji/utils/kanjiLibrary.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const library = [
  { kanjiId: 1, character: '水', sinoVietnamese: 'Thủy', meaning: 'Nước', onYomi: 'スイ', kunYomi: 'みず' },
  { kanjiId: 2, character: '月', sinoVietnamese: 'Nguyệt', meaning: 'Mặt trăng' },
];

test('Kanji lookup supports accent-free Han Viet, meanings, kana readings and empty search', () => {
  for (const query of ['thuy', ' THỦY ', 'nuoc', '水', 'スイ', 'すい', 'みず']) {
    assert.deepEqual(filterKanjiLibrary(library, query).map((x) => x.kanjiId), [1]);
  }
  assert.equal(filterKanjiLibrary(library, '').length, 2);
  assert.equal(filterKanjiLibrary(library, 'không có').length, 0);
});

test('drawn candidates preserve recognition order, deduplicate and stay within learner library', () => {
  assert.deepEqual(matchRecognizedKanji(library, ['月', '未', '水', '月']).map((x) => x.kanjiId), [2, 1]);
  assert.deepEqual(matchRecognizedKanji(library, []), []);
});

test('mergeKanjiLibrary builds default all-Kanji library across N5-N1 even with empty due/score queues', () => {
  const sharedBankItems = [
    { id: 10, character: '語', meaning: 'Ngôn ngữ', sinoVietnamese: 'Ngữ', onYomi: 'ゴ', kunYomi: 'かた.る', strokeCount: 14, jlptLevelName: 'N4' },
    { id: 4, character: '山', meaning: 'Núi', sinoVietnamese: 'Sơn', onYomi: 'サン', kunYomi: 'やま', strokeCount: 3, jlptLevelName: 'N5' },
    { id: 2, character: '人', meaning: 'Người', sinoVietnamese: 'Nhân', onYomi: 'ジン', kunYomi: 'ひと', strokeCount: 2, jlptLevelName: 'N5' },
    { id: 4, character: '山', meaning: 'Núi', sinoVietnamese: 'Sơn', onYomi: 'サン', kunYomi: 'やま', strokeCount: 3, jlptLevelName: 'N5' },
  ];
  const mergedNoProgress = mergeKanjiLibrary(sharedBankItems, [], []);
  assert.deepEqual(mergedNoProgress.map((x) => x.character), ['人', '山', '語']);
  assert.equal(mergedNoProgress.every((x) => !x.practiced && !x.isDueForWriting), true);

  const scores = [{ kanjiId: 4, score: 90, correctStrokeCount: 3, totalStrokeCount: 3, practiceMode: 'guided' }];
  const due = [{ kanjiId: 10, isNew: false, character: '語', meaning: 'Ngôn ngữ', strokeCount: 14 }];
  const mergedWithProgress = mergeKanjiLibrary(sharedBankItems, scores, due);

  const yama = mergedWithProgress.find((x) => x.kanjiId === 4);
  assert.equal(yama.practiced, true);
  assert.equal(yama.mastered, true);
  assert.equal(yama.writingScore, 90);

  const go = mergedWithProgress.find((x) => x.kanjiId === 10);
  assert.equal(go.isDueForWriting, true);
  assert.equal(go.practiced, false);
});

test('filterKanjiCatalog and summarizeKanjiCatalog support JLPT N5-N1 tabs, status filters and zero-match levels', () => {
  const catalog = mergeKanjiLibrary(
    [
      { id: 1, character: '人', meaning: 'Người', sinoVietnamese: 'Nhân', strokeCount: 2, jlptLevelName: 'N5' },
      { id: 2, character: '水', meaning: 'Nước', sinoVietnamese: 'Thủy', strokeCount: 4, jlptLevelName: 'N5' },
      { id: 3, character: '新', meaning: 'Mới', sinoVietnamese: 'Tân', strokeCount: 13, jlptLevelName: 'N4' },
    ],
    [{ kanjiId: 2, score: 85 }],
    [{ kanjiId: 1, isNew: true, character: '人', meaning: 'Người', strokeCount: 2 }],
  );

  const jlptCatalog = [
    { id: 1, code: 'N5' },
    { id: 2, code: 'N4' },
    { id: 3, code: 'N3' },
    { id: 4, code: 'N2' },
    { id: 5, code: 'N1' },
  ];

  const summary = summarizeKanjiCatalog(catalog, jlptCatalog);
  assert.equal(summary.total, 3);
  assert.equal(summary.practiced, 1);
  assert.equal(summary.mastered, 1);
  assert.equal(summary.dueCount, 1);
  assert.deepEqual(
    summary.levels.map((l) => [l.code, l.count]),
    [['N5', 2], ['N4', 1], ['N3', 0], ['N2', 0], ['N1', 0]],
  );

  assert.equal(filterKanjiCatalog(catalog, { level: 'ALL', status: 'all' }).length, 3);
  assert.deepEqual(filterKanjiCatalog(catalog, { level: 'N5', status: 'practiced' }).map((x) => x.character), ['水']);
  assert.deepEqual(filterKanjiCatalog(catalog, { level: 'ALL', status: 'due' }).map((x) => x.character), ['人']);
  assert.deepEqual(filterKanjiCatalog(catalog, { level: 'N3' }), []);
  assert.deepEqual(parseJlptLevels('n4, N5'), ['N5', 'N4']);
});

test('computeWritingScore clamps 0..100 and tracks correctStrokeCount deterministically', () => {
  assert.deepEqual(computeWritingScore(0, 4), {
    score: 100,
    correctStrokeCount: 4,
    totalStrokeCount: 4,
    totalMistakes: 0,
  });
  assert.deepEqual(computeWritingScore(3, 5), {
    score: 70,
    correctStrokeCount: 2,
    totalStrokeCount: 5,
    totalMistakes: 3,
  });
  assert.equal(computeWritingScore(20, 4).score, 0);
  assert.equal(computeWritingScore(20, 4).correctStrokeCount, 0);
});

test('Kanji library page defaults to full library instead of due-only trap and preserves Kana/SRS separation', () => {
  const pageSrc = readSrc('src/pages/learner/KanjiWritingPracticePage.jsx');
  assert.match(pageSrc, /useKanjiLibrary/);
  assert.doesNotMatch(pageSrc, /useState\(['"]due['"]\)/, 'Kanji view must NOT default to due-only queue');
  assert.match(pageSrc, /useKanaWritingPractice\(kanaType,\s*kanaScope\)/, 'Kana practice flow must remain intact');

  const lessonSrc = readSrc('src/features/kanji/components/KanjiLesson.jsx');
  assert.doesNotMatch(lessonSrc, /Hôm nay chưa có chữ đến hạn/, 'Library page must not show due-only trap as default empty state');
  assert.match(lessonSrc, /to="\/daily-srs\/"/, 'SRS scheduled review must delegate cleanly to /daily-srs/');
  assert.match(lessonSrc, /PageContainer\s+width="default"/, 'Kanji library must use full fluid container width');

  const canvasSrc = readSrc('src/features/kanji/components/KanjiWritingCanvas.jsx');
  assert.match(canvasSrc, /onLoadCharDataError/);
  assert.match(canvasSrc, /onLoadCharDataSuccess/);
  assert.match(canvasSrc, /drawingWidth\s*=\s*38/, 'KanjiWritingCanvas must use proportional thick brush stroke in 1024-space');
  assert.match(canvasSrc, /drawingColor:\s*'#231B20'/, 'User stroke must use high-contrast dark ink');
  assert.match(canvasSrc, /outlineColor:\s*'#F1C8D4'/, 'Guide stroke must use soft light Sakura pink');

  const kanaDialogSrc = readSrc('src/features/kanji/components/KanaStrokeDialog.jsx');
  assert.match(kanaDialogSrc, /role="toolbar"[\s\S]*flex-wrap items-center gap-2 sm:flex-nowrap/, 'Writing toolbar must stay on one horizontal row when space permits');
  assert.ok(kanaDialogSrc.includes("tr('Ẩn mẫu')"), 'KanaStrokeDialog must use concise "Ẩn mẫu" button label');
  assert.ok(kanaDialogSrc.includes("tr('Viết theo nét mẫu.')"), 'KanaStrokeDialog must use concise helper copy');
  assert.ok(kanaDialogSrc.includes("tr('Nét chưa đúng. Hãy thử lại.')"), 'KanaStrokeDialog must use concise mistake copy');
  assert.ok(!kanaDialogSrc.includes('Chỉ nét viết đúng mới được giữ lại'), 'Must remove verbose stroke retention explanation');
  assert.ok(!kanaDialogSrc.includes('chưa khớp hình hoặc thứ tự'), 'Must remove verbose technical stroke mismatch message');
  assert.match(kanaDialogSrc, /iconRight=\{ArrowRight\}[\s\S]*tr\('Chữ tiếp theo'\)/, 'Next character button must use iconRight so the arrow never wraps to a new line');
  assert.ok(kanaDialogSrc.includes('KanjiVG · Ulrich Apel') && kanaDialogSrc.includes('CC BY-SA 3.0'), 'Must preserve KanjiVG CC BY-SA 3.0 license attribution');

  const studioSrc = readSrc('src/features/kanji/components/KanjiDetailStudio.jsx');
  assert.match(studioSrc, /role="toolbar"\s+aria-label=\{tr\('Công cụ luyện viết'\)\}\s+className="flex flex-wrap items-center gap-2"/);
  assert.ok(studioSrc.includes("tr('Ẩn mẫu')"), 'KanjiDetailStudio must use concise "Ẩn mẫu" button label');
  assert.ok(!studioSrc.includes('chưa khớp hình hoặc thứ tự'), 'KanjiDetailStudio must use concise mistake copy');

  const padSrc = readSrc('src/features/kanji/components/KanjiRecognitionPad.jsx');
  assert.ok(!padSrc.includes('OCR'), 'KanjiRecognitionPad must not expose technical OCR jargon to learners');
});
