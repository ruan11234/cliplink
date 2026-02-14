import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';

export default function Category() {
  const { slug } = useParams();
  const [videos, setVideos] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`/api/categories/${slug}`),
      axios.get('/api/videos', { params: { category: slug } }),
    ])
      .then(([catRes, vidRes]) => {
        setCategory(catRes.data);
        setVideos(vidRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{category ? category.name : 'Category'}</h1>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : videos.length === 0 ? (
        <div className="empty">No videos in this category yet.</div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}
