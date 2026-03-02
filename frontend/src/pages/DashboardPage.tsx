import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { Report, DashboardStats } from '../types';
import { Link } from 'react-router-dom';
import { AdminAnalyticsComponent } from '../components/AdminAnalyticsComponent';
import { InspektoratAnalyticsComponent } from '../components/InspektoratAnalyticsComponent';
import ReportFilterComponent, { ReportFilters } from '../components/ReportFilterComponent';
import OPDStatisticsComponent from '../components/OPDStatisticsComponent';
import { useScrollPosition } from '../hooks/useScrollPosition';

export default function DashboardPage() {
  const { isSuperAdmin, isInspektorat, canReviewReports, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollPositionRef = useRef<number>(0);

  // Use scroll position hook
  const { restoreScrollPosition } = useScrollPosition('dashboard', [currentFilters]);

  useEffect(() => {
    fetchDashboard();
  }, [canReviewReports, currentFilters]);

  // Restore scroll position after initial load
  useEffect(() => {
    if (!loading && isInitialLoad) {
      restoreScrollPosition();
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad, restoreScrollPosition]);

  const fetchDashboard = async () => {
    try {
      // Save current scroll position before fetching new data (except on initial load)
      if (!isInitialLoad) {
        scrollPositionRef.current = window.scrollY;
      }
      
      setLoading(true);
      
      // Build query parameters from filters
      const params = new URLSearchParams();
      if (currentFilters.year) params.append('year', currentFilters.year);
      if (currentFilters.institution) params.append('institution', currentFilters.institution);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.search) params.append('search', currentFilters.search);
      
      const endpoint = isSuperAdmin ? '/dashboard/admin' : '/dashboard/user';
      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;
      
      const response = await apiClient.get(url);
      const data = response.data.data;
      
      if (isSuperAdmin) {
        setStats(data.statistics);
        setReports(data.recentReports || []);
      } else {
        setStats(data.statistics);
        setReports(data.assignedReports || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
      
      // Restore scroll position after data is loaded (except on initial load)
      if (!isInitialLoad) {
        setTimeout(() => {
          window.scrollTo({
            top: scrollPositionRef.current,
            behavior: 'instant'
          });
        }, 50);
      }
    }
  };

  const handleFilterChange = (filters: ReportFilters) => {
    // Save current scroll position before applying filters
    scrollPositionRef.current = window.scrollY;
    setCurrentFilters(filters);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      in_progress: 'Diproses',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      needs_revision: 'Perlu Revisi'
    };
    return labels[status] || status;
  };

  const hasActiveFilters = Object.values(currentFilters).some(value => value !== undefined && value !== '');

  if (loading && isInitialLoad) return <div className="loading">Memuat data...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>
          <span className="dashboard-icon">📊</span>
          <span className="dashboard-title">
            {isSuperAdmin ? 'Dashboard Administrator' : 
             isInspektorat ? 'Dashboard Inspektorat' : 
             'Dashboard OPD'}
          </span>
        </h1>
      </div>

      <div className="welcome-card">
        <h2>Selamat Datang, {user?.name}! 👋</h2>
        <p>
          {isSuperAdmin 
            ? 'Kelola user accounts dan monitor sistem secara keseluruhan.'
            : isInspektorat
            ? 'Review dan evaluasi laporan dari seluruh OPD.'
            : 'Buat laporan dan respond terhadap feedback dari Inspektorat.'}
        </p>
      </div>

      {/* Analytics Section - Different for each role */}
      {isSuperAdmin && <AdminAnalyticsComponent />}
      {isInspektorat && <InspektoratAnalyticsComponent />}

      {/* OPD Statistics Component - Only for OPD users */}
      {!isSuperAdmin && !isInspektorat && <OPDStatisticsComponent />}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card" onClick={() => handleFilterChange({})}>
            <h3>📋 Total</h3>
            <p className="stat-number">{stats.total}</p>
            <p className="stat-label">Semua laporan</p>
          </div>
          <div className="stat-card warning" onClick={() => handleFilterChange({ status: 'pending' })}>
            <h3>⏳ Menunggu</h3>
            <p className="stat-number">{stats.pending}</p>
            <p className="stat-label">Belum direview</p>
          </div>
          <div className="stat-card success" onClick={() => handleFilterChange({ status: 'approved' })}>
            <h3>✅ Disetujui</h3>
            <p className="stat-number">{stats.approved}</p>
            <p className="stat-label">Sudah selesai</p>
          </div>
          <div className="stat-card danger" onClick={() => handleFilterChange({ status: 'rejected' })}>
            <h3>❌ Ditolak</h3>
            <p className="stat-number">{stats.rejected}</p>
            <p className="stat-label">Perlu perbaikan</p>
          </div>
        </div>
      )}

      <div className="reports-section">
        <div className="section-header">
          <h2>📁 Daftar Laporan {currentFilters.status && `(${getStatusLabel(currentFilters.status)})`}</h2>
          <div className="section-actions">
            <button 
              className={`btn-filter ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
            </button>
            {hasActiveFilters && (
              <button className="btn-secondary" onClick={() => handleFilterChange({})}>
                🗑️ Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filter Section */}
        <div className={`filter-collapse ${showFilters ? 'show' : ''}`}>
          <ReportFilterComponent 
            onFilterChange={handleFilterChange}
            currentFilters={currentFilters}
          />
        </div>
        
        {loading && !isInitialLoad && (
          <div className="loading-overlay">
            <div className="loading-spinner">Memuat data...</div>
          </div>
        )}
        
        {reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Tidak ada laporan {currentFilters.status ? `dengan status "${getStatusLabel(currentFilters.status)}"` : ''}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Judul Laporan</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td className="font-medium">{report.title}</td>
                  <td>
                    <span className={`badge badge-${report.status}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </td>
                  <td>{new Date(report.created_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <Link to={`/reports/${report.id}`} className="btn-link">
                      Lihat Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}