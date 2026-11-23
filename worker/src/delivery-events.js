import {notifyDelivery} from './delivery-notifications.js';
// Server-to-server delivery callbacks; disabled until reviewed schema and secrets exist.
const source='kasii',prefix='kfh';
const states=['searching','assigned','ready','collected','enroute','delivered','cancelled','failed'];
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function deliveryEvents(request,env,withDb){
 if(new URL(request.url).pathname!=='/internal/delivery/events')return null;
 if(env.DELIVERY_CALLBACKS_ENABLED!=='true'||typeof env.DELIVERY_CALLBACK_SECRET!=='string'||new TextEncoder().encode(env.DELIVERY_CALLBACK_SECRET).length<32)return json({error:'Delivery callbacks unavailable'},503);
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const timestamp=request.headers.get('x-konexa-delivery-timestamp'),signature=request.headers.get('x-konexa-delivery-signature');
 if(request.headers.get('x-konexa-source')!==source||!/^\d{10}$/.test(timestamp||'')||Math.abs(Date.now()/1000-Number(timestamp))>300||!/^v1=[a-f0-9]{64}$/.test(signature||''))return json({error:'Unauthorized delivery callback'},401);
 let bytes=new Uint8Array();const reader=request.body?.getReader();
 if(!reader)return json({error:'Invalid callback'},400);
 while(true){const {value,done}=await reader.read();if(done)break;if(bytes.length+value.length>16384){await reader.cancel();return json({error:'Callback too large'},413);}const combined=new Uint8Array(bytes.length+value.length);combined.set(bytes);combined.set(value,bytes.length);bytes=combined;}
 const digest=hex(await crypto.subtle.digest('SHA-256',bytes));
 const canonical=['konexa-delivery-events-v1','POST','/internal/delivery/events',source,timestamp,digest].join('\n');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.DELIVERY_CALLBACK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.slice(3).match(/../g),x=>parseInt(x,16)),new TextEncoder().encode(canonical));
 if(!valid)return json({error:'Unauthorized delivery callback'},401);
 let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Invalid callback'},400);}
 const fields=['version','event_id','sequence','source_order_id','job_id','status','occurred_at'];
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==fields.length||fields.some(k=>!Object.hasOwn(data,k))||data.version!==1||typeof data.event_id!=='string'||!uuid.test(data.event_id)||typeof data.source_order_id!=='string'||!uuid.test(data.source_order_id)||typeof data.job_id!=='string'||!uuid.test(data.job_id)||typeof data.sequence!=='string'||!/^\d{1,19}$/.test(data.sequence)||BigInt(data.sequence)<1n||BigInt(data.sequence)>9223372036854775807n||!states.includes(data.status)||typeof data.occurred_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(data.occurred_at)||!Number.isFinite(Date.parse(data.occurred_at)))return json({error:'Invalid callback'},400);
 try{return await withDb(env,async db=>{
  await db.query('BEGIN');try{
   const order=(await db.query('SELECT id,fulfillment_type FROM '+prefix+'_orders WHERE id=$1 FOR UPDATE',[data.source_order_id])).rows[0];
   if(!order||order.fulfillment_type!=='delivery'){await db.query('ROLLBACK');return json({error:'Delivery order not found'},404);}
   const dispatched=(await db.query('SELECT job_id,intake_status FROM '+prefix+'_delivery_dispatches WHERE order_id=$1',[data.source_order_id])).rows[0];
   if(dispatched&&dispatched.job_id!==data.job_id){await db.query('ROLLBACK');return json({error:'Delivery job conflict'},409);}
   const previous=(await db.query('SELECT payload_hash FROM '+prefix+'_delivery_events WHERE event_id=$1',[data.event_id])).rows[0];
   if(previous){await db.query('ROLLBACK');return previous.payload_hash===digest?json({acknowledged_event_id:data.event_id}):json({error:'Event identity conflict'},409);}
   const current=(await db.query('SELECT job_id,sequence,status FROM '+prefix+'_delivery_state WHERE order_id=$1 FOR UPDATE',[data.source_order_id])).rows[0];
   if(current&&current.job_id!==data.job_id){await db.query('ROLLBACK');return json({error:'Delivery job conflict'},409);}
   if(current&&BigInt(data.sequence)===BigInt(current.sequence)){await db.query('ROLLBACK');return json({error:'Delivery sequence conflict'},409);}
   const newer=!current||BigInt(data.sequence)>BigInt(current.sequence);
   if(newer&&current&&((['delivered','cancelled','failed'].includes(current.status)&&data.status!==current.status)||(!['cancelled','failed'].includes(data.status)&&states.indexOf(data.status)<states.indexOf(current.status)))){await db.query('ROLLBACK');return json({error:'Delivery state conflict'},409);}
   await db.query('INSERT INTO '+prefix+'_delivery_events(event_id,order_id,job_id,sequence,status,occurred_at,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[data.event_id,data.source_order_id,data.job_id,data.sequence,data.status,data.occurred_at,digest]);
   if(newer)await db.query('INSERT INTO '+prefix+'_delivery_state(order_id,job_id,sequence,status,occurred_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id) DO UPDATE SET sequence=EXCLUDED.sequence,status=EXCLUDED.status,occurred_at=EXCLUDED.occurred_at',[data.source_order_id,data.job_id,data.sequence,data.status,data.occurred_at]);
   if(newer&&data.status!==(current?.status||dispatched?.intake_status))await notifyDelivery(db,data.source_order_id,data.status);
   await db.query('COMMIT');return json({acknowledged_event_id:data.event_id});
  }catch(error){await db.query('ROLLBACK');throw error;}
 });}catch{return json({error:'Delivery callback persistence unavailable'},503);}
}
