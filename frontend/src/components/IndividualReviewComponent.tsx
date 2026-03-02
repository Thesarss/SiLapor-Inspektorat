import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';

interface Props {
  item: any;
  onReviewComplete: () => void;
}

export function IndividualReviewComponent({ item, onReviewComplete }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !reviewNotes.trim()) {
      notify.warning('Catatan review wajib diisi untuk penolakan');
      return;
    }

    setReviewing(true);
    try {
      let endpoint = '';
      let payload = {};

      if (item.review_type === 'matrix_item') {
        endpoint = `/matrix/item/${item.id}/review`;
        payload = { status, reviewNotes: reviewNotes.trim() };
      } else if (item.review_type === 'evidence') {
        endpoint = `/evidence/${item.id}/review`;
        payload = { status, review_notes: reviewNotes.trim() };
      } else if (item.review_type === 'recommendation') {
        endpoint = status === 'approved' 
          ? `/followup-recommendations/${item.id}/approve`
          : `/followup-recommendations/${item.id}/reject`;
        payload = status === 'rejected' ? { notes: reviewNotes.trim() } : {};
      } else if (item.review_type === 'follow_up') {
        endpoint = status === 'approved'
          ? `/follow-ups/${item.id}/approve`
          : `/follow-ups/${item.id}/reject`;
        payload = status === 'rejected' ? { notes: reviewNotes.trim() } : {};
      }

      const method = endpoint.includes('/approve') || endpoint.includes('/reject') ? 'post' : 'put';
      await apiClient[method](endpoint, payload);

      notify.success(`Item berhasil di-${status === 'approved' ? 'setujui' : 'tolak'}`);
      setShowReviewForm(false);
      setReviewNotes('');
      setReviewAction(null);
      onReviewComplete();
    } catch (error: any) {
      console.error('Review error:', error);
      notify.error(`Gagal ${status === 'approved' ? 'menyetujui' : 'menolak'}: ${error.response?.data?.error || error.message}`);
    } finally {
      setReviewing(false);
    }
  };

  const openReviewForm = (action: 'approved' | 'rejected') => {
    setReviewAction(action);
    setShowReviewForm(true);
    setReviewNotes('');
  };

  const closeReviewForm = () => {
    setShowReviewForm(false);
    setReviewAction(null);
    setReviewNotes('');
  };

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      let downloadUrl = '';
      
      if (item.review_type === 'recommendation') {
        downloadUrl = `/followup-recommendations/recommendations/files/download/${fileId}`;
      } else if (item.review_type === 'follow_up') {
        downloadUrl = `/followup-items/files/download/${fileId}`;
      } else if (item.review_type === 'matrix_item') {
        downloadUrl = `/matrix/item/${item.id}/evidence`;
      } else if (item.review_type === 'evidence') {
        downloadUrl = `/evidence/${fileId}/download`;
      }

      const response = await apiClient.get(downloadUrl, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      notify.error('Gagal download file: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      'pending': { label: '⏳ Pending', class: 'badge-warning' },
      'submitted': { label: '📤 Submitted', class: 'badge-info' },
      'approved': { label: '✅ Approved', class: 'badge-success' },
      'rejected': { label: '❌ Rejected', class: 'badge-danger' },
      'needs_revision': { label: '🔄 Needs Revision', class: 'badge-warning' }
    };
    
    const statusInfo = statusMap[status] || { label: status, class: 'badge-secondary' };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="individual-review-item">
      <div className="review-item-header">
        <div className="item-info">
          <h4 className="item-title">
            {item.review_type === 'matrix_item' && `Matrix Item #${item.item_number}`}
            {item.review_type === 'recommendation' && `Rekomendasi: ${item.title || item.temuan?.substring(0, 50) + '...'}`}
            {item.review_type === 'follow_up' && `Follow Up: ${item.title}`}
            {item.review_type === 'evidence' && `Evidence: ${item.filename}`}
          </h4>
          <div className="item-meta">
            <span className="meta-item">
              🏢 {item.institution || item.opd_institution || item.target_opd || 'N/A'}
            </span>
            <span className="meta-item">
              👤 {item.submitted_by_name || item.opd_user_name || item.created_by_name || 'N/A'}
            </span>
            <span className="meta-item">
              📅 {formatDate(item.submitted_at || item.created_at || item.updated_at)}
            </span>
          </div>
        </div>
        <div className="item-status">
          {getStatusBadge(item.status)}
        </div>
      </div>

      <div className="review-item-content">
        {/* Matrix Item Content */}
        {item.review_type === 'matrix_item' && (
          <div className="matrix-content">
            <div className="content-section">
              <h5>🔍 Temuan</h5>
              <p>{item.temuan}</p>
            </div>
            <div className="content-section">
              <h5>❓ Penyebab</h5>
              <p>{item.penyebab}</p>
            </div>
            <div className="content-section">
              <h5>💡 Rekomendasi</h5>
              <p>{item.rekomendasi}</p>
            </div>
            {item.tindak_lanjut && (
              <div className="content-section">
                <h5>📝 Tindak Lanjut dari OPD</h5>
                <p>{item.tindak_lanjut}</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendation Content */}
        {item.review_type === 'recommendation' && (
          <div className="recommendation-content">
            <div className="content-section">
              <h5>📋 Temuan</h5>
              <p>{item.temuan}</p>
            </div>
            <div className="content-section">
              <h5>💡 Rekomendasi</h5>
              <p>{item.rekomendasi}</p>
            </div>
            {item.response && (
              <div className="content-section">
                <h5>📝 Respon OPD</h5>
                <p>{item.response}</p>
              </div>
            )}
          </div>
        )}

        {/* Follow Up Content */}
        {item.review_type === 'follow_up' && (
          <div className="followup-content">
            <div className="content-section">
              <h5>📋 Deskripsi</h5>
              <p>{item.description}</p>
            </div>
            {item.response && (
              <div className="content-section">
                <h5>📝 Respon</h5>
                <p>{item.response}</p>
              </div>
            )}
          </div>
        )}

        {/* Evidence Content */}
        {item.review_type === 'evidence' && (
          <div className="evidence-content">
            <div className="content-section">
              <h5>📎 File Evidence</h5>
              <p><strong>Filename:</strong> {item.filename}</p>
              <p><strong>Size:</strong> {item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</p>
              {item.description && <p><strong>Deskripsi:</strong> {item.description}</p>}
            </div>
          </div>
        )}

        {/* Files Section */}
        {item.files && item.files.length > 0 && (
          <div className="files-section">
            <h5>📎 File Lampiran</h5>
            <div className="files-list">
              {item.files.map((file: any, index: number) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.filename}</span>
                  <span className="file-size">
                    {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </span>
                  <button
                    onClick={() => downloadFile(file.id, file.filename)}
                    className="btn-download-small"
                  >
                    📥 Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence File for Matrix Items */}
        {item.review_type === 'matrix_item' && item.evidence_filename && (
          <div className="files-section">
            <h5>📎 Evidence File</h5>
            <div className="file-item">
              <span className="file-name">{item.evidence_filename}</span>
              <button
                onClick={() => downloadFile(item.id, item.evidence_filename)}
                className="btn-download-small"
              >
                📥 Download
              </button>
            </div>
          </div>
        )}

        {/* Previous Review Notes */}
        {item.review_notes && (
          <div className="previous-review">
            <h5>📝 Catatan Review Sebelumnya</h5>
            <p>{item.review_notes}</p>
            {item.reviewed_at && (
              <small>Direview pada: {formatDate(item.reviewed_at)}</small>
            )}
          </div>
        )}
      </div>

      {/* Review Actions */}
      {item.status === 'submitted' && (
        <div className="review-actions">
          <button
            onClick={() => openReviewForm('approved')}
            className="btn-approve"
            disabled={reviewing}
          >
            ✅ Setujui
          </button>
          <button
            onClick={() => openReviewForm('rejected')}
            className="btn-reject"
            disabled={reviewing}
          >
            ❌ Tolak
          </button>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="review-form-overlay">
          <div className="review-form-modal">
            <div className="modal-header">
              <h3>
                {reviewAction === 'approved' ? '✅ Setujui Item' : '❌ Tolak Item'}
              </h3>
              <button onClick={closeReviewForm} className="btn-close">×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>
                  Catatan Review {reviewAction === 'rejected' ? '(Wajib)' : '(Opsional)'}:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approved' 
                      ? 'Berikan catatan persetujuan (opsional)...'
                      : 'Berikan alasan penolakan (wajib)...'
                  }
                  rows={4}
                  className="form-textarea"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={closeReviewForm}
                className="btn-cancel"
                disabled={reviewing}
              >
                Batal
              </button>
              <button
                onClick={() => handleReview(reviewAction!)}
                className={reviewAction === 'approved' ? 'btn-approve' : 'btn-reject'}
                disabled={reviewing || (reviewAction === 'rejected' && !reviewNotes.trim())}
              >
                {reviewing ? '⏳ Processing...' : (reviewAction === 'approved' ? '✅ Setujui' : '❌ Tolak')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="quick-links">
        {item.review_type === 'recommendation' && item.followup_item_id && (
          <Link 
            to={`/reports/${item.report_id}`} 
            className="link-detail"
          >
            📋 Lihat Laporan Lengkap
          </Link>
        )}
        {item.review_type === 'matrix_item' && item.assignment_id && (
          <Link 
            to={`/matrix/review/${item.assignment_id}`} 
            className="link-detail"
          >
            📊 Lihat Matrix Lengkap
          </Link>
        )}
        {item.review_type === 'follow_up' && item.report_id && (
          <Link 
            to={`/reports/${item.report_id}`} 
            className="link-detail"
          >
            📋 Lihat Laporan
          </Link>
        )}
      </div>
    </div>
  );
}