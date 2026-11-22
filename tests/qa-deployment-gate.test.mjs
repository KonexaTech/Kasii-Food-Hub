import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const workflow = readFileSync(new URL('../.github/workflows/deploy-neon-api-qa.yml', import.meta.url), 'utf8');
const start = workflow.indexOf('          if [ -n "$CLOUDFLARE_API_TOKEN" ]');
const end = workflow.indexOf('      - name: Explain missing deployment credential', start);
assert(start > 0 && end > start);
const script = workflow.slice(start,end).replace(/^          /gm,'');
test('QA deployment fails closed for either missing credential without printing credential values', () => {
  const dir = mkdtempSync(join(tmpdir(),'konexa-qa-gate-'));
  try {
    for (const [cf,db] of [['',''],['fixture-cloudflare-secret',''],['','fixture-database-secret'],['fixture-cloudflare-secret','fixture-database-secret']]) {
      const output = join(dir, 'output-'+Number(Boolean(cf))+Number(Boolean(db)));
      const result = spawnSync('bash',['-e','-c',script],{env:{...process.env,CLOUDFLARE_API_TOKEN:cf,NEON_DATABASE_URL:db,GITHUB_OUTPUT:output},encoding:'utf8'});
      const expected = Boolean(cf&&db);
      assert.equal(result.status,expected?0:1);
      assert.equal(readFileSync(output,'utf8').includes('ready=true'),expected);
      assert(!result.stdout.includes('fixture-cloudflare-secret'));
      assert(!result.stdout.includes('fixture-database-secret'));
      assert(!result.stderr.includes('fixture-cloudflare-secret'));
      assert(!result.stderr.includes('fixture-database-secret'));
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('QA deployment retains locked dependencies and only configures the existing isolated Worker', () => {
  assert.match(workflow,/npm ci --no-audit --no-fund/);
  assert.match(workflow,/steps\.credentials\.outputs\.ready == 'true'/);
  assert.match(workflow,/secret put DATABASE_URL --config wrangler\.jsonc/);
  assert.match(workflow,/branches: \[feature\/qa-api-hardening-20261121\]/);
  assert.doesNotMatch(workflow,/branches:.*main/);
});
