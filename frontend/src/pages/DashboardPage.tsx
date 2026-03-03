import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import { AdminAnalyticsComponent } from '../components/AdminAnalyticsComponent';
import { MatrixAnalyticsComponent } from '../components/MatrixAnalyticsComponent';
import OPDStatisticsComponent from '../components/OPDStatisticsComponent';
import { useScrollPosition } from '../hooks/useScrollPosition';

interface MatrixReport {
  id: string;
  title: string;
  description?: string;
  target_opd: string;
  status: string;
  total_items: number;
  completed_items: number;
  created_at: string;
}

interface MatrixAssignment {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress_percentage: number;
  assigned_at: string;
  matrix_report_id: string;
}

interface MatrixStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

export default function DashboardPage() {
  const { isSuperAdmin, isInspektorat, user } = useAuth();
  const [stats, setStats] = useState<MatrixStats | null>(null);
  const [matrixData, setMatrixData] = useState<MatrixReport[] | MatrixAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const scrollPositionRef = useRef<number>(0);

  // Use scroll position hook
  const { restoreScrollPosition } = useScrollPosition('dashboard', [searchTerm, statusFilter]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!loading) {
      restoreScrollPosition();
    }
  }, [loading, restoreScrollPosition]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      
      if (isInspektorat || isSuperAdmin) {
        // Fetch matrix reports for Inspektorat
        const response = await apiClient.get('/matrix/reports');
        if (response.data.success) {
          setMatrixData(response.data.data);
          
          // Calculate stats
          const reports = response.data.data as MatrixReport[];
          setStats({
            total: reports.length,
            pending: reports.filter(r => r.status === 'active' && r.completed_items === 0).length,
            in_progress: reports.filter(r => r.status === 'active' && r.completed_items > 0 && r.completed_items < r.total_items).length,
            completed: reports.filter(r => r.completed_items === r.total_items).length
          });
        }
      } else {
        // Fetch matrix assignments for OPD
        const response = await apiClient.get('/matrix/assignments');
        if (response.data.success) {
          setMatrixData(response.data.data);
          
          // Calculate stats
          const assignments = response.data.data as MatrixAssignment[];
          setStats({
            total: assignments.length,
            pending: assignments.filter(a => a.status === 'pending').length,
            in_progress: assignments.filter(a => a.status === 'in_progress').length,
            completed: assignments.filter(a => a.status === 'completed').length
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Belum Dikerjakan',
      in_progress: 'Sedang Dikerjakan',
      completed: 'Selesai',
      active: 'Aktif'
    };
    return labels[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'badge-warning',
      in_progress: 'badge-info',
      completed: 'badge-success',
      active: 'badge-primary'
    };
    return classes[status] || 'badge-default';
  };

  const filteredData = matrixData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="loading">Memuat data...</div>;

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
            ? 'Kelola user accounts dan monitor sistem matrix audit secara keseluruhan.'
            : isInspektorat
            ? 'Upload dan monitor matrix audit untuk seluruh OPD.'
            : 'Kerjakan matrix audit yang ditugaskan dan upload evidence tindak lanjut.'}
        </p>
      </div>

      {/* Analytics Section - Different for each role */}
      {isSuperAdmin && <AdminAnalyticsComponent />}
      {isInspektorat && <MatrixAnalyticsComponent />}

      {/* OPD Statistics Component - Only for OPD users */}
      {!isSuperAdmin && !isInspektorat && <OPDStatisticsComponent />}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card" onClick={() => setStatusFilter('')}>
            <h3>📋 Total Matrix</h3>
            <p className="stat-number">{stats.total}</p>
            <p className="stat-label">Semua matrix</p>
          </div>
          <div className="stat-card warning" onClick={() => setStatusFilter('pending')}>
            <h3>⏳ Belum Dikerjakan</h3>
            <p className="stat-number">{stats.pending}</p>
            <p className="stat-label">Belum dimulai</p>
          </div>
          <div className="stat-card info" onClick={() => setStatusFilter('in_progress')}>
            <h3>🔄 Sedang Dikerjakan</h3>
            <p className="stat-number">{stats.in_progress}</p>
            <p className="stat-label">Dalam progress</p>
          </div>
          <div className="stat-card success" onClick={() => setStatusFilter('completed')}>
            <h3>✅ Selesai</h3>
            <p className="stat-number">{stats.completed}</p>
            <p className="stat-label">Sudah selesai</p>
          </div>
        </div>
      )}

      <div className="reports-section">
        <div className="section-header">
          <h2>📊 {isInspektorat || isSuperAdmin ? 'Daftar Matrix Audit' : 'Matrix yang Ditugaskan'}</h2>
          <div className="section-actions">
            <input
              type="text"
              placeholder="🔍 Cari matrix..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {statusFilter && (
              <button className="btn-secondary" onClick={() => setStatusFilter('')}>
                🗑️ Reset Filter
              </button>
            )}
          </div>
        </div>
        
        {filteredData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Tidak ada matrix {statusFilter ? `dengan status "${getStatusLabel(statusFilter)}"` : ''}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Judul Matrix</th>
                {(isInspektorat || isSuperAdmin) && <th>Target OPD</th>}
                <th>Progress</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => {
                const isReport = 'target_opd' in item;
                const report = item as MatrixReport;
                const assignment = item as MatrixAssignment;
                
                return (
                  <tr key={item.id}>
                    <td className="font-medium">{item.title}</td>
                    {(isInspektorat || isSuperAdmin) && (
                      <td>{isReport ? report.target_opd : '-'}</td>
                    )}
                    <td>
                      {isReport ? (
                        <div className="progress-cell">
                          <span>{report.completed_items}/{report.total_items}</span>
                          <div className="mini-progress-bar">
                            <div 
                              className="mini-progress-fill" 
                              style={{ width: `${(report.completed_items / report.total_items) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="progress-cell">
                          <span>{assignment.progress_percentage}%</span>
                          <div className="mini-progress-bar">
                            <div 
                              className="mini-progress-fill" 
                              style={{ width: `${assignment.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>{new Date(isReport ? report.created_at : assignment.assigned_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      {isReport ? (
                        <Link to={`/matrix/progress/${report.id}`} className="btn-link">
                          Lihat Progress
                        </Link>
                      ) : (
                        <Link to={`/matrix/work/${assignment.id}`} className="btn-link">
                          Kerjakan
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}