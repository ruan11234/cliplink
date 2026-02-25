const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const config = require('../config');

const THUMB_DIR = path.join(config.uploadsDir, 'thumbnails');

/**
 * Fetch thumbnail for a video URL using yt-dlp.
 * Returns the local file path or null on failure.
 */
async function fetchThumbnail(url, id) {
  try {
    const thumbUrl = await getThumbnailUrl(url);
    if (!thumbUrl) return null;

    const ext = thumbUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
    const filename = `${id}.${ext}`;
    const filepath = path.join(THUMB_DIR, filename);

    await downloadFile(thumbUrl, filepath);
    return filepath;
  } catch (err) {
    console.warn('Thumbnail fetch failed:', err.message);
    return null;
  }
}

/**
 * Get thumbnail URL from yt-dlp without downloading video
 */
function getThumbnailUrl(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
      '--get-thumbnail',
      '--no-playlist',
      '--no-check-certificates',
      url,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Thumbnail URL fetch timed out'));
    }, 30 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      const thumbUrl = stdout.trim().split('\n')[0];
      if (!thumbUrl || code !== 0) {
        return resolve(null);
      }
      resolve(thumbUrl);
    });
  });
}

/**
 * Download a file from URL to local path
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(filepath);
        return downloadFile(res.headers.location, filepath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        return reject(new Error(`Download failed with status ${res.statusCode}`));
      }

      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(filepath); });
      file.on('error', (err) => { fs.unlinkSync(filepath); reject(err); });
    }).on('error', (err) => {
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

module.exports = { fetchThumbnail };
