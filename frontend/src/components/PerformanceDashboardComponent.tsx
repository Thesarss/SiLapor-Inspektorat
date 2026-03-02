import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import '../styles/PerformanceDashboardComponent.css';

interface SystemHealth {
  component: string;
  metric_type: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  measurement_count: number;
  last_recorded: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface UserPerformance {
  id: string;
  name: string;
  role: string;
  institution: string;
  total_activities: number;
  active_days: number;
  avg_response_time: number;
  last_activity: string;
  uploads_count: number;
  searches_count: number;
  reviews_count: number;
}

interface ActivityTrend {
  date: string;
  action: string;
  count: number;
}

interface EvidenceStats {
  status: string;
  count: number;
  avg_file_size: number;
  total_size: number;
}

interface DashboardData {
  system_health: SystemHealth[];
  user_performance: UserPerformance[];
  activity_trends: ActivityTrend[];
  evidence_stats: EvidenceStats[];
  matrix_stats: any[];
  last_updated: string;
}

export function PerformanceDashboardComponent() {
  console.log('🚀 PerformanceDashboardComponent rendered');
  const { user } = useAuth();
  console.log('👤 Current user:', user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      console.log('🔄 Loading performance dashboard data...');
      const response = await apiClient.get('/performance/dashboard');
      console.log('📊 Performance API response:', response);
      
      if (response.data.success) {
        console.log('✅ Dashboard data loaded:', response.data.data);
        setData(response.data.data);
      } else {
        console.error('❌ API returned error:', response.data.error);
        setError(response.data.error || 'Gagal memuat data dashboard');
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (user?.role !== 'super_admin' && user?.role !== 'inspektorat') {
    console.log('🚫 Access denied for user:', user);
    return (
      <div className="performance-dashboard">
        <div className="access-denied">
          <h2>🚫 Akses Ditolak</h2>
          <p>Hanya Super Admin dan Inspektorat yang dapat mengakses Performance Dashboard</p>
          <p>Current user role: {user?.role || 'undefined'}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('⏳ Loading dashboard...');
    return (
      <div className="performance-dashboard">
        <div className="loading">Memuat performance dashboard...</div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Dashboard error:', error);
    return (
      <div className="performance-dashboard">
        <div className="error-state">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={loadDashboardData}>
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    console.log('📭 No dashboard data available');
    return (
      <div className="performance-dashboard">
        <div className="empty-state">Tidak ada data tersedia</div>
      </div>
    );
  }

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>📊 Performance Dashboard</h2>
          <p>Monitor sistem dan kinerja pengguna secara real-time</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn-refresh ${refreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* System Health */}
        <div className="dashboard-card system-health">
          <div className="card-header">
            <h3>🖥️ System Health</h3>
            <span className="last-updated">
              Last updated: {formatDate(data.last_updated)}
            </span>
          </div>
          <div className="health-metrics">
            {data.system_health.map((health, index) => (
              <div key={index} className="health-metric">
                <div className="metric-header">
                  <span className="metric-icon">
                    {getHealthStatusIcon(health.status)}
                  </span>
                  <span className="metric-name">
                    {health.component} - {health.metric_type}
                  </span>
                  <span 
                    className="metric-status"
                    style={{ color: getHealthStatusColor(health.status) }}
                  >
                    {health.status}
                  </span>
                </div>
                <div className="metric-values">
                  <span>Avg: {health.avg_value.toFixed(2)}</span>
                  <span>Min: {health.min_value.toFixed(2)}</span>
                  <span>Max: {health.max_value.toFixed(2)}</span>
                  <span>Count: {health.measurement_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Statistics */}
        <div className="dashboard-card evidence-stats">
          <div className="card-header">
            <h3>📎 Evidence Statistics</h3>
          </div>
          <div className="stats-grid">
            {data.evidence_stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-header">
                  <span className="stat-label">{stat.status}</span>
                  <span className="stat-count">{stat.count}</span>
                </div>
                <div className="stat-details">
                  <div>Avg Size: {formatFileSize(stat.avg_file_size || 0)}</div>
                  <div>Total Size: {formatFileSize(stat.total_size || 0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Performance */}
        <div className="dashboard-card user-performance">
          <div className="card-header">
            <h3>👥 User Performance</h3>
          </div>
          <div className="performance-table">
            <div className="table-header">
              <div>User</div>
              <div>Activities</div>
              <div>Active Days</div>
              <div>Uploads</div>
              <div>Searches</div>
              <div>Reviews</div>
              <div>Last Activity</div>
            </div>
            {data.user_performance.slice(0, 10).map((user, index) => (
              <div key={index} className="table-row">
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-role">{user.role} - {user.institution}</div>
                </div>
                <div>{user.total_activities}</div>
                <div>{user.active_days}</div>
                <div>{user.uploads_count}</div>
                <div>{user.searches_count}</div>
                <div>{user.reviews_count}</div>
                <div>{user.last_activity ? formatDate(user.last_activity) : 'Never'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Trends */}
        <div className="dashboard-card activity-trends">
          <div className="card-header">
            <h3>📈 Activity Trends (Last 7 Days)</h3>
          </div>
          <div className="trends-chart">
            {data.activity_trends.length === 0 ? (
              <div className="no-data">No activity data available</div>
            ) : (
              <div className="trends-list">
                {data.activity_trends.map((trend, index) => (
                  <div key={index} className="trend-item">
                    <span className="trend-date">{trend.date}</span>
                    <span className="trend-action">{trend.action}</span>
                    <span className="trend-count">{trend.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Matrix Statistics */}
        <div className="dashboard-card matrix-stats">
          <div className="card-header">
            <h3>📋 Matrix Statistics</h3>
          </div>
          <div className="matrix-grid">
            {data.matrix_stats.map((stat, index) => (
              <div key={index} className="matrix-stat">
                <div className="stat-type">{stat.type}</div>
                <div className="stat-value">{stat.count}</div>
                {stat.avg_items && (
                  <div className="stat-avg">Avg Items: {stat.avg_items.toFixed(1)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}