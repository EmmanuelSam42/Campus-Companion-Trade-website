/* Campus Companion Trade — client app */
const SUPABASE_URL = 'https://dhidvacvupjihqnzwdik.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoaWR2YWN2dXBqaWhxbnp3ZGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzY1ODcsImV4cCI6MjA5MzY1MjU4N30.190oSwDZuLEfpjkvVqG7tL4dG9iHvxBU2YHk-Zg_z9Y';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DELIVERY_FEE = 5;
const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const STATE = {
  user: null,
  profile: null,
  products: [],
  hostels: [],
  cart: [],
  wishlist: [],
  orders: [],
  appointments: [],
  reviews: [],
  profiles: [],
  settings: { tagline: "Students' Ultimate Helping Hand", logo_url: null, announcement_banner: '', categories: [] },
  currentPage: 'auth',
  detailId: null,
  hostelDetailId: null,
  regRole: 'customer',
  adminPanel: 'overview',
  vendorPanel: 'overview',
  adminApptFilter: 'all',
  adminEditingProductId: null,
  vendorEditingProductId: null,
  vendorEditingHostelId: null,
  adminExpandedOrderId: null,
  confirmCallback: null,
};

// ─── Utils ───────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function formatCurrency(n) {
  return `GH₵ ${Number(n || 0).toFixed(2)}`;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(s, n = 80) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n) + '…';
}

function stars(r) {
  const n = Math.round(Number(r) || 0);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function setLoading(btn, on) {
  if (!btn) return;
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.disabled = on;
  btn.textContent = on ? '...' : btn.dataset.label;
}

function toast(type, msg) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showLoader(on) {
  $('app-loader').classList.toggle('hidden', !on);
}

function confirmDialog(title, message, onOk) {
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = message;
  STATE.confirmCallback = onOk;
  $('confirm-modal').classList.remove('hidden');
}

function closeConfirm() {
  $('confirm-modal').classList.add('hidden');
  STATE.confirmCallback = null;
}

async function uploadFile(bucket, path, file) {
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function logAdmin(actionType, targetType, targetId, targetName, details = {}) {
  if (!STATE.profile || STATE.profile.role !== 'admin') return;
  await sb.from('audit_log').insert({
    admin_id: STATE.profile.id,
    admin_name: STATE.profile.full_name,
    action_type: actionType,
    target_type: targetType,
    target_id: String(targetId || ''),
    target_name: targetName,
    details,
  });
}

function isLoggedIn() {
  return !!STATE.profile;
}

function verifiedBadge() {
  return '<span class="verified-badge">✓ Verified</span>';
}

// ─── Router ──────────────────────────────────────────────────────────────────
function navigate(page, opts = {}) {
  if (page === 'auth' && STATE.profile?.status === 'approved') {
    page = STATE.profile.role === 'admin' ? 'admin' : STATE.profile.role === 'vendor' ? 'vendor-dashboard' : 'home';
  }
  if (['cart', 'checkout', 'orders', 'wishlist', 'profile'].includes(page) && !isLoggedIn()) {
    toast('warning', 'Please log in first.');
    page = 'auth';
  }
  if (page === 'vendor-dashboard' && STATE.profile?.role !== 'vendor') {
    toast('error', 'Vendors only.');
    return;
  }
  if (page === 'admin' && STATE.profile?.role !== 'admin') {
    toast('error', 'Admins only.');
    return;
  }

  $$('.page').forEach((p) => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  const el = $(`page-${page}`);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }
  STATE.currentPage = page;
  window.scrollTo(0, 0);
  renderHeader();

  if (opts.id) {
    if (page === 'detail') STATE.detailId = opts.id;
    if (page === 'hostels-detail') STATE.hostelDetailId = opts.id;
  }

  switch (page) {
    case 'home': renderHome(); break;
    case 'products': renderProducts(); break;
    case 'detail': renderDetail(STATE.detailId); break;
    case 'hostels': renderHostels(); break;
    case 'hostels-detail': renderHostelDetail(STATE.hostelDetailId); break;
    case 'cart': renderCart(); break;
    case 'checkout': renderCheckout(); break;
    case 'orders': renderOrders(); break;
    case 'wishlist': renderWishlist(); break;
    case 'profile': renderProfileForm(); break;
    case 'vendor-dashboard': renderVendorDashboard(); break;
    case 'admin': renderAdminDashboard(); break;
  }
}

function renderHeader() {
  const nav = $('main-nav');
  const greet = $('user-greeting');
  const p = STATE.profile;
  const guest = !p;

  let links = [];
  if (guest) {
    links = [
      ['home', 'Home'],
      ['products', 'Products'],
      ['hostels', 'Hostels'],
      ['auth', 'Login / Register'],
    ];
  } else if (p.role === 'admin') {
    links = [['home', 'Home'], ['admin', '⚙ Admin Panel'], ['logout', 'Logout']];
  } else if (p.role === 'vendor') {
    links = [
      ['home', 'Home'],
      ['vendor-dashboard', 'My Dashboard'],
      ['products', 'Products'],
      ['hostels', 'Hostels'],
      ['cart', 'Cart'],
      ['profile', 'Profile'],
      ['logout', 'Logout'],
    ];
  } else {
    links = [
      ['home', 'Home'],
      ['products', 'Products'],
      ['hostels', 'Hostels'],
      ['wishlist', 'Wishlist ♡'],
      ['cart', 'Cart 🛒'],
      ['orders', 'My Orders'],
      ['profile', 'Profile'],
      ['logout', 'Logout'],
    ];
  }

  nav.innerHTML = links
    .map(([id, label]) => {
      let badge = '';
      if (id === 'cart' && STATE.cart.length) badge = `<span class="nav-badge">${STATE.cart.reduce((s, c) => s + c.quantity, 0)}</span>`;
      if (id === 'wishlist' && STATE.wishlist.length) badge = `<span class="nav-badge">${STATE.wishlist.length}</span>`;
      if (id === 'logout') return `<button type="button" class="nav-link" data-action="logout">${label}</button>`;
      return `<button type="button" class="nav-link" data-nav="${id}">${label}${badge}</button>`;
    })
    .join('');

  if (p) {
    greet.classList.remove('hidden');
    const vb = p.role === 'vendor' && p.verified ? verifiedBadge() : '';
    const adminBadge = p.role === 'admin' ? '<span class="verified-badge">Admin</span>' : '';
    greet.innerHTML = `<span class="user-pill">Hi, ${escapeHtml(p.full_name || 'User')}</span>${adminBadge}${vb}`;
  } else {
    greet.classList.add('hidden');
    greet.innerHTML = '';
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ─── Data loading ────────────────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await sb.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (data) STATE.settings = { ...STATE.settings, ...data };
  $('header-tagline').textContent = STATE.settings.tagline || "Students' Ultimate Helping Hand";
  $('footer-tagline').textContent = STATE.settings.tagline || "Students' Ultimate Helping Hand";
  if (STATE.settings.logo_url) {
    $$('#header-logo, footer img').forEach((img) => { img.src = STATE.settings.logo_url; });
  }
  const ann = STATE.settings.announcement_banner;
  if (ann && !sessionStorage.getItem('ann-dismissed')) {
    $('announcement-text').textContent = ann;
    $('announcement-bar').classList.remove('hidden');
  }
}

async function loadProducts() {
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  STATE.products = data || [];
  const cats = [...new Set(STATE.products.map((p) => p.category).filter(Boolean))];
  const sel = $('filter-category');
  if (sel) {
    sel.innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${escapeHtml(c)}</option>`).join('');
  }
}

async function loadHostels() {
  let q = sb.from('hostels_listings').select('*').order('created_at', { ascending: false });
  if (STATE.profile?.role !== 'admin' && STATE.profile?.role !== 'vendor') {
    q = q.eq('status', 'live');
  } else if (STATE.profile?.role === 'vendor') {
    q = q.or(`status.eq.live,vendor_id.eq.${STATE.profile.id}`);
  }
  const { data } = await q;
  STATE.hostels = data || [];
}

async function loadCart() {
  if (!STATE.profile) { STATE.cart = []; return; }
  const { data } = await sb.from('cart_items').select('*, products(*)').eq('user_id', STATE.profile.id);
  STATE.cart = (data || []).filter((c) => c.products);
}

async function loadWishlist() {
  if (!STATE.profile) { STATE.wishlist = []; return; }
  const { data } = await sb
    .from('wishlist_items')
    .select('*, products(*), hostels_listings(*)')
    .eq('user_id', STATE.profile.id);
  STATE.wishlist = data || [];
}

async function loadOrders() {
  if (!STATE.profile) return;
  let q = sb.from('orders').select('*').order('created_at', { ascending: false });
  if (STATE.profile.role === 'customer') q = q.eq('user_id', STATE.profile.id);
  const { data } = await q;
  STATE.orders = data || [];
}

async function loadUserData() {
  await Promise.all([loadCart(), loadWishlist(), loadOrders()]);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  setLoading(btn, true);
  $('login-status').classList.add('hidden');

  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const studentId = $('login-student-id').value.trim();

  const { data: authData, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    toast('error', error.message);
    setLoading(btn, false);
    return;
  }

  const { data: profile, error: pe } = await sb.from('profiles').select('*').eq('id', authData.user.id).single();
  if (pe || !profile) {
    toast('error', 'Profile not found. Run schema.sql in Supabase.');
    await sb.auth.signOut();
    setLoading(btn, false);
    return;
  }

  const statusEl = $('login-status');
  if (profile.student_id && studentId && profile.student_id !== studentId) {
    await sb.auth.signOut();
    statusEl.className = 'status-msg rejected';
    statusEl.textContent = 'Student ID does not match this account.';
    statusEl.classList.remove('hidden');
    toast('error', 'Invalid Student ID.');
    setLoading(btn, false);
    return;
  }

  if (profile.status === 'pending') {
    await sb.auth.signOut();
    statusEl.className = 'status-msg pending';
    statusEl.textContent = 'Your account is pending admin approval.';
    statusEl.classList.remove('hidden');
    toast('warning', 'Account pending approval.');
    setLoading(btn, false);
    return;
  }
  if (profile.status === 'rejected' || profile.status === 'suspended') {
    await sb.auth.signOut();
    statusEl.className = 'status-msg rejected';
    statusEl.textContent = profile.status === 'rejected' ? 'Account rejected. Contact support.' : 'Account suspended.';
    statusEl.classList.remove('hidden');
    toast('error', 'Access denied.');
    setLoading(btn, false);
    return;
  }

  STATE.user = authData.user;
  STATE.profile = profile;
  await loadUserData();
  const roleLabel = { admin: 'Admin', vendor: 'Vendor', customer: 'Customer' }[profile.role] || profile.role;
  toast('success', `Welcome, ${profile.full_name}! (${roleLabel})`);

  if (profile.role === 'admin') navigate('admin');
  else if (profile.role === 'vendor') navigate('vendor-dashboard');
  else {
    navigate('home');
    if (profile.role === 'customer') {
      toast('warning', 'Logged in as customer. Admin Panel appears only for admin accounts (set in Supabase).');
    }
  }
  setLoading(btn, false);
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  if ($('reg-password').value !== $('reg-password2').value) {
    toast('error', 'Passwords do not match.');
    return;
  }
  setLoading(btn, true);

  const role = STATE.regRole;
  const meta = {
    full_name: $('reg-name').value.trim(),
    role,
    phone: $('reg-phone').value.trim(),
    student_id: $('reg-student-id').value.trim(),
    hall: $('reg-hall').value.trim(),
  };

  if (role === 'vendor') {
    meta.business_name = $('reg-business-name').value.trim();
    meta.business_type = $('reg-business-type').value;
    meta.campus_location = $('reg-campus').value.trim();
    meta.social_handle = $('reg-social').value.trim();
    meta.business_bio = $('reg-bio').value.trim();
    if ($('reg-staff-id').value.trim()) meta.student_id = $('reg-staff-id').value.trim();
    const logoFile = $('reg-logo').files[0];
    if (logoFile) {
      try {
        const path = `vendor-${Date.now()}-${logoFile.name}`;
        meta.business_logo_url = await uploadFile('logos', path, logoFile);
      } catch (err) {
        toast('warning', 'Logo upload failed; continuing without logo.');
      }
    }
  }

  const { error } = await sb.auth.signUp({
    email: $('reg-email').value.trim(),
    password: $('reg-password').value,
    options: { data: meta },
  });

  if (error) {
    toast('error', error.message);
    setLoading(btn, false);
    return;
  }

  await sb.auth.signOut();
  const st = $('register-status');
  st.className = 'status-msg pending';
  st.innerHTML = '<strong>Pending approval</strong> — An admin must approve your account before you can log in.';
  st.classList.remove('hidden');
  toast('warning', 'Registration submitted. Await approval.');
  e.target.reset();
  setLoading(btn, false);
}

async function logout() {
  await sb.auth.signOut();
  STATE.user = null;
  STATE.profile = null;
  STATE.cart = [];
  STATE.wishlist = [];
  toast('success', 'Logged out.');
  navigate('auth');
}

// ─── Cart & Wishlist ─────────────────────────────────────────────────────────
async function addToCart(productId, qty = 1) {
  if (!STATE.profile) { navigate('auth'); return; }
  const prod = STATE.products.find((p) => p.id === productId);
  if (prod && prod.in_stock === false) {
    toast('error', 'This item is out of stock.');
    return;
  }
  const existing = STATE.cart.find((c) => c.product_id === productId);
  if (existing) {
    await sb.from('cart_items').update({ quantity: existing.quantity + qty }).eq('id', existing.id);
  } else {
    await sb.from('cart_items').insert({ user_id: STATE.profile.id, product_id: productId, quantity: qty });
  }
  await loadCart();
  renderHeader();
  toast('success', 'Added to cart');
}

async function updateCartQty(id, qty) {
  if (qty < 1) return removeFromCart(id);
  await sb.from('cart_items').update({ quantity: qty }).eq('id', id);
  await loadCart();
  if (STATE.currentPage === 'cart') renderCart();
  renderHeader();
}

async function removeFromCart(id) {
  await sb.from('cart_items').delete().eq('id', id);
  await loadCart();
  renderCart();
  renderHeader();
  toast('success', 'Removed from cart');
}

async function clearCart() {
  if (!STATE.profile) return;
  await sb.from('cart_items').delete().eq('user_id', STATE.profile.id);
  await loadCart();
  renderCart();
  renderHeader();
}

async function toggleWishlist(productId, hostelId) {
  if (!STATE.profile) { navigate('auth'); return; }
  const existing = STATE.wishlist.find(
    (w) => (productId && w.product_id === productId) || (hostelId && w.hostels_id === hostelId)
  );
  if (existing) {
    await sb.from('wishlist_items').delete().eq('id', existing.id);
    toast('success', 'Removed from wishlist');
  } else {
    await sb.from('wishlist_items').insert({
      user_id: STATE.profile.id,
      product_id: productId || null,
      hostels_id: hostelId || null,
    });
    toast('success', 'Saved to wishlist');
  }
  await loadWishlist();
  renderHeader();
  if (STATE.currentPage === 'wishlist') renderWishlist();
}

function isWishlisted(productId, hostelId) {
  return STATE.wishlist.some(
    (w) => (productId && w.product_id === productId) || (hostelId && w.hostels_id === hostelId)
  );
}

// ─── Renders: Home & Products ────────────────────────────────────────────────
function renderHome() {
  const cats = [
    { key: 'products', title: 'Products', icon: '🛍️', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600', count: () => STATE.products.filter((p) => p.type === 'product').length },
    { key: 'services', title: 'Services', icon: '🔧', img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600', count: () => STATE.products.filter((p) => p.type === 'service').length },
    { key: 'hostels', title: 'Hostels & Rentals', icon: '🏠', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600', count: () => STATE.hostels.filter((h) => h.status === 'live').length },
  ];
  $('home-categories').innerHTML = cats
    .map(
      (c) => `
    <article class="category-card" data-cat-nav="${c.key}">
      <img src="${c.img}" alt="${c.title}" loading="lazy" />
      <div class="card-body"><span class="icon">${c.icon}</span><h4>${c.title}</h4><p>${c.count()} listings</p></div>
    </article>`
    )
    .join('');

  const featured = STATE.products.filter((p) => p.featured).slice(0, 4);
  $('home-featured').innerHTML = featured.length
    ? featured.map((p) => productCardHtml(p)).join('')
    : '<p class="empty-state">No featured products yet.</p>';
}

function filterProductsList() {
  const q = ($('filter-search')?.value || '').toLowerCase();
  const cat = $('filter-category')?.value || '';
  const type = $('filter-type')?.value || 'all';
  const sort = $('filter-sort')?.value || 'default';

  let list = STATE.products.filter((p) => {
    if (type !== 'all' && p.type !== type) return false;
    if (cat && p.category !== cat) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
    return true;
  });

  switch (sort) {
    case 'price_asc': list.sort((a, b) => a.price - b.price); break;
    case 'price_desc': list.sort((a, b) => b.price - a.price); break;
    case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'rating': list.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)); break;
  }
  return list;
}

function productCardHtml(p) {
  const isSvc = p.type === 'service';
  const wl = isWishlisted(p.id);
  const vendor = p.vendor_name || 'Campus Companion';
  return `
  <article class="product-card" data-product-id="${p.id}">
    <img src="${p.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'}" alt="${escapeHtml(p.name)}" loading="lazy" />
    <div class="card-body">
      <span class="badge">${escapeHtml(p.category)}</span>
      <h4>${escapeHtml(p.name)}</h4>
      <p style="font-size:.85rem;color:var(--muted)">${escapeHtml(vendor)}</p>
      <p style="font-size:.85rem">${escapeHtml(truncate(p.description))}</p>
      <p class="price">${formatCurrency(p.price)}</p>
      ${p.in_stock === false ? '<span class="badge" style="color:var(--red)">Out of stock</span>' : ''}
      <p class="stars">${stars(p.avg_rating)} <small>(${p.review_count || 0})</small></p>
      <div class="card-actions">
        <button type="button" class="btn-outline" data-action="view-product" data-id="${p.id}">View</button>
        ${isSvc ? `<button type="button" class="btn-gold" data-action="book" data-id="${p.id}">Book</button>` : ''}
        <button type="button" class="btn-primary" data-action="add-cart" data-id="${p.id}" ${p.in_stock === false ? 'disabled' : ''}>Cart</button>
        <button type="button" class="btn-icon ${wl ? 'active' : ''}" data-action="wishlist" data-id="${p.id}">♡</button>
      </div>
    </div>
  </article>`;
}

function renderProducts() {
  const list = filterProductsList();
  $('products-grid').innerHTML = list.map(productCardHtml).join('');
  $('products-empty').classList.toggle('hidden', list.length > 0);
}

async function renderDetail(id) {
  if (!id) return;
  const p = STATE.products.find((x) => x.id === id);
  if (!p) { $('detail-content').innerHTML = '<p>Product not found.</p>'; return; }

  const { data: revs } = await sb.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false });
  const canReview = await customerPurchasedProduct(id);

  $('detail-content').innerHTML = `
  <div class="detail-layout">
    <img class="detail-img" src="${p.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'}" alt="" />
    <div>
      <span class="badge">${escapeHtml(p.category)}</span>
      <h2>${escapeHtml(p.name)}</h2>
      <p>${escapeHtml(p.vendor_name || '')}</p>
      <p class="stars">${stars(p.avg_rating)} (${p.review_count || 0} reviews)</p>
      <p>${escapeHtml(p.description || '')}</p>
      <p class="price">${formatCurrency(p.price)}</p>
      <div class="qty-control">
        <button type="button" data-action="qty-minus">−</button>
        <span id="detail-qty">1</span>
        <button type="button" data-action="qty-plus">+</button>
      </div>
      <div class="card-actions" style="margin-top:1rem">
        <button class="btn-primary" data-action="add-cart-detail" data-id="${p.id}">Add to Cart</button>
        <button class="btn-icon ${isWishlisted(p.id) ? 'active' : ''}" data-action="wishlist" data-id="${p.id}">♡ Wishlist</button>
        ${p.type === 'service' ? `<button class="btn-gold" data-action="book" data-id="${p.id}">Book Appointment</button>` : ''}
      </div>
    </div>
  </div>
  <section style="margin-top:2rem">
    <h3>Reviews</h3>
    <div id="reviews-list">${(revs || []).map(reviewRow).join('') || '<p>No reviews yet.</p>'}</div>
    ${canReview ? `
    <form id="review-form" style="margin-top:1rem;max-width:480px">
      <input type="hidden" name="product_id" value="${p.id}" />
      <div class="form-group"><label>Rating</label>
        <select name="rating" required>${[5,4,3,2,1].map(n=>`<option value="${n}">${n} stars</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Review</label><textarea name="body" required rows="3"></textarea></div>
      <button type="submit" class="btn-primary" data-label="Submit Review">Submit Review</button>
    </form>` : ''}
  </section>`;
}

function reviewRow(r) {
  return `<div style="border-bottom:1px solid #333;padding:.75rem 0">
    <strong>${escapeHtml(r.user_name || 'Customer')}</strong> · ${formatDate(r.created_at)}<br/>
    <span class="stars">${stars(r.rating)}</span><p>${escapeHtml(r.body || '')}</p>
  </div>`;
}

async function customerPurchasedProduct(productId) {
  if (!STATE.profile || STATE.profile.role !== 'customer') return false;
  const { data } = await sb.from('orders').select('items').eq('user_id', STATE.profile.id);
  return (data || []).some((o) =>
    ['Confirmed', 'Delivered'].includes(o.status) &&
    (o.items || []).some((i) => i.product_id === productId)
  );
}

// ─── Hostels ───────────────────────────────────────────────────────────────────
function hostelTitle(h) {
  return h.title || h.name || 'Hostel';
}

function hostelMonthlyPrice(h) {
  return Number(h.price_per_month ?? h.price ?? 0);
}

function filterHostels() {
  const type = $('hostel-type-filter')?.value || '';
  const maxP = Number($('hostel-price-max')?.value || 5000);
  const uni = ($('hostel-uni-filter')?.value || '').toLowerCase();
  const amenityChecks = $$('.amenity-filter:checked').map((c) => c.value);

  return STATE.hostels.filter((h) => {
    if (type && h.type !== type) return false;
    if (hostelMonthlyPrice(h) > maxP) return false;
    if (uni && !(h.university || '').toLowerCase().includes(uni) && !(h.location || '').toLowerCase().includes(uni)) return false;
    const am = h.amenities || [];
    if (amenityChecks.length && !amenityChecks.every((a) => am.includes(a))) return false;
    return true;
  });
}

function hostelCardHtml(h) {
  const img = (h.images && h.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';
  const am = (h.amenities || []).slice(0, 4).join(' · ');
  return `
  <article class="hostel-card">
    <img src="${img}" alt="" loading="lazy" />
    <div class="card-body" style="padding:1rem">
      <span class="badge">${escapeHtml(h.type)}</span>
      <h4>${escapeHtml(hostelTitle(h))}</h4>
      <p class="price">${formatCurrency(hostelMonthlyPrice(h))}/mo</p>
      <p style="font-size:.85rem">📍 ${escapeHtml(h.location || h.university || '')}</p>
      <p class="amenity-icons">${escapeHtml(am)}</p>
      <p style="font-size:.85rem">${escapeHtml(h.landlord_name || '')}</p>
      <div class="card-actions">
        <button class="btn-primary" data-action="view-hostel" data-id="${h.id}">Details</button>
        <button class="btn-gold" data-action="viewing" data-id="${h.id}">Request Viewing</button>
        <button class="btn-icon ${isWishlisted(null, h.id) ? 'active' : ''}" data-action="wishlist-hostel" data-id="${h.id}">♡</button>
      </div>
    </div>
  </article>`;
}

function renderHostels() {
  const list = filterHostels();
  $('hostels-grid').innerHTML = list.map(hostelCardHtml).join('');
  $('hostels-empty').classList.toggle('hidden', list.length > 0);
}

function renderHostelDetail(id) {
  const h = STATE.hostels.find((x) => x.id === id);
  if (!h) return;
  const imgs = h.images?.length ? h.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];
  const phone = isLoggedIn() ? (h.landlord_phone || 'Contact via appointment') : 'Log in to view contact';
  const amHtml = (h.amenities || []).map((a) => `<li>✓ ${escapeHtml(a)}</li>`).join('');

  $('hostel-detail-content').innerHTML = `
  <div class="gallery">${imgs.map((u, i) => `<img src="${u}" data-lightbox="${u}" alt="" />`).join('')}</div>
  <h2>${escapeHtml(hostelTitle(h))}</h2>
  <p class="price">${formatCurrency(hostelMonthlyPrice(h))}/month</p>
  <p>📍 ${escapeHtml(h.location)} · ${escapeHtml(h.university || '')}</p>
  <p>Available from: ${formatDate(h.available_from)} · Units: ${h.units_available ?? 1}</p>
  <ul>${amHtml}</ul>
  <p><strong>Landlord:</strong> ${escapeHtml(h.landlord_name || '')} ${phone}</p>
  <p><strong>Rules:</strong> ${escapeHtml(h.rules || 'Standard campus rules apply.')}</p>
  <div class="card-actions" style="margin-top:1rem">
    <button class="btn-gold" data-action="viewing" data-id="${h.id}">Request Viewing</button>
    <button class="btn-icon ${isWishlisted(null, h.id) ? 'active' : ''}" data-action="wishlist-hostel" data-id="${h.id}">♡ Save</button>
  </div>`;
}

// ─── Cart & Checkout ─────────────────────────────────────────────────────────
function renderCart() {
  const empty = !STATE.cart.length;
  $('cart-empty').classList.toggle('hidden', !empty);
  $('cart-items-list').parentElement.querySelector('.cart-layout')?.classList.toggle('hidden', empty);

  if (empty) {
    $('cart-items-list').innerHTML = '';
    $('cart-summary').innerHTML = '';
    return;
  }

  let sub = 0;
  $('cart-items-list').innerHTML = STATE.cart
    .map((c) => {
      const p = c.products;
      const line = p.price * c.quantity;
      sub += line;
      return `
      <div class="cart-item">
        <img src="${p.image_url || ''}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:8px" />
        <div>
          <strong>${escapeHtml(p.name)}</strong><br/>
          <small>${escapeHtml(p.vendor_name || '')}</small><br/>
          ${formatCurrency(p.price)} ×
          <button type="button" data-action="cart-minus" data-id="${c.id}">−</button>
          ${c.quantity}
          <button type="button" data-action="cart-plus" data-id="${c.id}">+</button>
        </div>
        <div>
          <p>${formatCurrency(line)}</p>
          <button type="button" data-action="cart-remove" data-id="${c.id}">Remove</button>
        </div>
      </div>`;
    })
    .join('');

  const total = sub + DELIVERY_FEE;
  $('cart-summary').innerHTML = `
    <h3>Summary</h3>
    <div class="row"><span>Subtotal</span><span>${formatCurrency(sub)}</span></div>
    <div class="row"><span>Delivery</span><span>${formatCurrency(DELIVERY_FEE)}</span></div>
    <div class="row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
    <button type="button" class="btn-primary" style="width:100%;margin-top:1rem" data-nav="checkout">Proceed to Checkout</button>
    <button type="button" class="btn-outline" style="width:100%;margin-top:.5rem" data-nav="products">Continue Shopping</button>
    <button type="button" class="btn-outline" style="width:100%;margin-top:.5rem" data-action="clear-cart">Clear Cart</button>`;
}

function renderCheckout() {
  $('checkout-success').classList.add('hidden');
  $('checkout-form').classList.remove('hidden');
  if (STATE.profile) {
    $('co-name').value = STATE.profile.full_name || '';
    $('co-phone').value = STATE.profile.phone || '';
    $('co-address').value = STATE.profile.hall || '';
  }
  let sub = 0;
  const itemsHtml = STATE.cart
    .map((c) => {
      const line = c.products.price * c.quantity;
      sub += line;
      return `<div class="row"><span>${escapeHtml(c.products.name)} × ${c.quantity}</span><span>${formatCurrency(line)}</span></div>`;
    })
    .join('');
  $('checkout-summary').innerHTML = `
    <h3>Order summary</h3>${itemsHtml}
    <div class="row"><span>Subtotal</span><span>${formatCurrency(sub)}</span></div>
    <div class="row"><span>Delivery</span><span>${formatCurrency(DELIVERY_FEE)}</span></div>
    <div class="row total"><span>Total</span><span>${formatCurrency(sub + DELIVERY_FEE)}</span></div>`;
}

async function placeOrder(e) {
  e.preventDefault();
  if (!STATE.cart.length) { toast('error', 'Cart is empty.'); return; }
  const btn = e.target.querySelector('[type=submit]');
  setLoading(btn, true);

  const items = STATE.cart.map((c) => ({
    product_id: c.product_id,
    vendor_id: c.products.vendor_id || null,
    name: c.products.name,
    price: c.products.price,
    quantity: c.quantity,
    image_url: c.products.image_url,
    vendor_name: c.products.vendor_name,
  }));
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderNumber = 'CCT-' + Date.now().toString(36).toUpperCase();
  const payment = document.querySelector('input[name=payment]:checked')?.value || 'Mobile Money';
  const room = $('co-room').value.trim();
  const address = $('co-address').value.trim() + (room ? `, Room ${room}` : '');

  const { error } = await sb.from('orders').insert({
    order_number: orderNumber,
    user_id: STATE.profile.id,
    user_name: $('co-name').value.trim(),
    user_email: STATE.profile.email,
    items,
    subtotal,
    delivery_fee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
    payment_method: payment,
    delivery_name: $('co-name').value.trim(),
    delivery_phone: $('co-phone').value.trim(),
    delivery_address: address,
    notes: $('co-notes').value.trim(),
    status: 'Processing',
  });

  if (error) {
    toast('error', error.message);
    setLoading(btn, false);
    return;
  }

  await sb.from('cart_items').delete().eq('user_id', STATE.profile.id);
  await loadCart();
  $('checkout-form').classList.add('hidden');
  $('checkout-success').classList.remove('hidden');
  $('checkout-success').innerHTML = `
    <div class="check">✓</div>
    <h2>Order placed!</h2>
    <p class="order-number">#${orderNumber}</p>
    <p>Thank you for shopping with Campus Companion Trade.</p>
    <div class="hero-ctas" style="margin-top:1.5rem">
      <button class="btn-primary" data-nav="home">Back to Home</button>
      <button class="btn-outline" data-nav="orders">View My Orders</button>
      <button class="btn-gold" data-nav="products">Shop More</button>
    </div>`;
  toast('success', 'Order placed successfully!');
  setLoading(btn, false);
}

function renderOrders() {
  const list = STATE.orders;
  $('orders-empty').classList.toggle('hidden', list.length > 0);
  $('orders-list').innerHTML = list
    .map(
      (o) => `
    <div class="order-card" data-order-id="${o.id}">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <span class="order-number">#${escapeHtml(o.order_number)}</span>
        <span class="status-pill status-${o.status}">${o.status}</span>
      </div>
      <p>${formatDate(o.created_at)} · ${formatCurrency(o.total)} · ${escapeHtml(o.payment_method || '')}</p>
      <p style="font-size:.9rem;color:var(--muted)">${(o.items || []).map((i) => i.name).join(', ')}</p>
      <div class="order-expand hidden" id="expand-${o.id}"></div>
    </div>`
    )
    .join('');
}

function renderWishlist() {
  const empty = !STATE.wishlist.length;
  $('wishlist-empty').classList.toggle('hidden', !empty);
  $('wishlist-grid').innerHTML = STATE.wishlist
    .map((w) => {
      if (w.products) {
        const p = w.products;
        return `<article class="product-card">
          <img src="${p.image_url || ''}" alt="" />
          <div class="card-body">
            <h4>${escapeHtml(p.name)}</h4>
            <p class="price">${formatCurrency(p.price)}</p>
            <button class="btn-primary" data-action="add-cart" data-id="${p.id}">Add to Cart</button>
            <button class="btn-outline" data-action="wishlist-remove" data-wid="${w.id}">Remove</button>
          </div>
        </article>`;
      }
      const h = w.hostels_listings;
      if (!h) return '';
      return `<article class="product-card">
        <img src="${(h.images && h.images[0]) || ''}" alt="" />
        <div class="card-body">
          <h4>${escapeHtml(hostelTitle(h))}</h4>
          <p class="price">${formatCurrency(hostelMonthlyPrice(h))}/mo</p>
          <button class="btn-outline" data-action="view-hostel" data-id="${h.id}">View</button>
          <button class="btn-outline" data-action="wishlist-remove" data-wid="${w.id}">Remove</button>
        </div>
      </article>`;
    })
    .join('');
}

function renderProfileForm() {
  const p = STATE.profile;
  if (!p) return;
  $('profile-name').value = p.full_name || '';
  $('profile-phone').value = p.phone || '';
  $('profile-hall').value = p.hall || '';
  const vf = $('profile-vendor-fields');
  if (p.role === 'vendor') {
    vf.classList.remove('hidden');
    $('profile-business').value = p.business_name || '';
    $('profile-bio').value = p.business_bio || '';
    $('profile-hours').value = p.availability_hours || '';
    $('profile-social').value = p.social_handle || '';
    $('profile-location').value = p.campus_location || '';
  } else vf.classList.add('hidden');
}

// ─── Appointment modal ───────────────────────────────────────────────────────
function openAppointmentModal({ productId, hostelId, title }) {
  $('modal-appt-title').textContent = title || 'Book Appointment';
  $('appt-product-id').value = productId || '';
  $('appt-hostel-id').value = hostelId || '';
  $('appt-date').min = new Date().toISOString().slice(0, 10);
  $('appt-time').innerHTML = TIME_SLOTS.map((t) => `<option>${t}</option>`).join('');
  $('appointment-modal').classList.remove('hidden');
}

async function submitAppointment(e) {
  e.preventDefault();
  const productId = $('appt-product-id').value || null;
  const hostelId = $('appt-hostel-id').value || null;
  let serviceName = '';
  let vendorName = '';
  if (productId) {
    const p = STATE.products.find((x) => x.id === productId);
    serviceName = p?.name || '';
    vendorName = p?.vendor_name || '';
    if (p?.price > 0) await addToCart(productId, 1);
  }
  if (hostelId) {
    const h = STATE.hostels.find((x) => x.id === hostelId);
    serviceName = h?.title || 'Hostel viewing';
    vendorName = h?.landlord_name || '';
  }

  const { error } = await sb.from('appointments').insert({
    user_id: STATE.profile.id,
    product_id: productId,
    hostels_id: hostelId,
    user_name: STATE.profile.full_name,
    service_name: serviceName,
    vendor_name: vendorName,
    preferred_date: $('appt-date').value,
    preferred_time: $('appt-time').value,
    message: $('appt-message').value.trim(),
    status: 'pending',
  });

  if (error) toast('error', error.message);
  else toast('success', 'Appointment requested!');
  $('appointment-modal').classList.add('hidden');
  e.target.reset();
}

// ─── Vendor dashboard ────────────────────────────────────────────────────────
const VENDOR_TABS = ['overview', 'products', 'add-product', 'hostels', 'add-hostel', 'orders', 'appointments', 'reviews', 'profile'];

function getVendorProductIds(vendorId) {
  return STATE.products.filter((p) => p.vendor_id === vendorId).map((p) => p.id);
}

function filterAppointmentsForVendor(appts, vendorId) {
  const productIds = getVendorProductIds(vendorId);
  return (appts || []).filter((a) => {
    if (a.product_id && productIds.includes(a.product_id)) return true;
    if (a.hostels_id) {
      const h = STATE.hostels.find((x) => x.id === a.hostels_id);
      return h?.vendor_id === vendorId;
    }
    return false;
  });
}

function vendorHostelForm(hostel = null) {
  const am = hostel?.amenities || [];
  const amenityList = ['WiFi', 'Furnished', 'Water', 'AC'];
  return `<form id="vendor-hostel-form" style="max-width:560px;margin-top:1rem">
    <input type="hidden" name="id" value="${hostel?.id || ''}" />
    <div class="form-group"><label>Property name</label><input name="title" required value="${escapeHtml(hostelTitle(hostel || {}))}" /></div>
    <div class="form-group"><label>Type</label>
      <select name="type">
        ${['Single', 'Double', 'Self-Contained', 'Apartment', 'BQ'].map((t) => `<option ${hostel?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Price per month (GH₵)</label><input name="price_per_month" type="number" step="0.01" required value="${hostel ? hostelMonthlyPrice(hostel) : ''}" /></div>
    <div class="form-group"><label>Location</label><input name="location" value="${escapeHtml(hostel?.location || '')}" /></div>
    <div class="form-group"><label>University</label><input name="university" value="${escapeHtml(hostel?.university || '')}" /></div>
    <div class="form-group"><label>Available from</label><input name="available_from" type="date" value="${hostel?.available_from ? hostel.available_from.slice(0, 10) : ''}" /></div>
    <div class="form-group"><label>Units available</label><input name="units_available" type="number" min="1" value="${hostel?.units_available ?? 1}" /></div>
    <div class="form-group"><label>Landlord / agent name</label><input name="landlord_name" value="${escapeHtml(hostel?.landlord_name || STATE.profile?.full_name || '')}" /></div>
    <div class="form-group"><label>Phone</label><input name="landlord_phone" value="${escapeHtml(hostel?.landlord_phone || STATE.profile?.phone || '')}" /></div>
    <div class="form-group"><label>Rules</label><textarea name="rules" rows="2">${escapeHtml(hostel?.rules || '')}</textarea></div>
    <div class="form-group"><label>Amenities</label>
      ${amenityList.map((a) => `<label style="margin-right:.75rem"><input type="checkbox" name="amenity" value="${a}" ${am.includes(a) ? 'checked' : ''} /> ${a}</label>`).join('')}
    </div>
    <div class="form-group"><label>Cover image</label><input type="file" name="image" accept="image/*" /></div>
    <p style="font-size:.8rem;color:var(--muted)">New listings await admin approval (status: pending).</p>
    <button type="submit" class="btn-primary" data-label="Save Hostel">Save Hostel</button>
  </form>`;
}

async function renderVendorDashboard() {
  const tabs = $('vendor-tabs');
  const panels = $('vendor-panels');
  tabs.innerHTML = VENDOR_TABS.map(
    (t) => `<button type="button" data-vtab="${t}" class="${t === STATE.vendorPanel ? 'active' : ''}">${t.replace(/-/g, ' ')}</button>`
  ).join('');

  const myProducts = STATE.products.filter((p) => p.vendor_id === STATE.profile.id);
  const myProductIds = myProducts.map((p) => p.id);
  const myHostels = STATE.hostels.filter((h) => h.vendor_id === STATE.profile.id);

  const myOrders = STATE.orders.filter((o) =>
    (o.items || []).some((i) => i.vendor_id === STATE.profile.id || (i.product_id && myProductIds.includes(i.product_id)))
  );

  const { data: appts } = await sb.from('appointments').select('*').order('created_at', { ascending: false });
  const myAppts = filterAppointmentsForVendor(appts, STATE.profile.id);

  const { data: revs } = await sb
    .from('reviews')
    .select('*, products(name)')
    .in('product_id', myProductIds.length ? myProductIds : ['00000000-0000-0000-0000-000000000000']);

  const editProduct = STATE.vendorEditingProductId
    ? myProducts.find((p) => p.id === STATE.vendorEditingProductId)
    : null;
  const editHostel = STATE.vendorEditingHostelId
    ? myHostels.find((h) => h.id === STATE.vendorEditingHostelId)
    : null;

  const revenue = myOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const avgR = myProducts.length ? myProducts.reduce((s, p) => s + Number(p.avg_rating || 0), 0) / myProducts.length : 0;

  panels.innerHTML = `
  <div class="vendor-panel ${STATE.vendorPanel === 'overview' ? 'active' : ''}" data-vpanel="overview">
    <div class="dash-stats">
      <div class="stat-card"><h4>Products</h4><p>${myProducts.length}</p></div>
      <div class="stat-card"><h4>Orders</h4><p>${myOrders.length}</p></div>
      <div class="stat-card"><h4>Revenue</h4><p>${formatCurrency(revenue)}</p></div>
      <div class="stat-card"><h4>Appointments</h4><p>${myAppts.filter(a=>a.status==='pending').length}</p></div>
      <div class="stat-card"><h4>Avg rating</h4><p>${avgR.toFixed(1)}</p></div>
    </div>
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'products' ? 'active' : ''}" data-vpanel="products">
    <button type="button" class="btn-primary" data-vtab="add-product" data-action="new-product">+ Add New Product</button>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Cat</th><th>Price</th><th>Stock</th><th></th></tr></thead>
    <tbody>${myProducts.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category)}</td><td>${formatCurrency(p.price)}</td><td>${p.in_stock?'Yes':'No'}</td>
    <td><button type="button" data-action="edit-product" data-id="${p.id}">Edit</button><button type="button" data-action="delete-product" data-id="${p.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="5">No products yet.</td></tr>'}</tbody></table></div>
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'add-product' ? 'active' : ''}" data-vpanel="add-product">
    <h4>${editProduct ? 'Edit product' : 'Add product'}</h4>
    ${vendorProductForm(editProduct)}
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'hostels' ? 'active' : ''}" data-vpanel="hostels">
    <button type="button" class="btn-primary" data-action="new-hostel">+ Add Hostel Listing</button>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Title</th><th>Type</th><th>Price/mo</th><th>Status</th><th></th></tr></thead>
    <tbody>${myHostels.map(h=>`<tr><td>${escapeHtml(hostelTitle(h))}</td><td>${h.type}</td><td>${formatCurrency(hostelMonthlyPrice(h))}</td><td>${h.status}</td>
    <td><button type="button" data-action="edit-hostel" data-id="${h.id}">Edit</button></td></tr>`).join('')||'<tr><td colspan="5">No hostels yet.</td></tr>'}</tbody></table></div>
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'add-hostel' ? 'active' : ''}" data-vpanel="add-hostel">
    <h4>${editHostel ? 'Edit hostel' : 'Add hostel'}</h4>
    ${vendorHostelForm(editHostel)}
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'orders' ? 'active' : ''}" data-vpanel="orders">
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>${myOrders.map(o=>`<tr><td>${o.order_number}</td><td>${escapeHtml(o.user_name||'')}</td><td>${formatCurrency(o.total)}</td><td>${o.status}</td><td>${formatDate(o.created_at)}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'appointments' ? 'active' : ''}" data-vpanel="appointments">
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th></th></tr></thead>
    <tbody>${myAppts.map(a=>`<tr><td>${escapeHtml(a.user_name||'')}</td><td>${escapeHtml(a.service_name||'')}</td><td>${formatDate(a.preferred_date)}</td><td>${a.preferred_time}</td><td>${a.status}</td>
    <td>${a.status==='pending'?`<button data-action="appt-confirm" data-id="${a.id}">Confirm</button><button data-action="appt-cancel" data-id="${a.id}">Cancel</button>`:''}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'reviews' ? 'active' : ''}" data-vpanel="reviews">
    ${(revs||[]).map(r=>`<div>${stars(r.rating)} ${escapeHtml(r.body||'')} — ${escapeHtml(r.user_name||'')} · ${formatDate(r.created_at)} · ${escapeHtml(r.products?.name||'')}</div>`).join('')||'<p>No reviews.</p>'}
  </div>
  <div class="vendor-panel ${STATE.vendorPanel === 'profile' ? 'active' : ''}" data-vpanel="profile">
    <p>Use the Profile page in the main nav to edit business details.</p>
    <button class="btn-primary" data-nav="profile">Go to Profile</button>
  </div>`;
}

function vendorProductForm(product = null) {
  return `<form id="vendor-product-form" style="max-width:520px;margin-top:1rem">
    <input type="hidden" name="id" value="${product?.id || ''}" />
    <div class="form-group"><label>Name</label><input name="name" required value="${escapeHtml(product?.name||'')}" /></div>
    <div class="form-group"><label>Category</label><input name="category" required value="${escapeHtml(product?.category||'General')}" /></div>
    <div class="form-group"><label>Type</label><select name="type"><option value="product" ${product?.type==='product'?'selected':''}>Product</option><option value="service" ${product?.type==='service'?'selected':''}>Service</option></select></div>
    <div class="form-group"><label>Price (GH₵)</label><input name="price" type="number" step="0.01" required value="${product?.price||''}" /></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3">${escapeHtml(product?.description||'')}</textarea></div>
    <div class="form-group"><label>Image</label><input type="file" name="image" accept="image/*" /></div>
    <div class="form-group"><label>Availability hours (services)</label><input name="availability_hours" value="${escapeHtml(product?.availability_hours||'')}" /></div>
    <button type="submit" class="btn-primary" data-label="Save Product">Save Product</button>
  </form>`;
}

// ─── Admin dashboard ───────────────────────────────────────────────────────────
const ADMIN_PANELS = [
  'overview', 'users', 'products', 'add-product', 'hostels', 'orders',
  'appointments', 'reviews', 'settings', 'create-admin', 'audit',
];

function adminProductEditForm(product) {
  if (!product) return '';
  return `<form id="admin-edit-product-form" class="admin-inline-form" style="max-width:520px;margin:1rem 0;padding:1rem;background:var(--surface2);border-radius:var(--radius)">
    <input type="hidden" name="id" value="${product.id}" />
    <h4>Edit: ${escapeHtml(product.name)}</h4>
    <div class="form-group"><label>Name</label><input name="name" required value="${escapeHtml(product.name)}" /></div>
    <div class="form-group"><label>Category</label><input name="category" required value="${escapeHtml(product.category)}" /></div>
    <div class="form-group"><label>Price (GH₵)</label><input name="price" type="number" step="0.01" required value="${product.price}" /></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3">${escapeHtml(product.description || '')}</textarea></div>
    <div class="form-group"><label>Image URL</label><input name="image_url" value="${escapeHtml(product.image_url || '')}" /></div>
    <label><input type="checkbox" name="featured" ${product.featured ? 'checked' : ''} /> Featured</label>
    <label style="margin-left:1rem"><input type="checkbox" name="in_stock" ${product.in_stock !== false ? 'checked' : ''} /> In stock</label>
    <div style="margin-top:1rem;display:flex;gap:.5rem">
      <button type="submit" class="btn-primary" data-label="Save">Save</button>
      <button type="button" class="btn-outline" data-action="cancel-admin-edit">Cancel</button>
    </div>
  </form>`;
}

async function renderAdminDashboard() {
  const sidebar = $('admin-sidebar');
  sidebar.innerHTML = ADMIN_PANELS.map(
    (p) => `<button type="button" data-apanel="${p}" class="${p === STATE.adminPanel ? 'active' : ''}">${p.replace(/-/g, ' ')}</button>`
  ).join('');

  const [{ data: profiles }, { data: allOrders }, { data: audit }, { data: appts }, { data: allReviews }] =
    await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('orders').select('*').order('created_at', { ascending: false }),
      sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
      sb.from('appointments').select('*').order('created_at', { ascending: false }),
      sb.from('reviews').select('*, products(name)').order('created_at', { ascending: false }),
    ]);

  STATE.profiles = profiles || [];
  STATE.orders = allOrders || [];
  STATE.appointments = appts || [];
  await loadProducts();
  await loadHostels();

  const pending = STATE.profiles.filter((p) => p.status === 'pending');
  const deletionRequests = STATE.profiles.filter((p) => p.deletion_requested);
  const revenue = STATE.orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const editingProduct = STATE.adminEditingProductId
    ? STATE.products.find((p) => p.id === STATE.adminEditingProductId)
    : null;

  const apptFilter = STATE.adminApptFilter;
  const filteredAppts = STATE.appointments.filter((a) => apptFilter === 'all' || a.status === apptFilter);

  $('admin-panels').innerHTML = `
  <div class="admin-panel ${STATE.adminPanel === 'overview' ? 'active' : ''}" data-apanel="overview">
    <div class="dash-stats">
      <div class="stat-card"><h4>Users</h4><p>${STATE.profiles.length}</p></div>
      <div class="stat-card"><h4>Customers</h4><p>${STATE.profiles.filter(p=>p.role==='customer').length}</p></div>
      <div class="stat-card"><h4>Vendors</h4><p>${STATE.profiles.filter(p=>p.role==='vendor').length}</p></div>
      <div class="stat-card"><h4>Pending</h4><p>${pending.length}</p></div>
      <div class="stat-card"><h4>Products</h4><p>${STATE.products.length}</p></div>
      <div class="stat-card"><h4>Orders</h4><p>${STATE.orders.length}</p></div>
      <div class="stat-card"><h4>Revenue</h4><p>${formatCurrency(revenue)}</p></div>
    </div>
    <h4>Pending approvals</h4>
    <ul>${pending.slice(0,5).map(p=>`<li>${escapeHtml(p.full_name)} (${p.role}) — <button data-action="approve-user" data-id="${p.id}">Approve</button></li>`).join('')||'<li>None</li>'}</ul>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'users' ? 'active' : ''}" data-apanel="users">
    <h4>Deletion requests (${deletionRequests.length})</h4>
    ${deletionRequests.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
    <tbody>${deletionRequests.map(p=>`<tr>
      <td>${escapeHtml(p.full_name)}</td><td>${escapeHtml(p.email)}</td><td>${p.role}</td>
      <td>
        <button type="button" data-action="dismiss-deletion" data-id="${p.id}">Dismiss</button>
        <button type="button" data-action="suspend-user" data-id="${p.id}">Suspend</button>
      </td></tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--muted);margin-bottom:1rem">No pending deletion requests.</p>'}
    <h4>All users</h4>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Business</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${STATE.profiles.map(p=>`<tr>
      <td>${escapeHtml(p.full_name)}</td><td>${escapeHtml(p.email)}</td><td>${p.role}</td><td>${escapeHtml(p.business_name||'')}</td>
      <td><span class="status-pill status-${p.status==='approved'?'Delivered':p.status==='pending'?'Processing':'Cancelled'}">${p.status}</span></td>
      <td>
        ${p.status==='pending'?`<button data-action="approve-user" data-id="${p.id}">Approve</button><button data-action="reject-user" data-id="${p.id}">Reject</button>`:''}
        ${p.role==='vendor'&&!p.verified?`<button data-action="verify-vendor" data-id="${p.id}">Verify</button>`:''}
        <button data-action="suspend-user" data-id="${p.id}">Suspend</button>
        <button data-action="delete-user" data-id="${p.id}">Delete</button>
      </td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'products' ? 'active' : ''}" data-apanel="products">
    ${adminProductEditForm(editingProduct)}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Cat</th><th>Price</th><th>Vendor</th><th>Featured</th><th>Stock</th><th></th></tr></thead>
    <tbody>${STATE.products.map(p=>`<tr>
      <td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category)}</td><td>${formatCurrency(p.price)}</td><td>${escapeHtml(p.vendor_name||'')}</td>
      <td>${p.featured?'Yes':'No'}</td><td>${p.in_stock?'Yes':'No'}</td>
      <td>
        <button type="button" data-action="admin-edit-product" data-id="${p.id}">Edit</button>
        <button type="button" data-action="toggle-featured" data-id="${p.id}">Featured</button>
        <button type="button" data-action="toggle-stock" data-id="${p.id}">Stock</button>
        <button type="button" data-action="delete-product" data-id="${p.id}">Delete</button>
      </td>
    </tr>`).join('')}</tbody></table></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'add-product' ? 'active' : ''}" data-apanel="add-product">
    <form id="admin-product-form" style="max-width:520px">
      <div class="form-group"><label>Name</label><input name="name" required /></div>
      <div class="form-group"><label>Vendor</label><select name="vendor_id"><option value="">Campus Companion</option>
        ${STATE.profiles.filter(p=>p.role==='vendor'&&p.status==='approved').map(p=>`<option value="${p.id}">${escapeHtml(p.business_name||p.full_name)}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Category</label><input name="category" required /></div>
      <div class="form-group"><label>Type</label><select name="type"><option value="product">Product</option><option value="service">Service</option></select></div>
      <div class="form-group"><label>Price</label><input name="price" type="number" step="0.01" required /></div>
      <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
      <div class="form-group"><label>Image URL</label><input name="image_url" /></div>
      <label><input type="checkbox" name="featured" /> Featured</label>
      <button type="submit" class="btn-primary" data-label="Add Product">Add Product</button>
    </form>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'hostels' ? 'active' : ''}" data-apanel="hostels">
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Title</th><th>Type</th><th>Price/mo</th><th>Status</th><th></th></tr></thead>
    <tbody>${STATE.hostels.map(h=>`<tr><td>${escapeHtml(hostelTitle(h))}</td><td>${h.type}</td><td>${formatCurrency(hostelMonthlyPrice(h))}</td><td>${h.status}</td>
    <td>${h.status==='pending'?`<button data-action="approve-hostel" data-id="${h.id}">Approve</button>`:''}
    <button data-action="occupy-hostel" data-id="${h.id}">Occupied</button>
    <button data-action="delete-hostel" data-id="${h.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'orders' ? 'active' : ''}" data-apanel="orders">
    <div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead>
    <tbody>${STATE.orders.map(o=>{
      const expanded = STATE.adminExpandedOrderId === o.id;
      return `<tr class="admin-order-row" data-order-row="${o.id}">
        <td><button type="button" data-action="toggle-admin-order" data-id="${o.id}">${expanded ? '▼' : '▶'}</button></td>
        <td class="order-number">${escapeHtml(o.order_number)}</td><td>${escapeHtml(o.user_name||'')}</td><td>${formatCurrency(o.total)}</td><td>${escapeHtml(o.payment_method||'')}</td>
        <td><span class="status-pill status-${o.status}">${o.status}</span></td>
        <td><select data-action="order-status" data-id="${o.id}">
          ${['Processing','Confirmed','Delivered','Cancelled'].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join('')}
        </select></td></tr>
        <tr class="admin-order-detail ${expanded ? '' : 'hidden'}" id="admin-order-detail-${o.id}"><td colspan="7">
          <p><strong>Phone:</strong> ${escapeHtml(o.delivery_phone||'')} · <strong>Address:</strong> ${escapeHtml(o.delivery_address||'')}</p>
          <p><strong>Notes:</strong> ${escapeHtml(o.notes||'—')}</p>
          <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:.5rem">
            ${(o.items||[]).map(i=>`<div style="display:flex;gap:.5rem;align-items:center">
              <img src="${i.image_url||''}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'" />
              <span>${escapeHtml(i.name)} × ${i.quantity} — ${formatCurrency((i.price||0)*i.quantity)}</span>
            </div>`).join('')}
          </div>
        </td></tr>`;
    }).join('')}</tbody></table></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'appointments' ? 'active' : ''}" data-apanel="appointments">
    <div class="filter-bar" style="margin-bottom:1rem">
      <label>Filter:</label>
      ${['all','pending','confirmed','cancelled'].map(f=>`<button type="button" class="btn-outline ${apptFilter===f?'active':''}" data-action="admin-appt-filter" data-filter="${f}">${f}</button>`).join('')}
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Service</th><th>Vendor</th><th>Date</th><th>Time</th><th>Status</th><th></th></tr></thead>
    <tbody>${filteredAppts.map(a=>`<tr>
      <td>${escapeHtml(a.user_name||'')}</td><td>${escapeHtml(a.service_name||'')}</td><td>${escapeHtml(a.vendor_name||'')}</td>
      <td>${formatDate(a.preferred_date)}</td><td>${escapeHtml(a.preferred_time||'')}</td>
      <td><span class="status-pill status-${a.status==='confirmed'?'Confirmed':a.status==='cancelled'?'Cancelled':'Processing'}">${a.status}</span></td>
      <td>${a.status==='pending'?`<button type="button" data-action="appt-confirm" data-id="${a.id}">Confirm</button><button type="button" data-action="appt-cancel" data-id="${a.id}">Cancel</button>`:'—'}</td>
    </tr>`).join('')||'<tr><td colspan="7">No appointments.</td></tr>'}</tbody></table></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'reviews' ? 'active' : ''}" data-apanel="reviews">
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Date</th><th></th></tr></thead>
    <tbody>${(allReviews||[]).map(r=>`<tr class="${r.flagged?'':''}">
      <td>${escapeHtml(r.products?.name||'—')}</td><td>${escapeHtml(r.user_name||'')}</td><td>${stars(r.rating)}</td>
      <td>${escapeHtml(truncate(r.body,120))}</td><td>${formatDate(r.created_at)}</td>
      <td>
        ${r.flagged ? '<span class="badge">Flagged</span>' : `<button type="button" data-action="flag-review" data-id="${r.id}">Flag</button>`}
        <button type="button" data-action="delete-review" data-id="${r.id}">Delete</button>
      </td></tr>`).join('')||'<tr><td colspan="6">No reviews.</td></tr>'}</tbody></table></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'settings' ? 'active' : ''}" data-apanel="settings">
    <form id="admin-settings-form" style="max-width:480px">
      <div class="form-group"><label>Tagline</label><input name="tagline" value="${escapeHtml(STATE.settings.tagline||'')}" /></div>
      <div class="form-group"><label>Announcement banner</label><input name="announcement_banner" value="${escapeHtml(STATE.settings.announcement_banner||'')}" /></div>
      <div class="form-group"><label>Logo upload</label><input type="file" name="logo" accept="image/*" /></div>
      <button type="submit" class="btn-primary" data-label="Save Settings">Save Settings</button>
    </form>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'create-admin' ? 'active' : ''}" data-apanel="create-admin">
    <form id="create-admin-form" style="max-width:400px">
      <div class="form-group"><label>Name</label><input name="name" required /></div>
      <div class="form-group"><label>Email</label><input name="email" type="email" required /></div>
      <div class="form-group"><label>Password</label><input name="password" type="password" required minlength="6" /></div>
      <button type="submit" class="btn-primary" data-label="Create Admin Account">Create Admin Account</button>
    </form>
    <p style="font-size:.85rem;color:var(--muted);margin-top:1rem;max-width:480px">
      Creates the auth user and profile, then auto-sets <strong>role=admin</strong> and <strong>status=approved</strong>.
      They can log in immediately with the same form as everyone else.
    </p>
    <div id="create-admin-result" class="hidden status-msg pending" style="margin-top:1rem;max-width:480px"></div>
  </div>
  <div class="admin-panel ${STATE.adminPanel === 'audit' ? 'active' : ''}" data-apanel="audit">
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Action</th><th>Target</th><th>Admin</th><th>When</th></tr></thead>
    <tbody>${(audit||[]).map(a=>`<tr><td>${escapeHtml(a.action_type)}</td><td>${escapeHtml(a.target_name||'')}</td><td>${escapeHtml(a.admin_name||'')}</td><td>${formatDate(a.created_at)}</td></tr>`).join('')}</tbody></table></div>
  </div>`;
}

// ─── Event delegation ────────────────────────────────────────────────────────
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-nav]');
  if (t) { e.preventDefault(); navigate(t.dataset.nav); return; }

  const action = e.target.closest('[data-action]');
  if (!action) {
    const cat = e.target.closest('[data-cat-nav]');
    if (cat) {
      const k = cat.dataset.catNav;
      if (k === 'hostels') navigate('hostels');
      else if (k === 'services') { navigate('products'); $('filter-type').value = 'service'; renderProducts(); }
      else navigate('products');
    }
    const vtab = e.target.closest('[data-vtab]');
    if (vtab && !vtab.dataset.action) {
      STATE.vendorPanel = vtab.dataset.vtab;
      if (vtab.dataset.vtab === 'add-product') STATE.vendorEditingProductId = null;
      if (vtab.dataset.vtab === 'add-hostel') STATE.vendorEditingHostelId = null;
      renderVendorDashboard();
    }
    const apanel = e.target.closest('[data-apanel]');
    if (apanel && apanel.tagName === 'BUTTON') { STATE.adminPanel = apanel.dataset.apanel; renderAdminDashboard(); }
    const orderCard = e.target.closest('.order-card');
    if (orderCard) {
      const exp = $(`expand-${orderCard.dataset.orderId}`);
      if (exp) {
        const o = STATE.orders.find((x) => x.id === orderCard.dataset.orderId);
        exp.classList.toggle('hidden');
        if (!exp.classList.contains('hidden') && o) {
          exp.innerHTML = `<p><strong>Address:</strong> ${escapeHtml(o.delivery_address || '')}</p>
            ${(o.items || []).map((i) => `<p>${escapeHtml(i.name)} × ${i.quantity} — ${formatCurrency(i.price * i.quantity)}</p>`).join('')}`;
        }
      }
    }
    if (e.target.closest('#brand-home')) navigate(STATE.profile ? 'home' : 'auth');
    return;
  }

  const id = action.dataset.id;
  switch (action.dataset.action) {
    case 'logout': logout(); break;
    case 'view-product': navigate('detail', { id }); break;
    case 'view-hostel': navigate('hostels-detail', { id }); break;
    case 'add-cart': addToCart(id); break;
    case 'wishlist': toggleWishlist(id, null); break;
    case 'wishlist-hostel': toggleWishlist(null, id); break;
    case 'wishlist-remove': await sb.from('wishlist_items').delete().eq('id', action.dataset.wid); await loadWishlist(); renderWishlist(); break;
    case 'book':
      openAppointmentModal({ productId: id, title: 'Book Appointment' });
      break;
    case 'viewing': {
      const h = STATE.hostels.find((x) => x.id === id);
      openAppointmentModal({ hostelId: id, title: 'Request Viewing — ' + (h?.title || '') });
      break;
    }
    case 'cart-remove': removeFromCart(id); break;
    case 'cart-plus': {
      const c = STATE.cart.find((x) => x.id === id);
      if (c) updateCartQty(id, c.quantity + 1);
      break;
    }
    case 'cart-minus': {
      const c = STATE.cart.find((x) => x.id === id);
      if (c) updateCartQty(id, c.quantity - 1);
      break;
    }
    case 'clear-cart': confirmDialog('Clear cart', 'Remove all items?', clearCart); break;
    case 'add-cart-detail': {
      const qty = Number($('detail-qty')?.textContent || 1);
      addToCart(action.dataset.id, qty);
      break;
    }
    case 'qty-minus': { const el = $('detail-qty'); if (el) el.textContent = Math.max(1, Number(el.textContent) - 1); break; }
    case 'qty-plus': { const el = $('detail-qty'); if (el) el.textContent = Number(el.textContent) + 1; break; }
    case 'approve-user':
      confirmDialog('Approve user', 'Approve this account?', async () => {
        const u = STATE.profiles.find((p) => p.id === id);
        await sb.from('profiles').update({ status: 'approved' }).eq('id', id);
        await logAdmin('approve', 'user', id, u?.full_name);
        toast('success', 'User approved');
        renderAdminDashboard();
      });
      break;
    case 'reject-user':
      confirmDialog('Reject user', 'Reject this account?', async () => {
        await sb.from('profiles').update({ status: 'rejected' }).eq('id', id);
        await logAdmin('reject', 'user', id, id);
        renderAdminDashboard();
      });
      break;
    case 'verify-vendor':
      await sb.from('profiles').update({ verified: true }).eq('id', id);
      await logAdmin('verify', 'vendor', id, id);
      toast('success', 'Vendor verified');
      renderAdminDashboard();
      break;
    case 'suspend-user':
      await sb.from('profiles').update({ status: 'suspended' }).eq('id', id);
      toast('warning', 'User suspended');
      renderAdminDashboard();
      break;
    case 'delete-user':
      confirmDialog('Delete user', 'This cannot be undone easily.', async () => {
        await sb.from('profiles').delete().eq('id', id);
        await logAdmin('delete', 'user', id, id);
        renderAdminDashboard();
      });
      break;
    case 'delete-product':
      confirmDialog('Delete product', 'Remove this listing?', async () => {
        await sb.from('products').delete().eq('id', id);
        await loadProducts();
        renderAdminDashboard();
        renderVendorDashboard();
      });
      break;
    case 'toggle-featured': {
      const p = STATE.products.find((x) => x.id === id);
      await sb.from('products').update({ featured: !p.featured }).eq('id', id);
      await loadProducts();
      renderAdminDashboard();
      break;
    }
    case 'toggle-stock': {
      const p = STATE.products.find((x) => x.id === id);
      await sb.from('products').update({ in_stock: !p.in_stock }).eq('id', id);
      await loadProducts();
      renderAdminDashboard();
      break;
    }
    case 'approve-hostel':
      await sb.from('hostels_listings').update({ status: 'live' }).eq('id', id);
      await loadHostels();
      renderAdminDashboard();
      break;
    case 'occupy-hostel':
      await sb.from('hostels_listings').update({ status: 'occupied' }).eq('id', id);
      await loadHostels();
      renderAdminDashboard();
      break;
    case 'delete-hostel':
      confirmDialog('Delete hostel', 'Remove listing?', async () => {
        await sb.from('hostels_listings').delete().eq('id', id);
        await loadHostels();
        renderAdminDashboard();
      });
      break;
    case 'appt-confirm':
      await sb.from('appointments').update({ status: 'confirmed' }).eq('id', id);
      if (STATE.currentPage === 'admin') renderAdminDashboard();
      else renderVendorDashboard();
      toast('success', 'Appointment confirmed');
      break;
    case 'appt-cancel':
      await sb.from('appointments').update({ status: 'cancelled' }).eq('id', id);
      if (STATE.currentPage === 'admin') renderAdminDashboard();
      else renderVendorDashboard();
      toast('warning', 'Appointment cancelled');
      break;
    case 'edit-product':
      STATE.vendorEditingProductId = id;
      STATE.vendorPanel = 'add-product';
      renderVendorDashboard();
      break;
    case 'new-product':
      STATE.vendorEditingProductId = null;
      STATE.vendorPanel = 'add-product';
      renderVendorDashboard();
      break;
    case 'edit-hostel':
      STATE.vendorEditingHostelId = id;
      STATE.vendorPanel = 'add-hostel';
      renderVendorDashboard();
      break;
    case 'new-hostel':
      STATE.vendorEditingHostelId = null;
      STATE.vendorPanel = 'add-hostel';
      renderVendorDashboard();
      break;
    case 'admin-edit-product':
      STATE.adminEditingProductId = id;
      STATE.adminPanel = 'products';
      renderAdminDashboard();
      break;
    case 'cancel-admin-edit':
      STATE.adminEditingProductId = null;
      renderAdminDashboard();
      break;
    case 'toggle-admin-order':
      STATE.adminExpandedOrderId = STATE.adminExpandedOrderId === id ? null : id;
      renderAdminDashboard();
      break;
    case 'admin-appt-filter':
      STATE.adminApptFilter = action.dataset.filter;
      renderAdminDashboard();
      break;
    case 'dismiss-deletion':
      await sb.from('profiles').update({ deletion_requested: false }).eq('id', id);
      await logAdmin('dismiss_deletion', 'user', id, id);
      toast('success', 'Deletion request dismissed');
      renderAdminDashboard();
      break;
    case 'flag-review':
      await sb.from('reviews').update({ flagged: true }).eq('id', id);
      await logAdmin('flag_review', 'review', id, id);
      toast('warning', 'Review flagged');
      renderAdminDashboard();
      break;
    case 'delete-review':
      confirmDialog('Delete review', 'Remove this review permanently?', async () => {
        await sb.from('reviews').delete().eq('id', id);
        await logAdmin('delete_review', 'review', id, id);
        toast('success', 'Review deleted');
        renderAdminDashboard();
      });
      break;
    case 'order-status':
      break;
  }

  if (action.dataset.action === 'order-status') return;
});

document.addEventListener('change', async (e) => {
  if (e.target.dataset.action === 'order-status') {
    const id = e.target.dataset.id;
    await sb.from('orders').update({ status: e.target.value }).eq('id', id);
    await logAdmin('order_status', 'order', id, e.target.value);
    toast('success', 'Order status updated');
    await loadOrders();
    renderAdminDashboard();
  }
});

$('login-form')?.addEventListener('submit', handleLogin);
$('register-form')?.addEventListener('submit', handleRegister);

$('forgot-password-toggle')?.addEventListener('click', () => {
  $('forgot-password-form')?.classList.toggle('hidden');
});

$('forgot-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('forgot-email').value.trim();
  const btn = e.target.querySelector('[type=submit]');
  setLoading(btn, true);
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) toast('error', error.message);
  else toast('success', 'Check your email for the password reset link.');
  setLoading(btn, false);
});
$$('.role-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.role-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    STATE.regRole = tab.dataset.role;
    $('vendor-fields').classList.toggle('hidden', STATE.regRole !== 'vendor');
  });
});

['filter-search', 'filter-category', 'filter-sort', 'filter-type'].forEach((id) => {
  $(id)?.addEventListener('input', renderProducts);
  $(id)?.addEventListener('change', renderProducts);
});

['hostel-type-filter', 'hostel-price-max', 'hostel-uni-filter'].forEach((id) => {
  $(id)?.addEventListener('input', () => {
    if (id === 'hostel-price-max') $('hostel-price-label').textContent = `Max: ${formatCurrency($('hostel-price-max').value)}`;
    renderHostels();
  });
  $(id)?.addEventListener('change', renderHostels);
});
$$('.amenity-filter').forEach((c) => c.addEventListener('change', renderHostels));

$('checkout-form')?.addEventListener('submit', placeOrder);
$('appointment-form')?.addEventListener('submit', submitAppointment);
$('modal-close-appt').addEventListener('click', () => $('appointment-modal').classList.add('hidden'));
$('modal-close-confirm').addEventListener('click', closeConfirm);
$('confirm-cancel').addEventListener('click', closeConfirm);
$('confirm-ok').addEventListener('click', async () => {
  if (STATE.confirmCallback) await STATE.confirmCallback();
  closeConfirm();
});
$('close-announcement').addEventListener('click', () => {
  sessionStorage.setItem('ann-dismissed', '1');
  $('announcement-bar').classList.add('hidden');
});

document.addEventListener('click', (e) => {
  const img = e.target.closest('[data-lightbox]');
  if (img) {
    $('lightbox-img').src = img.dataset.lightbox;
    $('lightbox').classList.remove('hidden');
  }
  if (e.target.id === 'lightbox') $('lightbox').classList.add('hidden');
});

$('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  setLoading(btn, true);
  let business_logo_url = STATE.profile.business_logo_url;
  const logoFile = $('profile-logo')?.files[0];
  const avatarFile = $('profile-avatar')?.files[0];
  try {
    if (logoFile) business_logo_url = await uploadFile('logos', `${STATE.profile.id}-logo`, logoFile);
    if (avatarFile) await uploadFile('avatars', `${STATE.profile.id}-avatar`, avatarFile);
  } catch (err) {
    toast('warning', 'Upload issue: ' + err.message);
  }
  const updates = {
    full_name: $('profile-name').value.trim(),
    phone: $('profile-phone').value.trim(),
    hall: $('profile-hall').value.trim(),
    business_name: $('profile-business')?.value?.trim(),
    business_bio: $('profile-bio')?.value?.trim(),
    availability_hours: $('profile-hours')?.value?.trim(),
    social_handle: $('profile-social')?.value?.trim(),
    campus_location: $('profile-location')?.value?.trim(),
    business_logo_url,
  };
  const { error } = await sb.from('profiles').update(updates).eq('id', STATE.profile.id);
  if (error) toast('error', error.message);
  else {
    toast('warning', 'Profile updated — may require re-approval.');
    const { data } = await sb.from('profiles').select('*').eq('id', STATE.profile.id).single();
    STATE.profile = data;
  }
  setLoading(btn, false);
});

$('request-deletion')?.addEventListener('click', () => {
  confirmDialog('Request deletion', 'Flag account for admin review?', async () => {
    await sb.from('profiles').update({ deletion_requested: true }).eq('id', STATE.profile.id);
    toast('warning', 'Deletion request submitted.');
  });
});

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'review-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await sb.from('reviews').insert({
      product_id: fd.get('product_id'),
      user_id: STATE.profile.id,
      user_name: STATE.profile.full_name,
      rating: Number(fd.get('rating')),
      body: fd.get('body'),
    });
    if (error) toast('error', error.message);
    else { toast('success', 'Review submitted'); renderDetail(fd.get('product_id')); }
  }
  if (e.target.id === 'vendor-product-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    let image_url = '';
    const file = fd.get('image');
    if (file?.size) image_url = await uploadFile('products', `${Date.now()}-${file.name}`, file);
    const pid = fd.get('id');
    const existing = pid ? STATE.products.find((p) => p.id === pid) : null;
    const row = {
      name: fd.get('name'),
      category: fd.get('category'),
      type: fd.get('type'),
      price: Number(fd.get('price')),
      description: fd.get('description'),
      availability_hours: fd.get('availability_hours'),
      vendor_id: STATE.profile.id,
      vendor_name: STATE.profile.business_name || STATE.profile.full_name,
      image_url: image_url || existing?.image_url || null,
    };
    if (pid) await sb.from('products').update(row).eq('id', pid);
    else await sb.from('products').insert(row);
    await loadProducts();
    toast('success', 'Product saved');
    STATE.vendorEditingProductId = null;
    STATE.vendorPanel = 'products';
    renderVendorDashboard();
  }
  if (e.target.id === 'vendor-hostel-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amenities = fd.getAll('amenity');
    let images = [];
    const file = fd.get('image');
    const hid = fd.get('id');
    const existing = hid ? STATE.hostels.find((h) => h.id === hid) : null;
    if (file?.size) {
      const url = await uploadFile('hostels', `${Date.now()}-${file.name}`, file);
      images = [url];
    } else if (existing?.images?.length) {
      images = existing.images;
    }
    const title = fd.get('title').trim();
    const price = Number(fd.get('price_per_month'));
    const row = {
      name: title,
      title,
      type: fd.get('type'),
      price,
      price_per_month: price,
      location: fd.get('location'),
      university: fd.get('university'),
      amenities,
      available_from: fd.get('available_from') || null,
      units_available: Number(fd.get('units_available')) || 1,
      landlord_name: fd.get('landlord_name'),
      landlord_phone: fd.get('landlord_phone'),
      rules: fd.get('rules'),
      images,
      vendor_id: STATE.profile.id,
      status: existing?.status || 'pending',
    };
    if (hid) await sb.from('hostels_listings').update(row).eq('id', hid);
    else await sb.from('hostels_listings').insert(row);
    await loadHostels();
    toast('success', hid ? 'Hostel updated' : 'Hostel submitted for approval');
    STATE.vendorEditingHostelId = null;
    STATE.vendorPanel = 'hostels';
    renderVendorDashboard();
  }
  if (e.target.id === 'admin-edit-product-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get('id');
    await sb.from('products').update({
      name: fd.get('name'),
      category: fd.get('category'),
      price: Number(fd.get('price')),
      description: fd.get('description'),
      image_url: fd.get('image_url'),
      featured: fd.get('featured') === 'on',
      in_stock: fd.get('in_stock') === 'on',
    }).eq('id', id);
    await logAdmin('edit_product', 'product', id, fd.get('name'));
    await loadProducts();
    toast('success', 'Product updated');
    STATE.adminEditingProductId = null;
    renderAdminDashboard();
  }
  if (e.target.id === 'create-admin-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('[type=submit]');
    setLoading(btn, true);
    const email = fd.get('email').trim();
    const name = fd.get('name').trim();
    const password = fd.get('password');
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'admin' } },
    });
    if (error) {
      toast('error', error.message);
      setLoading(btn, false);
      return;
    }
    if (data.user?.id) {
      await sb.from('profiles').update({
        role: 'admin',
        status: 'approved',
        verified: true,
        full_name: name,
      }).eq('id', data.user.id);
    }
    const res = $('create-admin-result');
    res.classList.remove('hidden');
    res.innerHTML = `Admin <strong>${escapeHtml(email)}</strong> created. They can log in now.`;
    await logAdmin('create_admin', 'user', data.user?.id, email);
    toast('success', 'Admin account created');
    e.target.reset();
    setLoading(btn, false);
  }
  if (e.target.id === 'admin-product-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const vid = fd.get('vendor_id');
    const vendor = STATE.profiles.find((p) => p.id === vid);
    await sb.from('products').insert({
      name: fd.get('name'),
      category: fd.get('category'),
      type: fd.get('type'),
      price: Number(fd.get('price')),
      description: fd.get('description'),
      image_url: fd.get('image_url'),
      vendor_id: vid || null,
      vendor_name: vendor ? vendor.business_name || vendor.full_name : 'Campus Companion',
      featured: fd.get('featured') === 'on',
      in_stock: true,
    });
    await loadProducts();
    toast('success', 'Product added');
    e.target.reset();
  }
  if (e.target.id === 'admin-settings-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    let logo_url = STATE.settings.logo_url;
    const lf = fd.get('logo');
    if (lf?.size) logo_url = await uploadFile('logos', 'site-logo', lf);
    await sb.from('site_settings').update({
      tagline: fd.get('tagline'),
      announcement_banner: fd.get('announcement_banner'),
      logo_url,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    await loadSettings();
    toast('success', 'Settings saved');
  }
});

// ─── Boot ────────────────────────────────────────────────────────────────────
async function boot() {
  $('year').textContent = new Date().getFullYear();
  const apptSelect = $('appt-time');
  if (apptSelect) apptSelect.innerHTML = TIME_SLOTS.map((t) => `<option>${t}</option>`).join('');

  showLoader(true);
  try {
    await loadSettings();
    await loadProducts();
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile?.status === 'approved') {
        STATE.user = session.user;
        STATE.profile = profile;
        await loadUserData();
        await loadHostels();
        if (profile.role === 'admin') navigate('admin');
        else if (profile.role === 'vendor') navigate('vendor-dashboard');
        else navigate('home');
      } else if (profile) {
        const statusEl = $('login-status');
        statusEl.classList.remove('hidden');
        if (profile.status === 'pending') {
          statusEl.className = 'status-msg pending';
          statusEl.innerHTML =
            'Your account is <strong>pending approval</strong>. An admin must approve you in Supabase, or run <code>01-make-admin.sql</code> for your email to become the first admin.';
        } else {
          statusEl.className = 'status-msg rejected';
          statusEl.textContent = `Account status: ${profile.status}. Contact support.`;
        }
        await sb.auth.signOut();
        navigate('auth');
      } else {
        await sb.auth.signOut();
        navigate('auth');
        toast('error', 'Profile missing. Check Supabase profiles table.');
      }
    } else {
      await loadHostels();
      navigate('auth');
    }
  } catch (err) {
    console.error(err);
    toast('error', 'Boot failed. Check Supabase schema and keys.');
    navigate('auth');
  }
  showLoader(false);
}

sb.auth.onAuthStateChange(async (_event, session) => {
  if (!session && STATE.profile) {
    STATE.user = null;
    STATE.profile = null;
  }
});

document.addEventListener('DOMContentLoaded', boot);
