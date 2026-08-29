// convertToUser.js — ONE-TIME script.
// Converts an existing Supplier-role account back into a plain User
// (customer) account: deletes the linked Supplier document (and its
// products/medicines) and updates the User record's role.
//
// Usage:  node convertToUser.js thivya@gmail.com

require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Product = require('./models/Product');
const Medicine = require('./models/Medicine');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node convertToUser.js <email>');
  process.exit(1);
}

(async () => {
  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }
  if (user.role !== 'supplier') {
    console.log(`${email} is already role "${user.role}" — nothing to convert.`);
    process.exit(0);
  }

  const supplierId = user.supplierId;
  if (supplierId) {
    const products = await Product.deleteMany({ supplier: supplierId });
    const medicines = await Medicine.deleteMany({ supplier: supplierId });
    await Supplier.findByIdAndDelete(supplierId);
    console.log(`Deleted supplier profile + ${products.deletedCount} products + ${medicines.deletedCount} medicines.`);
  }

  user.role = 'user';
  user.category = undefined;
  user.supplierId = undefined;
  await user.save();

  console.log(`✓ ${email} is now a User (customer) account. Log in as normal — you'll land on the User dashboard.`);
  process.exit(0);
})().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
