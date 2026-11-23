import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTO_SPEECH_COOLDOWN_MS,
  buildContextualSpeechCandidates,
  canTriggerProactiveSpeech,
  COMPANION_REACTIONS,
  COMPANION_STATES,
  isCompanionSuppressedRoute,
  selectNonRepeatingLine,
} from '../src/features/companion/companionMachine.js';
import {
  askSakuraCompanion,
  registerCompanionChatProvider,
} from '../src/features/companion/companionAiAdapter.js';

describe('Sakura Fox Interactive AI Companion', () => {
  it('defines all required non-conflicting character states and reactions', () => {
    assert.deepEqual(Object.values(COMPANION_STATES).sort(), [
      'celebrating',
      'curious',
      'dragging',
      'encouraging',
      'excited',
      'happy',
      'hover',
      'idle',
      'landing',
      'listening',
      'sleepy',
      'speaking',
      'studying',
      'thinking',
    ]);
    assert.deepEqual(Object.values(COMPANION_REACTIONS).sort(), [
      'jumping',
      'none',
      'waving',
    ]);
  });

  it('enforces exam-taking suppression rules and active attempt guard', () => {
    assert.equal(isCompanionSuppressedRoute({ pathname: '/placement/exam/' }), true);
    assert.equal(isCompanionSuppressedRoute({ pathname: '/app/placement-test', examActive: false }), false);
    assert.equal(isCompanionSuppressedRoute({ pathname: '/app/placement-test', examActive: true }), true);
    assert.equal(isCompanionSuppressedRoute({ pathname: '/mock-tests/', search: '?attemptId=55' }), true);
    assert.equal(isCompanionSuppressedRoute({ pathname: '/mock-tests/', search: '' }), false);
    assert.equal(isCompanionSuppressedRoute({ pathname: '/lessons/', examActive: true }), true);
    assert.equal(isCompanionSuppressedRoute({ pathname: '/app/' }), false);
  });

  it('enforces rate-limited proactive speech and mute controls', () => {
    const now = 1_000_000;
    assert.equal(canTriggerProactiveSpeech({ mutedProactive: true, suppressed: false, now, lastSpokenAt: 0 }), false);
    assert.equal(canTriggerProactiveSpeech({ mutedProactive: false, suppressed: true, now, lastSpokenAt: 0 }), false);
    assert.equal(canTriggerProactiveSpeech({ mutedProactive: false, suppressed: false, now, lastSpokenAt: 0 }), true);
    assert.equal(
      canTriggerProactiveSpeech({ mutedProactive: false, suppressed: false, now, lastSpokenAt: now - 60_000 }),
      false,
    );
    assert.equal(
      canTriggerProactiveSpeech({
        mutedProactive: false,
        suppressed: false,
        now,
        lastSpokenAt: now - AUTO_SPEECH_COOLDOWN_MS,
      }),
      true,
    );
  });

  it('builds contextual lines strictly from real backend learner state without inventing stats', () => {
    const withDueSrs = buildContextualSpeechCandidates({
      pathname: '/app',
      stats: { targetLevel: 'N4', streakDays: 5, dueCards: 7, hasPlacementCompleted: true, hasActiveAiPath: false },
    });
    assert.ok(withDueSrs.some((c) => c.id === 'due-srs' && c.text.includes('7 thẻ SRS')));
    assert.ok(withDueSrs.some((c) => c.text.includes('5 ngày')));
    assert.ok(withDueSrs.some((c) => c.id === 'ready-ai-path'));

    const freshUser = buildContextualSpeechCandidates({
      pathname: '/app',
      stats: { targetLevel: null, streakDays: 0, dueCards: 0 },
    });
    assert.ok(!freshUser.some((c) => c.id === 'due-srs'));
    assert.ok(freshUser.some((c) => c.id === 'missing-goal'));
  });

  it('rotates dialogue without immediate repeats', () => {
    const pool = [
      { id: 'a', text: 'One' },
      { id: 'b', text: 'Two' },
      { id: 'c', text: 'Three' },
    ];
    const picked = selectNonRepeatingLine(pool, ['a', 'b']);
    assert.equal(picked.id, 'c');
  });

  it('answers progress checks truthfully and supports custom AI chat provider extension', async () => {
    const honestProgress = await askSakuraCompanion({
      query: 'Kiểm tra tiến độ',
      stats: { targetLevel: 'N3', streakDays: 4, completedExercises: 12, dueCards: 3 },
    });
    assert.ok(honestProgress.text.includes('N3'));
    assert.ok(honestProgress.text.includes('4 ngày'));
    assert.ok(honestProgress.text.includes('12 bài'));
    assert.ok(honestProgress.text.includes('3 thẻ'));

    const emptyProgress = await askSakuraCompanion({
      query: 'Kiểm tra tiến độ',
      stats: {},
    });
    assert.ok(emptyProgress.text.includes('chưa thấy dữ liệu tiến độ'));

    registerCompanionChatProvider(async ({ query }) => ({
      text: `AI Reply: ${query}`,
      state: COMPANION_STATES.SPEAKING,
      actions: [],
    }));
    try {
      const plugged = await askSakuraCompanion({ query: 'Giải thích ngữ pháp ～てみる' });
      assert.equal(plugged.text, 'AI Reply: Giải thích ngữ pháp ～てみる');
    } finally {
      registerCompanionChatProvider(null);
    }
  });
});
