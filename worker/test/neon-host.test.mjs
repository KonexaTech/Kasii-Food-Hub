import test from "node:test";
import assert from "node:assert/strict";
import { assertNeonConnectionTarget, normalizeNeonHost } from "../src/neon-host.js";

const qaHost = "ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech";
const pooledQaHost = "ep-calm-sea-bdye9zrl-pooler.c-8.us-east-2.aws.neon.tech";

test("accepts the exact direct QA endpoint with the restricted Worker role", () => {
  const url = "postgresql://kfh_worker:secret@" + qaHost + "/neondb";
  assert.equal(assertNeonConnectionTarget(url, qaHost, "kfh_worker"), true);
});

test("accepts the pooled endpoint for the same QA branch", () => {
  const url = "postgresql://kfh_worker:secret@" + pooledQaHost + "/neondb";
  assert.equal(assertNeonConnectionTarget(url, qaHost, "kfh_worker"), true);
});

test("rejects a different Neon branch", () => {
  const url = "postgresql://kfh_worker:secret@ep-other-branch.c-8.us-east-2.aws.neon.tech/neondb";
  assert.throws(() => assertNeonConnectionTarget(url, qaHost, "kfh_worker"), /isolated QA branch/);
});

test("rejects an owner or other database role", () => {
  const url = "postgresql://neondb_owner:secret@" + qaHost + "/neondb";
  assert.throws(() => assertNeonConnectionTarget(url, qaHost, "kfh_worker"), /restricted Worker role/);
});

test("does not normalize unrelated pooler-like hostnames", () => {
  assert.equal(normalizeNeonHost("db-pooler.example.com"), "db-pooler.example.com");
});

test("rejects malformed connection strings", () => {
  assert.throws(() => assertNeonConnectionTarget("not-a-database-url", qaHost, "kfh_worker"), /Invalid database connection URL/);
});
