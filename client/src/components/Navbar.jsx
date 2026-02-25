import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    axios.get('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">ClipLink</Link>

        <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span><span></span><span></span>
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/feed" className={location.pathname === '/feed' ? 'active' : ''}>Feed</Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={location.pathname === `/category/${cat.slug}` ? 'active' : ''}
            >
              {cat.name}
            </Link>
          ))}

          <div className="navbar-auth">
            {!user ? (
              <Link to="/login" className={`auth-link ${location.pathname === '/login' ? 'active' : ''}`}>
                Login
              </Link>
            ) : (
              <>
                {user.is_approved ? (
                  <Link to="/add" className={`upload-link ${location.pathname === '/add' ? 'active' : ''}`}>
                    Add Video
                  </Link>
                ) : (
                  <span className="pending-badge">Pending Approval</span>
                )}
                {user.is_admin && (
                  <Link to="/admin" className={`admin-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                    Admin
                  </Link>
                )}
                <button className="logout-btn" onClick={logout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
