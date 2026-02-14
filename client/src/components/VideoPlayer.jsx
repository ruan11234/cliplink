import React, { useRef, useEffect } from 'react';

function isDirectVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

// Convert page URLs to their embeddable iframe URLs
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // Pornhub: /view_video.php?viewkey=ABC → /embed/ABC
    if (host === 'pornhub.com') {
      const viewkey = u.searchParams.get('viewkey');
      if (viewkey) return `https://www.pornhub.com/embed/${viewkey}`;
    }

    // xVideos: /video12345/title → /embedframe/12345
    if (host === 'xvideos.com') {
      const match = u.pathname.match(/\/video(\d+)/);
      if (match) return `https://www.xvideos.com/embedframe/${match[1]}`;
    }

    // RedTube: /12345 → embed.redtube.com/?id=12345
    if (host === 'redtube.com') {
      const match = u.pathname.match(/\/(\d+)/);
      if (match) return `https://embed.redtube.com/?id=${match[1]}`;
    }

    // xHamster: /videos/title-123456 → /embed/123456
    if (host === 'xhamster.com') {
      const match = u.pathname.match(/-(\d+)$/);
      if (match) return `https://www.xhamster.com/embed/${match[1]}`;
    }

    // YouTube: /watch?v=ABC → /embed/ABC
    if (host === 'youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }

    // Vimeo: /123456 → player.vimeo.com/video/123456
    if (host === 'vimeo.com') {
      const match = u.pathname.match(/\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }

    // SpankBang: /video-id/embed
    if (host === 'spankbang.com') {
      const match = u.pathname.match(/\/([a-z0-9]+)\/video/);
      if (match) return `https://spankbang.com/${match[1]}/embed/`;
    }

    // EPorner: /video-hash/title → /embed/hash
    if (host === 'eporner.com') {
      const match = u.pathname.match(/\/(?:video-|hd-porn\/)([a-zA-Z0-9]+)/);
      if (match) return `https://www.eporner.com/embed/${match[1]}`;
    }

  } catch {
    // Invalid URL, return as-is
  }
  return url;
}

export default function VideoPlayer({ video }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video.id]);

  // Embed type with a webpage URL → convert to embed URL and use iframe
  if (video.source_type === 'embed' && video.embed_url && !isDirectVideoUrl(video.embed_url)) {
    const embedSrc = toEmbedUrl(video.embed_url);
    return (
      <div className="video-player">
        <iframe
          src={embedSrc}
          width="100%"
          style={{ aspectRatio: '16/9', border: 'none' }}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen"
        />
      </div>
    );
  }

  // Direct video file (uploaded or direct URL embed)
  const src = video.source_type === 'embed' && video.embed_url
    ? video.embed_url
    : `/api/videos/${video.id}/file`;

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        preload="auto"
        poster={video.thumbnail_path ? `/api/videos/${video.id}/thumbnail` : undefined}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
