import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/api/client.js';
import { saveLearnerEssayDraft } from '../src/api/learnerEssayApi.js';

test('new typed essay is submitted as multipart without requiring an image', async () => {
  const previous = api.request;
  try {
    api.request = async (request) => {
      assert.equal(request.method, 'post');
      assert.equal(request.url, '/learner-essays');
      assert.equal(request.data.get('contentText'), '日本語');
      assert.equal(request.data.has('image'), false);
      assert.equal(request.data.has('originalOcrText'), false);
      return { result: { id: 42, contentText: '日本語' } };
    };
    assert.equal((await saveLearnerEssayDraft({ contentText: '日本語' })).id, 42);
  } finally { api.request = previous; }
});

test('saving a rescanned draft sends its image, OCR baseline and corrected text only on explicit save', async () => {
  const previous = api.request;
  try {
    api.request = async (request) => {
      assert.equal(request.method, 'put');
      assert.equal(request.url, '/learner-essays/42/draft');
      assert.equal(request.data.get('contentText'), 'Corrected text');
      assert.equal(request.data.get('originalOcrText'), 'OCR preview');
      assert.equal(request.data.get('image').type, 'image/png');
      const headers = { 'Content-Type': 'application/json' };
      request.transformRequest[0](request.data, headers);
      assert.equal(headers['Content-Type'], undefined);
      return { result: { id: 42, imageUrl: 'https://storage/new.png' } };
    };
    const saved = await saveLearnerEssayDraft({ id: 42, file: new Blob(['image'], { type: 'image/png' }), contentText: 'Corrected text', originalOcrText: 'OCR preview' });
    assert.equal(saved.id, 42);
    assert.equal(saved.imageUrl, 'https://storage/new.png');
  } finally { api.request = previous; }
});
