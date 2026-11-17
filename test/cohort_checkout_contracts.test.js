import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '../src/api/client.js';
import { enrollCohort, reconcileCoursePayment } from '../src/api/studyCourses.js';

describe('Cohort checkout canonical contracts', () => {
  const originalGet = api.get;
  const originalPost = api.post;
  let last = null;

  before(() => {
    api.get = async (url, config) => { last = { method: 'GET', url, config }; return { isSuccess: true, result: [] }; };
    api.post = async (url, body, config) => { last = { method: 'POST', url, body, config }; return { isSuccess: true, result: {} }; };
  });
  after(() => { api.get = originalGet; api.post = originalPost; });

  it('enrollCohort posts only the idempotency key (never price or amount)', async () => {
    await enrollCohort(7, { idempotencyKey: 'k-1' });
    assert.equal(last.method, 'POST');
    assert.equal(last.url, '/study-courses/cohorts/7/enroll');
    assert.deepEqual(last.body, { idempotencyKey: 'k-1' });
    assert.equal('price' in last.body, false);
    assert.equal('amount' in last.body, false);
  });

  it('reconcileCoursePayment posts to the canonical reconcile route', async () => {
    await reconcileCoursePayment(15);
    assert.equal(last.method, 'POST');
    assert.equal(last.url, '/study-courses/15/payment/reconcile');
  });
});
