import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = () => {
    setLoading(true);
    axios.get('/api/auth/admin/users')
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleApprove = async (id) => {
    await axios.patch(`/api/auth/admin/users/${id}/approve`);
    fetchUsers();
  };

  const handleRevoke = async (id) => {
    await axios.patch(`/api/auth/admin/users/${id}/revoke`);
    fetchUsers();
  };

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`status-badge ${u.is_approved ? 'approved' : 'pending'}`}>
                    {u.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td>{u.is_admin ? 'Admin' : 'User'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  {!u.is_admin && (
                    u.is_approved ? (
                      <button className="btn-small btn-danger" onClick={() => handleRevoke(u.id)}>
                        Revoke
                      </button>
                    ) : (
                      <button className="btn-small btn-success" onClick={() => handleApprove(u.id)}>
                        Approve
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
