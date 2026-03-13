import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';

interface ProgressData {
  assignment_id: string;
  assigned_to: string;
  assignment_status: string;
  assigned_at: string;
  completed_at?: string;
  progress_percentage: number;
  items_with_evidence: number;
  total_items: number;
  last_activity_at?: string;
  matrix_title: string;
  matrix_description?: string;
  matrix_report_id: string;
  target_opd: string;
  opd_user_name: string;
  opd_user_email: string;
  opd_institution: string;
  inspector_name: string;
  completed_items: number;
  total_matrix_items: number;
  evidence_files_count: number;
}

interface EvidenceTrackingData {
  matrix_item_id: string;
  matrix_report_id: string;
  item_number: number;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  item_status: string;
  submitted_at?: string;
  reviewed_at?: string;
  matrix_title: string;
  target_opd: string;
  opd_user_name?: string;
  opd_institution?: string;
  evidence_count: number;
  evidence_files?: string;
  evidence_uploaders?: string;
  last_evidence_upload?: string;
  latest_evidence_status?: string;
}

interface AggregatedProgress {
  matrix_report_id: string;
  matrix_title: string;
  matrix_description?: string;
  target_opd: string;
  opd_institution: string;
  inspector_name: string;
  total_assignments: number;
  total_items: number;
  completed_items: number;
  items_with_evidence: number;
  evidence_files_count: number;
  overall_progress: number;
  assignments: ProgressData[];
  earliest_assigned: string;
  latest_activity?: string;
}

export function MatrixProgressDashboardComponent() {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [evidenceTracking, setEvidenceTracking] = useState<EvidenceTrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'progress' | 'evidence'>('progress');
  const [filters, setFilters] = useState({
    target_opd: '',
    status: '',
    matrix_report_id: ''
  });

  useEffect(() => {
    loadProgressData();
    loadEvidenceTracking();
  }, []);

  const loadProgressData = async () => {
    try {
      console.log('🔄 Loading matrix progress data...');
      console.log('🌐 API URL:', import.meta.env.VITE_API_URL || 'http://localhost:3000/api');

      const response = await apiClient.get('/matrix/progress');
      console.log('📊 Progress API response status:', response.status);
      console.log('📊 Progress API response:', response.data);

      if (response.data.success) {
        console.log('✅ Progress data loaded:', response.data.data);
        setProgressData(response.data.data);
      } else {
        console.error('❌ API returned error:', response.data.error);
        notify.error('Gagal memuat data progress: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('❌ Failed to load progress data:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);

      if (error.response?.status === 404) {
        notify.error('API endpoint tidak ditemukan. Pastikan backend berjalan di port 3000');
      } else if (error.response?.status === 401) {
        notify.error('Tidak terautentikasi. Silakan login ulang');
      } else if (error.code === 'ECONNREFUSED') {
        notify.error('Tidak dapat terhubung ke backend. Pastikan backend berjalan');
      } else {
        notify.error('Gagal memuat data progress: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const loadEvidenceTracking = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.target_opd) params.append('target_opd', filters.target_opd);
      if (filters.status) params.append('status', filters.status);
      if (filters.matrix_report_id) params.append('matrix_report_id', filters.matrix_report_id);

      const response = await apiClient.get(`/matrix/evidence-tracking?${params}`);
      if (response.data.success) {
        setEvidenceTracking(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load evidence tracking:', error);
      notify.error('Gagal memuat data tracking evidence');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 50) return '#ffc107';
    return '#dc3545';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      'pending': { label: '⏳ Pending', class: 'badge-warning' },
      'in_progress': { label: '🔄 In Progress', class: 'badge-info' },
      'completed': { label: '✅ Completed', class: 'badge-success' },
      'submitted': { label: '📤 Submitted', class: 'badge-primary' },
      'approved': { label: '✅ Approved', class: 'badge-success' },
      'rejected': { label: '❌ Rejected', class: 'badge-danger' }
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

  const getUniqueOPDs = () => {
    const opds = [...new Set(progressData.map(item => item.target_opd))];
    return opds.sort();
  };

  // Aggregate progress by matrix report (combine all PICs)
  const getAggregatedProgress = (): AggregatedProgress[] => {
    const grouped = progressData.reduce((acc, item) => {
      const key = item.matrix_report_id;
      if (!acc[key]) {
        acc[key] = {
          matrix_report_id: item.matrix_report_id,
          matrix_title: item.matrix_title,
          matrix_description: item.matrix_description,
          target_opd: item.target_opd,
          opd_institution: item.opd_institution,
          inspector_name: item.inspector_name,
          total_assignments: 0,
          total_items: item.total_items, // Use first assignment's total (all same)
          completed_items: 0,
          items_with_evidence: 0,
          evidence_files_count: 0,
          overall_progress: 0,
          assignments: [],
          earliest_assigned: item.assigned_at,
          latest_activity: item.last_activity_at
        };
      }

      acc[key].total_assignments += 1;
      // DON'T sum total_items - all users work on same items!
      // acc[key].total_items += item.total_items; // REMOVED - this causes bug!
      acc[key].completed_items += item.completed_items || 0;
      acc[key].items_with_evidence += item.items_with_evidence;
      acc[key].evidence_files_count += item.evidence_files_count;
      acc[key].assignments.push(item);

      // Track earliest and latest dates
      if (new Date(item.assigned_at) < new Date(acc[key].earliest_assigned)) {
        acc[key].earliest_assigned = item.assigned_at;
      }
      if (item.last_activity_at && (!acc[key].latest_activity ||
        new Date(item.last_activity_at) > new Date(acc[key].latest_activity))) {
        acc[key].latest_activity = item.last_activity_at;
      }

      return acc;
    }, {} as Record<string, AggregatedProgress>);

    // Calculate overall progress for each matrix
    Object.values(grouped).forEach(matrix => {
      if (matrix.total_items > 0) {
        // Calculate progress and cap at 100%
        // items_with_evidence might be summed from multiple users
        // but total_items is the actual number of items in the matrix
        const rawProgress = (matrix.items_with_evidence / matrix.total_items) * 100;
        matrix.overall_progress = Math.min(Math.round(rawProgress), 100);
      }
    });

    return Object.values(grouped);
  };



  if (loading) {
    return <div className="loading">Memuat data progress matrix...</div>;
  }

  return (
    <div className="matrix-progress-dashboard">
      <div className="dashboard-header">
        <h2>📊 Matrix Progress Dashboard</h2>
        <p>Monitor progress pekerjaan OPD pada matrix yang telah ditugaskan</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📈 Progress Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          📎 Evidence Tracking
        </button>
      </div>

      {activeTab === 'progress' && (
        <div className="progress-tab">
          <div className="filters-section">
            <h3>🔍 Filter Data</h3>
            <div className="filters-row">
              <select
                value={filters.target_opd}
                onChange={(e) => setFilters({ ...filters, target_opd: e.target.value })}
                className="filter-select"
              >
                <option value="">Semua OPD</option>
                {getUniqueOPDs().map(opd => (
                  <option key={opd} value={opd}>{opd}</option>
                ))}
              </select>

              <button onClick={() => { loadProgressData(); loadEvidenceTracking(); }} className="btn-filter">
                🔄 Refresh
              </button>
            </div>
          </div>

          <div className="progress-summary">
            <div className="summary-cards">
              <div className="summary-card">
                <h4>Total Matrix</h4>
                <div className="summary-number">{getAggregatedProgress().length}</div>
              </div>
              <div className="summary-card">
                <h4>Total Assignments</h4>
                <div className="summary-number">{progressData.length}</div>
              </div>
              <div className="summary-card">
                <h4>Total Items</h4>
                <div className="summary-number in-progress">
                  {getAggregatedProgress().reduce((sum, m) => sum + m.total_items, 0)}
                </div>
              </div>
              <div className="summary-card">
                <h4>Items with Evidence</h4>
                <div className="summary-number completed">
                  {getAggregatedProgress().reduce((sum, m) => sum + m.items_with_evidence, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="progress-list">
            {getAggregatedProgress()
              .filter(matrix => !filters.target_opd || matrix.target_opd === filters.target_opd)
              .map((matrix) => (
                <div key={matrix.matrix_report_id} className="progress-card">
                  <div className="progress-card-header">
                    <h4>{matrix.matrix_title}</h4>
                    <span className="assignment-count">{matrix.total_assignments} PIC</span>
                  </div>

                  <div className="progress-details">
                    <div className="progress-info">
                      <div className="info-row">
                        <span className="label">🏢 OPD:</span>
                        <span className="info-value">{matrix.target_opd}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">🏛️ Institusi:</span>
                        <span className="info-value">{matrix.opd_institution}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">👔 Inspector:</span>
                        <span className="info-value">{matrix.inspector_name}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">📅 Assigned:</span>
                        <span className="info-value">{formatDate(matrix.earliest_assigned)}</span>
                      </div>
                      {matrix.latest_activity && (
                        <div className="info-row">
                          <span className="label">🕒 Last Activity:</span>
                          <span className="info-value">{formatDate(matrix.latest_activity)}</span>
                        </div>
                      )}
                    </div>

                    <div className="progress-stats">
                      <div className="progress-bar-container">
                        <div className="progress-label">
                          Overall Progress: {matrix.overall_progress}%
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${matrix.overall_progress}%`,
                              backgroundColor: getProgressColor(matrix.overall_progress)
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-number">{matrix.items_with_evidence}</span>
                          <span className="stat-label">Items with Evidence</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">{matrix.total_items}</span>
                          <span className="stat-label">Total Items</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-number">{matrix.evidence_files_count}</span>
                          <span className="stat-label">Evidence Files</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Show individual PICs in collapsed section */}
                  <details className="pic-details">
                    <summary className="pic-summary">
                      👥 Lihat Detail {matrix.total_assignments} PIC
                    </summary>
                    <div className="pic-list">
                      {matrix.assignments.map((assignment) => (
                        <div key={assignment.assignment_id} className="pic-item">
                          <div className="pic-info">
                            <strong>{assignment.opd_user_name}</strong>
                            <span className="pic-email">{assignment.opd_user_email}</span>
                          </div>
                          <div className="pic-stats">
                            <span>{assignment.items_with_evidence}/{assignment.total_items} items</span>
                            {getStatusBadge(assignment.assignment_status)}
                          </div>
                          <Link
                            to={`/matrix/review/${assignment.assignment_id}`}
                            className="btn-review-small"
                          >
                            🔍 Review
                          </Link>
                        </div>
                      ))}
                    </div>
                  </details>

                  <div className="progress-actions">
                    <Link
                      to={`/matrix/detail/${matrix.matrix_report_id}`}
                      className="btn-review"
                    >
                      📊 Lihat Semua Items
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="evidence-tab">
          <div className="evidence-table-container">
            <table className="evidence-table">
              <thead>
                <tr>
                  <th>Matrix</th>
                  <th>Item #</th>
                  <th>Temuan</th>
                  <th>Status</th>
                  <th>Evidence & Uploader</th>
                  <th>Last Upload</th>
                </tr>
              </thead>
              <tbody>
                {evidenceTracking
                  .filter(item => !filters.target_opd || item.target_opd === filters.target_opd)
                  .filter(item => !filters.status || item.item_status === filters.status)
                  .map((item) => (
                    <tr key={item.matrix_item_id}>
                      <td>
                        <div className="matrix-info">
                          <strong>{item.matrix_title}</strong>
                          <small>{item.target_opd}</small>
                        </div>
                      </td>
                      <td>#{item.item_number}</td>
                      <td>
                        <div className="temuan-preview">
                          {item.temuan.substring(0, 100)}
                          {item.temuan.length > 100 && '...'}
                        </div>
                      </td>
                      <td>{getStatusBadge(item.item_status)}</td>
                      <td>
                        <div className="evidence-info">
                          <span className="evidence-count">
                            📎 {item.evidence_count} file(s)
                          </span>
                          {item.evidence_files && (
                            <div className="evidence-files">
                              {item.evidence_files.split(', ').map((filename, idx) => (
                                <div key={idx} className="evidence-filename">
                                  📄 {filename}
                                </div>
                              ))}
                            </div>
                          )}
                          {item.evidence_uploaders && (
                            <div className="evidence-uploaders">
                              <small>👤 Uploaded by: {item.evidence_uploaders}</small>
                            </div>
                          )}
                          {item.evidence_count === 0 && (
                            <small className="no-evidence">Belum ada evidence</small>
                          )}
                        </div>
                      </td>
                      <td>{formatDate(item.last_evidence_upload)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}