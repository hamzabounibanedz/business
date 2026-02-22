/**
 * ============================================================================
 * EDITABLE CONFIGURATION - EDIT THESE SECTIONS BELOW
 * ============================================================================
 * 
 * 1. CONFIG object (lines ~15-30): Store settings, colors, messages, webhook
 * 2. PRODUCTS - Loaded from products.json file (edit products.json to add/edit products)
 * 3. WILAYAS array (lines ~100+): Algerian wilayas list
 * 
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURATION OBJECT - EDIT HERE
// ============================================================================
const CONFIG = {
  // Store identity
  STORE_NAME: "My Store",
  CURRENCY: "DZD",
  
  // Webhook settings (REPLACE WITH YOUR GOOGLE APPS SCRIPT URL)
  WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbz0pO6d3YoslFRadUD_6UKhw2Q0Um4B3bc8sGGaUIrt9pAnDEAGBlLm-C-a3lXI65r8/exec",
  WEBHOOK_SECRET: "myStore2025SecretKey",
  
  // Theme colors (hex codes)
  PRIMARY_COLOR: "#2563eb",
  ACCENT_COLOR: "#10b981",
  
  // User messages
  SUCCESS_MESSAGE: "Order placed successfully!",
  ERROR_MESSAGE: "Something went wrong. Please try again.",
  LOADING_TEXT: "Processing...",
  
  // UTM tracking
  UTM_CAPTURE: true,
  
  // Retry settings
  MAX_CLIENT_RETRIES: 3,
  RETRY_BACKOFF_MS: 1000
};

// ============================================================================
// 2. PRODUCT CATALOG - Loaded from products.json file
// ============================================================================
let PRODUCTS = []; // Will be loaded from products.json

async function loadProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) {
      throw new Error(`Failed to load products: ${response.status}`);
    }
    PRODUCTS = await response.json();
    return PRODUCTS;
  } catch (error) {
    console.error('Error loading products:', error);
    showNotification('Failed to load products. Please refresh the page.', true);
    return [];
  }
}

// ============================================================================
// 3. WILAYAS (ALGERIAN PROVINCES) - Complete list with Arabic names
// ============================================================================
const WILAYAS = [
  "Adrar - أدرار",
  "Chlef - الشلف",
  "Laghouat - الأغواط",
  "Oum El Bouaghi - أم البواقي",
  "Batna - باتنة",
  "Béjaïa - بجاية",
  "Biskra - بسكرة",
  "Béchar - بشار",
  "Blida - البليدة",
  "Bouïra - البويرة",
  "Tamanrasset - تمنراست",
  "Tébessa - تبسة",
  "Tlemcen - تلمسان",
  "Tiaret - تيارت",
  "Tizi Ouzou - تيزي وزو",
  "Algiers - الجزائر",
  "Djelfa - الجلفة",
  "Jijel - جيجل",
  "Sétif - سطيف",
  "Saïda - سعيدة",
  "Skikda - سكيكدة",
  "Sidi Bel Abbès - سيدي بلعباس",
  "Annaba - عنابة",
  "Guelma - قالمة",
  "Constantine - قسنطينة",
  "Médéa - المدية",
  "Mostaganem - مستغانم",
  "M'Sila - المسيلة",
  "Mascara - معسكر",
  "Ouargla - ورقلة",
  "Oran - وهران",
  "El Bayadh - البيض",
  "Illizi - اليزي",
  "Bordj Bou Arréridj - برج بوعريريج",
  "Boumerdès - بومرداس",
  "El Tarf - الطارف",
  "Tindouf - تندوف",
  "Tissemsilt - تسمسيلت",
  "El Oued - الوادي",
  "Khenchela - خنشلة",
  "Souk Ahras - سوق أهراس",
  "Tipaza - تيبازة",
  "Mila - ميلة",
  "Aïn Defla - عين الدفلى",
  "Naâma - النعامة",
  "Aïn Témouchent - عين تموشنت",
  "Ghardaïa - غرداية",
  "Relizane - غليزان",
  "Timimoun - تيميمون",
  "Bordj Badji Mokhtar - برج باجي مختار",
  "Ouled Djellal - أولاد جلال",
  "Béni Abbès - بني عباس",
  "Ain Salah - عين صالح",
  "Ain Guezzam - عين قزّام",
  "Touggourt - تقرت",
  "Djanet - جانت",
  "El M'Ghair - المغير",
  "El Menia - المنيعة"
];

// ============================================================================
// CART MANAGEMENT
// ============================================================================
const CART_STORAGE_KEY = "store_cart_v1";

function getCart() {
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function generateItemKey(productId, size) {
  return `${productId}_${size}`;
}

function addItem(productId, size, qty = 1) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return false;
  
  if (product.sizes && product.sizes.length > 0 && !size) {
    return false; // Size required
  }
  
  if (product.inventory !== null && qty > product.inventory) {
    return false; // Exceeds inventory
  }
  
  const cart = getCart();
  const itemKey = generateItemKey(productId, size || "N/A");
  const existingIndex = cart.findIndex(item => item.key === itemKey);
  
  if (existingIndex >= 0) {
    const newQty = cart[existingIndex].quantity + qty;
    if (product.inventory !== null && newQty > product.inventory) {
      return false;
    }
    cart[existingIndex].quantity = newQty;
  } else {
    cart.push({
      key: itemKey,
      productId: productId,
      name: product.name,
      sku: product.sku,
      size: size || "N/A",
      quantity: qty,
      price: product.price
    });
  }
  
  saveCart(cart);
  updateCartUI();
  return true;
}

function updateQty(itemKey, qty) {
  if (qty <= 0) {
    removeItem(itemKey);
    return;
  }
  
  const cart = getCart();
  const item = cart.find(i => i.key === itemKey);
  if (!item) return false;
  
  const product = PRODUCTS.find(p => p.id === item.productId);
  if (product && product.inventory !== null && qty > product.inventory) {
    return false;
  }
  
  item.quantity = qty;
  saveCart(cart);
  updateCartUI();
  return true;
}

function removeItem(itemKey) {
  const cart = getCart();
  const filtered = cart.filter(item => item.key !== itemKey);
  saveCart(filtered);
  updateCartUI();
}

function getTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return {
    subtotal: subtotal,
    total: subtotal // No shipping
  };
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartUI();
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// ============================================================================
// UTM PARAMETER CAPTURE
// ============================================================================
function captureUTM() {
  if (!CONFIG.UTM_CAPTURE) return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || ""
  };
}

// ============================================================================
// ORDER SUBMISSION
// ============================================================================
function generateOrderId() {
  return `ORD-${Date.now()}`;
}

async function submitOrder(customerData) {
  const cart = getCart();
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }
  
  const totals = getTotals();
  const orderId = generateOrderId();
  const timestamp = new Date().toISOString();
  const utm = captureUTM();
  
  const payload = {
    secret: CONFIG.WEBHOOK_SECRET,
    orderId: orderId,
    timestamp: timestamp,
    items: cart.map(item => ({
      id: item.productId,
      name: item.name,
      sku: item.sku,
      size: item.size,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal: totals.subtotal,
    total: totals.total,
    customer: {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      wilaya: customerData.wilaya,
      address: customerData.address,
      notes: customerData.notes || ''
    }
  };
  
  if (CONFIG.UTM_CAPTURE) {
    payload.utm = utm;
  }
  
  let lastError = null;
  for (let attempt = 0; attempt <= CONFIG.MAX_CLIENT_RETRIES; attempt++) {
    try {
      const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        return { success: true, orderId, payload };
      } else {
        lastError = new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error;
    }
    
    if (attempt < CONFIG.MAX_CLIENT_RETRIES) {
      await new Promise(resolve => 
        setTimeout(resolve, CONFIG.RETRY_BACKOFF_MS * Math.pow(2, attempt))
      );
    }
  }
  
  // Queue for manual retry
  const failedOrders = JSON.parse(localStorage.getItem("store_failed_orders") || "[]");
  failedOrders.push({ orderId, payload, timestamp, error: lastError?.message });
  localStorage.setItem("store_failed_orders", JSON.stringify(failedOrders));
  
  throw lastError || new Error("Failed to submit order");
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================
let searchTimeout = null;

function debounceSearch(callback, delay = 300) {
  return function(...args) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => callback.apply(this, args), delay);
  };
}

function filterProducts(searchTerm = "", tagFilter = "", sizeFilter = "", priceMin = null, priceMax = null) {
  let filtered = [...PRODUCTS];
  
  // Search
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    const tags = p => (p.tags || []);
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      tags(p).some(tag => String(tag).toLowerCase().includes(term))
    );
  }

  // Tag filter
  if (tagFilter) {
    filtered = filtered.filter(p => (p.tags || []).includes(tagFilter));
  }
  
  // Size filter
  if (sizeFilter) {
    filtered = filtered.filter(p => p.sizes && p.sizes.includes(sizeFilter));
  }
  
  // Price range
  if (priceMin !== null && priceMin !== "") {
    filtered = filtered.filter(p => p.price >= Number(priceMin));
  }
  if (priceMax !== null && priceMax !== "") {
    filtered = filtered.filter(p => p.price <= Number(priceMax));
  }
  
  return filtered;
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Relative paths (same-origin images, e.g. "photo.webp")
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const urlObj = new URL(trimmed);
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return trimmed;
    }
    return '#';
  } catch {
    return '#';
  }
}

function validateInput(text, maxLength = 1000) {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
}

// ============================================================================
// DOM RENDERING
// ============================================================================
function updateCartUI() {
  const count = getCartCount();
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    cartCountEl.textContent = count;
    if (count > 0) {
      cartCountEl.style.display = "flex";
      // Animate badge update with bounce effect
      cartCountEl.style.animation = 'none';
      requestAnimationFrame(() => {
        cartCountEl.style.animation = 'badgeBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      });
    } else {
      cartCountEl.style.display = "none";
    }
  }
  
  renderCart();
}

function renderProducts(products = PRODUCTS) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  
  // Update result count
  const resultCount = document.getElementById("result-count");
  if (resultCount) {
    resultCount.textContent = `${products.length} product${products.length !== 1 ? "s" : ""} found`;
  }
  
  // Clear grid
  grid.textContent = '';
  
  if (products.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    
    const heading = document.createElement('h3');
    heading.textContent = 'No products found';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Try adjusting your search or filters.';
    
    noResults.appendChild(heading);
    noResults.appendChild(paragraph);
    grid.appendChild(noResults);
    return;
  }
  
  products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-id', escapeHtml(product.id));
    
    const imageDiv = document.createElement('div');
    imageDiv.className = 'product-image';
    const img = document.createElement('img');
    img.src = sanitizeUrl(product.images[0] || '');
    img.alt = escapeHtml(product.name);
    img.loading = 'lazy';
    
    // Handle image loading states
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });
    
    img.addEventListener('error', () => {
      img.style.display = 'none';
      // Show placeholder pattern
      imageDiv.style.background = 'var(--gradient-card)';
    });
    
    imageDiv.appendChild(img);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'product-info';
    
    const heading = document.createElement('h3');
    heading.textContent = product.name;
    
    const price = document.createElement('p');
    price.className = 'product-price';
    price.textContent = `${product.price.toLocaleString()} ${CONFIG.CURRENCY}`;
    
    const description = document.createElement('p');
    description.className = 'product-description';
    description.textContent = product.description;
    
    const actions = document.createElement('div');
    actions.className = 'product-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-secondary';
    viewBtn.textContent = 'View Details';
    viewBtn.setAttribute('aria-label', `View details for ${product.name}`);
    viewBtn.addEventListener('click', () => openProductModal(product.id));
    
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = 'Add to Cart';
    addBtn.setAttribute('aria-label', `Add ${product.name} to cart`);
    addBtn.addEventListener('click', () => quickAddToCart(product.id));
    
    actions.appendChild(viewBtn);
    actions.appendChild(addBtn);
    
    infoDiv.appendChild(heading);
    infoDiv.appendChild(price);
    infoDiv.appendChild(description);
    infoDiv.appendChild(actions);
    
    card.appendChild(imageDiv);
    card.appendChild(infoDiv);
    grid.appendChild(card);
  });
}

function renderCart() {
  const cartItemsEl = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  
  if (!cartItemsEl) return;
  
  const cart = getCart();
  const totals = getTotals();
  
  // Clear cart items
  cartItemsEl.textContent = '';
  
  if (cart.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'cart-empty';
    
    const emptyHeading = document.createElement('h3');
    emptyHeading.textContent = 'Your cart is empty';
    
    const emptyText = document.createElement('p');
    emptyText.textContent = 'Add some products to get started!';
    
    const shopBtn = document.createElement('button');
    shopBtn.className = 'btn btn-primary';
    shopBtn.textContent = 'Browse Products';
    shopBtn.addEventListener('click', () => {
      closeCart();
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    emptyDiv.appendChild(emptyHeading);
    emptyDiv.appendChild(emptyText);
    emptyDiv.appendChild(shopBtn);
    cartItemsEl.appendChild(emptyDiv);
    
    if (cartSubtotalEl) cartSubtotalEl.textContent = `0 ${CONFIG.CURRENCY}`;
    if (cartTotalEl) cartTotalEl.textContent = `0 ${CONFIG.CURRENCY}`;
    return;
  }
  
  cart.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.setAttribute('data-item-key', escapeHtml(item.key));
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'cart-item-info';
    
    const heading = document.createElement('h4');
    heading.textContent = item.name;
    
    const meta = document.createElement('p');
    meta.className = 'cart-item-meta';
    meta.textContent = `Size: ${item.size} • ${item.price.toLocaleString()} ${CONFIG.CURRENCY}`;
    
    infoDiv.appendChild(heading);
    infoDiv.appendChild(meta);
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'cart-item-controls';
    
    const decBtn = document.createElement('button');
    decBtn.className = 'qty-btn';
    decBtn.textContent = '-';
    decBtn.setAttribute('aria-label', 'Decrease quantity');
    decBtn.addEventListener('click', () => updateCartQty(item.key, item.quantity - 1));
    
    const qtySpan = document.createElement('span');
    qtySpan.className = 'qty-value';
    qtySpan.textContent = item.quantity;
    
    const incBtn = document.createElement('button');
    incBtn.className = 'qty-btn';
    incBtn.textContent = '+';
    incBtn.setAttribute('aria-label', 'Increase quantity');
    incBtn.addEventListener('click', () => updateCartQty(item.key, item.quantity + 1));
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove ${item.name} from cart`);
    removeBtn.addEventListener('click', () => removeCartItem(item.key));
    
    controlsDiv.appendChild(decBtn);
    controlsDiv.appendChild(qtySpan);
    controlsDiv.appendChild(incBtn);
    controlsDiv.appendChild(removeBtn);
    
    const totalDiv = document.createElement('div');
    totalDiv.className = 'cart-item-total';
    totalDiv.textContent = `${(item.price * item.quantity).toLocaleString()} ${CONFIG.CURRENCY}`;
    
    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(controlsDiv);
    itemDiv.appendChild(totalDiv);
    cartItemsEl.appendChild(itemDiv);
  });
  
  if (cartSubtotalEl) cartSubtotalEl.textContent = `${totals.subtotal.toLocaleString()} ${CONFIG.CURRENCY}`;
  if (cartTotalEl) cartTotalEl.textContent = `${totals.total.toLocaleString()} ${CONFIG.CURRENCY}`;
}

function renderProductModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  
  const modal = document.getElementById("product-modal");
  if (!modal) return;
  
  // Clear modal
  modal.textContent = '';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content product-modal-content';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  closeBtn.addEventListener('click', closeProductModal);
  
  const grid = document.createElement('div');
  grid.className = 'product-modal-grid';
  
  // Images section
  const imagesDiv = document.createElement('div');
  imagesDiv.className = 'product-modal-images';
  
  const carousel = document.createElement('div');
  carousel.className = 'image-carousel';
  
  product.images.forEach((img, idx) => {
    const slide = document.createElement('div');
    slide.className = `modal-image-slide ${idx === 0 ? 'active' : ''}`;
    const imgEl = document.createElement('img');
    imgEl.src = sanitizeUrl(img);
    imgEl.alt = `${escapeHtml(product.name)} - Image ${idx + 1}`;
    slide.appendChild(imgEl);
    carousel.appendChild(slide);
  });
  
  imagesDiv.appendChild(carousel);
  
  // Thumbnails (if multiple images)
  if (product.images.length > 1) {
    const thumbnailsDiv = document.createElement('div');
    thumbnailsDiv.className = 'image-thumbnails';
    
    product.images.forEach((img, idx) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = `image-thumbnail ${idx === 0 ? 'active' : ''}`;
      thumbnail.setAttribute('data-index', idx);
      thumbnail.setAttribute('aria-label', `View image ${idx + 1}`);
      thumbnail.setAttribute('role', 'button');
      thumbnail.setAttribute('tabindex', '0');
      
      const thumbImg = document.createElement('img');
      thumbImg.src = sanitizeUrl(img);
      thumbImg.alt = `${escapeHtml(product.name)} - Thumbnail ${idx + 1}`;
      
      thumbnail.appendChild(thumbImg);
      thumbnail.addEventListener('click', () => {
        currentCarouselIndex = idx;
        updateCarousel();
        updateThumbnails();
      });
      thumbnail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          currentCarouselIndex = idx;
          updateCarousel();
          updateThumbnails();
        }
      });
      
      thumbnailsDiv.appendChild(thumbnail);
    });
    
    imagesDiv.appendChild(thumbnailsDiv);
  }
  
  // Carousel controls
  if (product.images.length > 1) {
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-btn prev';
    prevBtn.setAttribute('aria-label', 'Previous image');
    prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
    prevBtn.addEventListener('click', carouselPrev);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-btn next';
    nextBtn.setAttribute('aria-label', 'Next image');
    nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    nextBtn.addEventListener('click', carouselNext);
    
    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    imagesDiv.appendChild(controls);
  }
  
  // Details section
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'product-modal-details';
  
  const heading = document.createElement('h2');
  heading.textContent = product.name;
  
  const price = document.createElement('p');
  price.className = 'product-price-large';
  price.textContent = `${product.price.toLocaleString()} ${CONFIG.CURRENCY}`;
  
  const description = document.createElement('p');
  description.className = 'product-description-full';
  description.textContent = product.description;
  
  detailsDiv.appendChild(heading);
  detailsDiv.appendChild(price);
  detailsDiv.appendChild(description);
  
  if (product.inventory !== null) {
    const inventory = document.createElement('p');
    inventory.className = 'inventory-info';
    inventory.textContent = `In stock: ${product.inventory}`;
    detailsDiv.appendChild(inventory);
  }
  
  // Form
  const form = document.createElement('form');
  form.id = 'product-modal-form';
  form.addEventListener('submit', (e) => handleModalAddToCart(e, product.id));
  
  // Size selector
  if (product.sizes && product.sizes.length > 0) {
    const sizeSelector = document.createElement('div');
    sizeSelector.className = 'size-selector';
    
    const sizeLabel = document.createElement('label');
    sizeLabel.setAttribute('for', 'modal-size');
    sizeLabel.textContent = 'Size ';
    const requiredSpan = document.createElement('span');
    requiredSpan.className = 'required';
    requiredSpan.textContent = '*';
    sizeLabel.appendChild(requiredSpan);
    
    const sizeSelect = document.createElement('select');
    sizeSelect.id = 'modal-size';
    sizeSelect.required = true;
    sizeSelect.setAttribute('aria-required', 'true');
    sizeSelect.setAttribute('aria-invalid', 'false');
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select size';
    sizeSelect.appendChild(defaultOption);
    
    product.sizes.forEach(size => {
      const option = document.createElement('option');
      option.value = escapeHtml(size);
      option.textContent = size;
      sizeSelect.appendChild(option);
    });
    
    // Clear error on change
    sizeSelect.addEventListener('change', () => {
      sizeSelect.removeAttribute("aria-invalid");
      sizeSelect.classList.remove("error");
      const errorMsg = sizeSelect.parentElement.querySelector(".error-message");
      if (errorMsg) {
        errorMsg.classList.remove("show");
      }
    });
    
    const errorMsg = document.createElement('span');
    errorMsg.className = 'error-message';
    errorMsg.setAttribute('role', 'alert');
    
    sizeSelector.appendChild(sizeLabel);
    sizeSelector.appendChild(sizeSelect);
    sizeSelector.appendChild(errorMsg);
    form.appendChild(sizeSelector);
  }
  
  // Quantity selector
  const qtySelector = document.createElement('div');
  qtySelector.className = 'quantity-selector';
  
  const qtyLabel = document.createElement('label');
  qtyLabel.setAttribute('for', 'modal-quantity');
  qtyLabel.textContent = 'Quantity';
  
  const qtyControls = document.createElement('div');
  qtyControls.className = 'qty-controls';
  
  const decBtn = document.createElement('button');
  decBtn.type = 'button';
  decBtn.className = 'qty-btn';
  decBtn.textContent = '-';
  decBtn.addEventListener('click', decrementModalQty);
  
  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.id = 'modal-quantity';
  qtyInput.value = '1';
  qtyInput.min = '1';
  if (product.inventory) {
    qtyInput.max = product.inventory.toString();
  }
  qtyInput.required = true;
  
  const incBtn = document.createElement('button');
  incBtn.type = 'button';
  incBtn.className = 'qty-btn';
  incBtn.textContent = '+';
  incBtn.addEventListener('click', incrementModalQty);
  
  qtyControls.appendChild(decBtn);
  qtyControls.appendChild(qtyInput);
  qtyControls.appendChild(incBtn);
  
  qtySelector.appendChild(qtyLabel);
  qtySelector.appendChild(qtyControls);
  form.appendChild(qtySelector);
  
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-large';
  submitBtn.textContent = 'Add to Cart';
  form.appendChild(submitBtn);
  
  // Buy Now button
  const buyNowBtn = document.createElement('button');
  buyNowBtn.type = 'button';
  buyNowBtn.className = 'btn btn-secondary btn-large';
  buyNowBtn.textContent = 'Buy Now';
  buyNowBtn.style.marginTop = 'var(--spacing-sm)';
  buyNowBtn.style.width = '100%';
  buyNowBtn.addEventListener('click', () => handleBuyNow(product.id));
  form.appendChild(buyNowBtn);
  
  detailsDiv.appendChild(form);
  
  grid.appendChild(imagesDiv);
  grid.appendChild(detailsDiv);
  
  modalContent.appendChild(closeBtn);
  modalContent.appendChild(grid);
  modal.appendChild(modalContent);
  
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  
  // Set aria-labelledby
  modal.setAttribute("aria-labelledby", "product-modal-title");
  heading.id = "product-modal-title";
  
  // Reset carousel
  currentCarouselIndex = 0;
}

let currentCarouselIndex = 0;

function carouselPrev() {
  const slides = document.querySelectorAll(".modal-image-slide");
  if (slides.length === 0) return;
  currentCarouselIndex = (currentCarouselIndex - 1 + slides.length) % slides.length;
  updateCarousel();
  // Focus management for accessibility
  const activeThumbnail = document.querySelector(`.image-thumbnail[data-index="${currentCarouselIndex}"]`);
  if (activeThumbnail) {
    activeThumbnail.focus();
  }
}

function carouselNext() {
  const slides = document.querySelectorAll(".modal-image-slide");
  if (slides.length === 0) return;
  currentCarouselIndex = (currentCarouselIndex + 1) % slides.length;
  updateCarousel();
  // Focus management for accessibility
  const activeThumbnail = document.querySelector(`.image-thumbnail[data-index="${currentCarouselIndex}"]`);
  if (activeThumbnail) {
    activeThumbnail.focus();
  }
}

function updateCarousel() {
  const slides = document.querySelectorAll(".modal-image-slide");
  slides.forEach((slide, idx) => {
    slide.classList.toggle("active", idx === currentCarouselIndex);
  });
  updateThumbnails();
}

function updateThumbnails() {
  const thumbnails = document.querySelectorAll(".image-thumbnail");
  thumbnails.forEach((thumb, idx) => {
    thumb.classList.toggle("active", idx === currentCarouselIndex);
  });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function openProductModal(productId) {
  renderProductModal(productId);
  const modal = document.getElementById("product-modal");
  if (modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    
    // Focus trap: focus first focusable element
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

function quickAddToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  
  if (product.sizes && product.sizes.length > 0) {
    openProductModal(productId);
    return;
  }
  
  if (addItem(productId, null, 1)) {
    showNotification("Added to cart!");
  } else {
    showNotification("Failed to add item", true);
  }
}

function handleModalAddToCart(event, productId) {
  event.preventDefault();
  const sizeSelect = document.getElementById("modal-size");
  const qtyInput = document.getElementById("modal-quantity");
  
  const size = sizeSelect ? sizeSelect.value : null;
  const qty = parseInt(qtyInput.value) || 1;
  
  if (sizeSelect && !size) {
    sizeSelect.focus();
    sizeSelect.setAttribute("aria-invalid", "true");
    sizeSelect.classList.add("error");
    // Show inline error message
    const errorMsg = sizeSelect.parentElement.querySelector(".error-message");
    if (errorMsg) {
      errorMsg.textContent = "Please select a size";
      errorMsg.classList.add("show");
    } else {
      const errorDiv = document.createElement("span");
      errorDiv.className = "error-message show";
      errorDiv.textContent = "Please select a size";
      sizeSelect.parentElement.appendChild(errorDiv);
    }
    showNotification("Please select a size", true);
    return;
  }
  
  // Clear any size errors
  if (sizeSelect) {
    sizeSelect.removeAttribute("aria-invalid");
    sizeSelect.classList.remove("error");
    const errorMsg = sizeSelect.parentElement.querySelector(".error-message");
    if (errorMsg) {
      errorMsg.classList.remove("show");
    }
  }
  
  if (addItem(productId, size, qty)) {
    showNotification("Added to cart!");
    closeProductModal();
  } else {
    showNotification("Failed to add item", true);
  }
}

function handleBuyNow(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  
  const sizeSelect = document.getElementById("modal-size");
  const qtyInput = document.getElementById("modal-quantity");
  
  const size = sizeSelect ? sizeSelect.value : null;
  const qty = parseInt(qtyInput.value) || 1;
  
  // Validate size if required
  if (product.sizes && product.sizes.length > 0 && !size) {
    if (sizeSelect) {
      sizeSelect.focus();
      sizeSelect.setAttribute("aria-invalid", "true");
      sizeSelect.classList.add("error");
      const errorMsg = sizeSelect.parentElement.querySelector(".error-message");
      if (errorMsg) {
        errorMsg.textContent = "Please select a size";
        errorMsg.classList.add("show");
      } else {
        const errorDiv = document.createElement("span");
        errorDiv.className = "error-message show";
        errorDiv.textContent = "Please select a size";
        sizeSelect.parentElement.appendChild(errorDiv);
      }
    }
    showNotification("Please select a size", true);
    return;
  }
  
  // Add to cart
  if (addItem(productId, size, qty)) {
    closeProductModal();
    openCart();
  } else {
    showNotification("Failed to add item", true);
  }
}

function incrementModalQty() {
  const input = document.getElementById("modal-quantity");
  if (input) {
    const max = input.max ? parseInt(input.max) : Infinity;
    const current = parseInt(input.value) || 1;
    input.value = Math.min(current + 1, max);
  }
}

function decrementModalQty() {
  const input = document.getElementById("modal-quantity");
  if (input) {
    const current = parseInt(input.value) || 1;
    input.value = Math.max(current - 1, 1);
  }
}

function openCart() {
  const cartModal = document.getElementById("cart-modal");
  const cartButton = document.getElementById("cart-button");
  if (cartModal) {
    cartModal.classList.add("active");
    cartModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (cartButton) cartButton.setAttribute("aria-expanded", "true");
    
    // Focus trap: focus first focusable element
    const firstFocusable = cartModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }
}

function closeCart() {
  const cartModal = document.getElementById("cart-modal");
  const cartButton = document.getElementById("cart-button");
  if (cartModal) {
    cartModal.classList.remove("active");
    cartModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (cartButton) cartButton.setAttribute("aria-expanded", "false");
  }
}

// Wrapper functions for event handlers - kept for backward compatibility with HTML
function updateCartQty(itemKey, newQty) {
  updateQty(itemKey, newQty);
}

function removeCartItem(itemKey) {
  removeItem(itemKey);
}

// Helper function to show inline error message
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  if (field) {
    field.setAttribute("aria-invalid", "true");
    field.classList.add("error");
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.setAttribute("role", "alert");
    errorEl.style.display = "block";
  }
}

// Helper function to clear inline error message
function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  if (field) {
    field.removeAttribute("aria-invalid");
    field.classList.remove("error");
  }
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.removeAttribute("role");
    errorEl.style.display = "none";
  }
}

// Clear all field errors
function clearAllFieldErrors() {
  clearFieldError("checkout-firstname", "error-firstname");
  clearFieldError("checkout-lastname", "error-lastname");
  clearFieldError("checkout-email", "error-email");
  clearFieldError("checkout-phone", "error-phone");
  clearFieldError("checkout-wilaya", "error-wilaya");
  clearFieldError("checkout-address", "error-address");
}

function handleCheckoutSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // Clear all previous errors
  clearAllFieldErrors();
  
  // Disable submit
  submitBtn.disabled = true;
  submitBtn.textContent = CONFIG.LOADING_TEXT;
  
  // Validate and sanitize form inputs
  const firstName = validateInput(form.querySelector("#checkout-firstname").value.trim(), 100);
  const lastName = validateInput(form.querySelector("#checkout-lastname").value.trim(), 100);
  const email = validateInput(form.querySelector("#checkout-email").value.trim(), 255);
  const phone = validateInput(form.querySelector("#checkout-phone").value.trim(), 20);
  const wilaya = validateInput(form.querySelector("#checkout-wilaya").value, 200);
  
  let hasErrors = false;
  
  // First Name validation (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{1,100}$/;
  if (!firstName) {
    showFieldError("checkout-firstname", "error-firstname", "First name is required");
    hasErrors = true;
  } else if (!nameRegex.test(firstName)) {
    showFieldError("checkout-firstname", "error-firstname", "Please enter a valid first name (letters only)");
    hasErrors = true;
  }
  
  // Last Name validation
  if (!lastName) {
    showFieldError("checkout-lastname", "error-lastname", "Last name is required");
    hasErrors = true;
  } else if (!nameRegex.test(lastName)) {
    showFieldError("checkout-lastname", "error-lastname", "Please enter a valid last name (letters only)");
    hasErrors = true;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    showFieldError("checkout-email", "error-email", "Email is required");
    hasErrors = true;
  } else if (!emailRegex.test(email)) {
    showFieldError("checkout-email", "error-email", "Please enter a valid email address");
    hasErrors = true;
  }
  
  // Phone validation (Algerian format: +213XXXXXXXXX or 0XXXXXXXXX)
  const phoneRegex = /^(\+213|0)[5-7][0-9]{8}$/;
  if (!phone) {
    showFieldError("checkout-phone", "error-phone", "Phone number is required");
    hasErrors = true;
  } else if (!phoneRegex.test(phone)) {
    showFieldError("checkout-phone", "error-phone", "Please enter a valid Algerian phone number (+213XXXXXXXXX or 0XXXXXXXXX)");
    hasErrors = true;
  }
  
  // Wilaya validation
  if (!wilaya) {
    showFieldError("checkout-wilaya", "error-wilaya", "Please select a wilaya");
    hasErrors = true;
  }
  
  if (hasErrors) {
    // Focus first error field
    const firstErrorField = form.querySelector("[aria-invalid='true']");
    if (firstErrorField) {
      firstErrorField.focus();
    }
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
    return;
  }
  
  const address = validateInput(form.querySelector("#checkout-address").value.trim(), 500);
  const notes = validateInput(form.querySelector("#checkout-notes").value.trim(), 1000);
  
  // Address validation
  if (!address) {
    showFieldError("checkout-address", "error-address", "Address is required");
    hasErrors = true;
  } else if (address.length < 10) {
    showFieldError("checkout-address", "error-address", "Please provide a more detailed address");
    hasErrors = true;
  }
  
  if (hasErrors) {
    // Focus first error field
    const firstErrorField = form.querySelector("[aria-invalid='true']");
    if (firstErrorField) {
      firstErrorField.focus();
    }
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
    return;
  }
  
  const customerData = { firstName, lastName, email, phone, wilaya, address, notes };
  
  submitOrder(customerData)
    .then(result => {
      showOrderSuccess(result.orderId, result.payload);
      clearCart();
      form.reset();
      clearAllFieldErrors();
      closeCart();
    })
    .catch(error => {
      console.error("Order submission error:", error);
      const errorMessage = error.message || CONFIG.ERROR_MESSAGE;
      showNotification(`Error: ${errorMessage}. Please try again or contact support.`, true);
      
      // Log failed order for debugging
      const failedOrders = JSON.parse(localStorage.getItem("store_failed_orders") || "[]");
      console.log("Failed orders in queue:", failedOrders.length);
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order";
    });
}

function showOrderSuccess(orderId, payload) {
  const modal = document.getElementById("success-modal");
  if (!modal) return;
  
  const itemCount = payload.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Clear modal
  modal.textContent = '';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content success-modal-content';
  
  const heading = document.createElement('h2');
  heading.textContent = CONFIG.SUCCESS_MESSAGE;
  
  const orderIdP = document.createElement('p');
  orderIdP.textContent = 'Order ID: ';
  const orderIdStrong = document.createElement('strong');
  orderIdStrong.textContent = orderId;
  orderIdP.appendChild(orderIdStrong);
  
  const totalP = document.createElement('p');
  totalP.textContent = 'Total: ';
  const totalStrong = document.createElement('strong');
  totalStrong.textContent = `${payload.total.toLocaleString()} ${CONFIG.CURRENCY}`;
  totalP.appendChild(totalStrong);
  
  const itemsP = document.createElement('p');
  itemsP.textContent = 'Items: ';
  const itemsStrong = document.createElement('strong');
  itemsStrong.textContent = itemCount.toString();
  itemsP.appendChild(itemsStrong);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-primary';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeSuccessModal);
  
  modalContent.appendChild(heading);
  modalContent.appendChild(orderIdP);
  modalContent.appendChild(totalP);
  modalContent.appendChild(itemsP);
  modalContent.appendChild(closeBtn);
  
  modal.appendChild(modalContent);
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  modal.setAttribute("aria-labelledby", "success-modal-title");
  heading.id = "success-modal-title";
  document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
  const modal = document.getElementById("success-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

function showNotification(message, isError = false) {
  // Remove existing notifications
  const existing = document.querySelectorAll(".notification");
  existing.forEach(n => n.remove());
  
  const notification = document.createElement("div");
  notification.className = `notification ${isError ? "error" : "success"}`;
  notification.setAttribute("role", "alert");
  notification.setAttribute("aria-live", isError ? "assertive" : "polite");
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Trigger reflow for animation
  requestAnimationFrame(() => {
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);
  });
  
  // Auto-dismiss after delay (longer for errors)
  const delay = isError ? 5000 : 3000;
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, delay);
}

// ============================================================================
// SEARCH & FILTER HANDLERS
// ============================================================================
function getCurrentFilterState() {
  return {
    search: document.getElementById("search-input")?.value?.trim() || "",
    tag: document.getElementById("filter-tag")?.value || "",
    size: document.getElementById("filter-size")?.value || "",
    priceMin: document.getElementById("filter-price-min")?.value || "",
    priceMax: document.getElementById("filter-price-max")?.value || ""
  };
}

function updateAppliedFilters() {
  const container = document.getElementById("applied-filters");
  if (!container) return;
  const state = getCurrentFilterState();
  const hasSearch = state.search.length > 0;
  const hasTag = state.tag.length > 0;
  const hasSize = state.size.length > 0;
  const hasPrice = (state.priceMin !== "" || state.priceMax !== "");
  const activeCount = [hasSearch, hasTag, hasSize, hasPrice].filter(Boolean).length;
  if (activeCount === 0) {
    container.textContent = "";
    return;
  }
  container.textContent = "";
  if (hasSearch) {
    const chip = document.createElement("span");
    chip.className = "applied-filter-chip";
    chip.textContent = "Search: \u201C" + state.search + "\u201D ";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = "&times;";
    btn.setAttribute("aria-label", "Remove search filter");
    btn.addEventListener("click", function() {
      const input = document.getElementById("search-input");
      if (input) { input.value = ""; handleFilterChange(); }
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  }
  if (hasTag) {
    const chip = document.createElement("span");
    chip.className = "applied-filter-chip";
    chip.textContent = "Category: " + state.tag + " ";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = "&times;";
    btn.setAttribute("aria-label", "Remove category filter");
    btn.addEventListener("click", function() {
      const sel = document.getElementById("filter-tag");
      if (sel) { sel.value = ""; handleFilterChange(); }
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  }
  if (hasSize) {
    const chip = document.createElement("span");
    chip.className = "applied-filter-chip";
    chip.textContent = "Size: " + state.size + " ";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = "&times;";
    btn.setAttribute("aria-label", "Remove size filter");
    btn.addEventListener("click", function() {
      const sel = document.getElementById("filter-size");
      if (sel) { sel.value = ""; handleFilterChange(); }
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  }
  if (hasPrice) {
    const label = (state.priceMin && state.priceMax)
      ? state.priceMin + " \u2013 " + state.priceMax + " DZD"
      : state.priceMin ? "Min " + state.priceMin + " DZD" : "Max " + state.priceMax + " DZD";
    const chip = document.createElement("span");
    chip.className = "applied-filter-chip";
    chip.textContent = "Price: " + label + " ";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = "&times;";
    btn.setAttribute("aria-label", "Remove price filter");
    btn.addEventListener("click", function() {
      const min = document.getElementById("filter-price-min");
      const max = document.getElementById("filter-price-max");
      if (min) min.value = ""; if (max) max.value = "";
      handleFilterChange();
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  }
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "applied-filters-clear";
  clearBtn.textContent = "Clear all";
  clearBtn.setAttribute("aria-label", "Clear all filters");
  clearBtn.addEventListener("click", clearAllFilters);
  container.appendChild(clearBtn);
}

function clearAllFilters() {
  const searchInput = document.getElementById("search-input");
  const tagSelect = document.getElementById("filter-tag");
  const sizeSelect = document.getElementById("filter-size");
  const priceMin = document.getElementById("filter-price-min");
  const priceMax = document.getElementById("filter-price-max");
  if (searchInput) searchInput.value = "";
  if (tagSelect) tagSelect.value = "";
  if (sizeSelect) sizeSelect.value = "";
  if (priceMin) priceMin.value = "";
  if (priceMax) priceMax.value = "";
  renderProducts(PRODUCTS);
  updateAppliedFilters();
}

function handleSearch(event) {
  const term = event.target.value;
  const tagFilter = document.getElementById("filter-tag")?.value || "";
  const sizeFilter = document.getElementById("filter-size")?.value || "";
  const priceMin = document.getElementById("filter-price-min")?.value || null;
  const priceMax = document.getElementById("filter-price-max")?.value || null;
  const filtered = filterProducts(term, tagFilter, sizeFilter, priceMin, priceMax);
  renderProducts(filtered);
  updateAppliedFilters();
}

const debouncedSearch = debounceSearch(handleSearch);

function handleFilterChange() {
  const searchTerm = document.getElementById("search-input")?.value || "";
  const tagFilter = document.getElementById("filter-tag")?.value || "";
  const sizeFilter = document.getElementById("filter-size")?.value || "";
  const priceMin = document.getElementById("filter-price-min")?.value || null;
  const priceMax = document.getElementById("filter-price-max")?.value || null;
  const filtered = filterProducts(searchTerm, tagFilter, sizeFilter, priceMin, priceMax);
  renderProducts(filtered);
  updateAppliedFilters();
}

// ============================================================================
// INITIALIZATION
// ============================================================================
async function init() {
  // Apply CONFIG colors to CSS variables (sync with design system)
  document.documentElement.style.setProperty("--primary-color", CONFIG.PRIMARY_COLOR);
  document.documentElement.style.setProperty("--color-accent", CONFIG.ACCENT_COLOR);
  document.documentElement.style.setProperty("--accent-color", CONFIG.ACCENT_COLOR);
  
  // Update store name (header + footer)
  const storeNameEl = document.getElementById("store-name");
  const footerBrandEl = document.getElementById("footer-store-name");
  const footerCopyName = document.getElementById("footer-store-name-copy");
  if (storeNameEl) storeNameEl.textContent = CONFIG.STORE_NAME;
  if (footerBrandEl) footerBrandEl.textContent = CONFIG.STORE_NAME;
  if (footerCopyName) footerCopyName.textContent = CONFIG.STORE_NAME;
  const yearSpan = document.getElementById("footer-year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  
  // Update page title
  document.title = `${CONFIG.STORE_NAME} - Quality Products`;
  
  // Load products from JSON file
  await loadProducts();
  
  // Populate filters and wilaya (after products loaded)
  const tagFilter = document.getElementById("filter-tag");
  if (tagFilter && PRODUCTS.length) {
    const allTags = [...new Set(PRODUCTS.flatMap(p => p.tags))];
    allTags.forEach(tag => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
      tagFilter.appendChild(option);
    });
  }
  const sizeFilter = document.getElementById("filter-size");
  if (sizeFilter && PRODUCTS.length) {
    const allSizes = [...new Set(PRODUCTS.flatMap(p => p.sizes || []))];
    allSizes.sort();
    allSizes.forEach(size => {
      const option = document.createElement("option");
      option.value = size;
      option.textContent = size;
      sizeFilter.appendChild(option);
    });
  }
  const wilayaSelect = document.getElementById("checkout-wilaya");
  if (wilayaSelect && typeof WILAYAS !== "undefined") {
    WILAYAS.forEach(wilaya => {
      const option = document.createElement("option");
      option.value = wilaya;
      option.textContent = wilaya;
      wilayaSelect.appendChild(option);
    });
  }
  
  // Render initial products and applied filters
  renderProducts();
  updateAppliedFilters();
  updateCartUI();
  
  // Handle deep linking
  const urlParams = new URLSearchParams(window.location.search);
  const productParam = urlParams.get("product");
  if (productParam) {
    const product = PRODUCTS.find(p => p.id === productParam || p.sku === productParam);
    if (product) {
      setTimeout(() => openProductModal(product.id), 100);
    }
  }
  
  // Close modals on backdrop click
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      if (e.target.id === "product-modal") closeProductModal();
      if (e.target.id === "cart-modal") closeCart();
      if (e.target.id === "success-modal") closeSuccessModal();
    }
  });
  
  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductModal();
      closeCart();
      closeSuccessModal();
    }
  });
  
  // Clear errors on input for better UX
  const formFields = [
    { field: "checkout-firstname", error: "error-firstname" },
    { field: "checkout-lastname", error: "error-lastname" },
    { field: "checkout-email", error: "error-email" },
    { field: "checkout-phone", error: "error-phone" },
    { field: "checkout-wilaya", error: "error-wilaya" },
    { field: "checkout-address", error: "error-address" }
  ];
  
  formFields.forEach(({ field, error }) => {
    const fieldEl = document.getElementById(field);
    if (fieldEl) {
      const eventType = field === "checkout-wilaya" ? "change" : "input";
      fieldEl.addEventListener(eventType, () => {
        clearFieldError(field, error);
      });
    }
  });
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
