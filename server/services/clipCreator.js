const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { nanoid } = require('nanoid');
const config = require('../config');

const TEMP_DIR = path.join(config.uploadsDir, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

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
 * Download full video at lowest quality using yt-dlp.
 * No --download-sections to avoid ffmpeg HLS issues.
 */
function downloadFull(url, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'worst[ext=mp4]/worst',
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      '--no-playlist',
      '--no-check-certificates',
      '--no-part',
      url,
    ];

    console.log('yt-dlp downloading (worst quality):', url);
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
 * Extract a clip from a local file using ffmpeg with stream copy.
 * Since the file is local, no HLS/CDN issues.
 */
function extractClip(inputPath, outputPath, startSeconds, duration) {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', String(startSeconds),
      '-i', inputPath,
      '-t', String(duration),
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
      reject(new Error('ffmpeg clip timed out'));
    }, 2 * 60 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-300)}`));
      }
      resolve(outputPath);
    });
  });
}

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
 * 1. Download full video at lowest quality (avoids HLS/ffmpeg issues)
 * 2. Extract clip from local file with ffmpeg -c copy (fast, no re-encode)
 * 3. Generate thumbnail
 * 4. Extract metadata
 * 5. Cleanup temp file
 */
async function createClip({ url, startTime, duration = 59, clipId }) {
  const startSeconds = parseTime(startTime);
  const clipDuration = Math.min(duration || 59, config.maxClipDuration);

  const tempFile = path.join(TEMP_DIR, `${nanoid(12)}.mp4`);
  const clipFilename = `${clipId}.mp4`;
  const clipPath = path.join(config.uploadsDir, 'videos', clipFilename);

  try {
    // 1. Download full video at lowest quality
    await downloadFull(url, tempFile);

    // 2. Extract clip (stream copy = fast, no memory)
    await extractClip(tempFile, clipPath, startSeconds, clipDuration);

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
  } finally {
    // 5. Cleanup
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
}

module.exports = { createClip, parseTime };
