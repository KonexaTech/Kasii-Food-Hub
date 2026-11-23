import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNeonHost } from "../src/neon-host.js";

test("keeps the exact Neon branch host unchanged", () => {
  assert.equal(normalizeNeonHost("ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech"), "ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech");
});

test("accepts the pooled endpoint for the same Neon branch", () => {
  assert.equal(normalizeNeonHost("ep-calm-sea-bdye9zrl-pooler.c-8.us-east-2.aws.neon.tech"), "ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech");
});

test("does not normalize a different Neon branch to the expected branch", () => {
  assert.notEqual(normalizeNeonHost("ep-other-branch-pooler.c-8.us-east-2.aws.neon.tech"), "ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech");
});

test("does not strip arbitrary pooler-like suffixes on other provider hostnames", () => {
  assert.equal(normalizeNeonHost("db-pooler.example.com"), "db-pooler.example.com");
});
