const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true }
}, { strict: false });

const customerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String },
  mobile: { type: String },
  email: { type: String },
  gst: { type: String },
  address: { type: String },
  creditLimit: { type: Number },
  balance: { type: Number }
}, { strict: false });

const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  customerId: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  customerGst: { type: String },
  billingAddress: { type: String },
  items: { type: Array },
  total: { type: Number },
  status: { type: String },
  date: { type: String },
  paymentMethod: { type: String }
}, { strict: false });

const paymentSchema = new mongoose.Schema({
  id: { type: String },
  customerId: { type: String },
  invoiceId: { type: String },
  amount: { type: Number },
  method: { type: String },
  date: { type: String },
  note: { type: String }
}, { strict: false });

const Inventory = mongoose.model('Inventory', inventorySchema);
const Customer = mongoose.model('Customer', customerSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = {
  inventory: Inventory,
  customers: Customer,
  invoices: Invoice,
  payments: Payment
};
