import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import '../styles/EvidenceDatabaseComponent.css';

interface Evidence {
  id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  uploaded_by_name: string;
  uploader_institution: string;
  uploaded_at: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  tags: string[];
  temuan: string;
  rekomendasi: string;
  matrix_title: string;
  target_opd: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface SearchFilters {
  search: string;
  category: string;
  status: string;
  priority: string;
  file_type: string;
  uploaded_by: string;
  date_from: string;
  date_to: string;
  sort_by: string;
  sort_order: 'ASC' | 'DESC';
}

export function EvidenceDatabaseComponent() {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    category: '',
    status: '',
    priority: '',
    file_type: '',
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
  const [categories, setCategories] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadCategories();
    searchEvidence();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchEvidence();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters, pagination.page]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/evidence/meta/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
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

      const response = await apiClient.get(`/evidence/search?${params}`);
      
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
      category: '',
      status: '',
      priority: '',
      file_type: '',
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
      const response = await apiClient.get(`/evidence/${evidenceId}/download`, {
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
      const response = await apiClient.put(`/evidence/${selectedEvidence.id}/review`, {
        status: reviewStatus,
        review_notes: reviewNotes
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
      pending: { text: '⏳ Pending', class: 'status-pending' },
      approved: { text: '✅ Approved', class: 'status-approved' },
      rejected: { text: '❌ Rejected', class: 'status-rejected' },
      archived: { text: '📦 Archived', class: 'status-archived' }
    };
    return badges[status as keyof typeof badges] || { text: status, class: 'status-default' };
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: { text: '🟢 Rendah', class: 'priority-low' },
      medium: { text: '🔵 Sedang', class: 'priority-medium' },
      high: { text: '🟡 Tinggi', class: 'priority-high' },
      critical: { text: '🔴 Kritis', class: 'priority-critical' }
    };
    return badges[priority as keyof typeof badges] || { text: priority, class: 'priority-default' };
  };

  const canReview = user?.role === 'inspektorat' || user?.role === 'super_admin';

  return (
    <div className="evidence-database-component">
      <div className="database-header">
        <div className="header-content">
          <h2>🗄️ Database Evidence</h2>
          <p>Kelola dan cari file evidence dari semua matrix audit</p>
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
            placeholder="Cari berdasarkan nama file, deskripsi, temuan, atau rekomendasi..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Kategori</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
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
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                  <option value="archived">📦 Archived</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Prioritas</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                  <option value="">Semua Prioritas</option>
                  <option value="low">🟢 Rendah</option>
                  <option value="medium">🔵 Sedang</option>
                  <option value="high">🟡 Tinggi</option>
                  <option value="critical">🔴 Kritis</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Tipe File</label>
                <select
                  value={filters.file_type}
                  onChange={(e) => handleFilterChange('file_type', e.target.value)}
                >
                  <option value="">Semua Tipe</option>
                  <option value="pdf">📄 PDF</option>
                  <option value="jpg">🖼️ JPG</option>
                  <option value="png">🖼️ PNG</option>
                  <option value="doc">📝 DOC</option>
                  <option value="docx">📝 DOCX</option>
                  <option value="xls">📊 XLS</option>
                  <option value="xlsx">📊 XLSX</option>
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
                  <option value="original_filename">Nama File</option>
                  <option value="file_size">Ukuran File</option>
                  <option value="priority">Prioritas</option>
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
            <p>Coba ubah filter pencarian Anda</p>
          </div>
        ) : (
          <>
            <div className="evidence-grid">
              {evidence.map((item) => (
                <div key={item.id} className="evidence-card">
                  <div className="card-header">
                    <div className="file-info">
                      <span className="file-name">{item.original_filename}</span>
                      <span className="file-size">{formatFileSize(item.file_size)}</span>
                    </div>
                    <div className="card-badges">
                      <span className={`status-badge ${getStatusBadge(item.status).class}`}>
                        {getStatusBadge(item.status).text}
                      </span>
                      <span className={`priority-badge ${getPriorityBadge(item.priority).class}`}>
                        {getPriorityBadge(item.priority).text}
                      </span>
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="description">
                      <strong>Deskripsi:</strong> {item.description}
                    </div>
                    
                    <div className="matrix-info">
                      <strong>Matrix:</strong> {item.matrix_title}
                      <br />
                      <strong>Target OPD:</strong> {item.target_opd}
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
                      className="btn-download"
                      onClick={() => handleDownload(item.id, item.original_filename)}
                    >
                      📥 Download
                    </button>
                    
                    {canReview && item.status === 'pending' && (
                      <button
                        className="btn-review"
                        onClick={() => {
                          setSelectedEvidence(item);
                          setShowReviewModal(true);
                        }}
                      >
                        👁️ Review
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

      {/* Review Modal */}
      {showReviewModal && selectedEvidence && (
        <div className="modal-overlay">
          <div className="review-modal">
            <div className="modal-header">
              <h3>👁️ Review Evidence</h3>
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
                <strong>File:</strong> {selectedEvidence.original_filename}
                <br />
                <strong>Deskripsi:</strong> {selectedEvidence.description}
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