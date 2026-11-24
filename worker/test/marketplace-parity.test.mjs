import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generateKeyPair,exportJWK,SignJWT} from "jose";
import {neonApi} from "../src/neon-api.js";

test("admin overview and bulk notification read enforce signed identity and roles",async t=>{
 const {privateKey,publicKey}=await generateKeyPair("EdDSA");
 const base="https://parity-auth.example.test",jwk={...await exportJWK(publicKey),kid:"parity-fixture",alg:"EdDSA"};
 t.mock.method(globalThis,"fetch",async url=>{assert.equal(String(url),base+"/.well-known/jwks.json");return Response.json({keys:[jwk]})});
 const sign=subject=>new SignJWT({}).setProtectedHeader({alg:"EdDSA",kid:jwk.kid}).setSubject(subject).setIssuer(base).setAudience(base).setIssuedAt().setExpirationTime("1m").sign(privateKey);
 const admin=await sign("fixture-admin"),customer=await sign("fixture-customer");
 const call=(path,method,token,body)=>neonApi(new Request("https://worker.example.test"+path,{method,headers:token?{authorization:"Bearer "+token,"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined}),{NEON_AUTH_URL:base},async(_,callback)=>callback(db));
 const calls=[],notifs=[{subject:"fixture-customer",read:false},{subject:"fixture-customer",read:false},{subject:"fixture-other",read:false}];
 const db={query:async(sql,params=[])=>{
   calls.push({sql,params});
   if(sql.startsWith("SELECT 1 FROM kfh_admins"))return {rowCount:params[0]==="fixture-admin"?1:0};
   if(sql.includes("FROM kfh_shops"))return {rows:[{total:4,approved:2}]};
   if(sql.includes("FROM kfh_shop_applications"))return {rows:[{status:"pending",count:2}]};
   if(sql.includes("FROM kfh_orders"))return {rows:[{status:"completed",count:1}]};
   if(sql.startsWith("WITH marked AS (UPDATE kfh_notifications")){
     assert.match(sql,/recipient_subject=\$1 AND read_at IS NULL/);
     let updated=0;for(const n of notifs)if(n.subject===params[0]&&!n.read){n.read=true;updated++}
     return {rows:[{updated}]};
   }
   throw Error("Unexpected SQL "+sql);
 }};
 assert.equal((await call("/api/admin/overview","GET",null)).status,401);
 assert.equal((await call("/api/notifications/read-all","PATCH",null)).status,401);
 assert.equal(calls.length,0);
 assert.equal((await call("/api/admin/overview","GET",customer)).status,403);
 assert.equal(calls.length,1);
 const overview=await call("/api/admin/overview","GET",admin);
 assert.equal(overview.status,200);const data=await overview.json();
 assert.equal(data.shopCount,4);assert.equal(data.approvedShopCount,2);assert.equal(data.commissionPaused,true);assert.equal(data.estimatedCommissionCents,null);
 const first=await call("/api/notifications/read-all","PATCH",customer,{recipient_subject:"fixture-other"});
 assert.equal(first.status,200);assert.deepEqual(await first.json(),{ok:true,updated:2});
 assert.equal(notifs[2].read,false);
 const replay=await call("/api/notifications/read-all","PATCH",customer);
 assert.deepEqual(await replay.json(),{ok:true,updated:0});
});

test("all role screens expose bulk read and admin overview preserves admin-only UI",()=>{
 const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
 for(const file of ["neon-customer.html","neon-owner.html","neon-admin.html"])assert(read(file).includes('id="markAllRead"'));
 assert(read("neon-admin.html").includes('id="adminOverview"'));
 assert(!read("neon-customer.html").includes('id="adminOverview"'));
 assert(!read("neon-owner.html").includes('id="adminOverview"'));
 assert(read("neon-app.js").includes('/api/notifications/read-all'));
});
