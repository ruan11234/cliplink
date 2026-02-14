const express = require('express');
const { getDb } = require('../db/init');
const { resultToObjects } = require('./videos');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT t.*, COUNT(vt.video_id) as video_count
      FROM tags t
      LEFT JOIN video_tags vt ON t.id = vt.tag_id
      GROUP BY t.id
      ORDER BY video_count DESC
    `);
    res.json(resultToObjects(result));
  } catch (err) {
    console.error('Error listing tags:', err);
    res.status(500).json({ error: 'Failed to list tags' });
  }
});

module.exports = router;
