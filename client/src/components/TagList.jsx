import React from 'react';
import { Link } from 'react-router-dom';

const TAG_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
];

export default function TagList({ tags }) {
  return (
    <div className="tag-list">
      {tags.map((tag, i) => (
        <Link
          key={tag.slug}
          to={`/tag/${tag.slug}`}
          className="tag-pill"
          style={{ backgroundColor: TAG_COLORS[i % TAG_COLORS.length] + '20', color: TAG_COLORS[i % TAG_COLORS.length] }}
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
