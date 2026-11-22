import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  doc,
  updateDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- KONFIGURASI FIREBASE PROJECT ---
const firebaseConfig = {
  apiKey: "AIzaSyA3x9grxeVu_a1_BFY_1EfEtwA-rGE7LFA",
  authDomain: "manajemen-operasional-umkm.firebaseapp.com",
  projectId: "manajemen-operasional-umkm",
  storageBucket: "manajemen-operasional-umkm.firebasestorage.app",
  messagingSenderId: "139605713066",
  appId: "1:139605713066:web:610a6cc1cb5ba1fd0fb0d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- HELPER KEAMANAN (SHA-256 & SANITASI XSS) ---
async function hashPasswordSHA256(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isAlreadyHashed(str) {
  return typeof str === "string" && /^[a-f0-9]{64}$/i.test(str);
}

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- CEK SESI LOGIN AKTIF ---
const activeTenantId = sessionStorage.getItem("umkm_active_tenant");
if (!activeTenantId) {
  window.location.href = "index.html";
}

const tenantDocRef = doc(db, "umkm_tenants", activeTenantId || "admin");

// --- STATE DATA REAL-TIME ---
let products = [];
let customers = [];
let orders = [];
let expenses = [];

let ownerAccount = {
  storeName: "UMKM Digital Kuliner",
  ownerName: "Administrator Utama",
  username: activeTenantId || "admin",
  password: "",
  phone: "-",
  address: "Kota Medan",
  logoData: "",
};

// --- HELPER TANGGAL HARI INI & FORMATTER ---
function getTodayISOString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTransactionDateFromInput(isoDateStr) {
  const now = new Date();
  const timePart = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}.${String(now.getSeconds()).padStart(2, "0")}`;

  if (isoDateStr && isoDateStr.includes("-")) {
    const [year, month, day] = isoDateStr.split("-");
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}, ${timePart}`;
  }
  return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${timePart}`;
}

function initDefaultDates() {
  const todayISO = getTodayISOString();

  const orderDateInput = document.getElementById("order-date");
  if (orderDateInput && !orderDateInput.value) orderDateInput.value = todayISO;

  const expenseDateInput = document.getElementById("expense-date");
  if (expenseDateInput && !expenseDateInput.value)
    expenseDateInput.value = todayISO;

  const filterExpPeriode = document.getElementById("filter-exp-periode");
  const filterExpTanggal = document.getElementById("filter-exp-tanggal");
  const expDateWrapper = document.getElementById("exp-date-picker-wrapper");
  if (filterExpPeriode) filterExpPeriode.value = "harian";
  if (filterExpTanggal && !filterExpTanggal.value)
    filterExpTanggal.value = todayISO;
  if (expDateWrapper) expDateWrapper.style.display = "inline-block";

  const filterPeriode = document.getElementById("filter-periode");
  const filterTanggal = document.getElementById("filter-tanggal");
  const dateWrapper = document.getElementById("date-picker-wrapper");
  if (filterPeriode) filterPeriode.value = "harian";
  if (filterTanggal && !filterTanggal.value) filterTanggal.value = todayISO;
  if (dateWrapper) dateWrapper.style.display = "inline-block";
}

// --- SIMPAN & SINKRONISASI DATA KE CLOUD FIRESTORE ---
async function saveData() {
  populateCustomerDatalist();
  loadAccountSettingsUI();
  try {
    await updateDoc(tenantDocRef, {
      products: products,
      customers: customers,
      orders: orders,
      expenses: expenses,
    });
  } catch (error) {
    console.error("Gagal menyinkronkan data ke Firestore:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal Sinkronisasi Cloud",
      text: "Periksa koneksi internet Anda: " + error.message,
      confirmButtonColor: "#ef4444",
    });
  }
}

async function saveAccountDataToCloud() {
  loadAccountSettingsUI();
  try {
    await updateDoc(tenantDocRef, {
      account: ownerAccount,
    });
  } catch (error) {
    console.error("Gagal menyimpan akun ke Firestore:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan Akun",
      text: error.message,
      confirmButtonColor: "#ef4444",
    });
  }
}

// --- LISTENER REAL-TIME MULTI-DEVICE ---
function initRealtimeSync() {
  initDefaultDates();

  onSnapshot(
    tenantDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        products = Array.isArray(cloudData.products) ? cloudData.products : [];
        customers = Array.isArray(cloudData.customers)
          ? cloudData.customers
          : [];
        orders = Array.isArray(cloudData.orders) ? cloudData.orders : [];
        expenses = Array.isArray(cloudData.expenses) ? cloudData.expenses : [];
        if (cloudData.account) {
          ownerAccount = { ...ownerAccount, ...cloudData.account };
        }

        populateProductDropdown();
        populateCustomerDatalist();
        loadAccountSettingsUI();
        renderDashboard();
        renderCustomers();
        renderStock();
        renderPengeluaran();
        renderLaporan();
      } else {
        sessionStorage.removeItem("umkm_active_tenant");
        window.location.href = "index.html";
      }
    },
    (error) => {
      console.error("Realtime listener error:", error);
    },
  );
}

// --- HELPER GENERATOR ID & NOMOR ORDER BERURUTAN ---
function generateNextOrderId() {
  let maxOrderNum = 0;
  orders.forEach((o) => {
    if (o.id && o.id.startsWith("ORD-")) {
      const numPart = parseInt(o.id.replace("ORD-", ""), 10);
      if (!isNaN(numPart) && numPart > maxOrderNum) {
        maxOrderNum = numPart;
      }
    }
  });
  return `ORD-${String(maxOrderNum + 1).padStart(3, "0")}`;
}

function resolveCustomerId(rawInput, custName) {
  let cleanedInput = rawInput.trim().toUpperCase();

  if (cleanedInput) {
    const mejaMatch = cleanedInput.match(/^MEJA[\s\-]*(\d+)$/);
    if (mejaMatch) {
      return `MEJA-${mejaMatch[1].padStart(2, "0")}`;
    }
    return cleanedInput;
  }

  const existingByName = customers.find(
    (c) =>
      c.name &&
      c.name.trim().toLowerCase() === custName.trim().toLowerCase() &&
      c.phone &&
      c.phone.startsWith("CUST-"),
  );
  if (existingByName) {
    return existingByName.phone;
  }

  let maxCustNum = 0;
  customers.forEach((c) => {
    if (c.phone && c.phone.startsWith("CUST-")) {
      const numPart = parseInt(c.phone.replace("CUST-", ""), 10);
      if (!isNaN(numPart) && numPart > maxCustNum) {
        maxCustNum = numPart;
      }
    }
  });

  return `CUST-${String(maxCustNum + 1).padStart(3, "0")}`;
}

function generateNextProductId() {
  let maxProdNum = 0;
  products.forEach((p) => {
    if (p.id && p.id.startsWith("PRD-")) {
      const numPart = parseInt(p.id.replace("PRD-", ""), 10);
      if (!isNaN(numPart) && numPart > maxProdNum) {
        maxProdNum = numPart;
      }
    }
  });
  return `PRD-${String(maxProdNum + 1).padStart(3, "0")}`;
}

function generateNextExpenseId() {
  let maxExpNum = 0;
  expenses.forEach((exp) => {
    if (exp.id && exp.id.startsWith("EXP-")) {
      const numPart = parseInt(exp.id.replace("EXP-", ""), 10);
      if (!isNaN(numPart) && numPart > maxExpNum) {
        maxExpNum = numPart;
      }
    }
  });
  return `EXP-${String(maxExpNum + 1).padStart(3, "0")}`;
}

// --- PENGATURAN AKUN & MANAJEMEN LOGO OPSIONAL ---
function applyLogoVisibility() {
  const logoSrc = ownerAccount.logoData || "";
  const hasLogo = logoSrc.trim() !== "";

  const sidebarLogo = document.getElementById("sidebar-header-logo");
  const mobileLogo = document.getElementById("mobile-header-logo");
  const profileLogo = document.getElementById("account-profile-logo");
  const bgWatermark = document.getElementById("dashboard-bg-watermark");
  const btnRemoveLogo = document.getElementById("btn-remove-logo");

  if (hasLogo) {
    if (sidebarLogo) {
      sidebarLogo.src = logoSrc;
      sidebarLogo.style.display = "block";
    }
    if (mobileLogo) {
      mobileLogo.src = logoSrc;
      mobileLogo.style.display = "block";
    }
    if (profileLogo) {
      profileLogo.src = logoSrc;
      profileLogo.style.display = "block";
    }
    if (bgWatermark) {
      bgWatermark.style.backgroundImage = `url('${logoSrc}')`;
      bgWatermark.style.display = "block";
    }
    if (btnRemoveLogo) btnRemoveLogo.style.display = "inline-flex";
  } else {
    if (sidebarLogo) sidebarLogo.style.display = "none";
    if (mobileLogo) mobileLogo.style.display = "none";
    if (profileLogo) profileLogo.style.display = "none";
    if (bgWatermark) bgWatermark.style.display = "none";
    if (btnRemoveLogo) btnRemoveLogo.style.display = "none";
  }
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 600 * 1024) {
    Swal.fire({
      icon: "warning",
      title: "Ukuran Logo Terlalu Besar",
      text: "Gunakan gambar logo di bawah 600 KB agar sinkronisasi tetap cepat.",
      confirmButtonColor: "#059669",
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    ownerAccount.logoData = e.target.result;
    await saveAccountDataToCloud();
    applyLogoVisibility();
    Swal.fire({
      icon: "success",
      title: "Logo Terpasang!",
      text: "Logo usaha berhasil diubah.",
      confirmButtonColor: "#059669",
    });
  };
  reader.readAsDataURL(file);
}

async function removeStoreLogo() {
  ownerAccount.logoData = "";
  await saveAccountDataToCloud();
  applyLogoVisibility();
  Swal.fire({
    icon: "info",
    title: "Logo Dihapus",
    text: "Tampilan kembali bersih tanpa logo.",
    confirmButtonColor: "#059669",
  });
}

function loadAccountSettingsUI() {
  if (document.getElementById("sidebar-store-title")) {
    document.getElementById("sidebar-store-title").innerText =
      ownerAccount.storeName || "UMKM Digital";
  }
  if (document.getElementById("mobile-store-title")) {
    document.getElementById("mobile-store-title").innerText =
      ownerAccount.storeName || "UMKM Digital";
  }
  if (document.getElementById("owner-store-name")) {
    document.getElementById("owner-store-name").innerText =
      ownerAccount.storeName || "UMKM Digital Kuliner";
  }
  if (document.getElementById("owner-account-subtitle")) {
    document.getElementById("owner-account-subtitle").innerText =
      `Pemilik: ${ownerAccount.ownerName} • Cloud Sync Aktif`;
  }
  if (document.getElementById("acc-store-name"))
    document.getElementById("acc-store-name").value =
      ownerAccount.storeName || "";
  if (document.getElementById("acc-owner-name"))
    document.getElementById("acc-owner-name").value =
      ownerAccount.ownerName || "";
  if (document.getElementById("acc-phone"))
    document.getElementById("acc-phone").value = ownerAccount.phone || "";
  if (document.getElementById("acc-address"))
    document.getElementById("acc-address").value = ownerAccount.address || "";
  if (document.getElementById("acc-username")) {
    document.getElementById("acc-username").value =
      ownerAccount.username || activeTenantId;
    document.getElementById("acc-username").readOnly = true;
  }

  if (document.getElementById("acc-data-summary")) {
    document.getElementById("acc-data-summary").innerText =
      `${products.length} Produk • ${customers.length} Pelanggan • ${orders.length} Transaksi`;
  }

  applyLogoVisibility();
}

async function saveAccountProfile(e) {
  e.preventDefault();
  ownerAccount.storeName = document
    .getElementById("acc-store-name")
    .value.trim();
  ownerAccount.ownerName = document
    .getElementById("acc-owner-name")
    .value.trim();
  ownerAccount.phone = document.getElementById("acc-phone").value.trim();
  ownerAccount.address = document.getElementById("acc-address").value.trim();

  await saveAccountDataToCloud();

  Swal.fire({
    icon: "success",
    title: "Profil Disimpan!",
    text: "Informasi profil usaha UMKM berhasil diperbarui.",
    confirmButtonColor: "#059669",
  });
}

// --- UPDATE PASSWORD DENGAN VERIFIKASI SHA-256 ---
async function updateAccountPassword(e) {
  e.preventDefault();
  const oldPass = document.getElementById("acc-old-password").value;
  const newPass = document.getElementById("acc-new-password").value;
  const confirmPass = document.getElementById("acc-confirm-password").value;

  if (!oldPass) {
    Swal.fire({
      icon: "warning",
      title: "Password Lama Kosong",
      text: "Masukkan password lama Anda terlebih dahulu untuk verifikasi.",
      confirmButtonColor: "#2563eb",
    });
    return;
  }

  const hashedOldPass = await hashPasswordSHA256(oldPass);
  const isOldMatch =
    ownerAccount.password === hashedOldPass ||
    (!isAlreadyHashed(ownerAccount.password) &&
      ownerAccount.password === oldPass);

  if (!isOldMatch) {
    Swal.fire({
      icon: "error",
      title: "Password Lama Salah",
      text: "Password lama yang Anda masukkan tidak sesuai.",
      confirmButtonColor: "#ef4444",
    });
    return;
  }

  if (!newPass) {
    Swal.fire({
      icon: "warning",
      title: "Password Baru Kosong",
      text: "Silakan masukkan password baru yang diinginkan.",
      confirmButtonColor: "#2563eb",
    });
    return;
  }

  if (newPass === oldPass) {
    Swal.fire({
      icon: "info",
      title: "Password Sama",
      text: "Password baru tidak boleh sama dengan password lama.",
      confirmButtonColor: "#2563eb",
    });
    return;
  }

  if (newPass !== confirmPass) {
    Swal.fire({
      icon: "error",
      title: "Konfirmasi Tidak Sama",
      text: "Konfirmasi password baru harus cocok dengan password baru.",
      confirmButtonColor: "#ef4444",
    });
    return;
  }

  ownerAccount.password = await hashPasswordSHA256(newPass);
  await saveAccountDataToCloud();
  document.getElementById("acc-old-password").value = "";
  document.getElementById("acc-new-password").value = "";
  document.getElementById("acc-confirm-password").value = "";

  Swal.fire({
    icon: "success",
    title: "Password Diperbarui!",
    text: "Password login baru berhasil dienkripsi dan disimpan.",
    confirmButtonColor: "#2563eb",
  });
}

function confirmLogout() {
  Swal.fire({
    title: "Keluar dari Akun?",
    text: "Anda akan diarahkan kembali ke halaman login.",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Log Out",
    cancelButtonText: "Batal",
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.removeItem("umkm_active_tenant");
      window.location.href = "index.html";
    }
  });
}

// --- AUTO-FILL NAMA PELANGGAN SAAT ID UNIK DIMASUKKAN ---
function populateCustomerDatalist() {
  const datalist = document.getElementById("customer-id-list");
  if (!datalist) return;
  datalist.innerHTML = "";
  customers.forEach((c) => {
    if (c.phone) {
      datalist.innerHTML += `<option value="${escapeHTML(c.phone)}">${escapeHTML(c.name)} (${escapeHTML(c.address || "Pelanggan")})</option>`;
    }
  });
}

function autoFillCustomerName() {
  const idInput = document.getElementById("cust-phone");
  const nameInput = document.getElementById("cust-name");
  const typeSelect = document.getElementById("order-type");
  if (!idInput || !nameInput) return;

  const enteredId = idInput.value.trim().toLowerCase();
  if (!enteredId) return;

  const matchedCustomer = customers.find(
    (c) => c.phone && c.phone.trim().toLowerCase() === enteredId,
  );
  if (matchedCustomer) {
    nameInput.value = matchedCustomer.name;
    if (typeSelect && matchedCustomer.address) {
      const validTypes = ["Dine-In", "Takeaway", "Delivery"];
      if (validTypes.includes(matchedCustomer.address)) {
        typeSelect.value = matchedCustomer.address;
      }
    }
  }
}

// --- NAVIGASI MULTI-PLATFORM ---
function showSection(sectionId) {
  document
    .querySelectorAll(".page-section")
    .forEach((sec) => sec.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((link) => link.classList.remove("active"));
  document
    .querySelectorAll(".bottom-nav-item")
    .forEach((btn) => btn.classList.remove("active"));

  const mobileTopAccountBtn = document.getElementById("mobile-top-account-btn");
  if (mobileTopAccountBtn) {
    if (sectionId === "akun") mobileTopAccountBtn.classList.add("active");
    else mobileTopAccountBtn.classList.remove("active");
  }

  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.add("active");

  const activeSidebarLink = document.querySelector(
    `.sidebar a[href="#${sectionId}"]`,
  );
  if (activeSidebarLink) activeSidebarLink.classList.add("active");

  const activeBottomNav = document.querySelector(
    `.bottom-nav-item[onclick*="${sectionId}"]`,
  );
  if (activeBottomNav) activeBottomNav.classList.add("active");

  renderDashboard();
  renderCustomers();
  renderStock();
  renderPengeluaran();
  renderLaporan();
  loadAccountSettingsUI();
}

// --- MULTI-MENU OPERASIONAL KULINER ---
function getProductOptionsHTML() {
  if (products.length === 0) {
    return `<option value="">-- Belum Ada Menu (Tambah di Stok) --</option>`;
  }
  let html = '<option value="">-- Pilih Menu Kuliner --</option>';
  products.forEach((p) => {
    const safeName = escapeHTML(p.name);
    html += `<option value="${escapeHTML(p.id)}" data-price="${p.price}" data-name="${safeName}" data-stock="${p.stock}">${safeName} (Stok: ${p.stock}) - Rp ${p.price.toLocaleString("id-ID")}</option>`;
  });
  return html;
}

function populateProductDropdown() {
  document.querySelectorAll(".item-product-select").forEach((select) => {
    const currentVal = select.value;
    select.innerHTML = getProductOptionsHTML();
    select.value = currentVal;
  });
  calculateTotalOrder();
}

function changeQty(btn, delta) {
  const qtyInput = btn.parentElement.querySelector(".item-qty-input");
  if (qtyInput) {
    let currentVal = parseInt(qtyInput.value) || 1;
    currentVal += delta;
    if (currentVal < 1) currentVal = 1;
    qtyInput.value = currentVal;
    calculateTotalOrder();
  }
}

function addOrderItemRow() {
  const container = document.getElementById("order-items-container");
  if (!container) return;

  const newRow = document.createElement("div");
  newRow.className = "order-item-row";
  newRow.innerHTML = `
        <div class="item-row-header">
            <select class="item-product-select styled-input" required onchange="calculateTotalOrder()">
                ${getProductOptionsHTML()}
            </select>
            <button type="button" class="btn-remove-item-card" onclick="removeOrderItemRow(this)" title="Hapus Item">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        
        <div class="item-row-details">
            <div class="qty-control">
                <span class="qty-label">Qty:</span>
                <button type="button" class="btn-qty" onclick="changeQty(this, -1)">-</button>
                <input type="number" class="item-qty-input styled-input" min="1" value="1" required placeholder="1" onchange="calculateTotalOrder()">
                <button type="button" class="btn-qty" onclick="changeQty(this, 1)">+</button>
            </div>
            <div class="note-control">
                <input type="text" class="item-note-input styled-input" placeholder="Catatan (ex: Pedas / Tanpa Es)">
            </div>
        </div>
    `;
  container.appendChild(newRow);
  calculateTotalOrder();
}

function removeOrderItemRow(btn) {
  const rows = document.querySelectorAll(".order-item-row");
  if (rows.length > 1) {
    btn.closest(".order-item-row").remove();
    calculateTotalOrder();
  } else {
    Swal.fire({
      icon: "warning",
      title: "Minimal 1 Menu",
      text: "Pesanan harus berisi minimal satu menu.",
    });
  }
}

function calculateTotalOrder() {
  let total = 0;
  document.querySelectorAll(".order-item-row").forEach((row) => {
    const select = row.querySelector(".item-product-select");
    const qtyInput = row.querySelector(".item-qty-input");

    if (select && select.selectedIndex > 0) {
      const selectedOption = select.options[select.selectedIndex];
      const price = parseInt(selectedOption.getAttribute("data-price")) || 0;
      const qty = parseInt(qtyInput ? qtyInput.value : 1) || 0;
      total += price * qty;
    }
  });

  const previewElem = document.getElementById("order-total-preview");
  if (previewElem)
    previewElem.innerText = "Rp " + total.toLocaleString("id-ID");
}

function populateReportProductFilter() {
  const filterProductSelect = document.getElementById("filter-produk");
  if (!filterProductSelect) return;

  const currentVal = filterProductSelect.value || "semua";
  filterProductSelect.innerHTML = '<option value="semua">Semua Produk</option>';

  products.forEach((p) => {
    filterProductSelect.innerHTML += `<option value="${escapeHTML(p.name.toLowerCase())}">${escapeHTML(p.name)}</option>`;
  });

  filterProductSelect.value = currentVal;
}

// --- FITUR STRUK / NOTA DIGITAL & SALIN WHATSAPP (OPSI 1) ---
function buildReceiptPlainText(order) {
  const storeName = (
    ownerAccount.storeName || "UMKM DIGITAL KULINER"
  ).toUpperCase();
  const storeAddress =
    ownerAccount.address && ownerAccount.address !== "-"
      ? ownerAccount.address
      : "";
  const storePhone =
    ownerAccount.phone && ownerAccount.phone !== "-" ? ownerAccount.phone : "";
  const payMethod = order.paymentMethod || "Tunai (Cash)";

  let lines = [];
  lines.push(`*${storeName}*`);
  if (storeAddress) lines.push(storeAddress);
  if (storePhone) lines.push(`Telp/WA: ${storePhone}`);
  lines.push("--------------------------------");
  lines.push(`No Order : ${order.id}`);
  lines.push(`Tanggal  : ${order.date || "-"}`);
  lines.push(`Pelanggan: ${order.customer}`);
  lines.push(`ID/Meja  : ${order.phone || "-"}`);
  lines.push(`Channel  : ${order.channel}`);
  lines.push(`Bayar    : ${payMethod}`);
  lines.push("--------------------------------");

  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach((item) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
      lines.push(`${item.productName}`);
      lines.push(
        `  ${item.qty} x Rp ${Number(item.price).toLocaleString("id-ID")} = Rp ${subtotal.toLocaleString("id-ID")}`,
      );
      if (item.note) {
        lines.push(`  Catatan: ${item.note}`);
      }
    });
  } else {
    lines.push(`${order.product}`);
  }

  lines.push("--------------------------------");
  lines.push(`*TOTAL BAYAR: Rp ${Number(order.price).toLocaleString("id-ID")}*`);
  lines.push(`Status: ${order.status}`);
  lines.push("--------------------------------");
  lines.push("Terima kasih atas pesanan Anda!");

  return lines.join("\n");
}

function openReceiptModal(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const storeName = escapeHTML(
    ownerAccount.storeName || "UMKM Digital Kuliner",
  );
  const storeAddress =
    ownerAccount.address && ownerAccount.address !== "-"
      ? escapeHTML(ownerAccount.address)
      : "";
  const storePhone =
    ownerAccount.phone && ownerAccount.phone !== "-"
      ? escapeHTML(ownerAccount.phone)
      : "";
  const payMethod = escapeHTML(order.paymentMethod || "Tunai (Cash)");

  let itemsHtml = "";
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    itemsHtml = order.items
      .map((item) => {
        const subtotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
        return `
          <div style="margin-bottom: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px;">
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(item.productName)}</div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569;">
              <span>${item.qty} x Rp ${Number(item.price).toLocaleString("id-ID")}</span>
              <span style="font-weight: 600; color: #0f172a;">Rp ${subtotal.toLocaleString("id-ID")}</span>
            </div>
            ${item.note ? `<div style="font-size: 12px; color: #64748b; font-style: italic;">Catatan: ${escapeHTML(item.note)}</div>` : ""}
          </div>
        `;
      })
      .join("");
  } else {
    itemsHtml = `<div style="font-size: 13px; color: #0f172a; margin-bottom: 8px;">${escapeHTML(order.product)}</div>`;
  }

  const receiptHtml = `
    <div id="printable-receipt-box" style="text-align: left; font-family: 'Courier New', Courier, monospace; background: #ffffff; border: 1px dashed #94a3b8; border-radius: 10px; padding: 16px; max-height: 62vh; overflow-y: auto;">
      <div style="text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 10px;">
        <div style="font-weight: 800; font-size: 16px; color: #0f172a;">${storeName.toUpperCase()}</div>
        ${storeAddress ? `<div style="font-size: 12px; color: #475569;">${storeAddress}</div>` : ""}
        ${storePhone ? `<div style="font-size: 12px; color: #475569;">Telp/WA: ${storePhone}</div>` : ""}
      </div>

      <div style="font-size: 12px; color: #334155; line-height: 1.5; border-bottom: 1px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 10px;">
        <div><b>No Order :</b> ${escapeHTML(order.id)}</div>
        <div><b>Tanggal  :</b> ${escapeHTML(order.date || "-")}</div>
        <div><b>Customer :</b> ${escapeHTML(order.customer)}</div>
        <div><b>ID/Meja  :</b> ${escapeHTML(order.phone || "-")}</div>
        <div><b>Channel  :</b> ${escapeHTML(order.channel)}</div>
        <div><b>Bayar    :</b> ${payMethod}</div>
      </div>

      <div style="margin-bottom: 10px;">
        ${itemsHtml}
      </div>

      <div style="border-top: 1px dashed #94a3b8; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 15px; color: #059669;">
        <span>TOTAL BAYAR</span>
        <span>Rp ${Number(order.price).toLocaleString("id-ID")}</span>
      </div>
      <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 12px;">
        Status: <b>${escapeHTML(order.status)}</b><br>
        Terima kasih atas pesanan Anda!
      </div>
    </div>

    <div style="display: flex; gap: 8px; margin-top: 14px; justify-content: center; flex-wrap: wrap;">
      <button type="button" id="btn-copy-wa-receipt" class="btn-sm" style="background-color: #16a34a; color: #ffffff; padding: 10px 14px; font-size: 13px; border-radius: 8px;">
        <i class="fa-brands fa-whatsapp"></i> Salin Teks Nota WA
      </button>
      <button type="button" id="btn-print-receipt" class="btn-sm" style="background-color: #2563eb; color: #ffffff; padding: 10px 14px; font-size: 13px; border-radius: 8px;">
        <i class="fa-solid fa-print"></i> Cetak / Print Struk
      </button>
    </div>
  `;

  Swal.fire({
    title:
      '<div class="swal-custom-title"><i class="fa-solid fa-receipt" style="color:#059669;"></i> Struk Pesanan</div>',
    html: receiptHtml,
    showConfirmButton: true,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#64748b",
    customClass: {
      popup: "swal2-popup-modern",
    },
    didOpen: () => {
      const btnCopy = document.getElementById("btn-copy-wa-receipt");
      const btnPrint = document.getElementById("btn-print-receipt");

      if (btnCopy) {
        btnCopy.addEventListener("click", async () => {
          const plainText = buildReceiptPlainText(order);
          try {
            await navigator.clipboard.writeText(plainText);
            btnCopy.innerHTML =
              '<i class="fa-solid fa-check"></i> Tersalin! Siap Paste ke WA';
            btnCopy.style.backgroundColor = "#047857";
            setTimeout(() => {
              btnCopy.innerHTML =
                '<i class="fa-brands fa-whatsapp"></i> Salin Teks Nota WA';
              btnCopy.style.backgroundColor = "#16a34a";
            }, 2200);
          } catch (err) {
            const tempArea = document.createElement("textarea");
            tempArea.value = plainText;
            document.body.appendChild(tempArea);
            tempArea.select();
            document.execCommand("copy");
            document.body.removeChild(tempArea);
            btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
          }
        });
      }

      if (btnPrint) {
        btnPrint.addEventListener("click", () => {
          const receiptContent = document.getElementById(
            "printable-receipt-box",
          ).innerHTML;
          const printWin = window.open("", "_blank", "width=380,height=600");
          if (!printWin) {
            Swal.showValidationMessage(
              "Pop-up diblokir browser. Izinkan pop-up untuk mencetak struk.",
            );
            return;
          }
          printWin.document.write(`
            <!doctype html>
            <html>
              <head>
                <title>Struk ${escapeHTML(order.id)}</title>
                <style>
                  body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 280px;
                    margin: 0 auto;
                    padding: 12px;
                    color: #000;
                  }
                  @media print {
                    body { width: 100%; margin: 0; padding: 4px; }
                  }
                </style>
              </head>
              <body>
                ${receiptContent}
                <script>
                  window.onload = function() {
                    window.print();
                    window.close();
                  };
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
        });
      }
    },
  });
}

// --- RENDER DASHBOARD & MOBILE CARDS (PESANAN TERBARU DI PALING ATAS) ---
function renderDashboard() {
  const tableBody = document.getElementById("order-table-body");
  const mobileCards = document.getElementById("order-cards-mobile");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (mobileCards) mobileCards.innerHTML = "";

  const searchQuery = document.getElementById("search-order")
    ? document.getElementById("search-order").value.toLowerCase()
    : "";

  let totalOrders = orders.length;
  let newOrders = 0,
    processOrders = 0,
    doneOrders = 0,
    totalOmzet = 0;
  let productSalesCount = {};

  let filteredOrders = orders
    .filter(
      (o) =>
        o.id.toLowerCase().includes(searchQuery) ||
        o.customer.toLowerCase().includes(searchQuery) ||
        (o.phone && o.phone.toLowerCase().includes(searchQuery)),
    )
    .sort((a, b) => {
      const numA = parseInt((a.id || "").replace("ORD-", ""), 10) || 0;
      const numB = parseInt((b.id || "").replace("ORD-", ""), 10) || 0;
      return numB - numA;
    });

  filteredOrders.forEach((o) => {
    if (o.status === "Baru") newOrders++;
    if (o.status === "Diproses") processOrders++;
    if (o.status === "Selesai") {
      doneOrders++;
      totalOmzet += o.price;
    }

    if (o.items && Array.isArray(o.items)) {
      o.items.forEach((item) => {
        productSalesCount[item.productName] =
          (productSalesCount[item.productName] || 0) + item.qty;
      });
    } else {
      productSalesCount[o.product] =
        (productSalesCount[o.product] || 0) + o.qty;
    }

    let badgeClass =
      o.status === "Baru"
        ? "badge-baru"
        : o.status === "Diproses"
          ? "badge-proses"
          : "badge-selesai";

    const paymentMethodLabel = escapeHTML(o.paymentMethod || "Tunai (Cash)");
    const safeId = escapeHTML(o.id);
    const safeDate = escapeHTML(o.date ? o.date.split(",")[0] : "");
    const safeCust = escapeHTML(o.customer);
    const safePhone = escapeHTML(o.phone || "-");
    const safeProd = escapeHTML(o.product);
    const safeChannel = escapeHTML(o.channel);
    const safeStatus = escapeHTML(o.status);

    tableBody.innerHTML += `
            <tr>
                <td><b>${safeId}</b><br><small style="color:#64748b;">${safeDate}</small></td>
                <td>${safeCust}</td>
                <td><span class="channel-tag">${safePhone}</span></td>
                <td>${safeProd}</td>
                <td>
                  <span class="channel-tag">${safeChannel}</span>
                  <div style="margin-top:4px;"><span class="payment-tag">${paymentMethodLabel}</span></div>
                </td>
                <td><span class="badge ${badgeClass}">${safeStatus}</span></td>
                <td>
                    <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
                      ${o.status !== "Selesai" ? `<button type="button" class="btn-sm btn-status" onclick="nextStatus('${safeId}')"><i class="fa-solid fa-arrows-rotate"></i> Ubah Status</button>` : '<span style="color:#059669; font-weight:bold; font-size:12px; margin-right:4px;">Selesai</span>'}
                      <button type="button" class="btn-sm" style="background-color:#059669; color:white;" onclick="openReceiptModal('${safeId}')" title="Lihat / Cetak Struk"><i class="fa-solid fa-receipt"></i> Struk</button>
                      <button type="button" class="btn-sm" style="background-color:#ef4444; color:white;" onclick="cancelOrder('${safeId}')"><i class="fa-solid fa-trash"></i> Batal</button>
                    </div>
                </td>
            </tr>
        `;

    if (mobileCards) {
      mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${safeId} - ${safeCust}</span>
                        <span class="badge ${badgeClass}">${safeStatus}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Tanggal:</b> ${safeDate || "-"} | <b>Ref/Meja:</b> ${safePhone}</div>
                        <div><b>Produk:</b> ${safeProd}</div>
                        <div><b>Channel:</b> ${safeChannel} | <b>Bayar:</b> <span class="payment-tag">${paymentMethodLabel}</span></div>
                        <div><b>Total:</b> Rp ${o.price.toLocaleString("id-ID")}</div>
                    </div>
                    <div class="mobile-card-footer">
                        ${o.status !== "Selesai" ? `<button type="button" class="btn-sm btn-status" onclick="nextStatus('${safeId}')"><i class="fa-solid fa-arrows-rotate"></i> Status</button>` : '<span style="color:#059669; font-weight:bold; text-align:center; flex:1;">Selesai</span>'}
                        <button type="button" class="btn-sm" style="background-color:#059669; color:white;" onclick="openReceiptModal('${safeId}')"><i class="fa-solid fa-receipt"></i> Struk</button>
                        <button type="button" class="btn-sm" style="background-color:#ef4444; color:white;" onclick="cancelOrder('${safeId}')"><i class="fa-solid fa-trash"></i> Batal</button>
                    </div>
                </div>
            `;
    }
  });

  checkEmptyTable(tableBody, filteredOrders.length, 7, "Tidak ada pesanan.");

  if (document.getElementById("total-pesanan"))
    document.getElementById("total-pesanan").innerText = totalOrders;
  if (document.getElementById("pesanan-baru"))
    document.getElementById("pesanan-baru").innerText = newOrders;
  if (document.getElementById("pesanan-proses"))
    document.getElementById("pesanan-proses").innerText = processOrders;
  if (document.getElementById("pesanan-selesai"))
    document.getElementById("pesanan-selesai").innerText = doneOrders;
  if (document.getElementById("dashboard-omzet"))
    document.getElementById("dashboard-omzet").innerText =
      "Rp " + totalOmzet.toLocaleString("id-ID");

  let topProduct =
    Object.keys(productSalesCount).length > 0
      ? Object.keys(productSalesCount).reduce((a, b) =>
          productSalesCount[a] > productSalesCount[b] ? a : b,
        )
      : "-";
  if (document.getElementById("dashboard-top-product"))
    document.getElementById("dashboard-top-product").innerText = topProduct;
}

// --- FORM SUBMIT PESANAN (TERBARU LANGSUNG DI ATAS) ---
const orderForm = document.getElementById("order-form");
if (orderForm) {
  orderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const orderDateVal = document.getElementById("order-date").value;
    const custNameInput = document.getElementById("cust-name").value.trim();
    const rawPhoneInput = document.getElementById("cust-phone").value;
    const custPhoneInput = resolveCustomerId(rawPhoneInput, custNameInput);

    const orderTypeSelect = document.getElementById("order-type");
    const orderType = orderTypeSelect ? orderTypeSelect.value : "Dine-In";
    const channelSelect = document.getElementById("cust-channel");
    const channel = channelSelect ? channelSelect.value : "Kasir";
    const paymentSelect = document.getElementById("payment-method");
    const paymentMethod = paymentSelect ? paymentSelect.value : "Tunai (Cash)";

    const itemRows = document.querySelectorAll(".order-item-row");
    let orderItems = [];
    let totalOrderPrice = 0;
    let isStockEnough = true;
    let errorMessage = "";

    itemRows.forEach((row) => {
      const select = row.querySelector(".item-product-select");
      const qtyInput = row.querySelector(".item-qty-input");
      const noteInput = row.querySelector(".item-note-input");

      if (select && select.value) {
        const productId = select.value;
        const product = products.find((p) => p.id === productId);
        const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
        const note = noteInput ? noteInput.value.trim() : "";

        if (product) {
          if (product.stock < qty) {
            isStockEnough = false;
            errorMessage = `Stok "${product.name}" kurang! Tersisa ${product.stock} pcs. Silakan tambah stok terlebih dahulu.`;
          } else {
            orderItems.push({
              productId: product.id,
              productName: product.name,
              price: product.price,
              qty,
              note,
            });
            totalOrderPrice += product.price * qty;
          }
        }
      }
    });

    if (!isStockEnough) {
      Swal.fire({
        icon: "error",
        title: "Stok Tidak Cukup",
        text: errorMessage,
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    if (orderItems.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Menu",
        text: "Pilih minimal satu menu.",
      });
      return;
    }

    orderItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) product.stock -= item.qty;
    });

    const formattedDate = formatTransactionDateFromInput(orderDateVal);
    const newOrderId = generateNextOrderId();

    const summaryProductText = orderItems
      .map((i) => `${i.productName} (${i.qty}x)${i.note ? ` [${i.note}]` : ""}`)
      .join(", ");

    orders.unshift({
      id: newOrderId,
      customer: `${custNameInput} (${orderType})`,
      phone: custPhoneInput,
      product: summaryProductText,
      items: orderItems,
      qty: orderItems.reduce((acc, curr) => acc + curr.qty, 0),
      channel,
      paymentMethod,
      status: "Baru",
      price: totalOrderPrice,
      date: formattedDate,
    });

    let existingCust = customers.find(
      (c) =>
        c.phone &&
        c.phone.trim().toLowerCase() === custPhoneInput.toLowerCase(),
    );
    if (existingCust) {
      existingCust.name = custNameInput;
      existingCust.address = orderType;
    } else {
      customers.push({
        phone: custPhoneInput,
        name: custNameInput,
        address: orderType,
        history: 1,
        totalSpent: totalOrderPrice,
      });
    }

    await saveData();

    Swal.fire({
      icon: "success",
      title: "Pesanan Diproses!",
      html: `No Order: <b>${escapeHTML(newOrderId)}</b><br>ID / Meja: <b>${escapeHTML(custPhoneInput)}</b><br>Pembayaran: <b>${escapeHTML(paymentMethod)}</b><br>Total: <b>Rp ${totalOrderPrice.toLocaleString("id-ID")}</b>`,
      confirmButtonColor: "#059669",
    });

    document.getElementById("order-form").reset();
    document.getElementById("order-date").value = getTodayISOString();

    const container = document.getElementById("order-items-container");
    if (container) {
      container.innerHTML = `
                <div class="order-item-row">
                    <div class="item-row-header">
                        <select class="item-product-select styled-input" required onchange="calculateTotalOrder()"></select>
                        <button type="button" class="btn-remove-item-card" onclick="removeOrderItemRow(this)" title="Hapus Item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    
                    <div class="item-row-details">
                        <div class="qty-control">
                            <span class="qty-label">Qty:</span>
                            <button type="button" class="btn-qty" onclick="changeQty(this, -1)">-</button>
                            <input type="number" class="item-qty-input styled-input" min="1" value="1" required placeholder="1" onchange="calculateTotalOrder()">
                            <button type="button" class="btn-qty" onclick="changeQty(this, 1)">+</button>
                        </div>
                        <div class="note-control">
                            <input type="text" class="item-note-input styled-input" placeholder="Catatan (ex: Pedas / Tanpa Es)">
                        </div>
                    </div>
                </div>
            `;
    }

    populateProductDropdown();
    renderDashboard();
    renderCustomers();
    renderStock();
    renderLaporan();
  });
}

// --- PEMBATALAN PESANAN + AUTO HAPUS PELANGGAN ---
function cancelOrder(orderId) {
  Swal.fire({
    title: "Hapus / Batalkan Pesanan?",
    text: "Stok produk akan dikembalikan.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Hapus Pesanan",
    cancelButtonText: "Batal",
  }).then(async (result) => {
    if (result.isConfirmed) {
      const index = orders.findIndex((o) => o.id === orderId);
      if (index !== -1) {
        const order = orders[index];
        const customerRef = order.phone ? order.phone.trim().toLowerCase() : "";

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const product = products.find(
              (p) =>
                p.id === item.productId ||
                p.name.toLowerCase() === item.productName.toLowerCase(),
            );
            if (product) product.stock += item.qty;
          });
        }

        orders.splice(index, 1);

        if (customerRef) {
          const remainingOrders = orders.filter(
            (o) => o.phone && o.phone.trim().toLowerCase() === customerRef,
          );
          if (remainingOrders.length === 0) {
            customers = customers.filter(
              (c) => !(c.phone && c.phone.trim().toLowerCase() === customerRef),
            );
          }
        }

        await saveData();
        Swal.fire("Terhapus!", "Pesanan dibatalkan.", "success");
        renderDashboard();
        renderCustomers();
        renderStock();
        renderLaporan();
      }
    }
  });
}

// --- PENGELUARAN OPERASIONAL + BACKDATE + HAPUS PENGELUARAN (TERBARU DI ATAS) ---
function toggleExpenseDateFilter() {
  const periodeSelect = document.getElementById("filter-exp-periode");
  const datePickerWrapper = document.getElementById("exp-date-picker-wrapper");
  const monthPickerWrapper = document.getElementById(
    "exp-month-picker-wrapper",
  );

  if (periodeSelect && periodeSelect.value === "harian") {
    if (datePickerWrapper) datePickerWrapper.style.display = "inline-block";
    if (monthPickerWrapper) monthPickerWrapper.style.display = "none";
    const tanggalInput = document.getElementById("filter-exp-tanggal");
    if (tanggalInput && !tanggalInput.value) {
      tanggalInput.value = getTodayISOString();
    }
  } else if (periodeSelect && periodeSelect.value === "bulanan") {
    if (datePickerWrapper) datePickerWrapper.style.display = "none";
    if (monthPickerWrapper) monthPickerWrapper.style.display = "inline-block";
    const bulanInput = document.getElementById("filter-exp-bulan");
    if (bulanInput && !bulanInput.value) {
      bulanInput.value = getTodayISOString().slice(0, 7);
    }
  } else {
    if (datePickerWrapper) datePickerWrapper.style.display = "none";
    if (monthPickerWrapper) monthPickerWrapper.style.display = "none";
  }
  renderPengeluaran();
}

async function tambahPengeluaran(e) {
  e.preventDefault();
  const expenseDateVal = document.getElementById("expense-date").value;
  const name = document.getElementById("expense-name").value.trim();
  const category = document.getElementById("expense-category").value;
  const amount = parseInt(document.getElementById("expense-amount").value);

  const formattedDate = formatTransactionDateFromInput(expenseDateVal);
  const newExpId = generateNextExpenseId();

  expenses.unshift({
    id: newExpId,
    name,
    category,
    amount,
    date: formattedDate,
  });
  await saveData();

  Swal.fire({
    icon: "success",
    title: "Pengeluaran Dicatat!",
    confirmButtonColor: "#ef4444",
  });
  document.getElementById("expense-form").reset();
  document.getElementById("expense-date").value = getTodayISOString();

  renderPengeluaran();
  renderLaporan();
}

function deleteExpense(expenseId) {
  const exp = expenses.find((item) => item.id === expenseId);
  if (!exp) return;

  Swal.fire({
    title: "Hapus Pengeluaran?",
    text: `Catatan "${exp.name}" (Rp ${Number(exp.amount).toLocaleString("id-ID")}) akan dihapus permanen.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    customClass: {
      popup: "swal2-popup-modern",
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      expenses = expenses.filter((item) => item.id !== expenseId);
      await saveData();
      renderPengeluaran();
      renderLaporan();

      Swal.fire({
        icon: "success",
        title: "Terhapus!",
        text: "Data pengeluaran berhasil dihapus.",
        timer: 1400,
        showConfirmButton: false,
        customClass: {
          popup: "swal2-popup-modern",
        },
      });
    }
  });
}

function renderPengeluaran() {
  const expenseBody = document.getElementById("detail-pengeluaran-body");
  const mobileCards = document.getElementById("expense-cards-mobile");
  if (!expenseBody) return;

  const periodeVal = document.getElementById("filter-exp-periode")
    ? document.getElementById("filter-exp-periode").value
    : "harian";
  const tanggalVal = document.getElementById("filter-exp-tanggal")
    ? document.getElementById("filter-exp-tanggal").value
    : getTodayISOString();
  const bulanVal = document.getElementById("filter-exp-bulan")
    ? document.getElementById("filter-exp-bulan").value
    : "";
  const kategoriVal = document.getElementById("filter-exp-kategori")
    ? document.getElementById("filter-exp-kategori").value
    : "semua";

  expenseBody.innerHTML = "";
  if (mobileCards) mobileCards.innerHTML = "";
  let totalExp = 0;

  const filteredExpenses = expenses
    .filter((exp) => {
      const dateMatch = isReportDateMatch(
        exp.date,
        periodeVal,
        tanggalVal,
        bulanVal,
      );
      const catMatch = kategoriVal === "semua" || exp.category === kategoriVal;
      return dateMatch && catMatch;
    })
    .sort((a, b) => {
      const numA = parseInt((a.id || "").replace("EXP-", ""), 10) || 0;
      const numB = parseInt((b.id || "").replace("EXP-", ""), 10) || 0;
      return numB - numA;
    });

  filteredExpenses.forEach((exp) => {
    totalExp += exp.amount;
    const safeExpId = escapeHTML(exp.id);
    const safeExpDate = escapeHTML(exp.date || "-");
    const safeExpName = escapeHTML(exp.name);
    const safeExpCat = escapeHTML(exp.category);

    expenseBody.innerHTML += `
            <tr>
                <td>${safeExpDate}</td>
                <td><b>${safeExpName}</b></td>
                <td><span class="channel-tag">${safeExpCat}</span></td>
                <td style="color:#ef4444; font-weight:bold;">Rp ${exp.amount.toLocaleString("id-ID")}</td>
                <td>
                    <button type="button" class="btn-sm" style="background-color:#ef4444; color:white;" onclick="deleteExpense('${safeExpId}')">
                        <i class="fa-solid fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    if (mobileCards) {
      mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${safeExpName}</span>
                        <span class="badge badge-baru">${safeExpCat}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Tanggal:</b> ${safeExpDate}</div>
                        <div style="color:#ef4444; font-weight:bold;"><b>Nominal:</b> Rp ${exp.amount.toLocaleString("id-ID")}</div>
                    </div>
                    <div class="mobile-card-footer">
                        <button type="button" class="btn-sm" style="background-color:#ef4444; color:white;" onclick="deleteExpense('${safeExpId}')">
                            <i class="fa-solid fa-trash"></i> Hapus Pengeluaran
                        </button>
                    </div>
                </div>
            `;
    }
  });

  if (document.getElementById("total-pengeluaran-card")) {
    document.getElementById("total-pengeluaran-card").innerText =
      "Rp " + totalExp.toLocaleString("id-ID");
  }
  checkEmptyTable(
    expenseBody,
    filteredExpenses.length,
    5,
    "Belum ada pengeluaran pada tanggal/filter ini.",
  );
}

async function nextStatus(orderId) {
  let order = orders.find((o) => o.id === orderId);
  if (!order) return;
  if (order.status === "Baru") order.status = "Diproses";
  else if (order.status === "Diproses") order.status = "Selesai";

  await saveData();
  renderDashboard();
  renderLaporan();
}

function renderCustomers() {
  const tableBody = document.getElementById("customer-table-body");
  const mobileCards = document.getElementById("customer-cards-mobile");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (mobileCards) mobileCards.innerHTML = "";

  const searchQuery = document.getElementById("search-customer")
    ? document.getElementById("search-customer").value.toLowerCase()
    : "";
  let filteredCust = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery) ||
      (c.phone && c.phone.toLowerCase().includes(searchQuery)),
  );

  filteredCust.forEach((c) => {
    let custOrders = orders.filter(
      (o) =>
        o.phone &&
        c.phone &&
        o.phone.trim().toLowerCase() === c.phone.trim().toLowerCase(),
    );
    c.history = custOrders.length;
    c.totalSpent = custOrders.reduce((total, o) => total + o.price, 0);

    const safePhone = escapeHTML(c.phone);
    const safeName = escapeHTML(c.name);
    const safeAddr = escapeHTML(c.address || "-");

    tableBody.innerHTML += `
            <tr>
                <td><b>${safePhone}</b></td>
                <td>${safeName}</td>
                <td>${safeAddr}</td>
                <td>${c.history} Kali Pemesanan</td>
                <td>Rp ${c.totalSpent.toLocaleString("id-ID")}</td>
            </tr>
        `;

    if (mobileCards) {
      mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${safeName}</span>
                        <span class="channel-tag">${safePhone}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Tipe/Alamat:</b> ${safeAddr}</div>
                        <div><b>Total Order:</b> ${c.history} Kali Pemesanan</div>
                        <div><b>Total Belanja:</b> Rp ${c.totalSpent.toLocaleString("id-ID")}</div>
                    </div>
                </div>
            `;
    }
  });

  checkEmptyTable(tableBody, filteredCust.length, 5, "Belum ada pelanggan.");
}

function renderStock() {
  const tableBody = document.getElementById("stock-table-body");
  const mobileCards = document.getElementById("stock-cards-mobile");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (mobileCards) mobileCards.innerHTML = "";

  const searchQuery = document.getElementById("search-stock")
    ? document.getElementById("search-stock").value.toLowerCase()
    : "";
  let filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery) ||
      p.id.toLowerCase().includes(searchQuery),
  );

  filteredProducts.forEach((p) => {
    let statusStokText =
      p.stock > 10
        ? "Stok Tersedia"
        : p.stock > 0
          ? "Stok Menipis"
          : "Stok Habis";
    let badgeColorClass =
      p.stock > 10
        ? "badge-selesai"
        : p.stock > 0
          ? "badge-proses"
          : "badge-baru";

    const safeProdId = escapeHTML(p.id);
    const safeProdName = escapeHTML(p.name);

    tableBody.innerHTML += `
            <tr>
                <td>${safeProdId}</td>
                <td><b>${safeProdName}</b></td>
                <td>Rp ${p.price.toLocaleString("id-ID")}</td>
                <td><b>${p.stock} pcs</b></td>
                <td><span class="badge ${badgeColorClass}">${statusStokText}</span></td>
                <td>
                    <button type="button" class="btn-sm btn-status" onclick="updateProductStock('${safeProdId}')"><i class="fa-solid fa-pen-to-square"></i> Edit / Stok</button>
                    <button type="button" class="btn-sm" style="background-color:#ef4444; color:white; margin-left:5px;" onclick="deleteProduct('${safeProdId}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                </td>
            </tr>
        `;

    if (mobileCards) {
      mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${safeProdName}</span>
                        <span class="badge ${badgeColorClass}">${statusStokText}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Harga:</b> Rp ${p.price.toLocaleString("id-ID")}</div>
                        <div><b>Sisa Stok:</b> ${p.stock} pcs</div>
                    </div>
                    <div class="mobile-card-footer">
                        <button type="button" class="btn-sm btn-status" onclick="updateProductStock('${safeProdId}')"><i class="fa-solid fa-pen-to-square"></i> Edit / Stok</button>
                        <button type="button" class="btn-sm" style="background-color:#ef4444; color:white;" onclick="deleteProduct('${safeProdId}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                    </div>
                </div>
            `;
    }
  });

  checkEmptyTable(tableBody, filteredProducts.length, 6, "Belum ada produk.");
}

async function updateProductStock(productId) {
  let product = products.find((p) => p.id === productId);
  if (!product) return;

  const { value: formValues } = await Swal.fire({
    title: `<div class="swal-custom-title"><i class="fa-solid fa-pen-to-square" style="color:#059669;"></i> Edit Produk "${escapeHTML(product.name)}"</div>`,
    html:
      `<div class="swal-form-group">` +
      `  <label><i class="fa-solid fa-utensils"></i> Nama Produk:</label>` +
      `  <input id="swal-input-name" type="text" class="swal2-input styled-swal-input" value="${escapeHTML(product.name)}" placeholder="Nama Produk">` +
      `</div>` +
      `<div class="swal-form-group">` +
      `  <label><i class="fa-solid fa-boxes-stacked"></i> Sisa Stok Baru:</label>` +
      `  <input id="swal-input-stock" type="number" min="0" class="swal2-input styled-swal-input" value="${product.stock}" placeholder="Stok Pcs">` +
      `</div>` +
      `<div class="swal-form-group">` +
      `  <label><i class="fa-solid fa-tag"></i> Harga Produk (Rp):</label>` +
      `  <input id="swal-input-price" type="number" min="1" class="swal2-input styled-swal-input" value="${product.price}" placeholder="Harga (Rp)">` +
      `</div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Simpan',
    cancelButtonText: "Batal",
    confirmButtonColor: "#059669",
    cancelButtonColor: "#64748b",
    customClass: {
      popup: "swal2-popup-modern",
    },
    preConfirm: () => {
      const newName = document.getElementById("swal-input-name").value.trim();
      const newStock = parseInt(
        document.getElementById("swal-input-stock").value,
        10,
      );
      const newPrice = parseInt(
        document.getElementById("swal-input-price").value,
        10,
      );

      if (!newName) {
        Swal.showValidationMessage("Nama produk tidak boleh kosong!");
        return false;
      }
      if (isNaN(newStock) || newStock < 0) {
        Swal.showValidationMessage("Stok tidak boleh kurang dari 0!");
        return false;
      }
      if (isNaN(newPrice) || newPrice <= 0) {
        Swal.showValidationMessage("Harga harus lebih dari Rp 0!");
        return false;
      }

      return { newName, newStock, newPrice };
    },
  });

  if (formValues) {
    product.name = formValues.newName;
    product.stock = formValues.newStock;
    product.price = formValues.newPrice;

    await saveData();
    renderStock();
    populateProductDropdown();
    populateReportProductFilter();

    Swal.fire({
      icon: "success",
      title: "Produk Diperbarui!",
      text: `"${product.name}" berhasil disimpan.`,
      timer: 1400,
      showConfirmButton: false,
      customClass: {
        popup: "swal2-popup-modern",
      },
    });
  }
}

function deleteProduct(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  Swal.fire({
    title: "Hapus Produk?",
    text: `Menu "${product.name}" akan dihapus permanen dari daftar stok.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal",
    customClass: {
      popup: "swal2-popup-modern",
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      products = products.filter((p) => p.id !== productId);
      await saveData();
      renderStock();
      populateProductDropdown();
      populateReportProductFilter();

      Swal.fire({
        title: "Terhapus!",
        text: `Produk "${product.name}" berhasil dihapus.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: "swal2-popup-modern",
        },
      });
    }
  });
}

const addProductForm = document.getElementById("add-product-form");
if (addProductForm) {
  addProductForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("prod-name").value.trim();
    const price = parseInt(document.getElementById("prod-price").value);
    const stock = parseInt(document.getElementById("prod-stock").value);

    const newId = generateNextProductId();
    products.push({ id: newId, name, price, stock });
    await saveData();

    Swal.fire({ icon: "success", title: "Produk Ditambahkan!" });
    addProductForm.reset();
    renderStock();
    populateProductDropdown();
  });
}

function toggleDateFilter() {
  const periodeSelect = document.getElementById("filter-periode");
  const datePickerWrapper = document.getElementById("date-picker-wrapper");
  const monthPickerWrapper = document.getElementById("month-picker-wrapper");

  if (periodeSelect && periodeSelect.value === "harian") {
    if (datePickerWrapper) datePickerWrapper.style.display = "inline-block";
    if (monthPickerWrapper) monthPickerWrapper.style.display = "none";
    const tanggalInput = document.getElementById("filter-tanggal");
    if (tanggalInput && !tanggalInput.value) {
      tanggalInput.value = getTodayISOString();
    }
  } else if (periodeSelect && periodeSelect.value === "bulanan") {
    if (datePickerWrapper) datePickerWrapper.style.display = "none";
    if (monthPickerWrapper) monthPickerWrapper.style.display = "inline-block";
    const bulanInput = document.getElementById("filter-bulan");
    if (bulanInput && !bulanInput.value) {
      bulanInput.value = getTodayISOString().slice(0, 7);
    }
  } else {
    if (datePickerWrapper) datePickerWrapper.style.display = "none";
    if (monthPickerWrapper) monthPickerWrapper.style.display = "none";
  }
  renderLaporan();
}

// --- HELPER PENCOCOKAN TANGGAL LAPORAN ---
function isReportDateMatch(dateStr, periodeVal, tanggalVal, bulanVal) {
  if (periodeVal === "semua") return true;
  if (!dateStr) return false;
  const parts = dateStr.split(",")[0].trim().split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    if (periodeVal === "harian" && tanggalVal)
      return `${year}-${month}-${day}` === tanggalVal;
    if (periodeVal === "bulanan" && bulanVal)
      return `${year}-${month}` === bulanVal;
  }
  return false;
}

function renderLaporan() {
  populateReportProductFilter();
  let totalOmzet = 0,
    totalPengeluaran = 0,
    channelCount = {},
    productSalesCount = {};

  const detailBody = document.getElementById("detail-transaksi-body");
  const mobileCards = document.getElementById("report-cards-mobile");
  const periodeVal = document.getElementById("filter-periode")
    ? document.getElementById("filter-periode").value
    : "harian";
  const tanggalVal = document.getElementById("filter-tanggal")
    ? document.getElementById("filter-tanggal").value
    : getTodayISOString();
  const bulanVal = document.getElementById("filter-bulan")
    ? document.getElementById("filter-bulan").value
    : "";
  const produkVal = document.getElementById("filter-produk")
    ? document.getElementById("filter-produk").value.toLowerCase()
    : "semua";

  if (detailBody) detailBody.innerHTML = "";
  if (mobileCards) mobileCards.innerHTML = "";

  let filteredOrders = orders
    .filter((o) => isReportDateMatch(o.date, periodeVal, tanggalVal, bulanVal))
    .sort((a, b) => {
      const numA = parseInt((a.id || "").replace("ORD-", ""), 10) || 0;
      const numB = parseInt((b.id || "").replace("ORD-", ""), 10) || 0;
      return numB - numA;
    });

  filteredOrders.forEach((o) => {
    channelCount[o.channel] = (channelCount[o.channel] || 0) + 1;
    const payMethod = escapeHTML(o.paymentMethod || "Tunai (Cash)");
    const safeOrderDate = escapeHTML(o.date || "-");
    const safeOrderCust = escapeHTML(o.customer);

    if (o.items && Array.isArray(o.items)) {
      o.items.forEach((item) => {
        productSalesCount[item.productName] =
          (productSalesCount[item.productName] || 0) + item.qty;

        const nameMatch =
          produkVal === "semua" || item.productName.toLowerCase() === produkVal;
        if (nameMatch) {
          const itemTotal = item.price * item.qty;
          totalOmzet += itemTotal;
          const safeItemName = escapeHTML(item.productName);
          const safeItemNote = item.note ? escapeHTML(item.note) : "";

          if (detailBody) {
            detailBody.innerHTML += `
                            <tr>
                                <td>${safeOrderDate}</td>
                                <td><b>${safeItemName}</b> ${safeItemNote ? `<br><small style="color:#64748b;">[${safeItemNote}]</small>` : ""}</td>
                                <td>${item.qty} pcs</td>
                                <td>${safeOrderCust}<br><small style="color:#047857; font-weight:600;">${payMethod}</small></td>
                                <td>Rp ${itemTotal.toLocaleString("id-ID")}</td>
                            </tr>
                        `;
          }

          if (mobileCards) {
            mobileCards.innerHTML += `
                            <div class="mobile-card">
                                <div class="mobile-card-header">
                                    <span class="mobile-card-title">${safeItemName}</span>
                                    <span class="badge badge-selesai">Rp ${itemTotal.toLocaleString("id-ID")}</span>
                                </div>
                                <div class="mobile-card-body">
                                    <div><b>Tanggal:</b> ${safeOrderDate} | <b>Qty:</b> ${item.qty} pcs</div>
                                    <div><b>Customer:</b> ${safeOrderCust} | <b>Bayar:</b> ${payMethod}</div>
                                    ${safeItemNote ? `<div><b>Catatan:</b> ${safeItemNote}</div>` : ""}
                                </div>
                            </div>
                        `;
          }
        }
      });
    } else {
      productSalesCount[o.product] =
        (productSalesCount[o.product] || 0) + (o.qty || 1);
      const nameMatch =
        produkVal === "semua" || o.product.toLowerCase().includes(produkVal);
      if (nameMatch) {
        totalOmzet += o.price;
        const safeProdText = escapeHTML(o.product);

        if (detailBody) {
          detailBody.innerHTML += `
                        <tr>
                            <td>${safeOrderDate}</td>
                            <td><b>${safeProdText}</b></td>
                            <td>${o.qty || 1} pcs</td>
                            <td>${safeOrderCust}<br><small style="color:#047857; font-weight:600;">${payMethod}</small></td>
                            <td>Rp ${o.price.toLocaleString("id-ID")}</td>
                        </tr>
                    `;
        }

        if (mobileCards) {
          mobileCards.innerHTML += `
                        <div class="mobile-card">
                            <div class="mobile-card-header">
                                <span class="mobile-card-title">${safeProdText}</span>
                                <span class="badge badge-selesai">Rp ${o.price.toLocaleString("id-ID")}</span>
                            </div>
                            <div class="mobile-card-body">
                                <div><b>Tanggal:</b> ${safeOrderDate} | <b>Qty:</b> ${o.qty || 1} pcs</div>
                                <div><b>Customer:</b> ${safeOrderCust} | <b>Bayar:</b> ${payMethod}</div>
                            </div>
                        </div>
                    `;
        }
      }
    }
  });

  if (detailBody && detailBody.innerHTML === "") {
    detailBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 20px;">Belum ada transaksi penjualan pada tanggal/filter ini.</td></tr>`;
  }

  let filteredExpenses = expenses.filter((exp) =>
    isReportDateMatch(exp.date, periodeVal, tanggalVal, bulanVal),
  );
  filteredExpenses.forEach((exp) => {
    totalPengeluaran += exp.amount;
  });

  let labaBersih = totalOmzet - totalPengeluaran;
  let topChannel =
    Object.keys(channelCount).length > 0
      ? Object.keys(channelCount).reduce((a, b) =>
          channelCount[a] > channelCount[b] ? a : b,
        )
      : "-";
  let topProduct =
    Object.keys(productSalesCount).length > 0
      ? Object.keys(productSalesCount).reduce((a, b) =>
          productSalesCount[a] > productSalesCount[b] ? a : b,
        )
      : "-";

  if (document.getElementById("report-omzet"))
    document.getElementById("report-omzet").innerText =
      "Rp " + totalOmzet.toLocaleString("id-ID");
  if (document.getElementById("report-pengeluaran"))
    document.getElementById("report-pengeluaran").innerText =
      "Rp " + totalPengeluaran.toLocaleString("id-ID");
  if (document.getElementById("report-laba")) {
    const labaElem = document.getElementById("report-laba");
    labaElem.innerText = "Rp " + labaBersih.toLocaleString("id-ID");
    labaElem.style.color = labaBersih >= 0 ? "#059669" : "#ef4444";
  }
  if (document.getElementById("report-top-channel"))
    document.getElementById("report-top-channel").innerText = topChannel;
  if (document.getElementById("report-top-product"))
    document.getElementById("report-top-product").innerText = topProduct;
}

function checkEmptyTable(elem, length, colSpan, message) {
  if (length === 0 && elem) {
    elem.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#94a3b8; padding: 20px;">${message}</td></tr>`;
    return true;
  }
  return false;
}

// --- EXPORT EXCEL (.XLSX) SESUAI PERIODE & JENIS PRODUK YANG DIPILIH ---
function exportToExcel() {
  const periodeVal = document.getElementById("filter-periode")
    ? document.getElementById("filter-periode").value
    : "harian";
  const tanggalVal = document.getElementById("filter-tanggal")
    ? document.getElementById("filter-tanggal").value
    : "";
  const bulanVal = document.getElementById("filter-bulan")
    ? document.getElementById("filter-bulan").value
    : "";
  const produkSelect = document.getElementById("filter-produk");
  const produkVal = produkSelect ? produkSelect.value.toLowerCase() : "semua";
  const produkLabel =
    produkSelect && produkSelect.selectedIndex >= 0
      ? produkSelect.options[produkSelect.selectedIndex].text
      : "Semua Produk";

  let periodeLabel = "Semua Periode";
  if (periodeVal === "harian") {
    if (!tanggalVal) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Tanggal",
        text: "Silakan pilih tanggal terlebih dahulu untuk laporan harian.",
      });
      return;
    }
    periodeLabel = `Harian (${tanggalVal})`;
  } else if (periodeVal === "bulanan") {
    if (!bulanVal) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Bulan",
        text: "Silakan pilih bulan terlebih dahulu untuk laporan bulanan.",
      });
      return;
    }
    periodeLabel = `Bulanan (${bulanVal})`;
  }

  const filteredOrders = orders.filter((o) =>
    isReportDateMatch(o.date, periodeVal, tanggalVal, bulanVal),
  );
  const filteredExpenses = expenses.filter((exp) =>
    isReportDateMatch(exp.date, periodeVal, tanggalVal, bulanVal),
  );

  const salesRows = [];
  filteredOrders.forEach((o) => {
    const payMethod = o.paymentMethod || "Tunai (Cash)";
    if (o.items && Array.isArray(o.items)) {
      const matchedItems =
        produkVal === "semua"
          ? o.items
          : o.items.filter(
              (item) => item.productName.toLowerCase() === produkVal,
            );

      matchedItems.forEach((item) => {
        const detailText = `${item.productName} (${item.qty}x)${item.note ? ` [${item.note}]` : ""}`;
        const itemSubtotal =
          (Number(item.price) || 0) * (Number(item.qty) || 0);

        salesRows.push([
          salesRows.length + 1,
          o.id,
          o.date || "-",
          o.customer,
          o.phone || "-",
          detailText,
          o.channel,
          payMethod,
          o.status,
          itemSubtotal,
        ]);
      });
    } else {
      const nameMatch =
        produkVal === "semua" ||
        (o.product && o.product.toLowerCase().includes(produkVal));
      if (nameMatch) {
        salesRows.push([
          salesRows.length + 1,
          o.id,
          o.date || "-",
          o.customer,
          o.phone || "-",
          o.product,
          o.channel,
          payMethod,
          o.status,
          Number(o.price) || 0,
        ]);
      }
    }
  });

  if (salesRows.length === 0 && filteredExpenses.length === 0) {
    Swal.fire({
      icon: "info",
      title: "Data Tidak Ditemukan",
      text: `Tidak ada data penjualan maupun pengeluaran untuk filter ${periodeLabel} - ${produkLabel}.`,
    });
    return;
  }

  const wb = XLSX.utils.book_new();
  const todayStr = new Date().toLocaleDateString("id-ID");
  const storeTitle = (ownerAccount.storeName || "UMKM DIGITAL").toUpperCase();
  const rupiahFormat = '"Rp "#,##0.00';

  function applyCurrencyFormat(ws, colLetter, startRow, endRow) {
    for (let r = startRow; r <= endRow; r++) {
      const cellRef = `${colLetter}${r}`;
      if (ws[cellRef]) {
        ws[cellRef].z = rupiahFormat;
      }
    }
  }

  // 1. SHEET LAPORAN PENJUALAN
  const salesHeader = [
    [`LAPORAN PENJUALAN ${storeTitle}`],
    [`Periode: ${periodeLabel} | Filter Produk: ${produkLabel}`],
    [`Tanggal Cetak: ${todayStr}`],
    [
      "No",
      "No Order",
      "Tanggal",
      "Customer",
      "ID / No. Meja",
      "Detail Produk",
      "Channel",
      "Metode Bayar",
      "Status",
      "Total Penjualan (Rp)",
    ],
  ];

  const lastSalesRow = 4 + salesRows.length;
  const totalSalesRowIndex = lastSalesRow + 1;
  const salesFooter = [
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TOTAL OMZET",
      salesRows.length > 0 ? { t: "n", f: `SUM(J5:J${lastSalesRow})` } : 0,
    ],
  ];

  const wsSales = XLSX.utils.aoa_to_sheet([
    ...salesHeader,
    ...salesRows,
    ...salesFooter,
  ]);
  wsSales["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
  ];
  wsSales["!cols"] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 },
    { wch: 36 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
  ];
  applyCurrencyFormat(wsSales, "J", 5, totalSalesRowIndex);
  XLSX.utils.book_append_sheet(wb, wsSales, "Laporan Penjualan");

  // 2. SHEET LAPORAN PENGELUARAN
  const expHeader = [
    [`LAPORAN PENGELUARAN ${storeTitle}`],
    [`Periode: ${periodeLabel}`],
    [`Tanggal Cetak: ${todayStr}`],
    [
      "No",
      "ID Pengeluaran",
      "Tanggal",
      "Deskripsi Pengeluaran",
      "Kategori",
      "Nominal (Rp)",
    ],
  ];

  const expRows = filteredExpenses.map((e, idx) => [
    idx + 1,
    e.id,
    e.date || "-",
    e.name,
    e.category,
    Number(e.amount) || 0,
  ]);

  const lastExpRow = 4 + expRows.length;
  const totalExpRowIndex = lastExpRow + 1;
  const expFooter = [
    [
      "",
      "",
      "",
      "",
      "TOTAL PENGELUARAN",
      expRows.length > 0 ? { t: "n", f: `SUM(F5:F${lastExpRow})` } : 0,
    ],
  ];

  const wsExp = XLSX.utils.aoa_to_sheet([
    ...expHeader,
    ...expRows,
    ...expFooter,
  ]);
  wsExp["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
  ];
  wsExp["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 22 },
    { wch: 34 },
    { wch: 24 },
    { wch: 22 },
  ];
  applyCurrencyFormat(wsExp, "F", 5, totalExpRowIndex);
  XLSX.utils.book_append_sheet(wb, wsExp, "Laporan Pengeluaran");

  // 3. SHEET RINGKASAN LABA BERSIH
  const summaryData = [
    [`RINGKASAN KEUANGAN & LABA BERSIH ${storeTitle}`],
    [`Periode: ${periodeLabel} | Filter Produk: ${produkLabel}`],
    [`Tanggal Cetak: ${todayStr}`],
    ["No", "Keterangan Komponen Keuangan", "Jumlah (Rp)"],
    [
      1,
      "Total Pendapatan (Omzet Penjualan)",
      { t: "n", f: `'Laporan Penjualan'!J${totalSalesRowIndex}` },
    ],
    [
      2,
      "Total Pengeluaran Operasional",
      { t: "n", f: `'Laporan Pengeluaran'!F${totalExpRowIndex}` },
    ],
    ["", "LABA BERSIH (OMZET - PENGELUARAN)", { t: "n", f: "C5-C6" }],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
  ];
  wsSummary["!cols"] = [{ wch: 6 }, { wch: 42 }, { wch: 24 }];
  applyCurrencyFormat(wsSummary, "C", 5, 7);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Laba Bersih");

  const fileSuffixPeriode =
    periodeVal === "harian"
      ? tanggalVal
      : periodeVal === "bulanan"
        ? bulanVal
        : "Semua_Periode";
  const fileSuffixProduk =
    produkVal === "semua"
      ? "Semua_Produk"
      : produkLabel.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(
    wb,
    `Laporan_Keuangan_${fileSuffixPeriode}_${fileSuffixProduk}.xlsx`,
  );
}

// --- EXPOSE FUNGSI KE GLOBAL WINDOW ---
window.showSection = showSection;
window.autoFillCustomerName = autoFillCustomerName;
window.changeQty = changeQty;
window.addOrderItemRow = addOrderItemRow;
window.removeOrderItemRow = removeOrderItemRow;
window.calculateTotalOrder = calculateTotalOrder;
window.openReceiptModal = openReceiptModal;
window.nextStatus = nextStatus;
window.cancelOrder = cancelOrder;
window.renderDashboard = renderDashboard;
window.renderCustomers = renderCustomers;
window.renderStock = renderStock;
window.updateProductStock = updateProductStock;
window.deleteProduct = deleteProduct;
window.tambahPengeluaran = tambahPengeluaran;
window.deleteExpense = deleteExpense;
window.toggleExpenseDateFilter = toggleExpenseDateFilter;
window.renderPengeluaran = renderPengeluaran;
window.toggleDateFilter = toggleDateFilter;
window.renderLaporan = renderLaporan;
window.exportToExcel = exportToExcel;
window.handleLogoUpload = handleLogoUpload;
window.removeStoreLogo = removeStoreLogo;
window.saveAccountProfile = saveAccountProfile;
window.updateAccountPassword = updateAccountPassword;
window.confirmLogout = confirmLogout;

// --- JALANKAN SINKRONISASI CLOUD SAAT HALAMAN DIBUKA ---
initRealtimeSync();