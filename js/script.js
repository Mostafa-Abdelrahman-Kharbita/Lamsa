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
function openProductGallery(id) {
  const p = getAllProducts().find((x) => x.id === id);
  if (!p) return;

  const images =
    Array.isArray(p.images) && p.images.length
      ? p.images
      : p.imageUrl
        ? [p.imageUrl]
        : [];

  const old = document.getElementById("product-gallery-modal");
  if (old) old.remove();

  let currentIndex = 0;

  const modal = document.createElement("div");
  modal.id = "product-gallery-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
    direction:rtl;font-family:'Tajawal',sans-serif;
  `;

  modal.innerHTML = `
    <div style="background:#111;border:1px solid rgba(201,168,76,0.2);width:100%;max-width:620px;position:relative;margin:auto">
      
      <!-- Close -->
      <button onclick="document.getElementById('product-gallery-modal').remove()"
        style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);color:#888;width:34px;height:34px;font-size:16px;cursor:pointer;z-index:10">✕</button>

      <!-- Main Image -->
      <div style="position:relative;background:#1a1a1a;height:360px;display:flex;align-items:center;justify-content:center;overflow:hidden">
        <img id="gallery-main-img" src="${images[currentIndex] || ""}" 
          style="max-height:100%;max-width:100%;object-fit:contain;transition:opacity 0.2s"/>
        
        ${
          images.length > 1
            ? `
        <button onclick="galleryPrev()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.6);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#c9a84c);width:38px;height:38px;font-size:18px;cursor:pointer">›</button>
        <button onclick="galleryNext()" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.6);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#c9a84c);width:38px;font-size:18px;height:38px;cursor:pointer">‹</button>
        `
            : ""
        }

        <div id="gallery-counter" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:var(--gold,#c9a84c);font-size:12px;padding:3px 12px;letter-spacing:1px">
          ${images.length > 1 ? `1 / ${images.length}` : ""}
        </div>
      </div>

      <!-- Thumbnails -->
      ${
        images.length > 1
          ? `
      <div id="gallery-thumbs" style="display:flex;gap:6px;padding:12px;overflow-x:auto;background:#0a0a0a;border-top:1px solid rgba(201,168,76,0.1)">
        ${images
          .map(
            (src, i) => `
          <img src="${src}" onclick="galleryGoTo(${i})" id="thumb-${i}"
            style="width:64px;height:64px;object-fit:cover;cursor:pointer;flex-shrink:0;
            border:2px solid ${i === 0 ? "var(--gold,#c9a84c)" : "transparent"};opacity:${i === 0 ? 1 : 0.5};transition:all 0.2s"/>
        `,
          )
          .join("")}
      </div>`
          : ""
      }

      <!-- Info -->
      <div style="padding:20px 24px;border-top:1px solid rgba(255,255,255,0.05)">
        <div style="font-size:11px;letter-spacing:3px;color:var(--gold,#c9a84c);margin-bottom:6px">${catLabel(p.cat)}</div>
        <div style="font-size:20px;color:#fff;margin-bottom:10px">${p.name}</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:20px;color:var(--gold,#c9a84c);font-weight:500">${fmtP(p.price)}</div>
          <button onclick="addToCart('${p.id}');document.getElementById('product-gallery-modal').remove()"
            style="padding:10px 28px;background:var(--gold,#c9a84c);border:none;color:#000;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">
            + أضف للطلب
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on backdrop
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // Inject gallery nav functions into window temporarily
  const galleryImages = images;
  window._galleryIndex = 0;

  window.galleryGoTo = function (i) {
    window._galleryIndex = i;
    const mainImg = document.getElementById("gallery-main-img");
    if (mainImg) {
      mainImg.style.opacity = 0;
      setTimeout(() => {
        mainImg.src = galleryImages[i];
        mainImg.style.opacity = 1;
      }, 150);
    }
    const counter = document.getElementById("gallery-counter");
    if (counter) counter.textContent = `${i + 1} / ${galleryImages.length}`;
    galleryImages.forEach((_, j) => {
      const t = document.getElementById(`thumb-${j}`);
      if (t) {
        t.style.border =
          j === i ? "2px solid var(--gold,#c9a84c)" : "2px solid transparent";
        t.style.opacity = j === i ? "1" : "0.5";
      }
    });
  };

  window.galleryNext = function () {
    window.galleryGoTo((window._galleryIndex + 1) % galleryImages.length);
  };
  window.galleryPrev = function () {
    window.galleryGoTo(
      (window._galleryIndex - 1 + galleryImages.length) % galleryImages.length,
    );
  };
}
function productHTML(p) {
  const images =
    Array.isArray(p.images) && p.images.length
      ? p.images
      : p.imageUrl
        ? [p.imageUrl]
        : [];
  const hasMultiple = images.length > 1;

  return `<div class="product-card" onclick="openProductGallery('${p.id}')" style="cursor:pointer">
    ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ""}
    ${hasMultiple ? `<div style="position:absolute;top:14px;left:14px;background:rgba(0,0,0,0.7);color:var(--gold);font-size:11px;padding:3px 9px;letter-spacing:1px;z-index:2">📷 ${images.length}</div>` : ""}
    <div class="product-img">
      ${images.length ? `<img src="${images[0]}"/>` : `<span>${p.emoji || "💡"}</span><div class="glow-dot"></div>`}
    </div>
    <div class="product-info">
      <div class="product-cat">${catLabel(p.cat)}</div>
      <div class="product-name">${p.name}</div>
      <div style="margin-top:auto;padding-top:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          ${p.oldPrice ? `<div class="product-old">${fmtP(p.oldPrice)}</div>` : ""}
          <div class="product-price">${fmtP(p.price)}</div>
        </div>
        <button class="add-btn-card" onclick="event.stopPropagation();addToCart('${p.id}')">+ أضف للطلب</button>
      </div>
    </div>
  </div>`;
}

function catLabel(c) {
  return (
    {
      Magnetic_Track: "Magnetic Track",
      Spot_light: "Spot light",
      DoubleSpot_light: "Double Spot light",
      Metal_Connector: "Metal Connector",
      Magnetic_Power: "Magnetic Power",
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
    // products not loaded yet, load then retry
    loadProductsFromFirebase().then(() => {
      const p2 = getAllProducts().find(
        (x) => x.id === id || x.id === String(id),
      );
      if (!p2) return;
      const ex = cart.find((c) => c.id === p2.id);
      if (ex) ex.qty++;
      else cart.push({ ...p2, qty: 1 });
      updateCartUI();
      showNotif("✦", "أُضيف للطلب", p2.name + " أُضيف إلى طلبك");
    });
    return;
  }
  const ex = cart.find((c) => c.id === p.id);
  if (ex) ex.qty++;
  else cart.push({ ...p, qty: 1 });
  updateCartUI();
  showNotif("✦", "أُضيف للطلب", p.name + " أُضيف إلى طلبك");
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
        <div class="cart-name">${c.name}</div>
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
      .map(
        (c) =>
          c.name +
          (c.color ? ` - ${c.color}` : "") +
          (c.qty > 1 ? ` × ${c.qty}` : ""),
      )
      .join(",,"),
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
<div style="margin-bottom:16px">
            ${o.product
              .split(",,")
              .map((item, i) => {
                const clean = item.trim();
                // parse: "Name - Color × Qty" or "Name × Qty" or "Name - Color"
                const qtyMatch = clean.match(/×\s*(\d+)$/);
                const qty = qtyMatch ? qtyMatch[1] : "1";
                const withoutQty = clean.replace(/×\s*\d+$/, "").trim();
                const colorMatch = withoutQty.match(/ - ([^-]+)$/);
                const color = colorMatch ? colorMatch[1].trim() : null;
                const name = color
                  ? withoutQty.replace(/ - [^-]+$/, "").trim()
                  : withoutQty;
                return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#111;border-right:3px solid var(--gold,#c9a84c);margin-bottom:8px;gap:12px">
                <div style="display:flex;align-items:center;gap:10px;flex:1">
                  <span style="font-size:13px;color:var(--gold,#c9a84c);font-weight:700;min-width:20px">${i + 1}</span>
                  <div>
                    <div style="font-size:14px;color:#fff;line-height:1.4">${name}</div>
                    ${color ? `<div style="font-size:11px;color:#aaa;margin-top:3px">اللون: <span style="color:var(--gold,#c9a84c)">${color}</span></div>` : ""}
                  </div>
                </div>
                <div style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);padding:4px 12px;font-size:13px;color:var(--gold,#c9a84c);white-space:nowrap">
                  × ${qty}
                </div>
              </div>`;
              })
              .join("")}
          </div>
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
   <div style="background:var(--dark3);padding:18px;position:relative;display:flex;flex-direction:column;min-height:220px">
  <div style="height:72px;display:flex;align-items:center;justify-content:center;margin-bottom:10px">
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
  <div style="display:flex;gap:8px;margin-top:auto">
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
function removeImage(i) {
  pendingImages.splice(i, 1);
  renderUploadPreview(
    document.getElementById("upload-preview"),
    pendingImages,
    false,
  );
}
function removeEditImage(i) {
  editPendingImages.splice(i, 1);
  renderEditPreview();
}
function renderUploadPreview(container, images, isEdit) {
  container.innerHTML = images
    .map(
      (src, i) => `
    <div style="position:relative;display:inline-block;margin:4px">
      <img src="${src}" style="width:90px;height:90px;object-fit:cover;border:1px solid rgba(201,168,76,0.3)"/>
      <button onclick="${isEdit ? "removeEditImage" : "removeImage"}(${i})" 
        style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;color:#ff6b6b;cursor:pointer;font-size:11px;padding:2px 5px">✕</button>
    </div>
  `,
    )
    .join("");
}
let pendingImages = []; // stores base64 strings

function handleFileUpload(e) {
  const preview = document.getElementById("upload-preview");
  Array.from(e.target.files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingImages.push(ev.target.result);
      renderUploadPreview(preview, pendingImages, false);
    };
    reader.readAsDataURL(file);
  });
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

  const productData = {
    name,
    cat,
    price,
    quantity,
    images: pendingImages, // array of base64
    imageUrl: pendingImages[0] || null, // keep first as thumbnail
  };

  try {
    await addDoc(collection(db, "Product"), productData);
    showNotif("✦", "تم الحفظ!", name + " أُضيف إلى Firebase 🔥");
    pendingImages = [];
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
  pendingImages = [];
}

// function clearProductForm() {
//   ["prod-name", "prod-price", "prod-quantity"].forEach(
//     (id) => (document.getElementById(id).value = "")
//   );
//   document.getElementById("prod-category").value = "";
//   document.getElementById("upload-preview").innerHTML = "";
//   document.getElementById("file-input").value = "";
//   pendingImages = [];
// }

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
function renderEditPreview() {
  const container = document.getElementById("edit-img-preview");
  if (!container) return;
  if (!editPendingImages.length) {
    container.innerHTML = `<span style="color:var(--gray,#888);font-size:13px;padding:8px">لا توجد صور</span>`;
    return;
  }
  container.innerHTML = editPendingImages
    .map(
      (src, i) => `
    <div style="position:relative;display:inline-block">
      <img src="${src}" style="width:80px;height:80px;object-fit:cover;border:1px solid rgba(201,168,76,0.3)"/>
      <button onclick="removeEditImage(${i})" 
        style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.75);border:none;color:#ff6b6b;cursor:pointer;font-size:11px;padding:2px 5px">✕</button>
      ${i === 0 ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(201,168,76,0.8);color:#000;font-size:9px;text-align:center;padding:2px">رئيسية</div>` : ""}
    </div>
  `,
    )
    .join("");
}
// ===== OPEN EDIT MODAL =====
let editPendingImages = [];

function openEditModal(id) {
  const p = firebaseProducts.find((x) => x.id === id);
  if (!p) return;

  editPendingImages =
    Array.isArray(p.images) && p.images.length
      ? [...p.images]
      : p.imageUrl
        ? [p.imageUrl]
        : [];

  const old = document.getElementById("edit-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "edit-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto
  `;
  modal.innerHTML = `
    <div style="background:var(--dark2,#1a1a1a);border:1px solid rgba(201,168,76,0.3);padding:32px;width:100%;max-width:480px;position:relative;direction:rtl;font-family:'Tajawal',sans-serif;margin:auto">
      <button onclick="document.getElementById('edit-modal').remove()" style="position:absolute;top:14px;left:16px;background:transparent;border:none;color:var(--gray,#888);font-size:20px;cursor:pointer">✕</button>
      <div style="font-size:20px;color:var(--gold,#c9a84c);margin-bottom:24px">✏ تعديل المنتج</div>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px">اسم المنتج</label>
      <input id="edit-prod-name" value="${p.name || ""}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px">الفئة</label>
      <select id="edit-prod-cat" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box">
        ${[
          "Magnetic_Track",
          "Spot_light",
          "DoubleSpot_light",
          "Metal_Connector",
          "Magnetic_Power",
        ]
          .map(
            (c) =>
              `<option value="${c}" ${p.cat === c ? "selected" : ""}>${catLabel(c)}</option>`,
          )
          .join("")}
      </select>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px">السعر (جنيه)</label>
      <input id="edit-prod-price" type="number" value="${p.price || ""}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px">الكمية</label>
      <input id="edit-prod-qty" type="number" value="${p.quantity || 0}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px">الصور الحالية</label>
      <div id="edit-img-preview" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;min-height:40px;padding:8px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1)">
      </div>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px">إضافة صور جديدة</label>
      <input type="file" id="edit-file-input" accept="image/*" multiple onchange="handleEditImageUpload(event)" 
        style="width:100%;padding:8px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--gray,#888);font-family:'Tajawal',sans-serif;font-size:13px;margin-bottom:24px;box-sizing:border-box;cursor:pointer"/>

      <button onclick="saveEditProduct('${id}')" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--gold-dark,#a07830),var(--gold,#c9a84c));color:#000;border:none;font-family:'Tajawal',sans-serif;font-size:15px;cursor:pointer;font-weight:700">
        حفظ التعديلات
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  // Render existing images
  renderEditPreview();
}
function handleEditImageUpload(e) {
  Array.from(e.target.files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      editPendingImages.push(ev.target.result);
      renderEditPreview();
    };
    reader.readAsDataURL(file);
  });
}

function clearEditImage(originalUrl) {
  const preview = document.getElementById("edit-img-preview");
  preview.innerHTML = `<span id="edit-current-img" style="color:var(--gray,#888);font-size:13px">لا توجد صورة</span>`;
  const fileInput = document.getElementById("edit-file-input");
  if (fileInput) fileInput.value = "";
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

  try {
    await updateDoc(doc(db, "Product", id), {
      name,
      cat,
      price,
      quantity,
      images: editPendingImages,
      imageUrl: editPendingImages[0] || null,
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

window.openProductGallery = openProductGallery;
window.galleryGoTo = (i) => {};
window.galleryNext = () => {};
window.galleryPrev = () => {};
window.removeImage = removeImage;
window.removeEditImage = removeEditImage;
window.handleEditImageUpload = handleEditImageUpload;
