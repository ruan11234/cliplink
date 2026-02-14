import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function CreateClip() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    url: '',
    start_time: '0:00',
    duration: 59,
    title: '',
    description: '',
    category_id: '',
    tags: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    axios.get('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  if (authLoading) return <div className="page"><div className="loading">Loading...</div></div>;

  if (user && !user.is_approved) {
    return (
      <div className="page">
        <div className="auth-container">
          <h1>Account Pending Approval</h1>
          <p className="text-muted">Your account needs to be approved by an admin before you can create clips.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.url.trim()) {
      setError('Video URL is required');
      return;
    }
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    setCreating(true);

    try {
      const res = await axios.post('/api/videos/clip', {
        url: form.url,
        start_time: form.start_time,
        duration: Math.min(parseInt(form.duration) || 59, 59),
        title: form.title,
        description: form.description,
        category_id: form.category_id || null,
        tags: form.tags,
      });
      navigate(`/video/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create clip');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Create Clip</h1>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>Video URL *</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://www.pornhub.com/view_video.php?viewkey=..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Time *</label>
            <input
              type="text"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              placeholder="1:30 or 90"
            />
          </div>
          <div className="form-group">
            <label>Duration (max 59s)</label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              min={1}
              max={59}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Clip title"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tags (comma separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="blonde, pov, amateur"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? 'Creating clip... This may take a minute.' : 'Create Clip'}
        </button>
      </form>
    </div>
  );
}
