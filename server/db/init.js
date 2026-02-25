const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('../config');

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl && config.databaseUrl.includes('railway.internal')
      ? false
      : config.databaseUrl && config.databaseUrl.includes('railway')
        ? { rejectUnauthorized: false }
        : false,
  });

  return pool;
}

async function initDb() {
  const p = getPool();

  // Create users table
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      is_approved BOOLEAN DEFAULT FALSE,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create categories table
  await p.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  // Create videos table
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

  // Add user_id and source_url columns to videos (idempotent)
  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'user_id') THEN
        ALTER TABLE videos ADD COLUMN user_id INTEGER REFERENCES users(id);
      END IF;
    END $$
  `);

  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'source_url') THEN
        ALTER TABLE videos ADD COLUMN source_url TEXT;
      END IF;
    END $$
  `);

  // Create tags table
  await p.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  // Create video_tags table
  await p.query(`
    CREATE TABLE IF NOT EXISTS video_tags (
      video_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (video_id, tag_id),
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    )
  `);

  // Replace old categories with adult categories
  const oldCategories = ['Gaming', 'Music', 'Comedy', 'Sports', 'Education'];
  for (const name of oldCategories) {
    await p.query('DELETE FROM categories WHERE name = $1', [name]);
  }

  const adultCategories = [
    { name: 'Amateur', slug: 'amateur' },
    { name: 'Anal', slug: 'anal' },
    { name: 'Asian', slug: 'asian' },
    { name: 'BBW', slug: 'bbw' },
    { name: 'Big Tits', slug: 'big-tits' },
    { name: 'Blonde', slug: 'blonde' },
    { name: 'Blowjob', slug: 'blowjob' },
    { name: 'Brunette', slug: 'brunette' },
    { name: 'Creampie', slug: 'creampie' },
    { name: 'Cumshot', slug: 'cumshot' },
    { name: 'Ebony', slug: 'ebony' },
    { name: 'Hardcore', slug: 'hardcore' },
    { name: 'Latina', slug: 'latina' },
    { name: 'Lesbian', slug: 'lesbian' },
    { name: 'MILF', slug: 'milf' },
    { name: 'POV', slug: 'pov' },
    { name: 'Redhead', slug: 'redhead' },
    { name: 'Teen (18+)', slug: 'teen-18' },
    { name: 'Threesome', slug: 'threesome' },
    { name: 'Other', slug: 'other' },
  ];

  for (const cat of adultCategories) {
    await p.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [cat.name, cat.slug]
    );
  }

  // Seed admin user from env vars
  if (config.adminEmail && config.adminPassword) {
    try {
      const hash = await bcrypt.hash(config.adminPassword, 10);
      const { rows } = await p.query('SELECT id FROM users WHERE email = $1', [config.adminEmail]);
      if (rows.length === 0) {
        // Delete any existing user with username 'admin' to avoid conflict
        await p.query('DELETE FROM users WHERE username = $1 AND email != $2', ['admin', config.adminEmail]);
        await p.query(
          'INSERT INTO users (email, password_hash, username, is_approved, is_admin) VALUES ($1, $2, $3, TRUE, TRUE)',
          [config.adminEmail, hash, 'admin']
        );
        console.log('Admin user seeded:', config.adminEmail);
      } else {
        await p.query(
          'UPDATE users SET password_hash = $1, is_approved = TRUE, is_admin = TRUE WHERE email = $2',
          [hash, config.adminEmail]
        );
        console.log('Admin user updated:', config.adminEmail);
      }
    } catch (err) {
      console.error('Admin seed error:', err.message);
    }
  }

  return p;
}

module.exports = { getPool, initDb };
