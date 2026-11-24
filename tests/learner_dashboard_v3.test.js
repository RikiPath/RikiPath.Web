// Learner Dashboard V3 — lesson journey model + dashboard structure contracts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { journeyOverview } from '../src/features/learning-journey/journeyModel.js';
import { NODE_KIND, buildLessonJourney, chunkBalanced, lessonKind } from '../src/features/learner-ui/lessonJourneyModel.js';
import { LANDSCAPES, PATTERNS, buildRoad, choosePattern, labelRect, landscapeArt, landscapeFor, layoutNodes, placeLabels } from '../src/features/learner-ui/journeyLayout.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const lesson = (id, extra = {}) => ({ lessonId: id, title: `Bài ${id}`, isCompleted: false, isLocked: false, ...extra });
const roadmap = {
  stages: [
    {
      stageId: 1,
      title: 'Chặng 1 · Chào hỏi',
      levelCode: 'N5',
      lessons: [lesson(1, { isCompleted: true }), lesson(2, { completionState: 'StudiedPendingQuiz', isStudied: true, hasPracticeExercise: true }), lesson(3, { completionState: 'NeedsReview' })],
      groupQuiz: { exerciseId: 91, title: 'Kiểm tra chặng 1', isUnlocked: false, isPassed: false },
    },
    {
      stageId: 2,
      title: 'Chặng 2 · Số đếm',
      levelCode: 'N5',
      lessons: [lesson(4, { isLocked: true, prerequisiteLessonId: 3 }), lesson(5, { isLocked: true })],
      stageAssessment: { exerciseId: 92, title: 'Đánh giá N5', isUnlocked: false, isPassed: false },
    },
  ],
};

describe('lesson journey model (real roadmap data only)', () => {
  it('maps lesson kinds from completion state', () => {
    assert.equal(lessonKind(lesson(1)), NODE_KIND.LESSON);
    assert.equal(lessonKind(lesson(1, { completionState: 'NeedsReview' })), NODE_KIND.REVIEW);
    assert.equal(lessonKind(lesson(1, { completionState: 'StudiedPendingQuiz' })), NODE_KIND.PRACTICE);
    assert.equal(lessonKind(lesson(1, { isStudied: true, hasPracticeExercise: true })), NODE_KIND.PRACTICE);
    assert.equal(lessonKind(lesson(1, { isCompleted: true, isStudied: true, hasPracticeExercise: true })), NODE_KIND.LESSON);
  });

  it('builds ordered items with quiz/checkpoint nodes and real states', () => {
    const j = buildLessonJourney(roadmap, journeyOverview(roadmap));
    assert.deepEqual(j.items.map((i) => i.kind), ['lesson', 'practice', 'review', 'quiz', 'lesson', 'lesson', 'checkpoint']);
    // Strictly sequential: first unfinished step = current; later started steps are "in progress" but gated.
    assert.deepEqual(j.items.map((i) => i.status), ['done', 'current', 'in_progress', 'locked', 'locked', 'locked', 'locked']);
    assert.equal(j.currentIndex, 1);
    assert.match(j.items[1].to, /lessonId|lesson-player/);
    assert.match(j.items[3].to, /checkpoint=91/);
    assert.equal(j.items[1].gated, false);
    assert.ok(j.items.slice(2).every((i) => i.gated), 'nothing after the current step can be opened');
    assert.equal(j.items[4].lock.value, 'Bài 2', 'lock reason names the step to finish first');
  });

  it('splits scenes per stage (max 4 items) with a context theme', () => {
    const j = buildLessonJourney(roadmap, journeyOverview(roadmap));
    assert.deepEqual(j.scenes.map((s) => [s.startIndex, s.items.length, s.theme]), [[0, 4, 'quiz'], [4, 3, 'quiz']]);
    const plain = { stages: [{ stageId: 9, title: 'A', lessons: [lesson(1), lesson(2)] }] };
    assert.equal(buildLessonJourney(plain, journeyOverview(plain)).scenes[0].theme, 'lesson');
  });

  it('returns null without stages so the onboarding steps are shown instead', () => {
    assert.equal(buildLessonJourney(null, journeyOverview(null)), null);
    assert.equal(buildLessonJourney({ stages: [] }, journeyOverview({ stages: [] })), null);
  });
});

describe('dashboard V3 structure', () => {
  const home = read('src/pages/learner/HomeLearner.jsx');
  const streak = read('src/features/learner-ui/WeeklyStreakBar.jsx');
  const analytics = read('src/features/learner-ui/LearningAnalytics.jsx');
  const css = read('src/features/learner-ui/dashboard.css');

  it('has the overview row, roadmap, discovery+group row and analytics, without the Today widget', () => {
    for (const part of ['WeeklyStreakBar', 'ProgressReviewCard', 'PackageSummaryCard', 'LearningJourneyMap', 'SkillExplorer compact', 'GroupLearningWidget', 'LearningAnalytics']) {
      assert.ok(home.includes(part), part);
    }
    assert.equal(/TodayLearningPanel/.test(home), false);
    assert.equal(fs.existsSync(path.join(ROOT, 'src/features/learner-ui/TodayLearningPanel.jsx')), false);
  });

  it('group card keeps its header icon and uses the shared classroom empty state', () => {
    assert.match(home, /<WebClayIcon name="group" size="xs"/);
    assert.match(home, /illustration="classroom"/);
    assert.match(home, /Bạn chưa tham gia lớp nhóm nào/);
  });

  it('streak shows only small flames inside studied days', () => {
    assert.equal(/LivingFlame|rp-living-flame/.test(streak + css), false);
    assert.match(streak, /<MiniFlameSvg active/);
  });

  it('calendar: month picker in the header, sakura selection, two-item legend', () => {
    assert.match(analytics, /<MonthPicker/);
    assert.equal(/data-kind="today"/.test(analytics), false);
    assert.match(analytics, /data-kind="active"/);
    assert.match(analytics, /data-kind="selected"/);
    assert.equal(/rp-cal-day\[data-selected='true'\][^}]*navy/.test(css), false, 'no dark border on the selected day');
  });
});

describe('flexible journey layout', () => {
  it('splits long stages into balanced scenes (no lonely last step)', () => {
    const sizes = (n, max) => chunkBalanced(Array.from({ length: n }, (_, i) => i), max).map((c) => c.length);
    assert.deepEqual(sizes(4, 6), [4]);
    assert.deepEqual(sizes(6, 6), [6]);
    assert.deepEqual(sizes(7, 6), [4, 3]);
    assert.deepEqual(sizes(10, 6), [5, 5]);
    assert.deepEqual(sizes(13, 6), [5, 4, 4]);
    assert.deepEqual(sizes(5, 3), [3, 2]);
  });

  it('places 1–6 nodes inside the scene with non-overlapping labels', () => {
    for (const [width, height, compact] of [[900, 250, false], [900, 330, false], [480, 310, true]]) {
      for (let count = 1; count <= (compact ? 3 : 6); count += 1) {
        for (let variant = 0; variant < 3; variant += 1) {
          const { points, labelWidth } = layoutNodes({ count, width, height, variant, compact });
          assert.equal(points.length, count);
          for (const p of points) {
            assert.ok(p.x - labelWidth / 2 >= 8 && p.x + labelWidth / 2 <= width - 8, `label inside x (${count})`);
            assert.ok(p.y - 63 >= 0 && p.y + 50 <= height, `tag & label inside y (${count}, h${height})`);
          }
          for (let i = 1; i < points.length; i += 1) {
            assert.ok(points[i].x - points[i - 1].x >= labelWidth + 4, `labels do not overlap (${count})`);
          }
        }
      }
    }
  });
});

describe('no skipping on the recommended roadmap', () => {
  it('keeps the first unfinished lesson current even when a later lesson was started or recommended', () => {
    const rm = {
      stages: [{
        stageId: 1,
        title: 'S',
        lessons: [lesson(1), lesson(2, { isStudied: true, isRecommendedNext: true }), lesson(3)],
      }],
    };
    const j = buildLessonJourney(rm, journeyOverview(rm));
    assert.deepEqual(j.items.map((i) => i.status), ['current', 'in_progress', 'locked']);
    assert.equal(j.currentIndex, 0);
    assert.ok(j.items[1].gated && j.items[2].gated);
  });

  it('moves the current step forward only after the earlier one is completed', () => {
    const rm = { stages: [{ stageId: 1, title: 'S', lessons: [lesson(1, { isCompleted: true }), lesson(2), lesson(3)] }] };
    const j = buildLessonJourney(rm, journeyOverview(rm));
    assert.deepEqual(j.items.map((i) => i.status), ['done', 'current', 'locked']);
  });
});

describe('roadmap world landscapes', () => {
  it('picks a stable landscape per stage and avoids repeating the previous one', () => {
    assert.equal(LANDSCAPES.length, 7);
    assert.equal(landscapeFor('42'), landscapeFor('42'));
    const first = landscapeFor('7');
    assert.notEqual(landscapeFor('7', first), first);
  });

  it('keeps the landscape art separate from the learning path and checkpoints', () => {
    const art = read('src/features/learner-ui/journeyScenes.jsx');
    assert.equal(/Checkpoint|Bạn đang ở đây|status|onSelect/.test(art), false);
    assert.equal(/<image|\.png|\.jpe?g|\.webp/.test(art), false, 'vector only, no raster downloads');
  });
});

describe('painted landscape assets', () => {
  it('ships three WebP widths for every painted landscape and falls back to vector for the rest', () => {
    for (const key of LANDSCAPES) {
      const art = landscapeArt(key);
      if (!art) continue;
      for (const w of [800, 1280, 2000]) {
        assert.ok(fs.existsSync(path.join(ROOT, 'public/images/roadmap-world', `${key}-${w}.webp`)), `${key}-${w}.webp`);
      }
      assert.match(art.srcSet, /800w.*1280w.*2000w/);
    }
    assert.equal(landscapeArt('bamboo'), null, 'no painting yet → vector fallback');
    assert.equal(LANDSCAPES.filter((k) => landscapeArt(k)).length, 6);
  });
});

describe('roadmap V4 — adaptive wave layout', () => {
  const sizes = [[900, 250, false], [1270, 250, false], [900, 330, false], [480, 310, true]];

  it('places 1–6 nodes for every pattern inside the safe band with labels that never overlap or leave the scene', () => {
    for (const [width, height, compact] of sizes) {
      for (const pattern of PATTERNS) {
        for (let count = 1; count <= (compact ? 3 : 6); count += 1) {
          const { points, labelWidth } = layoutNodes({ count, width, height, pattern, seed: 0.4, compact, gutter: 40 });
          const road = buildRoad(points, { width, fromLeft: true, toRight: true });
          const sides = placeLabels({ points, labelWidth, width, height, samples: road.samples, currentIndex: Math.min(1, count - 1) });
          const rects = points.map((pt, i) => labelRect(pt, sides[i], labelWidth));
          for (const [i, r] of rects.entries()) {
            assert.ok(r.x1 >= 2 && r.x2 <= width - 2 && r.y1 >= 4 && r.y2 <= height - 4, `${pattern}/${count} label ${i} inside (${width}x${height})`);
            assert.ok(points[i].y >= 80 && points[i].y <= height - 58, 'node in safe band');
          }
          for (let a = 0; a < rects.length; a += 1) {
            for (let b = a + 1; b < rects.length; b += 1) {
              const overlap = rects[a].x1 < rects[b].x2 && rects[b].x1 < rects[a].x2 && rects[a].y1 < rects[b].y2 && rects[b].y1 < rects[a].y2;
              assert.equal(overlap, false, `${pattern}/${count} labels ${a},${b} overlap`);
            }
          }
          const cur = Math.min(1, count - 1);
          if (sides[cur] === 'above') assert.ok(rects[cur].y1 - 30 >= 4, 'the "you are here" tag above an upper label stays inside');
        }
      }
    }
  });

  it('gives each pattern its own shape', () => {
    const ys = (pattern) => layoutNodes({ count: 5, width: 900, height: 280, pattern, seed: 0.5 }).points.map((p) => p.y);
    const asc = ys('ascent');
    assert.ok(asc[4] < asc[0] - 30, 'ascent climbs (ends higher)');
    const val = ys('valley');
    assert.ok(val[2] > val[0] && val[2] > val[4], 'valley dips in the middle');
    const roll = ys('rolling');
    assert.ok((roll[1] - roll[0]) * (roll[2] - roll[1]) < 0, 'rolling alternates');
    assert.notDeepEqual(ys('gentle'), roll);
  });

  it('chooses a stable pattern from stage data and never repeats the previous one', () => {
    assert.equal(choosePattern({ key: 'a', kinds: ['lesson', 'lesson', 'quiz'] }), 'ascent');
    assert.equal(choosePattern({ key: 'a', kinds: ['review', 'review', 'lesson'] }), 'valley');
    assert.equal(choosePattern({ key: 'b', landscape: 'village', kinds: ['lesson', 'lesson', 'lesson', 'lesson'] }), 'rolling');
    assert.notEqual(choosePattern({ key: 'b', landscape: 'village', kinds: ['lesson', 'lesson', 'lesson', 'lesson'], previous: 'rolling' }), 'rolling');
    assert.equal(choosePattern({ key: 'z', landscape: 'lakeside', kinds: ['lesson'] }), choosePattern({ key: 'z', landscape: 'lakeside', kinds: ['lesson'] }));
  });

  it('builds a smooth road through every node (Catmull–Rom → Bézier)', () => {
    const { points } = layoutNodes({ count: 4, width: 900, height: 260, pattern: 'rolling' });
    const road = buildRoad(points, { width: 900 });
    assert.equal((road.d.match(/C /g) || []).length, 3);
    for (const pt of points) assert.ok(road.d.includes(`${pt.x} ${pt.y}`), 'road passes through the node centre');
  });
});
