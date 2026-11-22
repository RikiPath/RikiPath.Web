import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '@/api/client.js';
import { describeApiError } from '@/api/apiErrors.js';
import { generateHomeworkAiDraft, gradeHomeworkAssignment } from '@/features/cohorts/api/cohortApi.js';
import {
  HOMEWORK_SCAN_MAX_BYTES,
  aiDraftNotice,
  buildGradePayload,
  validateHomeworkScanFile,
} from '@/features/homework/utils/homeworkModel.js';

// Hợp đồng Backend sau tích hợp PR #70: AI lỗi → 502/503 + HOMEWORK_AI_DRAFT_UNAVAILABLE; công bố cần điểm 0–100.
describe('PR #70 homework contract (Web)', () => {
  const originalPost = api.post;
  let next = null;
  let lastRequest = null;
  before(() => {
    api.post = async (url, body) => {
      lastRequest = { url, body };
      if (next instanceof Error || next?.status) throw next;
      return { result: next };
    };
  });
  after(() => { api.post = originalPost; });

  it('AI draft success keeps the server result and marks it available', async () => {
    next = { submissionId: 7, score: 81.5, feedback: 'Tốt' };
    const r = await generateHomeworkAiDraft(55);
    assert.equal(lastRequest.url, '/homework/55/ai-draft');
    assert.equal(r.available, true);
    assert.equal(r.score, 81.5);
    assert.equal(aiDraftNotice(r), 'Đã cập nhật gợi ý nháp AI cho Giáo viên.');
  });

  it('AI/OCR outage is a handled outcome with the server reason, not a thrown error', async () => {
    next = { status: 502, data: { errorCode: 'HOMEWORK_AI_DRAFT_UNAVAILABLE', errorMessage: 'AI đọc ảnh chưa sẵn sàng. Mentor có thể chấm trực tiếp.' } };
    const r = await generateHomeworkAiDraft(56);
    assert.equal(r.available, false);
    assert.match(r.reason, /AI đọc ảnh chưa sẵn sàng/);
    assert.match(aiDraftNotice(r), /vẫn có thể chấm trực tiếp/);
  });

  it('other AI-draft errors still throw (e.g. forbidden mentor)', async () => {
    next = { status: 403, data: { errorMessage: 'Chỉ mentor được tạo gợi ý chấm bài.' } };
    await assert.rejects(() => generateHomeworkAiDraft(57));
  });

  it('stale submission code maps to a reload message', () => {
    const info = describeApiError({ status: 409, data: { errorCode: 'HOMEWORK_SUBMISSION_CHANGED' } });
    assert.match(info.message, /tải lại/);
  });

  it('grade payload requires a 0–100 score and 1–2000 char feedback', async () => {
    assert.match(buildGradePayload({ passed: true, score: '', feedback: 'Tốt' }).error, /điểm từ 0 đến 100/);
    assert.match(buildGradePayload({ passed: true, score: 101, feedback: 'Tốt' }).error, /điểm từ 0 đến 100/);
    assert.match(buildGradePayload({ passed: true, score: 80, feedback: '  ' }).error, /nhận xét/);
    assert.match(buildGradePayload({ passed: true, score: 80, feedback: 'x'.repeat(2001) }).error, /2000/);
    const ok = buildGradePayload({ passed: false, score: '72.5', feedback: ' Cần luyện trợ từ. ' });
    assert.deepEqual(ok.payload, { passed: false, score: 72.5, feedback: 'Cần luyện trợ từ.', publishAiDraft: false });
    next = { passed: false, score: 72.5, feedback: 'Cần luyện trợ từ.' };
    await gradeHomeworkAssignment(55, ok.payload);
    assert.equal(lastRequest.url, '/homework/55/grade');
    assert.equal(lastRequest.body.score, 72.5);
  });

  it('scan file accepts PNG/JPG/PDF up to 10 MB', () => {
    assert.equal(validateHomeworkScanFile(null), null);
    assert.equal(validateHomeworkScanFile({ type: 'application/pdf', size: 1024 }), null);
    assert.equal(validateHomeworkScanFile({ type: 'image/jpeg', size: HOMEWORK_SCAN_MAX_BYTES }), null);
    assert.match(validateHomeworkScanFile({ type: 'image/png', size: HOMEWORK_SCAN_MAX_BYTES + 1 }), /10 MB/);
    assert.match(validateHomeworkScanFile({ type: 'image/gif', size: 10 }), /PNG\/JPG/);
  });
});
