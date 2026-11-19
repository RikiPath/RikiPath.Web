import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ONBOARDING_STEPS,
  STUDY_TIME_PRESETS,
  computeStepValidity,
  computeWizardProgressPercent,
  formatExamSessionHeadline,
  formatStudySummaryText,
  getFurthestAccessibleStep,
  validateStep1Certificate,
  validateStep2Level,
  validateStep3StudyPlan,
  validateStep4ExamDate,
} from '@/features/auth/components/onboardingWizardLogic.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Onboarding 5-Step Wizard logic & validation', () => {
  const today = '2026-11-19';

  it('defines all five guided steps in expected cross-platform order', () => {
    assert.deepEqual(
      ONBOARDING_STEPS.map((s) => s.id),
      ['certificate', 'level', 'study-plan', 'exam-schedule', 'review'],
    );
    assert.deepEqual(STUDY_TIME_PRESETS.map((p) => p.minutes), [15, 30, 45, 60, 90]);
  });

  it('validates step 1 certificate selection across loading, error, empty, and selected states', () => {
    assert.equal(validateStep1Certificate({ activeCertId: null, loadingTypes: true }).valid, false);
    assert.equal(validateStep1Certificate({ activeCertId: null, typesError: new Error('fail') }).valid, false);
    assert.equal(validateStep1Certificate({ activeCertId: null }).valid, false);
    assert.equal(validateStep1Certificate({ activeCertId: 1 }).valid, true);
  });

  it('validates step 2 level and self-declared prior JLPT certificate dependency', () => {
    assert.equal(validateStep2Level({ activeCertId: 1, activeLevelId: null }).valid, false);
    assert.equal(
      validateStep2Level({ activeCertId: 1, activeLevelId: 3, needsCertificateChoice: true }).valid,
      false,
    );
    assert.equal(
      validateStep2Level({ activeCertId: 1, activeLevelId: 3, needsCertificateChoice: false }).valid,
      true,
    );
  });

  it('validates both fixed and range daily study modes within 15-480 integer minutes', () => {
    assert.equal(validateStep3StudyPlan({ timeMode: 'fixed', minutes: 30 }).valid, true);
    assert.equal(validateStep3StudyPlan({ timeMode: 'fixed', minutes: 14 }).valid, false);
    assert.equal(validateStep3StudyPlan({ timeMode: 'fixed', minutes: 481 }).valid, false);
    assert.equal(validateStep3StudyPlan({ timeMode: 'fixed', minutes: '30.5' }).valid, false);

    assert.equal(validateStep3StudyPlan({ timeMode: 'range', minutes: 30, maxMinutes: 60 }).valid, true);
    assert.equal(validateStep3StudyPlan({ timeMode: 'range', minutes: 60, maxMinutes: 30 }).valid, false);
    assert.equal(validateStep3StudyPlan({ timeMode: 'range', minutes: 30, maxMinutes: '' }).valid, false);
  });

  it('treats exam date as optional when omitted and enforces JLPT first-Sunday rules when provided', () => {
    const omitted = validateStep4ExamDate({ examDate: '', today, isJlpt: true });
    assert.equal(omitted.valid, true);
    assert.equal(omitted.optionalOmitted, true);

    assert.equal(validateStep4ExamDate({ examDate: '2027-07-04', today, isJlpt: true }).valid, true);
    assert.equal(validateStep4ExamDate({ examDate: '2027-07-11', today, isJlpt: true }).valid, false);
    assert.equal(validateStep4ExamDate({ examDate: '2026-11-19', today, isJlpt: true }).valid, false);
    assert.equal(validateStep4ExamDate({ examDate: '2028--', today, isJlpt: true }).valid, false);
    assert.equal(validateStep4ExamDate({ examDate: '2027-08-15', today, isJlpt: false }).valid, true);
  });

  it('computes furthest reachable step cleanly without permitting skipped required steps', () => {
    const step1Only = computeStepValidity({
      activeCertId: 1,
      activeLevelId: null,
      timeMode: 'fixed',
      minutes: 30,
      examDate: '',
      today,
      isJlpt: true,
    });
    assert.equal(getFurthestAccessibleStep(step1Only), 1);

    const allValid = computeStepValidity({
      activeCertId: 1,
      activeLevelId: 3,
      timeMode: 'fixed',
      minutes: 45,
      examDate: '',
      today,
      isJlpt: true,
    });
    assert.equal(getFurthestAccessibleStep(allValid), 4);
    assert.deepEqual([0, 1, 2, 3, 4].map((i) => computeWizardProgressPercent(i)), [20, 40, 60, 80, 100]);
  });

  it('formats study summary text and JLPT exam session headlines deterministically', () => {
    assert.equal(formatStudySummaryText({ timeMode: 'fixed', minutes: 45 }), '45');
    assert.equal(formatStudySummaryText({ timeMode: 'range', minutes: 30, maxMinutes: 60 }), '30–60');
    assert.deepEqual(formatExamSessionHeadline('2027-07-04'), {
      monthKey: 'Tháng 7',
      year: '2027',
      dateText: '04/07/2027',
      isJlptSession: true,
    });
    assert.equal(formatExamSessionHeadline(''), null);
  });
});

describe('Onboarding UI components & motion tokens compliance', () => {
  it('defines reduced-motion disabled animations for onboarding wizard transitions', () => {
    const tokens = readSrc('src/styles/tokens.css');
    assert.match(tokens, /\.rp-onboarding-step-forward/);
    assert.match(tokens, /\.rp-onboarding-step-backward/);
    assert.match(tokens, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rp-onboarding-step-forward/);
  });

  it('preserves API queries, submission contracts, skip flow, and accessible stepper landmarks', () => {
    const page = readSrc('src/pages/auth/OnboardingSurvey.jsx');
    const stepper = readSrc('src/features/auth/components/OnboardingStepper.jsx');
    const nav = readSrc('src/features/auth/components/OnboardingWizardNav.jsx');

    assert.match(page, /useCertificateTypesQuery\(\)/);
    assert.match(page, /useCertificateLevelsQuery\(activeCertId\)/);
    assert.match(page, /useSetJlptGoalMutation\(\)/);
    assert.match(page, /buildLearningGoal\(/);
    assert.match(page, /patchSession\(\{\s*skipOnboarding:\s*true\s*\}\)/);
    assert.match(stepper, /role="progressbar"/);
    assert.match(stepper, /aria-current=\{isActive \? 'step' : undefined\}/);
    assert.match(nav, /onPrevious/);
    assert.match(nav, /onNext/);
  });
});
