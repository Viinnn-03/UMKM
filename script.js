// --- DATA AWAL BERSIH DARI LOCALSTORAGE ---
let defaultProducts = [];
let defaultCustomers = [];
let defaultOrders = [];
let defaultExpenses = [];

let products = JSON.parse(localStorage.getItem('umkm_products')) || defaultProducts;
let customers = JSON.parse(localStorage.getItem('umkm_customers')) || defaultCustomers;
let orders = JSON.parse(localStorage.getItem('umkm_orders')) || defaultOrders;
let expenses = JSON.parse(localStorage.getItem('umkm_expenses')) || defaultExpenses;

// FUNGSI UNTUK MENYIMPAN SETIAP PERUBAHAN KE LOCALSTORAGE
function saveData() {
    localStorage.setItem('umkm_products', JSON.stringify(products));
    localStorage.setItem('umkm_customers', JSON.stringify(customers));
    localStorage.setItem('umkm_orders', JSON.stringify(orders));
    localStorage.setItem('umkm_expenses', JSON.stringify(expenses));
}

// --- FUNGSI NAVIGASI SIDEBAR ---
function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    if (typeof event !== 'undefined' && event && event.target) {
        event.target.classList.add('active');
    }

    renderDashboard();
    renderCustomers();
    renderStock();
    renderPengeluaran();
    renderLaporan();
}

// --- POPULATE OPTION PRODUK PADA FORM ---
function populateProductDropdown() {
    const select = document.getElementById('cust-product');
    if (!select) return;
    select.innerHTML = '';

    if (products.length === 0) {
        select.innerHTML = `<option value="">-- Belum ada produk (Tambah di Manajemen Stok) --</option>`;
        return;
    }

    products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (Stok: ${p.stock}) - Rp ${p.price.toLocaleString('id-ID')}</option>`;
    });
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

// --- AUTO-FILL NAMA & ALAMAT DARI NO HP ---
const phoneInput = document.getElementById('cust-phone');
if (phoneInput) {
    phoneInput.addEventListener('input', function () {
        const inputPhone = this.value.trim();
        const nameInput = document.getElementById('cust-name');
        const addressInput = document.getElementById('cust-address');

        const foundCustomer = customers.find(c => c.phone && c.phone.trim() === inputPhone);

        if (foundCustomer) {
            if (nameInput) nameInput.value = foundCustomer.name;
            if (addressInput) addressInput.value = foundCustomer.address;
        }
    });
}

function checkEmptyTable(elem, length, colSpan, message) {
    if (length === 0 && elem) {
        elem.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#999; padding: 20px;">${message}</td></tr>`;
        return true;
    }
    return false;
}

// --- RENDER DASHBOARD UTAMA + FITUR SEARCH & BATAL PESANAN ---
function renderDashboard() {
    const tableBody = document.getElementById('order-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const searchQuery = document.getElementById('search-order') ? document.getElementById('search-order').value.toLowerCase() : '';

    let totalOrders = orders.length;
    let newOrders = 0, processOrders = 0, doneOrders = 0, totalOmzet = 0;
    let productSalesCount = {};

    let filteredOrders = orders.filter(o => 
        o.id.toLowerCase().includes(searchQuery) || 
        o.customer.toLowerCase().includes(searchQuery) ||
        (o.phone && o.phone.includes(searchQuery))
    );

    filteredOrders.forEach(o => {
        if (o.status === 'Baru') newOrders++;
        if (o.status === 'Diproses') processOrders++;
        if (o.status === 'Selesai') {
            doneOrders++;
            totalOmzet += o.price * o.qty;
        }

        productSalesCount[o.product] = (productSalesCount[o.product] || 0) + o.qty;

        let badgeClass = o.status === 'Baru' ? 'badge-baru' : (o.status === 'Diproses' ? 'badge-proses' : 'badge-selesai');

        tableBody.innerHTML += `
            <tr>
                <td><b>${o.id}</b></td>
                <td>${o.customer}</td>
                <td>${o.phone || '-'}</td>
                <td>${o.product} (${o.qty}x)</td>
                <td><span class="channel-tag">${o.channel}</span></td>
                <td><span class="badge ${badgeClass}">${o.status}</span></td>
                <td>
                    ${o.status !== 'Selesai' ? `<button class="btn-sm btn-status" onclick="nextStatus('${o.id}')">Ubah Status</button>` : '<span style="color:#27ae60; font-weight:bold;">Selesai</span>'}
                    <button class="btn-sm" style="background-color:#e74c3c; color:white; margin-left:5px;" onclick="cancelOrder('${o.id}')">Batal</button>
                </td>
            </tr>
        `;
    });

    checkEmptyTable(tableBody, filteredOrders.length, 7, 'Tidak ada pesanan yang sesuai.');

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

// --- INPUT PESANAN MANUAL ---
const orderForm = document.getElementById('order-form');
if (orderForm) {
    orderForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const custNameInput = document.getElementById('cust-name').value.trim();
        const custPhoneInput = document.getElementById('cust-phone').value.trim();
        const custAddressElem = document.getElementById('cust-address');
        const custAddress = custAddressElem ? custAddressElem.value.trim() : 'Alamat Tidak Diisi';
        const productId = document.getElementById('cust-product').value;
        const qty = parseInt(document.getElementById('cust-qty').value);
        const channel = document.getElementById('cust-channel').value;

        const product = products.find(p => p.id === productId);

        if (!product) {
            Swal.fire({ icon: 'warning', title: 'Produk Belum Dipilih', text: 'Tambah produk terlebih dahulu.' });
            return;
        }

        if (product.stock < qty) {
            Swal.fire({ icon: 'error', title: 'Stok Tidak Cukup', text: `Sisa stok ${product.name}: ${product.stock} pcs.` });
            return;
        }

        product.stock -= qty;

        const now = new Date();
        const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;

        const newOrderId = 'ORD-00' + (orders.length + 1);
        orders.push({
            id: newOrderId,
            customer: custNameInput,
            phone: custPhoneInput,
            product: product.name,
            qty: qty,
            channel: channel,
            status: 'Baru',
            price: product.price,
            date: formattedDate
        });

        let existingCust = customers.find(c => c.phone && c.phone.trim() === custPhoneInput);
        if (existingCust) {
            existingCust.name = custNameInput;
            if (custAddress) existingCust.address = custAddress;
        } else {
            customers.push({
                phone: custPhoneInput,
                name: custNameInput,
                address: custAddress,
                history: 1,
                totalSpent: (product.price * qty)
            });
        }

        saveData();

        Swal.fire({
            icon: 'success',
            title: 'Pesanan Berhasil Dibuat!',
            html: `Order ID: <b>${newOrderId}</b>`,
            confirmButtonColor: '#3b82f6'
        });

        document.getElementById('order-form').reset();
        populateProductDropdown();
        renderDashboard();
        renderCustomers();
        renderStock();
    });
}

// --- OTOMATISASI PARSER WA FLEKSIBEL ---
function prosesAutoWA() {
    const inputElem = document.getElementById('wa-chat-input');
    if (!inputElem) return;

    const chatText = inputElem.value;

    if (!chatText.trim()) {
        Swal.fire({ icon: 'info', title: 'Teks WA Kosong', text: 'Tempel teks pesan WhatsApp terlebih dahulu!' });
        return;
    }

    const nameMatch = chatText.match(/Nama:\s*(.*)/i);
    const phoneMatch = chatText.match(/(?:No HP|No WA|HP|WA|Telepon):\s*(.*)/i);
    const addressMatch = chatText.match(/Alamat:\s*(.*)/i);
    const productMatch = chatText.match(/(?:Produk|Pesanan|Pesan):\s*(.*)/i);
    const qtyMatch = chatText.match(/(?:Jumlah|Qty|Pcs):\s*(\d+)/i);

    if (!nameMatch || !productMatch || !qtyMatch) {
        Swal.fire({
            icon: 'error',
            title: 'Format Tidak Sesuai',
            html: 'Gunakan kata kunci seperti Nama:, No HP/WA:, Alamat:, Produk:, dan Qty/Jumlah:'
        });
        return;
    }

    const custName = nameMatch[1].trim();
    const custPhone = phoneMatch ? phoneMatch[1].trim() : '08' + Math.floor(100000000 + Math.random() * 900000000);
    const custAddress = addressMatch ? addressMatch[1].trim() : 'Order via WA';
    const productNameInput = productMatch[1].trim().toLowerCase();
    const qty = parseInt(qtyMatch[1].trim());

    const product = products.find(p => p.name.toLowerCase().includes(productNameInput));

    if (!product) {
        Swal.fire({ icon: 'warning', title: 'Produk Tidak Ditemukan', text: `Produk "${productMatch[1]}" tidak ada di stok.` });
        return;
    }

    if (product.stock < qty) {
        Swal.fire({ icon: 'error', title: 'Stok Tidak Cukup', text: `Stok tersisa: ${product.stock} pcs.` });
        return;
    }

    product.stock -= qty;

    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;

    const newOrderId = 'ORD-00' + (orders.length + 1);
    orders.push({
        id: newOrderId,
        customer: custName,
        phone: custPhone,
        product: product.name,
        qty: qty,
        channel: 'WhatsApp',
        status: 'Baru',
        price: product.price,
        date: formattedDate
    });

    let existingCust = customers.find(c => c.phone && c.phone.trim() === custPhone);
    if (existingCust) {
        existingCust.name = custName;
        if (addressMatch) existingCust.address = custAddress;
    } else {
        customers.push({
            phone: custPhone,
            name: custName,
            address: custAddress,
            history: 1,
            totalSpent: (product.price * qty)
        });
    }

    saveData();

    Swal.fire({
        icon: 'success',
        title: 'Otomatisasi Berhasil!',
        html: `Order ID: <b>${newOrderId}</b><br>Customer: <b>${custName}</b>`,
        confirmButtonColor: '#25D366'
    });

    inputElem.value = '';
    populateProductDropdown();
    renderDashboard();
    renderCustomers();
    renderStock();
}

// --- FUNGSI BATAL PESANAN & ROLLBACK STOK ---
function cancelOrder(orderId) {
    Swal.fire({
        title: 'Pembatalan Pesanan',
        text: 'Apakah Anda yakin ingin membatalkan pesanan ini? Stok produk akan dikembalikan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Ya, Batalkan'
    }).then((result) => {
        if (result.isConfirmed) {
            const index = orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                const order = orders[index];
                // Rollback stok
                const product = products.find(p => p.name.toLowerCase() === order.product.toLowerCase());
                if (product) {
                    product.stock += order.qty;
                }
                orders.splice(index, 1);
                saveData();

                Swal.fire('Dibatalkan!', 'Pesanan telah dibatalkan dan stok dikembalikan.', 'success');
                renderDashboard();
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

    expenses.push({
        id: newExpId,
        name: name,
        category: category,
        amount: amount,
        date: formattedDate
    });

    saveData();

    Swal.fire({
        icon: 'success',
        title: 'Pengeluaran Dicatat!',
        confirmButtonColor: '#e74c3c'
    });

    document.getElementById('expense-form').reset();
    renderPengeluaran();
    renderLaporan();
}

function renderPengeluaran() {
    const expenseBody = document.getElementById('detail-pengeluaran-body');
    if (!expenseBody) return;

    expenseBody.innerHTML = '';
    let totalExp = 0;

    expenses.forEach(exp => {
        totalExp += exp.amount;
        expenseBody.innerHTML += `
            <tr>
                <td>${exp.date || '-'}</td>
                <td>${exp.name}</td>
                <td>${exp.category}</td>
                <td style="color:#e74c3c; font-weight:bold;">Rp ${exp.amount.toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    if (document.getElementById('total-pengeluaran-card')) {
        document.getElementById('total-pengeluaran-card').innerText = 'Rp ' + totalExp.toLocaleString('id-ID');
    }

    checkEmptyTable(expenseBody, expenses.length, 4, 'Belum ada catatan pengeluaran.');
}

function nextStatus(orderId) {
    let order = orders.find(o => o.id === orderId);
    if (order.status === 'Baru') order.status = 'Diproses';
    else if (order.status === 'Diproses') order.status = 'Selesai';
    
    saveData();
    renderDashboard();
    renderLaporan();
}

function renderCustomers() {
    const tableBody = document.getElementById('customer-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const searchQuery = document.getElementById('search-customer') ? document.getElementById('search-customer').value.toLowerCase() : '';

    let filteredCust = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery) || 
        (c.phone && c.phone.includes(searchQuery))
    );

    filteredCust.forEach(c => {
        let custOrders = orders.filter(o => o.phone && c.phone && o.phone.trim() === c.phone.trim());

        c.history = custOrders.length;
        c.totalSpent = custOrders.reduce((total, o) => total + (o.price * o.qty), 0);

        tableBody.innerHTML += `
            <tr>
                <td><b>${c.phone}</b></td>
                <td>${c.name}</td>
                <td>${c.address}</td>
                <td>${c.history} Kali Pemesanan</td>
                <td>Rp ${c.totalSpent.toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    checkEmptyTable(tableBody, filteredCust.length, 5, 'Belum ada data pelanggan.');
}

function renderStock() {
    const tableBody = document.getElementById('stock-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const searchQuery = document.getElementById('search-stock') ? document.getElementById('search-stock').value.toLowerCase() : '';

    let filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery) || p.id.toLowerCase().includes(searchQuery));

    filteredProducts.forEach(p => {
        let statusStok = p.stock > 10 ? 'Aman' : (p.stock > 0 ? 'Menipis' : 'Habis');
        let badgeColorClass = p.stock > 10 ? 'badge-selesai' : (p.stock > 0 ? 'badge-proses' : 'badge-baru');

        tableBody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td><b>${p.name}</b></td>
                <td>Rp ${p.price.toLocaleString('id-ID')}</td>
                <td><b>${p.stock}</b></td>
                <td><span class="badge ${badgeColorClass}">${statusStok}</span></td>
                <td>
                    <button class="btn-sm btn-status" onclick="updateProductStock('${p.id}')">Update Stok</button>
                </td>
            </tr>
        `;
    });

    checkEmptyTable(tableBody, filteredProducts.length, 6, 'Belum ada produk terdaftar.');
}

async function updateProductStock(productId) {
    let product = products.find(p => p.id === productId);
    if (!product) return;

    const { value: formValues } = await Swal.fire({
        title: `Update "${product.name}"`,
        html:
            `<label style="display:block;text-align:left;margin-bottom:5px;">Sisa Stok Baru:</label>` +
            `<input id="swal-input-stock" type="number" min="0" class="swal2-input" value="${product.stock}">` +
            `<label style="display:block;text-align:left;margin-top:10px;margin-bottom:5px;">Harga Produk (Rp):</label>` +
            `<input id="swal-input-price" type="number" min="1" class="swal2-input" value="${product.price}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        preConfirm: () => [
            document.getElementById('swal-input-stock').value,
            document.getElementById('swal-input-price').value
        ]
    });

    if (formValues) {
        const newStock = parseInt(formValues[0]);
        const newPrice = parseInt(formValues[1]);

        if (isNaN(newStock) || newStock < 0 || isNaN(newPrice) || newPrice <= 0) {
            Swal.fire({ icon: 'error', title: 'Data Tidak Valid' });
            return;
        }

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

        const nextIdNumber = products.length + 1;
        const newId = 'PRD' + String(nextIdNumber).padStart(2, '0');

        products.push({ id: newId, name: name, price: price, stock: stock });
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
    const dateInput = document.getElementById('filter-tanggal');
    const monthInput = document.getElementById('filter-bulan');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    if (periodeSelect && periodeSelect.value === 'harian') {
        if (datePickerWrapper) datePickerWrapper.style.display = 'inline-block';
        if (monthPickerWrapper) monthPickerWrapper.style.display = 'none';
        if (dateInput && !dateInput.value) dateInput.value = `${yyyy}-${mm}-${dd}`;
    } else if (periodeSelect && periodeSelect.value === 'bulanan') {
        if (datePickerWrapper) datePickerWrapper.style.display = 'none';
        if (monthPickerWrapper) monthPickerWrapper.style.display = 'inline-block';
        if (monthInput && !monthInput.value) monthInput.value = `${yyyy}-${mm}`;
    } else {
        if (datePickerWrapper) datePickerWrapper.style.display = 'none';
        if (monthPickerWrapper) monthPickerWrapper.style.display = 'none';
    }

    renderLaporan();
}

function renderLaporan() {
    populateReportProductFilter();

    let totalOmzet = 0;
    let totalPengeluaran = 0;
    let channelCount = {};
    let productCount = {};

    const detailBody = document.getElementById('detail-transaksi-body');
    const periodeVal = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'semua';
    const tanggalVal = document.getElementById('filter-tanggal') ? document.getElementById('filter-tanggal').value : '';
    const bulanVal = document.getElementById('filter-bulan') ? document.getElementById('filter-bulan').value : '';
    const produkVal = document.getElementById('filter-produk') ? document.getElementById('filter-produk').value.toLowerCase() : 'semua';

    if (detailBody) detailBody.innerHTML = '';

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

    let filteredOrders = orders.filter(o => {
        const dateMatches = isDateMatch(o.date);
        const productMatches = (produkVal === 'semua') || (o.product.toLowerCase().includes(produkVal) || produkVal.includes(o.product.toLowerCase()));
        return dateMatches && productMatches;
    });

    filteredOrders.forEach(o => {
        let totalHarga = o.price * o.qty;
        totalOmzet += totalHarga;

        channelCount[o.channel] = (channelCount[o.channel] || 0) + o.qty;
        productCount[o.product] = (productCount[o.product] || 0) + o.qty;

        if (detailBody) {
            detailBody.innerHTML += `
                <tr>
                    <td>${o.date || '-'}</td>
                    <td>${o.product.toLowerCase()}</td>
                    <td>${o.qty}</td>
                    <td>${o.customer.toLowerCase()}</td>
                    <td>Rp ${totalHarga.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }
    });

    if (detailBody && filteredOrders.length === 0) {
        detailBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding: 20px;">Tidak ada transaksi untuk filter ini.</td></tr>`;
    }

    let filteredExpenses = expenses.filter(exp => isDateMatch(exp.date));
    filteredExpenses.forEach(exp => { totalPengeluaran += exp.amount; });

    let labaBersih = totalOmzet - totalPengeluaran;

    let topChannel = Object.keys(channelCount).length > 0 ? Object.keys(channelCount).reduce((a, b) => channelCount[a] > channelCount[b] ? a : b) : '-';
    let topProduct = Object.keys(productCount).length > 0 ? Object.keys(productCount).reduce((a, b) => productCount[a] > productCount[b] ? a : b) : '-';

    if (document.getElementById('report-omzet')) document.getElementById('report-omzet').innerText = 'Rp ' + totalOmzet.toLocaleString('id-ID');
    if (document.getElementById('report-pengeluaran')) document.getElementById('report-pengeluaran').innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');
    if (document.getElementById('report-laba')) {
        const labaElem = document.getElementById('report-laba');
        labaElem.innerText = 'Rp ' + labaBersih.toLocaleString('id-ID');
        labaElem.style.color = labaBersih >= 0 ? '#27ae60' : '#e74c3c';
    }
    if (document.getElementById('report-top-channel')) document.getElementById('report-top-channel').innerText = topChannel;
    if (document.getElementById('report-top-product')) document.getElementById('report-top-product').innerText = topProduct;
}

// --- FUNGSI EXPORT & BACKUP DATA (EXCEL / JSON) ---
function exportToCSV() {
    if (orders.length === 0) {
        Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Belum ada data transaksi untuk di-export.' });
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,No Order,Tanggal,Customer,No HP,Produk,Jumlah,Harga,Channel,Status\n";

    orders.forEach(o => {
        let row = `"${o.id}","${o.date}","${o.customer}","${o.phone}","${o.product}",${o.qty},${o.price},"${o.channel}","${o.status}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Transaksi_UMKM_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function backupDataJSON() {
    const backupData = { products, customers, orders, expenses };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_Toko_UMKM_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function restoreDataJSON(event) {
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.products && data.orders) {
                products = data.products;
                customers = data.customers || [];
                orders = data.orders;
                expenses = data.expenses || [];
                saveData();
                Swal.fire({ icon: 'success', title: 'Restore Berhasil!', text: 'Data toko telah diperbarui dari file backup.' });
                showSection('dashboard');
            } else {
                Swal.fire({ icon: 'error', title: 'Format Salah', text: 'File backup JSON tidak valid.' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membaca file JSON.' });
        }
    };
    if (event.target.files[0]) {
        fileReader.readAsText(event.target.files[0]);
    }
}

// --- INISIALISASI AWAL ---
populateProductDropdown();
renderDashboard();