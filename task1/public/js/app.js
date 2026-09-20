/* =========================================================
   ALPHASTORE CLIENT-SIDE JAVASCRIPT APPLICATION
   ========================================================= */

// State Management
const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('alphastore_cart') || '[]'),
  user: JSON.parse(localStorage.getItem('alphastore_user') || 'null'),
  token: localStorage.getItem('alphastore_token') || null,
  activeCategory: 'All',
  searchQuery: '',
  sortOption: 'default',
  currentModalProduct: null
};

// DOM Elements
const elements = {
  productsGrid: document.getElementById('productsGrid'),
  noProductsFound: document.getElementById('noProductsFound'),
  categoryChips: document.getElementById('categoryChips'),
  sortSelect: document.getElementById('sortSelect'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  activeFilterBar: document.getElementById('activeFilterBar'),
  activeFilterText: document.getElementById('activeFilterText'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  viewAllProductsBtn: document.getElementById('viewAllProductsBtn'),
  homeLogo: document.getElementById('homeLogo'),

  // Cart
  cartBtn: document.getElementById('cartBtn'),
  cartBadge: document.getElementById('cartBadge'),
  cartOverlay: document.getElementById('cartOverlay'),
  closeCartBtn: document.getElementById('closeCartBtn'),
  cartItemsList: document.getElementById('cartItemsList'),
  cartItemsCountText: document.getElementById('cartItemsCountText'),
  cartSubtotal: document.getElementById('cartSubtotal'),
  cartTotal: document.getElementById('cartTotal'),
  proceedToCheckoutBtn: document.getElementById('proceedToCheckoutBtn'),

  // Product Modal
  productModalOverlay: document.getElementById('productModalOverlay'),
  closeProductModalBtn: document.getElementById('closeProductModalBtn'),
  productModalContent: document.getElementById('productModalContent'),

  // Checkout Modal
  checkoutModalOverlay: document.getElementById('checkoutModalOverlay'),
  closeCheckoutModalBtn: document.getElementById('closeCheckoutModalBtn'),
  checkoutForm: document.getElementById('checkoutForm'),
  checkoutName: document.getElementById('checkoutName'),
  checkoutEmail: document.getElementById('checkoutEmail'),
  checkoutAddress: document.getElementById('checkoutAddress'),
  checkoutCity: document.getElementById('checkoutCity'),
  checkoutZip: document.getElementById('checkoutZip'),
  checkoutItemsPreview: document.getElementById('checkoutItemsPreview'),
  checkoutSubtotal: document.getElementById('checkoutSubtotal'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  placeOrderBtn: document.getElementById('placeOrderBtn'),

  // Success Modal
  orderSuccessOverlay: document.getElementById('orderSuccessOverlay'),
  successOrderId: document.getElementById('successOrderId'),
  successOrderStatus: document.getElementById('successOrderStatus'),
  successOrderTotal: document.getElementById('successOrderTotal'),
  successOrderAddress: document.getElementById('successOrderAddress'),
  viewMyOrdersAfterSuccessBtn: document.getElementById('viewMyOrdersAfterSuccessBtn'),
  continueShoppingBtn: document.getElementById('continueShoppingBtn'),

  // Auth
  authBtn: document.getElementById('authBtn'),
  authBtnLabel: document.getElementById('authBtnLabel'),
  userDropdown: document.getElementById('userDropdown'),
  dropdownUserName: document.getElementById('dropdownUserName'),
  dropdownUserEmail: document.getElementById('dropdownUserEmail'),
  openOrdersBtn: document.getElementById('openOrdersBtn'),
  directOrdersBtn: document.getElementById('directOrdersBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authModalOverlay: document.getElementById('authModalOverlay'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  tabLoginBtn: document.getElementById('tabLoginBtn'),
  tabRegisterBtn: document.getElementById('tabRegisterBtn'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  fillDemoCredsBtn: document.getElementById('fillDemoCredsBtn'),
  authErrorMsg: document.getElementById('authErrorMsg'),

  // Orders Modal
  ordersModalOverlay: document.getElementById('ordersModalOverlay'),
  closeOrdersModalBtn: document.getElementById('closeOrdersModalBtn'),
  ordersListContainer: document.getElementById('ordersListContainer'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateAuthUI();
  updateCartBadge();
  fetchProducts();

  // Validate existing token
  if (state.token) {
    validateSession();
  }
});

// ===================== EVENT LISTENERS =====================
function initEventListeners() {
  // Category Filtering
  elements.categoryChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip-btn')) {
      document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.activeCategory = e.target.dataset.category;
      fetchProducts();
    }
  });

  // Sorting
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortOption = e.target.value;
    fetchProducts();
  });

  // Search Input with Debounce
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    elements.clearSearchBtn.style.display = val ? 'block' : 'none';
    searchTimeout = setTimeout(() => {
      state.searchQuery = val;
      fetchProducts();
    }, 300);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    state.searchQuery = '';
    fetchProducts();
  });

  elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
  elements.viewAllProductsBtn.addEventListener('click', resetAllFilters);
  elements.homeLogo.addEventListener('click', (e) => {
    e.preventDefault();
    resetAllFilters();
  });

  // Cart Drawer
  elements.cartBtn.addEventListener('click', openCartDrawer);
  elements.closeCartBtn.addEventListener('click', closeCartDrawer);
  elements.cartOverlay.addEventListener('click', (e) => {
    if (e.target === elements.cartOverlay) closeCartDrawer();
  });
  elements.proceedToCheckoutBtn.addEventListener('click', () => {
    closeCartDrawer();
    openCheckoutModal();
  });

  // Product Modal
  elements.closeProductModalBtn.addEventListener('click', closeProductModal);
  elements.productModalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.productModalOverlay) closeProductModal();
  });

  // Checkout Modal
  elements.closeCheckoutModalBtn.addEventListener('click', closeCheckoutModal);
  elements.checkoutModalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.checkoutModalOverlay) closeCheckoutModal();
  });
  elements.checkoutForm.addEventListener('submit', handleCheckoutSubmit);

  // Success Modal
  elements.continueShoppingBtn.addEventListener('click', () => {
    elements.orderSuccessOverlay.classList.remove('active');
  });
  elements.viewMyOrdersAfterSuccessBtn.addEventListener('click', () => {
    elements.orderSuccessOverlay.classList.remove('active');
    openOrdersModal();
  });

  // Auth Button & Dropdown
  elements.authBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.user) {
      const isVisible = elements.userDropdown.style.display === 'block';
      elements.userDropdown.style.display = isVisible ? 'none' : 'block';
    } else {
      openAuthModal('login');
    }
  });

  document.addEventListener('click', (e) => {
    if (!elements.authBtn.contains(e.target) && !elements.userDropdown.contains(e.target)) {
      elements.userDropdown.style.display = 'none';
    }
  });

  elements.logoutBtn.addEventListener('click', handleLogout);
  elements.closeAuthModalBtn.addEventListener('click', closeAuthModal);
  elements.authModalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.authModalOverlay) closeAuthModal();
  });

  // Auth Tabs
  elements.tabLoginBtn.addEventListener('click', () => switchAuthTab('login'));
  elements.tabRegisterBtn.addEventListener('click', () => switchAuthTab('register'));

  // Auth Form Submits
  elements.loginForm.addEventListener('submit', handleLoginSubmit);
  elements.registerForm.addEventListener('submit', handleRegisterSubmit);
  elements.fillDemoCredsBtn.addEventListener('click', fillDemoCredentials);

  // Orders Modals
  elements.directOrdersBtn.addEventListener('click', openOrdersModal);
  elements.openOrdersBtn.addEventListener('click', () => {
    elements.userDropdown.style.display = 'none';
    openOrdersModal();
  });
  elements.closeOrdersModalBtn.addEventListener('click', closeOrdersModal);
  elements.ordersModalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.ordersModalOverlay) closeOrdersModal();
  });

  // ESC key closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCartDrawer();
      closeProductModal();
      closeCheckoutModal();
      closeAuthModal();
      closeOrdersModal();
      elements.orderSuccessOverlay.classList.remove('active');
    }
  });
}

function resetAllFilters() {
  state.activeCategory = 'All';
  state.searchQuery = '';
  state.sortOption = 'default';
  elements.searchInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  elements.sortSelect.value = 'default';
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'All');
  });
  elements.activeFilterBar.style.display = 'none';
  fetchProducts();
}

// ===================== PRODUCTS FETCH & RENDER =====================
async function fetchProducts() {
  try {
    elements.productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <p style="color: var(--text-muted);">Loading products...</p>
      </div>
    `;

    const params = new URLSearchParams();
    if (state.activeCategory && state.activeCategory !== 'All') {
      params.append('category', state.activeCategory);
    }
    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }
    if (state.sortOption && state.sortOption !== 'default') {
      params.append('sort', state.sortOption);
    }

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    state.products = data.products || [];

    // Filter indicator
    if (state.activeCategory !== 'All' || state.searchQuery) {
      elements.activeFilterBar.style.display = 'flex';
      const parts = [];
      if (state.activeCategory !== 'All') parts.push(`Category: "${state.activeCategory}"`);
      if (state.searchQuery) parts.push(`Search: "${state.searchQuery}"`);
      elements.activeFilterText.textContent = `Active Filters: ${parts.join(' | ')}`;
    } else {
      elements.activeFilterBar.style.display = 'none';
    }

    renderProducts();
  } catch (err) {
    console.error('Error fetching products:', err);
    elements.productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--danger);">
        <p>Failed to load products. Make sure the server is running.</p>
      </div>
    `;
  }
}

function renderProducts() {
  if (state.products.length === 0) {
    elements.productsGrid.style.display = 'none';
    elements.noProductsFound.style.display = 'block';
    return;
  }

  elements.productsGrid.style.display = 'grid';
  elements.noProductsFound.style.display = 'none';

  elements.productsGrid.innerHTML = state.products.map(product => `
    <article class="product-card" data-id="${product.id}">
      <div class="product-img-wrap" onclick="viewProductDetail(${product.id})">
        <img src="${product.image_url}" alt="${escapeHtml(product.title)}" loading="lazy">
        <span class="badge badge-category">${escapeHtml(product.category)}</span>
        <span class="badge badge-rating">★ ${product.rating.toFixed(1)}</span>
      </div>
      <div class="product-card-body">
        <h3 class="product-title" onclick="viewProductDetail(${product.id})">${escapeHtml(product.title)}</h3>
        <p class="product-desc">${escapeHtml(product.description)}</p>
        <span class="badge-stock ${product.stock < 5 ? 'text-danger' : ''}">
          ${product.stock > 0 ? `In Stock (${product.stock} left)` : 'Out of Stock'}
        </span>
        <div class="product-card-footer">
          <div class="product-price">$${product.price.toFixed(2)}</div>
          <div class="product-card-actions">
            <button class="btn btn-outline btn-card-action" onclick="viewProductDetail(${product.id})" title="Product details">
              Details
            </button>
            <button class="btn btn-primary btn-card-action" onclick="handleAddToCartClick(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
              ${product.stock === 0 ? 'Sold Out' : '+ Cart'}
            </button>
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

// ===================== PRODUCT DETAILS MODAL =====================
window.viewProductDetail = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  state.currentModalProduct = product;

  elements.productModalContent.innerHTML = `
    <div class="modal-img-wrap">
      <img src="${product.image_url}" alt="${escapeHtml(product.title)}">
    </div>
    <div class="modal-info-wrap">
      <span class="badge badge-category modal-category-badge">${escapeHtml(product.category)}</span>
      <h2 class="modal-title">${escapeHtml(product.title)}</h2>
      <div class="modal-rating-row">
        <span style="color: #f59e0b; font-weight: 700;">★ ${product.rating.toFixed(1)}</span>
        <span style="color: var(--text-muted);">(48 customer reviews)</span>
      </div>
      <div class="modal-price">$${product.price.toFixed(2)}</div>
      <p class="modal-description">${escapeHtml(product.description)}</p>
      <div class="modal-stock-info">
        <span class="badge badge-success">✓ In Stock</span>
        <span>${product.stock} units available in warehouse</span>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
        <label for="detailQty" style="font-weight: 600; font-size: 0.9rem;">Quantity:</label>
        <div class="cart-qty-control">
          <button class="qty-btn" onclick="adjustDetailQty(-1)">-</button>
          <input type="text" id="detailQty" class="qty-input" value="1" readonly>
          <button class="qty-btn" onclick="adjustDetailQty(1)">+</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" onclick="addProductFromModal()">
          🛒 Add to Shopping Cart
        </button>
      </div>
    </div>
  `;

  elements.productModalOverlay.classList.add('active');
};

window.adjustDetailQty = function(delta) {
  const input = document.getElementById('detailQty');
  if (!input || !state.currentModalProduct) return;
  let val = parseInt(input.value, 10) + delta;
  if (val < 1) val = 1;
  if (val > state.currentModalProduct.stock) val = state.currentModalProduct.stock;
  input.value = val;
};

window.addProductFromModal = function() {
  if (!state.currentModalProduct) return;
  const input = document.getElementById('detailQty');
  const qty = input ? parseInt(input.value, 10) || 1 : 1;
  addToCart(state.currentModalProduct, qty);
  closeProductModal();
};

function closeProductModal() {
  elements.productModalOverlay.classList.remove('active');
  state.currentModalProduct = null;
}

// ===================== SHOPPING CART =====================
window.handleAddToCartClick = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (product) {
    addToCart(product, 1);
  }
};

function addToCart(product, quantity = 1) {
  const existingIndex = state.cart.findIndex(item => item.product.id === product.id);

  if (existingIndex > -1) {
    const currentQty = state.cart[existingIndex].quantity;
    const newQty = currentQty + quantity;
    if (newQty > product.stock) {
      showToast(`Cannot add more than ${product.stock} items of "${product.title}"`, 'error');
      return;
    }
    state.cart[existingIndex].quantity = newQty;
  } else {
    state.cart.push({ product, quantity });
  }

  saveCart();
  updateCartBadge();
  showToast(`Added "${product.title}" to cart!`, 'success');
}

function saveCart() {
  localStorage.setItem('alphastore_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartBadge.textContent = totalItems;
}

function openCartDrawer() {
  renderCartItems();
  elements.cartOverlay.classList.add('active');
}

function closeCartDrawer() {
  elements.cartOverlay.classList.remove('active');
}

function renderCartItems() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartItemsCountText.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;

  if (state.cart.length === 0) {
    elements.cartItemsList.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🛒</span>
        <h4 style="font-weight: 700; margin-bottom: 0.5rem;">Your cart is empty</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">Looks like you haven't added anything yet.</p>
        <button class="btn btn-outline btn-sm" onclick="closeCartDrawer()">Explore Catalog</button>
      </div>
    `;
    elements.cartSubtotal.textContent = '$0.00';
    elements.cartTotal.textContent = '$0.00';
    elements.proceedToCheckoutBtn.disabled = true;
    return;
  }

  elements.proceedToCheckoutBtn.disabled = false;

  let subtotal = 0;
  elements.cartItemsList.innerHTML = state.cart.map((item, index) => {
    const itemTotal = item.product.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.product.image_url}" alt="${escapeHtml(item.product.title)}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-title" title="${escapeHtml(item.product.title)}">${escapeHtml(item.product.title)}</div>
          <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
          <div class="cart-qty-control">
            <button class="qty-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
            <span class="qty-input">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeCartItem(${index})" title="Remove item">🗑</button>
      </div>
    `;
  }).join('');

  elements.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  elements.cartTotal.textContent = `$${subtotal.toFixed(2)}`;
}

window.updateCartItemQty = function(index, delta) {
  if (!state.cart[index]) return;
  const newQty = state.cart[index].quantity + delta;

  if (newQty <= 0) {
    removeCartItem(index);
    return;
  }

  if (newQty > state.cart[index].product.stock) {
    showToast(`Only ${state.cart[index].product.stock} units available`, 'error');
    return;
  }

  state.cart[index].quantity = newQty;
  saveCart();
  updateCartBadge();
  renderCartItems();
};

window.removeCartItem = function(index) {
  const item = state.cart[index];
  state.cart.splice(index, 1);
  saveCart();
  updateCartBadge();
  renderCartItems();
  if (item) showToast(`Removed "${item.product.title}" from cart`, 'info');
};

// ===================== CHECKOUT FLOW =====================
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  // Auto-fill logged in user info
  if (state.user) {
    elements.checkoutName.value = state.user.name || '';
    elements.checkoutEmail.value = state.user.email || '';
  }

  // Render items preview
  let subtotal = 0;
  elements.checkoutItemsPreview.innerHTML = state.cart.map(item => {
    const total = item.product.price * item.quantity;
    subtotal += total;
    return `
      <div class="preview-item">
        <span class="preview-item-name">${item.quantity}x ${escapeHtml(item.product.title)}</span>
        <strong>$${total.toFixed(2)}</strong>
      </div>
    `;
  }).join('');

  elements.checkoutSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  elements.checkoutTotal.textContent = `$${subtotal.toFixed(2)}`;

  elements.checkoutModalOverlay.classList.add('active');
}

function closeCheckoutModal() {
  elements.checkoutModalOverlay.classList.remove('active');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = elements.checkoutName.value.trim();
  const email = elements.checkoutEmail.value.trim();
  const address = `${elements.checkoutAddress.value.trim()}, ${elements.checkoutCity.value.trim()} ${elements.checkoutZip.value.trim()}`;

  if (!name || !email || !elements.checkoutAddress.value.trim()) {
    showToast('Please fill all required shipping fields', 'error');
    return;
  }

  const payload = {
    customer_name: name,
    customer_email: email,
    shipping_address: address,
    items: state.cart.map(i => ({
      product_id: i.product.id,
      quantity: i.quantity
    }))
  };

  try {
    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.textContent = 'Processing Order...';

    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to place order');
    }

    // Success! Clear cart
    state.cart = [];
    saveCart();
    updateCartBadge();
    closeCheckoutModal();

    // Show confirmation modal
    elements.successOrderId.textContent = `#ORD-${String(data.orderId).padStart(4, '0')}`;
    elements.successOrderTotal.textContent = `$${data.totalAmount.toFixed(2)}`;
    elements.successOrderAddress.textContent = address;
    elements.orderSuccessOverlay.classList.add('active');

    // Refresh products catalog to reflect reduced stock
    fetchProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.placeOrderBtn.disabled = false;
    elements.placeOrderBtn.textContent = 'Confirm & Place Order';
  }
}

// ===================== USER AUTHENTICATION =====================
function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  elements.authErrorMsg.style.display = 'none';
  elements.authModalOverlay.classList.add('active');
}

function closeAuthModal() {
  elements.authModalOverlay.classList.remove('active');
}

function switchAuthTab(tab) {
  if (tab === 'login') {
    elements.tabLoginBtn.classList.add('active');
    elements.tabRegisterBtn.classList.remove('active');
    elements.loginForm.style.display = 'block';
    elements.registerForm.style.display = 'none';
  } else {
    elements.tabLoginBtn.classList.remove('active');
    elements.tabRegisterBtn.classList.add('active');
    elements.loginForm.style.display = 'none';
    elements.registerForm.style.display = 'block';
  }
  elements.authErrorMsg.style.display = 'none';
}

function fillDemoCredentials() {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = 'demo@codealpha.com';
  document.getElementById('loginPassword').value = 'password123';
  showToast('Demo credentials pre-filled!', 'info');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    elements.authErrorMsg.style.display = 'none';
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setSession(data.user, data.token);
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name}!`, 'success');
  } catch (err) {
    elements.authErrorMsg.textContent = err.message;
    elements.authErrorMsg.style.display = 'block';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    elements.authErrorMsg.style.display = 'none';
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    setSession(data.user, data.token);
    closeAuthModal();
    showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
  } catch (err) {
    elements.authErrorMsg.textContent = err.message;
    elements.authErrorMsg.style.display = 'block';
  }
}

function setSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('alphastore_user', JSON.stringify(user));
  localStorage.setItem('alphastore_token', token);
  updateAuthUI();
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('alphastore_user');
  localStorage.removeItem('alphastore_token');
  elements.userDropdown.style.display = 'none';
  updateAuthUI();
  showToast('Logged out successfully', 'info');
}

function updateAuthUI() {
  if (state.user) {
    elements.authBtnLabel.textContent = state.user.name.split(' ')[0];
    elements.dropdownUserName.textContent = state.user.name;
    elements.dropdownUserEmail.textContent = state.user.email;
  } else {
    elements.authBtnLabel.textContent = 'Sign In';
    elements.userDropdown.style.display = 'none';
  }
}

async function validateSession() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) {
      handleLogout();
    } else {
      const data = await res.json();
      state.user = data.user;
      localStorage.setItem('alphastore_user', JSON.stringify(data.user));
      updateAuthUI();
    }
  } catch (err) {
    console.error('Session validation error:', err);
  }
}

// ===================== ORDERS HISTORY =====================
async function openOrdersModal() {
  if (!state.user && !state.token) {
    // If not logged in, prompt user to sign in
    showToast('Please sign in to view your orders', 'info');
    openAuthModal('login');
    return;
  }

  elements.ordersListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading your orders...</p>';
  elements.ordersModalOverlay.classList.add('active');

  try {
    const res = await fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');

    if (!data.orders || data.orders.length === 0) {
      elements.ordersListContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">📦</span>
          <h4 style="font-weight: 700; margin-bottom: 0.25rem;">No orders yet</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Items you purchase will appear here.</p>
        </div>
      `;
      return;
    }

    elements.ordersListContainer.innerHTML = data.orders.map(order => `
      <div class="order-history-card">
        <div class="order-card-header">
          <div>
            <span class="order-id">Order #ORD-${String(order.id).padStart(4, '0')}</span>
            <div class="order-date">${new Date(order.created_at).toLocaleString()}</div>
          </div>
          <span class="badge badge-success">${order.status}</span>
        </div>
        <div class="order-card-items">
          ${order.items && order.items.length > 0 ? order.items.map(it => `
            <div>• ${it.quantity}x <strong>${escapeHtml(it.product_title)}</strong> ($${it.unit_price.toFixed(2)} ea)</div>
          `).join('') : '<p>Items details unavailable</p>'}
        </div>
        <div class="order-card-footer">
          <span>Deliver to: ${escapeHtml(order.shipping_address)}</span>
          <strong style="font-size: 1rem; color: var(--primary);">Total: $${order.total_amount.toFixed(2)}</strong>
        </div>
      </div>
    `).join('');
  } catch (err) {
    elements.ordersListContainer.innerHTML = `
      <p style="text-align: center; color: var(--danger); padding: 2rem;">
        ${escapeHtml(err.message)}
      </p>
    `;
  }
}

function closeOrdersModal() {
  elements.ordersModalOverlay.classList.remove('active');
}

// ===================== TOAST NOTIFICATIONS =====================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease-in';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

// ===================== UTILITY =====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
