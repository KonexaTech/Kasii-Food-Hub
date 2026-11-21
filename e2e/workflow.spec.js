import { test, expect } from '@playwright/test';

test('customer searches, orders, tracks and sees owner status updates', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hungry\? Find your favourite meal|Find the cake for your occasion/ })).toBeVisible();
  await page.getByRole('button', { name: /Proceed to browse/ }).click();
  await page.locator('#areaSelect').selectOption('Osizweni');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.locator('#shopSearch').fill('does not exist');
  await expect(page.locator('.shop-card')).toHaveCount(0);
  await page.locator('#shopSearch').fill('');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'View menu' }).click();
  await page.locator('.price-button').first().click();
  await page.locator("input[name='customerName']").fill('Demo Customer');
  await page.locator("input[name='customerPhone']").fill('0712345678');
  await page.getByRole('button', { name: 'Create sample order' }).click();
  await expect(page.getByRole('heading', { name: 'Track your sample order' })).toBeVisible();
  await expect(page.getByText('Unpaid demo').first()).toBeVisible();

  await page.getByRole('button', { name: 'Owner preview', exact: true }).click();
  await page.locator('#ownerShopSelect').selectOption('demo-shop-3');
  await page.locator("[data-modal='owner-orders']").click();
  await expect(page.getByText('DEMO-1001').first()).toBeVisible();
  for (const status of ['accepted', 'preparing', 'ready', 'completed']) {
    await page.locator("[data-action='set-status'][data-status='" + status + "']").click();
  }
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Browse', exact: true }).click();
  await page.getByRole('button', { name: 'Track my sample order' }).click();
  await expect(page.locator('.status-step.done')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Completed', exact: true })).toBeVisible();
});

test('business registration waits for admin approval before being listed', async ({ page }) => {
  await page.goto('/');
  await page.locator("[data-action='register']").first().click();
  await page.locator("[name='ownerName']").fill('Sample Owner');
  await page.locator("[name='shopName']").fill('Example Approved Business');
  await page.locator("[name='email']").fill('sample@example.test');
  await page.locator("[name='phone']").fill('0712345678');
  await page.locator("[name='area']").selectOption('Madadeni Section 7');
  await page.locator("[name='address']").fill('Example Address');
  await page.locator("[name='description']").fill('Illustrative items for demo only');
  await page.getByRole('button', { name: 'Submit sample application' }).click();
  await expect(page.getByText(/No registration data was saved/)).toBeVisible();
  await page.getByRole('button', { name: 'View admin preview' }).click();
  await page.locator("[data-modal='approvals']").click();
  await expect(page.getByText('Example Approved Business')).toBeVisible();
  await page.locator("[data-action='review'][data-status='approved']").click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Browse', exact: true }).click();
  await page.locator('#areaSelect').selectOption('Madadeni Section 7');
  await page.locator('#shopSearch').fill('Example Approved Business');
  await expect(page.locator('.shop-card')).toHaveCount(1);
});

test('owner can add a menu product and change availability in a popup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Owner preview', exact: true }).click();
  await page.locator("[data-modal='manage-shop']").click();
  await page.locator("#productForm [name='name']").fill('New Sample Item');
  await page.locator("#productForm [name='price']").fill('99.50');
  await page.locator("#productForm [name='description']").fill('Fresh demo item');
  await page.getByRole('button', { name: 'Add sample product' }).click();
  await expect(page.locator('.row-record').filter({ hasText: 'New Sample Item' })).toBeVisible();
  await page.locator('.row-record').filter({ hasText: 'New Sample Item' }).getByRole('button', { name: 'Hide' }).click();
  await expect(page.locator('.row-record').filter({ hasText: 'New Sample Item' }).getByText('Unavailable')).toBeVisible();
});

test('approved photographic home opens a guest checkout and routes the order to the correct dashboards', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.featured-menu');
  await expect(menu.locator('.product-card')).toHaveCount(4);
  await expect(menu.locator('img')).toHaveCount(4);
  for (const image of await menu.locator('img').all()) {
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  const product = await menu.locator('.product-copy h3').first().innerText();
  await menu.locator('.price-button').first().click();
  await expect(page.getByRole('heading', {name:'Confirm your order',exact:true})).toBeVisible();
  await expect(page.locator('.checkout-product h2')).toHaveText(product);
  await expect(page.locator('.checkout-product img')).toBeVisible();
  await expect(page.getByText('No customer registration required.',{exact:true})).toBeVisible();
  await page.locator("input[name='customerName']").fill('Guest Demo');
  await page.locator("input[name='customerPhone']").fill('0712345678');
  await page.locator('#quantitySelect').selectOption('2');
  await expect(page.locator("input[name='customerName']")).toHaveValue('Guest Demo');
  await page.locator('#fulfillmentSelect').selectOption('delivery');
  await expect(page.locator("input[name='customerPhone']")).toHaveValue('0712345678');
  await page.locator("input[name='deliveryAddress']").fill('Demo address');
  await page.getByRole('button',{name:'Create sample order'}).click();
  await expect(page.getByRole('heading',{name:'Track your sample order'})).toBeVisible();
  await page.getByRole('button',{name:'Owner preview',exact:true}).click();
  await page.locator("[data-modal='owner-orders']").click();
  await expect(page.getByText('DEMO-1001',{exact:true})).toBeVisible();
  await expect(page.locator('.order-record')).toContainText(product);
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:'Admin preview',exact:true}).click();
  await page.locator("[data-modal='admin-orders']").click();
  await expect(page.locator('.order-record')).toContainText('Guest Demo');
  await expect(page.locator('.order-record')).toContainText(product);
});
