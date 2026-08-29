// seedDemo.js — ONE-TIME script that populates all 3 categories
// (Medical/Pharmacy, Stationery, Electronics) with demo suppliers and
// 20 commonly-used-in-Sri-Lanka items each, with realistic USD prices
// and stock quantities.
//
// Usage:  node seedDemo.js
//
// Safe to run more than once — skips anything that already exists
// (matched by email/name), so re-running won't create duplicates.

require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Medicine = require('./models/Medicine');
const Product = require('./models/Product');
const { generateDisplayId } = require('./lib/displayId');
const { predictRisk, FEATURES, loadModel } = require('./ml/riskEngine');

const DEMO_PASSWORD = '123'; // simple, memorable password for testing — not for production use

async function ensureSupplier({ name, email, category }) {
  let user = await User.findOne({ email });
  if (user) {
    const supplier = await Supplier.findById(user.supplierId);
    console.log(`  (exists) ${name} — ${email}`);
    return supplier;
  }
  const displayId = await generateDisplayId(category);
  const supplier = await Supplier.create({ name, category, email, displayId });

  // Score it immediately, same as a real registration would (see the fix
  // in routes/auth.js) — not left as unscored schema defaults.
  const featurePayload = {};
  FEATURES.forEach(f => { featurePayload[f] = Number(supplier[f]); });
  const prediction = await predictRisk(featurePayload);
  supplier.riskCategory = prediction.riskCategory;
  supplier.watchlistProbability = prediction.watchlistProbability;
  supplier.riskUpdatedAt = new Date();
  await supplier.save();

  user = await User.create({ name, email, password: DEMO_PASSWORD, role: 'supplier', category, supplierId: supplier._id });
  console.log(`  ✓ created supplier: ${name} (${displayId}) — login: ${email} / ${DEMO_PASSWORD}`);
  return supplier;
}

async function ensureMedicine(supplierId, { name, priceUSD, stock }) {
  let m = await Medicine.findOne({ supplier: supplierId, name });
  if (m) { console.log(`    (exists) ${name}`); return m; }
  m = await Medicine.create({ supplier: supplierId, name, priceUSD, deliveryAvailable: true, stock });
  console.log(`    ✓ ${name} — $${priceUSD}, stock ${stock}`);
  return m;
}

async function ensureProduct(supplierId, { category, productCategory, name, priceUSD, stock }) {
  let p = await Product.findOne({ supplier: supplierId, name });
  if (p) { console.log(`    (exists) ${name}`); return p; }
  p = await Product.create({ supplier: supplierId, category, productCategory, name, priceUSD, deliveryAvailable: true, stock });
  console.log(`    ✓ ${name} — $${priceUSD}, stock ${stock}`);
  return p;
}

// ---- 20 commonly-used-in-Sri-Lanka pharmacy items ----
const MEDICINES = [
  { name: 'Panadol (Paracetamol 500mg)', priceUSD: 2, stock: 300 },
  { name: 'Piriton (Chlorpheniramine)', priceUSD: 2.5, stock: 200 },
  { name: 'ORS Rehydration Salts', priceUSD: 1.5, stock: 250 },
  { name: 'Amoxicillin 500mg', priceUSD: 4, stock: 150 },
  { name: 'Vitamin C 1000mg', priceUSD: 5, stock: 200 },
  { name: 'Multivitamin Tablets', priceUSD: 6, stock: 180 },
  { name: 'Savlon Antiseptic Cream', priceUSD: 3, stock: 150 },
  { name: 'Cough Syrup', priceUSD: 4, stock: 120 },
  { name: 'Digital Thermometer', priceUSD: 8, stock: 60 },
  { name: 'Blood Pressure Monitor', priceUSD: 25, stock: 30 },
  { name: 'Diabetes Test Strips', priceUSD: 15, stock: 80 },
  { name: 'Hand Sanitizer 100ml', priceUSD: 2, stock: 300 },
  { name: 'Surgical Face Masks (Box of 50)', priceUSD: 3, stock: 200 },
  { name: 'Bandages & Gauze Set', priceUSD: 2, stock: 150 },
  { name: 'Ibuprofen 400mg', priceUSD: 3, stock: 200 },
  { name: 'Gelusil Antacid Tablets', priceUSD: 2.5, stock: 180 },
  { name: 'Eye Drops', priceUSD: 4, stock: 100 },
  { name: 'Omeprazole 20mg (Gastric)', priceUSD: 5, stock: 150 },
  { name: 'Zinc Tablets', priceUSD: 3.5, stock: 120 },
  { name: 'Elastic Crepe Bandage', priceUSD: 2, stock: 100 },
];

// ---- 20 commonly-used-in-Sri-Lanka stationery items ----
const STATIONERY = [
  { productCategory: 'Books & Paper', name: 'CR Exercise Book (80 pages)', priceUSD: 1, stock: 500 },
  { productCategory: 'Books & Paper', name: 'A4 Paper Ream (500 sheets)', priceUSD: 6, stock: 100 },
  { productCategory: 'Office Supplies', name: 'Atlas Ball Pen (Blue)', priceUSD: 0.5, stock: 600 },
  { productCategory: 'Office Supplies', name: 'Natraj Pencils (Pack of 10)', priceUSD: 1.5, stock: 400 },
  { productCategory: 'Office Supplies', name: 'School Bag', priceUSD: 12, stock: 60 },
  { productCategory: 'Office Supplies', name: 'Geometry Box Set', priceUSD: 3, stock: 150 },
  { productCategory: 'Office Supplies', name: 'Highlighter Set (4 colors)', priceUSD: 2, stock: 200 },
  { productCategory: 'Office Supplies', name: 'Tipex Correction Pen', priceUSD: 1.5, stock: 250 },
  { productCategory: 'Office Supplies', name: 'Stapler with Pins', priceUSD: 3, stock: 150 },
  { productCategory: 'Office Supplies', name: 'Plastic File Folders (Pack of 10)', priceUSD: 1.5, stock: 300 },
  { productCategory: 'Art & Craft', name: 'Camlin Sketch Pens (12 colors)', priceUSD: 4, stock: 150 },
  { productCategory: 'Art & Craft', name: 'Wax Crayons (24 colors)', priceUSD: 3, stock: 150 },
  { productCategory: 'Office Supplies', name: 'Plastic Ruler 30cm', priceUSD: 0.5, stock: 400 },
  { productCategory: 'Office Supplies', name: 'Eraser Pack', priceUSD: 0.3, stock: 500 },
  { productCategory: 'Office Supplies', name: 'Pencil Sharpener', priceUSD: 0.4, stock: 400 },
  { productCategory: 'Office Supplies', name: 'Glue Stick', priceUSD: 1, stock: 300 },
  { productCategory: 'Office Supplies', name: 'Scissors', priceUSD: 2, stock: 200 },
  { productCategory: 'Office Supplies', name: 'Casio Scientific Calculator', priceUSD: 8, stock: 80 },
  { productCategory: 'Office Supplies', name: 'Whiteboard Markers (Set of 4)', priceUSD: 2.5, stock: 150 },
  { productCategory: 'Books & Paper', name: 'Envelopes (Pack of 20)', priceUSD: 1, stock: 250 },
];

// ---- 20 commonly-used-in-Sri-Lanka electronics items ----
const ELECTRONICS = [
  { productCategory: 'Mobile & Accessories', name: 'Mobile Phone Charger (Type-C)', priceUSD: 8, stock: 150 },
  { productCategory: 'Mobile & Accessories', name: 'Power Bank 10000mAh', priceUSD: 15, stock: 100 },
  { productCategory: 'Mobile & Accessories', name: 'Wired Earphones', priceUSD: 5, stock: 200 },
  { productCategory: 'Home Electronics', name: 'Bluetooth Speaker', priceUSD: 20, stock: 80 },
  { productCategory: 'Mobile & Accessories', name: 'USB Cable', priceUSD: 3, stock: 250 },
  { productCategory: 'Home Electronics', name: 'Extension Cord (4-socket)', priceUSD: 8, stock: 120 },
  { productCategory: 'Home Electronics', name: 'LED Bulb 9W', priceUSD: 2, stock: 300 },
  { productCategory: 'Home Electronics', name: 'Rechargeable Torch', priceUSD: 4, stock: 150 },
  { productCategory: 'Home Electronics', name: 'AA Batteries (Pack of 4)', priceUSD: 3, stock: 300 },
  { productCategory: 'Home Electronics', name: 'Electric Kettle 1.5L', priceUSD: 18, stock: 70 },
  { productCategory: 'Home Electronics', name: 'Rice Cooker', priceUSD: 25, stock: 50 },
  { productCategory: 'Home Electronics', name: 'Table Fan', priceUSD: 20, stock: 60 },
  { productCategory: 'Home Electronics', name: 'Iron Box', priceUSD: 15, stock: 70 },
  { productCategory: 'Home Electronics', name: 'Mixer Grinder', priceUSD: 30, stock: 40 },
  { productCategory: 'Computers & Laptops', name: 'Memory Card 32GB', priceUSD: 8, stock: 150 },
  { productCategory: 'Computers & Laptops', name: 'USB Pen Drive 32GB', priceUSD: 6, stock: 180 },
  { productCategory: 'Computers & Laptops', name: 'Wireless Mouse', priceUSD: 5, stock: 150 },
  { productCategory: 'Computers & Laptops', name: 'USB Keyboard', priceUSD: 10, stock: 100 },
  { productCategory: 'Computers & Laptops', name: 'HDMI Cable', priceUSD: 5, stock: 150 },
  { productCategory: 'Home Electronics', name: 'Voltage Stabilizer', priceUSD: 12, stock: 60 },
];

(async () => {
  await connectDB();
  await loadModel(); // must happen before ensureSupplier() calls predictRisk()
  console.log('\n=== Seeding: 3 categories x 20 Sri Lanka-relevant items each ===\n');

  console.log('Medical / Pharmacy:');
  const pharmacy = await ensureSupplier({ name: 'Thivya Pharmacy', email: 'thivya.pharmacy@gmail.com', category: 'Medical' });
  for (const item of MEDICINES) await ensureMedicine(pharmacy._id, item);

  console.log('\nStationery:');
  const stationery = await ensureSupplier({ name: 'Thivya Stationery', email: 'thivya.stationery@gmail.com', category: 'Stationery' });
  for (const item of STATIONERY) await ensureProduct(stationery._id, { category: 'Stationery', ...item });

  console.log('\nElectronics:');
  const electronics = await ensureSupplier({ name: 'Thivya Electronics', email: 'thivya.electronics@gmail.com', category: 'Electronics' });
  for (const item of ELECTRONICS) await ensureProduct(electronics._id, { category: 'Electronics', ...item });

  console.log('\nDemo User account:');
  let demoUser = await User.findOne({ email: 'thivya@gmail.com' });
  if (!demoUser) {
    await User.create({ name: 'Thivya', email: 'thivya@gmail.com', password: DEMO_PASSWORD, role: 'user' });
    console.log(`  ✓ created — login: thivya@gmail.com / ${DEMO_PASSWORD}`);
  } else {
    console.log('  (exists) thivya@gmail.com');
  }

  console.log(`\n=== Done. 60 items total across 3 suppliers. All demo logins use password: ${DEMO_PASSWORD} ===\n`);
  process.exit(0);
})().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
