import React from 'react';
import { Link } from 'react-router-dom';
import TagList from './TagList';

export default function VideoCard({ video }) {
  const thumbnailUrl = video.thumbnail_path
    ? `/api/videos/${video.id}/thumbnail`
    : null;

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr + 'Z').getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="video-card">
      <Link to={`/video/${video.id}`} className="video-card-thumb">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={video.title} loading="lazy" />
        ) : (
          <div className="video-card-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        {video.duration > 0 && (
          <span className="video-card-duration">
            {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
          </span>
        )}
      </Link>

      <div className="video-card-info">
        <Link to={`/video/${video.id}`} className="video-card-title">
          {video.title}
        </Link>

        {video.description && (
          <p className="video-card-desc">{video.description}</p>
        )}

        <div className="video-card-meta">
          {video.category_name && (
            <Link to={`/category/${video.category_slug}`} className="video-card-category">
              {video.category_name}
            </Link>
          )}
          <span className="video-card-stats">
            {video.views || 0} views &middot; {timeAgo(video.created_at)}
          </span>
        </div>

        {video.tags && video.tags.length > 0 && (
          <TagList tags={video.tags} />
        )}
      </div>
    </div>
  );
}
