import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import { ReportProgressDetail } from '../components/ReportProgressDetail';
import '../styles/ReportProgressDetail.css';

export function ApprovalsPage() {
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState<string | null>(null);
  const [revisionPoints, setRevisionPoints] = useState<string[]>(['']);
  const [showProgressDetail, setShowProgressDetail] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPendingReviews();
  }, []);

  const fetchAllPendingReviews = async () => {
    try {
      console.log('🔄 Fetching all pending reviews...');
      const response = await apiClient.get('/follow-ups/all-pending');
      console.log('📊 API Response:', response);
      console.log('📊 Response data:', response.data);
      
      if (response.data.success) {
        console.log('✅ Reviews loaded:', response.data.data);
        setAllReviews(response.data.data || []);
      } else {
        console.error('❌ API returned error:', response.data.error);
        notify.error('Gagal memuat data review');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch pending reviews:', error);
      console.error('❌ Error response:', error.response);
      notify.error('Gagal memuat data review');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (item: any) => {
    setActionLoading(item.id);
    try {
      let endpoint = '';
      if (item.review_type === 'evidence') {
        endpoint = `/evidence/${item.id}/review`;
        await apiClient.put(endpoint, { status: 'approved' });
      } else if (item.review_type === 'matrix_item') {
        endpoint = `/matrix/item/${item.id}/review`;
        await apiClient.post(endpoint, { status: 'approved' });
      } else if (item.review_type === 'recommendation') {
        endpoint = `/followup-recommendations/recommendations/${item.id}/approve`;
        await apiClient.post(endpoint);
      } else if (item.review_type === 'follow_up') {
        endpoint = `/follow-ups/${item.id}/approve`;
        await apiClient.post(endpoint);
      }
      
      notify.success('Item berhasil disetujui');
      fetchAllPendingReviews();
    } catch (error: any) {
      console.error('Failed to approve item:', error);
      notify.error('Gagal menyetujui item');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectItem = async (item: any, notes: string = '') => {
      if (!notes.trim() && item.review_type !== 'matrix_item') {
        notify.warning('Catatan penolakan wajib diisi');
        return;
      }

      setActionLoading(item.id);
      try {
        let endpoint = '';
        if (item.review_type === 'evidence') {
          endpoint = `/evidence/${item.id}/review`;
          await apiClient.put(endpoint, { status: 'rejected', review_notes: notes });
        } else if (item.review_type === 'matrix_item') {
          endpoint = `/matrix/item/${item.id}/review`;
          await apiClient.post(endpoint, { status: 'rejected', reviewNotes: notes });
        } else if (item.review_type === 'recommendation') {
          endpoint = `/followup-recommendations/recommendations/${item.id}/reject`;
          await apiClient.post(endpoint, { notes });
        } else if (item.review_type === 'follow_up') {
          endpoint = `/follow-ups/${item.id}/reject`;
          await apiClient.post(endpoint, { notes });
        }

        notify.success('Item berhasil ditolak');
        fetchAllPendingReviews();
        closeRejectForm();
      } catch (error: any) {
        console.error('Failed to reject item:', error);
        notify.error('Gagal menolak item');
      } finally {
        setActionLoading(null);
      }
    }

  const openRejectForm = (reportId: string) => {
    setShowRejectForm(reportId);
    setShowRevisionForm(null);
    setRejectNote('');
  };

  const closeRejectForm = () => {
    setShowRejectForm(null);
    setRejectNote('');
  };

  const openRevisionForm = (reportId: string) => {
    setShowRevisionForm(reportId);
    setShowRejectForm(null);
    setRevisionPoints(['']);
  };

  const closeRevisionForm = () => {
    setShowRevisionForm(null);
    setRevisionPoints(['']);
  };

  const addRevisionPoint = () => {
    setRevisionPoints([...revisionPoints, '']);
  };

  const removeRevisionPoint = (index: number) => {
    if (revisionPoints.length > 1) {
      setRevisionPoints(revisionPoints.filter((_, i) => i !== index));
    }
  };

  const updateRevisionPoint = (index: number, value: string) => {
    const updated = [...revisionPoints];
    updated[index] = value;
    setRevisionPoints(updated);
  };

  const handleRequestRevision = async (reportId: string) => {
    const validPoints = revisionPoints.filter(p => p.trim());
    if (validPoints.length === 0) {
      notify.warning('Minimal satu poin revisi harus diisi');
      return;
    }
    setActionLoading(reportId);
    try {
      await apiClient.post(`/revisions/report/${reportId}`, { descriptions: validPoints });
      closeRevisionForm();
      fetchAllPendingReviews();
      notify.success('Permintaan revisi berhasil dikirim');
    } catch (error: any) {
      console.error('Failed to request revision:', error);
      notify.error('Gagal mengirim permintaan revisi');
    } finally {
      setActionLoading(null);
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

  const renderReviewContent = (item: any) => {
    switch (item.review_type) {
      case 'follow_up':
        return (
          <div className="followup-content">
            <h4>📝 Tindak Lanjut yang Diajukan:</h4>
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
              {item.tindak_lanjut && (
                <div><strong>Tindak Lanjut:</strong> {item.tindak_lanjut}</div>
              )}
              {item.evidence_filename && (
                <div className="evidence-info">
                  <strong>Evidence:</strong> 
                  <a href={`/api/matrix/item/${item.id}/evidence`} target="_blank" rel="noopener noreferrer">
                    📎 {item.evidence_filename}
                  </a>
                </div>
              )}
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
              {item.tags && (
                <div><strong>Tags:</strong> {item.tags.join(', ')}</div>
              )}
              <div className="file-info">
                <a href={`/api/evidence/${item.id}/download`} target="_blank" rel="noopener noreferrer">
                  📥 Download File
                </a>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div className="content-preview">{item.content || 'No content available'}</div>;
    }
  };

  const canRequestRevision = (item: any) => {
    return item.review_type === 'follow_up' && item.report_id;
  };

  if (loading) return <div className="loading">Memuat data review...</div>;

  console.log('📊 Current allReviews state:', allReviews);
  console.log('📊 allReviews.length:', allReviews.length);

  return (
    <div className="approvals">
      <h1>✅ Review Matrix</h1>
      
      {allReviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>Semua Item Sudah Direview</h3>
          <p>Tidak ada item yang menunggu review saat ini.</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Debug: allReviews.length = {allReviews.length}
          </p>
        </div>
      ) : (
        <>
          <div className="info-box info-yellow">
            <span className="info-icon">⏳</span>
            <span><strong>{allReviews.length}</strong> item menunggu review Anda</span>
          </div>

          <div className="approval-list">
            {allReviews.map((item) => (
              <div key={`${item.review_type}-${item.id}`} className="approval-card">
                <div className="approval-card-header">
                  <h3>{item.report_title || item.matrix_title || item.original_filename || 'Review Item'}</h3>
                  <div className="badges">
                    <span className={`badge ${getReviewTypeColor(item.review_type)}`}>
                      {getReviewTypeLabel(item.review_type)}
                    </span>
                    <span className="badge badge-pending">Menunggu Review</span>
                  </div>
                </div>
                
                {item.report_description && (
                  <p className="report-desc">{item.report_description}</p>
                )}
                
                {renderReviewContent(item)}
                
                <div className="approval-card-meta">
                  <span className="user-info">
                    👤 {item.user_name} ({item.user_institution || item.uploader_institution})
                  </span>
                  <span className="date">
                    📅 {new Date(item.report_created_at || item.matrix_created_at || item.uploaded_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  {item.report_id && (
                    <>
                      <Link to={`/reports/${item.report_id}`} className="btn-link">
                        👁️ Lihat Detail & File
                      </Link>
                      <button 
                        onClick={() => setShowProgressDetail(item.report_id)}
                        className="btn-link"
                        style={{ background: 'none', border: 'none', color: '#3498db', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        📊 Progress Detail
                      </button>
                      <Link to={`/reports/${item.report_id}/metrics`} className="btn-link">
                        📊 Kelola Temuan
                      </Link>
                    </>
                  )}
                  {item.review_type === 'matrix_item' && item.assignment_id && (
                    <Link to={`/matrix/review/${item.assignment_id}`} className="btn-link">
                      🔍 Review Matrix Items
                    </Link>
                  )}
                </div>
                
                {showRejectForm === item.id ? (
                  <div className="reject-form">
                    <label className="form-label-danger">❌ Alasan Penolakan:</label>
                    <textarea
                      placeholder="Jelaskan alasan penolakan..."
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={3}
                    />
                    <div className="form-actions">
                      <button 
                        type="button"
                        className="btn-danger" 
                        onClick={() => handleRejectItem(item, rejectNote)}
                        disabled={actionLoading === item.id}
                      >
                        {actionLoading === item.id ? '⏳ Memproses...' : '❌ Konfirmasi Tolak'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={closeRejectForm}>
                        Batal
                      </button>
                    </div>
                  </div>
                ) : showRevisionForm === item.id && canRequestRevision(item) ? (
                  <div className="revision-form">
                    <label className="form-label-warning">📝 Poin-poin yang Perlu Direvisi:</label>
                    <p className="form-hint">Tambahkan poin-poin spesifik yang perlu diperbaiki oleh pengguna.</p>
                    
                    {revisionPoints.map((point, index) => (
                      <div key={index} className="revision-point">
                        <div className="revision-point-input">
                          <label>Poin {index + 1}:</label>
                          <textarea
                            placeholder="Contoh: Foto bukti kurang jelas, mohon upload ulang dengan resolusi lebih tinggi"
                            value={point}
                            onChange={(e) => updateRevisionPoint(index, e.target.value)}
                            rows={2}
                          />
                        </div>
                        {revisionPoints.length > 1 && (
                          <button type="button" className="btn-danger btn-sm" onClick={() => removeRevisionPoint(index)}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button type="button" className="btn-success" onClick={addRevisionPoint}>
                      ➕ Tambah Poin Revisi
                    </button>
                    
                    <div className="form-actions">
                      <button 
                        type="button"
                        className="btn-warning" 
                        onClick={() => handleRequestRevision(item.report_id)}
                        disabled={actionLoading === item.id}
                      >
                        {actionLoading === item.id ? '⏳ Memproses...' : '📤 Kirim Permintaan Revisi'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={closeRevisionForm}>
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="approval-actions">
                    <button 
                      type="button"
                      className="btn-success" 
                      onClick={() => handleApproveItem(item)}
                      disabled={actionLoading === item.id}
                    >
                      {actionLoading === item.id ? '⏳ Memproses...' : '✅ Setujui'}
                    </button>
                    {canRequestRevision(item) && (
                      <button type="button" className="btn-warning" onClick={() => openRevisionForm(item.id)}>
                        📝 Minta Revisi
                      </button>
                    )}
                    <button type="button" className="btn-danger" onClick={() => openRejectForm(item.id)}>
                      ❌ Tolak
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Progress Detail Modal */}
      {showProgressDetail && (
        <ReportProgressDetail
          reportId={showProgressDetail}
          onClose={() => setShowProgressDetail(null)}
        />
      )}
    </div>
  );
}
