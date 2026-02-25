import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeedCard from '../components/FeedCard';

export default function Feed() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/videos')
      .then((res) => setVideos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="feed-page"><div className="loading">Loading...</div></div>;

  return (
    <div className="feed-page">
      <h1>Feed</h1>
      {videos.length === 0 ? (
        <div className="empty">No videos yet.</div>
      ) : (
        videos.map((v) => <FeedCard key={v.id} video={v} />)
      )}
    </div>
  );
}
