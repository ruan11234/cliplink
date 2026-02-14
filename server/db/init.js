const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl && config.databaseUrl.includes('railway')
      ? { rejectUnauthorized: false }
      : false,
  });

  return pool;
}

async function initDb() {
  const p = getPool();

  // Create tables
  await p.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      source_type TEXT NOT NULL,
      file_path TEXT,
      embed_url TEXT,
      thumbnail_path TEXT,
      width INTEGER DEFAULT 1920,
      height INTEGER DEFAULT 1080,
      duration REAL,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS video_tags (
      video_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (video_id, tag_id),
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    )
  `);

  // Seed default categories
  const defaultCategories = [
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Music', slug: 'music' },
    { name: 'Comedy', slug: 'comedy' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Education', slug: 'education' },
    { name: 'Other', slug: 'other' },
  ];

  for (const cat of defaultCategories) {
    await p.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [cat.name, cat.slug]
    );
  }

  return p;
}

module.exports = { getPool, initDb };
