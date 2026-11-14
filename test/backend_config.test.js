import assert from 'node:assert/strict';
import test from 'node:test';
import { apiBase, hubEndpoint, resolveApiBase } from '../src/config/backend.js';

test('API base defaults to same-origin proxy without a hard-coded tunnel', () => {
  assert.equal(apiBase, '/api');
  assert.equal(resolveApiBase(undefined), '/api');
  assert.equal(hubEndpoint('/hubs/mentor-chat'), '/hubs/mentor-chat');
});

test('configured API base is normalized without changing its origin', () => {
  assert.equal(resolveApiBase(' https://api.example.com/api/ '), 'https://api.example.com/api');
});
