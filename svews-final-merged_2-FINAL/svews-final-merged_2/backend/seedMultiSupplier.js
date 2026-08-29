require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Medicine = require('./models/Medicine');
const Product = require('./models/Product');
const { generateDisplayId } = require('./lib/displayId');
const { predictRisk, FEATURES, loadModel } = require('./ml/riskEngine');
const PASSWORD = '123';
async function ensureSupplier(name, email, category) {
  let user = await User.findOne({ email });
  if (user) { console.log('  (exists) ' + name); return Supplier.findById(user.supplierId); }
  const displayId = await generateDisplayId(category);
  const supplier = await Supplier.create({ name, category, email, displayId });
  const fp = {};
  FEATURES.forEach(f => { fp[f] = Number(supplier[f]); });
  const pred = await predictRisk(fp);
  supplier.riskCategory = pred.riskCategory;
  supplier.watchlistProbability = pred.watchlistProbability;
  supplier.riskUpdatedAt = new Date();
  await supplier.save();
  await User.create({ name, email, password: PASSWORD, role: 'supplier', category, supplierId: supplier._id });
  console.log('  + ' + name + ' (' + displayId + ') - ' + email + ' / ' + PASSWORD);
  return supplier;
}
async function ensureMed(sid, name, price, stock) {
  if (await Medicine.findOne({ supplier: sid, name })) return;
  await Medicine.create({ supplier: sid, name, priceUSD: price, deliveryAvailable: true, stock });
  console.log('    - ' + name);
}
async function ensureProd(sid, cat, pcat, name, price, stock) {
  if (await Product.findOne({ supplier: sid, name })) return;
  await Product.create({ supplier: sid, category: cat, productCategory: pcat, name, priceUSD: price, deliveryAvailable: true, stock });
  console.log('    - ' + name);
}

// ---- Batch 1: 5 named suppliers per category, 2 items each (30 items) ----
const MED = [['Lanka Pharmacy','lanka.pharmacy@gmail.com',[['Ibuprofen 400mg',3,200],['Cough Syrup',4,120]]],['City Medicals','city.medicals@gmail.com',[['Vitamin C 1000mg',5,200],['Hand Sanitizer 100ml',2,300]]],['Wellness Pharmacy','wellness.pharmacy@gmail.com',[['Multivitamin Tablets',6,180],['Zinc Tablets',3.5,120]]],['HealthFirst Pharmacy','healthfirst.pharmacy@gmail.com',[['Digital Thermometer',8,60],['Eye Drops',4,100]]],['Family Care Pharmacy','familycare.pharmacy@gmail.com',[['Gelusil Antacid',2.5,180],['Crepe Bandage',2,100]]]];
const STA = [['Bookland Stationers','bookland.stationers@gmail.com',[['CR Exercise Book',1,500],['A4 Paper Ream',6,100]]],['Campus Supplies','campus.supplies@gmail.com',[['Geometry Box Set',3,150],['Casio Calculator',8,80]]],['Paper Plus','paper.plus@gmail.com',[['Envelopes Pack of 20',1,250],['File Folders Pack',1.5,300]]],['Study Mart','study.mart@gmail.com',[['Atlas Ball Pen',0.5,600],['Natraj Pencils',1.5,400]]],['Office Essentials LK','office.essentials.lk@gmail.com',[['Stapler with Pins',3,150],['Whiteboard Markers',2.5,150]]]];
const ELE = [['Digital World','digital.world@gmail.com',[['Phone Charger',8,150],['Power Bank',15,100]]],['TechZone Lanka','techzone.lanka@gmail.com',[['Wireless Mouse',5,150],['USB Keyboard',10,100]]],['Gadget Hub','gadget.hub@gmail.com',[['Wired Earphones',5,200],['Bluetooth Speaker',20,80]]],['ElectroMart','electromart@gmail.com',[['LED Bulb 9W',2,300],['Extension Cord',8,120]]],['SmartBuy Electronics','smartbuy.electronics@gmail.com',[['Memory Card 32GB',8,150],['HDMI Cable',5,150]]]];

// ---- Batch 2: Supplier1 + Ravi, 1 supplier per category each, 10 items each (60 items) ----
const MED_ITEMS = [['Paracetamol 500mg',2,200],['Amoxicillin 250mg',4,150],['Vitamin D3',5,180],['Cetirizine 10mg',2.5,200],['ORS Sachets',1.5,250],['Antifungal Cream',4,120],['Calcium Tablets',5,150],['Cough Lozenges',2,220],['Nasal Spray',3.5,130],['First Aid Kit',10,60]];
const STA_ITEMS = [['Gel Pen Set',2,300],['Sticky Notes',1.5,350],['Clipboard',3,150],['Binder Clips Pack',1,300],['Marker Set',3,180],['Notebook A5',2,300],['Push Pins Box',1,250],['Sketch Book',4,150],['Whiteboard Small',12,60],['Desk Calendar',3,150]];
const ELE_ITEMS = [['Phone Stand',4,200],['Screen Protector',3,300],['Cable Organizer',2,250],['USB Hub',8,150],['Laptop Sleeve',10,100],['Portable Fan USB',6,150],['LED Strip Light',9,120],['Car Charger',5,180],['Webcam Cover',1,300],['Wireless Charger',12,100]];
const PEOPLE = [{ tag: 'supplier1', label: 'Supplier1' }, { tag: 'ravi', label: 'Ravi' }];

(async () => {
  await connectDB();
  await loadModel();

  console.log('=== Batch 1: 5 named suppliers per category ===');
  console.log('Medical:');
  for (const [n,e,items] of MED) { const s = await ensureSupplier(n,e,'Medical'); for (const [nm,p,st] of items) await ensureMed(s._id,nm,p,st); }
  console.log('Stationery:');
  for (const [n,e,items] of STA) { const s = await ensureSupplier(n,e,'Stationery'); for (const [nm,p,st] of items) await ensureProd(s._id,'Stationery','Office Supplies',nm,p,st); }
  console.log('Electronics:');
  for (const [n,e,items] of ELE) { const s = await ensureSupplier(n,e,'Electronics'); for (const [nm,p,st] of items) await ensureProd(s._id,'Electronics','Computers & Laptops',nm,p,st); }

  console.log('\n=== Batch 2: Supplier1 + Ravi (1 supplier per category, 10 items each) ===');
  for (const person of PEOPLE) {
    console.log(person.label + ' - Medical:');
    const med = await ensureSupplier(person.label + ' Pharmacy', person.tag + '.medical@gmail.com', 'Medical');
    for (const [n,p,s] of MED_ITEMS) await ensureMed(med._id, n, p, s);

    console.log(person.label + ' - Stationery:');
    const sta = await ensureSupplier(person.label + ' Stationery', person.tag + '.stationery@gmail.com', 'Stationery');
    for (const [n,p,s] of STA_ITEMS) await ensureProd(sta._id, 'Stationery', 'Office Supplies', n, p, s);

    console.log(person.label + ' - Electronics:');
    const ele = await ensureSupplier(person.label + ' Electronics', person.tag + '.electronics@gmail.com', 'Electronics');
    for (const [n,p,s] of ELE_ITEMS) await ensureProd(ele._id, 'Electronics', 'Computers & Laptops', n, p, s);
  }

  console.log('\nDONE - 21 suppliers total, 90 items total. All passwords: 123');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
