import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import '../styles/UserProfilePage.css';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  institution: string;
  role: string;
  department: string;
  position: string;
  profile_photo: string | null;
  profile_photo_filename: string | null;
}

export function UserProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/profile');
      setProfile(response.data.data);
      setFormData({
        name: response.data.data.name || '',
        email: response.data.data.email || '',
        department: response.data.data.department || '',
        position: response.data.data.position || '',
      });
      
      // Set photo preview if exists
      if (response.data.data.profile_photo) {
        setPhotoPreview(`/api/profile/photo/${response.data.data.id}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      notify.error('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Filter out empty strings and send as proper values
      const updateData: any = {};
      
      if (formData.name && formData.name.trim()) {
        updateData.name = formData.name.trim();
      }
      if (formData.email && formData.email.trim()) {
        updateData.email = formData.email.trim();
      }
      if (formData.department !== undefined) {
        updateData.department = formData.department.trim() || null;
      }
      if (formData.position !== undefined) {
        updateData.position = formData.position.trim() || null;
      }

      const response = await apiClient.put('/profile', updateData);
      setProfile(response.data.data);
      setEditing(false);
      notify.success('Profil berhasil diperbarui');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      notify.error('Gagal memperbarui profil');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify.error('Password baru dan konfirmasi tidak cocok');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      notify.error('Password baru minimal 6 karakter');
      return;
    }

    try {
      await apiClient.post('/profile/change-password', passwordData);
      setChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      notify.success('Password berhasil diubah');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      notify.error(error.response?.data?.error || 'Gagal mengubah password');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify.error('File harus berupa gambar');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.error('Ukuran file maksimal 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload photo
    uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await apiClient.post('/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      notify.success('Foto profil berhasil diupload');
      fetchProfile(); // Refresh profile
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      notify.error('Gagal mengupload foto profil');
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Yakin ingin menghapus foto profil?')) {
      return;
    }

    try {
      await apiClient.delete('/profile/photo');
      setPhotoPreview(null);
      notify.success('Foto profil berhasil dihapus');
      fetchProfile();
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
      notify.error('Gagal menghapus foto profil');
    }
  };

  if (loading) {
    return <div className="loading">Memuat profil...</div>;
  }

  if (!profile) {
    return <div className="error">Profil tidak ditemukan</div>;
  }

  return (
    <div className="user-profile-page">
      <h1>👤 Profil Saya</h1>

      <div className="profile-container">
        {/* Profile Photo Section */}
        <div className="profile-photo-section">
          <div className="photo-container">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="profile-photo" />
            ) : (
              <div className="profile-photo-placeholder">
                <span className="placeholder-icon">👤</span>
              </div>
            )}
            {uploadingPhoto && (
              <div className="photo-uploading-overlay">
                <span>⏳ Uploading...</span>
              </div>
            )}
          </div>
          
          <div className="photo-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              📷 {photoPreview ? 'Ganti Foto' : 'Upload Foto'}
            </button>
            {photoPreview && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeletePhoto}
                disabled={uploadingPhoto}
              >
                🗑️ Hapus Foto
              </button>
            )}
          </div>
          <p className="photo-hint">Format: JPG, PNG. Maksimal 5MB</p>
        </div>

        {/* Profile Information Section */}
        <div className="profile-info-section">
          <div className="section-header">
            <h2>📋 Informasi Profil</h2>
            {!editing && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profil
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Departemen</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Jabatan</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  💾 Simpan Perubahan
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: profile.name || '',
                      email: profile.email || '',
                      department: profile.department || '',
                      position: profile.position || '',
                    });
                  }}
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="detail-item">
                <span className="detail-label">Username:</span>
                <span className="detail-value">{profile.username}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Nama Lengkap:</span>
                <span className="detail-value">{profile.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{profile.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Institusi:</span>
                <span className="detail-value">{profile.institution}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Role:</span>
                <span className="detail-value badge-role">{profile.role}</span>
              </div>
              {profile.department && (
                <div className="detail-item">
                  <span className="detail-label">Departemen:</span>
                  <span className="detail-value">{profile.department}</span>
                </div>
              )}
              {profile.position && (
                <div className="detail-item">
                  <span className="detail-label">Jabatan:</span>
                  <span className="detail-value">{profile.position}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div className="password-section">
          <div className="section-header">
            <h2>🔒 Ubah Password</h2>
            {!changingPassword && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setChangingPassword(true)}
              >
                🔑 Ubah Password
              </button>
            )}
          </div>

          {changingPassword && (
            <form onSubmit={handleChangePassword} className="password-form">
              <div className="form-group">
                <label>Password Saat Ini</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label>Password Baru</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <small>Minimal 6 karakter</small>
              </div>

              <div className="form-group">
                <label>Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  🔒 Ubah Password
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
