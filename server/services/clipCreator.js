const { spawn, execSync } = require('child_process');
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
 * Get the direct stream URL using yt-dlp (no download)
 */
function getStreamUrl(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'best[ext=mp4]/best',
      '--get-url',
      '--no-playlist',
      '--no-check-certificates',
      url,
    ];

    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp URL extraction timed out'));
    }, 60 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`yt-dlp failed (code ${code}): ${stderr.slice(-500)}`));
      }
      const streamUrl = stdout.trim().split('\n')[0];
      if (!streamUrl) {
        return reject(new Error('yt-dlp returned no URL'));
      }
      resolve(streamUrl);
    });
  });
}

/**
 * Clip directly from stream URL using ffmpeg with stream copy (no re-encoding).
 * -ss before -i enables input seeking (skips to start without reading prior data).
 * -c copy copies the bitstream without decoding/encoding (minimal memory).
 */
function clipFromStream(streamUrl, outputPath, startSeconds, duration) {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', String(startSeconds),
      '-i', streamUrl,
      '-t', String(Math.min(duration, config.maxClipDuration)),
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args);
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ffmpeg clip timed out (3 minutes)'));
    }, 3 * 60 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-500)}`));
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
 * 1. Get direct stream URL via yt-dlp
 * 2. Clip directly from stream with ffmpeg (stream copy, no re-encode)
 * 3. Generate thumbnail
 * 4. Extract metadata
 */
async function createClip({ url, startTime, duration = 59, clipId }) {
  const startSeconds = parseTime(startTime);
  const clipDuration = Math.min(duration || 59, config.maxClipDuration);

  // 1. Get stream URL (no download)
  const streamUrl = await getStreamUrl(url);

  // 2. Clip directly from stream (stream copy = minimal memory)
  const clipFilename = `${clipId}.mp4`;
  const clipPath = path.join(config.uploadsDir, 'videos', clipFilename);
  await clipFromStream(streamUrl, clipPath, startSeconds, clipDuration);

  // 3. Thumbnail
  const thumbFilename = `${clipId}.jpg`;
  const thumbPath = path.join(config.uploadsDir, 'thumbnails', thumbFilename);
  let thumbnailPath = null;
  try {
    await generateThumbnail(clipPath, thumbPath);
    thumbnailPath = thumbPath;
  } catch (err) {
    console.warn('Thumbnail generation failed:', err.message);
  }

  // 4. Metadata
  let meta = { width: 1920, height: 1080, duration: clipDuration };
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
