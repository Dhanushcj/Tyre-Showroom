require('dotenv').config();
const mongoose = require('mongoose');
const models = require('../backend/models');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to MongoDB Atlas. Scanning for duplicates...');

    // Get all payments sorted by insertion order
    const all = await models.payments.find({}).sort({ _id: 1 });
    console.log('Total payments before cleanup:', all.length);

    // Keep only the first occurrence of each payment id
    const seen = new Set();
    const toDelete = [];
    all.forEach(p => {
        if (seen.has(p.id)) {
            toDelete.push(p._id);
            console.log('  Marking duplicate for deletion:', p.id, '-', p.customerName);
        } else {
            seen.add(p.id);
        }
    });

    if (toDelete.length === 0) {
        console.log('No duplicates found.');
    } else {
        await models.payments.deleteMany({ _id: { $in: toDelete } });
        console.log('Deleted', toDelete.length, 'duplicate payment record(s).');
    }

    const final = await models.payments.countDocuments();
    console.log('Final payment count:', final);

    // Also check invoices
    const invoices = await models.invoices.find({}).sort({ _id: 1 });
    console.log('\nInvoices in DB:', invoices.length);
    invoices.forEach(inv => console.log(' -', inv.id, inv.customerName, inv.status, '| items:', (inv.items || []).length));

    // Check inventory
    const items = await models.inventory.find({});
    console.log('\nInventory items:', items.length);
    items.forEach(i => console.log(' -', i.sku, i.name, '| stock:', i.stock));

    // Check customers
    const customers = await models.customers.find({});
    console.log('\nCustomers:', customers.length);
    customers.forEach(c => console.log(' -', c.id, c.name, '| balance:', c.balance));

    process.exit(0);
}).catch(e => {
    console.error('FAILED:', e.message);
    process.exit(1);
});
