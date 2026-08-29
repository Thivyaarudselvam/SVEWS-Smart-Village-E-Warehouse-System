// validateMockData.js — ONE-TIME script.
// Runs the 3 category mock CSVs through the SAME deployed ONNX model
// used by the live app (ml/riskEngine.js) — not a separate re-trained
// model — and checks each prediction against the CSV's
// `expected_risk_category` column (derived from a simple, transparent
// business rule, not from training data).
//
// This validates the deployed model's logical consistency on clear-cut
// cases, not its statistical accuracy (that's already measured — 92% —
// on the real Kaggle test set during training).
//
// Usage:
//   node validateMockData.js path/to/mock_medical.csv
//   node validateMockData.js path/to/mock_stationery.csv
//   node validateMockData.js path/to/mock_electronics.csv

const fs = require('fs');
const { loadModel, predictRisk, FEATURES } = require('./ml/riskEngine');

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i]; });
    return row;
  });
}

(async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node validateMockData.js <path-to-csv>');
    process.exit(1);
  }

  await loadModel(); // load the real deployed ONNX model, same as server.js

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  console.log(`\n=== Validating ${rows.length} rows from ${csvPath} ===\n`);

  let matches = 0;
  const mismatches = [];

  for (const row of rows) {
    const featurePayload = {};
    FEATURES.forEach(f => { featurePayload[f] = Number(row[f]); });

    const prediction = await predictRisk(featurePayload);
    const expected = row.expected_risk_category;
    const actual = prediction.riskCategory;
    const agree = expected === actual;
    if (agree) matches++;
    else mismatches.push({ id: row.supplier_id, expected, actual, probability: prediction.watchlistProbability });

    console.log(
      `${row.supplier_id.padEnd(16)} expected=${expected.padEnd(10)} model=${actual.padEnd(10)} ` +
      `(${Math.round(prediction.watchlistProbability * 100)}% watchlist prob) ${agree ? '✓' : '✗ MISMATCH'}`
    );
  }

  console.log(`\n=== Result: ${matches}/${rows.length} agree with expected label (${Math.round(matches / rows.length * 100)}%) ===`);
  if (mismatches.length) {
    console.log('\nMismatches (worth reviewing — may indicate a genuinely borderline case, not necessarily a model error):');
    mismatches.forEach(m => console.log(`  ${m.id}: expected ${m.expected}, model said ${m.actual} (${Math.round(m.probability*100)}% watchlist)`));
  }
  process.exit(0);
})().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
