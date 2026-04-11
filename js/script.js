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

let cart = [],
  customProducts = [];
let orders = [
  {
    id: "#LM-2847",
    client: "أميرة حسان",
    product: "ثريا أورورا الكريستالية",
    value: "٨٥,٠٠٠ جنيه",
    status: "proc",
    date: "١٨ مارس ٢٠٢٤",
    email: "amira@example.com",
    phone: "+20 10 1234 5678",
    desc: "لوبي الفندق، سقف ارتفاعه ٦ أمتار، يحتاج سلسلة مخصصة الطول.",
  },
  {
    id: "#LM-2846",
    client: "كريم إبراهيم",
    product: "تورشير أطلس × ٤",
    value: "٧٤,٠٠٠ جنيه",
    status: "new",
    date: "١٧ مارس ٢٠٢٤",
    email: "karim@example.com",
    phone: "+20 11 9876 5432",
    desc: "مشروع سكني في الزمالك. التسليم خلال أسبوعين.",
  },
  {
    id: "#LM-2845",
    client: "ليلى منصور",
    product: "فانوس صحراء × ١٢",
    value: "١٤٤,٠٠٠ جنيه",
    status: "done",
    date: "١٥ مارس ٢٠٢٤",
    email: "leila@prestige.com",
    phone: "+971 50 111 2222",
    desc: "مشروع إضاءة حديقة الفندق.",
  },
  {
    id: "#LM-2844",
    client: "عمر فاروق",
    product: "إضاءة جدار ميريديان × ٦",
    value: "٥٣,٤٠٠ جنيه",
    status: "cancel",
    date: "١٢ مارس ٢٠٢٤",
    email: "omar@example.com",
    phone: "+20 12 5555 6666",
    desc: "ممر المكاتب، جدران ارتفاعها ٢.٨ متر.",
  },
  {
    id: "#LM-2843",
    client: "نادية علي",
    product: "مصباح طاولة سيليست × ٣",
    value: "١٩,٥٠٠ جنيه",
    status: "done",
    date: "١٠ مارس ٢٠٢٤",
    email: "nadia@example.com",
    phone: "+20 10 7777 8888",
    desc: "تجديد غرفة النوم في القاهرة الجديدة.",
  },
];

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

  document.querySelectorAll(".page").forEach((p) =>
    p.classList.remove("active")
  );
  document.getElementById("page-" + name).classList.add("active");

  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.classList.remove("active-link")
  );

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
    loadProductsFromFirebase().then(async () => {
      await renderAdmin();
    });
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
   loadProductsFromFirebase().then(async () => {
      await renderAdmin();
    });
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
  return `<div class="product-card">
    ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ""}
    <div class="product-img">
      ${p.imageUrl ? `<img src="${p.imageUrl}"/>` : `<span>${p.emoji || "💡"}</span><div class="glow-dot"></div>`}
    </div>
    <div class="product-info">
      <div class="product-cat">${catLabel(p.cat)}</div>
      <div class="product-name">${p.name}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
        ${p.oldPrice ? `<div class="product-old">${fmtP(p.oldPrice)}</div>` : ""}
        <div class="product-price">${fmtP(p.price)}</div>
      </div>
      <button class="add-btn-card" onclick="addToCart('${p.id}')">+ أضف للطلب</button>
    </div>
  </div>`;
}

function catLabel(c) {
  return (
    {
      chandelier: "ثريا",
      pendant: "معلقة",
      wall: "إضاءة جدار",
      floor: "تورشير",
      outdoor: "خارجية",
      table: "مصباح طاولة",
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
      const p2 = getAllProducts().find((x) => x.id === id || x.id === String(id));
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
          .map((p) => `<option value="${p.name}">${p.name} — ${fmtP(p.price)}</option>`)
          .join("");
    });
    return;
  }
  sel.innerHTML =
    '<option value="">اختر منتجاً للإضافة...</option>' +
    all
      .map((p) => `<option value="${p.name}">${p.name} — ${fmtP(p.price)}</option>`)
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
    product: cart.map((c) => c.name + (c.qty > 1 ? ` × ${c.qty}` : "")).join(", "),
    value: totalValue,
    valueFormatted: fmtP(totalValue),
    items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
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
  if (btn) { btn.disabled = true; btn.textContent = "جارٍ الإرسال..."; }

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
    ["fname", "lname", "email", "phone", "address", "description"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Show success
    document.getElementById("success-overlay").classList.add("show");
    showNotif("✦", "تم الإرسال!", "طلبك وصلنا وسنتواصل معك قريباً.");

  } catch (error) {
    console.error("❌ Firebase error:", error);
    showNotif("⚠", "خطأ", "فشل إرسال الطلب: " + error.message);
  } finally {
    // Restore button
    if (btn) { btn.disabled = false; btn.textContent = "✦ إرسال طلب الاستفسار"; }
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
  await loadOrdersFromFirebase();
  renderDashboardOrders();
  renderFullOrders();
  renderAdminProductList(firebaseProducts);
  renderMessages();
  renderAnalytics();
  document.getElementById("admin-prod-count").textContent = getAllProducts().length;
  document.getElementById("admin-msg-count").textContent = orders.filter((o) => o.status === "new").length;
  document.getElementById("prod-list-count").textContent = getAllProducts().length;
}

function renderDashboardOrders() {
  const tbody = document.getElementById("dashboard-orders-body");
  if (!tbody) return;
  tbody.innerHTML = orders
    .slice(0, 5)
    .map(
      (o) => `<tr>
    <td style="color:var(--gold);font-weight:500">${o.id}</td><td>${o.client}</td>
    <td style="color:var(--gray);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.product}</td>
    <td>${o.value}</td><td><span class="badge ${STATUS_MAP[o.status]}">${STATUS_LABEL[o.status]}</span></td>
    <td style="color:var(--gray)">${o.date}</td></tr>`,
    )
    .join("");
}

function renderFullOrders() {
  const tbody = document.getElementById("full-orders-body");
  if (!tbody) return;
  tbody.innerHTML = orders
    .map(
      (o, i) => `<tr>
    <td style="color:var(--gold)">${o.id}</td><td>${o.client}</td>
    <td style="color:var(--gray);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.product}</td>
    <td>${o.value}</td>
    <td><select onchange="updateOrderStatus(${i},this.value)" style="background:var(--dark3);border:1px solid rgba(255,255,255,0.1);color:var(--white);padding:4px 8px;font-family:'Tajawal',sans-serif;font-size:13px;cursor:pointer">
      ${["new", "proc", "done", "cancel"].map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></td>
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
  document.getElementById("admin-msg-count").textContent = orders.filter((o) => o.status === "new").length;
  showNotif("✦", "تم التحديث", `${orders[i].id} تم تحديثه إلى: ${STATUS_LABEL[status]}`);
}

function viewDetail(i) {
  const o = orders[i];
  alert(
    `الطلب: ${o.id}\nالعميل: ${o.client}\nالبريد: ${o.email}\nالهاتف: ${o.phone || "غير محدد"}\nالمنتج: ${o.product}\nالقيمة: ${o.value}\nالتاريخ: ${o.date}\n\nالتفاصيل:\n${o.desc || "لا توجد تفاصيل إضافية"}`,
  );
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
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
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
      const img = document.createElement("img");
      img.src = ev.target.result;
      img.style.cssText =
        "width:90px;height:90px;object-fit:cover;border:1px solid rgba(201,168,76,0.3)";
      img.dataset.dataurl = ev.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

async function saveProduct() {
  const name = document.getElementById("prod-name").value.trim();
  const cat = document.getElementById("prod-category").value;
  const price = parseFloat(document.getElementById("prod-price").value);
  const quantity = parseInt(document.getElementById("prod-quantity").value) || 0;

  if (!name || !cat || !price) {
    showNotif("⚠", "حقول ناقصة", "من فضلك أدخل الاسم والفئة والسعر.");
    return;
  }

  const imgEl = document.querySelector("#upload-preview img");

  const productData = {
    name,
    cat,
    price,
    quantity,
    imageUrl: imgEl ? imgEl.dataset.dataurl : null,
  };

  try {
    await addDoc(collection(db, "Product"), productData);
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
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("prod-category").value = "";
  document.getElementById("upload-preview").innerHTML = "";
  document.getElementById("file-input").value = "";
}

async function updateProduct(id) {
  const name = document.getElementById("prod-name").value.trim();
  const cat = document.getElementById("prod-category").value;
  const price = parseFloat(document.getElementById("prod-price").value);
  const quantity = parseInt(document.getElementById("prod-quantity").value) || 0;

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
    document.getElementById("admin-prod-count").textContent = getAllProducts().length;
    document.getElementById("prod-list-count").textContent = getAllProducts().length;
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
    <div style="background:var(--dark2,#1a1a1a);border:1px solid rgba(201,168,76,0.3);padding:32px;width:100%;max-width:480px;position:relative;direction:rtl;font-family:'Tajawal',sans-serif;margin:auto">
      <button onclick="document.getElementById('edit-modal').remove()" style="position:absolute;top:14px;left:16px;background:transparent;border:none;color:var(--gray,#888);font-size:20px;cursor:pointer">✕</button>
      <div style="font-size:20px;color:var(--gold,#c9a84c);margin-bottom:24px;letter-spacing:1px">✏ تعديل المنتج</div>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">اسم المنتج</label>
      <input id="edit-prod-name" value="${p.name || ''}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">الفئة</label>
      <select id="edit-prod-cat" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box">
        ${["chandelier","pendant","wall","floor","outdoor","table"].map(c => `<option value="${c}" ${p.cat===c?"selected":""}>${catLabel(c)}</option>`).join("")}
      </select>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">السعر (جنيه)</label>
      <input id="edit-prod-price" type="number" value="${p.price || ''}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">الكمية</label>
      <input id="edit-prod-qty" type="number" value="${p.quantity || 0}" style="width:100%;padding:10px 14px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--white,#fff);font-family:'Tajawal',sans-serif;font-size:14px;margin-bottom:16px;box-sizing:border-box"/>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">الصورة الحالية</label>
      <div id="edit-img-preview" style="width:100%;height:120px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;margin-bottom:10px;overflow:hidden">
        ${p.imageUrl
          ? `<img id="edit-current-img" src="${p.imageUrl}" style="max-height:120px;max-width:100%;object-fit:contain"/>`
          : `<span id="edit-current-img" style="color:var(--gray,#888);font-size:13px">لا توجد صورة</span>`
        }
      </div>

      <label style="display:block;font-size:12px;color:var(--gray,#888);margin-bottom:6px;letter-spacing:1px">رفع صورة جديدة (اختياري)</label>
      <input type="file" id="edit-file-input" accept="image/*" onchange="handleEditImageUpload(event)" style="width:100%;padding:8px;background:var(--dark3,#111);border:1px solid rgba(255,255,255,0.1);color:var(--gray,#888);font-family:'Tajawal',sans-serif;font-size:13px;margin-bottom:6px;box-sizing:border-box;cursor:pointer"/>
      <button onclick="clearEditImage('${p.imageUrl || ''}')" style="width:100%;padding:7px;background:transparent;border:1px solid rgba(255,80,80,0.3);color:#ff6b6b;font-family:'Tajawal',sans-serif;font-size:12px;cursor:pointer;margin-bottom:24px">
        🗑 إزالة الصورة الحالية
      </button>

      <button onclick="saveEditProduct('${id}')" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--gold-dark,#a07830),var(--gold,#c9a84c));color:var(--dark,#0a0a0a);border:none;font-family:'Tajawal',sans-serif;font-size:15px;cursor:pointer;font-weight:700">
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
        value: data.valueFormatted || (data.value ? fmtP(data.value) : "غير محدد"),
        status: data.status || "new",
        date: data.date || "",
        email: data.email || "",
        phone: data.phone || "غير محدد",
        desc: data.desc || "",
      });
    });
    // Merge: firebase orders first, keep any local-only ones
    const localOnly = orders.filter((o) => !o.firestoreId);
    orders = [...firebaseOrders, ...localOnly];
  } catch (error) {
    console.error("فشل تحميل الطلبات:", error);
  }
}
// ===== SAVE EDIT FROM MODAL =====
async function saveEditProduct(id) {
  const name = document.getElementById("edit-prod-name").value.trim();
  const cat = document.getElementById("edit-prod-cat").value;
  const price = parseFloat(document.getElementById("edit-prod-price").value);
  const quantity = parseInt(document.getElementById("edit-prod-qty").value) || 0;

  if (!name || !cat || !price) {
    showNotif("⚠", "حقول ناقصة", "من فضلك أدخل جميع البيانات");
    return;
  }

  // Get image: new upload takes priority, then existing, then null if cleared
  const imgEl = document.querySelector("#edit-img-preview img");
  const imageUrl = imgEl
    ? (imgEl.dataset.dataurl || imgEl.getAttribute("src"))
    : null;

  try {
    await updateDoc(doc(db, "Product", id), {
      name, cat, price, quantity, imageUrl,
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