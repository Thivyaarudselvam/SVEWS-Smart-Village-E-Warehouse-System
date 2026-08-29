const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, // stored as bcrypt hash, never plain text
  role: { type: String, enum: ['admin', 'supplier', 'user'], required: true },
  category: {
    type: String,
    enum: ['Medical', 'Stationery', 'Electronics'],
    required: function () { return this.role === 'supplier'; },
  },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }, // linked supplier profile
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
