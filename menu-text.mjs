// One-line-per-item editor compatibility layer. Neon keeps structured items and stable order history.
const key = name => name.trim().toLocaleLowerCase();
export function parseMenuText(input) {
  const lines = String(input ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw Error("Enter at least one menu item and price.");
  if (lines.length > 100) throw Error("A menu can contain at most 100 items.");
  const seen = new Set();
  return lines.map((line, index) => {
    const match = /^(.+?)\s*(?:—|–|-|:)\s*R?\s*(\d+(?:\.\d{1,2})?)$/i.exec(line);
    if (!match) throw Error("Invalid item on line " + (index + 1) + ". Use: Shisanyama platter — R85");
    const name = match[1].trim(), priceCents = Math.round(Number(match[2]) * 100);
    if (!name || name.length > 160 || !Number.isSafeInteger(priceCents) || priceCents < 1 || priceCents > 10000000)
      throw Error("Invalid name or price on line " + (index + 1) + ".");
    if (seen.has(key(name))) throw Error("Duplicate item name on line " + (index + 1) + ": " + name);
    seen.add(key(name));
    return { name, priceCents };
  });
}
export function formatMenuText(items) {
  return items.filter(item => item.available !== false)
    .map(item => item.name + " — R" + (Number(item.price_cents) / 100).toFixed(2)).join("\n");
}
export function planMenuChanges(existing, desired) {
  const used = new Set(), changes = [];
  for (const entry of desired) {
    const sameName = existing.filter(item => key(item.name) === key(entry.name) && !used.has(item.id));
    const item = sameName.find(x => x.available) || sameName[0];
    if (!item) { changes.push({ type: "create", ...entry }); continue; }
    used.add(item.id);
    if (item.name !== entry.name || Number(item.price_cents) !== entry.priceCents || !item.available) {
      changes.push({ type: "update", id: item.id, ...entry, available: true });
    }
  }
  // Do not delete: historical order line items and menu references must remain valid.
  for (const item of existing) if (item.available && !used.has(item.id)) {
    changes.push({ type: "hide", id: item.id, name: item.name, priceCents: Number(item.price_cents), available: false });
  }
  return changes;
}
