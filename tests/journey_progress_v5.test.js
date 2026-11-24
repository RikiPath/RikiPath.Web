import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PATTERNS, buildProgressPath, buildRoad, layoutNodes, resolveJourneyProgress } from '../src/features/learner-ui/journeyLayout.js';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Last "x y" pair of an SVG path string. */
function endPoint(d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return { x: nums[nums.length - 2], y: nums[nums.length - 1] };
}
function startPoint(d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return { x: nums[0], y: nums[1] };
}

describe('Roadmap V5 — contiguous journey progress', () => {
  it('ends exactly on the current checkpoint (first / middle / last)', () => {
    assert.equal(resolveJourneyProgress(['current', 'locked', 'locked']).endIndex, 0);
    assert.equal(resolveJourneyProgress(['done', 'current', 'locked', 'locked']).endIndex, 1);
    assert.equal(resolveJourneyProgress(['done', 'done', 'done', 'in_progress']).endIndex, 3);
  });

  it('runs to the scene edge only when every checkpoint is completed, and never invents a current node', () => {
    const all = resolveJourneyProgress(['done', 'done', 'done'], { hasPrev: true, hasNext: true });
    assert.deepEqual([all.endIndex, all.includeLead, all.includeTrail, all.allDone], [2, true, true, true]);
    const none = resolveJourneyProgress(['locked', 'locked', 'locked'], { hasPrev: true, hasNext: true });
    assert.deepEqual([none.endIndex, none.started, none.includeLead, none.includeTrail], [-1, false, false, false]);
  });

  it('does not paint past a gap when a later lesson was completed out of order', () => {
    const p = resolveJourneyProgress(['done', 'upcoming', 'done', 'locked']);
    assert.equal(p.endIndex, 0, 'progress stops on the last contiguous completed checkpoint');
    assert.equal(p.allDone, false);
  });
});

describe('Roadmap V5 — progress path shares the road geometry', () => {
  for (const pattern of PATTERNS) {
    for (const count of [3, 4, 5, 6]) {
      it(`${pattern} · ${count} nodes: nodes sit on the road and progress stops on the current node`, () => {
        const width = 1000;
        const { points } = layoutNodes({ count, width, height: 380, pattern, seed: 0.37 });
        const road = buildRoad(points, { width, fromLeft: true, toRight: true });
        // Every node is a vertex of the road spline (shared geometry, not an independent Y).
        for (const p of points) assert.ok(road.d.includes(`${p.x} ${p.y}`), `node ${p.x},${p.y} must lie on the road`);

        for (let current = 0; current < count; current += 1) {
          const statuses = points.map((_, i) => (i < current ? 'done' : i === current ? 'current' : 'locked'));
          const progress = resolveJourneyProgress(statuses, { hasPrev: true, hasNext: true });
          const d = buildProgressPath(road, progress);
          assert.ok(d.length > 0);
          assert.deepEqual(endPoint(d), points[current], 'active path ends exactly on the current checkpoint');
          assert.equal(startPoint(d).x, -24, 'lead-in from the previous scene is part of the travelled road');
        }

        const statuses = points.map(() => 'done');
        const full = buildProgressPath(road, resolveJourneyProgress(statuses, { hasPrev: true, hasNext: true }));
        assert.equal(full, road.d, 'a completed scene is travelled from edge to edge');
      });
    }
  }

  it('returns no active path when the journey has not reached the scene', () => {
    const { points } = layoutNodes({ count: 4, width: 900, height: 380, pattern: PATTERNS[0], seed: 0.5 });
    const road = buildRoad(points, { width: 900, fromLeft: false, toRight: true });
    assert.equal(buildProgressPath(road, resolveJourneyProgress(['current', 'locked', 'locked', 'locked'], { hasNext: true })), '');
    assert.equal(buildProgressPath(road, resolveJourneyProgress(['locked', 'locked', 'locked', 'locked'], { hasNext: true })), '');
  });

  it('renders checkpoints after the road, animates only the travelled path and respects reduced motion', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/features/learner-ui/LearningJourneyMap.jsx'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'src/features/learner-ui/dashboard.css'), 'utf8');
    assert.ok(src.indexOf('<ProgressRoad') < src.indexOf('<Checkpoint\n'), 'checkpoints are drawn above the road layers');
    assert.equal((src.match(/className="rp-journey-dash"/g) || []).length, 1, 'only the travelled path animates');
    assert.ok(src.includes('getTotalLength'), 'progress growth uses real arc length');
    assert.ok(/prefers-reduced-motion[\s\S]*\.rp-journey-dash/.test(css));
  });
});
