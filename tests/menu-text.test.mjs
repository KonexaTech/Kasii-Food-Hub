import test from "node:test";
import assert from "node:assert/strict";
import { parseMenuText, formatMenuText, planMenuChanges } from "../menu-text.mjs";
test("single text box accepts historical rand-price format", () => {
  assert.deepEqual(parseMenuText("Classic Kota — R25\nCheese Kota - R30.50\nChicken Kota: R35"), [
    { name:"Classic Kota", priceCents:2500 },
    { name:"Cheese Kota", priceCents:3050 },
    { name:"Chicken Kota", priceCents:3500 }
  ]);
});
test("bad rows, zero prices and duplicates are blocked before writes", () => {
  for (const text of ["", "Classic Kota", "Kota — R0", "Kota — R2.345", "Kota - R25\nkota — R30"]) {
    assert.throws(() => parseMenuText(text));
  }
});
test("loads available items into text form while retaining cents", () => {
  assert.equal(formatMenuText([{name:"Kota",price_cents:2750,available:true},{name:"Out",price_cents:500,available:false}]), "Kota — R27.50");
});
test("updates prices without replacing item IDs; omissions hide rather than delete", () => {
  const previous=[{id:"1",name:"Kota",price_cents:2500,available:true},{id:"2",name:"Chips",price_cents:1500,available:true}];
  assert.deepEqual(planMenuChanges(previous,parseMenuText("Kota — R30\nBurger — R45")),[
    {type:"update",id:"1",name:"Kota",priceCents:3000,available:true},
    {type:"create",name:"Burger",priceCents:4500},
    {type:"hide",id:"2",name:"Chips",priceCents:1500,available:false}
  ]);
});
test("re-add an unavailable item by reactivating its existing ID", () => {
  const previous=[{id:"3",name:"Kota",price_cents:2000,available:false}];
  assert.deepEqual(planMenuChanges(previous,parseMenuText("Kota — R25")),[
    {type:"update",id:"3",name:"Kota",priceCents:2500,available:true}
  ]);
});
