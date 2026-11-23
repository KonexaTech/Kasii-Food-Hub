import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { neonApi } from "../src/neon-api.js";

test("authenticated checkout rejects malformed payloads before SQL and normalizes UUID retries", async t => {
  const {privateKey,publicKey}=await generateKeyPair("EdDSA");
  const jwk={...await exportJWK(publicKey),kid:"checkout-fixture",alg:"EdDSA"};
  const base="https://checkout-auth.example.test";
  const token=await new SignJWT({}).setProtectedHeader({alg:"EdDSA",kid:jwk.kid})
    .setSubject("isolated-customer").setIssuer(base).setAudience(base).setIssuedAt().setExpirationTime("1m").sign(privateKey);
  t.mock.method(globalThis,"fetch",async url=>{
    assert.equal(String(url),base+"/.well-known/jwks.json");
    return new Response(JSON.stringify({keys:[jwk]}),{headers:{"content-type":"application/json"}});
  });
  const id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const valid={requestId:id,shopId:id,items:[{itemId:id,quantity:1}],customerName:"Test Buyer",customerPhone:"0712345678",area:"Test Area",fulfillmentType:"pickup"};
  for(const body of [{...valid,items:[null]},{...valid,customerPhone:{}},{...valid,fulfillmentType:"delivery",deliveryAddress:{street:"x"}}]) {
    const response=await neonApi(new Request("https://worker.example.test/api/orders",{
      method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify(body)
    }),{NEON_AUTH_URL:base},()=>{throw Error("Invalid order reached database")});
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{error:"Invalid checkout"});
  }
  const normalized=[];
  const db={query:async(sql,params)=>{
    if(sql.startsWith("SELECT id,order_number")){
      normalized.push(params[1]);
      return {rows:[{id,order_number:"TEST-REPLAY",status:"pending",total_cents:100,shop_id:id,customer_name:valid.customerName,customer_phone:valid.customerPhone,area:valid.area,delivery_address:null,fulfillment_type:"pickup"}]};
    }
    if(sql.startsWith("SELECT menu_item_id"))return {rows:[{id,quantity:1}]};
    if(sql==="BEGIN"||sql==="COMMIT")return {rows:[]};
    throw Error("Unexpected SQL: "+sql);
  }};
  const replay=await neonApi(new Request("https://worker.example.test/api/orders",{
    method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({...valid,requestId:id.toUpperCase(),shopId:id.toUpperCase(),items:[{itemId:id.toUpperCase(),quantity:1}]})
  }),{NEON_AUTH_URL:base},async(_,callback)=>callback(db));
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).replayed,true);
  assert.deepEqual(normalized,[id]);

  const writes=[];
  let inserted;
  const createDb={query:async(sql,params=[])=>{
    writes.push(sql);
    if(sql.startsWith("SELECT id,order_number"))return {rows:[]};
    if(sql.startsWith("SELECT id,owner_subject"))return {rows:[{id,owner_subject:"fixture-owner"}]};
    if(sql.startsWith("SELECT id,name,price_cents"))return {rows:[{id,name:"Fixture meal",price_cents:2500}]};
    if(sql.startsWith("INSERT INTO kfh_orders(")){
      inserted=params;
      return {rows:[{id,order_number:"TEST-NEW",status:"pending",total_cents:4000}]};
    }
    return {rows:[],rowCount:1};
  }};
  const create=await neonApi(new Request("https://worker.example.test/api/orders",{
    method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({...valid,fulfillmentType:"delivery",deliveryAddress:"Fixture address",totalCents:1,items:[{itemId:id,quantity:1,priceCents:1}]})
  }),{NEON_AUTH_URL:base},async(_,callback)=>callback(createDb));
  assert.equal(create.status,201);
  assert.equal(inserted[8],2500,"menu price comes from the database");
  assert.equal(inserted[9],1500,"existing delivery calculation is preserved");
  assert.equal(inserted[10],4000,"submitted forged total is ignored");
  assert.equal(inserted[6],"Fixture address");
  assert.equal(writes[0],"BEGIN");
  assert.equal(writes.at(-1),"COMMIT");
  assert.equal(writes.filter(sql=>sql.startsWith("INSERT INTO kfh_order_items")).length,1);
  const conflict=await neonApi(new Request("https://worker.example.test/api/orders",{
    method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({...valid,customerName:"Different buyer"})
  }),{NEON_AUTH_URL:base},async(_,callback)=>callback({query:async(sql,params)=>{
    if(sql==="ROLLBACK")return {rows:[]};
    return db.query(sql,params);
  }}));
  assert.equal(conflict.status,409);
  const anonymous=await neonApi(new Request("https://worker.example.test/api/orders",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(valid)
  }),{NEON_AUTH_URL:base},()=>{throw Error("Unauthenticated request reached database")});
  assert.equal(anonymous.status,401);
});
