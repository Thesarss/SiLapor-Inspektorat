import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IndividualReviewComponent } from '../components/IndividualReviewComponent';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import '../styles/ReviewDashboardPage.css';

interface ReviewItem {
  id: string;
  review_type: 'recommendation' | 'matrix_item' | 'evidence' | 'follow_up';
  status: string;
  days_pending: number;
  institution: string;
  submitted_by_name: string;
  updated_at: string;
  [key: string]: any;
}

interface ReviewStatistics {
  total_reviews: number;
  approval_rate: number;
  avg_response_time: number;
  reviews_by_type: Record<string, number>;
  reviews_by_status: Record<string, number>;
  monthly_trend: Array<{ month: string; count: number }>;
}

export function ReviewDashboardPage() {
  const { user } = useAuth();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkNotes, setBulkNotes] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    priority: 'all',
    type: 'all',
    institution: '',
    limit: 20,
    offset: 0
  });

  const [summary, setSummary] = useState({
    total_pending: 0,
    urgent: 0,
    normal: 0,
    recent: 0,
    by_type: {
      recommendations: 0,
      matrix_items: 0,
      evidence: 0
    }
  });

  useEffect(() => {
    if (user?.role !== 'inspektorat' && user?.role !== 'super_admin') {
      notify.error('Akses ditolak. Hanya Inspektorat yang dapat mengakses halaman ini.');
      return;
    }
    loadReviewQueue();
    loadStatistics();
  }, [user, filters]);

  const loadReviewQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await apiClient.get(`/reviews/queue?${params}`);
      
      if (response.data.success) {
        setReviewItems(response.data.data.items);
        setSummary(response.data.data.summary);
      }
    } catch (error: any) {
      console.error('Error loading review queue:', error);
      notify.error('Gagal memuat review queue: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiClient.get('/reviews/statistics?period=30');
      
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(reviewItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const openBulkModal = (action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) {
      notify.warning('Pilih minimal satu item untuk bulk action');
      return;
    }
    setBulkAction(action);
    setBulkNotes('');
    setShowBulkModal(true);
  };

  const closeBulkModal = () => {
    setShowBulkModal(false);
    setBulkAction(null);
    setBulkNotes('');
  };

  const handleBulkAction = async () => {
    if (bulkAction === 'reject' && !bulkNotes.trim()) {
      notify.warning('Catatan wajib diisi untuk bulk reject');
      return;
    }

    setProcessingBulk(true);
    try {
      const selectedItemsData = reviewItems.filter(item => selectedItems.has(item.id));
      
      const endpoint = bulkAction === 'approve' ? '/reviews/bulk-approve' : '/reviews/bulk-reject';
      const payload = {
        items: selectedItemsData,
        notes: bulkNotes.trim()
      };

      const response = await apiClient.post(endpoint, payload);
      
      if (response.data.success) {
        notify.success(response.data.message);
        setSelectedItems(new Set());
        closeBulkModal();
        loadReviewQueue();
      }
    } catch (error: any) {
      console.error('Bulk action error:', error);
      notify.error('Gagal melakukan bulk action: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingBulk(false);
    }
  };

  const getPriorityColor = (days: number) => {
    if (days >= 7) return '#dc3545'; // Red - Urgent
    if (days >= 3) return '#ffc107'; // Yellow - Normal
    return '#28a745'; // Green - Recent
  };

  const getPriorityLabel = (days: number) => {
    if (days >= 7) return '🔴 Urgent';
    if (days >= 3) return '🟡 Normal';
    return '🟢 Recent';
  };

  if (loading && reviewItems.length === 0) {
    return <div className="loading">Memuat review dashboard...</div>;
  }

  return (
    <div className="review-dashboard-page">
      <div className="dashboard-header">
        <h1>📋 Review Dashboard</h1>
        <p>Kelola dan review semua item yang memerlukan persetujuan Inspektorat</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="statistics-section">
          <div className="stats-cards">
            <div className="stat-card">
              <h3>Total Reviews (30 hari)</h3>
              <div className="stat-number">{statistics.total_reviews}</div>
            </div>
            <div className="stat-card">
              <h3>Approval Rate</h3>
              <div className="stat-number">{statistics.approval_rate}%</div>
            </div>
            <div className="stat-card">
              <h3>Avg Response Time</h3>
              <div className="stat-number">{statistics.avg_response_time} hari</div>
            </div>
            <div className="stat-card">
              <h3>Pending Items</h3>
              <div className="stat-number urgent">{summary.total_pending}</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-cards">
          <div className="summary-card urgent">
            <h4>🔴 Urgent (≥7 hari)</h4>
            <div className="summary-number">{summary.urgent}</div>
          </div>
          <div className="summary-card normal">
            <h4>🟡 Normal (3-6 hari)</h4>
            <div className="summary-number">{summary.normal}</div>
          </div>
          <div className="summary-card recent">
            <h4>🟢 Recent (&lt;3 hari)</h4>
            <div className="summary-number">{summary.recent}</div>
          </div>
        </div>

        <div className="type-summary">
          <h4>By Type:</h4>
          <div className="type-counts">
            <span>📝 Recommendations: {summary.by_type.recommendations}</span>
            <span>📊 Matrix Items: {summary.by_type.matrix_items}</span>
            <span>📎 Evidence: {summary.by_type.evidence}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <select
            value={filters.priority}
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
            className="filter-select"
          >
            <option value="all">Semua Priority</option>
            <option value="urgent">🔴 Urgent (≥7 hari)</option>
            <option value="normal">🟡 Normal (3-6 hari)</option>
            <option value="recent">🟢 Recent (&lt;3 hari)</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="filter-select"
          >
            <option value="all">Semua Tipe</option>
            <option value="recommendation">📝 Recommendations</option>
            <option value="matrix_item">📊 Matrix Items</option>
            <option value="evidence">📎 Evidence</option>
          </select>

          <input
            type="text"
            placeholder="Filter by Institution..."
            value={filters.institution}
            onChange={(e) => setFilters({...filters, institution: e.target.value})}
            className="filter-input"
          />

          <button onClick={loadReviewQueue} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            <span>{selectedItems.size} item(s) selected</span>
          </div>
          <div className="bulk-buttons">
            <button
              onClick={() => openBulkModal('approve')}
              className="btn-bulk-approve"
            >
              ✅ Bulk Approve ({selectedItems.size})
            </button>
            <button
              onClick={() => openBulkModal('reject')}
              className="btn-bulk-reject"
            >
              ❌ Bulk Reject ({selectedItems.size})
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="btn-clear-selection"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="review-items-section">
        <div className="section-header">
          <h2>Review Queue ({reviewItems.length})</h2>
          <div className="select-all">
            <label>
              <input
                type="checkbox"
                checked={selectedItems.size === reviewItems.length && reviewItems.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              Select All
            </label>
          </div>
        </div>

        {reviewItems.length === 0 ? (
          <div className="no-items">
            <div className="no-items-content">
              <div className="no-items-icon">🎉</div>
              <h3>Tidak ada item yang perlu direview</h3>
              <p>Semua item telah direview atau belum ada submission baru.</p>
            </div>
          </div>
        ) : (
          <div className="review-items-list">
            {reviewItems.map((item) => (
              <div key={item.id} className="review-item-wrapper">
                <div className="item-selector">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                  />
                </div>
                <div className="item-priority">
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(item.days_pending) }}
                  >
                    {getPriorityLabel(item.days_pending)}
                  </span>
                  <small>{item.days_pending} hari</small>
                </div>
                <div className="item-content">
                  <IndividualReviewComponent
                    item={item}
                    onReviewComplete={loadReviewQueue}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="bulk-modal-overlay">
          <div className="bulk-modal">
            <div className="modal-header">
              <h3>
                {bulkAction === 'approve' ? '✅ Bulk Approve' : '❌ Bulk Reject'} 
                ({selectedItems.size} items)
              </h3>
              <button onClick={closeBulkModal} className="btn-close">×</button>
            </div>
            
            <div className="modal-body">
              <p>
                Anda akan {bulkAction === 'approve' ? 'menyetujui' : 'menolak'} {selectedItems.size} item sekaligus.
              </p>
              
              <div className="form-group">
                <label>
                  Catatan {bulkAction === 'reject' ? '(Wajib)' : '(Opsional)'}:
                </label>
                <textarea
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder={
                    bulkAction === 'approve' 
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
                onClick={closeBulkModal}
                className="btn-cancel"
                disabled={processingBulk}
              >
                Batal
              </button>
              <button
                onClick={handleBulkAction}
                className={bulkAction === 'approve' ? 'btn-approve' : 'btn-reject'}
                disabled={processingBulk || (bulkAction === 'reject' && !bulkNotes.trim())}
              >
                {processingBulk ? '⏳ Processing...' : (bulkAction === 'approve' ? '✅ Approve All' : '❌ Reject All')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}