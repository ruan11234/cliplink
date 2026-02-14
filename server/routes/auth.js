const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getPool } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const pool = getPool();
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3)',
      [email, hash, username]
    );

    res.status(201).json({ message: 'Registration successful. Your account is pending admin approval.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, is_approved: user.is_approved, is_admin: user.is_admin },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, is_approved: user.is_approved, is_admin: user.is_admin },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, username, is_approved, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Admin: list all users
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, username, is_approved, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Admin: approve user
router.patch('/admin/users/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE users SET is_approved = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'User approved' });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Admin: revoke user approval
router.patch('/admin/users/:id/revoke', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE users SET is_approved = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'User approval revoked' });
  } catch (err) {
    console.error('Revoke user error:', err);
    res.status(500).json({ error: 'Failed to revoke user' });
  }
});

module.exports = router;
