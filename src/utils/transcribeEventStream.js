const encoder = new TextEncoder();
const decoder = new TextDecoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function stringHeader(name, value) {
  const key = encoder.encode(name), data = encoder.encode(value);
  const bytes = new Uint8Array(key.length + data.length + 4);
  bytes[0] = key.length; bytes.set(key, 1); bytes[key.length + 1] = 7;
  new DataView(bytes.buffer).setUint16(key.length + 2, data.length, false);
  bytes.set(data, key.length + 4);
  return bytes;
}
export function encodeAudioEvent(pcm = new Uint8Array()) {
  const headers = [stringHeader(':content-type', 'application/octet-stream'), stringHeader(':event-type', 'AudioEvent'), stringHeader(':message-type', 'event')];
  const headerLength = headers.reduce((total, h) => total + h.length, 0);
  const message = new Uint8Array(16 + headerLength + pcm.length), view = new DataView(message.buffer);
  view.setUint32(0, message.length, false); view.setUint32(4, headerLength, false);
  view.setUint32(8, crc32(message.subarray(0, 8)), false);
  let offset = 12;
  for (const header of headers) { message.set(header, offset); offset += header.length; }
  message.set(pcm, offset);
  view.setUint32(message.length - 4, crc32(message.subarray(0, -4)), false);
  return message;
}
export function decodeEventStream(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input), events = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (bytes.length - offset < 16) throw new Error('Khung nhận dạng không đầy đủ.');
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset);
    const length = view.getUint32(0, false), headerLength = view.getUint32(4, false);
    if (length < 16 || length > 1024 * 1024 || offset + length > bytes.length || headerLength > length - 16) throw new Error('Khung nhận dạng không hợp lệ.');
    const frame = bytes.subarray(offset, offset + length);
    if (view.getUint32(8, false) !== crc32(frame.subarray(0, 8)) || view.getUint32(length - 4, false) !== crc32(frame.subarray(0, -4))) throw new Error('Dữ liệu nhận dạng bị lỗi checksum.');
    const headers = {}; let position = 12; const end = 12 + headerLength;
    while (position < end) {
      const keyLength = view.getUint8(position++);
      if (position + keyLength + 3 > end) throw new Error('Header nhận dạng không hợp lệ.');
      const name = decoder.decode(frame.subarray(position, position + keyLength)); position += keyLength;
      if (view.getUint8(position++) !== 7) throw new Error('Kiểu header nhận dạng không hỗ trợ.');
      const valueLength = view.getUint16(position, false); position += 2;
      if (position + valueLength > end) throw new Error('Header nhận dạng bị cắt.');
      headers[name] = decoder.decode(frame.subarray(position, position + valueLength)); position += valueLength;
    }
    events.push({ headers, payload: JSON.parse(decoder.decode(frame.subarray(end, length - 4)) || '{}') });
    offset += length;
  }
  return events;
}
export class Pcm16Resampler {
  constructor(inputRate, outputRate = 16000) {
    if (inputRate < outputRate) throw new Error('Tần số micro không hỗ trợ.');
    this.ratio = inputRate / outputRate; this.position = 0; this.sum = 0;
  }
  encode(input) {
    const samples = [];
    for (const value of input) {
      let remaining = 1;
      while (remaining > 1e-8) {
        const weight = Math.min(remaining, this.ratio - this.position);
        this.sum += value * weight; this.position += weight; remaining -= weight;
        if (this.position >= this.ratio - 1e-8) {
          const sample = Math.max(-1, Math.min(1, this.sum / this.ratio));
          samples.push(Math.round(sample * (sample < 0 ? 32768 : 32767)));
          this.sum = 0; this.position = 0;
        }
      }
    }
    const bytes = new Uint8Array(samples.length * 2), view = new DataView(bytes.buffer);
    samples.forEach((sample, index) => view.setInt16(index * 2, sample, true));
    return bytes;
  }
}
export class TranscribeTranscript {
  constructor() { this.finals = new Map(); this.partials = new Map(); }
  apply(payload) {
    for (const result of payload.Transcript?.Results || []) {
      const text = result.Alternatives?.[0]?.Transcript || '';
      if (!text) continue;
      const entry = { text, start: result.StartTime || 0 };
      if (result.IsPartial) { if (!this.finals.has(result.ResultId)) this.partials.set(result.ResultId, entry); }
      else { this.finals.set(result.ResultId, entry); this.partials.delete(result.ResultId); }
    }
    const join = map => [...map.values()].sort((a, b) => a.start - b.start).map(x => x.text).join(' ');
    return { transcript: join(this.finals), interimTranscript: join(this.partials) };
  }
}
