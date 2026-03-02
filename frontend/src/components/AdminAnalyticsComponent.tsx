import { useState, useEffect, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import apiClient from '../api/client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AdminAnalytics {
  overview: {
    totalTemuan: number;
    totalRekomendasi: number;
    totalOPD: number;
    totalLaporan: number;
  };
  progressChart: {
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
  };
  opdBreakdown: Array<{
    opdName: string;
    institution: string;
    totalRekomendasi: number;
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
    completionRate: number;
  }>;
}

export const AdminAnalyticsComponent = memo(function AdminAnalyticsComponent() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get('/dashboard/analytics');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Gagal memuat data analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Memuat analytics...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!analytics) return null;

  const { overview, progressChart, opdBreakdown } = analytics;

  // Progress Chart Data (Doughnut)
  const progressData = {
    labels: ['Selesai', 'Sedang Dikerjakan', 'Belum Dikerjakan', 'Ditolak'],
    datasets: [
      {
        data: [
          progressChart.completed,
          progressChart.inProgress,
          progressChart.pending,
          progressChart.rejected,
        ],
        backgroundColor: [
          '#10B981', // Green - Completed
          '#F59E0B', // Yellow - In Progress
          '#6B7280', // Gray - Pending
          '#EF4444', // Red - Rejected
        ],
        borderColor: [
          '#059669',
          '#D97706',
          '#4B5563',
          '#DC2626',
        ],
        borderWidth: 2,
      },
    ],
  };

  const progressOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Status Tindak Lanjut Rekomendasi',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = progressChart.completed + progressChart.inProgress + progressChart.pending + progressChart.rejected;
            const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
  };

  // OPD Performance Bar Chart Data
  const allOPDs = opdBreakdown
    .sort((a, b) => b.completionRate - a.completionRate);

  const opdData = {
    labels: allOPDs.map(opd => opd.institution),
    datasets: [
      {
        label: 'Selesai',
        data: allOPDs.map(opd => opd.completed),
        backgroundColor: '#10B981',
      },
      {
        label: 'Sedang Dikerjakan',
        data: allOPDs.map(opd => opd.inProgress),
        backgroundColor: '#F59E0B',
      },
      {
        label: 'Belum Dikerjakan',
        data: allOPDs.map(opd => opd.pending),
        backgroundColor: '#6B7280',
      },
      {
        label: 'Ditolak',
        data: allOPDs.map(opd => opd.rejected),
        backgroundColor: '#EF4444',
      },
    ],
  };

  const opdOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Progress Tindak Lanjut per OPD',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
  };



  const totalRekomendasi = progressChart.completed + progressChart.inProgress + progressChart.pending + progressChart.rejected;
  const overallCompletionRate = totalRekomendasi > 0 ? Math.round((progressChart.completed / totalRekomendasi) * 100) : 0;

  return (
    <div className="admin-analytics">
      <h2>📊 Analytics Dashboard</h2>
      
      {/* Overview Cards */}
      <div className="analytics-overview">
        <div className="overview-card">
          <div className="overview-icon">🎯</div>
          <div className="overview-content">
            <h3>{overview.totalTemuan}</h3>
            <p>Total Temuan</p>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon">📋</div>
          <div className="overview-content">
            <h3>{overview.totalRekomendasi}</h3>
            <p>Total Rekomendasi</p>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon">🏢</div>
          <div className="overview-content">
            <h3>{overview.totalOPD}</h3>
            <p>Total OPD</p>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon">📄</div>
          <div className="overview-content">
            <h3>{overview.totalLaporan}</h3>
            <p>Total Laporan</p>
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="completion-rate-card">
        <h3>📈 Tingkat Penyelesaian Keseluruhan</h3>
        <div className="completion-rate">
          <div className="rate-circle">
            <span className="rate-number">{overallCompletionRate}%</span>
          </div>
          <div className="rate-details">
            <p><strong>{progressChart.completed}</strong> dari <strong>{totalRekomendasi}</strong> rekomendasi telah diselesaikan</p>
            <div className="rate-breakdown">
              <span className="rate-item completed">✅ Selesai: {progressChart.completed}</span>
              <span className="rate-item in-progress">🔄 Dikerjakan: {progressChart.inProgress}</span>
              <span className="rate-item pending">⏳ Belum: {progressChart.pending}</span>
              <span className="rate-item rejected">❌ Ditolak: {progressChart.rejected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <Doughnut data={progressData} options={progressOptions} />
        </div>
        <div className="chart-container">
          <Bar data={opdData} options={opdOptions} />
        </div>
      </div>

      {/* OPD Performance Table */}
      <div className="opd-performance">
        <h3>🏆 Performa OPD</h3>
        <div className="table-container">
          <table className="performance-table">
            <thead>
              <tr>
                <th>OPD</th>
                <th>Total Rekomendasi</th>
                <th>Selesai</th>
                <th>Dikerjakan</th>
                <th>Belum</th>
                <th>Ditolak</th>
                <th>Tingkat Penyelesaian</th>
              </tr>
            </thead>
            <tbody>
              {opdBreakdown.map((opd, index) => (
                <tr key={index}>
                  <td>
                    <div className="opd-info">
                      <strong>{opd.institution}</strong>
                      <small>{opd.opdName}</small>
                    </div>
                  </td>
                  <td>{opd.totalRekomendasi}</td>
                  <td><span className="status-badge completed">{opd.completed}</span></td>
                  <td><span className="status-badge in-progress">{opd.inProgress}</span></td>
                  <td><span className="status-badge pending">{opd.pending}</span></td>
                  <td><span className="status-badge rejected">{opd.rejected}</span></td>
                  <td>
                    <div className="completion-bar">
                      <div 
                        className="completion-fill" 
                        style={{ width: `${opd.completionRate}%` }}
                      ></div>
                      <span className="completion-text">{opd.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});