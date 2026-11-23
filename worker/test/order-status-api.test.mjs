import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { neonApi } from '../src/neon-api.js';

test('status API follows the existing database rules for delayed orders', async t => {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA');
  const jwk = { ...await exportJWK(publicKey), kid: 'status-fixture', alg: 'EdDSA' };
  const base = 'https://status-auth.example.test';
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'EdDSA', kid: jwk.kid })
    .setSubject('fixture-owner').setIssuer(base).setAudience(base).setIssuedAt().setExpirationTime('1m').sign(privateKey);
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(String(url), base + '/.well-known/jwks.json');
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json' } });
  });
  for (const [previous, next, expected] of [
    ['pending', 'delayed', 200], ['delayed', 'accepted', 200], ['delayed', 'rejected', 200],
    ['delayed', 'preparing', 409], ['delayed', 'ready_for_collection', 409],
    ['delayed', 'out_for_delivery', 409], ['completed', 'pending', 409]
  ]) {
    const statements = [];
    const db = { query: async sql => {
      statements.push(sql);
      if (sql.startsWith('SELECT 1 FROM kfh_admins')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('SELECT o.id,o.status')) return { rows: [{
        id: '00000000-0000-4000-8000-000000000001', status: previous,
        fulfillment_type: 'pickup', customer_subject: 'fixture-customer'
      }] };
      return { rows: [], rowCount: 1 };
    } };
    const response = await neonApi(new Request('https://worker.example.test/api/owner/orders/00000000-0000-4000-8000-000000000001/status', {
      method: 'PATCH', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ status: next, note: 'Fixture status' })
    }), { NEON_AUTH_URL: base }, async (_, callback) => callback(db));
    assert.equal(response.status, expected, `${previous} → ${next}`);
    assert.equal(statements.at(-1), expected === 200 ? 'COMMIT' : 'ROLLBACK');
    if (expected === 409) assert.ok(!statements.some(sql => sql.startsWith('UPDATE') || sql.startsWith('INSERT')));
  }
});
