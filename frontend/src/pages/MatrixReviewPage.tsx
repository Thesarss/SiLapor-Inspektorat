import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import '../styles/MatrixReviewPage.css';

interface MatrixItem {
  id: string;
  item_number: number;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  evidence_filename?: string;
  evidence_file_path?: string;
  evidence_count?: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  review_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  status: string;
  opd_user_name: string;
  opd_institution: string;
  progress_percentage: number;
}

export function MatrixReviewPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MatrixItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'inspektorat' && user?.role !== 'super_admin') {
      navigate('/dashboard');
      return;
    }
    loadAssignmentItems();
  }, [assignmentId, user, navigate]);

  const loadAssignmentItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/matrix/assignment/${assignmentId}/progress`);
      
      if (response.data.success) {
        setAssignment(response.data.data.assignment);
        setItems(response.data.data.items);
      }
    } catch (err: any) {
      console.error('Error loading items:', err);
      setError(err.response?.data?.error || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: MatrixItem) => {
    setSelectedItem(item);
    setReviewNotes(item.review_notes || '');
  };
  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    
    if (status === 'rejected' && !reviewNotes.trim()) {
      notify.warning('Catatan review wajib diisi untuk penolakan');
      return;
    }

    try {
      setReviewing(true);
      
      const response = await apiClient.post(
        `/matrix/item/${selectedItem.id}/review`,
        {
          status,
          reviewNotes: reviewNotes.trim()
        }
      );

      if (response.data.success) {
        notify.success(`Item berhasil di-${status === 'approved' ? 'approve' : 'reject'}`);
        setSelectedItem(null);
        setReviewNotes('');
        loadAssignmentItems();
      }
    } catch (err: any) {
      console.error('Review error:', err);
      notify.error(`Gagal ${status === 'approved' ? 'approve' : 'reject'}: ${err.response?.data?.error || err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  const downloadEvidence = async (itemId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/matrix/item/${itemId}/evidence`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      notify.error('Gagal download evidence');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': '#ffc107',
      'submitted': '#17a2b8',
      'approved': '#28a745',
      'rejected': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  if (loading) {
    return <div className="loading">Memuat data matrix review...</div>;
  }

  if (error) {
    return (
      <div className="matrix-review-page">
        <div className="error-message">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/matrix')} className="btn-back">
            Kembali ke Matrix
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="matrix-review-page">
      <div className="page-header">
        <button onClick={() => navigate('/matrix')} className="btn-back">
          ← Kembali ke Matrix
        </button>
        <div className="header-info">
          <h1>🔍 Review Matrix Assignment</h1>
          <h2>{assignment?.title}</h2>
          {assignment?.description && <p className="description">{assignment.description}</p>}
          <div className="assignment-info">
            <span className="opd-info">
              🏢 {assignment?.opd_institution} - {assignment?.opd_user_name}
            </span>
            <span className="progress-info">
              📊 Progress: {assignment?.progress_percentage || 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="review-container">
        <div className="items-list">
          <h2>Daftar Matrix Items ({items.length})</h2>
          <div className="items-scroll">
            {items.map((item) => (
              <div
                key={item.id}
                className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''} ${item.status}`}
                onClick={() => handleSelectItem(item)}
              >
                <div className="item-header">
                  <span className="item-number">#{item.item_number}</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {item.status === 'pending' && '⏳ Pending'}
                    {item.status === 'submitted' && '📤 Submitted'}
                    {item.status === 'approved' && '✅ Approved'}
                    {item.status === 'rejected' && '❌ Rejected'}
                  </span>
                </div>
                <p className="item-temuan">{item.temuan.substring(0, 100)}...</p>
                {item.evidence_count && item.evidence_count > 0 && (
                  <div className="item-evidence">
                    📎 {item.evidence_count} evidence file(s)
                  </div>
                )}
                {item.tindak_lanjut && (
                  <div className="item-tindak-lanjut">
                    📝 Tindak lanjut tersedia
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="item-detail">
          {selectedItem ? (
            <>
              <div className="detail-header">
                <h2>Review Item #{selectedItem.item_number}</h2>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(selectedItem.status) }}
                >
                  {selectedItem.status === 'pending' && '⏳ Pending'}
                  {selectedItem.status === 'submitted' && '📤 Submitted'}
                  {selectedItem.status === 'approved' && '✅ Approved'}
                  {selectedItem.status === 'rejected' && '❌ Rejected'}
                </span>
              </div>

              <div className="detail-content">
                <div className="detail-section">
                  <h3>🔍 Temuan</h3>
                  <p>{selectedItem.temuan}</p>
                </div>

                <div className="detail-section">
                  <h3>❓ Penyebab</h3>
                  <p>{selectedItem.penyebab}</p>
                </div>

                <div className="detail-section">
                  <h3>💡 Rekomendasi</h3>
                  <p>{selectedItem.rekomendasi}</p>
                </div>

                {selectedItem.tindak_lanjut && (
                  <div className="detail-section">
                    <h3>📝 Tindak Lanjut dari OPD</h3>
                    <div className="tindak-lanjut-content">
                      {selectedItem.tindak_lanjut}
                    </div>
                  </div>
                )}

                {selectedItem.evidence_filename && (
                  <div className="detail-section">
                    <h3>📎 Evidence</h3>
                    <button
                      onClick={() => downloadEvidence(selectedItem.id, selectedItem.evidence_filename!)}
                      className="btn-download"
                    >
                      📥 Download {selectedItem.evidence_filename}
                    </button>
                  </div>
                )}

                {selectedItem.status === 'submitted' && (
                  <div className="review-section">
                    <h3>📋 Review Item</h3>
                    <div className="form-group">
                      <label>Catatan Review:</label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Berikan catatan review (wajib untuk penolakan)..."
                        rows={4}
                        className="form-textarea"
                      />
                    </div>
                    <div className="review-actions">
                      <button
                        onClick={() => handleReview('approved')}
                        disabled={reviewing}
                        className="btn-approve"
                      >
                        {reviewing ? '⏳ Processing...' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleReview('rejected')}
                        disabled={reviewing}
                        className="btn-reject"
                      >
                        {reviewing ? '⏳ Processing...' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedItem.status === 'approved' && (
                  <div className="review-info approved">
                    <h3>✅ Item Telah Disetujui</h3>
                    {selectedItem.review_notes && (
                      <div className="review-notes">
                        <strong>Catatan Review:</strong>
                        <p>{selectedItem.review_notes}</p>
                      </div>
                    )}
                    {selectedItem.reviewed_at && (
                      <p className="review-date">
                        Disetujui pada: {new Date(selectedItem.reviewed_at).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                )}

                {selectedItem.status === 'rejected' && (
                  <div className="review-info rejected">
                    <h3>❌ Item Ditolak</h3>
                    {selectedItem.review_notes && (
                      <div className="review-notes">
                        <strong>Alasan Penolakan:</strong>
                        <p>{selectedItem.review_notes}</p>
                      </div>
                    )}
                    {selectedItem.reviewed_at && (
                      <p className="review-date">
                        Ditolak pada: {new Date(selectedItem.reviewed_at).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">👈</div>
                <h3>Pilih Item untuk Review</h3>
                <p>Pilih salah satu matrix item dari daftar di sebelah kiri untuk melihat detail dan melakukan review.</p>
                <div className="instruction-list">
                  <h4>Proses Review:</h4>
                  <ul>
                    <li>📖 Baca temuan, penyebab, dan rekomendasi</li>
                    <li>📝 Periksa tindak lanjut dari OPD</li>
                    <li>📎 Download dan periksa evidence (jika ada)</li>
                    <li>✅ Approve atau ❌ Reject dengan catatan</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}