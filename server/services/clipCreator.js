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
 * Download a section of video from URL using yt-dlp
 */
function downloadVideo(url, startSeconds, duration) {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(TEMP_DIR, `${nanoid(12)}.%(ext)s`);

    // Add buffer before/after to ensure we capture the right section
    const bufferStart = Math.max(0, startSeconds - 2);
    const bufferEnd = startSeconds + duration + 2;
    const section = `*${bufferStart}-${bufferEnd}`;

    const args = [
      '-f', 'best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--download-sections', section,
      '-o', outputFile,
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
      reject(new Error('Download timed out (5 minutes)'));
    }, 5 * 60 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`yt-dlp failed (code ${code}): ${stderr.slice(-500)}`));
      }

      // Find the actual output file (yt-dlp replaces %(ext)s)
      const basePattern = outputFile.replace('.%(ext)s', '');
      const dir = path.dirname(basePattern);
      const prefix = path.basename(basePattern);
      const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix));

      if (files.length === 0) {
        return reject(new Error('yt-dlp produced no output file'));
      }

      resolve(path.join(dir, files[0]));
    });
  });
}

/**
 * Clip a video file with ffmpeg
 */
function clipVideo(inputPath, outputPath, startSeconds, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSeconds)
      .duration(Math.min(duration, config.maxClipDuration))
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-crf', '23',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
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
 * 1. Download from URL
 * 2. Clip to specified start/duration
 * 3. Generate thumbnail
 * 4. Extract metadata
 * 5. Cleanup temp file
 */
async function createClip({ url, startTime, duration = 59, clipId }) {
  let downloadedPath = null;

  try {
    const startSeconds = parseTime(startTime);
    const clipDuration = Math.min(duration || 59, config.maxClipDuration);

    // 1. Download only the section we need
    downloadedPath = await downloadVideo(url, startSeconds, clipDuration);

    // 2. Clip (trim the 2s buffer from the downloaded section)
    const clipFilename = `${clipId}.mp4`;
    const clipPath = path.join(config.uploadsDir, 'videos', clipFilename);
    const trimStart = Math.min(2, startSeconds);
    await clipVideo(downloadedPath, clipPath, trimStart, clipDuration);

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
  } finally {
    // 5. Cleanup temp file
    if (downloadedPath && fs.existsSync(downloadedPath)) {
      try { fs.unlinkSync(downloadedPath); } catch {}
    }
  }
}

module.exports = { createClip, parseTime };
