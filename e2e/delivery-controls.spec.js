import {test,expect} from '@playwright/test';
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function setup(page,state){
 await page.route('https://esm.sh/**',route=>route.fulfill({contentType:'application/javascript',body:"export function createAuthClient(){return {getSession:async()=>({data:{user:{email:'TEST user'}}}),token:async()=>({data:{token:'TEST fixture token'}})};}"}));
 await page.route('https://unconfigured.invalid/**',route=>{const path=new URL(route.request().url()).pathname;let result={};if(path==='/api/me')result={admin:false};else if(path==='/api/notifications')result={notifications:[]};else if(path==='/api/delivery/capabilities')result={dispatch_enabled:state.enabled};else if(path.endsWith('/delivery')){state.requests.push({path,method:route.request().method(),body:route.request().postDataJSON()});result={delivery:{status:'searching',queued:true,message:'Queued: awaiting courier assignment.'}};}else result={order:{id,status:'out_for_delivery'}};return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});});
}
test('merchant delivery control stays hidden until configured and sends no client price',async({page})=>{
 const state={enabled:false,requests:[]};await setup(page,state);await page.goto('/neon-owner.html');await expect(page.locator('#identity')).toContainText('TEST user');await expect(page.locator('#requestDelivery')).toBeHidden();state.enabled=true;await page.reload();await expect(page.locator('#requestDelivery')).toBeVisible();await page.locator('#orderId').fill(id);await page.locator('#requestDelivery').click();await expect(page.locator('#result')).toContainText('awaiting courier assignment');expect(state.requests).toEqual([{path:'/api/owner/orders/'+id+'/delivery',method:'POST',body:{}}]);
});
test('customer tracking displays queued delivery without claiming pickup or payment',async({page})=>{
 const state={enabled:true,requests:[]};await setup(page,state);await page.goto('/neon-customer.html');await expect(page.locator('#identity')).toContainText('TEST user');await page.locator('#orderId').fill(id);await page.locator('#track').click();await expect(page.locator('#result')).toContainText('awaiting courier assignment');expect(state.requests[0].method).toBe('GET');
});
