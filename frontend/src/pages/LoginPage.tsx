import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LogoComponent } from '../components/branding';
import '../styles/branding.css';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const notification = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(identifier, password);
    setLoading(false);

    if (result.success) {
      notification.showSuccess('Login Berhasil', 'Selamat datang di SILAPOR!');
      navigate('/dashboard');
    } else {
      notification.showError('Login Gagal', result.error || 'Username atau password salah');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-branding">
            <LogoComponent 
              variant="full" 
              size="large" 
              className="login-logo"
            />
            <div className="login-title">
              <h1>SILAPOR</h1>
              <h2>Sistem Informasi Laporan Pengawasan dan Evaluasi</h2>
              <h3>Pemerintah Kota Tanjungpinang</h3>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifier">Username atau Email</label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="Masukkan username atau email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan password"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>© 2026 Pemerintah Kota Tanjungpinang</p>
        </div>
      </div>
    </div>
  );
}
