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
const ORDERS_STORAGE_KEY = "sandaran_orders";

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
  const favorites = loadFavorites();
  grid.innerHTML = PRODUCTS.map(p => `
    <article class="product-card fade-up" data-id="${p.id}" tabindex="0">
      <div class="product-card-media">
        <span class="product-card-badge">${p.badge}</span>
        <button type="button" class="product-fav-btn ${favorites.includes(p.id) ? 'is-fav' : ''}" data-fav="${p.id}" aria-label="Tandai ${p.name} sebagai favorit">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.8 2 4.5 5.4 4c2-.3 3.9.7 5 2.3C11.4 4.7 13.4 3.7 15.4 4c3.4.5 5 3.8 3.4 7.2-2.5 4.7-10 9.3-10 9.3z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        </button>
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
      if(e.target.closest("[data-add]") || e.target.closest("[data-fav]")) return;
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

  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.fav, btn);
    });
  });

  observeFadeUps();
}

/* ---------- Wishlist / favorites ---------- */
const FAVORITES_KEY = "sandaran_favorites";

function loadFavorites(){
  try{
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(err){
    return [];
  }
}

function saveFavorites(list){
  try{ localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); }catch(err){ /* ignore */ }
}

function toggleFavorite(id, btnEl){
  let favorites = loadFavorites();
  const isFav = favorites.includes(id);

  if(isFav){
    favorites = favorites.filter(f => f !== id);
    btnEl.classList.remove("is-fav");
  } else {
    favorites.push(id);
    btnEl.classList.add("is-fav");
    btnEl.classList.remove("pop");
    void btnEl.offsetWidth;
    btnEl.classList.add("pop");
  }
  saveFavorites(favorites);

  const p = PRODUCTS.find(x => x.id === id);
  if(p) showToast(isFav ? `${p.name} dihapus dari favorit` : `${p.name} ditambahkan ke favorit 💚`);
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
const PROMO_CODES = {
  "SANDARAN10": { type: "percent", value: 10 },
  "HEMAT5000": { type: "flat", value: 5000 }
};
let appliedPromo = null;

function calcDiscount(promo, subtotal){
  if(!promo) return 0;
  if(promo.type === "percent") return Math.round(subtotal * promo.value / 100);
  return Math.min(promo.value, subtotal);
}

function renderCheckoutSummary(){
  const wrap = $("#summaryItems");
  wrap.innerHTML = cart.map(c => `
    <div class="summary-item-row">
      <img src="${c.img}" alt="${escapeHtml(c.name)}" class="summary-item-thumb">
      <div class="summary-item-info">
        <strong>${escapeHtml(c.name)}</strong>
        <span>${c.sub ? escapeHtml(c.sub) + " · " : ""}${c.qty}x</span>
      </div>
      <span class="summary-item-price">${rupiah(c.price * c.qty)}</span>
    </div>
  `).join("") || `<p style="color:var(--forest-soft); font-size:.88rem;">Belum ada produk dipilih.</p>`;

  const subtotal = cartTotal();
  const discount = calcDiscount(appliedPromo, subtotal);
  const total = Math.max(0, subtotal - discount);

  $("#summarySubtotal").textContent = rupiah(subtotal);
  $("#summaryTotal").textContent = rupiah(total);

  const discountRow = $("#summaryDiscountRow");
  if(discount > 0 && appliedPromo){
    discountRow.hidden = false;
    $("#summaryDiscount").textContent = "-" + rupiah(discount);
    $("#promoCodeLabel").textContent = appliedPromo.code;
  } else {
    discountRow.hidden = true;
  }
}

function applyPromoCode(){
  const input = $("#promoInput");
  const feedback = $("#promoFeedback");
  const code = input.value.trim().toUpperCase();

  if(!code){
    feedback.hidden = false;
    feedback.className = "promo-feedback error";
    feedback.textContent = "Masukkan kode promo dulu ya";
    return;
  }

  const promo = PROMO_CODES[code];
  if(!promo){
    appliedPromo = null;
    feedback.hidden = false;
    feedback.className = "promo-feedback error";
    feedback.textContent = "Kode promo tidak ditemukan";
    renderCheckoutSummary();
    renderCashQuickChips();
    updateCashCalc();
    return;
  }

  appliedPromo = { code, type: promo.type, value: promo.value };
  feedback.hidden = false;
  feedback.className = "promo-feedback success";
  feedback.textContent = promo.type === "percent"
    ? `Kode ${code} berhasil dipakai! Diskon ${promo.value}% 🎉`
    : `Kode ${code} berhasil dipakai! Diskon ${rupiah(promo.value)} 🎉`;
  renderCheckoutSummary();
  renderCashQuickChips();
  updateCashCalc();
  showToast("Promo berhasil diterapkan");
}

$("#promoApplyBtn").addEventListener("click", applyPromoCode);
$("#promoInput").addEventListener("keydown", (e) => {
  if(e.key === "Enter"){ e.preventDefault(); applyPromoCode(); }
});

function goToCheckout(){
  if(cart.length === 0){
    showToast("Keranjangmu masih kosong");
    return;
  }
  closeCart();
  renderCheckoutSummary();
  renderCashQuickChips();
  updateCashCalc();
  $("#checkoutView").classList.add("active");
  document.body.style.overflow = "hidden";
  hideChatbotWidget();
}
function closeCheckout(){
  $("#checkoutView").classList.remove("active");
  document.body.style.overflow = "";
}

$("#goCheckout").addEventListener("click", goToCheckout);
$("#backToShop").addEventListener("click", () => {
  closeCheckout();
  showChatbotWidget();
});

/* ---------- Cash payment & change calculator ---------- */
function getCheckoutTotal(){
  const subtotal = cartTotal();
  const discount = calcDiscount(appliedPromo, subtotal);
  return Math.max(0, subtotal - discount);
}

function renderCashQuickChips(){
  const wrap = $("#cashQuickChips");
  const total = getCheckoutTotal();
  if(total <= 0){ wrap.innerHTML = ""; return; }

  const roundTo = (val, step) => Math.ceil(val / step) * step;
  const suggestions = new Set([
    roundTo(total, 5000),
    roundTo(total, 10000),
    roundTo(total, 50000),
    roundTo(total, 100000)
  ]);
  const list = [...suggestions].filter(v => v >= total).sort((a, b) => a - b).slice(0, 4);

  wrap.innerHTML = list.map(v => `<button type="button" class="cash-chip" data-amount="${v}">${rupiah(v)}</button>`).join("");
  wrap.querySelectorAll(".cash-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      $("#cashGivenInput").value = btn.dataset.amount;
      updateCashCalc();
    });
  });
}

function updateCashCalc(){
  const total = getCheckoutTotal();
  const input = $("#cashGivenInput");
  const result = $("#cashCalcResult");
  const given = parseInt(input.value, 10);

  if(!input.value || isNaN(given) || given <= 0){
    result.hidden = true;
    return;
  }

  result.hidden = false;
  if(given < total){
    const shortfall = total - given;
    result.className = "cash-calc-result cash-calc-result--short";
    result.innerHTML = `😅 Kurang <strong>${rupiah(shortfall)}</strong> dari total pesanan`;
  } else {
    const change = given - total;
    result.className = "cash-calc-result cash-calc-result--ok";
    result.innerHTML = change > 0
      ? `💵 Kembalian: <strong>${rupiah(change)}</strong>`
      : `👍 Uang pas, tidak ada kembalian`;
  }
}

$("#cashGivenInput").addEventListener("input", updateCashCalc);

const checkoutFormEl = $("#checkoutForm");
let lastCompletedOrder = null;

checkoutFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const subtotal = cartTotal();
  const discount = calcDiscount(appliedPromo, subtotal);
  const total = Math.max(0, subtotal - discount);

  const cashGivenRaw = $("#cashGivenInput").value;
  const cashGiven = cashGivenRaw ? parseInt(cashGivenRaw, 10) : null;

  if(cashGiven !== null && !isNaN(cashGiven) && cashGiven > 0 && cashGiven < total){
    showToast(`Uang tunai kurang ${rupiah(total - cashGiven)} dari total`);
    $("#cashGivenInput").focus();
    return;
  }
  const change = (cashGiven !== null && !isNaN(cashGiven) && cashGiven > 0) ? Math.max(0, cashGiven - total) : null;

  const order = {
    id: "SND-" + Date.now().toString().slice(-6),
    date: new Date().toISOString(),
    payment: "Dikonfirmasi via WhatsApp",
    customer: {
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      note: formData.get("note") || ""
    },
    items: cart.map(c => ({ name: c.name, sub: c.sub, qty: c.qty, price: c.price, img: c.img })),
    subtotal: subtotal,
    discount: discount,
    promoCode: appliedPromo ? appliedPromo.code : null,
    cashGiven: cashGiven,
    change: change,
    total: total
  };

  finalizeOrder(order);
});

/* ---------- Loyalty points ---------- */
const LOYALTY_KEY = "sandaran_loyalty_points";

function loadLoyaltyPoints(){
  try{ return parseInt(localStorage.getItem(LOYALTY_KEY) || "0", 10) || 0; }
  catch(err){ return 0; }
}
function addLoyaltyPoints(pts){
  const next = loadLoyaltyPoints() + pts;
  try{ localStorage.setItem(LOYALTY_KEY, String(next)); }catch(err){ /* ignore */ }
  return next;
}

/* ---------- Confetti burst (pure canvas, no external library) ---------- */
function launchConfetti(){
  try{
    const canvas = $("#confettiCanvas");
    if(!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.add("show");

    const colors = ["#3C4630", "#A85C2E", "#D98C4A", "#F1EAD9", "#6fbf73"];
    const pieces = [];
    for(let i = 0; i < 90; i++){
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height * 0.32,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 1.7) * 13,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 14,
        shape: Math.random() > 0.5 ? "rect" : "circle"
      });
    }

    let frame = 0;
    const maxFrames = 130;

    function tick(){
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.vy += 0.045;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        if(p.shape === "rect"){
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if(frame < maxFrames){
        requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove("show");
      }
    }
    tick();
  } catch(err){
    /* confetti is purely decorative — never let it break checkout */
  }
}

function finalizeOrder(order){
  saveOrder(order);
  $("#orderId").textContent = order.id;
  $("#receiptPrintArea").innerHTML = buildReceiptHTML(order);

  if(order.cashGiven !== null && order.cashGiven !== undefined){
    $("#cashChangeCard").hidden = false;
    $("#cashChangeTotalDisplay").textContent = rupiah(order.total);
    $("#cashChangeGivenDisplay").textContent = rupiah(order.cashGiven);
    $("#cashChangeAmountDisplay").textContent = rupiah(order.change);
  } else {
    $("#cashChangeCard").hidden = true;
  }

  const earned = Math.floor(order.total / 1000);
  const totalPoints = addLoyaltyPoints(earned);
  $("#loyaltyEarned").textContent = `+${earned} Poin`;
  $("#loyaltyTotal").textContent = `Total: ${totalPoints}`;

  $$(".order-timeline-step").forEach((el, i) => {
    el.classList.toggle("is-active", i === 0);
    el.classList.remove("is-done");
  });

  lastCompletedOrder = order;

  closeCheckout();
  $("#successView").classList.add("active");
  document.body.style.overflow = "hidden";
  launchConfetti();

  // reset state for next order
  cart = [];
  appliedPromo = null;
  $("#promoInput").value = "";
  $("#promoFeedback").hidden = true;
  $("#cashGivenInput").value = "";
  $("#cashCalcResult").hidden = true;
  renderCart();
  checkoutFormEl.reset();
}

$("#copyOrderIdBtn").addEventListener("click", async () => {
  const id = $("#orderId").textContent;
  if(!id) return;
  try{
    await navigator.clipboard.writeText(id);
    showToast("Nomor pesanan disalin 📋");
  }catch(err){
    showToast("Tidak bisa menyalin otomatis, salin manual ya");
  }
});

$("#shareWaBtn").addEventListener("click", () => {
  if(!lastCompletedOrder) return;
  const o = lastCompletedOrder;
  const lines = [
    "Halo Sandaran! Ini ringkasan pesanan saya:",
    "",
    `No. Pesanan: ${o.id}`,
    ...o.items.map(it => `• ${it.name} x${it.qty} - ${rupiah(it.price * it.qty)}`),
    "",
    `Total: ${rupiah(o.total)}`
  ];
  if(o.cashGiven !== null && o.cashGiven !== undefined){
    lines.push(
      `Bayar tunai: ${rupiah(o.cashGiven)}`,
      `Kembalian: ${rupiah(o.change)}`
    );
  }
  lines.push("", "Mohon konfirmasi ya, terima kasih!");
  const msg = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener");
});

$("#backToHomeBtn").addEventListener("click", () => {
  $("#successView").classList.remove("active");
  document.body.style.overflow = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  showChatbotWidget();
});

$("#printReceiptBtn").addEventListener("click", () => {
  window.print();
});

/* =========================================================
   Printable receipt (struk)
   ========================================================= */
function buildReceiptHTML(order){
  const itemsHtml = order.items.map(it => `
    <div class="r-item">
      <div class="r-row"><span>${it.name}${it.sub ? " ("+it.sub+")" : ""}</span></div>
      <div class="r-row"><span>${it.qty} x ${rupiah(it.price)}</span><span>${rupiah(it.qty * it.price)}</span></div>
    </div>
  `).join("");

  const discountHtml = order.discount > 0
    ? `<div class="r-row"><span>Diskon ${order.promoCode ? "(" + order.promoCode + ")" : ""}</span><span>-${rupiah(order.discount)}</span></div>`
    : "";

  const cashHtml = (order.cashGiven !== null && order.cashGiven !== undefined)
    ? `
      <div class="r-row"><span>Bayar Tunai</span><span>${rupiah(order.cashGiven)}</span></div>
      <div class="r-row"><span>Kembalian</span><span>${rupiah(order.change)}</span></div>
    `
    : "";

  return `
    <div class="receipt-doc">
      <div class="r-center r-brand">SANDARAN</div>
      <div class="r-center r-tagline">Tempat ternyaman dan tenang di perut</div>
      <div class="r-divider"></div>
      <div class="r-row"><span>No. Pesanan</span><span>${order.id}</span></div>
      <div class="r-row"><span>Tanggal</span><span>${formatOrderDate(order.date)}</span></div>
      <div class="r-row"><span>Pembeli</span><span>${order.customer?.name || "-"}</span></div>
      <div class="r-row"><span>Pembayaran</span><span>${order.payment}</span></div>
      <div class="r-divider"></div>
      ${itemsHtml}
      <div class="r-divider"></div>
      ${order.subtotal ? `<div class="r-row"><span>Subtotal</span><span>${rupiah(order.subtotal)}</span></div>` : ""}
      ${discountHtml}
      <div class="r-row r-total-row"><span>TOTAL</span><span>${rupiah(order.total)}</span></div>
      ${cashHtml}
      <div class="r-divider"></div>
      <div class="r-center r-foot">Terima kasih sudah bersandar sejenak di Sandaran :)</div>
    </div>
  `;
}

/* =========================================================
   Order history
   ========================================================= */
function loadOrders(){
  try{
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(err){
    console.error("Gagal membaca riwayat pesanan", err);
    return [];
  }
}

function saveOrder(order){
  try{
    const orders = loadOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch(err){
    console.error("Gagal menyimpan pesanan", err);
  }
}

function formatOrderDate(iso){
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function renderOrderHistory(){
  const wrap = $("#ordersList");
  const orders = loadOrders();

  if(orders.length === 0){
    wrap.innerHTML = `
      <div class="orders-empty">
        <p>🍃</p>
        <p>Belum ada pesanan.<br>Yuk pesan Kopasus atau Lupy favoritmu dulu.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <strong>${o.id}</strong>
          <span class="order-date">${formatOrderDate(o.date)}</span>
        </div>
        <span class="order-status">Menunggu Konfirmasi</span>
      </div>
      <div class="order-items">
        ${o.items.map(it => `
          <div class="order-item-row">
            <span>${it.name} × ${it.qty}${it.sub ? ` — ${it.sub}` : ""}</span>
            <span>${rupiah(it.price * it.qty)}</span>
          </div>
        `).join("")}
      </div>
      <div class="order-card-foot">
        <span>${o.payment}</span>
        <strong>${rupiah(o.total)}</strong>
      </div>
      <div class="order-card-actions">
        <button type="button" class="btn--text order-reorder-btn" data-order-id="${o.id}">🔁 Pesan Lagi</button>
        <button type="button" class="btn--text order-print-btn" data-order-id="${o.id}">🖨️ Cetak Struk</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".order-print-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const order = orders.find(o => o.id === btn.dataset.orderId);
      if(!order) return;
      $("#receiptPrintArea").innerHTML = buildReceiptHTML(order);
      window.print();
    });
  });

  wrap.querySelectorAll(".order-reorder-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const order = orders.find(o => o.id === btn.dataset.orderId);
      if(!order) return;
      order.items.forEach(it => {
        addToCart({
          key: it.name === "Paket Sandaran" ? "bundle" : (PRODUCTS.find(p => p.name === it.name)?.id || it.name),
          id: it.name === "Paket Sandaran" ? "bundle" : (PRODUCTS.find(p => p.name === it.name)?.id || it.name),
          name: it.name,
          sub: it.sub,
          price: it.price,
          img: it.img || PRODUCTS.find(p => p.name === it.name)?.img || "assets/banner.jpg",
          qty: it.qty
        });
      });
      showToast(`${order.items.length} item dari ${order.id} ditambahkan ke keranjang 🔁`);
      pulseCart();
      closeOrdersView();
      openCart();
    });
  });
}

function openOrdersView(){
  closeCart();
  closeCheckout();
  renderOrderHistory();
  $("#ordersView").classList.add("active");
  document.body.style.overflow = "hidden";
  hideChatbotWidget();
}
function closeOrdersView(){
  $("#ordersView").classList.remove("active");
  document.body.style.overflow = "";
  showChatbotWidget();
}

$("#ordersToggle").addEventListener("click", openOrdersView);
$("#backFromOrders").addEventListener("click", closeOrdersView);
$("#viewOrdersFromSuccess").addEventListener("click", () => {
  $("#successView").classList.remove("active");
  openOrdersView();
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
   Ambient decoration — many small floating coffee cups in the
   hero, generated with randomized position/size/motion for an
   organic "flying" feel. Purely decorative (aria-hidden), and
   physically confined inside .hero (overflow:hidden) so they can
   never visually cover the product list below.
   ========================================================= */
const COFFEE_CUP_SVG = `
  <svg viewBox="0 0 64 64" class="ambient-coffee-svg">
    <ellipse cx="32" cy="53" rx="21" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M13 28h30l-2.6 19a5 5 0 01-5 4.4H20.6a5 5 0 01-5-4.4L13 28z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M43 32a7.5 7.5 0 010 13" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path class="steam steam-1" d="M23 24q-4-5 0-10t0-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path class="steam steam-2" d="M33 24q-4-5 0-10t0-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

function renderAmbientCoffeeField(count){
  const field = $("#ambientCoffeeField");
  if(!field) return;

  const rand = (min, max) => Math.random() * (max - min) + min;
  let html = "";

  for(let i = 0; i < count; i++){
    const size = Math.round(rand(20, 46));
    const cx = rand(2, 94);
    const cy = rand(4, 88);
    const dur = rand(6, 13).toFixed(1);
    const delay = rand(0, 6).toFixed(1);
    const dx = Math.round(rand(-26, 26));
    const dy = Math.round(rand(-30, -12));
    const rotA = Math.round(rand(-10, 10));
    const rotB = Math.round(rand(-10, 10));
    const op = rand(0.08, 0.22).toFixed(2);
    const clayVariant = Math.random() > 0.7 ? "is-clay" : "";

    const style = [
      `--size:${size}px`,
      `--cx:${cx}%`,
      `--cy:${cy}%`,
      `--dur:${dur}s`,
      `--delay:${delay}s`,
      `--dx:${dx}px`,
      `--dy:${dy}px`,
      `--rot-a:${rotA}deg`,
      `--rot-b:${rotB}deg`,
      `--op:${op}`
    ].join(";");

    html += `<div class="ambient-coffee-item ${clayVariant}" style="${style}">${COFFEE_CUP_SVG}</div>`;
  }

  field.innerHTML = html;
}

/* =========================================================
   Chatbot — smart keyword-reply assistant with free text input
   ========================================================= */
const WA_NUMBER = "6283141968179"; // +62 831-4196-8179
const WA_DEFAULT_MSG = "Halo Sandaran! Saya ingin bertanya tentang pesanan.";
const CHAT_HISTORY_KEY = "sandaran_chat_history";
const CHAT_HISTORY_LIMIT = 40;

let chatbotOpened = false;
let chatHistoryCache = [];

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function chatNowLabel(){
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

let chatUnseenCount = 0;

function chatIsNearBottom(threshold = 60){
  const body = $("#chatbotBody");
  return body.scrollHeight - body.scrollTop - body.clientHeight < threshold;
}

function chatUpdateScrollUI(){
  const btn = $("#chatScrollBtn");
  const badge = $("#chatScrollBadge");
  if(!btn || !badge) return;
  btn.classList.toggle("show", !chatIsNearBottom(40));
  if(chatUnseenCount > 0){
    badge.hidden = false;
    badge.textContent = chatUnseenCount > 9 ? "9+" : String(chatUnseenCount);
  } else {
    badge.hidden = true;
  }
}

function chatJumpToBottom(){
  const body = $("#chatbotBody");
  body.scrollTop = body.scrollHeight;
  chatUnseenCount = 0;
  chatUpdateScrollUI();
}

// Kept for backward-compat naming; always forces a jump to the newest message.
function chatScrollToBottom(){
  chatJumpToBottom();
}

function chatAppendRow(row, forceScroll){
  const body = $("#chatbotBody");
  const wasNearBottom = chatIsNearBottom();
  body.appendChild(row);
  if(forceScroll || wasNearBottom){
    chatJumpToBottom();
  } else {
    chatUnseenCount++;
    chatUpdateScrollUI();
  }
}

function chatPersist(role, html){
  chatHistoryCache.push({ role, html, ts: Date.now() });
  if(chatHistoryCache.length > CHAT_HISTORY_LIMIT){
    chatHistoryCache = chatHistoryCache.slice(-CHAT_HISTORY_LIMIT);
  }
  try{ localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistoryCache)); }catch(err){ /* ignore */ }
}

const CHAT_TICK_SVG = `<svg viewBox="0 0 16 16"><path d="M1 8.5l3.5 3.5L10 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function chatAppendMessageEl(role, html, timeLabel, opts){
  opts = opts || {};
  const row = document.createElement("div");
  row.className = `chat-row chat-row--${role}`;

  const ticksHtml = role === "user"
    ? `<span class="chat-ticks${opts.instantRead ? " read" : ""}" data-ticks>${CHAT_TICK_SVG}${CHAT_TICK_SVG}</span>`
    : "";

  row.innerHTML = `
    <div class="chat-msg-group">
      <div class="chat-bubble">${html}</div>
      <span class="chat-timestamp">${timeLabel}${ticksHtml}</span>
    </div>
  `;

  chatAppendRow(row, role === "user" || !!opts.forceScroll);

  if(role === "user" && !opts.instantRead){
    const ticks = row.querySelector("[data-ticks]");
    if(ticks){
      setTimeout(() => ticks.classList.add("read"), 900 + Math.random() * 500);
    }
  }
  return row;
}

function chatAddReactionRow(row){
  const group = row.querySelector(".chat-msg-group");
  if(!group) return;
  const wrap = document.createElement("div");
  wrap.className = "chat-reactions";
  wrap.innerHTML = `
    <button type="button" class="chat-reaction-btn" data-reaction="up" aria-label="Balasan membantu">👍</button>
    <button type="button" class="chat-reaction-btn" data-reaction="down" aria-label="Balasan kurang membantu">👎</button>
  `;
  group.appendChild(wrap);

  wrap.querySelectorAll("[data-reaction]").forEach(btn => {
    btn.addEventListener("click", () => {
      if(wrap.classList.contains("reacted")) return;
      wrap.classList.add("reacted");
      btn.classList.add("active", "pop");
      if(btn.dataset.reaction === "up"){
        showToast("Makasih atas masukannya! 💚");
      } else {
        showToast("Maaf kurang membantu — coba chat admin lewat WhatsApp ya 🙏");
      }
    });
  });
}

function chatAddBot(html){
  const row = chatAppendMessageEl("bot", html, chatNowLabel());
  chatAddReactionRow(row);
  chatPersist("bot", html);
  playChatSound("receive");
}

function chatAddUser(html){
  chatAppendMessageEl("user", html, chatNowLabel());
  chatPersist("user", html);
  playChatSound("send");
}

function chatShowTyping(){
  const body = $("#chatbotBody");
  const row = document.createElement("div");
  row.className = "chat-row chat-row--bot chat-typing-row";
  row.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
  chatAppendRow(row, false);
  return row;
}

function chatRemoveTyping(row){
  row.remove();
}

function chatProductCard(p){
  if(!p) return "";
  return `
    <div class="chat-product-card">
      <img src="${p.img}" alt="${escapeHtml(p.name)}">
      <div class="chat-product-card-info">
        <strong>${escapeHtml(p.name)}</strong>
        <span>${rupiah(p.price)}</span>
      </div>
      <button type="button" class="chat-product-add-btn" data-chat-add="${p.id}" aria-label="Tambah ${escapeHtml(p.name)} ke keranjang">+</button>
    </div>
  `;
}

function chatAddOptionsBlock(){
  const body = $("#chatbotBody");
  const wrap = document.createElement("div");
  wrap.className = "chat-options";
  wrap.innerHTML = CHAT_INTENTS.filter(o => o.showAsOption).map(o => `
    <button type="button" class="chat-option-btn ${o.key === 'wa' ? 'chat-option-btn--wa' : ''}" data-chat-option="${o.key}">
      <span class="emoji">${o.emoji}</span> ${o.label}
    </button>
  `).join("");
  chatAppendRow(wrap, false);
}

let chatActionSeq = 0;
function chatAddActionButton(emoji, label, onClick){
  const id = `chatAction${++chatActionSeq}`;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chat-action-btn";
  btn.id = id;
  btn.innerHTML = `<span class="emoji">${emoji}</span> ${label}`;
  btn.addEventListener("click", onClick);
  chatAppendRow(btn, false);
  return btn;
}

/* ---------- Notification sound (tiny synthesized tone, no audio file needed) ---------- */
const CHAT_SOUND_KEY = "sandaran_chat_sound";
let chatSoundOn = true;
try{ chatSoundOn = localStorage.getItem(CHAT_SOUND_KEY) !== "off"; }catch(err){ /* ignore */ }

function playChatSound(type){
  if(!chatSoundOn) return;
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = type === "send" ? 720 : 540;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
    osc.onended = () => ctx.close().catch(() => {});
  } catch(err){
    /* audio is a nice-to-have; never let it break the chat */
  }
}

/* ---------- Intent definitions (rule-based, no server needed) ---------- */
const CHAT_INTENTS = [
  { key: "menu",    emoji: "🛒", label: "Lihat Menu & Harga",      showAsOption: true },
  { key: "howto",   emoji: "📦", label: "Cara Pesan",              showAsOption: true },
  { key: "orders",  emoji: "🧾", label: "Riwayat Pesanan Saya",    showAsOption: true },
  { key: "wa",      emoji: "💬", label: "Chat via WhatsApp",       showAsOption: true },
  { key: "payment", emoji: "💳", label: "Metode Pembayaran",       showAsOption: false },
  { key: "delivery",emoji: "🛵", label: "Info Pengiriman",         showAsOption: false },
  { key: "location",emoji: "📍", label: "Lokasi Toko",             showAsOption: false },
  { key: "hours",   emoji: "🕒", label: "Jam Operasional",         showAsOption: false },
  { key: "promo",   emoji: "🎁", label: "Kode Promo",              showAsOption: false },
  { key: "poin",    emoji: "✨", label: "Poin Loyalitas",          showAsOption: false },
  { key: "thanks",  emoji: "🙏", label: "Terima Kasih",            showAsOption: false },
  { key: "greeting",emoji: "👋", label: "Halo",                    showAsOption: false }
];

const CHAT_CHIPS = [
  { key: "menu",    label: "🛒 Menu & Harga" },
  { key: "promo",   label: "🎁 Kode Promo" },
  { key: "howto",   label: "📦 Cara Pesan" },
  { key: "wa",      label: "💬 Chat Admin" }
];

function chatHasWord(text, ...words){
  return words.some(w => new RegExp(`\\b${w}\\b`, "i").test(text));
}

function chatDetectIntent(rawText){
  const t = rawText.toLowerCase();
  if(chatHasWord(t,"terima","kasih","makasih","thanks","thank")) return "thanks";
  if(chatHasWord(t,"riwayat","history") || (chatHasWord(t,"pesanan") && chatHasWord(t,"saya"))) return "orders";
  if(chatHasWord(t,"whatsapp","wa","admin","cs","hubungi","kontak","min")) return "wa";
  if(chatHasWord(t,"promo","diskon","voucher","kupon","kode")) return "promo";
  if(chatHasWord(t,"poin","point","loyalitas","reward")) return "poin";
  if(chatHasWord(t,"transfer","cod","bayar","pembayaran","payment")) return "payment";
  if(chatHasWord(t,"ongkir","antar","kirim","delivery","pengiriman","diantar")) return "delivery";
  if(chatHasWord(t,"alamat","lokasi","dimana","toko")) return "location";
  if(chatHasWord(t,"jam","buka","tutup","operasional")) return "hours";
  if(chatHasWord(t,"cara","gimana","bagaimana","caranya","checkout","order")) return "howto";
  if(chatHasWord(t,"harga","menu","kopasus","lupy","bundling","paket","produk","berapa")) return "menu";
  if(chatHasWord(t,"halo","hai","hi","hey","pagi","siang","sore","malam")) return "greeting";
  return "fallback";
}

function chatHandleIntent(intent){
  const typingRow = chatShowTyping();
  const delay = 550 + Math.random() * 450;

  setTimeout(() => {
    chatRemoveTyping(typingRow);

    switch(intent){
      case "greeting":
        chatAddBot("Halo juga! 👋 Ada yang bisa dibantu seputar menu, cara pesan, atau pembayaran?");
        break;

      case "menu": {
        const kopasus = PRODUCTS.find(p => p.id === "kopasus");
        const lupy = PRODUCTS.find(p => p.id === "lupy");
        chatAddBot(
          `Ini menu andalan kami hari ini:` +
          chatProductCard(kopasus) +
          chatProductCard(lupy) +
          `<p style="margin:.6rem 0 0;">Atau coba <strong>Paket Sandaran</strong> (1 Kopasus + 1 Lupy) — <strong>Rp 8.000</strong>, hemat Rp 2.000!</p>`
        );
        chatAddActionButton("🛍️", "Buka Paket Bundling", () => {
          closeChatbot();
          openBundleModal();
        });
        break;
      }

      case "howto":
        chatAddBot(`
          Cara pesan gampang banget:
          <ul>
            <li>1️⃣ Pilih produk, tekan "+" atau buka detailnya</li>
            <li>2️⃣ Atur jumlah, masukkan ke keranjang</li>
            <li>3️⃣ Buka keranjang, tekan "Lanjut ke Pembayaran"</li>
            <li>4️⃣ Isi nama, WhatsApp & alamat, lalu tekan "Buat Pesanan"</li>
            <li>5️⃣ Admin akan menghubungimu via WhatsApp untuk atur pembayaran 🎉</li>
          </ul>
        `);
        break;

      case "payment":
        chatAddBot(`
          Gampang! Setelah kamu buat pesanan, admin Sandaran akan menghubungimu lewat
          <strong>WhatsApp</strong> untuk konfirmasi pesanan sekaligus atur pembayarannya
          (transfer, tunai, atau cara lain yang paling nyaman buatmu). Tidak perlu pilih
          metode di awal 😊
        `);
        break;

      case "delivery":
        chatAddBot("Untuk detail ongkir &amp; area pengiriman, admin kami akan konfirmasi langsung setelah kamu checkout. Kalau mau tanya dulu, chat admin lewat WhatsApp ya 😊");
        break;

      case "location":
        chatAddBot("Untuk alamat toko lengkap, langsung tanya admin kami lewat WhatsApp ya, biar dikirimkan detail &amp; titik lokasinya 📍");
        break;

      case "hours":
        chatAddBot("Jam operasional bisa berbeda tiap hari — biar pasti, konfirmasi langsung ke admin lewat WhatsApp ya 🙏");
        break;

      case "promo":
        chatAddBot(`
          Ada kode promo yang bisa dipakai saat checkout, lho! 🎁
          <ul>
            <li><strong>SANDARAN10</strong> — diskon 10% dari total belanja</li>
            <li><strong>HEMAT5000</strong> — potongan langsung Rp 5.000</li>
          </ul>
          Masukkan kodenya di kolom "Punya kode promo?" pada halaman pembayaran ya.
        `);
        break;

      case "poin": {
        const points = loadLoyaltyPoints();
        chatAddBot(`
          Setiap Rp 1.000 belanja = <strong>1 Poin Sandaran</strong> ✨ otomatis terkumpul tiap
          selesai checkout, bisa dilihat di halaman "Terima kasih" setelah pesan.
          <br><br>Poin kamu saat ini: <strong>${points} poin</strong> 🌿
        `);
        break;
      }

      case "thanks":
        chatAddBot("Sama-sama! 🌿 Senang bisa bantu. Kalau butuh apa-apa lagi, aku ada di sini kapan saja.");
        break;

      case "orders":
        chatAddBot("Oke, aku bukakan halaman riwayat pesananmu ya 🧾");
        setTimeout(() => { closeChatbot(); openOrdersView(); }, 900);
        break;

      case "wa":
        chatAddBot("Menghubungkanmu ke WhatsApp admin Sandaran, tunggu sebentar ya 👋");
        setTimeout(() => {
          const msg = encodeURIComponent(WA_DEFAULT_MSG);
          window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener");
        }, 700);
        break;

      default:
        chatAddBot(`Hmm, aku belum terlalu paham maksudnya 🙏 Coba tanya soal <strong>menu</strong>, <strong>cara pesan</strong>, atau <strong>pembayaran</strong> — atau langsung chat admin kami lewat WhatsApp.`);
    }
  }, delay);
}

/* ---------- Event delegation: one listener handles every dynamic button ---------- */
$("#chatbotBody").addEventListener("click", (e) => {
  const optBtn = e.target.closest("[data-chat-option]");
  if(optBtn){
    chatAddUser(escapeHtml(optBtn.textContent.trim()));
    chatHandleIntent(optBtn.dataset.chatOption);
    return;
  }
  const addBtn = e.target.closest("[data-chat-add]");
  if(addBtn){
    quickAdd(addBtn.dataset.chatAdd, addBtn);
    return;
  }
});

$("#chatbotChips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-chat-option]");
  if(!chip) return;
  chatAddUser(escapeHtml(chip.textContent.trim()));
  chatHandleIntent(chip.dataset.chatOption);
});

function chatRenderChips(){
  $("#chatbotChips").innerHTML = CHAT_CHIPS.map(c => `
    <button type="button" class="chatbot-chip" data-chat-option="${c.key}">${c.label}</button>
  `).join("");
}

/* ---------- Free text input ---------- */
const chatbotInputEl = $("#chatbotInput");
const chatbotSendBtnEl = $("#chatbotSendBtn");
const chatbotCharCounterEl = $("#chatbotCharCounter");
const CHAT_INPUT_MAXLEN = 300;
const CHAT_INPUT_WARN_AT = 260;

chatbotInputEl.addEventListener("input", () => {
  const len = chatbotInputEl.value.length;
  chatbotSendBtnEl.disabled = chatbotInputEl.value.trim() === "";

  if(len >= CHAT_INPUT_WARN_AT){
    chatbotCharCounterEl.hidden = false;
    chatbotCharCounterEl.textContent = `${len}/${CHAT_INPUT_MAXLEN}`;
    chatbotCharCounterEl.classList.toggle("warn", len >= CHAT_INPUT_MAXLEN - 10);
  } else {
    chatbotCharCounterEl.hidden = true;
  }
});

$("#chatbotForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatbotInputEl.value.trim();
  if(!text) return;
  chatAddUser(escapeHtml(text));
  chatbotInputEl.value = "";
  chatbotSendBtnEl.disabled = true;
  chatbotCharCounterEl.hidden = true;
  chatHandleIntent(chatDetectIntent(text));
  chatbotInputEl.focus();
});

/* ---------- Scroll-to-bottom floating button ---------- */
$("#chatbotBody").addEventListener("scroll", () => {
  if(chatIsNearBottom(40)) chatUnseenCount = 0;
  chatUpdateScrollUI();
});
$("#chatScrollBtn").addEventListener("click", () => {
  chatJumpToBottom();
  chatbotInputEl.focus();
});

/* ---------- Sound toggle ---------- */
function chatUpdateSoundBtn(){
  const btn = $("#chatbotSoundToggle");
  btn.classList.toggle("muted", !chatSoundOn);
  btn.setAttribute("aria-pressed", String(chatSoundOn));
}
chatUpdateSoundBtn();

$("#chatbotSoundToggle").addEventListener("click", () => {
  chatSoundOn = !chatSoundOn;
  try{ localStorage.setItem(CHAT_SOUND_KEY, chatSoundOn ? "on" : "off"); }catch(err){ /* ignore */ }
  chatUpdateSoundBtn();
  if(chatSoundOn) playChatSound("send");
});

/* ---------- Voice input (Web Speech API — only shown if the browser supports it) ---------- */
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const chatbotMicBtn = $("#chatbotMicBtn");
let chatRecognition = null;
let chatIsRecording = false;

if(SpeechRecognitionAPI){
  chatbotMicBtn.hidden = false;
  chatRecognition = new SpeechRecognitionAPI();
  chatRecognition.lang = "id-ID";
  chatRecognition.interimResults = false;
  chatRecognition.maxAlternatives = 1;

  chatRecognition.addEventListener("result", (e) => {
    const transcript = e.results?.[0]?.[0]?.transcript || "";
    if(transcript){
      chatbotInputEl.value = transcript;
      chatbotSendBtnEl.disabled = transcript.trim() === "";
      chatbotInputEl.focus();
    }
  });
  chatRecognition.addEventListener("end", () => {
    chatIsRecording = false;
    chatbotMicBtn.classList.remove("recording");
  });
  chatRecognition.addEventListener("error", () => {
    chatIsRecording = false;
    chatbotMicBtn.classList.remove("recording");
    showToast("Tidak bisa mengakses mikrofon");
  });

  chatbotMicBtn.addEventListener("click", () => {
    if(chatIsRecording){
      chatRecognition.stop();
      return;
    }
    try{
      chatRecognition.start();
      chatIsRecording = true;
      chatbotMicBtn.classList.add("recording");
    }catch(err){
      /* recognition may throw if called too rapidly in succession — safe to ignore */
    }
  });
}

/* ---------- Reset conversation ---------- */
$("#chatbotReset").addEventListener("click", () => {
  chatHistoryCache = [];
  try{ localStorage.removeItem(CHAT_HISTORY_KEY); }catch(err){ /* ignore */ }
  $("#chatbotBody").innerHTML = "";
  chatUnseenCount = 0;
  chatUpdateScrollUI();
  chatbotOpened = false;
  chatBootstrapConversation();
});

/* ---------- History restore / bootstrap ---------- */
function chatLoadHistory(){
  try{
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(err){
    return [];
  }
}

function chatBootstrapConversation(){
  const history = chatLoadHistory();

  if(history.length > 0){
    chatbotOpened = true;
    chatHistoryCache = history;
    history.forEach(m => {
      const row = chatAppendMessageEl(
        m.role, m.html,
        new Date(m.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        { instantRead: true }
      );
      if(m.role === "bot") chatAddReactionRow(row);
    });
    chatJumpToBottom();
    return;
  }

  chatbotOpened = true;
  const typingRow = chatShowTyping();
  setTimeout(() => {
    chatRemoveTyping(typingRow);
    chatAddBot("Halo! 👋 Selamat datang di Sandaran. Ada yang bisa kami bantu hari ini?");
    chatAddOptionsBlock();
  }, 650);
}

/* ---------- Open / close / suppress ---------- */
function openChatbot(){
  $("#chatbot").classList.add("open");
  $("#chatbot").classList.remove("has-badge");
  if(!chatbotOpened){
    chatBootstrapConversation();
  } else {
    chatJumpToBottom();
  }
  setTimeout(() => chatbotInputEl.focus(), 350);
}

function closeChatbot(){
  $("#chatbot").classList.remove("open");
  if(chatIsRecording && chatRecognition){
    chatRecognition.stop();
  }
}

function toggleChatbot(){
  if($("#chatbot").classList.contains("open")){
    closeChatbot();
  } else {
    openChatbot();
  }
}

function hideChatbotWidget(){
  closeChatbot();
  $("#chatbot").classList.add("chatbot--suppressed");
}
function showChatbotWidget(){
  $("#chatbot").classList.remove("chatbot--suppressed");
}

$("#chatbotFab").addEventListener("click", toggleChatbot);
$("#chatbotClose").addEventListener("click", closeChatbot);
chatRenderChips();

/* =========================================================
   Init
   ========================================================= */
document.addEventListener("keydown", (e) => {
  if(e.key !== "Escape") return;
  closeProductModal();
  closeBundleModal();
  closeCart();
  closeCheckout();
  closeOrdersView();
  closeChatbot();
  $("#iosInstallOverlay").classList.remove("active");
});

$("#year").textContent = new Date().getFullYear();

/* =========================================================
   Dark mode
   ========================================================= */
const THEME_KEY = "sandaran_theme";

function applyTheme(theme){
  if(theme === "dark"){
    document.documentElement.setAttribute("data-theme", "dark");
    $("#darkModeToggle").title = "Mode terang";
  } else {
    document.documentElement.removeAttribute("data-theme");
    $("#darkModeToggle").title = "Mode gelap";
  }
}

function initTheme(){
  let saved = null;
  try{ saved = localStorage.getItem(THEME_KEY); }catch(err){ /* ignore */ }
  if(saved){
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}
initTheme();

/* =========================================================
   Back-to-top button
   ========================================================= */
const backToTopBtn = $("#backToTopBtn");
window.addEventListener("scroll", () => {
  backToTopBtn.classList.toggle("show", window.scrollY > 480);
}, { passive: true });
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* =========================================================
   FAQ accordion
   ========================================================= */
$$(".faq-question").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const wasOpen = item.classList.contains("open");
    $$(".faq-item.open").forEach(el => el.classList.remove("open"));
    if(!wasOpen) item.classList.add("open");
  });
});

$("#darkModeToggle").addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  try{ localStorage.setItem(THEME_KEY, next); }catch(err){ /* ignore */ }
  showToast(next === "dark" ? "Mode gelap aktif 🌙" : "Mode terang aktif ☀️");
});

renderProducts();
renderCart();
observeFadeUps();
$$(".section-head, .bundle-card, .story-inner").forEach(el => el.classList.add("fade-up"));
observeFadeUps();
renderAmbientCoffeeField(14);

// Give the chat bubble a subtle "new message" badge shortly after page load
setTimeout(() => {
  if(!chatbotOpened) $("#chatbot").classList.add("has-badge");
}, 4000);

/* =========================================================
   PWA: install prompt + service worker
   ========================================================= */
let deferredInstallPrompt = null;
const installBtn = $("#installBtn");

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

if(!isStandalone()){
  if(isIOS()){
    // iOS Safari has no beforeinstallprompt — show button, open instructions on tap
    installBtn.hidden = false;
    installBtn.addEventListener("click", () => {
      $("#iosInstallOverlay").classList.add("active");
      document.body.style.overflow = "hidden";
    });
  } else {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      installBtn.hidden = false;
    });
    installBtn.addEventListener("click", async () => {
      if(!deferredInstallPrompt) return;
      installBtn.hidden = true;
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if(choice.outcome === "accepted"){
        showToast("Sandaran sedang dipasang ke perangkatmu");
      }
      deferredInstallPrompt = null;
    });
  }
}

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
  showToast("Sandaran berhasil dipasang. Cek layar utamamu!");
});

$("#iosInstallClose").addEventListener("click", () => {
  $("#iosInstallOverlay").classList.remove("active");
  document.body.style.overflow = "";
});
$("#iosInstallOverlay").addEventListener("click", (e) => {
  if(e.target.id === "iosInstallOverlay"){
    $("#iosInstallOverlay").classList.remove("active");
    document.body.style.overflow = "";
  }
});

if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("Gagal mendaftarkan service worker", err);
    });
  });
}
