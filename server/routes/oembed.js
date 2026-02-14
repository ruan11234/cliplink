const express = require('express');
const config = require('../config');
const { getPool } = require('../db/init');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    // Extract video ID from URL
    const match = url.match(/\/v\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return res.status(404).json({ error: 'Invalid video URL' });
    }

    const videoId = match[1];
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = rows[0];

    res.json({
      type: 'video',
      version: '1.0',
      title: video.title,
      provider_name: 'ClipLink',
      provider_url: config.baseUrl,
      width: video.width,
      height: video.height,
      html: `<iframe src="${config.baseUrl}/embed/${video.id}" width="${video.width}" height="${video.height}" frameborder="0" allowfullscreen allow="autoplay"></iframe>`,
      thumbnail_url: `${config.baseUrl}/api/videos/${video.id}/thumbnail`,
      thumbnail_width: 640,
      thumbnail_height: 360,
    });
  } catch (err) {
    console.error('oEmbed error:', err);
    res.status(500).json({ error: 'oEmbed failed' });
  }
});

module.exports = router;
