import test from "node:test";
import assert from "node:assert/strict";
import { isOwnerOnlyRoute } from "../src/role-policy.js";

test("shop-owner and application endpoints require non-admin identities", () => {
  for (const path of [
    "/api/owner/shops",
    "/api/owner/shops/abc/menu",
    "/api/owner/orders",
    "/api/owner/orders/abc/status",
    "/api/shop-applications",
    "/api/shop-applications/mine",
  ]) assert.equal(isOwnerOnlyRoute(path), true, path);
});

test("administrator and shared endpoints remain accessible under their own policies", () => {
  for (const path of [
    "/api/admin/orders",
    "/api/admin/shop-applications",
    "/api/admin/shop-applications/abc/review",
    "/api/me",
    "/api/orders",
    "/api/notifications",
    "/api/shops",
  ]) assert.equal(isOwnerOnlyRoute(path), false, path);
});
