const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT, then loads the full User document (not just the JWT
// payload) onto req.user — so req.user._id, req.user.name, req.user.email,
// req.user.supplierId are all reliably available everywhere downstream.
// (The JWT payload itself only carries { id, role, category, name } —
// see routes/auth.js's signToken — which isn't enough for routes that
// need the user's email, e.g. PayHere checkout, or a reliable _id.)
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to one or more roles, e.g. requireRole('admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
