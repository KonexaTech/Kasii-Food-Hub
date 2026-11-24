import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,mkdir,copyFile,writeFile,rm } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createQaProxy } from '../staging/qa-proxy.js';
import { buildQa } from '../scripts/build-qa.mjs';
import { neonApi } from '../worker/src/neon-api.js';
const target=JSON.parse(await readFile(new URL('../staging/qa-targets.json',import.meta.url),'utf8'));
const sourceCommit='a'.repeat(40);
const worker=createQaProxy({...target,sourceCommit});
const bound={QA_API:{fetch:(...args)=>globalThis.fetch(...args)}};
async function mockedFetch(handler,run){const old=globalThis.fetch;globalThis.fetch=handler;try{await run();}finally{globalThis.fetch=old;}}
test('QA transport keeps session cookies at own Auth upstream, preserves HttpOnly and passes only JWT to API',async()=>{
 const calls=[];
 await mockedFetch(async(input,options)=>{calls.push({url:String(input),headers:new Headers(options.headers)});return new Response('{}',{headers:{'set-cookie':'__Secure-session=fixture; Domain=auth.example; Path=/neondb/auth; HttpOnly; Secure; SameSite=None; Partitioned'}});},async()=>{
  const auth=await worker.fetch(new Request(target.siteOrigin+'/auth/token',{headers:{Cookie:'__Secure-session=fixture'}}),{});
  assert.equal(calls[0].url,target.authUrl+'/token');assert.equal(calls[0].headers.get('cookie'),'__Secure-session=fixture');
  const cookie=auth.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Path=\//);assert.doesNotMatch(cookie,/Domain=|Partitioned/);
  await worker.fetch(new Request(target.siteOrigin+'/api/me',{headers:{Authorization:'Bearer fixture-signed-jwt',Cookie:'__Secure-session=fixture','CF-Access-Jwt-Assertion':'access-fixture'}}),bound);
  assert.equal(calls[1].url,target.apiUrl+'/api/me');assert.equal(calls[1].headers.get('cookie'),null);assert.equal(calls[1].headers.get('cf-access-jwt-assertion'),null);assert.equal(calls[1].headers.get('authorization'),'Bearer fixture-signed-jwt');
 });
});
test('QA proxy refuses foreign origins and cross-site auth mutations before fetching',async()=>{
 let fetched=0;
 await mockedFetch(async()=>{fetched++;throw Error('Unexpected fetch');},async()=>{
  assert.equal((await worker.fetch(new Request('https://wrong.example/auth/token'),{})).status,403);
  assert.equal((await worker.fetch(new Request(target.siteOrigin+'/auth/sign-in/email',{method:'POST',headers:{Origin:'https://wrong.example'},body:'{}'}),{})).status,403);
  assert.equal((await worker.fetch(new Request(target.siteOrigin+'/auth/sign-in/email',{method:'POST',headers:{'Sec-Fetch-Site':'cross-site'},body:'{}'}),{})).status,403);
  assert.equal(fetched,0);
 });
});
test('QA health fails closed for unknown/stale source, missing auth, unavailable DB and malformed upstream',async()=>{
 for(const health of [{ok:true,backend:'neon',authConfigured:true},{ok:true,backend:'neon',authConfigured:true,sourceCommit:'b'.repeat(40)},{ok:true,backend:'neon',authConfigured:false,sourceCommit},{ok:false,backend:'neon',authConfigured:true,sourceCommit},null]){
  await mockedFetch(async()=>Response.json(health),async()=>assert.equal((await worker.fetch(new Request(target.siteOrigin+'/qa-health'),bound)).status,503));
 }
 await mockedFetch(async()=>Response.json({ok:true,backend:'neon',authConfigured:true,sourceCommit}),async()=>{
  const response=await worker.fetch(new Request(target.siteOrigin+'/qa-health'),bound);assert.equal(response.status,200);assert.equal((await response.json()).status,'connected-source-matched');assert.equal(response.headers.get('cache-control'),'no-store');
 });
});
test('API health exposes only a valid public deployment source marker',async()=>{
 for(const marker of [sourceCommit,'invalid-or-secret-value',undefined]){
  const response=await neonApi(new Request('https://fixture.test/api/health'),{QA_SOURCE_COMMIT:marker},async(_,fn)=>fn({query:async()=>({rows:[{ok:1}]})}));
  assert.equal((await response.json()).sourceCommit,marker===sourceCommit?sourceCommit:null);
 }
});
test('separate QA build preserves production configuration and contains only app-specific public targets',async()=>{
 const root=await mkdtemp(join(tmpdir(),'konexa-qa-build-'));const actual=resolve('.');
 try{
  for(const dir of ['scripts','staging','worker'])await mkdir(join(root,dir));
  const files=['neon-customer.html','neon-owner.html','neon-admin.html','neon-password-reset.html','neon-reset-password.html','neon-app.js','menu-text.mjs','premium.css','icon.svg','manifest.json','app-config.js','staging/qa-targets.json','staging/qa-proxy.js','worker/wrangler.jsonc'];
  for(const file of files)await copyFile(join(actual,file),join(root,file));
  const before=await readFile(join(root,'app-config.js'),'utf8');
  const built=await buildQa(root,sourceCommit);
  assert.equal(await readFile(join(root,'app-config.js'),'utf8'),before);
  const config=await readFile(join(built.output,'app-config.js'),'utf8');assert.match(config,/location.origin/);assert.doesNotMatch(config,/DATABASE_URL|password|service_role|kota-connect/);
  const manifest=JSON.parse(await readFile(join(built.output,'qa-build.json'),'utf8'));assert.equal(manifest.sourceCommit,sourceCommit);assert.equal(manifest.liveAcceptance,'NOT_TESTED');assert.deepEqual(manifest.targets,target);
  assert.match(await readFile(join(built.output,'neon-app.js'),'utf8'),/qa-health/);
  const sources=['b'.repeat(40),'c'.repeat(40),'d'.repeat(40)];
  const outputs=await Promise.all(sources.map((sha,index)=>buildQa(root,sha,index?{outputName:'dist-qa-test-1-'+index}:{})));
  assert.equal(new Set(outputs.map(x=>x.output)).size,3,'Browser workers and the release artifact require separate build output directories');
  for(let index=0;index<outputs.length;index++){const artifact=JSON.parse(await readFile(join(outputs[index].output,'qa-build.json'),'utf8'));assert.equal(artifact.sourceCommit,sources[index]);for(const name of Object.keys(artifact.files))assert((await readFile(join(outputs[index].output,name))).length>0);}
  await assert.rejects(buildQa(root,sourceCommit,{outputName:'../unrelated'}),/output/);
  assert.equal(await readFile(join(root,'app-config.js'),'utf8'),before);
  const modified={...target,apiUrl:'https://other-app.example'};await writeFile(join(root,'staging/qa-targets.json'),JSON.stringify(modified));
  await assert.rejects(buildQa(root,sourceCommit),/do not match/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('missing private service binding fails closed without public HTTP fallback',async()=>{
 let calls=0;
 await mockedFetch(async()=>{calls++;throw Error('Unexpected public request');},async()=>{
  assert.equal((await worker.fetch(new Request(target.siteOrigin+'/qa-health'),{})).status,503);
  assert.equal((await worker.fetch(new Request(target.siteOrigin+'/api/me'),{})).status,503);
  assert.equal(calls,0);
 });
});
