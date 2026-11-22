import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePasswordSecurity } from '@/features/auth/utils/passwordStrength.js';

describe('evaluatePasswordSecurity', () => {
  it('evaluates 5 realistic strength levels without trimming', () => {
    const empty = evaluatePasswordSecurity('');
    assert.equal(empty.score, 0);
    assert.equal(empty.policyValid, false);

    const tooShort = evaluatePasswordSecurity('abc12');
    assert.equal(tooShort.score, 1);
    assert.equal(tooShort.label, 'Rất yếu');
    assert.equal(tooShort.policyValid, false);

    const common = evaluatePasswordSecurity('password123');
    assert.equal(common.score, 1);
    assert.equal(common.checks.notCommonOrPredictable, false);
    assert.equal(common.policyValid, false);

    const sequence = evaluatePasswordSecurity('qwerty');
    assert.equal(sequence.score, 1);
    assert.equal(sequence.policyValid, false);

    const weak = evaluatePasswordSecurity('ab7xk2');
    assert.equal(weak.score, 2);
    assert.equal(weak.label, 'Yếu');
    assert.equal(weak.policyValid, true);

    const medium = evaluatePasswordSecurity('koko78m9');
    assert.equal(medium.score, 3);
    assert.equal(medium.label, 'Trung bình');
    assert.equal(medium.policyValid, true);

    const strong = evaluatePasswordSecurity('SakuraSky92');
    assert.equal(strong.score, 4);
    assert.equal(strong.label, 'Mạnh');
    assert.equal(strong.policyValid, true);

    const veryStrongPassphrase = evaluatePasswordSecurity('sakura morning train tokyo 94');
    assert.equal(veryStrongPassphrase.score, 5);
    assert.equal(veryStrongPassphrase.label, 'Rất mạnh');
    assert.equal(veryStrongPassphrase.policyValid, true);
  });

  it('rejects personal info, blank-only, and same-as-current passwords, and accepts Unicode without trimming', () => {
    const personal = evaluatePasswordSecurity('author1test9', { email: 'author1@rikipath.local' });
    assert.equal(personal.checks.notPersonal, false);
    assert.equal(personal.policyValid, false);

    const spacesOnly = evaluatePasswordSecurity('        ');
    assert.equal(spacesOnly.policyValid, false);

    const sameCurrent = evaluatePasswordSecurity('Author2@123', { currentPassword: 'Author2@123' });
    assert.equal(sameCurrent.checks.differentFromCurrent, false);
    assert.equal(sameCurrent.policyValid, false);

    const unicodePwd = evaluatePasswordSecurity('さくら🌸Nihon92 ');
    assert.equal(unicodePwd.policyValid, true);
    assert.ok(unicodePwd.score >= 4);
  });
});
