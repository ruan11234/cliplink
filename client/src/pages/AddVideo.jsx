import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AddVideo() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    url: '',
    title: '',
    description: '',
    category_id: '',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
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
          <p className="text-muted">Your account needs to be approved by an admin before you can add videos.</p>
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

    setSubmitting(true);

    try {
      const res = await axios.post('/api/videos/add', {
        url: form.url,
        title: form.title,
        description: form.description,
        category_id: form.category_id || null,
        tags: form.tags,
      });
      navigate(`/video/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add video');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Add Video</h1>
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

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Video title"
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

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Adding video...' : 'Add Video'}
        </button>
      </form>
    </div>
  );
}
