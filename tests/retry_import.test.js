// Lazy chunk loading: transient failures retry once, real errors surface, no auto-reload.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isChunkLoadError, retryImport } from '@/app/retryImport.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const noWait = () => Promise.resolve();

describe('retryImport', () => {
  it('recognises Vite / browser chunk-load failures', () => {
    assert.ok(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: http://localhost/src/pages/x.jsx')));
    assert.ok(isChunkLoadError(new Error('Outdated Optimize Dep')));
    assert.ok(isChunkLoadError(new Error('Loading chunk 42 failed.')));
    assert.ok(!isChunkLoadError(new ReferenceError('foo is not defined')));
  });

  it('retries a transient chunk failure once and then succeeds', async () => {
    let calls = 0;
    const mod = await retryImport(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch dynamically imported module');
      return { default: 'Page' };
    }, { wait: noWait });
    assert.equal(mod.default, 'Page');
    assert.equal(calls, 2);
  });

  it('does not retry real code errors', async () => {
    let calls = 0;
    await assert.rejects(retryImport(async () => { calls += 1; throw new ReferenceError('x is not defined'); }, { wait: noWait }), ReferenceError);
    assert.equal(calls, 1);
  });

  it('gives up after one retry so the "Đã có phiên bản mới" screen can offer a manual reload', async () => {
    let calls = 0;
    await assert.rejects(retryImport(async () => { calls += 1; throw new TypeError('Failed to fetch dynamically imported module'); }, { wait: noWait }));
    assert.equal(calls, 2);
  });

  it('every lazy page in App.jsx goes through the retry and nothing reloads automatically', () => {
    const app = fs.readFileSync(path.join(ROOT, 'src/app/App.jsx'), 'utf8');
    assert.doesNotMatch(app, /lazy\(\(\) => import\(/);
    assert.match(app, /const page = \(loader\) => lazy\(\(\) => retryImport\(loader\)\);/);
    const retry = fs.readFileSync(path.join(ROOT, 'src/app/retryImport.js'), 'utf8');
    assert.doesNotMatch(retry.replace(/^\/\/.*$/gm, ''), /location\.reload/);
  });

  it('hanzi-writer is pre-bundled so the first /kanji-writing visit does not re-optimize deps', () => {
    const config = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
    assert.match(config, /optimizeDeps:\s*\{\s*include:\s*\[[^\]]*'hanzi-writer'/);
  });
});
