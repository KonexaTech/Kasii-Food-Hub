import './style.css';
import { photoDemoShops } from './approved-preview-menu.js';
import { AREAS, STATUSES, STATUS_LABELS, SETTINGS, demoShops, filterShops, orderQuote, canTransition, formatPrice } from './flow.js';

// Replace the identifier per repository. This is a local-only demonstration,
// not authentication, a production order processor or a payment gateway.
const KIND = 'food';
const config = SETTINGS[KIND];
document.documentElement.dataset.marketplace = KIND;
const app = document.getElementById('app');
const state = {
  view: 'welcome', modal: '', shops: photoDemoShops(demoShops(KIND)), area: '', query: '',
  selectedShopId: '', selectedProductId: '', quantity: 1, fulfillment: 'collection',
  ownerShopId: 'demo-shop-1', orders: [], applications: [], notifications: [],
  lastOrderId: '', message: ''
};

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function shopById(id) { return state.shops.find(shop => shop.id === id); }
function chosenProduct() {
  const shop = shopById(state.selectedShopId);
  return shop?.products.find(item => item.id === state.selectedProductId);
}
function demoLabel() {
  return "<div class='demo-strip'><strong>INTERACTIVE DEMO</strong><span>No real accounts, payments, emails, deliveries or stored orders</span></div>";
}
function navButton(label, view) {
  return "<button class='nav-link " + (state.view === view ? 'current' : '') +
    "' type='button' data-action='view' data-view='" + view + "'>" + label + "</button>";
}
function areaOptions(value = '', all = true) {
  return (all ? "<option value=''>All areas</option>" : "<option value=''>Choose an area</option>") +
    AREAS.map(area => "<option value='" + safe(area) + "'" +
      (area === value ? ' selected' : '') + ">" + safe(area) + "</option>").join('');
}
function picture(product, shop) {
  if (product?.photo) return "<img class='product-photo' src='" + safe(product.photo) +
    "' alt='" + safe(product.name) + "'>";
  return "<div class='illustration' aria-label='Image pending'>" +
    safe(product?.icon || shop?.icon || '🍽️') + "<small>Sample item · photo pending</small></div>";
}
function banner(title, subtitle, eyebrow = 'YOUR COMMUNITY MARKETPLACE') {
  return "<section class='hero'><p class='eyebrow'>" + eyebrow + "</p><h1>" + title +
    "</h1><p>" + subtitle + "</p></section>";
}
function renderWelcome() {
  return renderBrowse() +
    "<div class='three-actions'>" +
    "<button class='soft-card' data-action='register' type='button'>✍️ <strong>Register business</strong><small>For business owners only</small></button>" +
    "<button class='soft-card' data-action='view' data-view='owner' type='button' aria-label='Owner preview'>🏪 <strong>Shop-owner dashboard</strong><small>Demo workspace</small></button>" +
    "<button class='soft-card' data-action='view' data-view='admin' type='button'>🛡️ <strong>Admin dashboard</strong><small>Demo workspace</small></button></div>";
}
function featuredMenu() {
  const shop = filterShops(state.shops, state.area, state.query).find(s => s.products.some(p=>p.available));
  if (!shop) return '';
  return "<section class='featured-menu'><div class='section-header'><div><h2>Menu and prices</h2><p class='muted'>"+safe(shop.name)+" · "+safe(shop.area)+" · Sample menu</p></div><span class='pill'>Tap a price</span></div><div class='product-grid'>" +
    shop.products.filter(p=>p.available).map(product =>
      "<article class='product-card'>" + picture(product, shop) +
      "<div class='product-copy'><h3>"+safe(product.name)+"</h3><p>"+safe(product.description)+"</p>" +
      "<button type='button' class='button price-button' data-action='buy' data-id='"+safe(shop.id)+"' data-product='"+safe(product.id)+"'>"+formatPrice(product.price)+" <span aria-hidden='true'>→</span></button></div></article>"
    ).join('') + "</div></section>";
}
function frontResults() {
  return featuredMenu() + "<h2 class='business-list-title'>Browse businesses</h2><div class='shop-list'>"+shopCards()+"</div>";
}
function shopCards() {
  const filtered = filterShops(state.shops, state.area, state.query);
  if (!filtered.length) return "<p class='empty'>No sample businesses match this area and search. Try another area or business name.</p>";
  return filtered.map(shop =>
    "<article class='shop-card'><div class='shop-icon' aria-hidden='true'>" + safe(shop.icon) + "</div>" +
    "<div class='shop-info'><small>" + safe(shop.category) + " · " + safe(shop.area) + "</small>" +
    "<h3>" + safe(shop.name) + "</h3><p>" + safe(shop.description) + "</p>" +
    "<span class='subtle'>" + shop.products.filter(product => product.available).length +
    " sample menu items</span></div>" +
    "<button class='button primary' type='button' data-action='shop' data-id='" + safe(shop.id) +
    "'>View menu</button></article>").join('');
}
function renderBrowse() {
  return banner(KIND === 'cake' ? 'Find the cake for your occasion.' : 'Hungry? Find your favourite meal.',
    'Choose an area or business, then tap a price. No customer account required.', 'LOCAL MARKETPLACE · DEMO') +
    "<section class='panel'><div class='section-header'><h2>Find a business</h2><span class='pill'>Sample shops only</span></div>" +
    "<div class='filters'><label>Choose your area<select id='areaSelect'>" +
    areaOptions(state.area) + "</select></label><label>Search by business name" +
    "<input id='shopSearch' type='search' placeholder='Type a shop name' value='" + safe(state.query) +
    "' autocomplete='off'></label></div><div id='shopResults' class='shop-list'>" +
    frontResults() + "</div></section>" +
    "<div class='bottom-actions'><button class='button outline' data-action='view' data-view='browse' type='button'>Proceed to browse</button><button class='button outline' data-action='track-last' type='button'>Track my sample order</button>" +
    "<button class='button outline' data-action='register' type='button'>Register business</button></div>";
}
function renderShop() {
  const shop = shopById(state.selectedShopId);
  if (!shop) return renderBrowse();
  return "<button class='back' type='button' data-action='view' data-view='browse'>← Back to businesses</button>" +
    banner(safe(shop.name), safe(shop.category) + ' · ' + safe(shop.area), 'DEMO BUSINESS MENU') +
    "<section class='panel'><div class='section-header'><h2>Menu and prices</h2><span class='pill'>Tap a price to order</span></div>" +
    "<p class='muted'>" + safe(shop.description) + "</p><div class='product-grid'>" +
    (shop.products.filter(item => item.available).map(product =>
      "<article class='product-card'>" + picture(product, shop) +
      "<div class='product-copy'><h3>" + safe(product.name) + "</h3><p>" +
      safe(product.description) + "</p><button class='button price-button' type='button' " +
      "data-action='buy' data-product='" + safe(product.id) + "'>" +
      formatPrice(product.price) + " <span aria-hidden='true'>→</span></button></div></article>").join('') ||
      "<p class='empty'>No products have been added to this sample business yet.</p>") +
    "</div></section>";
}
function renderCheckout() {
  const product = chosenProduct(), shop = shopById(state.selectedShopId);
  if (!product || !shop) return renderBrowse();
  const quote = orderQuote(product.price, state.quantity, state.fulfillment);
  return "<button class='back' type='button' data-action='view' data-view='shop'>← Back to menu</button>" +
    banner('Confirm your order', 'Review the item, quantity and collection or delivery preference before continuing.', 'CHECKOUT DEMO') +
    "<section class='panel checkout-product'>" + picture(product, shop) + "<div><h2>" + safe(product.name) + "</h2><p>" + safe(product.description) + "</p><p><strong>" + formatPrice(product.price) + "</strong> · " + safe(shop.name) + "</p></div></section>" +
    "<div class='two-col'><section class='panel'><h2>Your details</h2><p class='muted'>No customer registration required.</p>" +
    "<form id='checkoutForm'><label>Customer name<input name='customerName' required maxlength='80' placeholder='Your name'></label>" +
    "<label>Phone number<input name='customerPhone' type='tel' required minlength='7' maxlength='25' placeholder='Mobile phone'></label>" +
    (KIND === 'cake' ? "<label>Event date (optional)<input type='date' name='eventDate'></label>" : '') +
    "<label>Quantity<select id='quantitySelect' name='quantity'>" +
    Array.from({length:10}, (_,i) => "<option value='" + (i+1) + "'" +
    (state.quantity === i+1 ? ' selected' : '') + ">" + (i+1) + "</option>").join('') + "</select></label>" +
    "<label>Order type<select id='fulfillmentSelect' name='fulfillment'>" +
    "<option value='collection'" + (state.fulfillment === 'collection' ? ' selected' : '') + ">Collection</option>" +
    "<option value='delivery'" + (state.fulfillment === 'delivery' ? ' selected' : '') +
    ">Delivery (sample R5 fee)</option></select></label>" +
    (state.fulfillment === 'delivery' ? "<label>Delivery address<input name='deliveryAddress' maxlength='180' required placeholder='Street and area'></label>" : '') +
    "<div class='payment-info'><strong>Payment</strong><p>Online payments are not connected. This demonstration creates an unpaid sample order only.</p>" +
    "<label class='inline-radio'><input type='radio' checked disabled> Pay at collection / delivery (preview)</label></div>" +
    "<button type='submit' class='button primary big' aria-label='Create sample order'>Confirm Order</button></form></section>" +
    "<aside class='panel summary'><h2>Order summary</h2>" +
    "<p class='muted'>" + safe(shop.name) + "</p><h3>" + safe(product.name) + "</h3>" +
    "<div class='totals'><div><span>Unit price</span><strong>" + formatPrice(product.price) + "</strong></div>" +
    "<div><span>Quantity</span><strong>" + state.quantity + "</strong></div>" +
    "<div><span>Subtotal</span><strong>" + formatPrice(quote.subtotal) + "</strong></div>" +
    "<div><span>Delivery quote</span><strong>" + formatPrice(quote.delivery) + "</strong></div>" +
    "<div class='grand-total'><span>Total estimate</span><strong>" + formatPrice(quote.total) +
    "</strong></div></div><p class='muted tiny'>Illustrative pricing and R5 demo delivery quote. No actual payment or dispatch.</p></aside></div>";
}
function renderTrack() {
  const order = state.orders.find(entry => entry.id === state.lastOrderId);
  if (!order) return "<section class='panel'><h1>No sample order yet</h1><p>Place a demo order first to see tracking.</p>" +
    "<button class='button primary' data-action='view' data-view='browse'>Browse shops</button></section>";
  const index = STATUSES.indexOf(order.status);
  return banner('Track your sample order', 'Status changes made in the owner preview appear here immediately.', 'DEMO ORDER ' + safe(order.id)) +
    "<div class='two-col'><section class='panel'><div class='section-header'><h2>" + safe(STATUS_LABELS[order.status]) +
    "</h2><span class='pill'>" + safe(order.id) + "</span></div>" +
    "<div class='status-list'>" + STATUSES.map((status,i) =>
      "<div class='status-step " + (index >= i ? 'done' : '') + "'><span class='status-dot'>" +
      (index >= i ? '✓' : (i+1)) + "</span><span>" + safe(STATUS_LABELS[status]) +
      "</span></div>").join('') + "</div>" +
    (order.status === 'rejected' || order.status === 'delayed'
      ? "<p class='warning'>This sample order is " + safe(order.status) +
        ". Check the owner dashboard for updates.</p>" : '') +
    "</section><aside class='panel'><h2>Order details</h2><p>" + safe(order.shopName) +
    "</p><p><strong>" + safe(order.productName) + "</strong> × " + order.quantity + "</p>" +
    "<p>Total estimate: <strong>" + formatPrice(order.total) + "</strong></p>" +
    "<p>Payment status: <strong>Unpaid demo</strong></p><p class='muted'>Nothing was sent to a real business.</p>" +
    "<button class='button outline' type='button' data-action='view' data-view='browse'>Browse again</button></aside></div>";
}
function ownerOrders() {
  return state.orders.filter(order => order.shopId === state.ownerShopId);
}
function renderOwner() {
  const shop = shopById(state.ownerShopId) || state.shops[0];
  const orders = ownerOrders();
  return banner('Business-owner dashboard', 'Manage sample business details, menu items and incoming demo orders.', 'OWNER WORKSPACE · UNAUTHENTICATED PREVIEW') +
    "<section class='panel'><div class='section-header'><h2>Choose a demo business</h2><span class='pill'>Preview only</span></div>" +
    "<label>Business<select id='ownerShopSelect'>" +
    state.shops.filter(s => s.approved).map(s => "<option value='" + safe(s.id) +
    "'" + (s.id === state.ownerShopId ? ' selected' : '') + ">" +
    safe(s.name) + "</option>").join('') + "</select></label>" +
    "<p class='muted'>Real owner accounts will be restricted to their own approved business after backend integration.</p></section>" +
    "<div class='stat-grid'><div class='stat'><strong>" + (shop?.products.length || 0) + "</strong><span>Menu items</span></div>" +
    "<div class='stat'><strong>" + orders.length + "</strong><span>Demo orders</span></div>" +
    "<div class='stat'><strong>" + orders.filter(o => o.status === 'pending').length +
    "</strong><span>Pending orders</span></div></div>" +
    "<div class='dashboard-actions'>" +
    "<button class='dashboard-card' type='button' data-action='modal' data-modal='manage-shop'>🏪 <strong>Manage shop</strong><small>Update details, menu and prices</small><span>Open ↗</span></button>" +
    "<button class='dashboard-card' type='button' data-action='modal' data-modal='owner-orders'>📦 <strong>Customer orders</strong><small>Accept, prepare, ready, complete</small><span>Open ↗</span></button>" +
    "<button class='dashboard-card' type='button' data-action='modal' data-modal='owner-notifications'>🔔 <strong>Notifications</strong><small>Read demo order activity</small><span>Open ↗</span></button></div>" +
    "<p class='muted'>New business applications are submitted from the customer-facing home page.</p>";
}
function renderAdmin() {
  const pending = state.applications.filter(a => a.status === 'pending').length;
  return banner('Administrator dashboard', 'Review demo registrations, view sample orders and commission readiness.', 'ADMIN WORKSPACE · UNAUTHENTICATED PREVIEW') +
    "<div class='stat-grid'><div class='stat'><strong>" + state.shops.filter(s => s.approved).length +
    "</strong><span>Approved sample businesses</span></div><div class='stat'><strong>" + pending +
    "</strong><span>Pending applications</span></div><div class='stat'><strong>" +
    state.orders.length + "</strong><span>Demo orders</span></div></div>" +
    "<div class='dashboard-actions'>" +
    "<button class='dashboard-card' data-action='modal' data-modal='approvals'>✅ <strong>Business approvals</strong><small>Approve or reject demo applications</small><span>Open ↗</span></button>" +
    "<button class='dashboard-card' data-action='modal' data-modal='businesses'>🏬 <strong>Business records</strong><small>View all approved sample businesses</small><span>Open ↗</span></button>" +
    "<button class='dashboard-card' data-action='modal' data-modal='admin-orders'>📦 <strong>Customer orders</strong><small>Readable order monitoring</small><span>Open ↗</span></button>" +
    "<button class='dashboard-card' data-action='modal' data-modal='admin-notifications'>🔔 <strong>Notifications</strong><small>Review demo application and order alerts</small><span>Open ↗</span></button>" +
    "<button class='dashboard-card' data-action='modal' data-modal='commission'>🧾 <strong>Commission ledger</strong><small>Configuration pending; no charges</small><span>Open ↗</span></button></div>" +
    "<p class='warning'>This is not a real administrator account. Secure authentication, approvals and the actual ledger require backend integration.</p>";
}
function modalContent() {
  const shop = shopById(state.ownerShopId);
  const modal = state.modal;
  let title = '', content = '';
  if (modal === 'register') {
    title = 'Register your business';
    content = "<p class='muted'>Preview application only. No email verification or account is created.</p>" +
      "<form id='registrationForm' class='form-stack'>" +
      "<label>Owner name<input name='ownerName' maxlength='80' required></label>" +
      "<label>Business name<input name='shopName' maxlength='90' required></label>" +
      "<label>Email<input type='email' name='email' required maxlength='140'></label>" +
      "<label>Phone number<input type='tel' name='phone' required minlength='7' maxlength='25'></label>" +
      "<label>Business area<select name='area' required>" + areaOptions('', false) + "</select></label>" +
      "<label>Business address<input name='address' maxlength='180' required></label>" +
      "<label>What do you sell?<textarea name='description' rows='3' maxlength='400' required></textarea></label>" +
      "<button class='button primary' type='submit'>Submit sample application</button></form>";
  } else if (modal === 'register-success') {
    title = 'Sample application submitted';
    content = "<p>Your business is in the demo admin approval queue.</p>" +
      "<p class='warning'>No registration data was saved to a server, no email was sent and no account has been created.</p>" +
      "<button class='button primary' data-action='view' data-view='admin' type='button'>View admin preview</button>";
  } else if (modal === 'manage-shop') {
    title = 'Manage shop';
    content = "<p class='muted'>Changes are visible in this browser session only.</p>" +
      "<form id='shopSettingsForm' class='form-stack'><label>Business name<input name='shopName' required maxlength='90' value='" +
      safe(shop.name) + "'></label><label>Area<select name='area' required>" +
      areaOptions(shop.area, false) + "</select></label><label>Business description<textarea name='description' maxlength='400' rows='2'>" +
      safe(shop.description) + "</textarea></label><button class='button primary' type='submit'>Save sample shop</button></form>" +
      "<h3>Products and prices</h3>" +
      shop.products.map(p => "<div class='row-record'><span>" + safe(p.icon) + " <strong>" +
        safe(p.name) + "</strong><small>" + formatPrice(p.price) +
        " · " + (p.available ? 'Available' : 'Unavailable') + "</small></span>" +
        "<button class='button outline small' type='button' data-action='toggle-product' data-id='" +
        safe(p.id) + "'>" + (p.available ? 'Hide' : 'Show') + "</button></div>").join('') +
      "<h3>Add a menu item</h3><form id='productForm' class='form-stack'>" +
      "<label>Product name<input name='name' required maxlength='90'></label>" +
      "<label>Confirmed price (R)<input name='price' type='number' min='1' max='100000' step='0.01' required></label>" +
      "<label>Description<input name='description' maxlength='250'></label>" +
      "<label>Optional photo (local demo only)<input type='file' name='photo' accept='image/*'></label>" +
      "<button class='button primary' type='submit'>Add sample product</button></form>";
  } else if (modal === 'owner-orders') {
    title = 'Customer orders';
    const orders = ownerOrders();
    content = orders.length ? orders.map(o =>
      "<article class='order-record'><div class='section-header'><strong>" + safe(o.id) +
      "</strong><span class='pill'>" + safe(STATUS_LABELS[o.status]) + "</span></div>" +
      "<p>" + safe(o.customerName) + " · " + safe(o.productName) + " × " + o.quantity +
      "</p><p>Total " + formatPrice(o.total) + " · " + safe(o.fulfillment) + " · Unpaid demo</p>" +
      "<div class='action-wrap'>" + (['accepted','preparing','ready','completed','delayed','rejected']
        .filter(next => canTransition(o.status, next))
        .map(next => "<button type='button' class='button outline small' data-action='set-status' data-id='" +
          safe(o.id) + "' data-status='" + next + "'>" + safe(STATUS_LABELS[next]) + "</button>").join('') ||
        "<span class='muted'>No further changes</span>") + "</div></article>").join('') :
      "<p class='empty'>No sample orders for this business. Place one through the customer preview.</p>";
  } else if (modal === 'owner-notifications' || modal === 'admin-notifications') {
    title = 'Notifications';
    const audience = modal === 'owner-notifications' ? 'owner' : 'admin';
    const records = state.notifications.filter(n =>
      n.audience === audience && (audience !== 'owner' || n.shopId === state.ownerShopId));
    content = records.length ? records.map(n =>
      "<div class='row-record'><div><strong>" + safe(n.title) + "</strong><p>" +
      safe(n.message) + "</p></div></div>").join('') :
      "<p class='empty'>There are no demo notifications yet.</p>";
  } else if (modal === 'approvals') {
    title = 'Business approvals';
    content = state.applications.length ? state.applications.map(a =>
      "<article class='order-record'><div class='section-header'><strong>" + safe(a.shopName) +
      "</strong><span class='pill'>" + safe(a.status) + "</span></div><p>" +
      safe(a.ownerName) + " · " + safe(a.area) + "</p><p>" + safe(a.description) + "</p>" +
      (a.status === 'pending' ? "<div class='action-wrap'>" +
        "<button type='button' class='button primary small' data-action='review' data-id='" + safe(a.id) +
        "' data-status='approved'>Approve</button>" +
        "<button type='button' class='button outline small' data-action='review' data-id='" + safe(a.id) +
        "' data-status='rejected'>Reject</button></div>" : '') + "</article>").join('') :
      "<p class='empty'>No applications yet. The registration form creates sample applications.</p>";
  } else if (modal === 'businesses') {
    title = 'Business records';
    content = state.shops.filter(s => s.approved).map(s =>
      "<div class='row-record'><div><strong>" + safe(s.name) + "</strong><p>" +
      safe(s.area) + " · " + safe(s.category) + "</p></div><span class='pill'>Approved demo</span></div>").join('');
  } else if (modal === 'admin-orders') {
    title = 'All customer orders';
    content = state.orders.length ? state.orders.map(o =>
      "<article class='order-record'><div class='section-header'><strong>" + safe(o.id) +
      "</strong><span class='pill'>" + safe(STATUS_LABELS[o.status]) + "</span></div>" +
      "<p>" + safe(o.shopName) + " · " + safe(o.customerName) + "</p><p>" +
      safe(o.productName) + " × " + o.quantity + " · " + formatPrice(o.total) +
      "</p><p class='muted'>Unpaid demo · " + safe(o.fulfillment) + "</p></article>").join('') :
      "<p class='empty'>No demo orders yet.</p>";
  } else if (modal === 'commission') {
    title = 'Commission ledger';
    content = "<div class='stat'><strong>Not configured</strong><span>Commission rate</span></div>" +
      "<p class='muted'>Completed sample orders: " + state.orders.filter(o => o.status === 'completed').length +
      "</p><p>No commission is calculated or collected. A separate approved rate and secure ledger are required before launch.</p>";
  }
  return "<div class='scrim'><section class='modal' role='dialog' aria-modal='true' aria-label='" +
    safe(title) + "'><div class='modal-top'><h2>" + safe(title) +
    "</h2><button class='close-button' type='button' data-action='close' aria-label='Close dialog'>✕</button></div>" +
    content + "</section></div>";
}
function render() {
  const screens = {
    welcome: renderWelcome, browse: renderBrowse, shop: renderShop,
    checkout: renderCheckout, track: renderTrack, owner: renderOwner, admin: renderAdmin
  };
  app.dataset.screen = state.view;
  app.innerHTML = "<header class='topbar'><button type='button' class='brand' data-action='view' data-view='welcome'>" +
    "<span class='brand-symbol'>" + (KIND === 'cake' ? '🎂' : '🍲') + "</span>" +
    safe(config.title) + "</button><nav aria-label='Main navigation'>" +
    navButton('Browse', 'browse') + navButton('Owner dashboard', 'owner') +
    navButton('Admin preview', 'admin') + "</nav></header>" +
    demoLabel() + "<main class='page'>" + (screens[state.view] || renderWelcome)() +
    (state.message ? "<div class='notice' role='status'>" + safe(state.message) + "</div>" : '') +
    "</main><footer><strong>" + safe(config.title) +
    "</strong> · GitHub frontend preview · Backend integration pending · No real orders</footer>" +
    (state.modal ? modalContent() : '');
  state.message = '';
}
function notify(audience, title, message, shopId = '') {
  state.notifications.unshift({ audience, title, message, shopId });
}
function navigate(view) {
  state.view = view;
  state.modal = '';
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action, view, id, product, modal, status } = target.dataset;
  if (action === 'view') return navigate(view);
  if (action === 'shop') { state.selectedShopId = id; return navigate('shop'); }
  if (action === 'buy') {
    if (id) state.selectedShopId = id;
    if (!shopById(state.selectedShopId)?.approved || !shopById(state.selectedShopId)?.products.some(p => p.id === product && p.available)) return;
    state.selectedProductId = product;
    state.quantity = 1;
    state.fulfillment = 'collection';
    return navigate('checkout');
  }
  if (action === 'track-last') return navigate('track');
  if (action === 'register') state.modal = 'register';
  if (action === 'modal') state.modal = modal;
  if (action === 'close') state.modal = '';
  if (action === 'toggle-product') {
    const selected = shopById(state.ownerShopId)?.products.find(p => p.id === id);
    if (selected) selected.available = !selected.available;
  }
  if (action === 'set-status') {
    const order = state.orders.find(o => o.id === id && o.shopId === state.ownerShopId);
    if (order && canTransition(order.status, status)) {
      order.status = status;
      notify('owner', 'Status updated', order.id + ' → ' + STATUS_LABELS[status], order.shopId);
      notify('admin', 'Order status updated', order.id + ' → ' + STATUS_LABELS[status], order.shopId);
    }
  }
  if (action === 'review') {
    const application = state.applications.find(a => a.id === id);
    if (application?.status === 'pending' && ['approved','rejected'].includes(status)) {
      application.status = status;
      if (status === 'approved') {
        const shopId = 'new-demo-shop-' + state.shops.length;
        state.shops.push({ id: shopId, name: application.shopName, area: application.area,
          category: KIND === 'cake' ? 'Cakes' : 'Cooked meals', icon: KIND === 'cake' ? '🎂' : '🍲',
          approved: true, description: application.description + ' · Demo listing',
          products: [] });
      }
      notify('admin', 'Application reviewed', application.shopName + ': ' + status);
    }
  }
  render();
});
function rerenderCheckout() {
  const current = document.getElementById('checkoutForm');
  const values = current ? new FormData(current) : null;
  render();
  const next = document.getElementById('checkoutForm');
  if (values && next) for (const name of ['customerName','customerPhone','deliveryAddress','eventDate']) {
    const field = next.elements.namedItem(name);
    if (field && values.has(name)) field.value = String(values.get(name));
  }
}
app.addEventListener('change', event => {
  const element = event.target;
  if (element.id === 'areaSelect') {
    state.area = element.value;
    document.getElementById('shopResults').innerHTML = frontResults();
    return;
  }
  if (element.id === 'quantitySelect') {
    state.quantity = Number(element.value);
    return rerenderCheckout();
  }
  if (element.id === 'fulfillmentSelect') {
    state.fulfillment = element.value;
    return rerenderCheckout();
  }
  if (element.id === 'ownerShopSelect') {
    if (shopById(element.value)?.approved) state.ownerShopId = element.value;
    return render();
  }
});
app.addEventListener('input', event => {
  if (event.target.id === 'shopSearch') {
    state.query = event.target.value;
    document.getElementById('shopResults').innerHTML = frontResults();
  }
});
app.addEventListener('submit', event => {
  const form = event.target;
  if (!['checkoutForm','registrationForm','shopSettingsForm','productForm'].includes(form.id)) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  if (form.id === 'checkoutForm') {
    const shop = shopById(state.selectedShopId), product = chosenProduct();
    if (!shop?.approved || !product?.available) return;
    const qty = Number(values.get('quantity'));
    const fulfillment = String(values.get('fulfillment'));
    const quote = orderQuote(product.price, qty, fulfillment);
    const id = 'DEMO-' + String(1001 + state.orders.length);
    const order = { id, shopId: shop.id, shopName: shop.name, productName: product.name,
      customerName: String(values.get('customerName')).trim(), customerPhone: String(values.get('customerPhone')).trim(),
      quantity: qty, fulfillment, eventDate: String(values.get('eventDate') || ''), deliveryAddress: String(values.get('deliveryAddress') || '').trim(),
      total: quote.total, status: 'pending', paymentStatus: 'unpaid' };
    state.orders.unshift(order);
    state.lastOrderId = id;
    notify('owner', 'New sample order', id + ' for ' + product.name, shop.id);
    notify('admin', 'New sample order', id + ' at ' + shop.name, shop.id);
    return navigate('track');
  }
  if (form.id === 'registrationForm') {
    const id = 'application-' + (state.applications.length + 1);
    const application = {
      id, status: 'pending', ownerName: String(values.get('ownerName')).trim(),
      shopName: String(values.get('shopName')).trim(), area: String(values.get('area')),
      email: String(values.get('email')).trim(), phone: String(values.get('phone')).trim(),
      address: String(values.get('address')).trim(), description: String(values.get('description')).trim()
    };
    state.applications.push(application);
    notify('admin', 'New sample application', application.shopName + ' awaits review');
    state.modal = 'register-success';
    return render();
  }
  if (form.id === 'shopSettingsForm') {
    const shop = shopById(state.ownerShopId);
    if (!shop) return;
    shop.name = String(values.get('shopName')).trim();
    shop.area = String(values.get('area'));
    shop.description = String(values.get('description')).trim();
    state.message = 'Sample shop details updated for this session.';
    state.modal = '';
    return render();
  }
  if (form.id === 'productForm') {
    const shop = shopById(state.ownerShopId);
    if (!shop) return;
    const price = Number(values.get('price'));
    if (!Number.isFinite(price) || price < 1 || price > 100000) return;
    const file = form.querySelector("input[name='photo']").files[0];
    let photo = '';
    if (file) {
      if (!file.type.startsWith('image/') || file.size > 5_000_000) {
        state.message = 'Choose an image under 5 MB.';
        return render();
      }
      photo = URL.createObjectURL(file);
    }
    shop.products.push({ id: 'local-product-' + Date.now() + '-' + shop.products.length,
      name: String(values.get('name')).trim(), price, description: String(values.get('description')).trim(),
      icon: KIND === 'cake' ? '🎂' : '🍲', photo, available: true });
    return render();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.modal) { state.modal = ''; render(); }
});
render();
