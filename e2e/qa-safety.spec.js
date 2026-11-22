import { test,expect } from '@playwright/test';
import { buildQa } from '../scripts/build-qa.mjs';
const source='a'.repeat(40);
test.beforeAll(async()=>{await buildQa(process.cwd(),source);});
for(const [name,status,body] of [
 ['unavailable QA backend',503,{status:'blocked',sourceCommit:source}],
 ['wrong deployed source',200,{status:'connected-source-matched',sourceCommit:'b'.repeat(40)}]
])test('isolated QA frontend blocks transactions for '+name,async({page})=>{
 const protectedCalls=[];
 page.on('request',request=>{if(/\/(?:api|auth)\//.test(new URL(request.url()).pathname))protectedCalls.push(request.url());});
 await page.route('**/qa-health',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}));
 await page.goto('/dist-qa/neon-customer.html');
 await expect(page.locator('#result')).toContainText('Testing blocked:');
 await expect(page.locator('#checkout button')).toBeDisabled();
 await expect(page.locator('#email')).toBeDisabled();
 expect(protectedCalls).toEqual([]);
});
