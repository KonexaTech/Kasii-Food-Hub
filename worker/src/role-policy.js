// Keep the shop-owner API separate from the administrator API.
// A new, non-admin user can register/apply for a shop; admins cannot.
export function isOwnerOnlyRoute(path) {
  return path.startsWith("/api/owner/") ||
    path === "/api/shop-applications" ||
    path.startsWith("/api/shop-applications/");
}
