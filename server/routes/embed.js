const express = require('express');
const config = require('../config');
const { getPool } = require('../db/init');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).send('Video not found');
    }

    const video = rows[0];
    const isEmbed = video.source_type === 'embed' && video.embed_url;

    let videoSrc;
    if (isEmbed) {
      videoSrc = video.embed_url;
    } else {
      videoSrc = `${config.baseUrl}/api/videos/${video.id}/file`;
    }

    // Allow embedding from any origin (for Reddit, Embedly, etc.)
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");

    res.render('embed', { video, videoSrc, isEmbed, baseUrl: config.baseUrl });
  } catch (err) {
    console.error('Embed error:', err);
    res.status(500).send('Error loading embed');
  }
});

module.exports = router;
