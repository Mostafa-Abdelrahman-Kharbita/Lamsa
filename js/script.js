import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "lamsa-18d05.firebaseapp.com",
  projectId: "lamsa-18d05",
  storageBucket: "lamsa-18d05.firebasestorage.app",
  messagingSenderId: "586887849221",
  appId: "1:5868...",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let firebaseProducts = [];
//////////////////
let cart = [],
  customProducts = [];
let orders = [];
const ADMIN_USER = "admin",
  ADMIN_PASS = "luminos2024";
let isLoggedIn = false;

// =============================================
// FIX 1: loadProductsFromFirebase now returns
// the populated array so .then() callers
// are guaranteed fresh data.
// =============================================
async function loadProductsFromFirebase() {
  const snapshot = await getDocs(collection(db, "Product"));

  firebaseProducts = [];

  snapshot.forEach((docSnap) => {
    firebaseProducts.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });

  renderCatalog(firebaseProducts);

  // FIX: return the array so callers can chain .then(products => ...)
  return firebaseProducts;
}

function showPage(name) {
  if (name === "admin") {
    if (!isLoggedIn) {
      showPage("admin-login");
      return;
    }
  }

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");

  document
    .querySelectorAll(".nav-links a")
    .forEach((a) => a.classList.remove("active-link"));

  const el = document.getElementById("nav-" + name);
  if (el) el.classList.add("active-link");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "catalog") {
    loadProductsFromFirebase();
  }

  if (name === "order") {
    loadProductsFromFirebase().then(() => {
      populateProductDropdown();
    });
  }

  // =============================================
  // FIX 2: Wait for Firebase data to fully load
  // before calling renderAdmin(), so
  // firebaseProducts is populated when
  // renderAdminProductList() reads it.
  // =============================================
  if (name === "admin") {
    renderAdmin();
  }

  if (name === "home") {
    renderHomeFeatured();
  }
}

function doLogin() {
  const u = document.getElementById("admin-user").value.trim();
  const p = document.getElementById("admin-pass").value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    isLoggedIn = true;
    document.getElementById("login-error").textContent = "";
    document.getElementById("admin-user").value = "";
    document.getElementById("admin-pass").value = "";
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById("page-admin").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // =============================================
    // FIX 3: doLogin also needs to wait for
    // Firebase before calling renderAdmin(),
    // same pattern as showPage("admin").
    // =============================================
    renderAdmin();
  } else {
    document.getElementById("login-error").textContent =
      "اسم المستخدم أو كلمة المرور غير صحيحة";
  }
}

function doLogout() {
  isLoggedIn = false;
  showPage("home");
  showNotif("✦", "تم تسجيل الخروج", "وداعاً! تم تسجيل خروجك بأمان.");
}

function getAllProducts() {
  return [...firebaseProducts, ...customProducts];
}

function productHTML(p) {
  const images =
    p.images && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const colors = p.colors && p.colors.length ? p.colors : [];

  return `<div class="product-card">
    ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ""}
    <div class="product-img" style="position:relative;overflow:hidden;cursor:pointer" onclick="openProductGallery('${p.id}')">
      ${
        images.length
          ? `<img id="pimg-${p.id}" src="${images[0]}" style="width:100%;height:100%;object-fit:cover;transition:opacity 0.3s"/>`
          : `<span>${p.emoji || "💡"}</span><div class="glow-dot"></div>`
      }
      ${images.length > 1 ? `<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:var(--gold,#c9a84c);font-size:11px;padding:3px 8px;letter-spacing:1px">+${images.length} صور</div>` : ""}
    </div>
    <div class="product-info">
      <div class="product-cat">${catLabel(p.cat)}</div>
      <div class="product-name">${p.name}</div>
      ${
        colors.length
          ? `
      <div style="margin-top:10px">
        <div style="font-size:10px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">اللون:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center" id="colors-${p.id}">
          ${colors
            .map(
              (col, i) => `
            <button onclick="selectColor('${p.id}',${i},this,'${col.name}')" title="${col.name}"
              style="width:24px;height:24px;border-radius:50%;background:${col.hex};border:${i === 0 ? "2px solid var(--gold,#c9a84c)" : "2px solid rgba(255,255,255,0.15)"};cursor:pointer;transition:border 0.2s;outline:none">
            </button>`,
            )
            .join("")}
        </div>
        <div id="color-label-${p.id}" style="font-size:11px;color:var(--gold,#c9a84c);margin-top:5px">${colors[0]?.name || ""}</div>
      </div>`
          : ""
      }
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
        ${p.oldPrice ? `<div class="product-old">${fmtP(p.oldPrice)}</div>` : ""}
        <div class="product-price">${fmtP(p.price)}</div>
      </div>
      <button class="add-btn-card" onclick="addToCart('${p.id}')">+ أضف للطلب</button>
    </div>
  </div>`;
}
function openProductGallery(id) {
  const p = getAllProducts().find((x) => x.id === id);
  if (!p) return;
  const images =
    p.images && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
  if (!images.length) return;

  const old = document.getElementById("product-gallery-modal");
  if (old) old.remove();

  let current = 0;

  const modal = document.createElement("div");
  modal.id = "product-gallery-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px
  `;

  modal.innerHTML = `
    <button onclick="document.getElementById('product-gallery-modal').remove()" 
      style="position:absolute;top:20px;left:20px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#fff;width:40px;height:40px;font-size:18px;cursor:pointer">✕</button>
    
    <div style="font-size:13px;color:var(--gold,#c9a84c);margin-bottom:16px;letter-spacing:2px">${p.name}</div>
    
    <div style="position:relative;width:100%;max-width:600px;display:flex;align-items:center;justify-content:center">
      ${
        images.length > 1
          ? `
        <button id="gallery-prev" onclick="galleryNav(-1)" style="position:absolute;right:-20px;z-index:1;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#c9a84c);width:40px;height:40px;font-size:20px;cursor:pointer">‹</button>
        <button id="gallery-next" onclick="galleryNav(1)" style="position:absolute;left:-20px;z-index:1;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#c9a84c);width:40px;height:40px;font-size:20px;cursor:pointer">›</button>
      `
          : ""
      }
      <img id="gallery-main-img" src="${images[0]}" style="max-height:60vh;max-width:100%;object-fit:contain;transition:opacity 0.2s"/>
    </div>

    ${
      images.length > 1
        ? `
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;justify-content:center" id="gallery-thumbs">
      ${images
        .map(
          (url, i) => `
        <img src="${url}" onclick="galleryGoTo(${i})" 
          style="width:60px;height:60px;object-fit:cover;cursor:pointer;border:2px solid ${i === 0 ? "var(--gold,#c9a84c)" : "rgba(255,255,255,0.15)"};opacity:${i === 0 ? 1 : 0.6};transition:all 0.2s"
          id="gallery-thumb-${i}"/>
      `,
        )
        .join("")}
    </div>`
        : ""
    }

    <div id="gallery-counter" style="margin-top:12px;font-size:12px;color:var(--gray,#888)">${images.length > 1 ? `1 / ${images.length}` : ""}</div>
  `;

  // Store images on window for nav functions
  window._galleryImages = images;
  window._galleryCurrent = 0;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
}

function galleryNav(dir) {
  const images = window._galleryImages || [];
  window._galleryCurrent =
    (window._galleryCurrent + dir + images.length) % images.length;
  galleryGoTo(window._galleryCurrent);
}

function galleryGoTo(idx) {
  const images = window._galleryImages || [];
  window._galleryCurrent = idx;
  const mainImg = document.getElementById("gallery-main-img");
  if (mainImg) {
    mainImg.style.opacity = "0";
    setTimeout(() => {
      mainImg.src = images[idx];
      mainImg.style.opacity = "1";
    }, 150);
  }
  const counter = document.getElementById("gallery-counter");
  if (counter) counter.textContent = `${idx + 1} / ${images.length}`;
  // Update thumbs
  images.forEach((_, i) => {
    const thumb = document.getElementById("gallery-thumb-" + i);
    if (thumb) {
      thumb.style.border =
        i === idx
          ? "2px solid var(--gold,#c9a84c)"
          : "2px solid rgba(255,255,255,0.15)";
      thumb.style.opacity = i === idx ? "1" : "0.6";
    }
  });
}
function switchProductImg(id, url, btn) {
  const img = document.getElementById("pimg-" + id);
  if (img) img.src = url;
  // update dots
  const dots = btn.parentElement.querySelectorAll("button");
  dots.forEach((d) => (d.style.background = "rgba(255,255,255,0.4)"));
  btn.style.background = "var(--gold,#c9a84c)";
}

// Track selected color per product
const selectedColors = {};

function selectColor(productId, idx, btn, colorName) {
  const container = document.getElementById("colors-" + productId);
  if (container) {
    container.querySelectorAll("button").forEach((b) => b.style.border = "2px solid rgba(255,255,255,0.15)");
  }
  btn.style.border = "2px solid var(--gold,#c9a84c)";
  const label = document.getElementById("color-label-" + productId);
  if (label) label.textContent = colorName;
  // Store selected color
  selectedColors[productId] = colorName;
}
function catLabel(c) {
  return (
    {
      Magnetic_Track: "Magnetic Track",
      Spot_light: "Spot light",
      DoubleSpot_light: "Double Spot light",
      Metal_Connector: "Metal Connector",
    }[c] || c
  );
}

function fmtP(n) {
  return Number(n).toLocaleString("ar-EG") + " جنيه";
}

async function renderHomeFeatured() {
  const el = document.getElementById("home-products-grid");
  if (!el) return;

  const snapshot = await getDocs(collection(db, "Product"));
  const products = [];

  snapshot.forEach((docSnap) => {
    products.push({ id: docSnap.id, ...docSnap.data() });
  });

  el.innerHTML = products.slice(0, 6).map(productHTML).join("");
}

function renderCatalog(prods) {
  const el = document.getElementById("catalog-products-grid");
  if (!el) return;
  el.innerHTML = prods.length
    ? prods.map(productHTML).join("")
    : `<div style="color:var(--gray);padding:60px;text-align:center;grid-column:1/-1;font-size:18px;font-style:italic">لا توجد منتجات في هذه الفئة بعد.</div>`;
}

function filterProducts(cat, btn) {
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const all = getAllProducts();
  renderCatalog(cat === "all" ? all : all.filter((p) => p.cat === cat));
}

// =============================================
// FIX 4: addToCart now always matches by
// Firebase doc id (string), fixing the
// previous mixed number/string id lookup.
// =============================================

function addToCart(id) {
  const all = getAllProducts();
  let p = all.find((x) => x.id === id || x.id === String(id));
  if (!p) {
    loadProductsFromFirebase().then(() => {
      const p2 = getAllProducts().find((x) => x.id === id || x.id === String(id));
      if (!p2) return;
      const color = selectedColors[id] || (p2.colors && p2.colors[0] ? p2.colors[0].name : null);
      const cartId = id + (color ? "-" + color : "");
      const ex = cart.find((c) => c.cartId === cartId);
      if (ex) ex.qty++;
      else cart.push({ ...p2, qty: 1, color, cartId });
      updateCartUI();
      showNotif("✦", "أُضيف للطلب", p2.name + (color ? ` (${color})` : "") + " أُضيف إلى طلبك");
    });
    return;
  }
  const color = selectedColors[id] || (p.colors && p.colors[0] ? p.colors[0].name : null);
  const cartId = id + (color ? "-" + color : "");
  const ex = cart.find((c) => c.cartId === cartId);
  if (ex) ex.qty++;
  else cart.push({ ...p, qty: 1, color, cartId });
  updateCartUI();
  showNotif("✦", "أُضيف للطلب", p.name + (color ? ` (${color})` : "") + " أُضيف إلى طلبك");
}

function updateCartUI() {
  const el = document.getElementById("cart-items");
  const tot = document.getElementById("order-total");
  if (!el) return;
  if (!cart.length) {
    el.innerHTML =
      '<div class="cart-empty">سلتك فارغة.<br>أضف منتجات من الكتالوج.</div>';
    if (tot) tot.style.display = "none";
    return;
  }
  el.innerHTML = cart
    .map(
      (c, i) => `
    <div class="cart-item">
      <div class="cart-img">${c.imageUrl ? `<img src="${c.imageUrl}"/>` : c.emoji || "💡"}</div>
      <div>
        <div class="cart-name">${c.name}${c.color ? `<span style="font-size:11px;color:var(--gold,#c9a84c);margin-right:6px">(${c.color})</span>` : ""}</div>
        <div class="cart-qty">الكمية: <input type="number" value="${c.qty}" min="1" onchange="updateQty(${i},this.value)" style="width:48px;padding:2px 4px;background:var(--dark3);border:1px solid rgba(255,255,255,0.1);color:var(--white);font-size:12px"/> <span onclick="removeFromCart(${i})" style="cursor:pointer;color:var(--gray);margin-right:8px;font-size:12px">✕ حذف</span></div>
      </div>
      <div class="cart-price">${fmtP(c.price * c.qty)}</div>
    </div>`,
    )
    .join("");
  const sub = cart.reduce((a, c) => a + c.price * c.qty, 0);
  document.getElementById("subtotal-val").textContent = fmtP(sub);
  document.getElementById("total-val").textContent = fmtP(sub);
  if (tot) tot.style.display = "block";
}

function updateQty(i, val) {
  cart[i].qty = Math.max(1, parseInt(val) || 1);
  updateCartUI();
}

function removeFromCart(i) {
  cart.splice(i, 1);
  updateCartUI();
}

function populateProductDropdown() {
  const sel = document.getElementById("quick-product");
  if (!sel) return;
  const all = getAllProducts();
  if (!all.length) {
    // retry after load
    loadProductsFromFirebase().then(() => {
      sel.innerHTML =
        '<option value="">اختر منتجاً للإضافة...</option>' +
        getAllProducts()
          .map(
            (p) =>
              `<option value="${p.name}">${p.name} — ${fmtP(p.price)}</option>`,
          )
          .join("");
    });
    return;
  }
  sel.innerHTML =
    '<option value="">اختر منتجاً للإضافة...</option>' +
    all
      .map(
        (p) =>
          `<option value="${p.name}">${p.name} — ${fmtP(p.price)}</option>`,
      )
      .join("");
}
async function submitOrder() {
  const fname = document.getElementById("fname")?.value.trim() || "";
  const lname = document.getElementById("lname")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";
  const phone = document.getElementById("phone")?.value.trim() || "";
  const address = document.getElementById("address")?.value.trim() || "";
  const desc = document.getElementById("description")?.value.trim() || "";

  if (!fname || !email) {
    showNotif("⚠", "معلومات ناقصة", "من فضلك أدخل اسمك وبريدك الإلكتروني.");
    return;
  }

  if (!cart.length) {
    showNotif("⚠", "السلة فارغة", "من فضلك أضف منتجاً واحداً على الأقل.");
    return;
  }

  const totalValue = cart.reduce((a, c) => a + c.price * c.qty, 0);

  const orderData = {
    client: (fname + " " + lname).trim(),
    email,
    phone: phone || "غير محدد",
    address: address || "غير محدد",
    product: cart
      .map((c) => c.name + (c.qty > 1 ? ` × ${c.qty}` : ""))
      .join(", "),
    value: totalValue,
    valueFormatted: fmtP(totalValue),
    items: cart.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
    })),
    status: "new",
    date: new Date().toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    createdAt: serverTimestamp(),
    desc,
  };

  // Show loading state on button
  const btn = document.querySelector(".submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "جارٍ الإرسال...";
  }

  try {
    const docRef = await addDoc(collection(db, "Orders"), orderData);
    console.log("✅ Order saved to Firebase:", docRef.id);

    // Add to local orders array immediately
    orders.unshift({
      id: "#LM-" + docRef.id.slice(0, 6).toUpperCase(),
      firestoreId: docRef.id,
      client: orderData.client,
      product: orderData.product,
      value: orderData.valueFormatted,
      status: "new",
      date: orderData.date,
      email: orderData.email,
      phone: orderData.phone,
      desc: orderData.desc,
    });

    // Clear cart and form
    cart = [];
    updateCartUI();
    ["fname", "lname", "email", "phone", "address", "description"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      },
    );

    // Show success
    document.getElementById("success-overlay").classList.add("show");
    showNotif("✦", "تم الإرسال!", "طلبك وصلنا وسنتواصل معك قريباً.");
  } catch (error) {
    console.error("❌ Firebase error:", error);
    showNotif("⚠", "خطأ", "فشل إرسال الطلب: " + error.message);
  } finally {
    // Restore button
    if (btn) {
      btn.disabled = false;
      btn.textContent = "✦ إرسال طلب الاستفسار";
    }
  }
}
const STATUS_MAP = {
  new: "badge-new",
  proc: "badge-proc",
  done: "badge-done",
  cancel: "badge-cancel",
};
const STATUS_LABEL = {
  new: "جديد",
  proc: "قيد المعالجة",
  done: "مكتمل",
  cancel: "ملغى",
};

function showAdminSection(name, btn) {
  document
    .querySelectorAll(".admin-section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("section-" + name).classList.add("active");
  document
    .querySelectorAll(".sidebar-link")
    .forEach((l) => l.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

async function renderAdmin() {
  // Show loading indicator
  const main = document.querySelector(".admin-main");
  if (main) main.style.opacity = "0.5";

  await loadProductsFromFirebase();
  await loadOrdersFromFirebase();

  if (main) main.style.opacity = "1";

  renderDashboardOrders();
  renderFullOrders();
  renderAdminProductList(firebaseProducts);

  document.getElementById("admin-prod-count").textContent =
    getAllProducts().length;
  document.getElementById("admin-msg-count").textContent = orders.filter(
    (o) => o.status === "new",
  ).length;
  document.getElementById("prod-list-count").textContent =
    getAllProducts().length;

  // Update total orders count card
  const totalCard = document.querySelector(".admin-card .admin-card-val");
  if (totalCard) totalCard.textContent = orders.length;
}

function renderDashboardOrders() {
  const tbody = document.getElementById("dashboard-orders-body");
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:30px">لا توجد طلبات بعد</td></tr>`;
    return;
  }
  tbody.innerHTML = orders
    .slice(0, 10)
    .map(
      (o) => `<tr>
    <td style="color:var(--gold);font-weight:500">${o.id}</td>
    <td>${o.client}</td>
    <td style="color:var(--gray);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.product}</td>
    <td>${o.value}</td>
    <td><span class="badge ${STATUS_MAP[o.status]}">${STATUS_LABEL[o.status]}</span></td>
    <td style="color:var(--gray)">${o.date}</td>
    </tr>`,
    )
    .join("");
}

function renderFullOrders() {
  const tbody = document.getElementById("full-orders-body");
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px">لا توجد طلبات بعد</td></tr>`;
    return;
  }
  tbody.innerHTML = orders
    .map(
      (o, i) => `<tr>
    <td style="color:var(--gold)">${o.id}</td>
    <td>${o.client}</td>
    <td style="color:var(--gray);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.product}</td>
    <td>${o.value}</td>
    <td>
      <select onchange="updateOrderStatus(${i},this.value)" style="background:var(--dark3);border:1px solid rgba(255,255,255,0.1);color:var(--white);padding:4px 8px;font-family:'Tajawal',sans-serif;font-size:13px;cursor:pointer">
        ${["new", "proc", "done", "cancel"].map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
      </select>
    </td>
    <td style="color:var(--gray)">${o.date}</td>
    <td><button onclick="viewDetail(${i})" style="background:transparent;border:1px solid rgba(201,168,76,0.3);color:var(--gold);padding:4px 12px;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:12px">عرض</button></td>
  </tr>`,
    )
    .join("");
}

async function updateOrderStatus(i, status) {
  orders[i].status = status;
  // update in Firebase if it has a firestoreId
  if (orders[i].firestoreId) {
    try {
      await updateDoc(doc(db, "Orders", orders[i].firestoreId), { status });
    } catch (e) {
      console.error("فشل تحديث الحالة:", e);
    }
  }
  renderDashboardOrders();
  renderFullOrders();
  renderMessages();
  document.getElementById("admin-msg-count").textContent = orders.filter(
    (o) => o.status === "new",
  ).length;
  showNotif(
    "✦",
    "تم التحديث",
    `${orders[i].id} تم تحديثه إلى: ${STATUS_LABEL[status]}`,
  );
}

function viewDetail(i) {
  const o = orders[i];

  const old = document.getElementById("order-detail-modal");
  if (old) old.remove();

  const statusColors = {
    new: "#c9a84c",
    proc: "#3b82f6",
    done: "#22c55e",
    cancel: "#ef4444",
  };

  const modal = document.createElement("div");
  modal.id = "order-detail-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
    overflow-y:auto
  `;
  modal.innerHTML = `
    <div style="background:#111;border:1px solid rgba(201,168,76,0.25);width:100%;max-width:560px;margin:auto;position:relative;direction:rtl;font-family:'Tajawal',sans-serif;overflow:hidden">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1500,#0a0a0a);padding:28px 32px;border-bottom:1px solid rgba(201,168,76,0.15);display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:11px;letter-spacing:3px;color:var(--gold,#c9a84c);margin-bottom:8px">تفاصيل الطلب</div>
          <div style="font-size:24px;color:#fff;font-weight:300">${o.id}</div>
          <div style="margin-top:10px">
            <span style="background:${statusColors[o.status]}22;color:${statusColors[o.status]};border:1px solid ${statusColors[o.status]}44;padding:4px 14px;font-size:12px;letter-spacing:1px">
              ${STATUS_LABEL[o.status]}
            </span>
          </div>
        </div>
        <button onclick="document.getElementById('order-detail-modal').remove()" 
          style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#888;width:36px;height:36px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;display:flex;flex-direction:column;gap:20px">

        <!-- Client Info -->
        <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);padding:20px">
          <div style="font-size:10px;letter-spacing:3px;color:var(--gold,#c9a84c);margin-bottom:16px">معلومات العميل</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div>
              <div style="font-size:10px;color:#666;margin-bottom:4px;letter-spacing:1px">الاسم</div>
              <div style="font-size:15px;color:#fff">${o.client}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#666;margin-bottom:4px;letter-spacing:1px">التاريخ</div>
              <div style="font-size:15px;color:#fff">${o.date}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#666;margin-bottom:4px;letter-spacing:1px">البريد الإلكتروني</div>
              <div style="font-size:14px;color:var(--gold,#c9a84c)">${o.email}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#666;margin-bottom:4px;letter-spacing:1px">الهاتف</div>
              <div style="font-size:14px;color:#fff">${o.phone || "غير محدد"}</div>
            </div>
          </div>
        </div>

        <!-- Order Info -->
        <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);padding:20px">
          <div style="font-size:10px;letter-spacing:3px;color:var(--gold,#c9a84c);margin-bottom:16px">تفاصيل الطلب</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px;letter-spacing:1px">المنتجات</div>
          <div style="font-size:14px;color:#e0e0e0;line-height:1.8;margin-bottom:16px;padding:12px;background:#111;border-right:2px solid var(--gold,#c9a84c)">${o.product}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:12px;color:#666;letter-spacing:1px">القيمة الإجمالية</span>
            <span style="font-size:22px;color:var(--gold,#c9a84c);font-weight:500">${o.value}</span>
          </div>
        </div>

        <!-- Notes -->
        ${
          o.desc
            ? `
        <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);padding:20px">
          <div style="font-size:10px;letter-spacing:3px;color:var(--gold,#c9a84c);margin-bottom:12px">ملاحظات</div>
          <div style="font-size:13px;color:#aaa;line-height:1.8">${o.desc}</div>
        </div>`
            : ""
        }

        <!-- Actions -->
        <div style="display:flex;gap:10px">
          <a href="mailto:${o.email}" style="flex:1;padding:12px;background:linear-gradient(135deg,#a07830,#c9a84c);color:#000;text-decoration:none;text-align:center;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700">
            ✉ مراسلة العميل
          </a>
          <button onclick="document.getElementById('order-detail-modal').remove()" 
            style="flex:1;padding:12px;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#888;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13px">
            إغلاق
          </button>
        </div>

      </div>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

// =============================================
// FIX 6: renderAdminProductList now accepts a
// products parameter instead of silently
// reading the module-level firebaseProducts.
// This makes the timing explicit and testable.
// =============================================
function renderAdminProductList(products) {
  const el = document.getElementById("admin-product-list");
  if (!el) return;

  const list = products || firebaseProducts;

  el.innerHTML = list.length
    ? list
        .map(
          (p) => `
    <div style="background:var(--dark3);padding:18px;position:relative">
      <div style="font-size:32px;text-align:center;margin-bottom:10px;height:72px;display:flex;align-items:center;justify-content:center">
        ${
          p.imageUrl
            ? `<img src="${p.imageUrl}" style="max-height:72px;max-width:100%;object-fit:contain"/>`
            : p.emoji || "💡"
        }
      </div>
      <div style="font-size:15px;color:var(--white);margin-bottom:4px;font-weight:400">
        ${p.name}
      </div>
      <div style="font-size:11px;color:var(--gold);margin-bottom:12px">
        ${catLabel(p.cat)} · ${fmtP(p.price)}
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="openEditModal('${p.id}')" style="flex:1;padding:6px;background:transparent;border:1px solid rgba(201,168,76,0.4);color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:12px">✏ تعديل</button>
        <button onclick="deleteProduct('${p.id}','${p.name}')" style="flex:1;padding:6px;background:transparent;border:1px solid rgba(255,80,80,0.4);color:#ff6b6b;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:12px">🗑 حذف</button>
      </div>
    </div>
  `,
        )
        .join("")
    : `<div style="text-align:center;color:gray;padding:40px">لا يوجد منتجات</div>`;
}

function removeCustomProduct(i) {
  customProducts.splice(i, 1);
  renderAdminProductList(firebaseProducts);
  document.getElementById("admin-prod-count").textContent =
    getAllProducts().length;
  document.getElementById("prod-list-count").textContent =
    getAllProducts().length;
  showNotif("✦", "تم الحذف", "تم حذف المنتج من الكتالوج");
}

function renderMessages() {
  const el = document.getElementById("messages-list");
  if (!el) return;
  el.innerHTML = orders
    .map(
      (o, i) => `
    <div class="admin-panel" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:20px;color:var(--white);font-weight:400">${o.client}</div>
          <div style="font-size:12px;color:var(--gray);margin-top:4px">${o.email} · ${o.phone || "لا يوجد هاتف"}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <span class="badge ${STATUS_MAP[o.status]}">${STATUS_LABEL[o.status]}</span>
          <span style="font-size:12px;color:var(--gray)">${o.date}</span>
        </div>
      </div>
      <div style="padding:18px;background:var(--dark3);margin-bottom:14px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:8px">الطلب / الاستفسار</div>
        <div style="font-size:14px;color:var(--white2)">${o.product}</div>
        <div style="font-size:13px;color:var(--gray);margin-top:10px;line-height:1.7">${o.desc || "لم يتم تقديم تفاصيل إضافية."}</div>
      </div>
      <div style="display:flex;gap:10px">
        <a href="mailto:${o.email}" class="panel-action" style="display:inline-block;text-decoration:none">الرد بالبريد</a>
        <button onclick="updateOrderStatus(${i},'proc')" style="padding:8px 18px;background:transparent;border:1px solid rgba(201,168,76,0.3);color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:12px">تحديد كـ "قيد المعالجة"</button>
      </div>
    </div>`,
    )
    .join("");
}

function renderAnalytics() {
  const bars = document.getElementById("analytics-bars");
  const chart = document.getElementById("revenue-chart");
  if (!bars || !chart) return;
  [
    { name: "الثريات", pct: 42, val: "٥٠٤ألف جنيه" },
    { name: "المعلقات", pct: 28, val: "٣٣٦ألف جنيه" },
    { name: "إضاءة الجدار", pct: 14, val: "١٦٨ألف جنيه" },
    { name: "التورشيرات", pct: 9, val: "١٠٨ألف جنيه" },
    { name: "الخارجية وأخرى", pct: 7, val: "٨٤ألف جنيه" },
  ].forEach((c) => {
    const d = document.createElement("div");
    d.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:7px;font-size:13px"><span style="color:var(--white2)">${c.name}</span><span style="color:var(--gold)">${c.pct}٪ · ${c.val}</span></div><div style="height:5px;background:var(--dark3)"><div style="height:100%;width:${c.pct}%;background:linear-gradient(to left,var(--gold-dark),var(--gold));transition:width 1s ease"></div></div>`;
    bars.appendChild(d);
  });
  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  const vals = [62, 78, 85, 91, 105, 88, 96, 112, 134, 98, 118, 142];
  const max = Math.max(...vals);
  chart.innerHTML = months
    .map(
      (m, i) => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="font-size:10px;color:var(--gold)">${vals[i]}k</div>
      <div style="flex:1;width:100%;display:flex;align-items:flex-end">
        <div style="width:100%;height:${(vals[i] / max) * 100}%;background:linear-gradient(to top,var(--gold-dark),var(--gold));opacity:0.8;min-height:6px"></div>
      </div>
      <div style="font-size:9px;color:var(--gray);writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);height:36px">${m}</div>
    </div>`,
    )
    .join("");
}

function handleFileUpload(e) {
  const preview = document.getElementById("upload-preview");
  Array.from(e.target.files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const idx = preview.children.length;
      const wrap = document.createElement("div");
      wrap.id = "new-photo-wrap-" + idx;
      wrap.style.cssText = "position:relative;width:80px;height:80px";
      wrap.innerHTML = `
        <img src="${ev.target.result}" style="width:80px;height:80px;object-fit:cover;border:1px solid rgba(201,168,76,0.3)" data-dataurl="${ev.target.result}"/>
        <button onclick="document.getElementById('new-photo-wrap-${idx}').remove()" style="position:absolute;top:-6px;left:-6px;width:20px;height:20px;background:#ef4444;border:none;color:#fff;font-size:11px;cursor:pointer;border-radius:50%">✕</button>
      `;
      preview.appendChild(wrap);
    };
    reader.readAsDataURL(file);
  });
}

function addNewColorPreset(name, hex) {
  document.getElementById("new-color-hex").value = hex;
  document.getElementById("new-color-name").value = name;
  addNewColor();
}

function addNewColor() {
  const hex = document.getElementById("new-color-hex").value;
  const name = document.getElementById("new-color-name").value.trim();
  if (!name) {
    showNotif("⚠", "أدخل اسم اللون", "");
    return;
  }
  const list = document.getElementById("new-colors-list");
  const idx = Date.now();
  const div = document.createElement("div");
  div.id = "new-color-item-" + idx;
  div.style.cssText =
    "display:flex;align-items:center;gap:6px;background:#111;padding:5px 10px;border:1px solid rgba(255,255,255,0.08)";
  div.innerHTML = `
    <div style="width:18px;height:18px;border-radius:50%;background:${hex};border:1px solid rgba(255,255,255,0.2);flex-shrink:0"></div>
    <span style="font-size:12px;color:#ccc" data-name="${name}" data-hex="${hex}">${name}</span>
    <button onclick="document.getElementById('new-color-item-${idx}').remove()" style="background:transparent;border:none;color:#666;cursor:pointer;font-size:14px;margin-right:2px">✕</button>
  `;
  list.appendChild(div);
  document.getElementById("new-color-name").value = "";
}
async function saveProduct() {
  const name = document.getElementById("prod-name").value.trim();
  const cat = document.getElementById("prod-category").value;
  const price = parseFloat(document.getElementById("prod-price").value);
  const quantity =
    parseInt(document.getElementById("prod-quantity").value) || 0;

  if (!name || !cat || !price) {
    showNotif("⚠", "حقول ناقصة", "من فضلك أدخل الاسم والفئة والسعر.");
    return;
  }

  // Collect all images
  const imgEls = document.querySelectorAll("#upload-preview img");
  const images = Array.from(imgEls)
    .map((img) => img.dataset.dataurl || img.src)
    .filter(Boolean);
  const imageUrl = images[0] || null;

  // Collect colors
  const colorSpans = document.querySelectorAll(
    "#new-colors-list span[data-name]",
  );
  const colors = Array.from(colorSpans).map((s) => ({
    name: s.dataset.name,
    hex: s.dataset.hex,
  }));

  try {
    await addDoc(collection(db, "Product"), {
      name,
      cat,
      price,
      quantity,
      imageUrl,
      images,
      colors,
    });
    showNotif("✦", "تم الحفظ!", name + " أُضيف إلى Firebase 🔥");
    await loadProductsFromFirebase();
    renderAdminProductList(firebaseProducts);
    renderHomeFeatured();
    clearProductForm();
    document.getElementById("admin-prod-count").textContent =
      getAllProducts().length;
    document.getElementById("prod-list-count").textContent =
      getAllProducts().length;
  } catch (error) {
    console.error(error);
    showNotif("⚠", "خطأ", "فشل حفظ المنتج");
  }
}
function clearProductForm() {
  ["prod-name", "prod-price", "prod-quantity"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("prod-category").value = "";
  document.getElementById("upload-preview").innerHTML = "";
  document.getElementById("file-input").value = "";
  const colorsList = document.getElementById("new-colors-list");
  if (colorsList) colorsList.innerHTML = "";
}

async function updateProduct(id) {
  const name = document.getElementById("prod-name").value.trim();
  const cat = document.getElementById("prod-category").value;
  const price = parseFloat(document.getElementById("prod-price").value);
  const quantity =
    parseInt(document.getElementById("prod-quantity").value) || 0;

  if (!name || !cat || !price) {
    showNotif("⚠", "حقول ناقصة", "من فضلك أدخل البيانات");
    return;
  }

  const imgEl = document.querySelector("#upload-preview img");

  const updatedData = {
    name,
    cat,
    price,
    quantity,
    imageUrl: imgEl ? imgEl.dataset.dataurl : null,
  };

  try {
    const ref = doc(db, "Product", id);
    await updateDoc(ref, updatedData);
    showNotif("✦", "تم التعديل", "تم تحديث المنتج 🔥");

    await loadProductsFromFirebase();
    renderAdminProductList(firebaseProducts);
    renderHomeFeatured();
  } catch (error) {
    console.error(error);
    showNotif("⚠", "خطأ", "فشل التعديل");
  }
}

let notifTimer;
function showNotif(icon, title, msg) {
  document.getElementById("notif-icon").textContent = icon;
  document.getElementById("notif-title").textContent = title;
  document.getElementById("notif-msg").textContent = msg;
  const el = document.getElementById("notification");
  el.classList.add("show");
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.classList.remove("show"), 3500);
}
// ===== DELETE PRODUCT =====
async function deleteProduct(id, name) {
  if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
  try {
    await deleteDoc(doc(db, "Product", id));
    showNotif("🗑", "تم الحذف", `${name} تم حذفه من Firebase`);
    await loadProductsFromFirebase();
    renderAdminProductList(firebaseProducts);
    renderHomeFeatured();
    document.getElementById("admin-prod-count").textContent =
      getAllProducts().length;
    document.getElementById("prod-list-count").textContent =
      getAllProducts().length;
  } catch (error) {
    console.error(error);
    showNotif("⚠", "خطأ", "فشل حذف المنتج");
  }
}

// ===== OPEN EDIT MODAL =====
function openEditModal(id) {
  const p = firebaseProducts.find((x) => x.id === id);
  if (!p) return;

  const old = document.getElementById("edit-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "edit-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
    overflow-y:auto
  `;
  modal.innerHTML = `
    <div style="background:var(--dark2,#1a1a1a);border:1px solid rgba(201,168,76,0.3);padding:32px;width:100%;max-width:560px;position:relative;direction:rtl;font-family:'Tajawal',sans-serif;margin:auto;max-height:90vh;overflow-y:auto">
      <button onclick="document.getElementById('edit-modal').remove()" style="position:absolute;top:14px;left:16px;background:transparent;border:none;color:var(--gray,#888);font-size:20px;cursor:pointer">✕</button>
      <div style="font-size:20px;color:var(--gold,#c9a84c);margin-bottom:24px;letter-spacing:1px">✏ تعديل المنتج</div>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">اسم المنتج</label>
      <input id="edit-prod-name" value="${p.name || ""}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">الفئة</label>
      <select id="edit-prod-cat" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box">
        ${["Magnetic_Track", "Spot_light", "DoubleSpot_light", "Metal_Connector"].map((c) => `<option value="${c}" ${p.cat === c ? "selected" : ""}>${catLabel(c)}</option>`).join("")}
      </select>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">السعر (جنيه)</label>
      <input id="edit-prod-price" type="number" value="${p.price || ""}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">الكمية</label>
      <input id="edit-prod-qty" type="number" value="${p.quantity || 0}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <!-- MULTIPLE PHOTOS -->
      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:8px;letter-spacing:1px">الصور (يمكن رفع أكثر من صورة)</label>
      <div id="edit-photos-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;min-height:40px">
        ${(p.images && p.images.length
          ? p.images
          : p.imageUrl
            ? [p.imageUrl]
            : []
        )
          .map(
            (url, idx) => `
          <div style="position:relative;width:80px;height:80px" id="edit-photo-wrap-${idx}">
            <img src="${url}" style="width:80px;height:80px;object-fit:cover;border:1px solid rgba(201,168,76,0.3)" data-dataurl="${url}"/>
            <button onclick="removeEditPhoto(${idx})" style="position:absolute;top:-6px;left:-6px;width:20px;height:20px;background:#ef4444;border:none;color:#fff;font-size:11px;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center">✕</button>
          </div>`,
          )
          .join("")}
      </div>
      <input type="file" id="edit-multi-file" accept="image/*" multiple onchange="handleEditMultiUpload(event)" style="width:100%;padding:8px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--gray,#888);font-family:'Tajawal',sans-serif;font-size:13px;margin-bottom:16px;box-sizing:border-box;cursor:pointer"/>

<!-- COLORS -->
<div style="font-size:12px;color:var(--gray);margin-bottom:8px;letter-spacing:1px">الألوان المتاحة (اختياري)</div>
<div id="new-colors-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;padding:14px;background:var(--dark3);border:1px solid rgba(255,255,255,0.06)">
  <div style="width:100%;font-size:10px;color:var(--gray);letter-spacing:1px;margin-bottom:8px">اختر لوناً جاهزاً أو أضف مخصصاً:</div>
  <button onclick="addNewColorPreset('أسود','#1a1a1a')" title="أسود" style="width:32px;height:32px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('أبيض','#f5f5f5')" title="أبيض" style="width:32px;height:32px;border-radius:50%;background:#f5f5f5;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('ذهبي','#c9a84c')" title="ذهبي" style="width:32px;height:32px;border-radius:50%;background:#c9a84c;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('فضي','#a8a8a8')" title="فضي" style="width:32px;height:32px;border-radius:50%;background:#a8a8a8;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('برونزي','#8B6914')" title="برونزي" style="width:32px;height:32px;border-radius:50%;background:#8B6914;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('نحاسي','#b87333')" title="نحاسي" style="width:32px;height:32px;border-radius:50%;background:#b87333;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('رمادي','#666666')" title="رمادي" style="width:32px;height:32px;border-radius:50%;background:#666666;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <button onclick="addNewColorPreset('أبيض دافئ','#f0e6d3')" title="أبيض دافئ" style="width:32px;height:32px;border-radius:50%;background:#f0e6d3;border:2px solid rgba(255,255,255,0.3);cursor:pointer"></button>
  <div style="display:flex;gap:6px;align-items:center;margin-top:8px;width:100%">
    <input type="color" id="new-color-hex" value="#ffffff" style="width:32px;height:32px;padding:2px;background:var(--dark3);border:1px solid rgba(255,255,255,0.1);cursor:pointer"/>
    <input type="text" id="new-color-name" placeholder="اسم مخصص..." style="flex:1;padding:7px 10px;background:#111;border:1px solid rgba(255,255,255,0.1);color:#fff;font-family:'Tajawal',sans-serif;font-size:13px"/>
    <button onclick="addNewColor()" style="padding:7px 14px;background:transparent;border:1px solid rgba(201,168,76,0.4);color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13px">+ إضافة</button>
  </div>
</div>

      <button onclick="saveEditProduct('${id}')" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--gold-dark,#a07830),var(--gold,#c9a84c));color:#000;border:none;font-family:'Tajawal',sans-serif;font-size:15px;cursor:pointer;font-weight:700">
        حفظ التعديلات
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}
function handleEditImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById("edit-img-preview");
    preview.innerHTML = `<img id="edit-current-img" src="${ev.target.result}" style="max-height:120px;max-width:100%;object-fit:contain" data-dataurl="${ev.target.result}"/>`;
  };
  reader.readAsDataURL(file);
}

function clearEditImage(originalUrl) {
  const preview = document.getElementById("edit-img-preview");
  preview.innerHTML = `<span id="edit-current-img" style="color:var(--gray,#888);font-size:13px">لا توجد صورة</span>`;
  const fileInput = document.getElementById("edit-file-input");
  if (fileInput) fileInput.value = "";
}
function addEditColorPreset(name, hex) {
  document.getElementById("edit-color-hex").value = hex;
  document.getElementById("edit-color-name").value = name;
  addEditColor();
}

async function loadOrdersFromFirebase() {
  try {
    const snapshot = await getDocs(collection(db, "Orders"));
    const firebaseOrders = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      firebaseOrders.push({
        id: "#LM-" + docSnap.id.slice(0, 6).toUpperCase(),
        firestoreId: docSnap.id,
        client: data.client || "غير محدد",
        product: data.product || "غير محدد",
        value:
          data.valueFormatted || (data.value ? fmtP(data.value) : "غير محدد"),
        status: data.status || "new",
        date: data.date || "",
        email: data.email || "",
        phone: data.phone || "غير محدد",
        desc: data.desc || "",
      });
    });
    if (firebaseOrders.length > 0) {
      orders = firebaseOrders;
    }
  } catch (error) {
    console.error("فشل تحميل الطلبات:", error);
  }
}
// ===== SAVE EDIT FROM MODAL =====
async function saveEditProduct(id) {
  const name = document.getElementById("edit-prod-name").value.trim();
  const cat = document.getElementById("edit-prod-cat").value;
  const price = parseFloat(document.getElementById("edit-prod-price").value);
  const quantity =
    parseInt(document.getElementById("edit-prod-qty").value) || 0;

  if (!name || !cat || !price) {
    showNotif("⚠", "حقول ناقصة", "من فضلك أدخل جميع البيانات");
    return;
  }

  // Collect all photos
  const imgEls = document.querySelectorAll("#edit-photos-preview img");
  const images = Array.from(imgEls)
    .map((img) => img.dataset.dataurl || img.getAttribute("src"))
    .filter(Boolean);
  const imageUrl = images[0] || null;

  // Collect colors
  const colorSpans = document.querySelectorAll(
    "#edit-colors-list span[data-name]",
  );
  const colors = Array.from(colorSpans).map((s) => ({
    name: s.dataset.name,
    hex: s.dataset.hex,
  }));

  try {
    await updateDoc(doc(db, "Product", id), {
      name,
      cat,
      price,
      quantity,
      imageUrl,
      images,
      colors,
    });
    showNotif("✦", "تم التعديل", `${name} تم تحديثه بنجاح 🔥`);
    document.getElementById("edit-modal").remove();
    await loadProductsFromFirebase();
    renderAdminProductList(firebaseProducts);
    renderHomeFeatured();
  } catch (error) {
    console.error(error);
    showNotif("⚠", "خطأ", "فشل حفظ التعديلات");
  }
}

function quickAddToCart() {
  const sel = document.getElementById("quick-product");
  const qty = parseInt(document.getElementById("quick-qty").value) || 1;
  if (!sel.value) {
    showNotif("⚠", "اختر منتجاً", "من فضلك اختر منتجاً أولاً.");
    return;
  }
  const all = getAllProducts();
  const p = all.find((x) => x.name === sel.value);
  if (!p) {
    showNotif("⚠", "خطأ", "المنتج غير موجود، حاول مجدداً.");
    return;
  }
  const ex = cart.find((c) => c.id === p.id);
  if (ex) ex.qty += qty;
  else cart.push({ ...p, qty });
  updateCartUI();
  showNotif("✦", "أُضيف", `${qty}× ${p.name} أُضيفت`);
}

function handleEditMultiUpload(e) {
  const files = Array.from(e.target.files);
  const preview = document.getElementById("edit-photos-preview");
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const idx = preview.children.length;
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;width:80px;height:80px";
      wrap.id = "edit-photo-wrap-" + idx;
      wrap.innerHTML = `
        <img src="${ev.target.result}" style="width:80px;height:80px;object-fit:cover;border:1px solid rgba(201,168,76,0.3)" data-dataurl="${ev.target.result}"/>
        <button onclick="removeEditPhoto(${idx})" style="position:absolute;top:-6px;left:-6px;width:20px;height:20px;background:#ef4444;border:none;color:#fff;font-size:11px;cursor:pointer;border-radius:50%">✕</button>
      `;
      preview.appendChild(wrap);
    };
    reader.readAsDataURL(file);
  });
}

function removeEditPhoto(idx) {
  const wrap = document.getElementById("edit-photo-wrap-" + idx);
  if (wrap) wrap.remove();
}

function addEditColor() {
  const hex = document.getElementById("edit-color-hex").value;
  const name = document.getElementById("edit-color-name").value.trim();
  if (!name) {
    showNotif("⚠", "أدخل اسم اللون", "");
    return;
  }
  const list = document.getElementById("edit-colors-list");
  const idx = list.children.length;
  const div = document.createElement("div");
  div.id = "edit-color-item-" + idx;
  div.style.cssText =
    "display:flex;align-items:center;gap:4px;background:var(--dark3,#111);padding:4px 10px;border:1px solid rgba(255,255,255,0.1)";
  div.innerHTML = `
    <div style="width:16px;height:16px;background:${hex};border:1px solid rgba(255,255,255,0.2)"></div>
    <span style="font-size:12px;color:#ccc" data-name="${name}" data-hex="${hex}">${name}</span>
    <button onclick="removeEditColor(${idx})" style="background:transparent;border:none;color:#888;cursor:pointer;font-size:12px;margin-right:4px">✕</button>
  `;
  list.appendChild(div);
  document.getElementById("edit-color-name").value = "";
}

function removeEditColor(idx) {
  const item = document.getElementById("edit-color-item-" + idx);
  if (item) item.remove();
}
// =============================================
// FIX 7: Only call renderHomeFeatured() on
// initial load — never call bare renderAdmin()
// at module level since firebaseProducts is
// still empty at that point.
// =============================================
renderHomeFeatured();

// ===== MAKE EVERYTHING GLOBAL =====
window.showPage = showPage;
window.doLogin = doLogin;
window.doLogout = doLogout;

window.loadProductsFromFirebase = loadProductsFromFirebase;
window.renderCatalog = renderCatalog;
window.renderHomeFeatured = renderHomeFeatured;

window.filterProducts = filterProducts;

window.addToCart = addToCart;
window.quickAddToCart = quickAddToCart;
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;

window.submitOrder = submitOrder;
window.populateProductDropdown = populateProductDropdown;

window.showAdminSection = showAdminSection;
window.renderAdmin = renderAdmin;

window.updateOrderStatus = updateOrderStatus;
window.viewDetail = viewDetail;

window.saveProduct = saveProduct;
window.removeCustomProduct = removeCustomProduct;
window.updateProduct = updateProduct;

window.handleFileUpload = handleFileUpload;
window.clearProductForm = clearProductForm;
window.showNotif = showNotif;

window.deleteProduct = deleteProduct;
window.openEditModal = openEditModal;
window.saveEditProduct = saveEditProduct;

window.handleEditImageUpload = handleEditImageUpload;
window.clearEditImage = clearEditImage;
window.loadOrdersFromFirebase = loadOrdersFromFirebase;

window.switchProductImg = switchProductImg;
window.selectColor = selectColor;
window.handleEditMultiUpload = handleEditMultiUpload;
window.removeEditPhoto = removeEditPhoto;
window.addEditColor = addEditColor;
window.removeEditColor = removeEditColor;
window.addNewColor = addNewColor;
window.openProductGallery = openProductGallery;
window.galleryNav = galleryNav;
window.galleryGoTo = galleryGoTo;
window.addNewColorPreset = addNewColorPreset;
window.addEditColorPreset = addEditColorPreset;
window.selectColor = selectColor;
