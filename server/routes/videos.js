const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const config = require('../config');
const { getDb, saveDb } = require('../db/init');
const { transcodeVideo, generateThumbnail, getVideoMetadata } = require('../services/videoProcessor');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(config.uploadsDir, 'videos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploadMaxSize },
  fileFilter: (req, file, cb) => {
    const allowed = /video\/(mp4|webm|quicktime|x-msvideo|x-matroska)/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// List videos (with optional category/tag filters)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { category, tag, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT v.*, c.name as category_name, c.slug as category_slug
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (category) {
      conditions.push('c.slug = ?');
      params.push(category);
    }

    if (tag) {
      query = `
        SELECT v.*, c.name as category_name, c.slug as category_slug
        FROM videos v
        LEFT JOIN categories c ON v.category_id = c.id
        INNER JOIN video_tags vt ON v.id = vt.video_id
        INNER JOIN tags t ON vt.tag_id = t.id
      `;
      conditions.push('t.slug = ?');
      params.push(tag);
    }

    if (search) {
      conditions.push('(v.title LIKE ? OR v.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const videos = db.exec(query, params);
    const rows = resultToObjects(videos);

    // Attach tags to each video
    for (const video of rows) {
      const tagResult = db.exec(
        `SELECT t.name, t.slug FROM tags t
         INNER JOIN video_tags vt ON t.id = vt.tag_id
         WHERE vt.video_id = ?`,
        [video.id]
      );
      video.tags = resultToObjects(tagResult);
    }

    res.json(rows);
  } catch (err) {
    console.error('Error listing videos:', err);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// Get single video
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT v.*, c.name as category_name, c.slug as category_slug
       FROM videos v
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE v.id = ?`,
      [req.params.id]
    );
    const rows = resultToObjects(result);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = rows[0];

    const tagResult = db.exec(
      `SELECT t.name, t.slug FROM tags t
       INNER JOIN video_tags vt ON t.id = vt.tag_id
       WHERE vt.video_id = ?`,
      [video.id]
    );
    video.tags = resultToObjects(tagResult);

    res.json(video);
  } catch (err) {
    console.error('Error getting video:', err);
    res.status(500).json({ error: 'Failed to get video' });
  }
});

// Serve video file with range request support
router.get('/:id/file', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT file_path FROM videos WHERE id = ?', [req.params.id]);
    const rows = resultToObjects(result);

    if (rows.length === 0 || !rows[0].file_path) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const filePath = rows[0].file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file missing from disk' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Error serving video file:', err);
    res.status(500).json({ error: 'Failed to serve video' });
  }
});

// Serve thumbnail
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT thumbnail_path FROM videos WHERE id = ?', [req.params.id]);
    const rows = resultToObjects(result);

    if (rows.length === 0 || !rows[0].thumbnail_path) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const thumbPath = rows[0].thumbnail_path;
    if (!fs.existsSync(thumbPath)) {
      return res.status(404).json({ error: 'Thumbnail file missing' });
    }

    res.sendFile(thumbPath);
  } catch (err) {
    console.error('Error serving thumbnail:', err);
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    const db = await getDb();
    db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to increment view' });
  }
});

// Upload video
router.post('/', upload.single('video'), async (req, res) => {
  try {
    const db = await getDb();
    const id = nanoid(10);
    const { title, description, category_id, tags, source_type, embed_url } = req.body;

    let filePath = null;
    let thumbnailPath = null;
    let width = 1920;
    let height = 1080;
    let duration = 0;

    if (source_type === 'embed' && embed_url) {
      // External embed - no file processing
    } else if (req.file) {
      const inputPath = req.file.path;
      const outputFilename = `${id}.mp4`;
      const outputPath = path.join(config.uploadsDir, 'videos', outputFilename);
      const thumbFilename = `${id}.jpg`;
      const thumbPath = path.join(config.uploadsDir, 'thumbnails', thumbFilename);

      try {
        // Try to transcode
        await transcodeVideo(inputPath, outputPath);
        filePath = outputPath;

        // Clean up original if different
        if (inputPath !== outputPath && fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      } catch (ffmpegErr) {
        console.warn('ffmpeg transcode failed, using original file:', ffmpegErr.message);
        // Use original file as-is
        filePath = inputPath;
      }

      try {
        await generateThumbnail(filePath, thumbPath);
        thumbnailPath = thumbPath;
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed:', thumbErr.message);
      }

      try {
        const meta = await getVideoMetadata(filePath);
        width = meta.width;
        height = meta.height;
        duration = meta.duration;
      } catch (metaErr) {
        console.warn('Metadata extraction failed:', metaErr.message);
      }
    } else {
      return res.status(400).json({ error: 'No video file or embed URL provided' });
    }

    db.run(
      `INSERT INTO videos (id, title, description, category_id, source_type, file_path, embed_url, thumbnail_path, width, height, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, category_id ? parseInt(category_id) : null,
       source_type || 'upload', filePath, embed_url || null, thumbnailPath,
       width, height, duration]
    );

    // Handle tags
    if (tags) {
      const tagList = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : tags;
      for (const tagName of tagList) {
        const tagSlug = slugify(tagName);
        db.run('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)', [tagName, tagSlug]);
        const tagResult = db.exec('SELECT id FROM tags WHERE slug = ?', [tagSlug]);
        const tagRows = resultToObjects(tagResult);
        if (tagRows.length > 0) {
          db.run('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)', [id, tagRows[0].id]);
        }
      }
    }

    saveDb();

    res.status(201).json({ id, url: `${config.baseUrl}/v/${id}` });
  } catch (err) {
    console.error('Error uploading video:', err);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Delete video
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT file_path, thumbnail_path FROM videos WHERE id = ?', [req.params.id]);
    const rows = resultToObjects(result);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = rows[0];

    // Delete files
    if (video.file_path && fs.existsSync(video.file_path)) {
      fs.unlinkSync(video.file_path);
    }
    if (video.thumbnail_path && fs.existsSync(video.thumbnail_path)) {
      fs.unlinkSync(video.thumbnail_path);
    }

    db.run('DELETE FROM video_tags WHERE video_id = ?', [req.params.id]);
    db.run('DELETE FROM videos WHERE id = ?', [req.params.id]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Helper: convert sql.js exec result to array of objects
function resultToObjects(execResult) {
  if (!execResult || execResult.length === 0) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

module.exports = router;
module.exports.resultToObjects = resultToObjects;
