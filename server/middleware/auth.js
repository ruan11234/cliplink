const jwt = require('jsonwebtoken');
const config = require('../config');
const { getPool } = require('../db/init');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireApproved(req, res, next) {
  if (!req.user.is_approved) {
    return res.status(403).json({ error: 'Account pending approval' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireApproved, requireAdmin };
