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

async function runOne(csvPath) {
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  console.log('\n=== 12-Month Risk Trend — ' + rows[0].supplier_id + ' (' + csvPath + ') ===\n');
  console.log('Month  Category    Watchlist%  Trend Bar');
  for (const row of rows) {
    const fp = {};
    FEATURES.forEach(f => { fp[f] = Number(row[f]); });
    const p = await predictRisk(fp);
    const pct = Math.round(p.watchlistProbability * 100);
    const bar = '#'.repeat(Math.round(pct / 4));
    console.log(String(row.month).padEnd(7) + p.riskCategory.padEnd(12) + (pct + '%').padEnd(12) + bar);
  }
}

(async () => {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error('Usage: node trendAnalysis.js <csv1> [csv2] [csv3] ...');
    console.error('Example: node trendAnalysis.js mock_trend_medical.csv mock_trend_stationery.csv mock_trend_electronics.csv');
    process.exit(1);
  }
  await loadModel();
  for (const p of paths) {
    if (!fs.existsSync(p)) { console.log('\n(skipping ' + p + ' — file not found)'); continue; }
    await runOne(p);
  }
  console.log('');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
