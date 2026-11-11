import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, encodeAudioEvent, decodeEventStream, Pcm16Resampler, TranscribeTranscript } from '../src/utils/transcribeEventStream.js';
import { api } from '../src/api/client.js';
import { createSpeechStreamingSession } from '../src/api/speechApi.js';

test('AWS event stream uses standard CRC32 and encodes PCM with the required headers', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const frame = encodeAudioEvent(new Uint8Array([1, 2, 3, 4]));
  const view = new DataView(frame.buffer);
  assert.equal(view.getUint32(0), frame.length);
  assert.equal(view.getUint32(8), crc32(frame.subarray(0, 8)));
  const headersEnd = 12 + view.getUint32(4);
  assert.deepEqual([...frame.subarray(headersEnd, -4)], [1, 2, 3, 4]);
  const headers = new TextDecoder().decode(frame.subarray(12, headersEnd));
  assert.match(headers, /AudioEvent/); assert.match(headers, /application\/octet-stream/);
  assert.equal(encodeAudioEvent().length, headersEnd + 4);
});

test('decoder rejects corrupted/truncated frames and accepts multiple event frames', () => {
  const payload = new TextEncoder().encode('{"Transcript":{"Results":[]}}');
  const frame = encodeAudioEvent(payload);
  assert.equal(decodeEventStream(frame)[0].payload.Transcript.Results.length, 0);
  const two = new Uint8Array(frame.length * 2); two.set(frame); two.set(frame, frame.length);
  assert.equal(decodeEventStream(two).length, 2);
  const corrupted = frame.slice(); corrupted[20] ^= 1;
  assert.throws(() => decodeEventStream(corrupted), /checksum/);
  assert.throws(() => decodeEventStream(frame.subarray(0, -1)));
});

test('PCM conversion is signed little endian and clamps microphone samples', () => {
  const bytes = new Pcm16Resampler(16000).encode(new Float32Array([-2, -1, 0, 1, 2]));
  const view = new DataView(bytes.buffer);
  assert.deepEqual(Array.from({ length: 5 }, (_, i) => view.getInt16(i * 2, true)), [-32768, -32768, 0, 32767, 32767]);
});

test('resampling maintains the correct sample count across 48/44.1kHz microphone chunks', () => {
  for (const rate of [48000, 44100]) {
    const resampler = new Pcm16Resampler(rate);
    let samples = 0;
    for (let offset = 0; offset < rate; offset += 128)
      samples += resampler.encode(new Float32Array(Math.min(128, rate - offset)).fill(0.5)).length / 2;
    assert.equal(samples, 16000);
  }
});

const result = (id, text, partial, start = 0) => ({ ResultId: id, Alternatives: [{ Transcript: text }], IsPartial: partial, StartTime: start });
const event = (...results) => ({ Transcript: { Results: results } });
test('partial results are replaced by final text without duplication or stale partials', () => {
  const transcript = new TranscribeTranscript();
  assert.equal(transcript.apply(event(result('a', '日本', true))).interimTranscript, '日本');
  assert.equal(transcript.apply(event(result('a', '日本語', false))).transcript, '日本語');
  assert.deepEqual(transcript.apply(event(result('a', '日本語', false), result('a', '日本', true))), { transcript: '日本語', interimTranscript: '' });
  assert.equal(transcript.apply(event(result('b', 'です', false, 1))).transcript, '日本語 です');
});

test('final and partial results in one AWS event remain ordered and consistent', () => {
  const transcript = new TranscribeTranscript();
  assert.deepEqual(transcript.apply(event(result('b', '二', true, 2), result('a', '一', false, 1))), { transcript: '一', interimTranscript: '二' });
  assert.deepEqual(transcript.apply(event(result('b', '二', false, 2))), { transcript: '一 二', interimTranscript: '' });
});

test('both Web speech entry points request an authenticated Amazon session via the shared API', async () => {
  const old = api.post;
  try {
    api.post = async (url) => {
      assert.equal(url, '/Speech/streaming-session');
      return { result: { provider: 'AmazonTranscribe', sampleRate: 16000, language: 'ja-JP' } };
    };
    assert.equal((await createSpeechStreamingSession()).provider, 'AmazonTranscribe');
  } finally { api.post = old; }
});
