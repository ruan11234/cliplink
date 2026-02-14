import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Upload() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    tags: '',
    source_type: 'upload',
    embed_url: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    if (form.source_type === 'upload' && !file) {
      setError('Please select a video file');
      return;
    }

    if (form.source_type === 'embed' && !form.embed_url.trim()) {
      setError('Please enter an embed URL');
      return;
    }

    setUploading(true);

    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('category_id', form.category_id);
    data.append('tags', form.tags);
    data.append('source_type', form.source_type);

    if (form.source_type === 'upload' && file) {
      data.append('video', file);
    } else if (form.source_type === 'embed') {
      data.append('embed_url', form.embed_url);
    }

    try {
      const res = await axios.post('/api/videos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/video/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Upload Video</h1>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Video title"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Video description"
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
            placeholder="funny, cat, epic"
          />
        </div>

        <div className="form-group">
          <label>Source Type</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="upload"
                checked={form.source_type === 'upload'}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
              />
              File Upload
            </label>
            <label>
              <input
                type="radio"
                value="embed"
                checked={form.source_type === 'embed'}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
              />
              Embed URL
            </label>
          </div>
        </div>

        {form.source_type === 'upload' ? (
          <div className="form-group">
            <label>Video File *</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="form-group">
            <label>Embed URL *</label>
            <input
              type="url"
              value={form.embed_url}
              onChange={(e) => setForm({ ...form, embed_url: e.target.value })}
              placeholder="https://example.com/video.mp4"
            />
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
