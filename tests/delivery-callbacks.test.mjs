import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {deliveryEvents} from '../worker/src/delivery-events.js';
const prefix='kfh',source='kasii',secret='TEST-ONLY-delivery-callback-key-at-least-32-bytes';
const shop='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',order='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',job='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const event=(sequence,status='assigned')=>({version:1,event_id:'dddddddd-dddd-4ddd-8ddd-'+String(sequence).padStart(12,'0'),sequence:String(sequence),source_order_id:order,job_id:job,status,occurred_at:'2026-11-23T00:00:00.000Z'});
async function signed(data,changes={}){
 const body=JSON.stringify(data),timestamp=String(Math.floor(Date.now()/1000)),encode=x=>new TextEncoder().encode(x),hex=x=>[...new Uint8Array(x)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const hash=hex(await crypto.subtle.digest('SHA-256',encode(body))),canonical=['konexa-delivery-events-v1','POST','/internal/delivery/events',source,timestamp,hash].join('\n');
 const key=await crypto.subtle.importKey('raw',encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return new Request('https://isolated.test/internal/delivery/events',{method:'POST',headers:{'x-konexa-source':source,'x-konexa-delivery-timestamp':timestamp,'x-konexa-delivery-signature':'v1='+hex(await crypto.subtle.sign('HMAC',key,encode(canonical))),...changes},body});
}
test('delivery callback authenticates before SQL and fails closed without configuration',async()=>{
 const noDb=()=>{throw Error('SQL must not run');},env={DELIVERY_CALLBACKS_ENABLED:'true',DELIVERY_CALLBACK_SECRET:secret};
 assert.equal((await deliveryEvents(await signed(event(1)),{},noDb)).status,503);
 for(const change of [{'x-konexa-source':'other'},{'x-konexa-delivery-timestamp':'1000000000'},{'x-konexa-delivery-signature':'v1='+'0'.repeat(64)}])assert.equal((await deliveryEvents(await signed(event(1),change),env,noDb)).status,401);
 assert.equal((await deliveryEvents(await signed({...event(1),sequence:'0'}),env,noDb)).status,400);
});
test('delivery callback persists dedupe and monotonic state without completing or paying orders',async()=>{
 const db=new PGlite(),env={DELIVERY_CALLBACKS_ENABLED:'true',DELIVERY_CALLBACK_SECRET:secret};
 try{
 for(const name of (await readdir(new URL('../neon/migrations/',import.meta.url))).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort())await db.exec(await readFile(new URL('../neon/migrations/'+name,import.meta.url),'utf8'));
 await db.query('INSERT INTO '+prefix+'_shops(id,owner_subject,name,area,approved) VALUES($1,$2,$3,$4,true)',[shop,'TEST owner','TEST merchant','TEST']);
 await db.query('INSERT INTO '+prefix+'_orders(id,order_number,shop_id,customer_subject,customer_name,customer_phone,area,fulfillment_type,subtotal_cents,total_cents) VALUES($1,$2,$3,$4,$5,$6,$7,$8,100,100)',[order,'TEST DELIVERY',shop,'TEST buyer','TEST buyer','0000000000','TEST','delivery']);
 const call=async data=>{const response=await deliveryEvents(await signed(data),env,(_,fn)=>fn(db));return {status:response.status,data:await response.json()};};
 assert.equal((await call(event(2,'collected'))).status,200);
 assert.equal((await call(event(2,'collected'))).status,200);
 assert.equal((await call({...event(2,'enroute')})).status,409);
 assert.equal((await call(event(1,'assigned'))).status,200);
 assert.equal((await db.query('SELECT status FROM '+prefix+'_delivery_state')).rows[0].status,'collected');
 assert.equal((await call({...event(3),job_id:shop})).status,409);
 assert.equal((await call(event(3,'assigned'))).status,409);
 assert.equal((await call({...event(3),source_order_id:shop})).status,404);
 assert.equal((await call(event(4,'delivered'))).status,200);
 assert.equal((await call(event(5,'searching'))).status,409);
 const stored=(await db.query('SELECT status,total_cents FROM '+prefix+'_orders WHERE id=$1',[order])).rows[0];assert.equal(stored.status,'pending');assert.equal(stored.total_cents,100);
 assert.equal(Number((await db.query('SELECT count(*) AS n FROM '+prefix+'_delivery_events')).rows[0].n),3);
 await db.exec('CREATE ROLE delivery_outsider; GRANT SELECT ON '+prefix+'_delivery_events,'+prefix+'_delivery_state TO delivery_outsider; SET ROLE delivery_outsider');
 assert.equal((await db.query('SELECT * FROM '+prefix+'_delivery_events')).rows.length,0);await db.exec('RESET ROLE');
 }finally{await db.close();}
});
