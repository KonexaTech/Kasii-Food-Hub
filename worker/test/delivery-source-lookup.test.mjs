import { test } from "node:test";
import assert from "node:assert/strict";
import { deliveryOrderLookup } from "../src/delivery-source-orders.js";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const token = "t".repeat(48);
const env = { DELIVERY_SOURCE_LOOKUP_ENABLED: "true", DELIVERY_LOOKUP_TOKEN: token,
  NEON_AUTH_URL: "https://neon-auth.example.test" };
const now = Date.parse("2026-11-23T12:00:00Z");
const valid = () => ({
  id, customer_subject: "customer-1", owner_subject: "owner-1",
  fulfillment_type: "delivery", status: "ready_for_collection", approved: true,
  delivery_cents: 1500, pickup_lat: -27.76, pickup_lon: 30.03,
  dropoff_lat: -27.77, dropoff_lon: 30.04,
  route_distance_m: 1700, weight_grams: 2000, currency: "ZAR",
  fee_cents: 1500, payout_cents: 1200, payment_verified: true,
  cash_on_delivery_approved: false, dispatch_ready: true,
  approved_by: "trusted-operator", approved_at: "2026-11-23T10:00:00Z",
  not_before: null
});
const req = (authorization = "Bearer " + token) =>
  new Request("https://app.example.test/internal/delivery/orders/" + id,
    { headers: { authorization } });
async function call(row = valid(), options = {}) {
  let reads = 0;
  const withDb = async (_, fn) => fn({ query: async (sql, params) => {
    reads++;
    assert.match(sql, /kfh_delivery_quotes/);
    assert.deepEqual(params, [id]);
    return { rows: row ? [row] : [] };
  } });
  const response = await deliveryOrderLookup(
    options.request || req(), options.env || env, withDb, now);
  return { response, body: await response.json(), reads };
}
test("kasii order lookup is OFF without explicit configuration and performs no SQL read", async () => {
  const off = await call(valid(), { env: { ...env, DELIVERY_SOURCE_LOOKUP_ENABLED: "false" } });
  assert.equal(off.response.status, 503);
  assert.equal(off.reads, 0);
  const weak = await call(valid(), { env: { ...env, DELIVERY_LOOKUP_TOKEN: "short" } });
  assert.equal(weak.response.status, 503);
  assert.equal(weak.reads, 0);
});
test("kasii private token required; cannot query DB with invalid bearer", async () => {
  for (const secret of ["", "Bearer " + "x".repeat(48), "Token " + token]) {
    const r = await call(valid(), { request: req(secret) });
    assert.equal(r.response.status, 401);
    assert.equal(r.reads, 0);
  }
});
test("kasii validated trusted order returns exact-source motorcycle job and no personal contact", async () => {
  const r = await call();
  assert.equal(r.response.status, 200);
  assert.equal(r.reads, 1);
  assert.deepEqual(r.body.delivery, {
    source_app: "kasii", source_order_id: id, delivery_eligible: true,
    fulfillment: "delivery", status: "ready", currency: "ZAR",
    payment_verified: true, cash_on_delivery_approved: false,
    customer_subject: "kasii:https://neon-auth.example.test:customer-1",
    shop_subject: "kasii:https://neon-auth.example.test:owner-1",
    pickup_lat: -27.76, pickup_lon: 30.03,
    dropoff_lat: -27.77, dropoff_lon: 30.04,
    route_distance_m: 1700, weight_grams: 2000,
    required_vehicle: "motorcycle", fee_cents: 1500, payout_cents: 1200
  });
  assert(!("customer_phone" in r.body.delivery));
  assert(!("delivery_address" in r.body.delivery));
});
test("kasii lookup denies missing quote and invalid, unapproved, unpaid, early or mismatched snapshots", async () => {
  assert.equal((await call(null)).response.status, 404);
  for (const patch of [
    { approved: false }, { fulfillment_type: "pickup" }, { status: "pending" }, { status: "preparing" },
    { status: "completed" }, { dispatch_ready: false }, { payment_verified: false },
    { payment_verified: false, cash_on_delivery_approved: false },
    { fee_cents: 100 }, { payout_cents: 50000 },
    { currency: "USD" }, { route_distance_m: 0 },
    { pickup_lat: 91 }, { customer_subject: "customer\nbad" },
    { approved_by: "" }, { approved_at: "2026-11-24T10:00:00Z" },
    { not_before: "2026-11-24T12:00:00Z" }
  ]) {
    const r = await call({ ...valid(), ...patch });
    assert.equal(r.response.status, 409, JSON.stringify(patch));
  }
});
test("kasii lookup fails closed when quote schema/DB access unavailable", async () => {
  const response = await deliveryOrderLookup(req(), env,
    async () => { throw Error("private database secret"); }, now);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, "delivery_lookup_unavailable");
  assert(!JSON.stringify(body).includes("private database secret"));
});
