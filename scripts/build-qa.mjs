import { readFile,writeFile,mkdir,copyFile,rm } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
export async function buildQa(root,sourceCommit,{outputName="dist-qa"}={}) {
 if(!/^dist-qa(?:-test-\d+-\d+)?$/.test(outputName))throw Error("Invalid isolated QA output directory");
 if(!/^[a-f0-9]{40}$/.test(sourceCommit||''))throw Error('Exact source commit required');
 const target=JSON.parse(await readFile(resolve(root,'staging/qa-targets.json'),'utf8'));
 const worker=JSON.parse(await readFile(resolve(root,'worker/wrangler.jsonc'),'utf8'));
 const expectedApi='https://'+worker.name+'.siboniisozulu.workers.dev';
 if(!worker.name.endsWith('-api-qa')||target.apiUrl!==expectedApi||target.authUrl!==worker.vars.NEON_AUTH_URL||!worker.vars.ALLOWED_ORIGINS.split(',').includes(target.siteOrigin))throw Error('QA endpoints do not match this app isolated configuration');
 for(const value of Object.values(target)){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Public QA endpoints only');}
 const output=resolve(root,outputName);await rm(output,{recursive:true,force:true});await mkdir(output);
 const files=['neon-customer.html','neon-owner.html','neon-admin.html','neon-password-reset.html','neon-reset-password.html','menu-text.mjs','premium.css','icon.svg','manifest.json'];
 for(const file of files)await copyFile(resolve(root,file),resolve(output,file));
 await copyFile(resolve(root,'neon-customer.html'),resolve(output,'index.html'));
 await copyFile(resolve(root,'neon-app.js'),resolve(output,'marketplace-app.js'));
 await writeFile(resolve(output,'app-config.js'),'export const APP_CONFIG=Object.freeze({authUrl:new URL("/auth",location.origin).href,apiUrl:location.origin});\n');
 await writeFile(resolve(output,'neon-app.js'),`try {const response=await fetch('/qa-health',{cache:'no-store'});const health=await response.json().catch(()=>null);if(!response.ok||health?.status!=='connected-source-matched'||health?.sourceCommit!==${JSON.stringify(sourceCommit)})throw Error('QA backend is unavailable or source does not match.');await import('./marketplace-app.js');}catch(error){const result=document.getElementById('result');if(result)result.textContent='Testing blocked: '+error.message;for(const control of document.querySelectorAll('button,input,select,textarea'))control.disabled=true;}\n`);
 const proxy=await readFile(resolve(root,'staging/qa-proxy.js'),'utf8');
 await writeFile(resolve(output,'_worker.js'),proxy+'\nexport default createQaProxy('+JSON.stringify({...target,sourceCommit})+');\n');
 const hashes={};for(const name of [...files,'index.html','marketplace-app.js','app-config.js','neon-app.js','_worker.js'])hashes[name]=createHash('sha256').update(await readFile(resolve(output,name))).digest('hex');
 await writeFile(resolve(output,'qa-build.json'),JSON.stringify({sourceCommit,targets:target,files:hashes,liveAcceptance:'NOT_TESTED',physicalDeviceAcceptance:'NOT_TESTED'},null,2)+'\n');
 return {output,sourceCommit};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 if(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit verified changes before creating a source-bound QA artifact.');
 const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const result=await buildQa(root,source);console.log('Built isolated QA artifact for source '+result.sourceCommit+'; live acceptance NOT_TESTED.');
}
