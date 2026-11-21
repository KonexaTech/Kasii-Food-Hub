import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("app has separate unconfigured API and Neon Auth and no Kota production host",()=>{
 const s=read("app-config.js")+read("neon-app.js")+read("worker/wrangler.jsonc");
 assert.doesNotMatch(s,/ep-lively-leaf-za5rtfhs|kota-connect-api-dev/);
 assert.match(s,/unconfigured\.invalid/);
 assert.match(read("app-config.js"),/authUrl:"",apiUrl:""/);
});
test("backend must remain offline pending separate Neon provision",()=>{
 const config=read("worker/wrangler.jsonc");
 assert.match(config,/"NEON_ONLY_MODE": "false"/);
 assert.doesNotMatch(config,/DATABASE_URL|EXPECTED_NEON_HOST|NEON_AUTH_BASE_URL/);
 const api=read("worker/src/neon-api.js");
 assert.match(api,/kfh_shops/);
 assert.doesNotMatch(api,/\bkc_shops\b/);
});
test("all customer, owner and admin experiences are branded",()=>{
 for(const page of ["index.html","neon-customer.html","neon-owner.html","neon-admin.html"])
 assert.ok(read(page).includes("Kasii Food Hub"),"Missing brand in "+page);
});
