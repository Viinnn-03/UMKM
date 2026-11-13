// --- DATA AWAL LOCALSTORAGE ---
let defaultProducts = [];
let defaultCustomers = [];
let defaultOrders = [];
let defaultExpenses = [];

let products = JSON.parse(localStorage.getItem('umkm_products')) || defaultProducts;
let customers = JSON.parse(localStorage.getItem('umkm_customers')) || defaultCustomers;
let orders = JSON.parse(localStorage.getItem('umkm_orders')) || defaultOrders;
let expenses = JSON.parse(localStorage.getItem('umkm_expenses')) || defaultExpenses;

let ownerAccount = JSON.parse(localStorage.getItem('umkm_owner_account')) || {
    storeName: 'UMKM Digital Kuliner',
    ownerName: 'Administrator Utama',
    username: 'admin',
    password: '123',
    phone: '-',
    address: 'Kota Medan',
    logoData: '' // Saat pertama kosong (tidak ada logo)
};

function saveData() {
    localStorage.setItem('umkm_products', JSON.stringify(products));
    localStorage.setItem('umkm_customers', JSON.stringify(customers));
    localStorage.setItem('umkm_orders', JSON.stringify(orders));
    localStorage.setItem('umkm_expenses', JSON.stringify(expenses));
    populateCustomerDatalist();
    loadAccountSettingsUI();
}

// --- PENGATURAN AKUN & MANAJEMEN LOGO OPSIONAL ---
function applyLogoVisibility() {
    const logoSrc = ownerAccount.logoData || '';
    const hasLogo = logoSrc.trim() !== '';

    const sidebarLogo = document.getElementById('sidebar-header-logo');
    const mobileLogo = document.getElementById('mobile-header-logo');
    const profileLogo = document.getElementById('account-profile-logo');
    const bgWatermark = document.getElementById('dashboard-bg-watermark');
    const btnRemoveLogo = document.getElementById('btn-remove-logo');

    if (hasLogo) {
        if (sidebarLogo) { sidebarLogo.src = logoSrc; sidebarLogo.style.display = 'block'; }
        if (mobileLogo) { mobileLogo.src = logoSrc; mobileLogo.style.display = 'block'; }
        if (profileLogo) { profileLogo.src = logoSrc; profileLogo.style.display = 'block'; }
        if (bgWatermark) { bgWatermark.style.backgroundImage = `url('${logoSrc}')`; bgWatermark.style.display = 'block'; }
        if (btnRemoveLogo) btnRemoveLogo.style.display = 'inline-flex';
    } else {
        if (sidebarLogo) sidebarLogo.style.display = 'none';
        if (mobileLogo) mobileLogo.style.display = 'none';
        if (profileLogo) profileLogo.style.display = 'none';
        if (bgWatermark) bgWatermark.style.display = 'none';
        if (btnRemoveLogo) btnRemoveLogo.style.display = 'none';
    }
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        ownerAccount.logoData = e.target.result;
        localStorage.setItem('umkm_owner_account', JSON.stringify(ownerAccount));
        applyLogoVisibility();
        Swal.fire({
            icon: 'success',
            title: 'Logo Terpasang!',
            text: 'Logo usaha berhasil dipasang ke profil dan background dashboard.',
            confirmButtonColor: '#059669'
        });
    };
    reader.readAsDataURL(file);
}

function removeStoreLogo() {
    ownerAccount.logoData = '';
    localStorage.setItem('umkm_owner_account', JSON.stringify(ownerAccount));
    applyLogoVisibility();
    Swal.fire({
        icon: 'info',
        title: 'Logo Dihapus',
        text: 'Tampilan kembali bersih tanpa logo.',
        confirmButtonColor: '#059669'
    });
}

function loadAccountSettingsUI() {
    if (document.getElementById('sidebar-store-title')) {
        document.getElementById('sidebar-store-title').innerText = ownerAccount.storeName || 'UMKM Digital';
    }
    if (document.getElementById('mobile-store-title')) {
        document.getElementById('mobile-store-title').innerText = ownerAccount.storeName || 'UMKM Digital';
    }
    if (document.getElementById('owner-store-name')) {
        document.getElementById('owner-store-name').innerText = ownerAccount.storeName || 'UMKM Digital Kuliner';
    }
    if (document.getElementById('owner-account-subtitle')) {
        document.getElementById('owner-account-subtitle').innerText = `Pemilik: ${ownerAccount.ownerName} • Status Sesi: Aktif`;
    }
    if (document.getElementById('acc-store-name')) document.getElementById('acc-store-name').value = ownerAccount.storeName || '';
    if (document.getElementById('acc-owner-name')) document.getElementById('acc-owner-name').value = ownerAccount.ownerName || '';
    if (document.getElementById('acc-phone')) document.getElementById('acc-phone').value = ownerAccount.phone || '';
    if (document.getElementById('acc-address')) document.getElementById('acc-address').value = ownerAccount.address || '';
    if (document.getElementById('acc-username')) document.getElementById('acc-username').value = ownerAccount.username || 'admin';

    if (document.getElementById('acc-data-summary')) {
        document.getElementById('acc-data-summary').innerText = `${products.length} Produk • ${customers.length} Pelanggan • ${orders.length} Transaksi`;
    }

    applyLogoVisibility();
}

function saveAccountProfile(e) {
    e.preventDefault();
    ownerAccount.storeName = document.getElementById('acc-store-name').value.trim();
    ownerAccount.ownerName = document.getElementById('acc-owner-name').value.trim();
    ownerAccount.phone = document.getElementById('acc-phone').value.trim();
    ownerAccount.address = document.getElementById('acc-address').value.trim();

    localStorage.setItem('umkm_owner_account', JSON.stringify(ownerAccount));
    loadAccountSettingsUI();

    Swal.fire({
        icon: 'success',
        title: 'Profil Disimpan!',
        text: 'Informasi profil usaha UMKM berhasil diperbarui.',
        confirmButtonColor: '#059669'
    });
}

function updateAccountPassword(e) {
    e.preventDefault();
    const newUsername = document.getElementById('acc-username').value.trim();
    const newPass = document.getElementById('acc-new-password').value;
    const confirmPass = document.getElementById('acc-confirm-password').value;

    if (!newUsername) return;

    if (newPass || confirmPass) {
        if (newPass !== confirmPass) {
            Swal.fire({ icon: 'error', title: 'Password Tidak Sama', text: 'Konfirmasi password baru harus cocok.' });
            return;
        }
        ownerAccount.password = newPass;
    }

    ownerAccount.username = newUsername;
    localStorage.setItem('umkm_owner_account', JSON.stringify(ownerAccount));
    document.getElementById('acc-new-password').value = '';
    document.getElementById('acc-confirm-password').value = '';

    Swal.fire({
        icon: 'success',
        title: 'Keamanan Diperbarui!',
        text: 'Username dan/atau password login berhasil disimpan.',
        confirmButtonColor: '#2563eb'
    });
}

function confirmLogout() {
    Swal.fire({
        title: 'Keluar dari Akun?',
        text: 'Anda akan diarahkan kembali ke halaman login.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Log Out',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'index.html';
        }
    });
}

// --- AUTO-FILL NAMA PELANGGAN SAAT ID UNIK DIMASUKKAN ---
function populateCustomerDatalist() {
    const datalist = document.getElementById('customer-id-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    customers.forEach(c => {
        if (c.phone) {
            datalist.innerHTML += `<option value="${c.phone}">${c.name} (${c.address || 'Pelanggan'})</option>`;
        }
    });
}

function autoFillCustomerName() {
    const idInput = document.getElementById('cust-phone');
    const nameInput = document.getElementById('cust-name');
    const typeSelect = document.getElementById('order-type');
    if (!idInput || !nameInput) return;

    const enteredId = idInput.value.trim().toLowerCase();
    if (!enteredId) return;

    const matchedCustomer = customers.find(c => c.phone && c.phone.trim().toLowerCase() === enteredId);
    if (matchedCustomer) {
        nameInput.value = matchedCustomer.name;
        if (typeSelect && matchedCustomer.address) {
            const validTypes = ['Dine-In', 'Takeaway', 'Delivery'];
            if (validTypes.includes(matchedCustomer.address)) {
                typeSelect.value = matchedCustomer.address;
            }
        }
    }
}

// --- NAVIGASI MULTI-PLATFORM ---
function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');
    
    const activeSidebarLink = document.querySelector(`.sidebar a[href="#${sectionId}"]`);
    if (activeSidebarLink) activeSidebarLink.classList.add('active');

    const activeBottomNav = document.querySelector(`.bottom-nav-item[onclick*="${sectionId}"]`);
    if (activeBottomNav) activeBottomNav.classList.add('active');

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
    products.forEach(p => {
        html += `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}" data-stock="${p.stock}">${p.name} (Stok: ${p.stock}) - Rp ${p.price.toLocaleString('id-ID')}</option>`;
    });
    return html;
}

function populateProductDropdown() {
    document.querySelectorAll('.item-product-select').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = getProductOptionsHTML();
        select.value = currentVal;
    });
    calculateTotalOrder();
}

function changeQty(btn, delta) {
    const qtyInput = btn.parentElement.querySelector('.item-qty-input');
    if (qtyInput) {
        let currentVal = parseInt(qtyInput.value) || 1;
        currentVal += delta;
        if (currentVal < 1) currentVal = 1;
        qtyInput.value = currentVal;
        calculateTotalOrder();
    }
}

function addOrderItemRow() {
    const container = document.getElementById('order-items-container');
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'order-item-row';
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
    const rows = document.querySelectorAll('.order-item-row');
    if (rows.length > 1) {
        btn.closest('.order-item-row').remove();
        calculateTotalOrder();
    } else {
        Swal.fire({ icon: 'warning', title: 'Minimal 1 Menu', text: 'Pesanan harus berisi minimal satu menu.' });
    }
}

function calculateTotalOrder() {
    let total = 0;
    document.querySelectorAll('.order-item-row').forEach(row => {
        const select = row.querySelector('.item-product-select');
        const qtyInput = row.querySelector('.item-qty-input');
        
        if (select && select.selectedIndex > 0) {
            const selectedOption = select.options[select.selectedIndex];
            const price = parseInt(selectedOption.getAttribute('data-price')) || 0;
            const qty = parseInt(qtyInput ? qtyInput.value : 1) || 0;
            total += (price * qty);
        }
    });

    const previewElem = document.getElementById('order-total-preview');
    if (previewElem) previewElem.innerText = 'Rp ' + total.toLocaleString('id-ID');
}

function populateReportProductFilter() {
    const filterProductSelect = document.getElementById('filter-produk');
    if (!filterProductSelect) return;

    const currentVal = filterProductSelect.value || 'semua';
    filterProductSelect.innerHTML = '<option value="semua">Semua Produk</option>';

    products.forEach(p => {
        filterProductSelect.innerHTML += `<option value="${p.name.toLowerCase()}">${p.name}</option>`;
    });

    filterProductSelect.value = currentVal;
}

// --- RENDER DASHBOARD & MOBILE CARDS ---
function renderDashboard() {
    const tableBody = document.getElementById('order-table-body');
    const mobileCards = document.getElementById('order-cards-mobile');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';

    const searchQuery = document.getElementById('search-order') ? document.getElementById('search-order').value.toLowerCase() : '';

    let totalOrders = orders.length;
    let newOrders = 0, processOrders = 0, doneOrders = 0, totalOmzet = 0;
    let productSalesCount = {};

    let filteredOrders = orders.filter(o => 
        o.id.toLowerCase().includes(searchQuery) || 
        o.customer.toLowerCase().includes(searchQuery) ||
        (o.phone && o.phone.toLowerCase().includes(searchQuery))
    );

    filteredOrders.forEach(o => {
        if (o.status === 'Baru') newOrders++;
        if (o.status === 'Diproses') processOrders++;
        if (o.status === 'Selesai') {
            doneOrders++;
            totalOmzet += o.price;
        }

        if (o.items && Array.isArray(o.items)) {
            o.items.forEach(item => {
                productSalesCount[item.productName] = (productSalesCount[item.productName] || 0) + item.qty;
            });
        } else {
            productSalesCount[o.product] = (productSalesCount[o.product] || 0) + o.qty;
        }

        let badgeClass = o.status === 'Baru' ? 'badge-baru' : (o.status === 'Diproses' ? 'badge-proses' : 'badge-selesai');

        tableBody.innerHTML += `
            <tr>
                <td><b>${o.id}</b></td>
                <td>${o.customer}</td>
                <td><span class="channel-tag">${o.phone || '-'}</span></td>
                <td>${o.product}</td>
                <td><span class="channel-tag">${o.channel}</span></td>
                <td><span class="badge ${badgeClass}">${o.status}</span></td>
                <td>
                    ${o.status !== 'Selesai' ? `<button type="button" class="btn-sm btn-status" onclick="nextStatus('${o.id}')"><i class="fa-solid fa-arrows-rotate"></i> Ubah Status</button>` : '<span style="color:#059669; font-weight:bold;">Selesai</span>'}
                    <button type="button" class="btn-sm" style="background-color:#ef4444; color:white; margin-left:5px;" onclick="cancelOrder('${o.id}')"><i class="fa-solid fa-trash"></i> Batal</button>
                </td>
            </tr>
        `;

        if (mobileCards) {
            mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${o.id} - ${o.customer}</span>
                        <span class="badge ${badgeClass}">${o.status}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Produk:</b> ${o.product}</div>
                        <div><b>Channel:</b> ${o.channel} | <b>Ref/Meja:</b> ${o.phone || '-'}</div>
                        <div><b>Total:</b> Rp ${o.price.toLocaleString('id-ID')}</div>
                    </div>
                    <div class="mobile-card-footer">
                        ${o.status !== 'Selesai' ? `<button type="button" class="btn-sm btn-status" onclick="nextStatus('${o.id}')"><i class="fa-solid fa-arrows-rotate"></i> Ubah Status</button>` : '<span style="color:#059669; font-weight:bold; text-align:center; flex:1;">Selesai</span>'}
                        <button type="button" class="btn-sm" style="background-color:#ef4444; color:white;" onclick="cancelOrder('${o.id}')"><i class="fa-solid fa-trash"></i> Batal</button>
                    </div>
                </div>
            `;
        }
    });

    checkEmptyTable(tableBody, filteredOrders.length, 7, 'Tidak ada pesanan.');

    if (document.getElementById('total-pesanan')) document.getElementById('total-pesanan').innerText = totalOrders;
    if (document.getElementById('pesanan-baru')) document.getElementById('pesanan-baru').innerText = newOrders;
    if (document.getElementById('pesanan-proses')) document.getElementById('pesanan-proses').innerText = processOrders;
    if (document.getElementById('pesanan-selesai')) document.getElementById('pesanan-selesai').innerText = doneOrders;
    if (document.getElementById('dashboard-omzet')) document.getElementById('dashboard-omzet').innerText = 'Rp ' + totalOmzet.toLocaleString('id-ID');

    let topProduct = Object.keys(productSalesCount).length > 0 
        ? Object.keys(productSalesCount).reduce((a, b) => productSalesCount[a] > productSalesCount[b] ? a : b) 
        : '-';
    if (document.getElementById('dashboard-top-product')) document.getElementById('dashboard-top-product').innerText = topProduct;
}

// --- FORM SUBMIT PESANAN ---
const orderForm = document.getElementById('order-form');
if (orderForm) {
    orderForm.addEventListener('submit', function (e) {
        e.preventDefault();

        let custPhoneInput = document.getElementById('cust-phone').value.trim();
        if (!custPhoneInput) {
            custPhoneInput = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
        }

        const custNameInput = document.getElementById('cust-name').value.trim();
        const orderTypeSelect = document.getElementById('order-type');
        const orderType = orderTypeSelect ? orderTypeSelect.value : 'Dine-In';
        const channelSelect = document.getElementById('cust-channel');
        const channel = channelSelect ? channelSelect.value : 'Kasir / On-Site';

        const itemRows = document.querySelectorAll('.order-item-row');
        let orderItems = [];
        let totalOrderPrice = 0;
        let isStockEnough = true;
        let errorMessage = '';

        itemRows.forEach(row => {
            const select = row.querySelector('.item-product-select');
            const qtyInput = row.querySelector('.item-qty-input');
            const noteInput = row.querySelector('.item-note-input');

            if (select && select.value) {
                const selectedOption = select.options[select.selectedIndex];
                const productId = select.value;
                const productName = selectedOption.getAttribute('data-name');
                const price = parseInt(selectedOption.getAttribute('data-price')) || 0;
                const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
                const note = noteInput ? noteInput.value.trim() : '';

                const product = products.find(p => p.id === productId);

                if (product) {
                    if (product.stock < qty) {
                        isStockEnough = false;
                        errorMessage = `Stok "${product.name}" kurang! Tersisa ${product.stock} pcs. Silakan tambah stok terlebih dahulu.`;
                    } else {
                        orderItems.push({ productId, productName, price, qty, note });
                        totalOrderPrice += (price * qty);
                    }
                }
            }
        });

        if (!isStockEnough) {
            Swal.fire({ icon: 'error', title: 'Stok Tidak Cukup', text: errorMessage, confirmButtonColor: '#ef4444' });
            return;
        }

        if (orderItems.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Pilih Menu', text: 'Pilih minimal satu menu.' });
            return;
        }

        orderItems.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) product.stock -= item.qty;
        });

        const now = new Date();
        const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
        const uniqueSuffix = String(Date.now()).slice(-4);
        const newOrderId = `ORD-${uniqueSuffix}`;

        const summaryProductText = orderItems.map(i => `${i.productName} (${i.qty}x)${i.note ? ` [${i.note}]` : ''}`).join(', ');

        orders.push({
            id: newOrderId,
            customer: `${custNameInput} (${orderType})`,
            phone: custPhoneInput,
            product: summaryProductText,
            items: orderItems,
            qty: orderItems.reduce((acc, curr) => acc + curr.qty, 0),
            channel,
            status: 'Baru',
            price: totalOrderPrice,
            date: formattedDate
        });

        let existingCust = customers.find(c => c.phone && c.phone.trim().toLowerCase() === custPhoneInput.toLowerCase());
        if (existingCust) {
            existingCust.name = custNameInput;
            existingCust.address = orderType;
        } else {
            customers.push({
                phone: custPhoneInput,
                name: custNameInput,
                address: orderType,
                history: 1,
                totalSpent: totalOrderPrice
            });
        }

        saveData();

        Swal.fire({
            icon: 'success',
            title: 'Pesanan Diteruskan ke Dapur!',
            html: `No Order: <b>${newOrderId}</b><br>Ref ID: <b>${custPhoneInput}</b><br>Total Pembayaran: <b>Rp ${totalOrderPrice.toLocaleString('id-ID')}</b>`,
            confirmButtonColor: '#059669'
        });

        document.getElementById('order-form').reset();
        const container = document.getElementById('order-items-container');
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
    });
}

// --- PEMBATALAN PESANAN + AUTO HAPUS PELANGGAN ---
function cancelOrder(orderId) {
    Swal.fire({
        title: 'Hapus / Batalkan Pesanan?',
        text: 'Stok produk akan dikembalikan, dan pelanggan akan dihapus dari database jika tidak memiliki pesanan lain.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Pesanan',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            const index = orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                const order = orders[index];
                const customerRef = order.phone ? order.phone.trim().toLowerCase() : '';

                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const product = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
                        if (product) product.stock += item.qty;
                    });
                }

                orders.splice(index, 1);

                if (customerRef) {
                    const remainingOrders = orders.filter(o => o.phone && o.phone.trim().toLowerCase() === customerRef);
                    if (remainingOrders.length === 0) {
                        customers = customers.filter(c => !(c.phone && c.phone.trim().toLowerCase() === customerRef));
                    }
                }

                saveData();
                Swal.fire('Terhapus!', 'Pesanan dibatalkan dan data pelanggan disinkronkan.', 'success');
                renderDashboard();
                renderCustomers();
                renderStock();
                renderLaporan();
            }
        }
    });
}

function tambahPengeluaran(e) {
    e.preventDefault();
    const name = document.getElementById('expense-name').value.trim();
    const category = document.getElementById('expense-category').value;
    const amount = parseInt(document.getElementById('expense-amount').value);

    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
    const newExpId = 'EXP-00' + (expenses.length + 1);

    expenses.push({ id: newExpId, name, category, amount, date: formattedDate });
    saveData();

    Swal.fire({ icon: 'success', title: 'Pengeluaran Dicatat!', confirmButtonColor: '#ef4444' });
    document.getElementById('expense-form').reset();
    renderPengeluaran();
    renderLaporan();
}

function renderPengeluaran() {
    const expenseBody = document.getElementById('detail-pengeluaran-body');
    const mobileCards = document.getElementById('expense-cards-mobile');
    if (!expenseBody) return;

    expenseBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';
    let totalExp = 0;

    expenses.forEach(exp => {
        totalExp += exp.amount;
        expenseBody.innerHTML += `
            <tr>
                <td>${exp.date || '-'}</td>
                <td>${exp.name}</td>
                <td>${exp.category}</td>
                <td style="color:#ef4444; font-weight:bold;">Rp ${exp.amount.toLocaleString('id-ID')}</td>
            </tr>
        `;
        if (mobileCards) {
            mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${exp.name}</span>
                        <span class="badge badge-baru">${exp.category}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Tanggal:</b> ${exp.date || '-'}</div>
                        <div style="color:#ef4444; font-weight:bold;"><b>Nominal:</b> Rp ${exp.amount.toLocaleString('id-ID')}</div>
                    </div>
                </div>
            `;
        }
    });

    if (document.getElementById('total-pengeluaran-card')) {
        document.getElementById('total-pengeluaran-card').innerText = 'Rp ' + totalExp.toLocaleString('id-ID');
    }
    checkEmptyTable(expenseBody, expenses.length, 4, 'Belum ada pengeluaran.');
}

function nextStatus(orderId) {
    let order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status === 'Baru') order.status = 'Diproses';
    else if (order.status === 'Diproses') order.status = 'Selesai';
    
    saveData();
    renderDashboard();
    renderLaporan();
}

function renderCustomers() {
    const tableBody = document.getElementById('customer-table-body');
    const mobileCards = document.getElementById('customer-cards-mobile');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';

    const searchQuery = document.getElementById('search-customer') ? document.getElementById('search-customer').value.toLowerCase() : '';
    let filteredCust = customers.filter(c => c.name.toLowerCase().includes(searchQuery) || (c.phone && c.phone.toLowerCase().includes(searchQuery)));

    filteredCust.forEach(c => {
        let custOrders = orders.filter(o => o.phone && c.phone && o.phone.trim().toLowerCase() === c.phone.trim().toLowerCase());
        c.history = custOrders.length;
        c.totalSpent = custOrders.reduce((total, o) => total + o.price, 0);

        tableBody.innerHTML += `
            <tr>
                <td><b>${c.phone}</b></td>
                <td>${c.name}</td>
                <td>${c.address || '-'}</td>
                <td>${c.history} Kali Pemesanan</td>
                <td>Rp ${c.totalSpent.toLocaleString('id-ID')}</td>
            </tr>
        `;

        if (mobileCards) {
            mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${c.name}</span>
                        <span class="channel-tag">${c.phone}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Tipe/Alamat:</b> ${c.address || '-'}</div>
                        <div><b>Total Order:</b> ${c.history} Kali Pemesanan</div>
                        <div><b>Total Belanja:</b> Rp ${c.totalSpent.toLocaleString('id-ID')}</div>
                    </div>
                </div>
            `;
        }
    });

    checkEmptyTable(tableBody, filteredCust.length, 5, 'Belum ada pelanggan.');
}

function renderStock() {
    const tableBody = document.getElementById('stock-table-body');
    const mobileCards = document.getElementById('stock-cards-mobile');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';

    const searchQuery = document.getElementById('search-stock') ? document.getElementById('search-stock').value.toLowerCase() : '';
    let filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery) || p.id.toLowerCase().includes(searchQuery));

    filteredProducts.forEach(p => {
        let statusStokText = p.stock > 10 ? 'Stok Melimpah' : (p.stock > 0 ? 'Stok Menipis' : 'Stok Habis');
        let badgeColorClass = p.stock > 10 ? 'badge-selesai' : (p.stock > 0 ? 'badge-proses' : 'badge-baru');

        tableBody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td><b>${p.name}</b></td>
                <td>Rp ${p.price.toLocaleString('id-ID')}</td>
                <td><b>${p.stock} pcs</b></td>
                <td><span class="badge ${badgeColorClass}">${statusStokText}</span></td>
                <td>
                    <button type="button" class="btn-sm btn-status" onclick="updateProductStock('${p.id}')"><i class="fa-solid fa-pen-to-square"></i> Update Stok</button>
                </td>
            </tr>
        `;

        if (mobileCards) {
            mobileCards.innerHTML += `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <span class="mobile-card-title">${p.name}</span>
                        <span class="badge ${badgeColorClass}">${statusStokText}</span>
                    </div>
                    <div class="mobile-card-body">
                        <div><b>Harga:</b> Rp ${p.price.toLocaleString('id-ID')}</div>
                        <div><b>Sisa Stok:</b> ${p.stock} pcs</div>
                    </div>
                    <div class="mobile-card-footer">
                        <button type="button" class="btn-sm btn-status" onclick="updateProductStock('${p.id}')"><i class="fa-solid fa-pen-to-square"></i> Update Stok</button>
                    </div>
                </div>
            `;
        }
    });

    checkEmptyTable(tableBody, filteredProducts.length, 6, 'Belum ada produk.');
}

async function updateProductStock(productId) {
    let product = products.find(p => p.id === productId);
    if (!product) return;

    const { value: formValues } = await Swal.fire({
        title: `<div class="swal-custom-title"><i class="fa-solid fa-pen-to-square" style="color:#059669;"></i> Update "${product.name}"</div>`,
        html:
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
        cancelButtonText: 'Batal',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        customClass: {
            popup: 'swal2-popup-modern'
        },
        preConfirm: () => [
            document.getElementById('swal-input-stock').value,
            document.getElementById('swal-input-price').value
        ]
    });

    if (formValues) {
        const newStock = parseInt(formValues[0]);
        const newPrice = parseInt(formValues[1]);
        if (isNaN(newStock) || newStock < 0 || isNaN(newPrice) || newPrice <= 0) return;

        product.stock = newStock;
        product.price = newPrice;
        saveData();
        renderStock();
        populateProductDropdown();
    }
}

const addProductForm = document.getElementById('add-product-form');
if (addProductForm) {
    addProductForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('prod-name').value.trim();
        const price = parseInt(document.getElementById('prod-price').value);
        const stock = parseInt(document.getElementById('prod-stock').value);

        const newId = 'PRD' + String(products.length + 1).padStart(2, '0');
        products.push({ id: newId, name, price, stock });
        saveData();

        Swal.fire({ icon: 'success', title: 'Produk Ditambahkan!' });
        addProductForm.reset();
        renderStock();
        populateProductDropdown();
    });
}

function toggleDateFilter() {
    const periodeSelect = document.getElementById('filter-periode');
    const datePickerWrapper = document.getElementById('date-picker-wrapper');
    const monthPickerWrapper = document.getElementById('month-picker-wrapper');

    if (periodeSelect && periodeSelect.value === 'harian') {
        if (datePickerWrapper) datePickerWrapper.style.display = 'inline-block';
        if (monthPickerWrapper) monthPickerWrapper.style.display = 'none';
    } else if (periodeSelect && periodeSelect.value === 'bulanan') {
        if (datePickerWrapper) datePickerWrapper.style.display = 'none';
        if (monthPickerWrapper) monthPickerWrapper.style.display = 'inline-block';
    } else {
        if (datePickerWrapper) datePickerWrapper.style.display = 'none';
        if (monthPickerWrapper) monthPickerWrapper.style.display = 'none';
    }
    renderLaporan();
}

function renderLaporan() {
    populateReportProductFilter();
    let totalOmzet = 0, totalPengeluaran = 0, channelCount = {}, productSalesCount = {};

    const detailBody = document.getElementById('detail-transaksi-body');
    const mobileCards = document.getElementById('report-cards-mobile');
    const periodeVal = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'semua';
    const tanggalVal = document.getElementById('filter-tanggal') ? document.getElementById('filter-tanggal').value : '';
    const bulanVal = document.getElementById('filter-bulan') ? document.getElementById('filter-bulan').value : '';
    const produkVal = document.getElementById('filter-produk') ? document.getElementById('filter-produk').value.toLowerCase() : 'semua';

    if (detailBody) detailBody.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';

    const isDateMatch = (dateStr) => {
        if (!dateStr) return false;
        const parts = dateStr.split(',')[0].trim().split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            if (periodeVal === 'harian' && tanggalVal) return `${year}-${month}-${day}` === tanggalVal;
            if (periodeVal === 'bulanan' && bulanVal) return `${year}-${month}` === bulanVal;
        }
        return periodeVal === 'semua';
    };

    let filteredOrders = orders.filter(o => isDateMatch(o.date));

    filteredOrders.forEach(o => {
        channelCount[o.channel] = (channelCount[o.channel] || 0) + 1;

        if (o.items && Array.isArray(o.items)) {
            o.items.forEach(item => {
                productSalesCount[item.productName] = (productSalesCount[item.productName] || 0) + item.qty;

                const nameMatch = (produkVal === 'semua' || item.productName.toLowerCase() === produkVal);
                if (nameMatch) {
                    const itemTotal = item.price * item.qty;
                    totalOmzet += itemTotal;

                    if (detailBody) {
                        detailBody.innerHTML += `
                            <tr>
                                <td>${o.date || '-'}</td>
                                <td><b>${item.productName}</b> ${item.note ? `<br><small style="color:#64748b;">[${item.note}]</small>` : ''}</td>
                                <td>${item.qty} pcs</td>
                                <td>${o.customer}</td>
                                <td>Rp ${itemTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        `;
                    }

                    if (mobileCards) {
                        mobileCards.innerHTML += `
                            <div class="mobile-card">
                                <div class="mobile-card-header">
                                    <span class="mobile-card-title">${item.productName}</span>
                                    <span class="badge badge-selesai">Rp ${itemTotal.toLocaleString('id-ID')}</span>
                                </div>
                                <div class="mobile-card-body">
                                    <div><b>Tanggal:</b> ${o.date || '-'} | <b>Qty:</b> ${item.qty} pcs</div>
                                    <div><b>Customer:</b> ${o.customer}</div>
                                    ${item.note ? `<div><b>Catatan:</b> ${item.note}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }
                }
            });
        } else {
            productSalesCount[o.product] = (productSalesCount[o.product] || 0) + (o.qty || 1);
            const nameMatch = (produkVal === 'semua' || o.product.toLowerCase().includes(produkVal));
            if (nameMatch) {
                totalOmzet += o.price;

                if (detailBody) {
                    detailBody.innerHTML += `
                        <tr>
                            <td>${o.date || '-'}</td>
                            <td><b>${o.product}</b></td>
                            <td>${o.qty || 1} pcs</td>
                            <td>${o.customer}</td>
                            <td>Rp ${o.price.toLocaleString('id-ID')}</td>
                        </tr>
                    `;
                }

                if (mobileCards) {
                    mobileCards.innerHTML += `
                        <div class="mobile-card">
                            <div class="mobile-card-header">
                                <span class="mobile-card-title">${o.product}</span>
                                <span class="badge badge-selesai">Rp ${o.price.toLocaleString('id-ID')}</span>
                            </div>
                            <div class="mobile-card-body">
                                <div><b>Tanggal:</b> ${o.date || '-'} | <b>Qty:</b> ${o.qty || 1} pcs</div>
                                <div><b>Customer:</b> ${o.customer}</div>
                            </div>
                        </div>
                    `;
                }
            }
        }
    });

    let filteredExpenses = expenses.filter(exp => isDateMatch(exp.date));
    filteredExpenses.forEach(exp => { totalPengeluaran += exp.amount; });

    let labaBersih = totalOmzet - totalPengeluaran;
    let topChannel = Object.keys(channelCount).length > 0 ? Object.keys(channelCount).reduce((a, b) => channelCount[a] > channelCount[b] ? a : b) : '-';
    let topProduct = Object.keys(productSalesCount).length > 0 ? Object.keys(productSalesCount).reduce((a, b) => productSalesCount[a] > productSalesCount[b] ? a : b) : '-';

    if (document.getElementById('report-omzet')) document.getElementById('report-omzet').innerText = 'Rp ' + totalOmzet.toLocaleString('id-ID');
    if (document.getElementById('report-pengeluaran')) document.getElementById('report-pengeluaran').innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');
    if (document.getElementById('report-laba')) {
        const labaElem = document.getElementById('report-laba');
        labaElem.innerText = 'Rp ' + labaBersih.toLocaleString('id-ID');
        labaElem.style.color = labaBersih >= 0 ? '#059669' : '#ef4444';
    }
    if (document.getElementById('report-top-channel')) document.getElementById('report-top-channel').innerText = topChannel;
    if (document.getElementById('report-top-product')) document.getElementById('report-top-product').innerText = topProduct;
}

function checkEmptyTable(elem, length, colSpan, message) {
    if (length === 0 && elem) {
        elem.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#94a3b8; padding: 20px;">${message}</td></tr>`;
        return true;
    }
    return false;
}

// --- EXPORT EXCEL (.XLSX) RAPI DI SEMUA SHEET ---
function exportToExcel() {
    if (orders.length === 0 && expenses.length === 0) {
        Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Belum ada data penjualan maupun pengeluaran untuk di-export.' });
        return;
    }

    const wb = XLSX.utils.book_new();
    const todayStr = new Date().toLocaleDateString('id-ID');
    const storeTitle = (ownerAccount.storeName || 'UMKM DIGITAL').toUpperCase();
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
        ["Tanggal Cetak:"],
        [todayStr],
        ["No", "No Order", "Tanggal", "Customer", "ID / No. Meja", "Detail Produk", "Channel", "Status", "Total Penjualan (Rp)"]
    ];

    const salesRows = orders.map((o, idx) => [
        idx + 1,
        o.id,
        o.date || '-',
        o.customer,
        o.phone || '-',
        o.product,
        o.channel,
        o.status,
        Number(o.price) || 0
    ]);

    const lastSalesRow = 4 + salesRows.length;
    const totalSalesRowIndex = lastSalesRow + 1;
    const salesFooter = [
        ["", "", "", "", "", "", "", "TOTAL OMZET", salesRows.length > 0 ? { t: 'n', f: `SUM(I5:I${lastSalesRow})` } : 0]
    ];

    const wsSales = XLSX.utils.aoa_to_sheet([...salesHeader, ...salesRows, ...salesFooter]);
    wsSales['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }
    ];
    wsSales['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 22 }, { wch: 24 }, { wch: 16 }, { wch: 36 }, { wch: 20 }, { wch: 14 }, { wch: 22 }];
    applyCurrencyFormat(wsSales, 'I', 5, totalSalesRowIndex);
    XLSX.utils.book_append_sheet(wb, wsSales, "Laporan Penjualan");

    // 2. SHEET LAPORAN PENGELUARAN
    const expHeader = [
        [`LAPORAN PENGELUARAN ${storeTitle}`],
        ["Tanggal Cetak:"],
        [todayStr],
        ["No", "ID Pengeluaran", "Tanggal", "Deskripsi Pengeluaran", "Kategori", "Nominal (Rp)"]
    ];

    const expRows = expenses.map((e, idx) => [
        idx + 1,
        e.id,
        e.date || '-',
        e.name,
        e.category,
        Number(e.amount) || 0
    ]);

    const lastExpRow = 4 + expRows.length;
    const totalExpRowIndex = lastExpRow + 1;
    const expFooter = [
        ["", "", "", "", "TOTAL PENGELUARAN", expRows.length > 0 ? { t: 'n', f: `SUM(F5:F${lastExpRow})` } : 0]
    ];

    const wsExp = XLSX.utils.aoa_to_sheet([...expHeader, ...expRows, ...expFooter]);
    wsExp['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
    ];
    wsExp['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 22 }, { wch: 34 }, { wch: 24 }, { wch: 22 }];
    applyCurrencyFormat(wsExp, 'F', 5, totalExpRowIndex);
    XLSX.utils.book_append_sheet(wb, wsExp, "Laporan Pengeluaran");

    // 3. SHEET RINGKASAN LABA BERSIH
    const summaryData = [
        [`RINGKASAN KEUANGAN & LABA BERSIH ${storeTitle}`],
        ["Tanggal Cetak:"],
        [todayStr],
        ["No", "Keterangan Komponen Keuangan", "Jumlah (Rp)"],
        [1, "Total Pendapatan (Omzet Penjualan)", { t: 'n', f: `'Laporan Penjualan'!I${totalSalesRowIndex}` }],
        [2, "Total Pengeluaran Operasional", { t: 'n', f: `'Laporan Pengeluaran'!F${totalExpRowIndex}` }],
        ["", "LABA BERSIH (OMZET - PENGELUARAN)", { t: 'n', f: "C5-C6" }]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }
    ];
    wsSummary['!cols'] = [{ wch: 6 }, { wch: 42 }, { wch: 24 }];
    applyCurrencyFormat(wsSummary, 'C', 5, 7);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Laba Bersih");

    XLSX.writeFile(wb, `Laporan_Keuangan_UMKM_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// --- INISIALISASI AWAL ---
populateProductDropdown();
populateCustomerDatalist();
loadAccountSettingsUI();
renderDashboard();