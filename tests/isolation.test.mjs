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
test("backend is enabled only for its isolated Neon QA branch",()=>{
 const config=read("worker/wrangler.jsonc");
 assert.ok(config.includes('"name": "'));
 assert.ok(config.includes('-api-qa"'));
 assert.ok(config.includes('"NEON_ONLY_MODE": "true"'));
 assert.ok(config.includes('"EXPECTED_NEON_HOST": "ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech"'));
 assert.ok(config.includes('"NEON_AUTH_URL": "https://'));
 assert.equal(config.includes("DATABASE_URL"),false);
 assert.match(read("app-config.js"),/authUrl:"",apiUrl:""/);
 const api=read("worker/src/neon-api.js");
 assert.ok(api.includes("kfh_shops"));
 assert.equal(api.includes("cc_shops"),false);
});
test("all customer, owner and admin experiences are branded",()=>{
 for(const page of ["index.html","neon-customer.html","neon-owner.html","neon-admin.html"])
 assert.ok(read(page).includes("Kasii Food Hub"),"Missing brand in "+page);
});
