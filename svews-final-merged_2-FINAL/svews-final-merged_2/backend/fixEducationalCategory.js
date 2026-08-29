// fixEducationalCategory.js — ONE-TIME migration script.
// The original CSV seed (seed.js) split suppliers across 4 categories,
// including "Educational" — which was later dropped from the app scope.
// This reassigns any leftover Educational suppliers evenly across the 3
// current categories (Medical/Stationery/Electronics), round-robin, so
// the "Categories" count and category browsing correctly reflect the
// app's actual 3-category scope.
//
// Usage:  node fixEducationalCategory.js

require('dotenv').config();
const connectDB = require('./config/db');
const Supplier = require('./models/Supplier');

const TARGET_CATEGORIES = ['Medical', 'Stationery', 'Electronics'];

(async () => {
  await connectDB();

  const leftover = await Supplier.find({ category: 'Educational' }).select('_id');
  console.log(`Found ${leftover.length} suppliers still marked "Educational".`);

  if (leftover.length === 0) {
    console.log('Nothing to fix — already clean.');
    process.exit(0);
  }

  let counts = { Medical: 0, Stationery: 0, Electronics: 0 };
  for (let i = 0; i < leftover.length; i++) {
    const newCategory = TARGET_CATEGORIES[i % TARGET_CATEGORIES.length];
    await Supplier.updateOne({ _id: leftover[i]._id }, { $set: { category: newCategory } });
    counts[newCategory]++;
  }

  console.log('Reassigned:');
  console.log(`  Medical:     +${counts.Medical}`);
  console.log(`  Stationery:  +${counts.Stationery}`);
  console.log(`  Electronics: +${counts.Electronics}`);
  console.log('\nDone. Refresh the admin dashboard — "Categories" should now show 3.');
  process.exit(0);
})().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
