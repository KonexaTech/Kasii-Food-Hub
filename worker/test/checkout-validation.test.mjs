import test from "node:test";
import assert from "node:assert/strict";
import { validateCheckout } from "../src/checkout-validation.js";
const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const valid = () => ({requestId:id, shopId:id, items:[{itemId:id, quantity:2}],customerName:"Test Buyer", customerPhone:"0712345678",area:"Test Area",fulfillmentType:"pickup",deliveryAddress:""});

test("pickup and delivery checkout keep the submitted order details", () => {
  const pickup=valid(), snapshot=structuredClone(pickup);
  assert.equal(validateCheckout(pickup),true);
  assert.deepEqual(pickup,snapshot);
  assert.equal(validateCheckout({...pickup,fulfillmentType:"delivery",deliveryAddress:"12 Test Street"}),true);
});
test("malformed bodies and line items fail validation without throwing", () => {
  for (const data of [null,[],true,"x",{...valid(),items:[null]},{...valid(),items:[5]}, {...valid(),items:[[]]}, {...valid(),items:[{itemId:id,quantity:NaN}]}]) {
    assert.doesNotThrow(()=>assert.equal(validateCheckout(data),false));
  }
});
test("contact and delivery fields require bounded strings", () => {
  for (const field of ["customerName","customerPhone","area"]) {
    for (const value of [null,{},42,"   "]) assert.equal(validateCheckout({...valid(),[field]:value}),false,field);
  }
  for (const value of [null,{},42,"   ","x".repeat(301)]) assert.equal(validateCheckout({...valid(),fulfillmentType:"delivery",deliveryAddress:value}),false);
  assert.equal(validateCheckout({...valid(),deliveryAddress:{street:"x"}}),false);
});
test("invalid, duplicate, fractional, and excessive item requests are rejected", () => {
  for (const quantity of [0,-1,1.5,51,"2"]) assert.equal(validateCheckout({...valid(),items:[{itemId:id,quantity}]}),false);
  assert.equal(validateCheckout({...valid(),items:[{itemId:id,quantity:1},{itemId:id.toUpperCase(),quantity:1}]}),false);
  assert.equal(validateCheckout({...valid(),requestId:"wrong"}),false);
  assert.equal(validateCheckout({...valid(),items:Array(31).fill({itemId:id,quantity:1})}),false);
});
