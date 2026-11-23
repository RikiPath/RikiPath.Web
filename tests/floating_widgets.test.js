import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  clampWidgetPosition,
  computeDefaultPositions,
  computeFloatingPanelPlacement,
  FLOATING_WIDGET_STORAGE_KEY,
  getViewportBucket,
  readPersistedPositions,
  rectsOverlapWithGap,
  resolveWidgetCollision,
  WIDGET_GAP_PX,
  writePersistedPositions,
} from '../src/features/floating-widgets/floatingWidgetMath.js';
import {
  FOX_3D_CONTRACT,
  FOX_ANIMATION_STATES,
  resolveFoxPoseConfig,
} from '../src/features/companion/fox3dContract.js';
import { resolvePageAmbientState } from '../src/features/companion/companionMachine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Floating Widgets — Clamping, Collision Avoidance & Panel Placement', () => {
  it('places default widgets bottom-right side-by-side with >= 20px gap and stacks on 240px ultra-narrow viewport', () => {
    const specs = [
      { id: 'notebook', order: 0, size: { width: 112, height: 48 } },
      { id: 'riki', order: 1, size: { width: 72, height: 72 } },
    ];
    const desktop = computeDefaultPositions(specs, { width: 1280, height: 800 });
    assert.equal(
      rectsOverlapWithGap(
        { ...desktop.notebook, width: 112, height: 48 },
        { ...desktop.riki, width: 72, height: 72 },
        WIDGET_GAP_PX,
      ),
      false,
    );
    assert.ok(desktop.notebook.x - (desktop.riki.x + 72) >= WIDGET_GAP_PX);

    // Ultra-narrow 240px viewport cannot place side-by-side cleanly so it stacks vertically with gap
    const tight = computeDefaultPositions(specs, { width: 240, height: 640 });
    assert.equal(
      rectsOverlapWithGap(
        { ...tight.notebook, width: 112, height: 48 },
        { ...tight.riki, width: 72, height: 72 },
        WIDGET_GAP_PX,
      ),
      false,
    );
  });

  it('clamps coordinates inside viewport safe bounds (respecting topbar & margin)', () => {
    const clamped = clampWidgetPosition(
      { x: -120, y: 10 },
      { width: 72, height: 72 },
      { width: 390, height: 844 },
    );
    assert.equal(clamped.x, 16);
    assert.equal(clamped.y, 76);

    const bottomRight = clampWidgetPosition(
      { x: 9999, y: 9999 },
      { width: 112, height: 48 },
      { width: 390, height: 844 },
    );
    assert.equal(bottomRight.x, 390 - 16 - 112);
    assert.equal(bottomRight.y, 844 - 16 - 48);
  });

  it('resolves collisions deterministically when one widget is dropped onto another or cornered', () => {
    const sizes = {
      notebook: { width: 112, height: 48 },
      riki: { width: 72, height: 72 },
    };
    const collided = resolveWidgetCollision({
      movedId: 'riki',
      positions: {
        notebook: { x: 600, y: 500 },
        riki: { x: 605, y: 498 },
      },
      sizes,
      viewport: { width: 1280, height: 800 },
    });
    assert.equal(
      rectsOverlapWithGap(
        { ...collided.notebook, ...sizes.notebook },
        { ...collided.riki, ...sizes.riki },
        WIDGET_GAP_PX,
      ),
      false,
    );

    // Corner-drop on bottom-right edge also resolves cleanly without going off-screen
    const cornered = resolveWidgetCollision({
      movedId: 'riki',
      positions: {
        notebook: { x: 1152, y: 736 },
        riki: { x: 1155, y: 720 },
      },
      sizes,
      viewport: { width: 1280, height: 800 },
    });
    assert.equal(
      rectsOverlapWithGap(
        { ...cornered.notebook, ...sizes.notebook },
        { ...cornered.riki, ...sizes.riki },
        WIDGET_GAP_PX,
      ),
      false,
    );
    assert.ok(cornered.riki.x >= 16 && cornered.riki.y >= 76);
  });

  it('computes quadrant-aware inward panel placement for top/bottom/left/right dragged anchors', () => {
    const vp = { width: 1280, height: 800 };
    const topLeftPanel = computeFloatingPanelPlacement({ x: 20, y: 80, width: 72, height: 72 }, { width: 360, height: 400 }, vp);
    assert.equal(topLeftPanel.openUpward, false);
    assert.ok(topLeftPanel.top >= 80 + 72 + 12);
    assert.ok(topLeftPanel.left >= 12);

    const bottomRightPanel = computeFloatingPanelPlacement({ x: 1180, y: 710, width: 72, height: 72 }, { width: 360, height: 400 }, vp);
    assert.equal(bottomRightPanel.openUpward, true);
    assert.ok(bottomRightPanel.left + bottomRightPanel.width <= vp.width - 12);
    assert.ok(bottomRightPanel.arrowOffsetX >= 20 && bottomRightPanel.arrowOffsetX <= bottomRightPanel.width - 20);
  });

  it('safely persists and validates coordinates in storage (ignoring malformed payloads)', () => {
    const mem = new Map();
    const fakeStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
    };
    fakeStorage.setItem(FLOATING_WIDGET_STORAGE_KEY, '{corrupt json');
    assert.deepEqual(readPersistedPositions(fakeStorage), {});

    writePersistedPositions(fakeStorage, { riki: { x: 140.4, y: 310.7 }, bad: { x: Number.NaN, y: 10 } });
    assert.deepEqual(readPersistedPositions(fakeStorage), { riki: { x: 140, y: 311 } });

    // Partitioned desktop/mobile buckets stay isolated when switching breakpoints
    fakeStorage.setItem(FLOATING_WIDGET_STORAGE_KEY, '');
    assert.equal(getViewportBucket({ width: 390 }), 'mobile');
    assert.equal(getViewportBucket({ width: 1280 }), 'desktop');
    writePersistedPositions(fakeStorage, { riki: { x: 304, y: 712 } }, FLOATING_WIDGET_STORAGE_KEY, 'mobile');
    writePersistedPositions(fakeStorage, { riki: { x: 1070, y: 712 } }, FLOATING_WIDGET_STORAGE_KEY, 'desktop');
    assert.deepEqual(readPersistedPositions(fakeStorage, FLOATING_WIDGET_STORAGE_KEY, 'mobile'), { riki: { x: 304, y: 712 } });
    assert.deepEqual(readPersistedPositions(fakeStorage, FLOATING_WIDGET_STORAGE_KEY, 'desktop'), { riki: { x: 1070, y: 712 } });
  });
});

describe('Chibi 3D Sakura Fox — Contract, 14 States & Architecture Guard', () => {
  it('defines the explicit .glb rig contract and maps all 14 animation states cleanly', () => {
    assert.equal(FOX_3D_CONTRACT.modelUrl, '/models/riki-sakura-fox.glb');
    assert.equal(FOX_3D_CONTRACT.rendererDefault, 'webp-3d-sprite');
    assert.equal(FOX_ANIMATION_STATES.length, 14);
    assert.ok(FOX_3D_CONTRACT.requiredBones.includes('HairSakura'));
    assert.ok(FOX_3D_CONTRACT.requiredMorphTargets.includes('eye_blink_L'));

    for (const state of FOX_ANIMATION_STATES) {
      const cfg = resolveFoxPoseConfig(state);
      assert.equal(cfg.state, state);
      assert.ok(cfg.src && cfg.src.includes('riki-'), `Missing sprite asset for state "${state}"`);
      assert.ok(cfg.statusLabel.length > 0);
    }
  });

  it('maps page routes cleanly to studying / curious / idle ambient states', () => {
    assert.equal(resolvePageAmbientState('/lessons/'), 'studying');
    assert.equal(resolvePageAmbientState('/grammar/'), 'studying');
    assert.equal(resolvePageAmbientState('/ai-counselor/'), 'curious');
    assert.equal(resolvePageAmbientState('/cohorts/'), 'curious');
    assert.equal(resolvePageAmbientState('/app/'), 'idle');
  });

  it('replaces flat 2D SakuraFoxLiveRig SVG across all active companion/AICounselor entrypoints', () => {
    for (const file of [
      'src/features/companion/FloatingSakuraCompanion.jsx',
      'src/features/companion/RikiInteractivePanel.jsx',
      'src/pages/learner/AICounselor.jsx',
    ]) {
      const src = readSrc(file);
      assert.match(src, /SakuraFox3DActor/);
      assert.doesNotMatch(src, /SakuraFoxLiveRig/);
    }
  });

  it('ensures Sổ tay cá nhân integrates vocabulary search + LearningShell coordinates floating docks without standalone VocabularyNotebook', () => {
    const workspace = readSrc('src/features/notebook/components/SmartNotebookWorkspace.jsx');
    assert.match(workspace, /NotebookVocabLookupSection/);
    assert.match(workspace, /\/daily-srs\//);
    assert.match(workspace, /\/vocabulary-detail\//);
    assert.match(workspace, /<IllustratedPageHeader[\s\S]*icon="notebook"[\s\S]*eyebrow=\{tr\('Góc học tập của tôi'\)\}[\s\S]*description=\{tr\('Ghi lại và tổ chức kiến thức của bạn\.'\)\}/);
    assert.doesNotMatch(workspace, /SakuraNotebookBubbleIcon/);

    const clayIcon = readSrc('src/features/learner-ui/WebClayIcon.jsx');
    assert.match(clayIcon, /'notebook'/);
    const illustrations = readSrc('src/features/landing/components/StudyIllustrations.jsx');
    assert.match(illustrations, /notebook:\s*\['#FFE4EC',\s*'#EE7C9C',\s*'#C24362'\]/);

    const vocabLookup = readSrc('src/features/notebook/components/NotebookVocabLookupSection.jsx');
    assert.match(vocabLookup, /searchVocabulary/);
    assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/learner/VocabularyNotebook.jsx')), false);

    const shell = readSrc('src/layouts/LearnerShell.jsx');
    assert.match(shell, /FloatingWidgetProvider/);

    const floatingNb = readSrc('src/features/notebook/components/FloatingNotebookWidget.jsx');
    assert.match(floatingNb, /h\.isBackendHighlight && h\.highlightId/);
    assert.match(floatingNb, /nb\.removeHighlight\.mutateAsync\(h\.highlightId\)/);
  });
});
