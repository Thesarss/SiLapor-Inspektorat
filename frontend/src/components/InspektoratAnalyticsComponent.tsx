import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import '../styles/InspektoratAnalytics.css';

interface InspektoratStats {
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
  needsRevisionReports: number;
  totalOPDs: number;
  activeOPDs: number;
  monthlyReports: number;
  avgResponseTime: number;
}

// Simple Chart Component
const ProgressChart = ({ percentage, label, color }: { percentage: number; label: string; color: string }) => (
  <div style={{ marginBottom: '15px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
      <span style={{ fontSize: '13px', color: '#5a6c7d', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '700' }}>{percentage}%</span>
    </div>
    <div style={{
      width: '100%',
      height: '8px',
      background: '#e9ecef',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${percentage}%`,
        height: '100%',
        background: color,
        transition: 'width 0.5s ease',
        borderRadius: '4px'
      }} />
    </div>
  </div>
);

// Donut Chart Component
const DonutChart = ({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) => {
  let currentAngle = 0;
  
  return (
    <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          
          // Calculate path for donut segment
          const radius = 70;
          const innerRadius = 50;
          const centerX = 90;
          const centerY = 90;
          
          const startRad = (startAngle - 90) * (Math.PI / 180);
          const endRad = (startAngle + angle - 90) * (Math.PI / 180);
          
          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);
          
          const x3 = centerX + innerRadius * Math.cos(endRad);
          const y3 = centerY + innerRadius * Math.sin(endRad);
          const x4 = centerX + innerRadius * Math.cos(startRad);
          const y4 = centerY + innerRadius * Math.sin(startRad);
          
          const largeArc = angle > 180 ? 1 : 0;
          
          const path = `
            M ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
            L ${x3} ${y3}
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
            Z
          `;
          
          return (
            <path
              key={index}
              d={path}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        <circle cx="90" cy="90" r="45" fill="white" />
        <text x="90" y="85" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#2c3e50">
          {total}
        </text>
        <text x="90" y="105" textAnchor="middle" fontSize="12" fill="#7f8c8d">
          Total
        </text>
      </svg>
      
      {/* Legend */}
      <div style={{ marginTop: '15px' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: item.color,
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span style={{ color: '#5a6c7d', flex: 1 }}>{item.label}</span>
            <span style={{ color: '#2c3e50', fontWeight: '600' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const InspektoratAnalyticsComponent = React.memo(function InspektoratAnalyticsComponent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<InspektoratStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInspektoratStats();
  }, []);

  const fetchInspektoratStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch reports assigned to this inspektorat user
      const response = await apiClient.get('/dashboard/inspektorat-analytics');
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Error fetching inspektorat analytics:', err);
      setError('Gagal memuat statistik inspektorat');
      
      // Fallback: use mock data for now
      setStats({
        totalReports: 5,
        pendingReports: 2,
        approvedReports: 2,
        rejectedReports: 1,
        needsRevisionReports: 0,
        totalOPDs: 8,
        activeOPDs: 4,
        monthlyReports: 3,
        avgResponseTime: 2.5
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '25px', 
        marginBottom: '30px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ marginBottom: '25px', borderBottom: '2px solid #ecf0f1', paddingBottom: '15px' }}>
          <h2 style={{ color: '#2c3e50', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Analitik Inspektorat
          </h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d', fontSize: '16px' }}>
          Memuat statistik...
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '25px', 
        marginBottom: '30px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ marginBottom: '25px', borderBottom: '2px solid #ecf0f1', paddingBottom: '15px' }}>
          <h2 style={{ color: '#2c3e50', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Analitik Inspektorat
          </h2>
        </div>
        <div style={{ textAlign: 'center', padding: '30px', color: '#e74c3c' }}>
          <p>{error}</p>
          <button 
            onClick={fetchInspektoratStats} 
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '15px',
              fontSize: '14px'
            }}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '12px', 
      padding: '25px', 
      marginBottom: '30px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
    }}>
      <div style={{ marginBottom: '25px', borderBottom: '2px solid #ecf0f1', paddingBottom: '15px' }}>
        <h2 style={{ color: '#2c3e50', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📊 Analitik Inspektorat
        </h2>
        <p style={{ color: '#7f8c8d', margin: '0', fontSize: '14px' }}>
          Statistik laporan yang perlu direview oleh {user?.name}
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '10px 15px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #ffeaa7',
          fontSize: '14px'
        }}>
          <span>⚠️ {error} - Menampilkan data sementara</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {/* Review Statistics with Donut Chart */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%)',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e9ecef',
          borderLeft: '4px solid #3498db',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>
              📋 Status Laporan
            </h3>
            <span style={{ fontSize: '20px', opacity: '0.7' }}>📊</span>
          </div>
          
          <DonutChart
            total={stats?.totalReports || 0}
            data={[
              { label: 'Menunggu Review', value: stats?.pendingReports || 0, color: '#f39c12' },
              { label: 'Disetujui', value: stats?.approvedReports || 0, color: '#27ae60' },
              { label: 'Ditolak', value: stats?.rejectedReports || 0, color: '#e74c3c' },
              { label: 'Perlu Revisi', value: stats?.needsRevisionReports || 0, color: '#8e44ad' }
            ]}
          />
        </div>

        {/* Completion Progress */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e8f5e8 100%)',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e9ecef',
          borderLeft: '4px solid #2ecc71',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>
              📈 Progress Review
            </h3>
            <span style={{ fontSize: '20px', opacity: '0.7' }}>✅</span>
          </div>
          
          <div style={{ padding: '10px 0' }}>
            <ProgressChart
              percentage={stats?.totalReports ? Math.round((stats.approvedReports / stats.totalReports) * 100) : 0}
              label="Tingkat Persetujuan"
              color="#27ae60"
            />
            <ProgressChart
              percentage={stats?.totalReports ? Math.round(((stats.approvedReports + stats.rejectedReports) / stats.totalReports) * 100) : 0}
              label="Laporan Selesai Direview"
              color="#3498db"
            />
            <ProgressChart
              percentage={stats?.totalReports ? Math.round((stats.pendingReports / stats.totalReports) * 100) : 0}
              label="Menunggu Review"
              color="#f39c12"
            />
            
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(46, 204, 113, 0.1)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60', marginBottom: '5px' }}>
                {stats?.totalReports ? Math.round((stats.approvedReports / stats.totalReports) * 100) : 0}%
              </div>
              <div style={{ fontSize: '13px', color: '#5a6c7d' }}>
                Persentase Keseluruhan Disetujui
              </div>
            </div>
          </div>
        </div>

        {/* OPD Statistics */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e8f5e8 100%)',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e9ecef',
          borderLeft: '4px solid #2ecc71',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>
              🏢 Statistik OPD
            </h3>
            <span style={{ fontSize: '20px', opacity: '0.7' }}>🏛️</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#5a6c7d', fontSize: '14px', fontWeight: '500' }}>Total OPD</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>{stats?.totalOPDs || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#5a6c7d', fontSize: '14px', fontWeight: '500' }}>OPD Aktif</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>{stats?.activeOPDs || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#5a6c7d', fontSize: '14px', fontWeight: '500' }}>Laporan Bulan Ini</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>{stats?.monthlyReports || 0}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffebee 100%)',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e9ecef',
          borderLeft: '4px solid #e74c3c',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>
              ⚡ Performa Review
            </h3>
            <span style={{ fontSize: '20px', opacity: '0.7' }}>📈</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#5a6c7d', fontSize: '14px', fontWeight: '500' }}>Rata-rata Waktu Review</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>{stats?.avgResponseTime || 0} hari</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#5a6c7d', fontSize: '14px', fontWeight: '500' }}>Perlu Revisi</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#8e44ad' }}>{stats?.needsRevisionReports || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#5a6c7d', fontSize: '14px', fontWeight: '500' }}>Tingkat Persetujuan</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
                {stats?.totalReports ? 
                  Math.round((stats.approvedReports / stats.totalReports) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #fff8e1 100%)',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #e9ecef',
          borderLeft: '4px solid #f39c12',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '16px', fontWeight: '600' }}>
              🎯 Aksi Cepat
            </h3>
            <span style={{ fontSize: '20px', opacity: '0.7' }}>⚡</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'white',
                background: 'linear-gradient(135deg, #3498db, #2980b9)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => window.location.href = '/approvals'}
            >
              📝 Review Matrix
              {stats?.pendingReports && stats.pendingReports > 0 && (
                <span style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  {stats.pendingReports}
                </span>
              )}
            </button>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'white',
                background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => window.location.href = '/matrix'}
            >
              📋 Matrix Audit
            </button>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'white',
                background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => window.location.href = '/import'}
            >
              📥 Import Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});