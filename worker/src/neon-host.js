export function normalizeNeonHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/-pooler(?=\.c-\d+\.)/, "");
}

export function assertNeonConnectionTarget(connectionString, expectedHost, expectedRole) {
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Invalid database connection URL");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Database connection must use PostgreSQL");
  }
  if (!expectedHost || normalizeNeonHost(parsed.hostname) !== normalizeNeonHost(expectedHost)) {
    throw new Error("Database target does not match the isolated QA branch");
  }
  let role;
  try {
    role = decodeURIComponent(parsed.username);
  } catch {
    throw new Error("Database role is invalid");
  }
  if (!expectedRole || role !== expectedRole) {
    throw new Error("Database role does not match the restricted Worker role");
  }
  return true;
}
