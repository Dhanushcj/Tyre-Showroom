// admin.js - Enterprise Billing & Accounting Suite Logic

document.addEventListener('DOMContentLoaded', async () => {
    await window.tsDB.init();
    // --- View Management ---
    const viewIds = ['overview', 'invoices', 'inventory', 'billing', 'customers', 'payments', 'reports', 'settings'];
    
    function showView(viewId) {
        console.log("Switching to view:", viewId);
        
        // Hide all views using display style for maximum reliability
        viewIds.forEach(id => {
            const el = document.getElementById(id + '-view');
            if (el) {
                el.style.display = 'none';
                el.classList.add('hidden'); // Also add hidden for safety
            }
        });
        
        // Show target view
        const target = document.getElementById(viewId + '-view');
        if (target) {
            target.style.display = 'block';
            target.classList.remove('hidden');
            console.log("View shown:", viewId);
        } else {
            console.error("View element not found:", viewId + '-view');
            const overview = document.getElementById('overview-view');
            if (overview) overview.style.display = 'block';
        }

        // Update Sidebar Active State
        const sidebarLinks = document.querySelectorAll('aside nav a');
        sidebarLinks.forEach(link => {
            const id = link.id;
            const activeClasses = ['bg-brand-600/10', 'text-brand-500', 'border-brand-500/20'];
            const inactiveClasses = ['text-slate-400', 'hover:bg-brand-600/10', 'hover:text-brand-500', 'hover:border-brand-500/20', 'border-transparent'];
            
            if (id === `nav-${viewId}`) {
                link.classList.remove(...inactiveClasses);
                link.classList.add(...activeClasses);
            } else {
                link.classList.remove(...activeClasses);
                link.classList.add(...inactiveClasses);
            }
        });

        // Specific View Initialization
        try {
            if (viewId === 'inventory') renderInventory();
            if (viewId === 'customers') renderCustomers();
            if (viewId === 'invoices') renderInvoices();
            if (viewId === 'payments') renderPayments();
            if (viewId === 'overview') updateOverviewCards();
            if (viewId === 'billing') {
                const invoices = window.tsDB.get('invoices');
                const invToEdit = editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId) : null;
                initBillingView(invToEdit);
            }
            if (viewId === 'reports') renderReports();
        } catch (err) {
            console.error("Error initializing view:", viewId, err);
        }
    }

    // Hash-based routing
    function handleRouting() {
        const hash = window.location.hash.substring(1) || 'overview';
        showView(hash);
    }

    window.addEventListener('hashchange', handleRouting);

    // Sidebar Click Handlers
    document.querySelectorAll('aside nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetHash = href.substring(1);
                if (targetHash === 'billing' && !editingInvoiceId) {
                    // Fresh click to billing - state is handled by showView -> initBillingView(null)
                }
            }
        });
    });

    // --- Inventory Module ---
    // --- Inventory Modal Control ---
    const invModal = document.getElementById('inventory-modal');
    const invForm = document.getElementById('inventory-form');
    
    function openInventoryModal(mode, sku = null) {
        const titleEl = document.getElementById('modal-title');
        const modeEl = document.getElementById('modal-mode');
        const skuOrigEl = document.getElementById('modal-sku-orig');
        const stockLabel = document.getElementById('modal-stock-label');
        const submitBtn = document.getElementById('modal-submit-btn');

        const nameInput = document.getElementById('modal-name');
        const skuInput = document.getElementById('modal-sku');
        const catInput = document.getElementById('modal-category');
        const priceInput = document.getElementById('modal-price');
        const stockInput = document.getElementById('modal-stock');

        // Reset fields
        invForm.reset();
        modeEl.value = mode;
        skuOrigEl.value = sku || '';
        
        // Show/Hide fields based on mode
        document.getElementById('modal-field-name').classList.remove('hidden');
        document.getElementById('modal-field-sku').classList.remove('hidden');
        document.getElementById('modal-field-category').classList.remove('hidden');
        document.getElementById('modal-field-price').classList.remove('hidden');
        document.getElementById('modal-field-stock').classList.remove('hidden');

        if (mode === 'add') {
            titleEl.innerText = "Add New Tyre Model";
            stockLabel.innerText = "Initial Stock Quantity";
            submitBtn.innerText = "Register New Item";
            skuInput.value = `TYRE-${Math.floor(Math.random()*10000)}`;
        } else if (mode === 'modify') {
            titleEl.innerText = "Modify Item Details";
            submitBtn.innerText = "Update Pricing & Info";
            const items = window.tsDB.get('inventory');
            const item = items.find(i => i.sku === sku);
            if (item) {
                nameInput.value = item.name;
                skuInput.value = item.sku;
                catInput.value = item.category;
                priceInput.value = item.price;
                stockInput.value = item.stock;
                stockLabel.innerText = "Current Stock Level";
            }
        } else if (mode === 'restock') {
            titleEl.innerText = "Inventory Restock";
            submitBtn.innerText = "Add Stock to Ledger";
            const items = window.tsDB.get('inventory');
            const item = items.find(i => i.sku === sku);
            if (item) {
                nameInput.value = item.name;
                skuInput.value = item.sku;
                catInput.value = item.category;
                priceInput.value = 0; // Fresh quantity to add
                stockInput.value = 10; // Default fresh quantity
                
                // Keep only name and stock addition
                document.getElementById('modal-field-sku').classList.add('hidden');
                document.getElementById('modal-field-category').classList.add('hidden');
                document.getElementById('modal-field-price').classList.add('hidden');
                stockLabel.innerText = "Quantity to Add";
                stockInput.placeholder = "e.g. 10";
            }
        }

        invModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scroll
    }

    function closeInventoryModal() {
        invModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (invForm) {
        invForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const mode = document.getElementById('modal-mode').value;
            const skuOrig = document.getElementById('modal-sku-orig').value;
            
            const name = document.getElementById('modal-name').value;
            const sku = document.getElementById('modal-sku').value;
            const category = document.getElementById('modal-category').value;
            const price = parseFloat(document.getElementById('modal-price').value) || 0;
            const stockValue = parseInt(document.getElementById('modal-stock').value) || 0;

            const items = window.tsDB.get('inventory') || [];

            if (mode === 'add') {
                items.push({ sku, name, category, price, stock: stockValue });
            } else if (mode === 'modify') {
                const item = items.find(i => i.sku === skuOrig);
                if (item) {
                    item.name = name;
                    item.sku = sku;
                    item.category = category;
                    item.price = price;
                    item.stock = stockValue;
                }
            } else if (mode === 'restock') {
                const item = items.find(i => i.sku === skuOrig);
                if (item) {
                    item.stock += stockValue;
                }
            }

            window.tsDB.save('inventory', items);
            renderInventory();
            closeInventoryModal();
        });
    }

    // Close modal: X button
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeInventoryModal();
        });
    }

    // Close modal: Backdrop click
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', function() {
            closeInventoryModal();
        });
    }

    // Close modal: Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && invModal && !invModal.classList.contains('hidden')) {
            closeInventoryModal();
        }
    });

    function renderInventory() {
        const items = window.tsDB.get('inventory');
        const tbody = document.querySelector('#inventory tbody');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic font-medium">No inventory items found.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr class="hover:bg-slate-50/50 transition-colors ${item.stock <= 5 ? 'bg-red-50/20' : ''}">
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-900">${item.name}</div>
                    <div class="text-xs text-slate-400">SKU: ${item.sku}</div>
                </td>
                <td class="px-6 py-4 text-slate-500 font-medium">${item.category}</td>
                <td class="px-6 py-4 font-bold text-slate-900">₹${item.price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.stock > 10 ? 'bg-green-100 text-green-700' : 
                        item.stock > 0 ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700 border border-red-200'
                    }">
                        ${item.stock} in stock
                    </span>
                </td>
                <td class="px-6 py-4 text-right space-x-3 text-[10px] font-black uppercase tracking-widest">
                    <button class="text-brand-600 hover:text-brand-800 modify-price" data-sku="${item.sku}">Modify</button>
                    <button class="text-slate-400 hover:text-slate-900 restock" data-sku="${item.sku}">Restock</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.modify-price').forEach(btn => {
            btn.addEventListener('click', () => {
                openInventoryModal('modify', btn.dataset.sku);
            });
        });

        tbody.querySelectorAll('.restock').forEach(btn => {
            btn.addEventListener('click', () => {
                openInventoryModal('restock', btn.dataset.sku);
            });
        });
    }

    // Global Add Inventory Button
    const addStockBtn = document.getElementById('add-stock-btn');
    if (addStockBtn) {
        addStockBtn.addEventListener('click', () => {
            openInventoryModal('add');
        });
    }

    // --- Customer Module ---
    function renderCustomers() {
        const customers = window.tsDB.get('customers') || [];
        const tbody = document.querySelector('#customers-table tbody');
        
        const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
        const activeDealers = customers.filter(c => c.type === 'Dealer').length;
        if (document.getElementById('customers-outstanding')) document.getElementById('customers-outstanding').innerText = `₹${totalOutstanding.toLocaleString('en-IN')}`;
        if (document.getElementById('customers-active-count')) document.getElementById('customers-active-count').innerText = activeDealers.toString();

        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-10 text-center text-slate-400 italic">No customers or dealers found.</td></tr>`;
            return;
        }

        tbody.innerHTML = customers.map(c => `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-8 py-6">
                    <div class="font-bold text-slate-900">${c.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold">${c.mobile || 'N/A'}</div>
                </td>
                <td class="px-8 py-6">
                    <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">${c.type}</span>
                </td>
                <td class="px-8 py-6">
                    <div class="font-black ${c.balance > 0 ? 'text-red-500' : 'text-slate-400 font-medium'}">₹${c.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </td>
                <td class="px-8 py-6 text-slate-400 text-xs">${c.creditLimit > 0 ? '₹'+c.creditLimit.toLocaleString('en-IN') : 'N/A'}</td>
                <td class="px-8 py-6 text-right">
                    <button class="text-slate-400 hover:text-brand-500"><i class="fa-solid fa-pen-to-square"></i></button>
                </td>
            </tr>
        `).join('');
    }

    // --- Billing View Logic ---
    let cart = [];
    let currentInvoiceStatus = 'Pending';
    let editingInvoiceId = null;

    function generateInvoiceId() {
        const invoices = window.tsDB.get('invoices');
        if (invoices.length === 0) return "INV-2026-0043";
        const ids = invoices.map(inv => {
            const parts = inv.id.split('-');
            return parseInt(parts[parts.length - 1]);
        });
        const maxId = Math.max(...ids);
        return `INV-2026-${(maxId + 1).toString().padStart(4, '0')}`;
    }

    function initBillingView(invoiceToEdit = null) {
        const titleEl = document.getElementById('billing-title');
        const subtitleEl = document.getElementById('billing-subtitle');
        const nextIdEl = document.getElementById('next-invoice-id');
        const finalizeBtn = document.getElementById('generate-invoice-btn');
        const itemSelect = document.getElementById('billing-item-select');

        // Dynamically populate the tyre product select dropdown
        if (itemSelect) {
            const inventory = window.tsDB.get('inventory') || [];
            itemSelect.innerHTML = '<option value="">Select Tyre Model...</option>' + 
                inventory.map(item => `<option value="${item.sku}">${item.name} (Stock: ${item.stock}) - ₹${item.price.toLocaleString('en-IN')}</option>`).join('');
        }

        if (invoiceToEdit) {
            editingInvoiceId = invoiceToEdit.id;
            cart = [...invoiceToEdit.items];
            if (titleEl) titleEl.innerText = "Edit Invoice";
            if (subtitleEl) subtitleEl.innerText = `Modifying existing invoice ${editingInvoiceId}`;
            if (nextIdEl) nextIdEl.innerText = editingInvoiceId;
            if (finalizeBtn) finalizeBtn.innerHTML = '<i class="fa-solid fa-save mr-3"></i> Save Changes';
            
            document.getElementById('bill-cust-name').value = invoiceToEdit.customerName || invoiceToEdit.customer || "";
            document.getElementById('bill-cust-phone').value = invoiceToEdit.customerPhone || "";
            document.getElementById('bill-gst-num').value = invoiceToEdit.customerGst || "";
            document.getElementById('bill-address').value = invoiceToEdit.billingAddress || "";
            document.getElementById('bill-payment-method').value = invoiceToEdit.paymentMethod || "Cash";
            
            currentInvoiceStatus = invoiceToEdit.status;
            document.querySelectorAll('.status-selector').forEach(b => {
                if (b.dataset.status === currentInvoiceStatus) {
                    b.classList.add('active', 'bg-brand-600', 'text-white');
                    b.classList.remove('bg-slate-800', 'text-slate-400');
                } else {
                    b.classList.remove('active', 'bg-brand-600', 'text-white');
                    b.classList.add('bg-slate-800', 'text-slate-400');
                }
            });
        } else {
            editingInvoiceId = null;
            cart = [];
            if (titleEl) titleEl.innerText = "Create New Invoice";
            if (subtitleEl) subtitleEl.innerText = "Generate a professional tax invoice.";
            if (nextIdEl) nextIdEl.innerText = generateInvoiceId();
            if (finalizeBtn) finalizeBtn.innerHTML = '<i class="fa-solid fa-rocket mr-3"></i> Finalize Invoice';
            
            document.getElementById('bill-cust-name').value = "";
            document.getElementById('bill-cust-phone').value = "";
            document.getElementById('bill-gst-num').value = "";
            document.getElementById('bill-address').value = "";
        }
        updateCartUI();
    }

    // Event Listeners (One-time)
    const custSelect = document.getElementById('bill-customer-select');
    if (custSelect) {
        const customers = window.tsDB.get('customers');
        custSelect.innerHTML = '<option value="">-- Choose Account --</option>' + 
            customers.map(c => `<option value="${c.id}">${c.name} (${c.type})</option>`).join('');
        custSelect.addEventListener('change', () => {
            const customer = customers.find(c => c.id === custSelect.value);
            if (customer) {
                document.getElementById('bill-cust-name').value = customer.name;
                document.getElementById('bill-cust-phone').value = customer.mobile || "";
                document.getElementById('bill-address').value = customer.address || "";
                document.getElementById('bill-gst-num').value = customer.gst || "";
            }
        });
    }

    const prodSelect = document.getElementById('billing-item-select');
    if (prodSelect) {
        const inventory = window.tsDB.get('inventory');
        prodSelect.innerHTML = '<option value="">Select Tyre Model...</option>' + 
            inventory.map(item => `<option value="${item.sku}">${item.name} (₹${item.price})</option>`).join('');
    }

    const addItemBtn = document.getElementById('add-item-to-bill');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            const sku = document.getElementById('billing-item-select').value;
            if (!sku) { alert("Select a product first."); return; }
            const item = window.tsDB.get('inventory').find(i => i.sku === sku);
            const qty = parseInt(document.getElementById('billing-item-qty').value) || 1;
            const tax = parseFloat(document.getElementById('billing-item-tax').value) || 0;
            const discount = parseFloat(document.getElementById('billing-item-discount').value) || 0;
            const existing = cart.find(i => i.sku === sku);
            if (existing) {
                existing.qty += qty;
            } else {
                cart.push({ sku: item.sku, name: item.name, price: item.price, qty: qty, tax: tax, discount: discount });
            }
            updateCartUI();
        });
    }

    function updateCartUI() {
        const tbody = document.querySelector('#billing-table tbody');
        if (!tbody) return;
        const emptyMsg = document.getElementById('empty-bill-msg');
        tbody.querySelectorAll('tr:not(#empty-bill-msg)').forEach(r => r.remove());
        if (cart.length === 0) {
            if (emptyMsg) emptyMsg.classList.remove('hidden');
        } else {
            if (emptyMsg) emptyMsg.classList.add('hidden');
            cart.forEach((item, index) => {
                const tr = document.createElement('tr');
                const lineSubtotal = item.price * item.qty;
                const lineDiscount = lineSubtotal * (item.discount / 100);
                const lineTotal = (lineSubtotal - lineDiscount) * (1 + (item.tax / 100));
                tr.innerHTML = `
                    <td class="px-8 py-5"><div class="font-bold">${item.name}</div><div class="text-[10px] text-slate-400">SKU: ${item.sku}</div></td>
                    <td class="px-8 py-5 text-center font-bold">${item.qty}</td>
                    <td class="px-8 py-5 text-right font-medium">₹${item.price.toLocaleString('en-IN')}</td>
                    <td class="px-8 py-5 text-right font-bold">${item.tax}%</td>
                    <td class="px-8 py-5 text-right font-black">₹${lineTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td class="px-8 py-5 text-center"><button class="remove-cart text-slate-300 hover:text-red-500" data-index="${index}"><i class="fa-solid fa-circle-xmark"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
            tbody.querySelectorAll('.remove-cart').forEach(btn => {
                btn.addEventListener('click', () => { cart.splice(parseInt(btn.dataset.index), 1); updateCartUI(); });
            });
        }

        let subtotal = 0, totalTax = 0, totalDiscount = 0;
        cart.forEach(item => {
            const lineSub = item.price * item.qty;
            const lineDisc = lineSub * (item.discount / 100);
            const lineTax = (lineSub - lineDisc) * (item.tax / 100);
            subtotal += lineSub; totalDiscount += lineDisc; totalTax += lineTax;
        });
        const grandTotal = subtotal - totalDiscount + totalTax;
        if (document.getElementById('bill-subtotal')) document.getElementById('bill-subtotal').innerText = `₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        if (document.getElementById('bill-tax')) document.getElementById('bill-tax').innerText = `₹${totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        if (document.getElementById('bill-total-discount')) document.getElementById('bill-total-discount').innerText = `- ₹${totalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        if (document.getElementById('bill-total')) document.getElementById('bill-total').innerText = `₹${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    }

    document.querySelectorAll('.status-selector').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.status-selector').forEach(b => {
                b.classList.remove('active', 'bg-brand-600', 'text-white');
                b.classList.add('bg-slate-800', 'text-slate-400');
            });
            btn.classList.add('active', 'bg-brand-600', 'text-white');
            btn.classList.remove('bg-slate-800', 'text-slate-400');
            currentInvoiceStatus = btn.dataset.status;
        });
    });

    const finalizeBtn = document.getElementById('generate-invoice-btn');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', () => {
            if (cart.length === 0) { alert("Please add items."); return; }
            const invoice = {
                id: document.getElementById('next-invoice-id').innerText,
                customerId: document.getElementById('bill-customer-select').value || "GUEST",
                customerName: document.getElementById('bill-cust-name').value || "Walk-in Customer",

                customerPhone: document.getElementById('bill-cust-phone').value,
                customerGst: document.getElementById('bill-gst-num').value,
                billingAddress: document.getElementById('bill-address').value,
                items: [...cart],
                total: parseFloat(document.getElementById('bill-total').innerText.replace(/[₹,]/g, '')),
                status: currentInvoiceStatus,
                date: editingInvoiceId ? (window.tsDB.get('invoices').find(i => i.id === editingInvoiceId).date) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                paymentMethod: document.getElementById('bill-payment-method').value
            };
            finalizeBtn.disabled = true;
            finalizeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-3"></i> Generating PDF...';
            setTimeout(() => {
                if (editingInvoiceId) window.tsDB.updateInvoice(editingInvoiceId, invoice);
                else window.tsDB.addInvoice(invoice);
                generateInvoicePDF(invoice);
                editingInvoiceId = null;
                cart = [];
                finalizeBtn.disabled = false;
                finalizeBtn.innerHTML = '<i class="fa-solid fa-rocket mr-3"></i> Finalize Invoice';
                window.location.hash = "#invoices";
            }, 800);
        });
    }

    const clearBtn = document.getElementById('clear-bill-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm("Discard draft?")) { editingInvoiceId = null; initBillingView(); window.location.hash = "#invoices"; }
        });
    }

    // --- Invoices ---
    function renderInvoices() {
        const invoices = window.tsDB.get('invoices');
        const tbody = document.querySelector('#invoices-table tbody');
        if (!tbody) return;
        
        if (invoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-8 py-20 text-center text-slate-300 italic font-bold">No invoices found in the ledger.</td></tr>`;
            return;
        }

        tbody.innerHTML = invoices.map(inv => `
            <tr class="hover:bg-slate-50/50">
                <td class="px-8 py-6 font-bold">${inv.id}</td>
                <td class="px-8 py-6"><div class="font-bold">${inv.customerName || inv.customer}</div></td>
                <td class="px-8 py-6 text-slate-500">${inv.date}</td>
                <td class="px-8 py-6 font-black text-right">₹${inv.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td class="px-8 py-6 text-center">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${inv.status}</span>
                </td>
                <td class="px-8 py-6 text-center space-x-4">
                    <button class="edit-invoice text-slate-400 hover:text-brand-500" data-id="${inv.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="delete-invoice text-slate-400 hover:text-red-500" data-id="${inv.id}"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.edit-invoice').forEach(btn => {
            btn.addEventListener('click', () => { editingInvoiceId = btn.dataset.id; window.location.hash = "#billing"; });
        });
        tbody.querySelectorAll('.delete-invoice').forEach(btn => {
            btn.addEventListener('click', () => { if (confirm(`Delete invoice ${btn.dataset.id}?`)) { window.tsDB.deleteInvoice(btn.dataset.id); renderInvoices(); updateOverviewCards(); } });
        });
    }

    function renderPayments() {
        const payments = window.tsDB.get('payments');
        const tbody = document.querySelector('#payments-table tbody');
        if (!tbody) return;

        if (payments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-8 py-10 text-center text-slate-400 italic font-medium">No transaction history recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = payments.map(p => `
            <tr class="hover:bg-slate-50/50">
                <td class="px-8 py-6 font-bold">${p.id}</td>
                <td class="px-8 py-6 font-bold">${p.customerName || p.customerId}</td>
                <td class="px-8 py-6 font-black text-green-600">₹${p.amount.toLocaleString('en-IN')}</td>
                <td class="px-8 py-6"><span>${p.method}</span></td>
                <td class="px-8 py-6 text-slate-500">${p.date}</td>
                <td class="px-8 py-6 text-xs text-slate-400">${p.note || ''}</td>
            </tr>
        `).join('');
    }

    function renderReports() {}

    function updateOverviewCards() {
        const invoices = window.tsDB.get('invoices') || [];
        const revenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const pending = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.total, 0);
        const paidCount = invoices.filter(i => i.status === 'Paid').length;
        
        if (document.getElementById('overview-revenue')) document.getElementById('overview-revenue').innerText = `₹${revenue.toLocaleString('en-IN')}`;
        if (document.getElementById('overview-pending')) document.getElementById('overview-pending').innerText = `₹${pending.toLocaleString('en-IN')}`;
        if (document.getElementById('overview-paid')) document.getElementById('overview-paid').innerText = paidCount.toString();
        
        if (document.getElementById('pending-count-badge')) {
            const pendingCount = invoices.filter(i => i.status === 'Pending').length;
            document.getElementById('pending-count-badge').innerText = `${pendingCount} INVOICES`;
        }
    }

    handleRouting();

    // ─── PDF Generation (Print-to-PDF, no external libs needed) ───────────────
    function generateInvoicePDF(invoice) {
        // Calculate totals
        let subtotal = 0, totalDiscount = 0, totalTax = 0;
        invoice.items.forEach(item => {
            const sub  = item.price * item.qty;
            const disc = sub * (item.discount / 100);
            subtotal      += sub;
            totalDiscount += disc;
            totalTax      += (sub - disc) * (item.tax / 100);
        });
        const grandTotal = subtotal - totalDiscount + totalTax;
        const fmt = v => '&#8377;' + v.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const isPaid = invoice.status === 'Paid';

        // Build item rows HTML
        const itemRows = invoice.items.map((item, i) => {
            const sub    = item.price * item.qty;
            const disc   = sub * (item.discount / 100);
            const total  = sub - disc + (sub - disc) * (item.tax / 100);
            return `<tr>
                <td class="center">${i + 1}</td>
                <td>${item.name}<br><span class="small">${item.sku}</span></td>
                <td class="center">${item.qty}</td>
                <td class="right">&#8377;${item.price.toLocaleString('en-IN')}</td>
                <td class="center">${item.discount}%</td>
                <td class="center">${item.tax}%</td>
                <td class="right bold">&#8377;${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${invoice.id} - Sri Dhanalakshmi Tyres</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background:#fff; }

  /* ── Header ── */
  .hdr { background:#0284c7; color:#fff; padding:18px 24px 14px; display:flex; justify-content:space-between; align-items:flex-start; }
  .co-name { font-size:21px; font-weight:900; letter-spacing:-0.5px; margin-bottom:4px; }
  .co-sub  { font-size:8.5px; color:#bae6fd; margin-bottom:2px; }
  .inv-meta { text-align:right; }
  .inv-label { font-size:15px; font-weight:900; margin-bottom:5px; }
  .inv-line  { font-size:8.5px; color:#bae6fd; margin-bottom:2px; }
  .accent { height:4px; background:#015d8e; }
  .status-pill {
    display:inline-block; margin-top:6px;
    padding:2px 12px; border-radius:20px;
    font-size:8px; font-weight:900; letter-spacing:.08em;
    color:#fff; background:${isPaid ? '#16a34a' : '#ea580c'};
  }

  /* ── Info boxes ── */
  .info-row { display:flex; gap:14px; padding:16px 24px; }
  .info-box { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; background:#f8fafc; }
  .box-lbl  { font-size:7.5px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; margin-bottom:6px; }
  .box-name { font-size:13px; font-weight:900; color:#0f172a; margin-bottom:4px; }
  .box-det  { font-size:9px; color:#475569; margin-bottom:2px; line-height:1.5; }

  /* ── Table ── */
  .tbl-wrap { padding:0 24px 14px; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:#0284c7; color:#fff; }
  thead th { padding:8px 7px; font-size:9px; font-weight:700; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody td { padding:7px 7px; border-bottom:1px solid #e2e8f0; vertical-align:top; font-size:10px; }
  .center { text-align:center; }
  .right  { text-align:right; }
  .bold   { font-weight:700; }
  .small  { font-size:8px; color:#94a3b8; }

  /* ── Totals ── */
  .totals-wrap { display:flex; justify-content:flex-end; padding:4px 24px 18px; }
  .totals-box  { width:250px; }
  .tot-row { display:flex; justify-content:space-between; padding:4px 8px; font-size:10px; color:#64748b; }
  .tot-div { border-top:1px solid #e2e8f0; margin:4px 0; }
  .grand   { display:flex; justify-content:space-between; background:#0284c7;
             color:#fff; border-radius:7px; padding:9px 10px; font-weight:900; font-size:12px; margin-top:6px; }

  /* ── Footer ── */
  .footer { border-top:2px solid #0284c7; margin:0 24px; padding:10px 0; text-align:center; font-size:8px; color:#94a3b8; line-height:1.8; }

  /* ── Print ── */
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    @page { size:A4 portrait; margin:8mm; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="hdr">
  <div>
    <div class="co-name">Sri Dhanalakshmi Tyres</div>
    <div class="co-sub">Premium Tyre Dealership &amp; Service Center</div>
    <div class="co-sub">GST: 33AAAAA0000A1Z5 &nbsp;|&nbsp; Ph: +91 98765 43210 &nbsp;|&nbsp; Chennai, Tamil Nadu</div>
  </div>
  <div class="inv-meta">
    <div class="inv-label">TAX INVOICE</div>
    <div class="inv-line">Invoice No: <strong>${invoice.id}</strong></div>
    <div class="inv-line">Date: ${invoice.date}</div>
    <div><span class="status-pill">${invoice.status.toUpperCase()}</span></div>
  </div>
</div>
<div class="accent"></div>

<!-- Bill To / Payment Info -->
<div class="info-row">
  <div class="info-box" style="flex:1.3">
    <div class="box-lbl">Bill To</div>
    <div class="box-name">${invoice.customerName || 'Walk-in Customer'}</div>
    ${invoice.customerPhone   ? `<div class="box-det">&#128222; ${invoice.customerPhone}</div>` : ''}
    ${invoice.customerGst     ? `<div class="box-det">GST No: ${invoice.customerGst}</div>` : ''}
    ${invoice.billingAddress  ? `<div class="box-det">&#128205; ${invoice.billingAddress}</div>` : ''}
  </div>
  <div class="info-box" style="flex:0.7">
    <div class="box-lbl">Payment Details</div>
    <div class="box-name" style="font-size:12px">${invoice.paymentMethod || 'Cash'}</div>
    ${invoice.customerId && invoice.customerId !== 'GUEST' ? `<div class="box-det">Account: ${invoice.customerId}</div>` : '<div class="box-det">Walk-in / Guest</div>'}
  </div>
</div>

<!-- Items Table -->
<div class="tbl-wrap">
  <table>
    <thead>
      <tr>
        <th style="width:28px" class="center">#</th>
        <th style="text-align:left">Product / Service</th>
        <th style="width:38px" class="center">Qty</th>
        <th style="width:72px;text-align:right">Rate (&#8377;)</th>
        <th style="width:44px" class="center">Disc%</th>
        <th style="width:40px" class="center">GST%</th>
        <th style="width:82px;text-align:right">Amount (&#8377;)</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
</div>

<!-- Totals -->
<div class="totals-wrap">
  <div class="totals-box">
    <div class="tot-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="tot-row"><span>Total Discount</span><span>&minus; ${fmt(totalDiscount)}</span></div>
    <div class="tot-row"><span>Total GST</span><span>${fmt(totalTax)}</span></div>
    <div class="tot-div"></div>
    <div class="grand"><span>GRAND TOTAL</span><span>${fmt(grandTotal)}</span></div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  Sri Dhanalakshmi Tyres &mdash; Thank you for your business!<br>
  This is a computer-generated invoice and does not require a physical signature.
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 400);
  };
</script>
</body>
</html>`;

        const pw = window.open('', '_blank', 'width=860,height=950,scrollbars=yes');
        if (!pw) {
            alert('Pop-up blocked! Please allow pop-ups for this page, then click Finalize Invoice again.');
            return;
        }
        pw.document.open();
        pw.document.write(html);
        pw.document.close();
    }

    // Security Settings logic
    const updatePwdBtn = document.getElementById('update-password-btn');
    if (updatePwdBtn) {
        updatePwdBtn.addEventListener('click', async () => {
            const curr = document.getElementById('current-password').value;
            const newP = document.getElementById('new-password').value;
            const conf = document.getElementById('confirm-password').value;
            const errEl = document.getElementById('password-error');
            const sucEl = document.getElementById('password-success');
            
            errEl.classList.add('hidden');
            sucEl.classList.add('hidden');
            
            if (!curr || !newP || !conf) {
                errEl.innerText = "Please fill in all security fields.";
                errEl.classList.remove('hidden');
                return;
            }
            if (newP !== conf) {
                errEl.innerText = "New passwords do not match!";
                errEl.classList.remove('hidden');
                return;
            }
            
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    let users = await res.json();
                    const admin = users.find(u => u.username === 'admin');
                    if (!admin || admin.password !== curr) {
                        errEl.innerText = "Incorrect current password.";
                        errEl.classList.remove('hidden');
                        return;
                    }
                    
                    // Update password securely
                    admin.password = newP;
                    
                    // The backend API strictly expects an array since the routes map to insertMany + deleteMany natively.
                    await fetch('/api/users', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(users)
                    });
                    
                    sucEl.classList.remove('hidden');
                    
                    setTimeout(() => {
                        sessionStorage.removeItem('auth');
                        window.location.replace('admin-login.html');
                    }, 2000);
                }
            } catch (e) {
                errEl.innerText = "Server error while updating password.";
                errEl.classList.remove('hidden');
            }
        });
    }
});




