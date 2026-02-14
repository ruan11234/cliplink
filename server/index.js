const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDb, getPool } = require('./db/init');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API routes
app.use('/api/videos', require('./routes/videos'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tags', require('./routes/tags'));
app.use('/oembed', require('./routes/oembed'));
app.use('/embed', require('./routes/embed'));

// SSR video page for bots/scrapers (Reddit, Twitter, etc.)
app.get('/v/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT v.*, c.name as category_name, c.slug as category_slug
       FROM videos v
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE v.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).send('Video not found');
    }

    res.render('video', { video: rows[0], baseUrl: config.baseUrl });
  } catch (err) {
    console.error('SSR video page error:', err);
    res.status(500).send('Error loading video');
  }
});

// Serve React build in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <html><body style="font-family: sans-serif; padding: 2rem;">
        <h1>ClipLink</h1>
        <p>Client not built yet. Run <code>npm run build</code> or <code>npm run client</code> for dev mode.</p>
        <p>API is running at <a href="/api/videos">/api/videos</a></p>
      </body></html>
    `);
  }
});

// Initialize DB and start server
async function start() {
  await initDb();
  app.listen(config.port, () => {
    console.log(`ClipLink server running at ${config.baseUrl}`);
  });
}

start().catch(console.error);
