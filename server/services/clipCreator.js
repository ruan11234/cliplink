const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { nanoid } = require('nanoid');
const config = require('../config');

const TEMP_DIR = path.join(config.uploadsDir, 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Parse time string like "1:30" or "90" into seconds
 */
function parseTime(str) {
  if (!str && str !== 0) return 0;
  const s = String(str).trim();
  if (s.includes(':')) {
    const parts = s.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseFloat(s) || 0;
}

/**
 * Download only the clip section using yt-dlp --download-sections.
 * Uses a 480p format to minimize memory and disk usage.
 * yt-dlp handles HLS/DASH internally so this works with all sites.
 */
function downloadSection(url, startSeconds, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const end = startSeconds + duration;
    const section = `*${startSeconds}-${end}`;

    const args = [
      '-f', 'worst[ext=mp4]/worst',
      '--download-sections', section,
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      '--no-playlist',
      '--no-check-certificates',
      '--no-part',
      url,
    ];

    console.log('yt-dlp clip:', section, 'from', url);
    const proc = spawn('yt-dlp', args);
    let stderr = '';

    proc.stdout.on('data', () => {});
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp download timed out (5 minutes)'));
    }, 5 * 60 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`yt-dlp failed (code ${code}): ${stderr.slice(-500)}`));
      }
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('yt-dlp produced no output file'));
      }
      resolve(outputPath);
    });
  });
}

/**
 * Generate a thumbnail at 1 second into the clip
 */
function generateThumbnail(videoPath, thumbnailPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '640x360',
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Get video metadata via ffprobe
 */
function getMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      resolve({
        width: videoStream ? videoStream.width : 1920,
        height: videoStream ? videoStream.height : 1080,
        duration: metadata.format.duration ? parseFloat(metadata.format.duration) : 0,
      });
    });
  });
}

/**
 * Full clip creation pipeline:
 * 1. Download only the clip section via yt-dlp (handles HLS/DASH, 480p)
 * 2. Generate thumbnail from the downloaded clip
 * 3. Extract metadata
 */
async function createClip({ url, startTime, duration = 59, clipId }) {
  const startSeconds = parseTime(startTime);
  const clipDuration = Math.min(duration || 59, config.maxClipDuration);

  // 1. Download just the clip section (480p to save memory)
  const clipFilename = `${clipId}.mp4`;
  const clipPath = path.join(config.uploadsDir, 'videos', clipFilename);
  await downloadSection(url, startSeconds, clipDuration, clipPath);

  // 2. Thumbnail
  const thumbFilename = `${clipId}.jpg`;
  const thumbPath = path.join(config.uploadsDir, 'thumbnails', thumbFilename);
  let thumbnailPath = null;
  try {
    await generateThumbnail(clipPath, thumbPath);
    thumbnailPath = thumbPath;
  } catch (err) {
    console.warn('Thumbnail generation failed:', err.message);
  }

  // 3. Metadata
  let meta = { width: 854, height: 480, duration: clipDuration };
  try {
    meta = await getMetadata(clipPath);
  } catch (err) {
    console.warn('Metadata extraction failed:', err.message);
  }

  return {
    filePath: clipPath,
    thumbnailPath,
    width: meta.width,
    height: meta.height,
    duration: meta.duration,
  };
}

module.exports = { createClip, parseTime };
