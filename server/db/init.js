const initSQL = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'cliplink.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSQL();

  let data = null;
  if (fs.existsSync(DB_PATH)) {
    data = fs.readFileSync(DB_PATH);
  }

  db = new SQL.Database(data ? data : undefined);

  // Enable WAL mode equivalent and foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
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

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)');
  for (const cat of defaultCategories) {
    insertCat.run([cat.name, cat.slug]);
  }
  insertCat.free();

  saveDb();

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = { getDb, saveDb };
