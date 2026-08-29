// One-time seed script: loads supplier_data.csv (the 8,200-row research dataset),
// scores EVERY supplier with the real ONNX model, and bulk-inserts them into MongoDB.
// Run with:  node seed.js path/to/supplier_data.csv
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const Supplier = require('./models/Supplier');
const { predictRisk, FEATURES } = require('./ml/riskEngine');

const CATEGORIES = ['Medical', 'Stationery', 'Electronics'];

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = raw[0].replace(/\r$/, '').split(',');
  return raw.slice(1).map(line => {
    const values = line.replace(/\r$/, '').split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i]; });
    return row;
  });
}

(async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node seed.js path/to/supplier_data.csv');
    process.exit(1);
  }

  await connectDB();
  const rows = parseCSV(path.resolve(csvPath));
  console.log(`Loaded ${rows.length} suppliers from CSV. Scoring with ML model...`);

  const docs = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const featurePayload = {};
    FEATURES.forEach(f => { featurePayload[f] = Number(r[f]); });

    const prediction = await predictRisk(featurePayload);

    docs.push({
      name: r.supplier_id,
      category: CATEGORIES[i % CATEGORIES.length], // distribute across the 3 real categories
      ...featurePayload,
      riskCategory: prediction.riskCategory,
      watchlistProbability: prediction.watchlistProbability,
      riskUpdatedAt: new Date(),
    });

    if (i % 1000 === 0) console.log(`  scored ${i}/${rows.length}...`);
  }

  await Supplier.deleteMany({});
  await Supplier.insertMany(docs);
  console.log(`Seeded ${docs.length} suppliers with ML-scored risk categories.`);
  process.exit(0);
})();
