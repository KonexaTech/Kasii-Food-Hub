import { neonApi } from "./neon-api.js";
import { Client } from "pg";

// Neon-only API. Database credentials stay in Worker secrets.
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

function allowedOrigin(origin, env) {
  if (!origin) return null;
  const origins = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "https://siboniisozulu-alt.github.io")
    .split(",").map(value => value.trim()).filter(Boolean);
  origins.push("https://kasii-food-hub-neon-staging.pages.dev");
  return origins.includes(origin) ? origin : null;
}

async function withDb(env, callback) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!connectionString) throw new Error("Database binding not configured");
  if (!env.EXPECTED_NEON_HOST) throw new Error("Expected development database host not configured");
  let hostname;
  try { hostname = new URL(connectionString).hostname.toLowerCase(); }
  catch { throw new Error("Invalid database connection URL"); }
  if (hostname !== env.EXPECTED_NEON_HOST.toLowerCase())
    throw new Error("Database target does not match development branch");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try { await client.connect(); return await callback(client); }
  finally { await client.end().catch(() => {}); }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const permittedOrigin = allowedOrigin(origin, env);
    const headers = permittedOrigin ? { "access-control-allow-origin": permittedOrigin, "vary": "Origin" } : {};
    if (origin && !permittedOrigin) return json({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { ...headers, "access-control-allow-methods": "GET, POST, PATCH, OPTIONS", "access-control-allow-headers": "content-type, authorization" } });
    if (!["GET", "POST", "PATCH"].includes(request.method)) return json({ error: "Method not allowed" }, 405, headers);
    const path = new URL(request.url).pathname;
    if (path === "/health" && request.method === "GET") {
      if (env.NEON_ONLY_MODE !== "true") return json({ status: "unavailable", database: "not_checked" }, 503, headers);
      try {
        const result = await withDb(env, client => client.query("SELECT 1 AS ready"));
        return json({ status: result.rows[0]?.ready === 1 ? "ok" : "unavailable", database: result.rows[0]?.ready === 1 ? "connected" : "failed" }, result.rows[0]?.ready === 1 ? 200 : 503, headers);
      } catch (error) {
        console.error("Development database health check failed", { type: error?.name || "UnknownError" });
        return json({ status: "unavailable", database: "failed" }, 503, headers);
      }
    }
    if (!path.startsWith("/api/")) return json({ error: "Not found" }, 404, headers);
    if (env.NEON_ONLY_MODE !== "true") return json({ error: "Neon-only mode not configured" }, 503, headers);

    const workerOrigin = new URL(request.url).origin;
    if (request.method === "GET" && path === "/staging") return json({error:"This staging page is not configured"},404,headers);
    if (request.method === "GET" && path === "/password-reset-request") {
      return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kasii Food Hub staging password</title><style>body{font:16px system-ui;background:#f6f7f2;color:#203629;margin:0}main{max-width:440px;margin:8vh auto;padding:24px;background:white;border:1px solid #dce6db;border-radius:18px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #b9c9bc;border-radius:9px}button{margin-top:16px;padding:12px 18px;border:0;border-radius:9px;background:#176b42;color:white;font-weight:700}</style><main><h1>Kasii Food Hub</h1><h2>Set or reset staging password</h2><p>Enter one of the staging account email addresses. A secure password-reset link will be sent to that inbox.</p><form id="f"><input id="email" type="email" required placeholder="Email address"><button>Send reset link</button></form><p id="m" role="status"></p></main><script>document.getElementById('f').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('m');m.textContent='Sending…';try{const r=await fetch('/password-reset/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:document.getElementById('email').value.trim()})});const d=await r.json();m.textContent=r.ok?'If the account exists, a password-reset email has been sent. Check your inbox and spam folder.':(d.error||'Unable to send reset email.')}catch(e){m.textContent='Request failed. Please retry.'}})</script></html>`, {headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
    }
    if (request.method === "GET" && path === "/password-reset") {
      return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kasii Food Hub staging password reset</title><style>body{font:16px system-ui;background:#f6f7f2;color:#203629;margin:0}main{max-width:440px;margin:8vh auto;padding:24px;background:white;border:1px solid #dce6db;border-radius:18px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #b9c9bc;border-radius:9px;margin:8px 0}button{margin-top:16px;padding:12px 18px;border:0;border-radius:9px;background:#176b42;color:white;font-weight:700}</style><main><h1>Kasii Food Hub</h1><h2>Choose a staging password</h2><p>Use at least 12 characters. This changes only the selected staging account.</p><form id="f"><input id="p" type="password" minlength="12" required placeholder="New password"><input id="c" type="password" minlength="12" required placeholder="Confirm password"><button>Save password</button></form><p id="m" role="status"></p><a href="/password-reset-request">Request another reset link</a></main><script type="module">import{createAuthClient}from'https://esm.sh/@neon/auth';const auth=createAuthClient('${env.NEON_AUTH_BASE_URL||""}');const token=new URLSearchParams(location.search).get('token');const f=document.getElementById('f'),m=document.getElementById('m');if(!token){f.hidden=true;m.textContent='Reset token missing. Request a new link.'}f.addEventListener('submit',async e=>{e.preventDefault();if(document.getElementById('p').value!==document.getElementById('c').value){m.textContent='Passwords do not match.';return}const r=await auth.resetPassword({newPassword:document.getElementById('p').value,token});if(r.error){m.textContent='Password reset failed: '+r.error.message;return}f.hidden=true;m.textContent='Password saved. You can now sign in on the staging app.'})</script></html>`, {headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
    }
    if (request.method === "POST" && path === "/password-reset/request") {
      let data;
      try { data = await request.json(); } catch { return json({error:"Invalid request"},400,headers); }
      const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !env.NEON_AUTH_BASE_URL)
        return json({error:"Invalid email or authentication configuration"},400,headers);
      const redirectTo = workerOrigin + "/password-reset";
      const upstream = await fetch(env.NEON_AUTH_BASE_URL.replace(/\/$/,"") + "/request-password-reset", {
        method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({email,redirectTo})
      });
      // Do not disclose whether a particular email is registered.
      if (!upstream.ok) return json({error:"Password reset service unavailable"},502,headers);
      return json({message:"If the account exists, a reset email has been sent."},200,headers);
    }
    if (request.method === "GET" && path === "/health") return json({ status: "ok", service: "kasii-food-hub-api", database: "not_checked" }, 200, headers);

    try {
      const response = await neonApi(request, env, withDb);
      if (!response) return json({ error: "Not found" }, 404, headers);
      const result = new Response(response.body, response);
      Object.entries(headers).forEach(([key, value]) => result.headers.set(key, value));
      return result;
    } catch (error) {
      console.error("Neon API request failed", { path, type: error?.name || "UnknownError" });
      return json({ error: "API unavailable" }, 503, headers);
    }
  }
};
