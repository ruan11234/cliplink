import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';

export default function TagPage() {
  const { slug } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/videos', { params: { tag: slug } })
      .then((res) => setVideos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tag: {slug}</h1>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : videos.length === 0 ? (
        <div className="empty">No videos with this tag.</div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}
