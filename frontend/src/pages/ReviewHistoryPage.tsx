import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import '../styles/ReviewHistoryPage.css';

export function ReviewHistoryPage() {
  const [reviewedItems, setReviewedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchReviewedItems();
  }, []);

  const fetchReviewedItems = async () => {
    try {
      const response = await apiClient.get('/follow-ups/all-reviewed');
      
      if (response.data.success) {
        setReviewedItems(response.data.data || []);
      } else {
        notify.error('Gagal memuat riwayat review');
      }
    } catch (error: any) {
      console.error('Failed to fetch reviewed items:', error);
      notify.error('Gagal memuat riwayat review');
    } finally {
      setLoading(false);
    }
  };

  const getReviewTypeLabel = (reviewType: string) => {
    const labels: Record<string, string> = {
      'follow_up': '📝 Tindak Lanjut',
      'recommendation': '💡 Rekomendasi',
      'matrix_item': '📊 Matrix Item',
      'evidence': '📎 Evidence'
    };
    return labels[reviewType] || '📋 Review';
  };

  const getReviewTypeColor = (reviewType: string) => {
    const colors: Record<string, string> = {
      'follow_up': 'badge-blue',
      'recommendation': 'badge-green',
      'matrix_item': 'badge-purple',
      'evidence': 'badge-orange'
    };
    return colors[reviewType] || 'badge-gray';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <span className="badge badge-success">✅ Disetujui</span>;
    } else if (status === 'rejected') {
      return <span className="badge badge-danger">❌ Ditolak</span>;
    }
    return <span className="badge badge-gray">{status}</span>;
  };

  const renderReviewContent = (item: any) => {
    switch (item.review_type) {
      case 'follow_up':
        return (
          <div className="followup-content">
            <h4>📝 Tindak Lanjut:</h4>
            <div className="content-preview">{item.content}</div>
          </div>
        );
      
      case 'recommendation':
        return (
          <div className="recommendation-content">
            <h4>💡 Rekomendasi:</h4>
            <div className="content-preview">{item.recommendation_text}</div>
            {item.item_description && (
              <div className="item-context">
                <strong>Untuk item:</strong> {item.item_description}
              </div>
            )}
          </div>
        );
      
      case 'matrix_item':
        return (
          <div className="matrix-content">
            <h4>📊 Matrix Item #{item.item_number}:</h4>
            <div className="matrix-details">
              <div><strong>Temuan:</strong> {item.temuan}</div>
              <div><strong>Penyebab:</strong> {item.penyebab}</div>
              <div><strong>Rekomendasi:</strong> {item.rekomendasi}</div>
            </div>
          </div>
        );
      
      case 'evidence':
        return (
          <div className="evidence-content">
            <h4>📎 Evidence File:</h4>
            <div className="evidence-details">
              <div><strong>Filename:</strong> {item.original_filename}</div>
              <div><strong>Category:</strong> {item.category}</div>
              <div><strong>Description:</strong> {item.description}</div>
            </div>
          </div>
        );
      
      default:
        return <div className="content-preview">{item.content || 'No content available'}</div>;
    }
  };

  const getReviewNotes = (item: any) => {
    return item.review_notes || item.admin_notes || null;
  };

  const filteredItems = reviewedItems.filter(item => {
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    const typeMatch = filterType === 'all' || item.review_type === filterType;
    return statusMatch && typeMatch;
  });

  if (loading) return <div className="loading">Memuat riwayat review...</div>;

  return (
    <div className="review-history">
      <h1>📜 Riwayat Review</h1>
      <p className="page-description">Lihat semua item yang sudah direview beserta catatan dan penjelasannya</p>

      <div className="filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">Semua Status</option>
            <option value="approved">✅ Disetujui</option>
            <option value="rejected">❌ Ditolak</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Tipe:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Semua Tipe</option>
            <option value="follow_up">📝 Tindak Lanjut</option>
            <option value="recommendation">💡 Rekomendasi</option>
            <option value="matrix_item">📊 Matrix Item</option>
            <option value="evidence">📎 Evidence</option>
          </select>
        </div>

        <div className="filter-stats">
          <span>Menampilkan <strong>{filteredItems.length}</strong> dari <strong>{reviewedItems.length}</strong> item</span>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Tidak Ada Riwayat Review</h3>
          <p>Belum ada item yang direview dengan filter yang dipilih.</p>
        </div>
      ) : (
        <div className="review-history-list">
          {filteredItems.map((item, index) => (
            <div key={`${item.review_type}-${item.id}-${index}`} className={`review-card ${item.status}`}>
              <div className="review-card-header">
                <h3>{item.report_title || item.matrix_title || item.original_filename || 'Review Item'}</h3>
                <div className="badges">
                  <span className={`badge ${getReviewTypeColor(item.review_type)}`}>
                    {getReviewTypeLabel(item.review_type)}
                  </span>
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {renderReviewContent(item)}

              {/* Review Information */}
              <div className="review-info">
                <div className="review-info-header">
                  <h4>📋 Informasi Review</h4>
                </div>
                <div className="review-info-content">
                  <div className="info-row">
                    <span className="info-label">Direview oleh:</span>
                    <span className="info-value">{item.reviewer_name || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Tanggal Review:</span>
                    <span className="info-value">
                      {item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className="info-value">
                      {item.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                    </span>
                  </div>
                  
                  {/* Review Notes/Explanation */}
                  {getReviewNotes(item) && (
                    <div className="review-notes">
                      <div className="notes-header">
                        <span className="notes-icon">
                          {item.status === 'approved' ? '💬' : '⚠️'}
                        </span>
                        <span className="notes-title">
                          {item.status === 'approved' ? 'Catatan Persetujuan:' : 'Alasan Penolakan:'}
                        </span>
                      </div>
                      <div className={`notes-content ${item.status === 'rejected' ? 'rejection' : 'approval'}`}>
                        {getReviewNotes(item)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="review-card-meta">
                <span className="user-info">
                  👤 Diajukan oleh: {item.user_name} ({item.user_institution})
                </span>
                <span className="date">
                  📅 Diajukan: {new Date(item.report_created_at || item.matrix_created_at || item.uploaded_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
