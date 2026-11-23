// Server-only source order lookup for Konexa Delivery. OFF until reviewed
// staging quote schema, private credentials, payment policy and role checks.
// Never infer dispatch cost or payment from a customer's order request.
const source = "kasii";
const prefix = "kfh";
const vehicle = "motorcycle";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = new TextEncoder();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store", "x-content-type-options": "nosniff" }
});
const cleanSubject = value => typeof value === "string" && value.length > 0 &&
  value.length <= 300 && !/[\r\n\0]/.test(value);
function constantTimeToken(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  const a = text.encode(provided), b = text.encode(expected);
  if (b.length < 32 || a.length !== b.length || a.length > 256) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}
const cents = n => Number.isSafeInteger(n) && n >= 0 && n <= 2147483647;
const positive = n => Number.isSafeInteger(n) && n > 0 && n <= 2147483647;
const latitude = n => Number.isFinite(n) && Math.abs(n) <= 90;
const longitude = n => Number.isFinite(n) && Math.abs(n) <= 180;
function authorizedQuote(row, now) {
  if (!row || row.approved !== true || row.fulfillment_type !== "delivery" ||
      !["preparing", "out_for_delivery"].includes(row.status) ||
      row.dispatch_ready !== true || !cleanSubject(row.customer_subject) ||
      !cleanSubject(row.owner_subject) || !cleanSubject(row.approved_by) ||
      !Number.isFinite(Date.parse(row.approved_at)) || Date.parse(row.approved_at) > now ||
      (row.not_before !== null && row.not_before !== undefined &&
       (!Number.isFinite(Date.parse(row.not_before)) || Date.parse(row.not_before) > now)) ||
      row.currency !== "ZAR" ||
      !(row.payment_verified === true || row.cash_on_delivery_approved === true) ||
      !latitude(row.pickup_lat) || !longitude(row.pickup_lon) ||
      !latitude(row.dropoff_lat) || !longitude(row.dropoff_lon) ||
      !positive(row.route_distance_m) || !positive(row.weight_grams) ||
      !cents(row.fee_cents) || !cents(row.payout_cents) ||
      row.payout_cents > row.fee_cents || row.delivery_cents !== row.fee_cents)
    return false;
  return true;
}
export async function deliveryOrderLookup(request, env, withDb, now = Date.now()) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/internal/delivery/orders/")) return null;
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (new URL(request.url).search) return json({ error: "not_found" }, 404);
  if (env.DELIVERY_SOURCE_LOOKUP_ENABLED !== "true" ||
      typeof env.DELIVERY_LOOKUP_TOKEN !== "string" ||
      text.encode(env.DELIVERY_LOOKUP_TOKEN).length < 32)
    return json({ error: "delivery_lookup_unavailable" }, 503);
  const authorization = request.headers.get("authorization") || "";
  const supplied = /^Bearer ([^\s]{1,256})$/.exec(authorization)?.[1] || "";
  if (!constantTimeToken(supplied, env.DELIVERY_LOOKUP_TOKEN))
    return json({ error: "unauthorized" }, 401);
  const orderId = path.slice("/internal/delivery/orders/".length);
  if (!uuid.test(orderId)) return json({ error: "not_found" }, 404);
  let issuer;
  try {
    const auth = new URL(env.NEON_AUTH_URL || env.NEON_AUTH_BASE_URL || "");
    if (auth.protocol !== "https:") throw Error();
    issuer = auth.origin;
  } catch { return json({ error: "delivery_lookup_unavailable" }, 503); }
  try {
    const row = await withDb(env, async db => (await db.query(
      `SELECT o.id,o.customer_subject,s.owner_subject,o.fulfillment_type,o.status,
        o.delivery_cents,s.approved,
        q.pickup_lat,q.pickup_lon,q.dropoff_lat,q.dropoff_lon,
        q.route_distance_m,q.weight_grams,q.currency,q.fee_cents,q.payout_cents,
        q.payment_verified,q.cash_on_delivery_approved,q.dispatch_ready,
        q.not_before,q.approved_at,q.approved_by
      FROM kfh_orders o JOIN kfh_shops s ON s.id=o.shop_id
      JOIN kfh_delivery_quotes q ON q.order_id=o.id
      WHERE o.id=$1`, [orderId.toLowerCase()]
    )).rows[0]);
    if (!row) return json({ error: "delivery_quote_not_found" }, 404);
    if (!authorizedQuote(row, now))
      return json({ error: "delivery_not_eligible" }, 409);
    return json({ delivery: {
      source_app: source, source_order_id: String(row.id).toLowerCase(),
      delivery_eligible: true, fulfillment: "delivery", status: "ready",
      currency: "ZAR", payment_verified: row.payment_verified === true,
      cash_on_delivery_approved: row.cash_on_delivery_approved === true,
      customer_subject: source + ":" + issuer + ":" + row.customer_subject,
      shop_subject: source + ":" + issuer + ":" + row.owner_subject,
      pickup_lat: row.pickup_lat, pickup_lon: row.pickup_lon,
      dropoff_lat: row.dropoff_lat, dropoff_lon: row.dropoff_lon,
      route_distance_m: row.route_distance_m, weight_grams: row.weight_grams,
      required_vehicle: vehicle, fee_cents: row.fee_cents,
      payout_cents: row.payout_cents
    } });
  } catch {
    // Schema missing, RLS denies access, database is offline, or invalid config:
    // refuse the dispatch rather than fabricating a quote or exposing SQL.
    return json({ error: "delivery_lookup_unavailable" }, 503);
  }
}
