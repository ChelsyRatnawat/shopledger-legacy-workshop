var test = require('node:test');
var assert = require('node:assert/strict');

var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

test('invoice figures match checkout HSN tax and coupon totals', function () {
  // Keep this fixture in memory: tests must never use data/db.json.
  var items = [{
    id: 1,
    name: 'Rice',
    sku: 'RICE-1',
    hsn: '1006',
    price: 100,
    qty: 2
  }];
  var checkout = pricing.computeTotals(items, 'WELCOME');
  var order = {
    id: 1001,
    items: items,
    coupon: 'WELCOME',
    subtotal: checkout.subtotal,
    discount: checkout.discount,
    tax: checkout.tax,
    total: checkout.total
  };
  var billed = invoice.computeInvoiceFigures(order);

  // Checkout resolves HSN 1006 to 5%, discounts the taxable base, then adds GST.
  assert.equal(checkout.subtotal, 200);
  assert.equal(checkout.discount, 10);
  assert.equal(checkout.tax, 9.5);
  assert.equal(checkout.cgst, 4.75);
  assert.equal(checkout.sgst, 4.75);
  assert.equal(checkout.total, 199.5);

  assert.equal(billed.rows[0].gstPercent, 5);
  assert.equal(billed.rows[0].line, 200);
  assert.equal(billed.rows[0].lineTax, 9.5);
  assert.equal(billed.subtotal, 200);
  assert.equal(billed.discount, 10);
  assert.equal(billed.tax, 9.5);
  assert.equal(billed.cgst, 4.75);
  assert.equal(billed.sgst, 4.75);
  assert.equal(billed.total, order.total);
});

test('rendered invoice shows the recorded total without a ledger mismatch notice', function () {
  var order = {
    id: 1002,
    date: '2026-11-21',
    customer: 'In-memory customer',
    items: [
      { name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 640, qty: 1 },
      { name: 'Sunflower Oil', sku: 'OIL-1', hsn: '1512', price: 190, qty: 2 }
    ],
    coupon: 'SAVE10',
    total: 963.9
  };

  var html = invoice.render(order);

  assert.match(html, /<td class="r">5%<\/td><td class="r">₹28\.80/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹963\.90/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
