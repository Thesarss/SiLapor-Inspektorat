import { useState, useEffect, memo } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/OPDStatisticsComponent.css';

interface OPDStatistics {
  institution: string;
  totalReports: number;
  reportsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
    needs_revision: number;
  };
  followupProgress: {
    totalFollowupItems: number;
    completedFollowupItems: number;
    pendingFollowupItems: number;
    approvedFollowupItems: number;
  };
  recommendationProgress: {
    totalRecommendations: number;
    submittedRecommendations: number;
    approvedRecommendations: number;
    rejectedRecommendations: number;
  };
  completionRate: number;
  lastActivity: string | null;
}

interface MatrixStatistics {
  totalAssignments: number;
  pendingAssignments: number;
  inProgressAssignments: number;
  completedAssignments: number;
  totalItems: number;
  completedItems: number;
  completionRate: number;
}

interface OPDRanking {
  institution: string;
  completionRate: number;
  totalRecommendations: number;
  approvedRecommendations: number;
  rank: number;
}

const OPDStatisticsComponent = memo(function OPDStatisticsComponent() {
  const { isAdmin } = useAuth();
  const [statistics, setStatistics] = useState<OPDStatistics | null>(null);
  const [matrixStats, setMatrixStats] = useState<MatrixStatistics | null>(null);
  const [allStatistics, setAllStatistics] = useState<OPDStatistics[]>([]);
  const [ranking, setRanking] = useState<OPDRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'ranking'>('my');

  useEffect(() => {
    if (isAdmin) {
      setActiveTab('all');
    }
    fetchData();
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'my' && !isAdmin) {
        const [statsResponse, matrixResponse] = await Promise.all([
          apiClient.get('/opd-statistics/my'),
          apiClient.get('/matrix/assignments')
        ]);
        
        setStatistics(statsResponse.data.data);
        
        // Calculate matrix statistics from assignments
        const assignments = matrixResponse.data.data || [];
        const matrixStatistics: MatrixStatistics = {
          totalAssignments: assignments.length,
          pendingAssignments: assignments.filter((a: any) => a.status === 'pending').length,
          inProgressAssignments: assignments.filter((a: any) => a.status === 'in_progress').length,
          completedAssignments: assignments.filter((a: any) => a.status === 'completed').length,
          totalItems: assignments.reduce((sum: number, a: any) => sum + (a.total_items || 0), 0),
          completedItems: assignments.reduce((sum: number, a: any) => sum + (a.completed_items || 0), 0),
          completionRate: 0
        };
        
        if (matrixStatistics.totalItems > 0) {
          matrixStatistics.completionRate = Math.round(
            (matrixStatistics.completedItems / matrixStatistics.totalItems) * 100
          );
        }
        
        setMatrixStats(matrixStatistics);
      } else if (activeTab === 'all' && isAdmin) {
        const response = await apiClient.get('/opd-statistics/all');
        setAllStatistics(response.data.data);
      } else if (activeTab === 'ranking' && isAdmin) {
        const response = await apiClient.get('/opd-statistics/ranking');
        setRanking(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal memuat statistik');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return '#f1c40f'; // Gold
    if (rank === 2) return '#95a5a6'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return '#bdc3c7'; // Default
  };

  if (loading) return <div className="loading">Memuat statistik...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="opd-statistics-component">
      <div className="statistics-header">
        <h2>📊 Statistik Progress OPD</h2>
        
        {isAdmin && (
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Semua OPD
            </button>
            <button 
              className={`tab-button ${activeTab === 'ranking' ? 'active' : ''}`}
              onClick={() => setActiveTab('ranking')}
            >
              Peringkat
            </button>
          </div>
        )}
      </div>

      {/* My OPD Statistics (for regular users) */}
      {!isAdmin && statistics && (
        <div className="my-opd-statistics">
          <div className="opd-header">
            <h3>{statistics.institution}</h3>
            <div className="completion-rate">
              <span className="rate-value">{statistics.completionRate}%</span>
              <span className="rate-label">Tingkat Penyelesaian</span>
            </div>
          </div>

          {/* Matrix Statistics Section */}
          {matrixStats && matrixStats.totalAssignments > 0 && (
            <div className="matrix-stats-section">
              <h4>📊 Matrix Audit</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <h5>📋 Total Laporan</h5>
                  <div className="stat-number">{matrixStats.totalAssignments}</div>
                  <div className="stat-detail">
                    {matrixStats.pendingAssignments} pending
                  </div>
                </div>
                
                <div className="stat-card">
                  <h5>📝 Tindak Lanjut</h5>
                  <div className="stat-number">{matrixStats.completedItems}</div>
                  <div className="stat-detail">
                    dari {matrixStats.totalItems} total
                  </div>
                </div>
                
                <div className="stat-card">
                  <h5>✅ Rekomendasi</h5>
                  <div className="stat-number">{matrixStats.totalItems}</div>
                  <div className="stat-detail">
                    {matrixStats.completedItems} disetujui
                  </div>
                </div>
              </div>

              <div className="progress-section">
                <h5>Progress Matrix</h5>
                <div className="progress-bars">
                  <div className="progress-item">
                    <label>Penyelesaian Matrix Items</label>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${matrixStats.completionRate}%`,
                          backgroundColor: '#9b59b6'
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {matrixStats.completedItems} / {matrixStats.totalItems} ({matrixStats.completionRate}%)
                    </span>
                  </div>
                  
                  <div className="progress-item">
                    <label>Status Assignments</label>
                    <div className="status-breakdown">
                      <span className="status-item pending">
                        Pending: {matrixStats.pendingAssignments}
                      </span>
                      <span className="status-item in-progress">
                        In Progress: {matrixStats.inProgressAssignments}
                      </span>
                      <span className="status-item completed">
                        Completed: {matrixStats.completedAssignments}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <h4>📋 Total Laporan</h4>
              <div className="stat-number">{statistics.totalReports}</div>
            </div>
            
            <div className="stat-card">
              <h4>📝 Tindak Lanjut</h4>
              <div className="stat-number">{statistics.followupProgress.totalFollowupItems}</div>
              <div className="stat-detail">
                {statistics.followupProgress.approvedFollowupItems} selesai
              </div>
            </div>
            
            <div className="stat-card">
              <h4>✅ Rekomendasi</h4>
              <div className="stat-number">{statistics.recommendationProgress.totalRecommendations}</div>
              <div className="stat-detail">
                {statistics.recommendationProgress.approvedRecommendations} disetujui
              </div>
            </div>
          </div>

          <div className="progress-section">
            <h4>Progress Detail</h4>
            <div className="progress-bars">
              <div className="progress-item">
                <label>Tindak Lanjut Selesai</label>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${getProgressPercentage(
                        statistics.followupProgress.approvedFollowupItems, 
                        statistics.followupProgress.totalFollowupItems
                      )}%`,
                      backgroundColor: '#27ae60'
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {statistics.followupProgress.approvedFollowupItems} / {statistics.followupProgress.totalFollowupItems}
                </span>
              </div>
              
              <div className="progress-item">
                <label>Rekomendasi Disetujui</label>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${getProgressPercentage(
                        statistics.recommendationProgress.approvedRecommendations, 
                        statistics.recommendationProgress.totalRecommendations
                      )}%`,
                      backgroundColor: '#3498db'
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {statistics.recommendationProgress.approvedRecommendations} / {statistics.recommendationProgress.totalRecommendations}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All OPD Statistics (for admin) */}
      {isAdmin && activeTab === 'all' && (
        <div className="all-opd-statistics">
          <div className="opd-grid">
            {allStatistics.map((stat) => (
                <div key={stat.institution} className="opd-card">
                  <div className="opd-card-header">
                    <h4>{stat.institution}</h4>
                    <div className="completion-badge">
                      {stat.completionRate}%
                    </div>
                  </div>
                  
                  <div className="opd-stats">
                    <div className="stat-row">
                      <span>Total Laporan:</span>
                      <strong>{stat.totalReports}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Tindak Lanjut:</span>
                      <strong>{stat.followupProgress.approvedFollowupItems}/{stat.followupProgress.totalFollowupItems}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Rekomendasi:</span>
                      <strong>{stat.recommendationProgress.approvedRecommendations}/{stat.recommendationProgress.totalRecommendations}</strong>
                    </div>
                  </div>
                  
                  <div className="completion-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${stat.completionRate}%`,
                          backgroundColor: stat.completionRate >= 80 ? '#27ae60' : 
                                         stat.completionRate >= 50 ? '#f39c12' : '#e74c3c'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* OPD Ranking (for admin) */}
      {isAdmin && activeTab === 'ranking' && (
        <div className="opd-ranking">
          <div className="ranking-list">
            {ranking.map((item) => (
              <div key={item.institution} className="ranking-item">
                <div className="rank-badge" style={{ backgroundColor: getRankBadgeColor(item.rank) }}>
                  #{item.rank}
                </div>
                <div className="ranking-info">
                  <h4>{item.institution}</h4>
                  <div className="ranking-stats">
                    <span>Tingkat Penyelesaian: <strong>{item.completionRate}%</strong></span>
                    <span>Rekomendasi: <strong>{item.approvedRecommendations}/{item.totalRecommendations}</strong></span>
                  </div>
                </div>
                <div className="completion-rate-large">
                  {item.completionRate}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default OPDStatisticsComponent;