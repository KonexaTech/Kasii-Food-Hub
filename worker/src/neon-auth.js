import { createRemoteJWKSet, jwtVerify } from "jose";

/** Neon Auth JWT verification. Never trust a user ID or role from request JSON. */
const jwksCache = new Map();
export async function verifiedNeonSubject(request, env) {
  const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") || "")?.[1];
  const base = (env.NEON_AUTH_URL || env.NEON_AUTH_BASE_URL || "").replace(/\/$/, "");
  if (!token || !base || !base.startsWith("https://")) return null;
  try {
    const jwksUrl = new URL(base + "/.well-known/jwks.json");
    let jwks = jwksCache.get(jwksUrl.href);
    if (!jwks) { jwks = createRemoteJWKSet(jwksUrl); jwksCache.set(jwksUrl.href, jwks); }
    const issuer = new URL(base).origin;
    const options = { algorithms: ["EdDSA"], issuer, audience: issuer };
    const { payload } = await jwtVerify(token, jwks, options);
    if (typeof payload.sub !== "string" || !payload.sub || !payload.exp || !payload.iat) return null;
    return payload.sub;
  } catch { return null; }
}
export async function isNeonAdmin(env, withDb, subject) {
  if (!subject) return false;
  return withDb(env, async db => (await db.query("SELECT 1 FROM kfh_admins WHERE subject=$1", [subject])).rowCount === 1);
}
