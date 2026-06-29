/**
 * Test script — Verify data integrity & business logic on the database
 * Run: node scripts/test-db.cjs
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    failures.push(testName);
    console.log(`  ❌ ${testName}`);
  }
}

function assertEq(actual, expected, testName) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (expected: ${expected}, got: ${actual})`);
    console.log(`  ❌ ${testName} — expected: ${expected}, got: ${actual}`);
  }
}

function assertApprox(actual, expected, testName, tolerance = 1) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    failures.push(`${testName} (expected: ~${expected}, got: ${actual})`);
    console.log(`  ❌ ${testName} — expected: ~${expected}, got: ${actual}`);
  }
}

async function main() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'shop-management.db');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database not found at', dbPath);
    process.exit(1);
  }

  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  // Helper: query all rows
  function q(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  function q1(sql, params = []) {
    return q(sql, params)[0] || null;
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  1. CUSTOMERS');
  console.log('══════════════════════════════════════════');

  const allCustomers = q('SELECT * FROM customers WHERE is_active = 1');
  assert(allCustomers.length >= 10, `At least 10 active customers exist (found ${allCustomers.length})`);

  // Unique codes
  const custCodes = allCustomers.map(c => c.code);
  assertEq(new Set(custCodes).size, custCodes.length, 'All customer codes are unique');

  // Required fields
  for (const c of allCustomers) {
    assert(c.name && c.name.length > 0, `Customer ${c.code} has a name`);
    assert(c.id && c.id.length > 10, `Customer ${c.code} has a UUID id`);
  }

  // Phone format
  const custWithPhone = allCustomers.filter(c => c.phone && c.phone.length > 0);
  assert(custWithPhone.length >= 10, `At least 10 customers have phone numbers`);
  for (const c of custWithPhone) {
    assert(/^0\d{9}$/.test(c.phone), `Customer ${c.code} phone format valid: ${c.phone}`);
  }

  // Search test
  const searchResult = q("SELECT * FROM customers WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?)", ['%Hùng%', '%Hùng%']);
  assert(searchResult.length >= 1, 'Customer search by name "Hùng" returns results');

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  2. PRODUCTS');
  console.log('══════════════════════════════════════════');

  const allProducts = q('SELECT * FROM products WHERE is_active = 1');
  assert(allProducts.length >= 20, `At least 20 active products exist (found ${allProducts.length})`);

  // Unique codes
  const prodCodes = allProducts.map(p => p.code);
  assertEq(new Set(prodCodes).size, prodCodes.length, 'All product codes are unique');

  // Price validation
  for (const p of allProducts) {
    assert(p.retail_price >= 0, `Product ${p.code} retail_price >= 0`);
    assert(p.wholesale_price >= 0, `Product ${p.code} wholesale_price >= 0`);
    assert(p.cost_price >= 0, `Product ${p.code} cost_price >= 0`);
    assert(p.retail_price >= p.wholesale_price, `Product ${p.code} retail >= wholesale (${p.retail_price} >= ${p.wholesale_price})`);
    assert(p.wholesale_price >= p.cost_price, `Product ${p.code} wholesale >= cost (${p.wholesale_price} >= ${p.cost_price})`);
  }

  // Category diversity
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  assert(categories.length >= 3, `At least 3 product categories (found: ${categories.join(', ')})`);

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  3. INVOICES');
  console.log('══════════════════════════════════════════');

  const allInvoices = q('SELECT * FROM invoices ORDER BY created_at DESC');
  assert(allInvoices.length >= 10, `At least 10 invoices exist (found ${allInvoices.length})`);

  // Unique invoice numbers
  const invNums = allInvoices.map(i => i.invoice_number);
  assertEq(new Set(invNums).size, invNums.length, 'All invoice numbers are unique');

  // Invoice math: total = subtotal - discount
  for (const inv of allInvoices) {
    assertApprox(inv.total_amount, inv.subtotal - inv.discount_amount,
      `Invoice ${inv.invoice_number} total = subtotal - discount`);
  }

  // debt = total - paid
  for (const inv of allInvoices) {
    assertApprox(inv.debt_amount, inv.total_amount - inv.paid_amount,
      `Invoice ${inv.invoice_number} debt = total - paid`);
  }

  // paid <= total
  for (const inv of allInvoices) {
    assert(inv.paid_amount <= inv.total_amount + 1,
      `Invoice ${inv.invoice_number} paid (${inv.paid_amount}) <= total (${inv.total_amount})`);
  }

  // debt >= 0
  for (const inv of allInvoices) {
    assert(inv.debt_amount >= 0,
      `Invoice ${inv.invoice_number} debt >= 0 (debt: ${inv.debt_amount})`);
  }

  // sale_type valid
  for (const inv of allInvoices) {
    assert(['retail', 'wholesale'].includes(inv.sale_type),
      `Invoice ${inv.invoice_number} sale_type is valid: ${inv.sale_type}`);
  }

  // status valid
  for (const inv of allInvoices) {
    assert(['completed', 'cancelled', 'draft'].includes(inv.status),
      `Invoice ${inv.invoice_number} status is valid: ${inv.status}`);
  }

  // Customer reference
  for (const inv of allInvoices) {
    if (inv.customer_id) {
      const cust = q1('SELECT * FROM customers WHERE id = ?', [inv.customer_id]);
      assert(cust !== null, `Invoice ${inv.invoice_number} customer exists in DB`);
      assertEq(inv.customer_name_snapshot, cust.name,
        `Invoice ${inv.invoice_number} customer_name_snapshot matches customer name`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  4. INVOICE ITEMS');
  console.log('══════════════════════════════════════════');

  // Every invoice has at least 1 item
  for (const inv of allInvoices) {
    const items = q('SELECT * FROM invoice_items WHERE invoice_id = ?', [inv.id]);
    assert(items.length >= 1, `Invoice ${inv.invoice_number} has at least 1 item (found ${items.length})`);

    // line_total = qty * unit_price * (1 - discount_percent/100)
    for (const item of items) {
      const expectedTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
      assertApprox(item.line_total, expectedTotal,
        `Item "${item.product_name_snapshot}" line_total = qty*price*(1-disc%)`, 2);
    }

    // subtotal = sum of line_totals
    const sumLineTotals = items.reduce((s, it) => s + it.line_total, 0);
    assertApprox(inv.subtotal, sumLineTotals,
      `Invoice ${inv.invoice_number} subtotal (${inv.subtotal}) = sum of items (${sumLineTotals})`, 2);
  }

  // Product reference
  const allItems = q('SELECT * FROM invoice_items');
  for (const item of allItems) {
    if (item.product_id) {
      const prod = q1('SELECT * FROM products WHERE id = ?', [item.product_id]);
      assert(prod !== null, `Item product_id references existing product: ${item.product_name_snapshot}`);
    }
    assert(item.product_name_snapshot.length > 0, `Item has product_name_snapshot`);
    assert(item.quantity > 0, `Item "${item.product_name_snapshot}" qty > 0`);
    assert(item.unit_price >= 0, `Item "${item.product_name_snapshot}" unit_price >= 0`);
  }

  // unit_name_snapshot populated
  const itemsWithUnit = allItems.filter(i => i.unit_name_snapshot && i.unit_name_snapshot.length > 0);
  assert(itemsWithUnit.length > 0, `Some items have unit_name_snapshot (found ${itemsWithUnit.length})`);

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  5. PAYMENTS');
  console.log('══════════════════════════════════════════');

  const allPayments = q('SELECT * FROM payments');
  assert(allPayments.length >= 1, `At least 1 payment exists (found ${allPayments.length})`);

  for (const p of allPayments) {
    assert(p.amount > 0, `Payment amount > 0: ${p.amount}`);
    assert(['cash', 'transfer', 'card'].includes(p.payment_method),
      `Payment method valid: ${p.payment_method}`);
    // invoice reference
    const inv = q1('SELECT * FROM invoices WHERE id = ?', [p.invoice_id]);
    assert(inv !== null, `Payment references existing invoice`);
  }

  // Total payments per invoice <= invoice total
  const completedInvoices = q("SELECT * FROM invoices WHERE status = 'completed'");
  for (const inv of completedInvoices) {
    const payments = q('SELECT * FROM payments WHERE invoice_id = ?', [inv.id]);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    assertApprox(totalPaid, inv.paid_amount,
      `Invoice ${inv.invoice_number} payments sum (${totalPaid}) ≈ paid_amount (${inv.paid_amount})`, 2);
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  6. DASHBOARD LOGIC — Revenue & Stats');
  console.log('══════════════════════════════════════════');

  // Revenue = SUM(paid_amount) for completed invoices
  const revenueRow = q1("SELECT COALESCE(SUM(paid_amount), 0) as revenue FROM invoices WHERE status = 'completed'");
  assert(revenueRow.revenue > 0, `Total revenue > 0: ${revenueRow.revenue}`);

  // Total debt = SUM(debt_amount) for completed invoices
  const debtRow = q1("SELECT COALESCE(SUM(debt_amount), 0) as debt FROM invoices WHERE status = 'completed'");
  assert(debtRow.debt >= 0, `Total debt >= 0: ${debtRow.debt}`);

  // revenue + debt = total_amount
  const totalRow = q1("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'completed'");
  assertApprox(revenueRow.revenue + debtRow.debt, totalRow.total,
    `Revenue (${revenueRow.revenue}) + Debt (${debtRow.debt}) = Total (${totalRow.total})`, 2);

  // Invoice count
  const invCount = q1("SELECT COUNT(*) as cnt FROM invoices WHERE status = 'completed'");
  assert(invCount.cnt >= 10, `At least 10 completed invoices: ${invCount.cnt}`);

  // Customer count
  const custCount = q1("SELECT COUNT(*) as cnt FROM customers WHERE is_active = 1");
  assert(custCount.cnt >= 10, `At least 10 active customers: ${custCount.cnt}`);

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  7. CUSTOMER DEBT LOGIC');
  console.log('══════════════════════════════════════════');

  // The query used in customers:list
  const customersWithDebt = q(`
    SELECT c.*,
      COALESCE((
        SELECT SUM(debt_amount) FROM invoices
        WHERE customer_id = c.id AND status = 'completed'
      ), 0) as total_debt
    FROM customers c WHERE c.is_active = 1
    ORDER BY c.name ASC
  `);

  assert(customersWithDebt.length >= 10, `Customers with debt query returns results`);

  // Verify some have debt > 0
  const withDebt = customersWithDebt.filter(c => c.total_debt > 0);
  assert(withDebt.length >= 3, `At least 3 customers have debt > 0 (found ${withDebt.length})`);

  // Verify debt is calculated correctly for each customer
  for (const c of withDebt) {
    const manualDebt = q1(
      "SELECT COALESCE(SUM(debt_amount), 0) as d FROM invoices WHERE customer_id = ? AND status = 'completed'",
      [c.id]
    );
    assertApprox(c.total_debt, manualDebt.d,
      `Customer ${c.name} total_debt (${c.total_debt}) matches manual calc (${manualDebt.d})`, 1);
  }

  // Zero debt for customers with all paid invoices
  const noneDebt = customersWithDebt.filter(c => c.total_debt === 0);
  for (const c of noneDebt.slice(0, 3)) {
    const unpaid = q1(
      "SELECT COALESCE(SUM(debt_amount), 0) as d FROM invoices WHERE customer_id = ? AND status = 'completed'",
      [c.id]
    );
    assertEq(unpaid.d, 0, `Customer ${c.name} with 0 total_debt truly has 0 debt`);
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  8. DATA INTEGRITY — Foreign Keys');
  console.log('══════════════════════════════════════════');

  // Orphan invoice items (invoice_id not in invoices)
  const orphanItems = q(`
    SELECT ii.* FROM invoice_items ii
    LEFT JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.id IS NULL
  `);
  assertEq(orphanItems.length, 0, 'No orphan invoice_items (all reference valid invoices)');

  // Orphan payments
  const orphanPayments = q(`
    SELECT p.* FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE i.id IS NULL
  `);
  assertEq(orphanPayments.length, 0, 'No orphan payments (all reference valid invoices)');

  // Invoice customer_id references
  const orphanInvCust = q(`
    SELECT inv.* FROM invoices inv
    WHERE inv.customer_id IS NOT NULL AND inv.customer_id != ''
    AND inv.customer_id NOT IN (SELECT id FROM customers)
  `);
  assertEq(orphanInvCust.length, 0, 'No invoices reference non-existent customers');

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  9. EDGE CASES');
  console.log('══════════════════════════════════════════');

  // No negative prices
  const negPrices = q('SELECT * FROM products WHERE retail_price < 0 OR wholesale_price < 0 OR cost_price < 0');
  assertEq(negPrices.length, 0, 'No products with negative prices');

  // No duplicate product names
  const dupProdNames = q('SELECT name, COUNT(*) as cnt FROM products WHERE is_active = 1 GROUP BY name HAVING cnt > 1');
  assertEq(dupProdNames.length, 0, 'No duplicate product names');

  // No duplicate customer codes
  const dupCustCodes = q('SELECT code, COUNT(*) as cnt FROM customers GROUP BY code HAVING cnt > 1');
  assertEq(dupCustCodes.length, 0, 'No duplicate customer codes');

  // No duplicate invoice numbers
  const dupInvNums = q('SELECT invoice_number, COUNT(*) as cnt FROM invoices GROUP BY invoice_number HAVING cnt > 1');
  assertEq(dupInvNums.length, 0, 'No duplicate invoice numbers');

  // Timestamps exist
  for (const inv of allInvoices.slice(0, 5)) {
    assert(inv.created_at && inv.created_at.length > 0, `Invoice ${inv.invoice_number} has created_at`);
    assert(inv.updated_at && inv.updated_at.length > 0, `Invoice ${inv.invoice_number} has updated_at`);
  }

  // Settings exist
  const settings = q('SELECT * FROM store_settings');
  assert(settings.length >= 4, `At least 4 store settings (found ${settings.length})`);
  const storeName = q1("SELECT value FROM store_settings WHERE key = 'store_name'");
  assert(storeName && storeName.value.length > 0, `Store name is set: "${storeName?.value}"`);

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('  10. PRICE CONSISTENCY');
  console.log('══════════════════════════════════════════');

  // Retail invoices use retail price, wholesale use wholesale price
  const retailInvoices = q("SELECT * FROM invoices WHERE sale_type = 'retail' AND status = 'completed'");
  for (const inv of retailInvoices.slice(0, 3)) {
    const items = q('SELECT ii.*, p.retail_price FROM invoice_items ii JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ?', [inv.id]);
    for (const item of items) {
      assertEq(item.unit_price, item.retail_price,
        `Retail invoice ${inv.invoice_number} item "${item.product_name_snapshot}" uses retail price`);
    }
  }

  const wholesaleInvoices = q("SELECT * FROM invoices WHERE sale_type = 'wholesale' AND status = 'completed'");
  for (const inv of wholesaleInvoices.slice(0, 3)) {
    const items = q('SELECT ii.*, p.wholesale_price FROM invoice_items ii JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ?', [inv.id]);
    for (const item of items) {
      assertEq(item.unit_price, item.wholesale_price,
        `Wholesale invoice ${inv.invoice_number} item "${item.product_name_snapshot}" uses wholesale price`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  db.close();

  console.log('\n══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ FAILURES:');
    for (const f of failures) {
      console.log(`   • ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED!');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
