/* =========================================================
   SANDARAN — data
   ========================================================= */
const PRODUCTS = [
  {
    id: "kopasus",
    name: "Kopasus",
    tagline: "Kopi Pakai Susu",
    badge: "Minuman",
    price: 5000,
    img: "assets/kopasus.jpg",
    blurb: "Es kopi susu creamy dengan racikan pelan-pelan, secukupnya manis, cukup untuk bikin bahu turun rileks.",
    desc: "Kopasus adalah kopi susu dingin favorit kami — espresso pilihan bertemu susu segar dan gula aren, disajikan dalam kemasan pouch 250ml. Diseduh pelan agar rasa pahit dan manisnya seimbang, cocok diminum sambil rehat sejenak dari hari yang padat.",
    meta: ["250ml", "Dingin", "Bisa less sugar"]
  },
  {
    id: "lupy",
    name: "Lupy",
    tagline: "Lumpia Crispy",
    badge: "Camilan",
    price: 5000,
    img: "assets/lupy.jpg",
    blurb: "Lumpia gulung renyah, digoreng garing di luar dan gurih manis di dalam. Camilan teman ngobrol santai.",
    desc: "Lupy adalah lumpia crispy gulungan tipis yang digoreng hingga renyah sempurna, isian gurih manis yang pas untuk teman minum Kopasus atau camilan kapan saja. Dikemas rapat agar tetap renyah sampai di tanganmu.",
    meta: ["±10 pcs / pouch", "Renyah", "Tahan 3 hari"]
  }
];

const BUNDLE_PRICE = 8000; // 1x Kopasus + 1x Lupy, lebih murah dari beli terpisah (Rp 10.000)

/* =========================================================
   State
   ========================================================= */
let cart = [];              // {key, id, name, sub, price, qty, img}
let activeProduct = null;
let modalQty = 1;
let bundleQty = 1;

/* =========================================================
   Utilities
   ========================================================= */
const rupiah = (n) => "Rp " + n.toLocaleString("id-ID");
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg){
  const stack = $("#toastStack");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* =========================================================
   Render product grid
   ========================================================= */
function renderProducts(){
  const grid = $("#productGrid");
  grid.innerHTML = PRODUCTS.map(p => `
    <article class="product-card fade-up" data-id="${p.id}" tabindex="0">
      <div class="product-card-media">
        <span class="product-card-badge">${p.badge}</span>
        <img src="${p.img}" alt="${p.name} - ${p.tagline}" loading="lazy">
      </div>
      <h3>${p.name}</h3>
      <p class="tagline">${p.tagline}</p>
      <p class="blurb">${p.blurb}</p>
      <div class="product-card-foot">
        <span class="product-card-price">${rupiah(p.price)}</span>
        <button type="button" class="product-card-cta" data-add="${p.id}" aria-label="Tambah ${p.name} ke keranjang">+</button>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if(e.target.closest("[data-add]")) return; // quick-add handled separately
      openProductModal(card.dataset.id);
    });
    card.addEventListener("keypress", (e) => { if(e.key === "Enter") openProductModal(card.dataset.id); });
  });

  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      quickAdd(btn.dataset.add, btn);
    });
  });

  observeFadeUps();
}

function quickAdd(id, btnEl){
  const p = PRODUCTS.find(x => x.id === id);
  if(!p) return;
  addToCart({
    key: p.id,
    id: p.id,
    name: p.name,
    sub: p.tagline,
    price: p.price,
    img: p.img,
    qty: 1
  });
  showToast(`${p.name} ditambahkan ke keranjang`);
  pulseCart();
  if(btnEl){
    btnEl.classList.add("added");
    setTimeout(() => btnEl.classList.remove("added"), 500);
  }
}

/* =========================================================
   Product modal
   ========================================================= */
function openProductModal(id){
  const p = PRODUCTS.find(x => x.id === id);
  if(!p) return;
  activeProduct = p;
  modalQty = 1;

  $("#modalImg").src = p.img;
  $("#modalImg").alt = p.name;
  $("#modalEyebrow").textContent = p.badge;
  $("#modalTitle").textContent = `${p.name} — ${p.tagline}`;
  $("#modalDesc").textContent = p.desc;
  $("#modalMeta").innerHTML = p.meta.map(m => `<span class="meta-chip">${m}</span>`).join("");
  $("#modalPrice").textContent = rupiah(p.price);
  $("#qtyValue").textContent = modalQty;

  $("#productModalOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeProductModal(){
  $("#productModalOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

$("#productModalClose").addEventListener("click", closeProductModal);
$("#productModalOverlay").addEventListener("click", (e) => {
  if(e.target.id === "productModalOverlay") closeProductModal();
});

$("#qtyMinus").addEventListener("click", () => {
  modalQty = Math.max(1, modalQty - 1);
  $("#qtyValue").textContent = modalQty;
});
$("#qtyPlus").addEventListener("click", () => {
  modalQty = Math.min(20, modalQty + 1);
  $("#qtyValue").textContent = modalQty;
});

$("#addToCartBtn").addEventListener("click", () => {
  if(!activeProduct) return;
  addToCart({
    key: activeProduct.id,
    id: activeProduct.id,
    name: activeProduct.name,
    sub: activeProduct.tagline,
    price: activeProduct.price,
    img: activeProduct.img,
    qty: modalQty
  });
  showToast(`${activeProduct.name} ditambahkan ke keranjang`);
  closeProductModal();
  pulseCart();
});

/* =========================================================
   Bundle modal — paket tetap: 1x Kopasus + 1x Lupy
   ========================================================= */
function renderBundlePicker(){
  const wrap = $("#bundlePicker");
  wrap.innerHTML = PRODUCTS.map(p => `
    <div class="bundle-pick-row">
      <img src="${p.img}" alt="${p.name}">
      <div class="bundle-pick-info">
        <strong>${p.name}</strong>
        <span>${p.tagline}</span>
      </div>
      <span class="meta-chip">1x</span>
    </div>
  `).join("");
}

function openBundleModal(){
  bundleQty = 1;
  renderBundlePicker();
  $("#bundleQtyValue").textContent = bundleQty;
  $("#bundleModalPrice").textContent = rupiah(BUNDLE_PRICE * bundleQty);
  $("#bundleModalOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeBundleModal(){
  $("#bundleModalOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

$("#openBundle").addEventListener("click", openBundleModal);
$("#bundleModalClose").addEventListener("click", closeBundleModal);
$("#bundleModalOverlay").addEventListener("click", (e) => {
  if(e.target.id === "bundleModalOverlay") closeBundleModal();
});

$("#bundleQtyMinus").addEventListener("click", () => {
  bundleQty = Math.max(1, bundleQty - 1);
  $("#bundleQtyValue").textContent = bundleQty;
  $("#bundleModalPrice").textContent = rupiah(BUNDLE_PRICE * bundleQty);
});
$("#bundleQtyPlus").addEventListener("click", () => {
  bundleQty = Math.min(20, bundleQty + 1);
  $("#bundleQtyValue").textContent = bundleQty;
  $("#bundleModalPrice").textContent = rupiah(BUNDLE_PRICE * bundleQty);
});

$("#addBundleBtn").addEventListener("click", () => {
  addToCart({
    key: "bundle",
    id: "bundle",
    name: "Paket Sandaran",
    sub: "1x Kopasus + 1x Lupy",
    price: BUNDLE_PRICE,
    img: "assets/banner.jpg",
    qty: bundleQty
  });
  showToast("Paket bundling ditambahkan ke keranjang");
  closeBundleModal();
  pulseCart();
});

/* =========================================================
   Cart logic
   ========================================================= */
function addToCart(item){
  const existing = cart.find(c => c.key === item.key);
  if(existing){
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  renderCart();
}

function removeFromCart(key){
  cart = cart.filter(c => c.key !== key);
  renderCart();
}

function changeCartQty(key, delta){
  const item = cart.find(c => c.key === key);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){ removeFromCart(key); return; }
  renderCart();
}

function cartTotal(){
  return cart.reduce((sum, c) => sum + c.price * c.qty, 0);
}
function cartCount(){
  return cart.reduce((sum, c) => sum + c.qty, 0);
}

function renderCart(){
  const itemsWrap = $("#cartItems");
  const foot = $("#cartFoot");

  if(cart.length === 0){
    itemsWrap.innerHTML = `
      <div class="cart-empty" id="cartEmpty">
        <p>🍃</p>
        <p>Keranjangmu masih kosong.<br>Yuk cari sandaranmu di menu.</p>
      </div>`;
    foot.style.display = "none";
  } else {
    foot.style.display = "block";
    itemsWrap.innerHTML = cart.map(c => `
      <div class="cart-item">
        <img src="${c.img}" alt="${c.name}">
        <div class="cart-item-info">
          <strong>${c.name}</strong>
          <span class="sub">${c.sub}</span>
          <div class="cart-item-row">
            <div class="cart-item-qty">
              <button type="button" data-key="${c.key}" data-delta="-1" aria-label="Kurangi">−</button>
              <span>${c.qty}</span>
              <button type="button" data-key="${c.key}" data-delta="1" aria-label="Tambah">+</button>
            </div>
            <span class="cart-item-price">${rupiah(c.price * c.qty)}</span>
          </div>
          <button type="button" class="cart-item-remove" data-key="${c.key}">Hapus</button>
        </div>
      </div>
    `).join("");

    itemsWrap.querySelectorAll(".cart-item-qty button").forEach(btn => {
      btn.addEventListener("click", () => changeCartQty(btn.dataset.key, Number(btn.dataset.delta)));
    });
    itemsWrap.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.key));
    });
  }

  $("#cartTotal").textContent = rupiah(cartTotal());
  $("#cartCount").textContent = cartCount();
  $("#cartCount").classList.toggle("show", cartCount() > 0);
  renderCheckoutSummary();
}

function pulseCart(){
  const trigger = $("#cartToggle");
  if(trigger.animate){
    trigger.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }],
      { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" }
    );
  }
}

/* cart drawer open/close */
function openCart(){
  $("#cartDrawer").classList.add("active");
  $("#cartOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeCart(){
  $("#cartDrawer").classList.remove("active");
  $("#cartOverlay").classList.remove("active");
  document.body.style.overflow = "";
}
$("#cartToggle").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
$("#cartOverlay").addEventListener("click", closeCart);

/* =========================================================
   Checkout view
   ========================================================= */
function renderCheckoutSummary(){
  const wrap = $("#summaryItems");
  wrap.innerHTML = cart.map(c => `
    <div class="summary-item-row">
      <span>${c.name} × ${c.qty}</span>
      <span>${rupiah(c.price * c.qty)}</span>
    </div>
  `).join("") || `<p style="color:var(--forest-soft); font-size:.88rem;">Belum ada produk dipilih.</p>`;

  $("#summarySubtotal").textContent = rupiah(cartTotal());
  $("#summaryTotal").textContent = rupiah(cartTotal());
}

function goToCheckout(){
  if(cart.length === 0){
    showToast("Keranjangmu masih kosong");
    return;
  }
  closeCart();
  renderCheckoutSummary();
  $("#checkoutView").classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeCheckout(){
  $("#checkoutView").classList.remove("active");
  document.body.style.overflow = "";
}

$("#goCheckout").addEventListener("click", goToCheckout);
$("#backToShop").addEventListener("click", closeCheckout);

$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payment = formData.get("payment");

  const orderId = "SND-" + Date.now().toString().slice(-6);
  $("#orderId").textContent = orderId;
  $("#successPayment").textContent = `via ${payment}`;

  closeCheckout();
  $("#successView").classList.add("active");
  document.body.style.overflow = "hidden";

  // reset state for next order
  cart = [];
  renderCart();
  e.target.reset();
});

$("#backToHomeBtn").addEventListener("click", () => {
  $("#successView").classList.remove("active");
  document.body.style.overflow = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* =========================================================
   Scroll reveal for sections
   ========================================================= */
function observeFadeUps(){
  const els = $$(".fade-up:not(.in-view)");
  if(!("IntersectionObserver" in window)){
    els.forEach(el => el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener("keydown", (e) => {
  if(e.key !== "Escape") return;
  closeProductModal();
  closeBundleModal();
  closeCart();
});

$("#year").textContent = new Date().getFullYear();

renderProducts();
renderCart();
observeFadeUps();
$$(".section-head, .bundle-card, .story-inner").forEach(el => el.classList.add("fade-up"));
observeFadeUps();