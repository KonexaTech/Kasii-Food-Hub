import {readFileSync} from 'node:fs';
import pg from '../worker/node_modules/pg/lib/index.js';
import {assertNeonConnectionTarget} from '../worker/src/neon-host.js';
const cfg=JSON.parse(readFileSync(new URL('../worker/wrangler.jsonc',import.meta.url),'utf8'));
const site="kasii-food-hub-neon-staging",worker="kasii-food-hub-api-qa",branch="fix/kasii-qa-build-isolation-20261123";
const fail=msg=>{throw Error(msg)};
if(cfg.name!==worker||cfg.workers_dev!==false||cfg.preview_urls!==false||cfg.routes||cfg.route)fail('Unsafe Worker configuration');
if(Object.entries(cfg.vars).some(([k,v])=>k.startsWith('DELIVERY_')&&k.endsWith('_ENABLED')&&v!=='false')||cfg.vars.CUSTOM_CAKES_ENABLED==='true')fail('Unapproved feature enabled');
if(process.env.GITHUB_REF!=='refs/heads/'+branch||!/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'')||process.env.APPROVED_SOURCE!==process.env.GITHUB_SHA)fail('Exact reviewed staging source required');
const uri=process.env.QA_NEON_DATABASE_URL,token=process.env.CLOUDFLARE_API_TOKEN;
if(!uri||!token)fail('Missing private QA secrets');
try{assertNeonConnectionTarget(uri,cfg.vars.EXPECTED_NEON_HOST,cfg.vars.EXPECTED_NEON_ROLE);if(new URL(uri).pathname!=='/neondb')fail('Wrong database');}catch{fail('QA database target mismatch');}
const client=new pg.Client({connectionString:uri,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:12000,query_timeout:10000});
try{await client.connect();const q=await client.query("SELECT current_user AS role,current_database() AS db,NOT(rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls) AS restricted FROM pg_roles WHERE rolname=current_user");if(q.rows[0]?.role!==cfg.vars.EXPECTED_NEON_ROLE||q.rows[0]?.db!=='neondb'||!q.rows[0]?.restricted)fail('Restricted role check failed');}catch{fail('QA role connectivity failed');}finally{await client.end().catch(()=>{});}
async function cf(path){const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+cfg.account_id+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});const j=await r.json();if(!r.ok||j.success!==true)fail('Cloudflare private configuration read failed');return j.result;}
const pages=await cf('/pages/projects/'+site),sub=await cf('/workers/scripts/'+worker+'/subdomain');
if(pages.name!==site||pages.source||sub.enabled!==false||sub.previews_enabled!==false)fail('Private target or route check failed');
for(const mode of ['production','preview'])if(pages.deployment_configs?.[mode]?.fail_open!==false||pages.deployment_configs?.[mode]?.services?.QA_API?.service!==worker)fail('Private service binding check failed');
const domain=site+'.pages.dev',apps=await cf('/access/apps'),app=apps.find(x=>x.domain===domain&&x.self_hosted_domains?.includes('*.'+domain));
if(!app)fail('Missing Access protection');
const policies=await cf('/access/apps/'+app.id+'/policies');
if(policies.length!==1||policies[0].decision!=='allow'||policies[0].include?.length!==1||!policies[0].include[0].email)fail('Expected existing owner-only Access policy');
console.log('PASS: exact staging source, restricted Neon role, private API and owner-only Pages configuration.');
