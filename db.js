// db.js - Backend API Client for Tyre Showroom Accounting Suite
// Handles CRUD for invoices, inventory stock, customer balances & payments via Express API.

const db = {
    cache: {
        inventory: [],
        customers: [],
        invoices: [],
        payments: []
    },

    init: async function() {
        try {
            const collections = ['inventory', 'customers', 'invoices', 'payments'];
            const promises = collections.map(c => fetch('/api/' + c).then(res => res.json()));
            const results = await Promise.all(promises);
            collections.forEach((c, i) => {
                this.cache[c] = results[i];
            });
            console.log("Database initialized from backend");
        } catch (err) {
            console.error("Failed to load data from backend, falling back to empty state", err);
        }
    },

    get: function(key) {
        return this.cache[key] || [];
    },

    save: function(key, data) {
        this.cache[key] = data;
        // Fire and forget update to the backend
        fetch('/api/' + key, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(err => console.error(`Error saving ${key} to backend`, err));
    },

    // ─── Single-record helpers ─────────────────────────────────────────────────

    /** Return one invoice by id, or null if not found. */
    getInvoice: function(id) {
        return this.get('invoices').find(inv => inv.id === id) || null;
    },

    /** Return one customer by id, or null if not found. */
    getCustomer: function(id) {
        return this.get('customers').find(c => c.id === id) || null;
    },

    // ─── Stock helpers ─────────────────────────────────────────────────────────

    deductStock: function(items) {
        const inventory = this.get('inventory');
        items.forEach(cartItem => {
            const product = inventory.find(p => p.sku === cartItem.sku);
            if (product) {
                product.stock = Math.max(0, product.stock - cartItem.qty);
            }
        });
        this.save('inventory', inventory);
    },

    restoreStock: function(items) {
        const inventory = this.get('inventory');
        items.forEach(cartItem => {
            const product = inventory.find(p => p.sku === cartItem.sku);
            if (product) {
                product.stock += cartItem.qty;
            }
        });
        this.save('inventory', inventory);
    },

    // ─── Invoice CRUD ──────────────────────────────────────────────────────────

    addInvoice: function(invoice) {
        const invoices = this.get('invoices');
        invoices.unshift(invoice);
        this.save('invoices', invoices);

        if (invoice.status === 'Paid') {
            this.deductStock(invoice.items || []);
        }

        if (invoice.status !== 'Paid') {
            this.updateCustomerBalance(invoice.customerId, invoice.total);
        }
    },

    deleteInvoice: function(id) {
        const invoices = this.get('invoices');
        const index = invoices.findIndex(inv => inv.id === id);
        if (index === -1) return false;

        const inv = invoices[index];

        if (inv.status === 'Paid') {
            this.restoreStock(inv.items || []);
        }

        if (inv.status !== 'Paid') {
            this.updateCustomerBalance(inv.customerId, -inv.total);
        }

        invoices.splice(index, 1);
        this.save('invoices', invoices);
        return true;
    },

    updateInvoice: function(id, updatedInv) {
        const invoices = this.get('invoices');
        const index = invoices.findIndex(inv => inv.id === id);
        if (index === -1) return false;

        const oldInv = invoices[index];

        if (oldInv.status === 'Paid') {
            this.restoreStock(oldInv.items || []);
        }

        if (oldInv.status !== 'Paid') {
            this.updateCustomerBalance(oldInv.customerId, -oldInv.total);
        }

        if (updatedInv.status === 'Paid') {
            this.deductStock(updatedInv.items || []);
        }

        const merged = Object.assign({}, updatedInv, {
            id: oldInv.id,
            date: oldInv.date
        });
        invoices[index] = merged;

        if (merged.status !== 'Paid') {
            this.updateCustomerBalance(merged.customerId, merged.total);
        }

        this.save('invoices', invoices);
        return true;
    },

    // ─── Customer helpers ──────────────────────────────────────────────────────

    updateCustomerBalance: function(customerId, amount) {
        const customers = this.get('customers');
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            customer.balance = Math.max(0, (customer.balance || 0) + amount);
            this.save('customers', customers);
        }
    },

    // ─── Payments ──────────────────────────────────────────────────────────────

    recordPayment: function(payment) {
        const payments = this.get('payments');
        payments.unshift(payment);
        this.save('payments', payments);

        const customers = this.get('customers');
        const customer = customers.find(c => c.id === payment.customerId);
        if (customer) {
            customer.balance = Math.max(0, (customer.balance || 0) - payment.amount);
            this.save('customers', customers);
        }

        const invoices = this.get('invoices');
        const invoice = invoices.find(i => i.id === payment.invoiceId);
        if (invoice) {
            const allInvoicePayments = payments.filter(p => p.invoiceId === invoice.id);
            const paidAmount = allInvoicePayments.reduce((sum, p) => sum + p.amount, 0);
            if (paidAmount >= invoice.total) {
                invoice.status = 'Paid';
                this.save('invoices', invoices);
            }
        }
    }
};

window.tsDB = db; // Global access for admin.js
// db.init() is removed from here - it must be awaited in admin.js
