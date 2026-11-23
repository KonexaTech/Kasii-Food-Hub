export function normalizeNeonHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/-pooler(?=\.c-\d+\.)/, "");
}
