import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import { PerformanceTableComponent } from '../components/PerformanceTableComponent';
import '../styles/PerformanceDashboardComponent.css';

interface OPDPerformance {
  opd_name: string;
  institution: string;
  total_assignments: number;
  total_items: number;
  completed_items: number;
  submitted_items: number;
  pending_items: number;
  completion_rate: number;
  avg_response_time: number;
}

interface InspektoratPerformance {
  inspektorat_name: string;
  total_matrix_uploaded: number;
  total_items_uploaded: number;
  total_reviews_done: number;
  avg_review_time: number;
  approval_rate: number;
}

interface SystemStats {
  totalReports: number;
  totalMatrixReports: number;
  totalOPDs: number;
  totalInspektorat: number;
  totalUsers: number;
  activeAssignments: number;
  completedAssignments: number;
  overallCompletionRate: number;
}

export function PerformancePage() {
  const { isSuperAdmin, isInspektorat } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [opdPerformance, setOpdPerformance] = useState<OPDPerformance[]>([]);
  const [inspektoratPerformance, setInspektoratPerformance] = useState<InspektoratPerformance[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [activeTab, setActiveTab] = useState<'opd' | 'inspektorat' | 'system'>('opd');

  useEffect(() => {
    if (!isSuperAdmin && !isInspektorat) {
      notify.error('Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses halaman ini');
      navigate('/dashboard');
      return;
    }
    
    loadPerformanceData();
  }, [isSuperAdmin, isInspektorat, navigate]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);

      // Load OPD Performance
      if (isSuperAdmin || isInspektorat) {
        const opdResponse = await apiClient.get('/matrix/opd-performance');
        setOpdPerformance(opdResponse.data.data || []);
      }

      // Load Inspektorat Performance (Super Admin only)
      if (isSuperAdmin) {
        const inspektoratResponse = await apiClient.get('/matrix/inspektorat-performance');
        setInspektoratPerformance(inspektoratResponse.data.data || []);
      }

      // Load System Stats
      const statsResponse = await apiClient.get('/performance/system-stats');
      setSystemStats(statsResponse.data.data);

    } catch (error: any) {
      console.error('Failed to load performance data:', error);
      notify.error('Gagal Memuat Data', error.response?.data?.error || 'Terjadi kesalahan saat memuat data performa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="performance-page">
        <div className="loading">⏳ Memuat data performa...</div>
      </div>
    );
  }

  return (
    <div className="performance-page">
      <div className="page-header">
        <h1>📊 Dashboard Performa Sistem</h1>
        <p className="page-description">
          Monitoring kinerja OPD, Inspektorat, dan sistem secara keseluruhan
        </p>
      </div>

      {/* System Overview Stats */}
      {systemStats && (
        <div className="system-overview">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{systemStats.totalReports}</div>
              <div className="stat-label">Total Laporan</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{systemStats.totalMatrixReports}</div>
              <div className="stat-label">Matrix Audit</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <div className="stat-value">{systemStats.totalOPDs}</div>
              <div className="stat-label">Total OPD</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{systemStats.totalUsers}</div>
              <div className="stat-label">Total Pengguna</div>
            </div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{systemStats.overallCompletionRate}%</div>
              <div className="stat-label">Tingkat Penyelesaian</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="performance-tabs">
        <button 
          className={`tab-button ${activeTab === 'opd' ? 'active' : ''}`}
          onClick={() => setActiveTab('opd')}
        >
          🏢 Performa OPD ({opdPerformance.length})
        </button>
        {isSuperAdmin && (
          <button 
            className={`tab-button ${activeTab === 'inspektorat' ? 'active' : ''}`}
            onClick={() => setActiveTab('inspektorat')}
          >
            👔 Performa Inspektorat ({inspektoratPerformance.length})
          </button>
        )}
        <button 
          className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          ⚙️ Statistik Sistem
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'opd' && (
          <PerformanceTableComponent 
            type="opd"
            data={opdPerformance}
            onRefresh={loadPerformanceData}
          />
        )}

        {activeTab === 'inspektorat' && isSuperAdmin && (
          <PerformanceTableComponent 
            type="inspektorat"
            data={inspektoratPerformance}
            onRefresh={loadPerformanceData}
          />
        )}

        {activeTab === 'system' && systemStats && (
          <div className="system-stats-detail">
            <h2>📈 Statistik Sistem Detail</h2>
            
            <div className="stats-grid">
              <div className="stats-section">
                <h3>Laporan & Matrix</h3>
                <div className="stats-list">
                  <div className="stats-item">
                    <span>Total Laporan Evaluasi:</span>
                    <strong>{systemStats.totalReports}</strong>
                  </div>
                  <div className="stats-item">
                    <span>Total Matrix Audit:</span>
                    <strong>{systemStats.totalMatrixReports}</strong>
                  </div>
                  <div className="stats-item">
                    <span>Assignment Aktif:</span>
                    <strong>{systemStats.activeAssignments}</strong>
                  </div>
                  <div className="stats-item">
                    <span>Assignment Selesai:</span>
                    <strong>{systemStats.completedAssignments}</strong>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h3>Pengguna</h3>
                <div className="stats-list">
                  <div className="stats-item">
                    <span>Total Pengguna:</span>
                    <strong>{systemStats.totalUsers}</strong>
                  </div>
                  <div className="stats-item">
                    <span>Total OPD:</span>
                    <strong>{systemStats.totalOPDs}</strong>
                  </div>
                  <div className="stats-item">
                    <span>Total Inspektorat:</span>
                    <strong>{systemStats.totalInspektorat}</strong>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h3>Kinerja Keseluruhan</h3>
                <div className="stats-list">
                  <div className="stats-item">
                    <span>Tingkat Penyelesaian:</span>
                    <strong className="highlight">{systemStats.overallCompletionRate}%</strong>
                  </div>
                  <div className="stats-item">
                    <span>Status:</span>
                    <strong className={systemStats.overallCompletionRate >= 80 ? 'success' : systemStats.overallCompletionRate >= 50 ? 'warning' : 'danger'}>
                      {systemStats.overallCompletionRate >= 80 ? '✅ Sangat Baik' : systemStats.overallCompletionRate >= 50 ? '⚠️ Cukup' : '❌ Perlu Ditingkatkan'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}