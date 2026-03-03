import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import '../styles/MatrixAnalytics.css';

interface MatrixStats {
  totalMatrix: number;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  submittedItems: number;
  totalOPDs: number;
  activeOPDs: number;
}

interface OPDPerformance {
  opd_name: string;
  institution: string;
  total_assignments: number;
  total_items: number;
  completed_items: number;
  pending_items: number;
  submitted_items: number;
  completion_rate: number;
  avg_response_time: number;
}

export const MatrixAnalyticsComponent = React.memo(function MatrixAnalyticsComponent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MatrixStats | null>(null);
  const [opdPerformance, setOpdPerformance] = useState<OPDPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOPDDetails, setShowOPDDetails] = useState(false);

  useEffect(() => {
    fetchMatrixAnalytics();
  }, []);

  const fetchMatrixAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsResponse, performanceResponse] = await Promise.all([
        apiClient.get('/matrix/statistics'),
        apiClient.get('/matrix/opd-performance')
      ]);
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
      
      if (performanceResponse.data.success) {
        setOpdPerformance(performanceResponse.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching matrix analytics:', err);
      setError('Gagal memuat statistik matrix');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="matrix-analytics-container">
        <div className="analytics-header">
          <h2>📊 Analitik Matrix Audit</h2>
        </div>
        <div className="loading-state">Memuat statistik...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="matrix-analytics-container">
        <div className="analytics-header">
          <h2>📊 Analitik Matrix Audit</h2>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchMatrixAnalytics} className="btn-retry">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = stats?.totalItems 
    ? Math.round((stats.completedItems / stats.totalItems) * 100) 
    : 0;

  return (
    <div className="matrix-analytics-container">
      <div className="analytics-header">
        <h2>📊 Analitik Matrix Audit</h2>
        <p>Statistik matrix audit untuk {user?.name}</p>
      </div>

      {/* Overview Cards */}
      <div className="analytics-grid">
        {/* Matrix Overview */}
        <div className="analytics-card primary">
          <div className="card-header">
            <h3>📋 Overview Matrix</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span>Total Matrix</span>
              <strong>{stats?.totalMatrix || 0}</strong>
            </div>
            <div className="stat-row">
              <span>Total Items</span>
              <strong>{stats?.totalItems || 0}</strong>
            </div>
            <div className="stat-row">
              <span>Items Selesai</span>
              <strong>{stats?.completedItems || 0}</strong>
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="analytics-card success">
          <div className="card-header">
            <h3>📈 Progress Keseluruhan</h3>
            <span className="card-icon">✅</span>
          </div>
          <div className="card-content">
            <div className="progress-circle">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="10"/>
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="10"
                  strokeDasharray={`${completionPercentage * 2.827} 282.7`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="50" textAnchor="middle" dy="7" fontSize="20" fontWeight="bold" fill="#10b981">
                  {completionPercentage}%
                </text>
              </svg>
            </div>
            <div className="progress-legend">
              <div className="legend-item">
                <span className="dot completed"></span>
                <span>Selesai: {stats?.completedItems || 0}</span>
              </div>
              <div className="legend-item">
                <span className="dot submitted"></span>
                <span>Submitted: {stats?.submittedItems || 0}</span>
              </div>
              <div className="legend-item">
                <span className="dot pending"></span>
                <span>Pending: {stats?.pendingItems || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* OPD Statistics */}
        <div className="analytics-card info">
          <div className="card-header">
            <h3>🏢 Statistik OPD</h3>
            <span className="card-icon">🏛️</span>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span>Total OPD</span>
              <strong>{stats?.totalOPDs || 0}</strong>
            </div>
            <div className="stat-row">
              <span>OPD Aktif</span>
              <strong>{stats?.activeOPDs || 0}</strong>
            </div>
            <div className="stat-row">
              <span>Rata-rata Progress</span>
              <strong>{completionPercentage}%</strong>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="analytics-card warning">
          <div className="card-header">
            <h3>🎯 Aksi Cepat</h3>
            <span className="card-icon">⚡</span>
          </div>
          <div className="card-content">
            <Link to="/matrix" className="action-btn primary">
              📋 Kelola Matrix
            </Link>
            <Link to="/approvals" className="action-btn success">
              📝 Review Matrix
              {stats && stats.submittedItems > 0 && (
                <span className="badge">{stats.submittedItems}</span>
              )}
            </Link>
            <button 
              onClick={() => setShowOPDDetails(!showOPDDetails)}
              className="action-btn info"
            >
              📊 {showOPDDetails ? 'Sembunyikan' : 'Lihat'} Performa OPD
            </button>
          </div>
        </div>
      </div>

      {/* OPD Performance Table */}
      {showOPDDetails && (
        <div className="opd-performance-section">
          <div className="section-header">
            <h3>📊 Performa Setiap OPD</h3>
            <p>Detail progress dan performa matrix audit per OPD</p>
          </div>
          
          {opdPerformance.length === 0 ? (
            <div className="empty-state">
              <p>Belum ada data performa OPD</p>
            </div>
          ) : (
            <div className="performance-table-container">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>OPD</th>
                    <th>Matrix</th>
                    <th>Total Items</th>
                    <th>Selesai</th>
                    <th>Submitted</th>
                    <th>Pending</th>
                    <th>Progress</th>
                    <th>Waktu Respon</th>
                  </tr>
                </thead>
                <tbody>
                  {opdPerformance.map((opd, index) => (
                    <tr key={index}>
                      <td className="opd-name">
                        <div className="opd-info">
                          <strong>{opd.institution}</strong>
                          <small>{opd.opd_name}</small>
                        </div>
                      </td>
                      <td className="text-center">{opd.total_assignments}</td>
                      <td className="text-center">{opd.total_items}</td>
                      <td className="text-center">
                        <span className="status-badge completed">{opd.completed_items}</span>
                      </td>
                      <td className="text-center">
                        <span className="status-badge submitted">{opd.submitted_items}</span>
                      </td>
                      <td className="text-center">
                        <span className="status-badge pending">{opd.pending_items}</span>
                      </td>
                      <td>
                        <div className="progress-bar-cell">
                          <div className="progress-bar-mini">
                            <div 
                              className="progress-fill-mini" 
                              style={{ width: `${opd.completion_rate}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{opd.completion_rate}%</span>
                        </div>
                      </td>
                      <td className="text-center">
                        {opd.avg_response_time > 0 
                          ? `${opd.avg_response_time.toFixed(1)} hari` 
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
