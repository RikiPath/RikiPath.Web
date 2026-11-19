import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTH_EXPIRED_MESSAGE,
  describeApiError,
  INTERNAL_MESSAGE,
  isSafeUserMessage,
  NETWORK_MESSAGE,
  paymentStateMessage,
} from '@/api/apiErrors.js';

// Mô phỏng Error do src/api/client.js ném ra.
function apiError({ status, errorCode, errorMessage, correlationId } = {}) {
  const err = new Error(errorMessage || 'x');
  err.status = status;
  err.errorCode = errorCode || null;
  err.data = { isSuccess: false, statusCode: status, errorCode, errorMessage };
  err.correlationId = correlationId || null;
  err.isNetwork = false;
  return err;
}

describe('describeApiError', () => {
  it('MENTOR_SCHEDULE_CONFLICT shows the server-provided detailed Vietnamese message', () => {
    const msg = 'Bạn đã có lịch dạy lớp JLPT N5-A từ 19:00 đến 20:30 vào thứ 4 (20/11/2026). Vui lòng chọn khung giờ khác.';
    const info = describeApiError(apiError({ status: 409, errorCode: 'MENTOR_SCHEDULE_CONFLICT', errorMessage: msg }));
    assert.equal(info.code, 'MENTOR_SCHEDULE_CONFLICT');
    assert.equal(info.message, msg);
    assert.equal(info.offline, false);
    assert.equal(info.authExpired, false);
  });

  it('MENTOR_SCHEDULE_CONFLICT falls back to the mapped message when the server text is technical', () => {
    const info = describeApiError(
      apiError({ status: 409, errorCode: 'MENTOR_SCHEDULE_CONFLICT', errorMessage: 'System.InvalidOperationException at Foo.Bar()' })
    );
    assert.match(info.message, /trùng với lịch dạy/);
    assert.doesNotMatch(info.message, /Exception/);
  });

  it('COHORT_FULL maps to the contract message', () => {
    const info = describeApiError(apiError({ status: 409, errorCode: 'COHORT_FULL', errorMessage: 'Cohort is full' }));
    assert.equal(info.message, 'Lớp đã đủ 4 học viên. Vui lòng chọn lớp khác.');
    assert.equal(info.retryable, false);
  });

  it('PaidUnderReview text matches the contract', () => {
    const expected = 'Giao dịch đã được ghi nhận nhưng chưa thể hoàn tất ghi danh. Bộ phận quản trị sẽ xem xét yêu cầu của bạn.';
    assert.equal(paymentStateMessage('PaidUnderReview'), expected);
    assert.equal(describeApiError(apiError({ status: 409, errorCode: 'PaidUnderReview' })).message, expected);
    assert.equal(
      paymentStateMessage('AwaitingPayment'),
      'Thanh toán đang được xác minh. Vui lòng kiểm tra trạng thái giao dịch.'
    );
    assert.equal(
      paymentStateMessage('Expired'),
      'Thời gian giữ chỗ đã hết. Vui lòng kiểm tra lại tình trạng lớp trước khi thanh toán.'
    );
  });

  it('network error / timeout without a response is offline + retryable', () => {
    const net = new Error('Không kết nối được API. Kiểm tra backend đang chạy tại cổng 5265.');
    net.isNetwork = true;
    const info = describeApiError(net);
    assert.equal(info.offline, true);
    assert.equal(info.retryable, true);
    assert.equal(info.message, NETWORK_MESSAGE);

    const axiosLike = Object.assign(new Error('timeout of 20000ms exceeded'), { code: 'ECONNABORTED' });
    assert.equal(describeApiError(axiosLike).offline, true);
    assert.equal(describeApiError(axiosLike).message, NETWORK_MESSAGE);
  });

  it('401 marks the session as expired', () => {
    const info = describeApiError(apiError({ status: 401, errorMessage: 'Unauthorized' }));
    assert.equal(info.authExpired, true);
    assert.equal(info.message, AUTH_EXPIRED_MESSAGE);
    assert.equal(info.offline, false);
  });

  it('500 INTERNAL_ERROR keeps user copy clean and preserves correlation id for support diagnostics', () => {
    const info = describeApiError(
      apiError({
        status: 500,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'Npgsql.PostgresException: 23505 duplicate key\n   at RikiPath.Services.Foo()',
        correlationId: 'abc-123',
      })
    );
    assert.equal(info.code, 'INTERNAL_ERROR');
    assert.equal(info.state, 'server-error');
    assert.equal(info.retryable, true);
    assert.equal(info.message, INTERNAL_MESSAGE);
    assert.doesNotMatch(info.message, /abc-123/);
    assert.doesNotMatch(info.message, /Npgsql|Exception|at RikiPath/);
    assert.equal(info.correlationId, 'abc-123');
    assert.match(info.referenceText, /abc-123/);
    assert.match(info.messageWithReference, /abc-123/);

    const bare = describeApiError(apiError({ status: 500, errorMessage: 'NullReferenceException' }));
    assert.equal(bare.message, INTERNAL_MESSAGE);
    assert.equal(bare.referenceText, null);
  });

  it('unknown codes fall back to a short safe server message, otherwise to a generic one', () => {
    assert.equal(
      describeApiError(apiError({ status: 422, errorCode: 'SOMETHING_NEW', errorMessage: 'Vui lòng nhập nội dung.' })).message,
      'Vui lòng nhập nội dung.'
    );
    const technical = describeApiError(apiError({ status: 422, errorCode: 'SOMETHING_NEW', errorMessage: '{"type":"https://tools.ietf.org"}' }));
    assert.doesNotMatch(technical.message, /ietf|\{/);
  });

  it('isSafeUserMessage rejects stack traces and long text', () => {
    assert.equal(isSafeUserMessage('Lớp đã đóng ghi danh.'), true);
    assert.equal(isSafeUserMessage('Error\n    at foo (bar.js:1:1)'), false);
    assert.equal(isSafeUserMessage('a'.repeat(400)), false);
    assert.equal(isSafeUserMessage(null), false);
  });
});
