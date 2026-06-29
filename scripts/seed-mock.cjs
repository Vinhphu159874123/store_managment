/**
 * Seed script — Insert 10 customers + 20 products into the app database
 * Run: node scripts/seed-mock.cjs
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// We'll operate directly on the db file using sql.js
async function main() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const dbPath = path.join(__dirname, '..', 'data', 'shop-management.db');
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found at', dbPath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // ── 10 Customers ────────────────────────────────────────────────────────
  const customers = [
    { name: 'Nguyễn Văn Hùng',  phone: '0901234567', address: 'Ấp 1, Long Hồ, Vĩnh Long',       company: '', notes: 'Khách quen mua xi măng' },
    { name: 'Trần Thị Mai',     phone: '0912345678', address: '45 Nguyễn Huệ, TP Vĩnh Long',      company: 'TNHH Mai Phát',     notes: 'Mua sỉ gạch' },
    { name: 'Lê Hoàng Phúc',    phone: '0923456789', address: 'Xã Bình Hòa Phước, Long Hồ',       company: '', notes: '' },
    { name: 'Phạm Minh Tâm',    phone: '0934567890', address: '12 Trần Phú, Tam Bình',             company: 'Đại lý Minh Tâm',   notes: 'Nhập thức ăn chăn nuôi' },
    { name: 'Võ Thanh Sơn',     phone: '0945678901', address: 'Ấp Bình Lương, Mang Thít',          company: '', notes: 'Xây nhà mới' },
    { name: 'Huỳnh Ngọc Lan',   phone: '0956789012', address: '78 Đường 30/4, TP Vĩnh Long',      company: 'Cty Ngọc Lan',      notes: 'Mua gas, gạo hàng tháng' },
    { name: 'Đặng Văn Thành',   phone: '0967890123', address: 'Xã An Bình, Long Hồ',               company: '', notes: 'Khách lẻ' },
    { name: 'Bùi Thị Hồng',    phone: '0978901234', address: 'TT Cái Nhum, Mang Thít',             company: 'Tạp hóa Hồng',     notes: 'Đại lý phân bón' },
    { name: 'Ngô Quốc Đạt',    phone: '0989012345', address: '56 Lê Lợi, Vũng Liêm',              company: '', notes: '' },
    { name: 'Lý Minh Tuấn',    phone: '0990123456', address: 'Ấp 3, Trà Ôn, Vĩnh Long',           company: 'VLXD Minh Tuấn',    notes: 'Mua sỉ cát đá' },
  ];

  // Find the last customer code
  const lastCust = db.exec("SELECT code FROM customers WHERE code LIKE 'KH%' ORDER BY code DESC LIMIT 1");
  let custNum = 1;
  if (lastCust.length > 0 && lastCust[0].values.length > 0) {
    const num = parseInt(String(lastCust[0].values[0][0]).replace('KH', ''), 10);
    if (!isNaN(num)) custNum = num + 1;
  }

  const customerIds = [];
  for (const c of customers) {
    const id = uuidv4();
    customerIds.push(id);
    const code = `KH${String(custNum++).padStart(3, '0')}`;
    db.run(
      `INSERT INTO customers (id, code, name, phone, address, tax_code, company_name, email, notes)
       VALUES (?, ?, ?, ?, ?, '', ?, '', ?)`,
      [id, code, c.name, c.phone, c.address, c.company, c.notes]
    );
    console.log(`  ✓ Customer: ${code} — ${c.name}`);
  }

  // ── 20 Products ────────────────────────────────────────────────────────
  const products = [
    { name: 'Xi măng Hà Tiên PCB40',        cat: 'Vật liệu xây dựng',  retail: 95000,  wholesale: 90000,  cost: 85000 },
    { name: 'Xi măng Holcim',                cat: 'Vật liệu xây dựng',  retail: 100000, wholesale: 95000,  cost: 88000 },
    { name: 'Cát xây dựng (khối)',           cat: 'Vật liệu xây dựng',  retail: 350000, wholesale: 320000, cost: 280000 },
    { name: 'Đá 1x2 (khối)',                cat: 'Vật liệu xây dựng',  retail: 380000, wholesale: 350000, cost: 300000 },
    { name: 'Gạch ống 4 lỗ',                cat: 'Vật liệu xây dựng',  retail: 1200,   wholesale: 1000,   cost: 850 },
    { name: 'Gạch men 40x40 Viglacera',     cat: 'Trang trí nội thất', retail: 85000,  wholesale: 75000,  cost: 62000 },
    { name: 'Sơn Dulux nội thất (5L)',       cat: 'Trang trí nội thất', retail: 450000, wholesale: 410000, cost: 360000 },
    { name: 'Thép Pomina phi 10',            cat: 'Vật liệu xây dựng',  retail: 145000, wholesale: 135000, cost: 120000 },
    { name: 'Phân bón NPK 16-16-8 (50kg)',  cat: 'Phân bón',           retail: 680000, wholesale: 650000, cost: 580000 },
    { name: 'Phân bón DAP (50kg)',           cat: 'Phân bón',           retail: 750000, wholesale: 720000, cost: 650000 },
    { name: 'Phân Ure Phú Mỹ (50kg)',       cat: 'Phân bón',           retail: 520000, wholesale: 490000, cost: 430000 },
    { name: 'Thức ăn gà CP (25kg)',          cat: 'Thức ăn chăn nuôi', retail: 320000, wholesale: 300000, cost: 270000 },
    { name: 'Thức ăn heo con Cargill (25kg)',cat: 'Thức ăn chăn nuôi', retail: 380000, wholesale: 360000, cost: 320000 },
    { name: 'Gạo Jasmine (50kg)',            cat: 'Gạo',               retail: 650000, wholesale: 620000, cost: 560000 },
    { name: 'Gạo ST25 (10kg)',              cat: 'Gạo',               retail: 210000, wholesale: 195000, cost: 175000 },
    { name: 'Gas Petrolimex 12kg',           cat: 'Gas',               retail: 430000, wholesale: 415000, cost: 395000 },
    { name: 'Gas SaiGon Petro 12kg',         cat: 'Gas',               retail: 420000, wholesale: 400000, cost: 380000 },
    { name: 'Ống nhựa Bình Minh 21mm (4m)',  cat: 'Vật liệu xây dựng',  retail: 28000,  wholesale: 24000,  cost: 19000 },
    { name: 'Dây điện Cadivi 2.5mm (100m)',  cat: 'Trang trí nội thất', retail: 850000, wholesale: 800000, cost: 720000 },
    { name: 'Tấm tôn Hoa Sen 0.35mm (m)',   cat: 'Vật liệu xây dựng',  retail: 95000,  wholesale: 88000,  cost: 75000 },
  ];

  // Find the last product code
  const lastProd = db.exec("SELECT code FROM products WHERE code LIKE 'SP%' ORDER BY code DESC LIMIT 1");
  let prodNum = 1;
  if (lastProd.length > 0 && lastProd[0].values.length > 0) {
    const num = parseInt(String(lastProd[0].values[0][0]).replace('SP', ''), 10);
    if (!isNaN(num)) prodNum = num + 1;
  }

  const productData = [];
  for (const p of products) {
    const id = uuidv4();
    const code = `SP${String(prodNum++).padStart(3, '0')}`;
    db.run(
      `INSERT INTO products (id, code, name, category, description, retail_price, wholesale_price, cost_price)
       VALUES (?, ?, ?, ?, '', ?, ?, ?)`,
      [id, code, p.name, p.cat, p.retail, p.wholesale, p.cost]
    );
    productData.push({ id, code, name: p.name, retail: p.retail, wholesale: p.wholesale });
    console.log(`  ✓ Product: ${code} — ${p.name}  (lẻ: ${p.retail}, sỉ: ${p.wholesale})`);
  }

  // ── Create some invoices with items ────────────────────────────────────
  const today = new Date();
  const dateStr = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  };

  // Count existing invoices today
  const todayStrShort = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;

  const invoiceDefs = [
    // [customerIdx, saleType, daysAgo, items: [[prodIdx, qty, unit]], paidPercent]
    [0, 'retail',    0, [[0, 3, 'bao'], [3, 2, 'khối']],   1.0 ],   // Hùng — paid full
    [1, 'wholesale', 0, [[4, 500, 'cái'], [5, 20, 'tờ']],   0.5 ],   // Mai — 50% paid
    [2, 'retail',    1, [[8, 2, 'bao'], [10, 3, 'bao']],     0.0 ],   // Phúc — no pay
    [3, 'wholesale', 1, [[11, 10, 'bao'], [12, 5, 'bao']],   1.0 ],   // Tâm — paid full
    [4, 'retail',    2, [[0, 10, 'bao'], [2, 3, 'khối'], [3, 2, 'khối']], 0.3 ], // Sơn — 30%
    [5, 'retail',    2, [[15, 2, 'bình'], [13, 1, 'bao']],   1.0 ],   // Lan — paid full
    [6, 'retail',    3, [[14, 2, 'bao'], [16, 1, 'bình']],   0.0 ],   // Thành — no pay
    [7, 'wholesale', 3, [[8, 20, 'bao'], [9, 10, 'bao'], [10, 15, 'bao']], 0.8 ], // Hồng — 80%
    [8, 'retail',    5, [[6, 2, 'bình'], [17, 10, 'cây']],    1.0 ],   // Đạt — paid full
    [9, 'wholesale', 6, [[2, 10, 'khối'], [3, 8, 'khối'], [7, 20, 'cây']], 0.0 ], // Tuấn — no pay
  ];

  let invSeq = 1;
  // Check existing invoices for today
  const existingInv = db.exec(`SELECT COUNT(*) FROM invoices`);
  if (existingInv.length > 0) invSeq = Number(existingInv[0].values[0][0]) + 1;

  for (const [custIdx, saleType, daysAgo, items, paidPct] of invoiceDefs) {
    const invId = uuidv4();
    const cust = customers[custIdx];
    const custId = customerIds[custIdx];
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const invDateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const invNumber = `HD-${invDateStr}-${String(invSeq++).padStart(4, '0')}`;
    const createdAt = dateStr(daysAgo);

    // Calculate items
    let subtotal = 0;
    const invoiceItems = [];
    for (const [prodIdx, qty, unit] of items) {
      const prod = productData[prodIdx];
      const price = saleType === 'retail' ? prod.retail : prod.wholesale;
      const lineTotal = price * qty;
      subtotal += lineTotal;
      invoiceItems.push({
        id: uuidv4(),
        invoiceId: invId,
        productId: prod.id,
        name: prod.name,
        unit: unit,
        qty, price, lineTotal
      });
    }

    const totalAmount = subtotal;
    const paidAmount = Math.round(totalAmount * paidPct);
    const debtAmount = totalAmount - paidAmount;

    db.run(
      `INSERT INTO invoices (id, invoice_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
       customer_address_snapshot, customer_tax_code_snapshot, sale_type, subtotal, discount_amount,
       total_amount, paid_amount, debt_amount, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 0, ?, ?, ?, 'completed', '', ?, ?)`,
      [invId, invNumber, custId, cust.name, cust.phone, cust.address,
       saleType, subtotal, totalAmount, paidAmount, debtAmount, createdAt, createdAt]
    );

    for (const item of invoiceItems) {
      db.run(
        `INSERT INTO invoice_items (id, invoice_id, product_id, product_name_snapshot, unit_name_snapshot,
         quantity, unit_price, discount_percent, discount_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        [item.id, item.invoiceId, item.productId, item.name, item.unit, item.qty, item.price, item.lineTotal]
      );
    }

    // If paid > 0, create a payment record
    if (paidAmount > 0) {
      db.run(
        `INSERT INTO payments (id, invoice_id, customer_id, amount, payment_method, notes, created_at)
         VALUES (?, ?, ?, ?, 'cash', '', ?)`,
        [uuidv4(), invId, custId, paidAmount, createdAt]
      );
    }

    const statusLabel = paidPct >= 1 ? '✅ PAID' : paidPct > 0 ? `⚠️  ${Math.round(paidPct*100)}% PAID` : '❌ NO PAY';
    console.log(`  ✓ Invoice: ${invNumber} — ${cust.name} (${saleType}) — ${totalAmount.toLocaleString()}đ — ${statusLabel}`);
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('\n✅ Seeded successfully!');
  console.log(`   10 customers, 20 products, 10 invoices with items + payments`);

  db.close();
}

main().catch(console.error);
