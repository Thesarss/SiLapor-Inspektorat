import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';

interface Props {
  reportId: string;
  onClose: () => void;
}

interface ProgressData {
  report: {
    id: string;
    title: string;
    institution: string;
    assigned_to_name: string;
    status: string;
    created_at: string;
  };
  followup_items: Array<{
    id: string;
    temuan: string;
    penyebab: string;
    rekomendasi: string;
    status: string;
    recommendations_count: number;
    approved_recommendations: number;
    rejected_recommendations: number;
    pending_recommendations: number;
    progress_percentage: number;
    files_count: number;
    last_activity: string;
  }>;
  overall_progress: {
    total_items: number;
    completed_items: number;
    progress_percentage: number;
    total_recommendations: number;
    approved_recommendations: number;
    rejected_recommendations: number;
    pending_recommendations: number;
    total_files: number;
  };
}

export function ReportProgressDetail({ reportId, onClose }: Props) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemRecommendations, setItemRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, [reportId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/reports/${reportId}/progress-detail`);
      
      if (response.data.success) {
        setProgressData(response.data.data);
      } else {
        notify.error('Gagal memuat data progress');
      }
    } catch (error: any) {
      console.error('Error loading progress data:', error);
      notify.error('Gagal memuat data progress: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadItemRecommendations = async (itemId: string) => {
    try {
      setLoadingRecommendations(true);
      const response = await apiClient.get(`/followup-recommendations/followup-items/${itemId}/recommendations`);
      
      if (response.data.success) {
        setItemRecommendations(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading recommendations:', error);
      notify.error('Gagal memuat rekomendasi');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleItemClick = (itemId: string) => {
    if (selectedItem === itemId) {
      setSelectedItem(null);
      setItemRecommendations([]);
    } else {
      setSelectedItem(itemId);
      loadItemRecommendations(itemId);
    }
  };

  const handleApproveRecommendation = async (recommendationId: string) => {
    try {
      await apiClient.post(`/followup-recommendations/recommendations/${recommendationId}/approve`);
      notify.success('Rekomendasi berhasil disetujui');
      loadItemRecommendations(selectedItem!);
      loadProgressData(); // Refresh overall progress
    } catch (error: any) {
      console.error('Error approving recommendation:', error);
      notify.error('Gagal menyetujui rekomendasi');
    }
  };

  const handleRejectRecommendation = async (recommendationId: string, notes: string) => {
    try {
      await apiClient.post(`/followup-recommendations/recommendations/${recommendationId}/reject`, { notes });
      notify.success('Rekomendasi berhasil ditolak');
      loadItemRecommendations(selectedItem!);
      loadProgressData(); // Refresh overall progress
    } catch (error: any) {
      console.error('Error rejecting recommendation:', error);
      notify.error('Gagal menolak rekomendasi');
    }
  };

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/followup-recommendations/recommendations/files/download/${fileId}`, {
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
      notify.error('Gagal download file');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': '#ffc107',
      'submitted': '#17a2b8',
      'approved': '#28a745',
      'rejected': '#dc3545',
      'needs_revision': '#fd7e14'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': '⏳ Pending',
      'submitted': '📤 Submitted',
      'approved': '✅ Approved',
      'rejected': '❌ Rejected',
      'needs_revision': '🔄 Needs Revision'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="progress-detail-modal">
        <div className="progress-detail-content">
          <div className="loading">Memuat data progress...</div>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="progress-detail-modal">
        <div className="progress-detail-content">
          <div className="error">Gagal memuat data progress</div>
          <button onClick={onClose} className="btn-close">Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-detail-modal">
      <div className="progress-detail-content">
        <div className="modal-header">
          <h2>📊 Progress Detail: {progressData.report.title}</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="modal-body">
          {/* Overall Progress */}
          <div className="overall-progress">
            <h3>📈 Overall Progress</h3>
            <div className="progress-stats">
              <div className="stat-card">
                <div className="stat-number">{progressData.overall_progress.progress_percentage}%</div>
                <div className="stat-label">Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{progressData.overall_progress.completed_items}/{progressData.overall_progress.total_items}</div>
                <div className="stat-label">Items Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{progressData.overall_progress.approved_recommendations}/{progressData.overall_progress.total_recommendations}</div>
                <div className="stat-label">Recommendations Approved</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{progressData.overall_progress.total_files}</div>
                <div className="stat-label">Evidence Files</div>
              </div>
            </div>
            
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${progressData.overall_progress.progress_percentage}%`,
                    backgroundColor: progressData.overall_progress.progress_percentage >= 80 ? '#28a745' : 
                                   progressData.overall_progress.progress_percentage >= 50 ? '#ffc107' : '#dc3545'
                  }}
                ></div>
              </div>
              <div className="progress-label">
                {progressData.overall_progress.progress_percentage}% Complete
              </div>
            </div>
          </div>

          {/* Report Info */}
          <div className="report-info">
            <h3>📋 Report Information</h3>
            <div className="info-grid">
              <div><strong>Institution:</strong> {progressData.report.institution}</div>
              <div><strong>Assigned to:</strong> {progressData.report.assigned_to_name}</div>
              <div><strong>Status:</strong> 
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(progressData.report.status) }}
                >
                  {getStatusLabel(progressData.report.status)}
                </span>
              </div>
              <div><strong>Created:</strong> {new Date(progressData.report.created_at).toLocaleDateString('id-ID')}</div>
            </div>
          </div>

          {/* Followup Items */}
          <div className="followup-items">
            <h3>📝 Followup Items ({progressData.followup_items.length})</h3>
            <div className="items-list">
              {progressData.followup_items.map((item) => (
                <div key={item.id} className="item-card">
                  <div 
                    className="item-header"
                    onClick={() => handleItemClick(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="item-title">
                      <h4>📋 Temuan: {item.temuan.substring(0, 100)}...</h4>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="item-stats">
                      <div className="stat-small">
                        <span className="stat-number">{item.progress_percentage}%</span>
                        <span className="stat-label">Progress</span>
                      </div>
                      <div className="stat-small">
                        <span className="stat-number">{item.approved_recommendations}/{item.recommendations_count}</span>
                        <span className="stat-label">Approved</span>
                      </div>
                      <div className="stat-small">
                        <span className="stat-number">{item.files_count}</span>
                        <span className="stat-label">Files</span>
                      </div>
                    </div>
                  </div>

                  {selectedItem === item.id && (
                    <div className="item-details">
                      <div className="item-content">
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
                      </div>

                      {loadingRecommendations ? (
                        <div className="loading">Memuat rekomendasi...</div>
                      ) : (
                        <div className="recommendations-section">
                          <h5>📝 Recommendations ({itemRecommendations.length})</h5>
                          {itemRecommendations.length === 0 ? (
                            <p className="no-recommendations">Belum ada rekomendasi yang disubmit</p>
                          ) : (
                            <div className="recommendations-list">
                              {itemRecommendations.map((rec) => (
                                <div key={rec.id} className="recommendation-card">
                                  <div className="recommendation-header">
                                    <span 
                                      className="status-badge"
                                      style={{ backgroundColor: getStatusColor(rec.status) }}
                                    >
                                      {getStatusLabel(rec.status)}
                                    </span>
                                    <span className="date">
                                      {new Date(rec.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                  </div>
                                  
                                  <div className="recommendation-content">
                                    <p><strong>Response:</strong> {rec.response}</p>
                                    
                                    {rec.files && rec.files.length > 0 && (
                                      <div className="files-section">
                                        <h6>📎 Evidence Files:</h6>
                                        <div className="files-list">
                                          {rec.files.map((file: any) => (
                                            <div key={file.id} className="file-item">
                                              <span className="file-name">{file.filename}</span>
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

                                    {rec.review_notes && (
                                      <div className="review-notes">
                                        <strong>Review Notes:</strong>
                                        <p>{rec.review_notes}</p>
                                      </div>
                                    )}
                                  </div>

                                  {rec.status === 'submitted' && (
                                    <div className="recommendation-actions">
                                      <button
                                        onClick={() => handleApproveRecommendation(rec.id)}
                                        className="btn-approve-small"
                                      >
                                        ✅ Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          const notes = prompt('Alasan penolakan:');
                                          if (notes) {
                                            handleRejectRecommendation(rec.id, notes);
                                          }
                                        }}
                                        className="btn-reject-small"
                                      >
                                        ❌ Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Tutup</button>
        </div>
      </div>
    </div>
  );
}