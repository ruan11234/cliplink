import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import TagList from '../components/TagList';
import ShareButton from '../components/ShareButton';

export default function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/videos/${id}`)
      .then((res) => {
        setVideo(res.data);
        // Increment view count
        axios.post(`/api/videos/${id}/view`).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;
  if (!video) return <div className="page"><div className="empty">Video not found.</div></div>;

  return (
    <div className="page video-page">
      <VideoPlayer video={video} />

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
          <ShareButton videoId={video.id} />
        </div>

        {video.description && (
          <p className="video-description">{video.description}</p>
        )}

        {video.tags && video.tags.length > 0 && (
          <TagList tags={video.tags} />
        )}
      </div>
    </div>
  );
}
