import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Report } from '../types';
import { useAuth } from '../context/AuthContext';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function MyReportsPage() {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  useEffect(() => {
    fetchReports(1);
  }, []);

  const fetchReports = async (page: number = 1) => {
    try {
      setLoading(true);
      // For users, get reports assigned to them that need review/action
      // For admins, get reports they created (fallback behavior)
      const endpoint = isAdmin ? '/reports/my' : '/reports/assigned';
      const response = await apiClient.get(`${endpoint}?page=${page}&limit=${pagination.itemsPerPage}`);
      
      setReports(response.data.data || []);
      setPagination({
        currentPage: response.data.pagination?.currentPage || page,
        totalPages: response.data.pagination?.totalPages || 1,
        totalItems: response.data.pagination?.totalItems || (response.data.data?.length || 0),
        itemsPerPage: response.data.pagination?.itemsPerPage || 10
      });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReports(newPage);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Perlu Tindak Lanjut',
      in_progress: 'Dalam Proses',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      needs_revision: 'Perlu Revisi'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      pending: '⏳',
      in_progress: '🔄',
      approved: '✅',
      rejected: '❌',
      needs_revision: '📝'
    };
    return icons[status] || '📋';
  };

  const needsAction = (status: string) => {
    return status === 'pending' || status === 'needs_revision';
  };

  if (loading) return <div className="loading">Memuat laporan...</div>;

  return (
    <div className="my-reports">
      <div className="page-header">
        <h1>📋 {isAdmin ? 'Laporan Saya' : 'Review Matrix'}</h1>
        {isAdmin && (
          <Link to="/import" className="btn-primary btn-auto">
            📥 Import Data Baru
          </Link>
        )}
      </div>
      
      {reports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>{isAdmin ? 'Belum Ada Laporan' : 'Tidak Ada Laporan untuk Review'}</h3>
          <p>
            {isAdmin 
              ? 'Anda belum membuat laporan apapun. Gunakan fitur Import Data untuk membuat laporan dari file Excel.'
              : 'Saat ini tidak ada laporan yang perlu Anda review atau tindak lanjuti.'
            }
          </p>
          {isAdmin && (
            <Link to="/import" className="btn-primary btn-auto">
              📥 Import Data Pertama
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="info-box info-blue">
            <span className="info-icon">📊</span>
            <span>Total <strong>{pagination.totalItems}</strong> laporan {isAdmin ? '' : 'untuk review'}</span>
          </div>

          {reports.filter(r => needsAction(r.status)).length > 0 && (
            <div className="info-box info-warning">
              <span className="info-icon">⚠️</span>
              <span><strong>{reports.filter(r => needsAction(r.status)).length}</strong> laporan perlu tindak lanjut Anda</span>
            </div>
          )}

          <div className="reports-grid">
            {reports.map(report => (
              <div key={report.id} className={`report-card ${needsAction(report.status) ? 'needs-action' : ''}`}>
                <div className="report-card-header">
                  <h3>{report.title}</h3>
                  <div className="status-section">
                    {needsAction(report.status) && (
                      <span className="action-indicator">🔥 PERLU ACTION</span>
                    )}
                    <span className={`badge badge-${report.status}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </div>
                </div>
                
                <p className="report-card-desc">{report.description}</p>
                
                <div className="report-meta">
                  <span className="date">
                    📅 {new Date(report.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <Link 
                  to={`/reports/${report.id}`} 
                  className={report.status === 'needs_revision' ? 'btn-warning btn-full' : 'btn-secondary btn-full'}
                >
                  {getStatusIcon(report.status)} {report.status === 'needs_revision' ? 'Kerjakan Revisi' : 'Lihat Detail'}
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="pagination-btn"
              >
                ← Sebelumnya
              </button>
              
              <div className="pagination-info">
                <span>
                  Halaman {pagination.currentPage} dari {pagination.totalPages}
                </span>
                <span className="pagination-details">
                  ({((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} dari {pagination.totalItems} laporan)
                </span>
              </div>
              
              <button 
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="pagination-btn"
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
