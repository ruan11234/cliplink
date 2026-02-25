import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TagList from './TagList';
import ShareButton from './ShareButton';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr + 'Z')) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function FeedCard({ video }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);

  const isClip = video.source_type === 'clip' && video.file_path;
  const isUpload = video.source_type === 'upload' && video.file_path;
  const hasInlineVideo = isClip || isUpload;

  useEffect(() => {
    if (!hasInlineVideo || !videoRef.current || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [hasInlineVideo]);

  const thumbnailUrl = video.thumbnail_path
    ? `/api/videos/${video.id}/thumbnail`
    : null;

  return (
    <div className="feed-card" ref={cardRef}>
      <div className="feed-card-player">
        {hasInlineVideo ? (
          <video
            ref={videoRef}
            src={`/api/videos/${video.id}/file`}
            muted
            loop
            playsInline
            preload="metadata"
            poster={thumbnailUrl || undefined}
          />
        ) : thumbnailUrl ? (
          <Link to={`/video/${video.id}`}>
            <img src={thumbnailUrl} alt={video.title} />
          </Link>
        ) : (
          <Link to={`/video/${video.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-muted)' }}>
            No preview
          </Link>
        )}
      </div>

      <div className="feed-card-info">
        <Link to={`/video/${video.id}`} className="feed-card-title">
          {video.title}
        </Link>

        {video.description && (
          <p className="feed-card-desc">{video.description}</p>
        )}

        <div className="feed-card-meta">
          {video.category_name && (
            <Link to={`/category/${video.category_slug}`} className="video-card-category">
              {video.category_name}
            </Link>
          )}
          <span>{video.views || 0} views</span>
          <span>{timeAgo(video.created_at)}</span>
        </div>

        {video.tags && video.tags.length > 0 && (
          <TagList tags={video.tags} />
        )}

        <div className="feed-card-actions">
          {isClip && video.source_url && (
            <Link to={`/video/${video.id}`} className="feed-card-full-video-btn">
              Watch Full Video
            </Link>
          )}
          <ShareButton videoId={video.id} />
        </div>
      </div>
    </div>
  );
}
