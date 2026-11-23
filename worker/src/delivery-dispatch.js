import {notifyDelivery} from './delivery-notifications.js';
import {eligibleDeliverySnapshot} from './delivery-source-orders.js';
const prefix='kfh',source='kasii',path='/v1/delivery/jobs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const states=['searching','assigned','ready','collected','enroute','delivered','cancelled','failed'];
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hex=value=>[...new Uint8Array(value)].map(x=>x.toString(16).padStart(2,'0')).join('');
function config(env){
 if(env.DELIVERY_SOURCE_LOOKUP_ENABLED!=='true'||typeof env.DELIVERY_LOOKUP_TOKEN!=='string'||new TextEncoder().encode(env.DELIVERY_LOOKUP_TOKEN).length<32)return null;
 if(env.DELIVERY_DISPATCH_ENABLED!=='true'||typeof env.DELIVERY_INTAKE_SECRET!=='string'||new TextEncoder().encode(env.DELIVERY_INTAKE_SECRET).length<32)return null;
 try{const url=new URL(env.DELIVERY_SERVICE_URL);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;return url.origin;}catch{return null;}
}
export function deliveryCapabilities(env){return {dispatch_enabled:Boolean(config(env))};}
async function participant(db,id,subject,ownerOnly){
 const row=(await db.query('SELECT o.id,o.customer_subject,s.owner_subject,EXISTS(SELECT 1 FROM '+prefix+'_admins WHERE subject=$2) AS admin FROM '+prefix+'_orders o LEFT JOIN '+prefix+'_shops s ON s.id=o.shop_id WHERE o.id=$1',[id,subject])).rows[0];
 return row&&(ownerOnly?row.owner_subject===subject:(row.customer_subject===subject||row.owner_subject===subject||row.admin===true));
}
async function tracking(db,id){const row=(await db.query('SELECT COALESCE(s.job_id,d.job_id) AS job_id,COALESCE(s.status,d.intake_status) AS status,s.occurred_at FROM '+prefix+'_orders o LEFT JOIN '+prefix+'_delivery_dispatches d ON d.order_id=o.id LEFT JOIN '+prefix+'_delivery_state s ON s.order_id=o.id WHERE o.id=$1',[id])).rows[0];return {job_id:row?.job_id||null,status:row?.status||'not_requested',occurred_at:row?.occurred_at||null,queued:row?.status==='searching',message:row?.status==='searching'?'Queued: awaiting courier assignment.':null};}
export async function deliveryTracking(env,withDb,id,subject){try{return await withDb(env,async db=>await participant(db,id,subject,false)?json({delivery:await tracking(db,id)}):json({error:'Order not found'},404));}catch{return json({error:'Delivery tracking unavailable'},503);}}
export async function dispatchDelivery(env,withDb,id,subject){
 const origin=config(env);if(!origin)return json({error:'Delivery dispatch unavailable'},503);
 try{
 const existing=await withDb(env,async db=>{if(!await participant(db,id,subject,true))return {denied:true};const row=(await db.query('SELECT job_id FROM '+prefix+'_delivery_dispatches WHERE order_id=$1',[id])).rows[0];return row?{delivery:await tracking(db,id)}:null;});
 if(existing?.denied)return json({error:'Order not found'},404);if(existing?.delivery)return json(existing);
 const eligible=await eligibleDeliverySnapshot(env,withDb,id);if(!eligible.ok)return eligible;
 const body=JSON.stringify({version:1,source_order_id:id}),timestamp=String(Math.floor(Date.now()/1000)),encode=x=>new TextEncoder().encode(x);
 const digest=hex(await crypto.subtle.digest('SHA-256',encode(body))),canonical=['konexa-delivery-v1','POST',path,source,timestamp,digest].join('\n');
 const key=await crypto.subtle.importKey('raw',encode(env.DELIVERY_INTAKE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature='v1='+hex(await crypto.subtle.sign('HMAC',key,encode(canonical)));
 const response=await fetch(origin+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json','x-konexa-source':source,'x-konexa-timestamp':timestamp,'x-konexa-signature':signature},body});
 if(![200,201].includes(response.status))return json({error:response.status===409?'Delivery source conflict; review required':'Delivery service unavailable; retry safely'},response.status===409?409:503);
 const result=await response.json();if(typeof result?.job_id!=='string'||!uuid.test(result.job_id)||!states.includes(result.status))return json({error:'Invalid delivery acknowledgement; retry safely'},502);
 return await withDb(env,async db=>{await db.query('BEGIN');try{
  await db.query('SELECT id FROM '+prefix+'_orders WHERE id=$1 FOR UPDATE',[id]);
  if(!await participant(db,id,subject,true)){await db.query('ROLLBACK');return json({error:'Order not found'},404);}
  const pinned=(await db.query('SELECT job_id FROM '+prefix+'_delivery_dispatches WHERE order_id=$1',[id])).rows[0],state=(await db.query('SELECT job_id FROM '+prefix+'_delivery_state WHERE order_id=$1',[id])).rows[0];
  if((pinned&&pinned.job_id!==result.job_id)||(state&&state.job_id!==result.job_id)){await db.query('ROLLBACK');return json({error:'Delivery job conflict; review required'},409);}
  await db.query('INSERT INTO '+prefix+'_delivery_dispatches(order_id,job_id,intake_status) VALUES($1,$2,$3) ON CONFLICT(order_id) DO NOTHING',[id,result.job_id,result.status]);
  if(!pinned&&!state)await notifyDelivery(db,id,result.status);
  const delivery=await tracking(db,id);await db.query('COMMIT');return json({delivery},pinned?200:201);
 }catch(error){await db.query('ROLLBACK');throw error;}});
 }catch{return json({error:'Delivery dispatch unavailable; retry safely'},503);}
}
