const express = require('express');
const { getPool } = require('../db/init');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('Error listing categories:', err);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM categories WHERE slug = $1', [req.params.slug]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error getting category:', err);
    res.status(500).json({ error: 'Failed to get category' });
  }
});

module.exports = router;
