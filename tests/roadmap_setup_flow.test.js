import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = read('src/features/learning-path/components/RoadmapSetupState.jsx');
const css = read('src/features/learning-path/components/roadmapSetupFlow.css');
const setupSection = code.slice(0, code.indexOf('export function LockedAiRoadmapCard'));

describe('Roadmap setup — sequential Goal → Assessment → Roadmap', () => {
  it('drops the mascot from setup and leads the heading with a 3D clay icon', () => {
    assert.doesNotMatch(setupSection, /HaruMascot|HaruAchievement/);
    assert.match(setupSection, /<WebClayIcon name="journey"[\s\S]{0,400}<h2/);
    assert.match(read('src/features/learner-ui/WebClayIcon.jsx'), /journey: 'dashboard'/);
  });

  it('renders a 3-step sequential stepper with roadmap choices only on the last step', () => {
    assert.match(setupSection, /function SetupStepper/);
    assert.match(setupSection, /function RoadmapChoices/);
    assert.match(setupSection, /Đặt mục tiêu JLPT/);
    assert.match(setupSection, /Đánh giá năng lực/);
    assert.match(setupSection, /Tạo lộ trình học/);
    assert.match(setupSection, /Tạo lộ trình tiêu chuẩn/);
    assert.match(setupSection, /Tạo lộ trình AI/);
  });

  it('never offers a skip that would open a new roadmap without an assessment', () => {
    assert.doesNotMatch(setupSection, /Bỏ qua đánh giá|onSkipPlacement/);
    assert.match(setupSection, /step === 'goal'/);
    assert.match(setupSection, /step === 'placement'/);
  });

  it('uses subtle responsive grid layout and reveal animation on unlock', () => {
    assert.match(css, /\.rp-flex-card/);
    assert.match(css, /\.rp-roadmap-unlock/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  });
});
