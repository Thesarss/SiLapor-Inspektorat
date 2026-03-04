import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoComponent } from './branding';
import { useNotifications } from '../hooks/useNotifications';
import { useEffect } from 'react';
import '../styles/branding.css';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isSuperAdmin, isInspektorat } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminPendingCount, userPendingCount, refreshNotifications } = useNotifications();

  // Refresh notifications when navigating to relevant pages
  useEffect(() => {
    if (location.pathname === '/approvals' || location.pathname === '/my-reports') {
      refreshNotifications();
    }
  }, [location.pathname, refreshNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  // Determine if user should see admin-style navigation
  const showAdminNav = isSuperAdmin || isInspektorat;

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/dashboard" className="brand-link">
            <LogoComponent 
              variant="icon" 
              size="medium" 
              className="navbar-logo"
            />
            <div className="brand-text">
              <span className="app-name">SILAPOR</span>
              <span className="org-name">Pemerintah Kota Tanjungpinang</span>
            </div>
          </Link>
        </div>
        <div className="navbar-user">
          {isInspektorat && (
            <div className="notification-indicator">
              <Link 
                to="/approvals" 
                className={`notification-link ${adminPendingCount > 0 ? 'has-notifications' : ''}`}
                title={`${adminPendingCount} laporan menunggu review`}
              >
                <span className="notification-icon">🔔</span>
                {adminPendingCount > 0 && (
                  <span className="notification-count">{adminPendingCount}</span>
                )}
                <span className="notification-text">
                  {adminPendingCount > 0 ? `${adminPendingCount} Review` : 'No Reviews'}
                </span>
              </Link>
            </div>
          )}
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">
              {isSuperAdmin ? 'Administrator' : 
               isInspektorat ? 'Inspektorat' : 
               'OPD'}
            </span>
          </div>
          <Link to="/profile" className="btn-profile" title="Profil Saya">
            👤
          </Link>
          <button onClick={handleLogout} className="btn-logout">
            Keluar
          </button>
        </div>
      </nav>
      <div className="main-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Menu Navigasi</h3>
          </div>
          <ul className="nav-menu">
            <li>
              <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                <span className="nav-icon">📈</span>
                Dashboard
              </Link>
            </li>
            {isSuperAdmin ? (
              // Super Admin: Kelola user, performance dashboard
              <>
                <li>
                  <Link to="/users" className={isActive('/users') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">👥</span>
                      <span>Kelola User</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/performance" className={isActive('/performance') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">📊</span>
                      <span>Performance</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/evidence" className={isActive('/evidence') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">🗄️</span>
                      <span>Database Evidence</span>
                    </div>
                  </Link>
                </li>
              </>
            ) : isInspektorat ? (
              // Inspektorat: Review matrix, matrix audit, evidence database
              <>
                <li>
                  <Link to="/approvals" className={isActive('/approvals') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">✅</span>
                      <span>Review Matrix</span>
                    </div>
                    {adminPendingCount > 0 && (
                      <span className="nav-badge-inline">{adminPendingCount}</span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link to="/review-history" className={isActive('/review-history') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">📜</span>
                      <span>Riwayat Review</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/matrix" className={isActive('/matrix') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">📋</span>
                      <span>Matrix Audit</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link to="/evidence" className={isActive('/evidence') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">🗄️</span>
                      <span>Database Evidence</span>
                    </div>
                  </Link>
                </li>
              </>
            ) : (
              // OPD: Matrix tugas saja (evidence upload terintegrasi di matrix work)
              <>
                <li>
                  <Link to="/matrix" className={isActive('/matrix') ? 'active' : ''}>
                    <div className="nav-link-content">
                      <span className="nav-icon">📊</span>
                      <span>Matrix Tugas</span>
                    </div>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
