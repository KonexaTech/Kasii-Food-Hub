import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { neonApi } from '../worker/src/neon-api.js';
import { verifiedNeonSubject } from '../worker/src/neon-auth.js';
import { orderHistoryAuthFixture } from '../worker/test/order-history-auth-fixture.mjs';
test('suspension removes public discovery but preserves only the customers own saved order, items and history',async t=>{
 const db=new PGlite(),auth=await orderHistoryAuthFixture();
 t.mock.method(globalThis,'fetch',async url=>{assert.equal(String(url),auth.base+'/.well-known/jwks.json');return Response.json({keys:[auth.jwk]});});
 const shop='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',order='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 try{
  const files=(await readdir(new URL('../neon/migrations/',import.meta.url))).filter(f=>/^\d{3}_.*\.sql$/.test(f)).sort();
  for(const file of files)await db.exec(await readFile(new URL('../neon/migrations/'+file,import.meta.url),'utf8'));
  await db.exec(`CREATE ROLE history_runtime; GRANT SELECT ON ALL TABLES IN SCHEMA public TO history_runtime;
   INSERT INTO kfh_shops(id,owner_subject,name,area,approved) VALUES('${shop}','merchant','TEST history merchant','TEST Area',true);
   INSERT INTO kfh_menu_items(id,shop_id,name,price_cents) VALUES('${order}','${shop}','TEST menu',100);
   INSERT INTO kfh_orders(id,order_number,shop_id,customer_subject,customer_name,customer_phone,area,fulfillment_type,subtotal_cents,total_cents,test_order) VALUES('${order}','TEST-HISTORY','${shop}','customer','Test Buyer','0000000000','TEST','pickup',100,100,true);
   INSERT INTO kfh_order_items(order_id,menu_item_id,item_name,unit_price_cents,quantity) VALUES('${order}','${order}','TEST menu',100,1);
   INSERT INTO kfh_order_status_events(order_id,new_status,actor_subject,actor_role) VALUES('${order}','pending','customer','customer');
   UPDATE kfh_shops SET approved=false WHERE id='${shop}';`);
  async function call(path,actor){
   const request=new Request('https://isolated.test'+path,{headers:{authorization:'Bearer '+await auth.token(actor)}});
   const env={NEON_AUTH_URL:auth.base};
   const response=await neonApi(request,env,async(_,callback)=>{
    const subject=await verifiedNeonSubject(request,env);await db.exec('SET ROLE history_runtime');await db.query("SELECT set_config('app.current_subject',$1,false)",[subject]);
    try{return await callback(db);}finally{await db.exec('RESET ROLE');}
   });return {status:response.status,data:await response.json()};
  }
  await db.exec(await readFile(new URL('../docs/release/order-history-after-suspension.rollback.sql',import.meta.url),'utf8'));
  assert.equal((await call('/api/orders/'+order+'/items','customer')).data.items.length,0,'Captured baseline must reproduce missing items');
  await db.exec(await readFile(new URL('../neon/migrations/011_order_history_after_shop_suspension.sql',import.meta.url),'utf8'));
  assert.equal((await call('/api/shops','customer')).data.shops.length,0);
  assert.equal((await call('/api/orders/'+order,'customer')).status,200);
  assert.equal((await call('/api/orders/'+order+'/items','customer')).data.items.length,1);
  assert.equal((await call('/api/orders/'+order+'/history','customer')).data.events.length,1);
  assert.notEqual((await call('/api/orders/'+order,'outsider')).status,200);
  assert.notEqual((await call('/api/orders/'+order+'/items','outsider')).status,200);
  assert.equal((await db.query('SELECT count(*)::int n FROM kfh_orders')).rows[0].n,1);
 }finally{await db.close();}
});
