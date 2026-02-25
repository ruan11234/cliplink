import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer, { ClipPlayer, FullVideoEmbed } from '../components/VideoPlayer';
import TagList from '../components/TagList';
import ShareButton from '../components/ShareButton';
import { useAuth } from '../context/AuthContext';

export default function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullVideo, setShowFullVideo] = useState(false);

  // Clip creation state
  const [showClipForm, setShowClipForm] = useState(false);
  const [clipForm, setClipForm] = useState({ start_time: '0:00', duration: 59, title: '' });
  const [clipCreating, setClipCreating] = useState(false);
  const [clipError, setClipError] = useState('');

  useEffect(() => {
    setLoading(true);
    setShowFullVideo(false);
    setShowClipForm(false);
    setClipError('');
    axios.get(`/api/videos/${id}`)
      .then((res) => {
        setVideo(res.data);
        setClipForm({ start_time: '0:00', duration: 59, title: res.data.title + ' - Clip' });
        axios.post(`/api/videos/${id}/view`).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleCreateClip = async (e) => {
    e.preventDefault();
    setClipError('');

    if (!clipForm.title.trim()) {
      setClipError('Title is required');
      return;
    }

    setClipCreating(true);
    try {
      const res = await axios.post('/api/videos/clip', {
        video_id: video.id,
        start_time: clipForm.start_time,
        duration: Math.min(parseInt(clipForm.duration) || 59, 59),
        title: clipForm.title,
      });
      navigate(`/video/${res.data.id}`);
    } catch (err) {
      setClipError(err.response?.data?.error || 'Failed to create clip');
    } finally {
      setClipCreating(false);
    }
  };

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;
  if (!video) return <div className="page"><div className="empty">Video not found.</div></div>;

  const isClip = video.source_type === 'clip' && video.source_url;
  const isEmbed = video.source_type === 'embed';
  const canCreateClip = user && user.is_approved && (isEmbed || isClip);

  return (
    <div className="page video-page">
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

      {/* Create Clip Section */}
      {canCreateClip && (
        <div className="full-video-section">
          <button
            className="full-video-toggle"
            onClick={() => setShowClipForm(!showClipForm)}
          >
            {showClipForm ? 'Hide Clip Creator' : 'Create Clip'}
          </button>

          {showClipForm && (
            <form className="upload-form" onSubmit={handleCreateClip} style={{ marginTop: '1rem' }}>
              {clipError && <div className="form-error">{clipError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="text"
                    value={clipForm.start_time}
                    onChange={(e) => setClipForm({ ...clipForm, start_time: e.target.value })}
                    placeholder="1:30 or 90"
                  />
                </div>
                <div className="form-group">
                  <label>Duration (max 59s)</label>
                  <input
                    type="number"
                    value={clipForm.duration}
                    onChange={(e) => setClipForm({ ...clipForm, duration: e.target.value })}
                    min={1}
                    max={59}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Clip Title</label>
                <input
                  type="text"
                  value={clipForm.title}
                  onChange={(e) => setClipForm({ ...clipForm, title: e.target.value })}
                  placeholder="Clip title"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={clipCreating}>
                {clipCreating ? 'Creating clip... This may take a minute.' : 'Create Clip'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
