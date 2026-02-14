import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer, { ClipPlayer, FullVideoEmbed } from '../components/VideoPlayer';
import TagList from '../components/TagList';
import ShareButton from '../components/ShareButton';

export default function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullVideo, setShowFullVideo] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShowFullVideo(false);
    axios.get(`/api/videos/${id}`)
      .then((res) => {
        setVideo(res.data);
        axios.post(`/api/videos/${id}/view`).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;
  if (!video) return <div className="page"><div className="empty">Video not found.</div></div>;

  const isClip = video.source_type === 'clip' && video.source_url;

  return (
    <div className="page video-page">
      {/* Clip: show hosted MP4 player. Other types: use default VideoPlayer */}
      {isClip ? (
        <ClipPlayer video={video} />
      ) : (
        <VideoPlayer video={video} />
      )}

      <div className="video-details">
        <h1>{video.title}</h1>

        <div className="video-meta-bar">
          <span>{video.views || 0} views</span>
          <span>{new Date(video.created_at + 'Z').toLocaleDateString()}</span>
          {video.category_name && (
            <a href={`/category/${video.category_slug}`} className="video-card-category">
              {video.category_name}
            </a>
          )}
          {video.posted_by && (
            <span className="posted-by">Posted by: {video.posted_by}</span>
          )}
          <ShareButton videoId={video.id} />
        </div>

        {video.description && (
          <p className="video-description">{video.description}</p>
        )}

        {video.tags && video.tags.length > 0 && (
          <TagList tags={video.tags} />
        )}
      </div>

      {/* Full Video Section for clips */}
      {isClip && (
        <div className="full-video-section">
          <button
            className="full-video-toggle"
            onClick={() => setShowFullVideo(!showFullVideo)}
          >
            {showFullVideo ? 'Hide Full Video' : 'Watch Full Video'}
          </button>

          {showFullVideo && (
            <div className="full-video-wrapper">
              <FullVideoEmbed sourceUrl={video.source_url} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
