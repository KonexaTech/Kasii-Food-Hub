import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const authUrl = 'https://auth.example.test/neondb/auth';
const request = () => new Request('https://worker.example.test/password-reset/request', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'fixture@example.test' })
});

for (const alias of ['NEON_AUTH_URL', 'NEON_AUTH_BASE_URL']) {
  test(`password recovery uses ${alias} for both reset pages and submission`, async t => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response('{}', { status: 200 });
    });
    const env = { NEON_ONLY_MODE: 'true', [alias]: authUrl + '/' };
    const page = await worker.fetch(new Request('https://worker.example.test/password-reset'), env);
    assert.match(await page.text(), /createAuthClient\('https:\/\/auth.example.test\/neondb\/auth'\)/);
    const result = await worker.fetch(request(), env);
    assert.equal(result.status, 200);
    assert.deepEqual(calls, [{ url: authUrl + '/request-password-reset', body: {
      email: 'fixture@example.test', redirectTo: 'https://worker.example.test/password-reset'
    } }]);
  });
}

test('upstream recovery connection failure returns a generic retryable response', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw Error('private upstream failure'); });
  const result = await worker.fetch(request(), { NEON_ONLY_MODE: 'true', NEON_AUTH_BASE_URL: authUrl });
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), { error: 'Password reset service unavailable' });
});
