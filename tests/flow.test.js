import test from 'node:test';
import assert from 'node:assert/strict';
import { demoShops, filterShops, orderQuote, canTransition, SETTINGS } from '../src/flow.js';

test('each marketplace has its own shops and identity', () => {
  const food = demoShops('food'), cake = demoShops('cake');
  assert.equal(SETTINGS.food.title, 'Kasii Food Hub');
  assert.equal(SETTINGS.cake.title, 'Cake Connect');
  assert.equal(food.length, 3);
  assert.equal(cake.length, 3);
  assert.notEqual(food[0].name, cake[0].name);
});
test('only approved shops are discoverable by area and name', () => {
  const shops = demoShops('food');
  shops[0].approved = false;
  assert.equal(filterShops(shops, '', 'braai').length, 0);
  assert.equal(filterShops(shops, 'Osizweni').length, 1);
  assert.equal(filterShops(shops, '', 'home').length, 1);
});
test('tapping a price leads to a deterministic demo quote', () => {
  assert.deepEqual(orderQuote(85, 2, 'collection'), {
    subtotal: 170, delivery: 0, total: 170
  });
  assert.deepEqual(orderQuote(85, 2, 'delivery'), {
    subtotal: 170, delivery: 5, total: 175
  });
  assert.throws(() => orderQuote(85, 0));
  assert.throws(() => orderQuote(-1, 1));
});
test('order lifecycle cannot skip required steps', () => {
  assert.equal(canTransition('pending', 'accepted'), true);
  assert.equal(canTransition('pending', 'completed'), false);
  assert.equal(canTransition('accepted', 'preparing'), true);
  assert.equal(canTransition('preparing', 'ready'), true);
  assert.equal(canTransition('ready', 'completed'), true);
  assert.equal(canTransition('completed', 'pending'), false);
});
