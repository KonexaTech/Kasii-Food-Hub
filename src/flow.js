// Shared, backend-free marketplace rules. This file contains demo data only.
export const AREAS = [
  'Newcastle CBD', 'Madadeni Section 1', 'Madadeni Section 2',
  'Madadeni Section 3', 'Madadeni Section 4', 'Madadeni Section 5',
  'Madadeni Section 6', 'Madadeni Section 7', 'Osizweni', 'Other Newcastle area'
];
export const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'completed'];
export const STATUS_LABELS = {
  pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready for collection', completed: 'Completed',
  rejected: 'Rejected', delayed: 'Delayed'
};
const FOOD = [
  { name: 'Demo Braai Corner', area: 'Newcastle CBD', category: 'Shisanyama', icon: '🔥',
    products: [
      { name: 'Shisanyama plate', price: 85, icon: '🍖', description: 'Grilled meat and sides' },
      { name: 'Chicken and pap', price: 65, icon: '🍗', description: 'Grilled chicken with pap' }
    ] },
  { name: 'Demo Home Kitchen', area: 'Madadeni Section 7', category: 'Cooked meals', icon: '🍲',
    products: [
      { name: 'Sunday meal', price: 75, icon: '🍲', description: 'Home-style plate with vegetables' },
      { name: 'Beef stew', price: 80, icon: '🥘', description: 'Stew with rice or pap' }
    ] },
  { name: 'Demo Quick Bites', area: 'Osizweni', category: 'Takeaways', icon: '🥪',
    products: [
      { name: 'Loaded sandwich', price: 45, icon: '🥪', description: 'Freshly prepared takeaway' },
      { name: 'Fries and chicken', price: 60, icon: '🍟', description: 'Takeaway combo' }
    ] }
];
const CAKE = [
  { name: 'Demo Golden Crumb', area: 'Newcastle CBD', category: 'Ready-made cakes', icon: '🍰',
    products: [
      { name: 'Chocolate cake', price: 280, icon: '🍫', description: 'Ready-made chocolate cake' },
      { name: 'Vanilla celebration cake', price: 350, icon: '🎂', description: 'Round vanilla cake' }
    ] },
  { name: 'Demo Sweet Occasions', area: 'Madadeni Section 7', category: 'Birthday cakes', icon: '🎂',
    products: [
      { name: 'Birthday cake', price: 450, icon: '🎉', description: 'Custom colours discussed with baker' },
      { name: 'Cupcake box', price: 150, icon: '🧁', description: 'Box of six cupcakes' }
    ] },
  { name: 'Demo Wedding Layers', area: 'Osizweni', category: 'Wedding cakes', icon: '💍',
    products: [
      { name: 'Two-tier wedding cake', price: 950, icon: '🎂', description: 'Wedding celebration design' },
      { name: 'Engagement cake', price: 520, icon: '🍰', description: 'Celebration cake' }
    ] }
];
export const SETTINGS = {
  food: { title: 'Kasii Food Hub', noun: 'meal', plural: 'meals', headline: 'Find what you are craving',
    description: 'Cooked meals, shisanyama and takeaways from your community.', theme: 'food' },
  cake: { title: 'Cake Connect', noun: 'cake', plural: 'cakes', headline: 'Make every celebration sweeter',
    description: 'Browse cakes and local bakers for every occasion.', theme: 'cake' }
};
export function demoShops(kind) {
  const items = kind === 'cake' ? CAKE : FOOD;
  return items.map((shop, index) => ({
    ...shop, id: `demo-shop-${index + 1}`, approved: true, description: 'Illustrative demo business — not a real listing',
    products: shop.products.map((product, n) => ({
      ...product, id: `product-${index + 1}-${n + 1}`, available: true, photo: ''
    }))
  }));
}
export function filterShops(shops, area = '', query = '') {
  const match = String(query).trim().toLocaleLowerCase();
  return shops.filter(shop => shop.approved && (!area || shop.area === area) &&
    (!match || [shop.name, shop.category, shop.area].some(field =>
      String(field).toLocaleLowerCase().includes(match))));
}
export function orderQuote(price, quantity = 1, fulfillment = 'collection') {
  const amount = Number(price), qty = Number(quantity);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(qty) || qty < 1 || qty > 20) {
    throw new Error('Invalid price or quantity');
  }
  const subtotal = Math.round(amount * qty * 100) / 100;
  const delivery = fulfillment === 'delivery' ? 5 : 0; // demo quote; not a real delivery promise
  return { subtotal, delivery, total: subtotal + delivery };
}
const MOVES = {
  pending: ['accepted', 'rejected'], accepted: ['preparing', 'delayed', 'rejected'],
  delayed: ['preparing', 'rejected'], preparing: ['ready', 'delayed'],
  ready: ['completed'], completed: [], rejected: []
};
export function canTransition(from, to) {
  return Boolean(MOVES[from] && MOVES[from].includes(to));
}
export function formatPrice(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', maximumFractionDigits: 2
  }).format(amount);
}
