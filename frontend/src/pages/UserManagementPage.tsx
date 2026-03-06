import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { User } from '../types';
import { notify } from '../utils/notifications';

interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  institution: string;
}

interface EditUserForm {
  username: string;
  email: string;
  name: string;
  institution: string;
}

export function UserManagementPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'user',
    institution: ''
  });

  const [editForm, setEditForm] = useState<EditUserForm>({
    username: '',
    email: '',
    name: '',
    institution: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      setError('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
      setLoading(false);
      return;
    }
    fetchUsers();
    fetchInstitutions();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/auth/users');
      setUsers(response.data.data || []);
    } catch (error: any) {
      setError('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await apiClient.get('/auth/institutions');
      setInstitutions(response.data.data || []);
    } catch (error: any) {
      console.error('Gagal memuat daftar institusi:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (createForm.role === 'user' && !createForm.institution.trim()) {
      setError('Institusi wajib diisi untuk user OPD');
      return;
    }

    try {
      await apiClient.post('/auth/users', createForm);
      setSuccess('User berhasil dibuat');
      setCreateForm({
        username: '',
        email: '',
        password: '',
        name: '',
        role: 'user',
        institution: ''
      });
      setShowCreateForm(false);
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal membuat user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccess('');

    try {
      await apiClient.put(`/auth/users/${editingUser.id}`, editForm);
      setSuccess('User berhasil diperbarui');
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal memperbarui user');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    notify.confirm(
      'Konfirmasi Hapus User',
      `Apakah Anda yakin ingin menghapus user "${userName}"? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await apiClient.delete(`/auth/users/${userId}`);
          notify.success(`User "${userName}" telah dihapus dari sistem`);
          fetchUsers();
        } catch (error: any) {
          notify.error(error.response?.data?.error || 'Gagal menghapus user');
        }
      }
    );
  };

  const startEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditForm({
      username: userToEdit.username,
      email: userToEdit.email,
      name: userToEdit.name,
      institution: userToEdit.institution || ''
    });
  };

  if (!isAdmin) {
    return (
      <div className="user-management">
        <div className="error-message">
          Akses ditolak. Hanya admin yang dapat mengakses halaman ini.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>Kelola User</h1>
        <button 
          type="button" 
          className="btn-primary btn-auto"
          onClick={() => setShowCreateForm(true)}
        >
          + Tambah User Baru
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <div className="form-modal-header">
              <h2>Tambah User Baru</h2>
              <button 
                type="button" 
                className="btn-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    required
                    placeholder="Masukkan username"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                    placeholder="Masukkan email"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    placeholder="Masukkan password"
                  />
                </div>
                <div className="form-group">
                  <label>Nama Lengkap *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'user' })}
                    required
                  >
                    <option value="user">User OPD</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Institusi {createForm.role === 'user' && '*'}</label>
                  <input
                    type="text"
                    list="institutions-list"
                    value={createForm.institution}
                    onChange={(e) => setCreateForm({ ...createForm, institution: e.target.value })}
                    required={createForm.role === 'user'}
                    placeholder="Pilih atau ketik nama institusi/OPD"
                  />
                  <datalist id="institutions-list">
                    {institutions.map((inst) => (
                      <option key={inst} value={inst} />
                    ))}
                  </datalist>
                  {institutions.length > 0 && (
                    <small style={{ color: '#7f8c8d', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                      💡 Pilih dari daftar OPD yang sudah ada untuk menghindari kesalahan ketik
                    </small>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Buat User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Form */}
      {editingUser && (
        <div className="form-modal">
          <div className="form-modal-content">
            <div className="form-modal-header">
              <h2>Edit User</h2>
              <button 
                type="button" 
                className="btn-close"
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nama Lengkap *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Institusi</label>
                  <input
                    type="text"
                    list="institutions-list-edit"
                    value={editForm.institution}
                    onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                    placeholder="Pilih atau ketik nama institusi/OPD"
                  />
                  <datalist id="institutions-list-edit">
                    {institutions.map((inst) => (
                      <option key={inst} value={inst} />
                    ))}
                  </datalist>
                  {institutions.length > 0 && (
                    <small style={{ color: '#7f8c8d', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                      💡 Pilih dari daftar OPD yang sudah ada untuk menghindari kesalahan ketik
                    </small>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Institusi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userItem) => (
              <tr key={userItem.id}>
                <td className="font-medium">{userItem.username}</td>
                <td>{userItem.name}</td>
                <td>{userItem.email}</td>
                <td>
                  <span className={`badge badge-${userItem.role === 'super_admin' ? 'approved' : 'pending'}`}>
                    {userItem.role === 'super_admin' ? 'Admin' : 'User OPD'}
                  </span>
                </td>
                <td>{userItem.institution || '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      type="button" 
                      className="btn-secondary btn-sm"
                      onClick={() => startEdit(userItem)}
                    >
                      Edit
                    </button>
                    {userItem.role !== 'super_admin' && (
                      <button 
                        type="button" 
                        className="btn-danger btn-sm"
                        onClick={() => handleDeleteUser(userItem.id, userItem.name)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>Belum ada user</h3>
            <p>Tambahkan user pertama untuk memulai</p>
          </div>
        )}
      </div>
    </div>
  );
}