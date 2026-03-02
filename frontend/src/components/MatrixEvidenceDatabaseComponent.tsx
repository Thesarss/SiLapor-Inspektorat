import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import '../styles/MatrixEvidenceDatabaseComponent.css';

interface MatrixEvidence {
  id: string;
  matrix_report_id: string;
  matrix_title: string;
  target_opd: string;
  item_number: number;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindak_lanjut: string;
  evidence_filename: string;
  evidence_file_size: number;
  evidence_file_path: string;
  status: 'submitted' | 'approved' | 'rejected';
  uploaded_by_name: string;
  uploader_institution: string;
  uploaded_at: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface SearchFilters {
  search: string;
  matrix_title: string;
  target_opd: string;
  status: string;
  uploaded_by: string;
  date_from: string;
  date_to: string;
  sort_by: string;
  sort_order: 'ASC' | 'DESC';
}

export function MatrixEvidenceDatabaseComponent() {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<MatrixEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    matrix_title: '',
    target_opd: '',
    status: '',
    uploaded_by: '',
    date_from: '',
    date_to: '',
    sort_by: 'uploaded_at',
    sort_order: 'DESC'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [matrixTitles, setMatrixTitles] = useState<string[]>([]);
  const [targetOPDs, setTargetOPDs] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<MatrixEvidence | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadMetadata();
    searchEvidence();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchEvidence();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters, pagination.page]);

  const loadMetadata = async () => {
    try {
      // Load matrix titles and target OPDs for filters
      const response = await apiClient.get('/matrix/evidence/metadata');
      if (response.data.success) {
        setMatrixTitles(response.data.data.matrixTitles || []);
        setTargetOPDs(response.data.data.targetOPDs || []);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  const searchEvidence = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await apiClient.get(`/matrix/evidence/search?${params}`);
      
      if (response.data.success) {
        setEvidence(response.data.data.evidence);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          pages: response.data.data.pagination.pages
        }));
      }
    } catch (error) {
      console.error('Error searching evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      matrix_title: '',
      target_opd: '',
      status: '',
      uploaded_by: '',
      date_from: '',
      date_to: '',
      sort_by: 'uploaded_at',
      sort_order: 'DESC'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDownload = async (evidenceId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/matrix/item/${evidenceId}/evidence`, {
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
    } catch (error) {
      alert('Gagal mendownload file');
    }
  };

  const handleReview = async () => {
    if (!selectedEvidence) return;

    try {
      const response = await apiClient.post(`/matrix/item/${selectedEvidence.id}/review`, {
        status: reviewStatus,
        reviewNotes: reviewNotes
      });

      if (response.data.success) {
        alert(`✅ Evidence berhasil di-${reviewStatus === 'approved' ? 'approve' : 'reject'}`);
        setShowReviewModal(false);
        setSelectedEvidence(null);
        setReviewNotes('');
        searchEvidence(); // Refresh data
      }
    } catch (error: any) {
      alert(`❌ Gagal review: ${error.response?.data?.error || error.message}`);
    }
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

  const getStatusBadge = (status: string) => {
    const badges = {
      submitted: { text: '📤 Submitted', class: 'status-submitted' },
      approved: { text: '✅ Approved', class: 'status-approved' },
      rejected: { text: '❌ Rejected', class: 'status-rejected' }
    };
    return badges[status as keyof typeof badges] || { text: status, class: 'status-default' };
  };

  const canReview = user?.role === 'inspektorat' || user?.role === 'super_admin';

  return (
    <div className="matrix-evidence-database">
      <div className="database-header">
        <div className="header-content">
          <h2>🗄️ Database Evidence Matrix</h2>
          <p>Kelola dan cari file evidence dari matrix audit yang telah diupload OPD</p>
        </div>
        <div className="header-actions">
          <button
            className={`btn-filter ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filter
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Cari berdasarkan nama file, temuan, rekomendasi, atau tindak lanjut..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Matrix Title</label>
                <select
                  value={filters.matrix_title}
                  onChange={(e) => handleFilterChange('matrix_title', e.target.value)}
                >
                  <option value="">Semua Matrix</option>
                  {matrixTitles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Target OPD</label>
                <select
                  value={filters.target_opd}
                  onChange={(e) => handleFilterChange('target_opd', e.target.value)}
                >
                  <option value="">Semua OPD</option>
                  {targetOPDs.map(opd => (
                    <option key={opd} value={opd}>{opd}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="submitted">📤 Submitted</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Tanggal Dari</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Tanggal Sampai</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                />
              </div>
            </div>

            <div className="filters-actions">
              <button className="btn-clear" onClick={clearFilters}>
                🗑️ Clear Filters
              </button>
              <div className="sort-controls">
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                >
                  <option value="uploaded_at">Tanggal Upload</option>
                  <option value="evidence_filename">Nama File</option>
                  <option value="matrix_title">Matrix Title</option>
                  <option value="target_opd">Target OPD</option>
                  <option value="status">Status</option>
                </select>
                <button
                  className="btn-sort"
                  onClick={() => handleFilterChange('sort_order', filters.sort_order === 'ASC' ? 'DESC' : 'ASC')}
                >
                  {filters.sort_order === 'ASC' ? '⬆️' : '⬇️'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="results-section">
        <div className="results-header">
          <span className="results-count">
            {pagination.total} evidence ditemukan
          </span>
        </div>

        {loading ? (
          <div className="loading">Mencari evidence...</div>
        ) : evidence.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Tidak ada evidence ditemukan</h3>
            <p>Belum ada evidence yang diupload dari matrix audit atau coba ubah filter pencarian</p>
          </div>
        ) : (
          <>
            <div className="evidence-grid">
              {evidence.map((item) => (
                <div key={item.id} className="evidence-card">
                  <div className="card-header">
                    <div className="file-info">
                      <span className="file-name">{item.evidence_filename}</span>
                      <span className="file-size">{formatFileSize(item.evidence_file_size)}</span>
                    </div>
                    <span className={`status-badge ${getStatusBadge(item.status).class}`}>
                      {getStatusBadge(item.status).text}
                    </span>
                  </div>

                  <div className="card-content">
                    <div className="matrix-info">
                      <strong>Matrix:</strong> {item.matrix_title}
                      <br />
                      <strong>Target OPD:</strong> {item.target_opd}
                      <br />
                      <strong>Item #{item.item_number}</strong>
                    </div>

                    <div className="temuan-info">
                      <strong>Temuan:</strong> {item.temuan.substring(0, 100)}...
                    </div>

                    <div className="tindak-lanjut-info">
                      <strong>Tindak Lanjut:</strong> {item.tindak_lanjut.substring(0, 100)}...
                    </div>

                    <div className="upload-info">
                      <strong>Diupload oleh:</strong> {item.uploaded_by_name} ({item.uploader_institution})
                      <br />
                      <strong>Tanggal:</strong> {formatDate(item.uploaded_at)}
                    </div>

                    {item.reviewed_by_name && (
                      <div className="review-info">
                        <strong>Direview oleh:</strong> {item.reviewed_by_name}
                        <br />
                        <strong>Tanggal Review:</strong> {formatDate(item.reviewed_at!)}
                        {item.review_notes && (
                          <>
                            <br />
                            <strong>Catatan:</strong> {item.review_notes}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-detail"
                      onClick={() => {
                        setSelectedEvidence(item);
                        setShowDetailModal(true);
                      }}
                    >
                      👁️ Detail
                    </button>
                    
                    <button
                      className="btn-download"
                      onClick={() => handleDownload(item.id, item.evidence_filename)}
                    >
                      📥 Download
                    </button>
                    
                    {canReview && item.status === 'submitted' && (
                      <button
                        className="btn-review"
                        onClick={() => {
                          setSelectedEvidence(item);
                          setShowReviewModal(true);
                        }}
                      >
                        ⚖️ Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="btn-page"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  ← Previous
                </button>
                
                <span className="page-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                
                <button
                  className="btn-page"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedEvidence && (
        <div className="modal-overlay">
          <div className="detail-modal">
            <div className="modal-header">
              <h3>📋 Detail Evidence Matrix</h3>
              <button
                className="btn-close"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEvidence(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="detail-section">
                <h4>📄 File Information</h4>
                <p><strong>Nama File:</strong> {selectedEvidence.evidence_filename}</p>
                <p><strong>Ukuran:</strong> {formatFileSize(selectedEvidence.evidence_file_size)}</p>
                <p><strong>Status:</strong> {getStatusBadge(selectedEvidence.status).text}</p>
              </div>

              <div className="detail-section">
                <h4>📊 Matrix Information</h4>
                <p><strong>Matrix:</strong> {selectedEvidence.matrix_title}</p>
                <p><strong>Target OPD:</strong> {selectedEvidence.target_opd}</p>
                <p><strong>Item Number:</strong> #{selectedEvidence.item_number}</p>
              </div>

              <div className="detail-section">
                <h4>🔍 Temuan</h4>
                <p>{selectedEvidence.temuan}</p>
              </div>

              <div className="detail-section">
                <h4>❓ Penyebab</h4>
                <p>{selectedEvidence.penyebab}</p>
              </div>

              <div className="detail-section">
                <h4>💡 Rekomendasi</h4>
                <p>{selectedEvidence.rekomendasi}</p>
              </div>

              <div className="detail-section">
                <h4>📝 Tindak Lanjut</h4>
                <p>{selectedEvidence.tindak_lanjut}</p>
              </div>

              <div className="detail-section">
                <h4>👤 Upload Information</h4>
                <p><strong>Diupload oleh:</strong> {selectedEvidence.uploaded_by_name}</p>
                <p><strong>Institusi:</strong> {selectedEvidence.uploader_institution}</p>
                <p><strong>Tanggal:</strong> {formatDate(selectedEvidence.uploaded_at)}</p>
              </div>

              {selectedEvidence.reviewed_by_name && (
                <div className="detail-section">
                  <h4>⚖️ Review Information</h4>
                  <p><strong>Direview oleh:</strong> {selectedEvidence.reviewed_by_name}</p>
                  <p><strong>Tanggal Review:</strong> {formatDate(selectedEvidence.reviewed_at!)}</p>
                  {selectedEvidence.review_notes && (
                    <p><strong>Catatan:</strong> {selectedEvidence.review_notes}</p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-download"
                onClick={() => handleDownload(selectedEvidence.id, selectedEvidence.evidence_filename)}
              >
                📥 Download File
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEvidence(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedEvidence && (
        <div className="modal-overlay">
          <div className="review-modal">
            <div className="modal-header">
              <h3>⚖️ Review Evidence</h3>
              <button
                className="btn-close"
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedEvidence(null);
                  setReviewNotes('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="evidence-info">
                <strong>File:</strong> {selectedEvidence.evidence_filename}
                <br />
                <strong>Matrix:</strong> {selectedEvidence.matrix_title}
                <br />
                <strong>Diupload oleh:</strong> {selectedEvidence.uploaded_by_name}
              </div>

              <div className="review-form">
                <div className="form-group">
                  <label>Status Review</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="approved"
                        checked={reviewStatus === 'approved'}
                        onChange={(e) => setReviewStatus(e.target.value as 'approved')}
                      />
                      ✅ Approve
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="rejected"
                        checked={reviewStatus === 'rejected'}
                        onChange={(e) => setReviewStatus(e.target.value as 'rejected')}
                      />
                      ❌ Reject
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Catatan Review (Opsional)</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Berikan catatan atau feedback untuk evidence ini..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedEvidence(null);
                  setReviewNotes('');
                }}
              >
                Batal
              </button>
              <button className="btn-primary" onClick={handleReview}>
                💾 Simpan Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}