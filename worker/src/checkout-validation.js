const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value, min, max) => typeof value === "string" && value.length <= max && value.trim().length >= min;

// Validate before property access or SQL. Prices and payment state never come from checkout JSON.
export function validateCheckout(data) {
  if (!record(data) || typeof data.requestId !== "string" || !uuid.test(data.requestId) ||
      typeof data.shopId !== "string" || !uuid.test(data.shopId) ||
      !Array.isArray(data.items) || data.items.length < 1 || data.items.length > 30 ||
      !["pickup", "delivery"].includes(data.fulfillmentType) ||
      !text(data.customerName, 2, 100) || !text(data.customerPhone, 1, 30) || !text(data.area, 1, 160) ||
      (data.deliveryAddress != null && !text(data.deliveryAddress, 0, 300)) ||
      (data.fulfillmentType === "delivery" && !text(data.deliveryAddress, 1, 300))) return false;
  const ids = new Set();
  for (const item of data.items) {
    if (!record(item) || typeof item.itemId !== "string" || !uuid.test(item.itemId) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) return false;
    const id = item.itemId.toLowerCase();
    if (ids.has(id)) return false;
    ids.add(id);
  }
  return true;
}
