import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertNeonConnectionTarget} from '../worker/src/neon-host.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(read('worker/wrangler.jsonc'));
test('private release candidate cannot be automatically deployed or expose alternate routes',()=>{
 const workflow=read('.github/workflows/deploy-neon-api-qa.yml');
 assert.match(workflow,/^  workflow_dispatch:/m);assert.doesNotMatch(workflow,/^  (push|pull_request|schedule):/m);
 assert.doesNotMatch(workflow,/wrangler-action|wrangler\\s+(deploy|secret)|CLOUDFLARE_API_TOKEN|NEON_DATABASE_URL/);
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
 assert.equal(config.vars.EXPECTED_NEON_ROLE,'kfh_worker');
 for(const key of ['DELIVERY_CALLBACKS_ENABLED','DELIVERY_DISPATCH_ENABLED','DELIVERY_SOURCE_LOOKUP_ENABLED'])assert.equal(config.vars[key],'false');
});
test('runtime connection guard refuses owner and unrelated branches before connecting',()=>{
 const host=config.vars.EXPECTED_NEON_HOST;const role=config.vars.EXPECTED_NEON_ROLE;
 assert.equal(assertNeonConnectionTarget('postgresql://'+role+':fixture@'+host+'/neondb',host,role),true);
 assert.throws(()=>assertNeonConnectionTarget('postgresql://neondb_owner:fixture@'+host+'/neondb',host,role));
 assert.throws(()=>assertNeonConnectionTarget('postgresql://'+role+':fixture@other.example/neondb',host,role));
 const source=read('worker/src/index.js');assert.match(source,/assertNeonConnectionTarget\\(connectionString, env.EXPECTED_NEON_HOST, env.EXPECTED_NEON_ROLE\\)/);
});
test('credential probe is manual and read-only with no deployment commands',()=>{
 const probe=read('.github/workflows/qa-role-connectivity.yml');assert.match(probe,/^  workflow_dispatch:/m);assert.doesNotMatch(probe,/^  (push|pull_request|schedule):/m);
 assert.match(probe,/current_user AS role/);assert.match(probe,/rolbypassrls/);assert.doesNotMatch(probe,/wrangler-action|wrangler\\s+(deploy|secret)/);
});
