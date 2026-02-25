import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Category from './pages/Category';
import TagPage from './pages/TagPage';
import VideoPage from './pages/VideoPage';
import CreateClip from './pages/CreateClip';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Feed from './pages/Feed';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/video/:id" element={<VideoPage />} />
          <Route path="/create" element={<CreateClip />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
