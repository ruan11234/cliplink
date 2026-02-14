const express = require('express');
const { getDb } = require('../db/init');
const { resultToObjects } = require('./videos');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM categories ORDER BY name');
    res.json(resultToObjects(result));
  } catch (err) {
    console.error('Error listing categories:', err);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM categories WHERE slug = ?', [req.params.slug]);
    const rows = resultToObjects(result);
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
