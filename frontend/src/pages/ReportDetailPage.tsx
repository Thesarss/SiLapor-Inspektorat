import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Report, EvidenceFile, RevisionItem, RevisionFile } from '../types';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/notifications';

interface ImportDetail {
  id: string;
  import_id: string;
  report_id: string;
  row_number: number;
  original_data: {
    nomorLHP?: string;
    tanggalLHP?: string;
    temuan: string;
    penyebab?: string;
    rekomendasi: string;
    tindakLanjut?: string;
    institusiTujuan?: string;
  };
  created_at: string;
}

interface FollowupItem {
  id: string;
  report_id: string;
  import_detail_id: string;
  temuan: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  opd_response?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface FollowupItemFile {
  id: string;
  followup_item_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface FollowupRecommendation {
  id: string;
  followup_item_id: string;
  recommendation_text: string;
  recommendation_index: number;
  opd_response?: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  files: FollowupRecommendationFile[];
}

interface FollowupRecommendationFile {
  id: string;
  recommendation_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [reportFiles, setReportFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [revisionItems, setRevisionItems] = useState<RevisionItem[]>([]);
  const [revisionFiles, setRevisionFiles] = useState<Record<string, RevisionFile[]>>({});
  const [revisionResponses, setRevisionResponses] = useState<Record<string, string>>({});
  const [uploadingRevisionFile, setUploadingRevisionFile] = useState<string | null>(null);
  const [submittingRevision, setSubmittingRevision] = useState<string | null>(null);
  const [importDetails, setImportDetails] = useState<ImportDetail[]>([]);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [followupItems, setFollowupItems] = useState<FollowupItem[]>([]);
  const [followupFiles, setFollowupFiles] = useState<Record<string, FollowupItemFile[]>>({});
  const [followupRecommendations, setFollowupRecommendations] = useState<Record<string, FollowupRecommendation[]>>({});
  const [expandedRecommendations, setExpandedRecommendations] = useState<Record<string, boolean>>({});
  const [recommendationResponses, setRecommendationResponses] = useState<Record<string, string>>({});
  const [uploadingRecommendationFile, setUploadingRecommendationFile] = useState<string | null>(null);
  const [submittingRecommendation, setSubmittingRecommendation] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
    fetchRevisionItems();
    fetchImportDetails();
    fetchFollowupItems();
  }, [id]);

  const fetchReport = async () => {
    try {
      const reportRes = await apiClient.get(`/reports/${id}`);
      setReport(reportRes.data.data);
      fetchReportFiles();
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportFiles = async () => {
    try {
      const res = await apiClient.get(`/files/report/${id}`);
      setReportFiles(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch report files:', error);
    }
  };

  const fetchRevisionItems = async () => {
    try {
      const res = await apiClient.get(`/revisions/report/${id}`);
      const items = res.data.data || [];
      setRevisionItems(items);
      
      for (const item of items) {
        fetchRevisionFiles(item.id);
      }
      
      const responses: Record<string, string> = {};
      items.forEach((item: RevisionItem) => {
        responses[item.id] = item.user_response || '';
      });
      setRevisionResponses(responses);
    } catch (error) {
      console.error('Failed to fetch revision items:', error);
    }
  };

  const fetchRevisionFiles = async (itemId: string) => {
    try {
      const res = await apiClient.get(`/revisions/${itemId}/files`);
      setRevisionFiles(prev => ({ ...prev, [itemId]: res.data.data || [] }));
    } catch (error) {
      console.error('Failed to fetch revision files:', error);
    }
  };

  const fetchImportDetails = async () => {
    try {
      const res = await apiClient.get(`/reports/${id}/import-details`);
      setImportDetails(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch import details:', error);
      // Not all reports have import details, so don't show error
    }
  };

  const fetchFollowupItems = async () => {
    try {
      const res = await apiClient.get(`/followup-items/report/${id}`);
      const items = res.data.data || [];
      setFollowupItems(items);
      
      // Fetch files for each followup item
      for (const item of items) {
        fetchFollowupFiles(item.id);
        fetchFollowupRecommendations(item.id);
      }
    } catch (error) {
      console.error('Failed to fetch followup items:', error);
    }
  };

  const fetchFollowupFiles = async (itemId: string) => {
    try {
      const res = await apiClient.get(`/followup-items/${itemId}/files`);
      setFollowupFiles(prev => ({ ...prev, [itemId]: res.data.data || [] }));
    } catch (error) {
      console.error('Failed to fetch followup files:', error);
    }
  };

  const fetchFollowupRecommendations = async (itemId: string) => {
    try {
      const res = await apiClient.get(`/followup-items/${itemId}/recommendations`);
      const recommendations = res.data.data || [];
      setFollowupRecommendations(prev => ({ ...prev, [itemId]: recommendations }));
      
      // Initialize recommendation responses only for new recommendations
      // Preserve existing user input
      setRecommendationResponses(prev => {
        const newResponses = { ...prev };
        recommendations.forEach((rec: FollowupRecommendation) => {
          // Only set response if it doesn't exist in current state
          // This preserves user input while they're typing
          if (!(rec.id in newResponses)) {
            newResponses[rec.id] = rec.opd_response || '';
          }
        });
        return newResponses;
      });
    } catch (error) {
      console.error('Failed to fetch followup recommendations:', error);
    }
  };

  const handleDownloadRevisionFile = async (fileId: string, fileName: string) => {
    setDownloading(fileId);
    try {
      const response = await apiClient.get(`/revisions/files/download/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Gagal download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleResubmit = async () => {
    if (reportFiles.length === 0) {
      setError('Harap upload minimal 1 file bukti sebelum mengirim ulang');
      return;
    }
    setResubmitting(true);
    setError('');
    try {
      await apiClient.post(`/reports/${id}/resubmit`);
      fetchReport();
      notify.success('Laporan berhasil dikirim ulang untuk review');
    } catch (error: any) {
      notify.error(error.response?.data?.error || 'Gagal mengirim ulang laporan');
    } finally {
      setResubmitting(false);
    }
  };

  const handleRevisionFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Hanya file PDF yang diperbolehkan');
      return;
    }
    setUploadingRevisionFile(itemId);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiClient.post(`/revisions/${itemId}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchRevisionFiles(itemId);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal upload file');
    } finally {
      setUploadingRevisionFile(null);
    }
  };

  const handleSubmitRevisionResponse = async (itemId: string) => {
    const response = revisionResponses[itemId];
    if (!response || !response.trim()) {
      notify.warning('Harap isi penjelasan revisi');
      return;
    }
    const files = revisionFiles[itemId] || [];
    if (files.length === 0) {
      notify.warning('Harap upload minimal 1 file bukti untuk revisi ini');
      return;
    }
    setSubmittingRevision(itemId);
    setError('');
    try {
      await apiClient.put(`/revisions/${itemId}/response`, { userResponse: response });
      fetchRevisionItems();
      notify.success('Revisi berhasil dikirim dan menunggu review admin');
    } catch (error: any) {
      notify.error(error.response?.data?.error || 'Gagal mengirim revisi');
    } finally {
      setSubmittingRevision(null);
    }
  };

  const handleApproveRevisionItem = async (itemId: string) => {
    try {
      await apiClient.post(`/revisions/${itemId}/approve`);
      fetchRevisionItems();
      fetchReport();
      notify.success('Revisi telah disetujui dan laporan diperbarui');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal menyetujui revisi');
    }
  };

  const handleRejectRevisionItem = async (itemId: string) => {
    // Use custom prompt instead of browser prompt
    const notes = await notify.prompt('Masukkan Catatan Penolakan', 'Berikan alasan mengapa revisi ini ditolak:', 'Contoh: Data tidak lengkap, perlu dokumentasi tambahan...');
    if (!notes || !notes.trim()) {
      notify.warning('Catatan penolakan harus diisi untuk menolak revisi');
      return;
    }
    try {
      await apiClient.post(`/revisions/${itemId}/reject`, { adminNotes: notes });
      fetchRevisionItems();
      notify.warning('Revisi ditolak, user harus mengerjakan ulang');
    } catch (error: any) {
      notify.error(error.response?.data?.error || 'Gagal menolak revisi');
    }
  };

  const handleApproveFollowupItem = async (itemId: string) => {
    try {
      await apiClient.post(`/followup-items/${itemId}/approve`);
      fetchFollowupItems();
      notify.success('Tindak lanjut telah disetujui');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal menyetujui tindak lanjut');
    }
  };

  const handleRejectFollowupItem = async (itemId: string) => {
    // Use custom prompt instead of browser prompt
    const notes = await notify.prompt('Masukkan Catatan Penolakan', 'Berikan alasan mengapa tindak lanjut ini ditolak:', 'Contoh: Bukti tidak memadai, perlu tindakan lebih konkret...');
    if (!notes || !notes.trim()) {
      notify.warning('Catatan penolakan harus diisi untuk menolak tindak lanjut');
      return;
    }
    try {
      await apiClient.post(`/followup-items/${itemId}/reject`, { notes });
      fetchFollowupItems();
      notify.warning('Tindak lanjut ditolak, user harus mengerjakan ulang');
    } catch (error: any) {
      notify.error(error.response?.data?.error || 'Gagal menolak tindak lanjut');
    }
  };

  const handleDownloadFollowupFile = async (fileId: string, fileName: string) => {
    setDownloading(fileId);
    try {
      const response = await apiClient.get(`/followup-items/files/download/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Gagal download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteRecommendationFile = async (fileId: string, recommendationId: string) => {
    notify.confirm(
      'Konfirmasi Hapus File',
      'Apakah Anda yakin ingin menghapus file ini? Tindakan ini tidak dapat dibatalkan.',
      async () => {
        setDownloading(fileId); // Reuse downloading state for delete loading
        try {
          await apiClient.delete(`/recommendations/files/${fileId}`);
          
          // Refresh recommendations to update file list
          const followupItemId = Object.keys(followupRecommendations).find(itemId => 
            followupRecommendations[itemId].some(rec => rec.id === recommendationId)
          );
          if (followupItemId) {
            fetchFollowupRecommendations(followupItemId);
          }
          
          notify.deleteSuccess('File bukti');
        } catch (error: any) {
          notify.error(error.response?.data?.error || 'Gagal menghapus file');
        } finally {
          setDownloading(null);
        }
      }
    );
  };

  const handleDownloadRecommendationFile = async (fileId: string, fileName: string) => {
    setDownloading(fileId);
    try {
      const response = await apiClient.get(`/recommendations/files/download/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Gagal download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleApproveRecommendation = async (recommendationId: string) => {
    try {
      await apiClient.post(`/recommendations/${recommendationId}/approve`);
      // Refresh the followup items to get updated recommendation status
      fetchFollowupItems();
      notify.success('Rekomendasi telah disetujui');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal menyetujui rekomendasi');
    }
  };

  const handleRejectRecommendation = async (recommendationId: string) => {
    // Use custom prompt instead of browser prompt
    const notes = await notify.prompt('Masukkan Catatan Penolakan', 'Berikan alasan mengapa rekomendasi ini ditolak:', 'Contoh: Penjelasan kurang detail, bukti tidak sesuai...');
    if (!notes || !notes.trim()) {
      notify.warning('Catatan penolakan harus diisi untuk menolak rekomendasi');
      return;
    }
    try {
      await apiClient.post(`/recommendations/${recommendationId}/reject`, { notes });
      // Refresh the followup items to get updated recommendation status
      fetchFollowupItems();
      notify.warning('Rekomendasi ini ditolak. User hanya perlu memperbaiki rekomendasi ini saja, bukan seluruh laporan.');
    } catch (error: any) {
      notify.error(error.response?.data?.error || 'Gagal menolak rekomendasi');
    }
  };

  const handleRecommendationFileUpload = async (recommendationId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Validate file types
    for (let i = 0; i < files.length; i++) {
      if (files[i].type !== 'application/pdf') {
        setError('Hanya file PDF yang diperbolehkan');
        return;
      }
    }
    
    setUploadingRecommendationFile(recommendationId);
    setError('');
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    try {
      await apiClient.post(`/recommendations/${recommendationId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Clear the file input
      e.target.value = '';
      
      // Refresh recommendations to show uploaded files
      const followupItemId = Object.keys(followupRecommendations).find(itemId => 
        followupRecommendations[itemId].some(rec => rec.id === recommendationId)
      );
      if (followupItemId) {
        fetchFollowupRecommendations(followupItemId);
      }
      
      // Show success message
      const fileCount = files.length;
      notify.success(`${fileCount} file berhasil diupload`);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal upload file');
    } finally {
      setUploadingRecommendationFile(null);
    }
  };

  const handleSubmitRecommendationResponse = async (recommendationId: string) => {
    const response = recommendationResponses[recommendationId];
    if (!response || !response.trim()) {
      setError('Harap isi penjelasan rekomendasi');
      return;
    }
    
    // Check if files are uploaded for this recommendation
    const followupItemId = Object.keys(followupRecommendations).find(itemId => 
      followupRecommendations[itemId].some(rec => rec.id === recommendationId)
    );
    
    if (followupItemId) {
      const recommendation = followupRecommendations[followupItemId].find(rec => rec.id === recommendationId);
      if (!recommendation || !recommendation.files || recommendation.files.length === 0) {
        setError('Harap upload minimal 1 file bukti sebelum mengirim penjelasan');
        return;
      }
    }
    
    setSubmittingRecommendation(recommendationId);
    setError('');
    
    try {
      await apiClient.put(`/recommendations/${recommendationId}/response`, { 
        response: response 
      });
      
      // Refresh recommendations to show updated status
      if (followupItemId) {
        fetchFollowupRecommendations(followupItemId);
      }
      
      notify.success('Penjelasan rekomendasi berhasil dikirim');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal mengirim penjelasan');
    } finally {
      setSubmittingRecommendation(null);
    }
  };

  const toggleRecommendationExpansion = (recommendationId: string) => {
    setExpandedRecommendations(prev => ({
      ...prev,
      [recommendationId]: !prev[recommendationId]
    }));
  };

  const isOwner = report && user && report.assigned_to === user.id;
  const isAdmin = user?.role === 'super_admin';

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending: 'Menunggu Review', approved: 'Disetujui', rejected: 'Ditolak', needs_revision: 'Perlu Revisi' };
    return labels[status] || status;
  };

  const getRevisionStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending: 'Menunggu Dikerjakan', completed: 'Menunggu Review Admin', approved: 'Disetujui' };
    return labels[status] || status;
  };

  const getFollowupStatusLabel = (status: string) => {
    const labels: Record<string, string> = { 
      pending: 'Menunggu Dikerjakan', 
      in_progress: 'Sedang Dikerjakan',
      completed: 'Menunggu Review Admin', 
      approved: 'Disetujui',
      rejected: 'Ditolak'
    };
    return labels[status] || status;
  };

  const getRecommendationStatusLabel = (status: string) => {
    const labels: Record<string, string> = { 
      pending: 'Belum Dikerjakan', 
      submitted: 'Menunggu Review',
      approved: 'Disetujui',
      rejected: 'Ditolak'
    };
    return labels[status] || status;
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!report) return <div>Laporan tidak ditemukan</div>;

  return (
    <div className="report-detail">
      <h1>{report.title}</h1>
      <div className="report-info">
        <p><strong>Status:</strong> <span className={`badge badge-${report.status}`}>{getStatusLabel(report.status)}</span></p>
        <p><strong>Tanggal:</strong> {new Date(report.created_at).toLocaleDateString('id-ID')}</p>
        {isAdmin && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <Link to={`/reports/${report.id}/metrics`} className="btn-primary btn-auto">
              📊 Kelola Temuan
            </Link>
          </div>
        )}
      </div>
      <div className="report-description">
        <h3>Deskripsi / Tindak Lanjut</h3>
        <p>{report.description}</p>
      </div>

      {importDetails.length > 0 && (
        <div className="import-details-section">
          <div className="import-details-header">
            <h3>Detail Temuan dari Import</h3>
            <button 
              type="button" 
              className="btn-secondary btn-auto"
              onClick={() => setShowImportDetails(!showImportDetails)}
            >
              {showImportDetails ? 'Sembunyikan Detail' : `Lihat ${importDetails.length} Temuan`}
            </button>
          </div>
          
          {showImportDetails && (
            <div className="import-details-list">
              {importDetails.map((detail, index) => (
                <div key={detail.id} className="import-detail-item">
                  <div className="detail-header">
                    <h4>Temuan #{index + 1}</h4>
                    {detail.original_data.nomorLHP && (
                      <span className="nomor-lhp">LHP: {detail.original_data.nomorLHP}</span>
                    )}
                  </div>
                  
                  <div className="detail-content">
                    <div className="detail-field">
                      <strong>Temuan:</strong>
                      <p>{detail.original_data.temuan}</p>
                    </div>
                    
                    {detail.original_data.penyebab && (
                      <div className="detail-field">
                        <strong>Penyebab:</strong>
                        <p>{detail.original_data.penyebab}</p>
                      </div>
                    )}
                    
                    <div className="detail-field">
                      <strong>Rekomendasi:</strong>
                      <p>{detail.original_data.rekomendasi}</p>
                    </div>
                    
                    {detail.original_data.tindakLanjut && (
                      <div className="detail-field">
                        <strong>Tindak Lanjut:</strong>
                        <p>{detail.original_data.tindakLanjut}</p>
                      </div>
                    )}
                    

                    
                    {detail.original_data.tanggalLHP && (
                      <div className="detail-field">
                        <strong>Tanggal LHP:</strong>
                        <p>{new Date(detail.original_data.tanggalLHP).toLocaleDateString('id-ID')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {followupItems.length > 0 && (
        <div className="followup-items-section">
          <h3>Tindak Lanjut Rekomendasi</h3>
          {followupItems.map((item, index) => (
            <div key={item.id} className="followup-item">
              <div className="followup-item-header">
                <h4>Tindak Lanjut #{index + 1}</h4>
                <span className={`badge badge-${item.status}`}>{getFollowupStatusLabel(item.status)}</span>
              </div>
              
              <div className="followup-content">
                <div className="followup-field">
                  <strong>Temuan:</strong>
                  <p>{item.temuan}</p>
                </div>
                
                <div className="followup-field">
                  <strong>Rekomendasi:</strong>
                  {followupRecommendations[item.id] && followupRecommendations[item.id].length > 0 ? (
                    <div className="recommendations-list">
                      {followupRecommendations[item.id]
                        .map((recommendation, recIndex) => (
                        <div key={recommendation.id} className="recommendation-item">
                          <div className="recommendation-header" onClick={() => toggleRecommendationExpansion(recommendation.id)}>
                            <div className="recommendation-title">
                              <span className="recommendation-number">{recIndex + 1}.</span>
                              <span className="recommendation-text">{recommendation.recommendation_text}</span>
                            </div>
                            <div className="recommendation-status-controls">
                              <span className={`badge badge-${recommendation.status}`}>
                                {getRecommendationStatusLabel(recommendation.status)}
                              </span>
                              <button 
                                type="button" 
                                className="expand-button"
                                aria-label={expandedRecommendations[recommendation.id] ? 'Tutup' : 'Buka'}
                              >
                                {expandedRecommendations[recommendation.id] ? '▼' : '▶'}
                              </button>
                            </div>
                          </div>
                          
                          {expandedRecommendations[recommendation.id] && (
                            <div className="recommendation-details">
                              {recommendation.opd_response && (
                                <div className="recommendation-user-response">
                                  <p><strong>Penjelasan OPD:</strong> {recommendation.opd_response}</p>
                                  {recommendation.files && recommendation.files.length > 0 && (
                                    <div className="uploaded-files">
                                      <strong>File Bukti:</strong>
                                      <ul>
                                        {recommendation.files.map(file => (
                                          <li key={file.id} className="file-item">
                                            <button 
                                              type="button" 
                                              onClick={() => handleDownloadRecommendationFile(file.id, file.original_name)} 
                                              disabled={downloading === file.id} 
                                              className="btn-link"
                                            >
                                              {downloading === file.id ? 'Downloading...' : file.original_name}
                                            </button>
                                            {isOwner && !isAdmin && (recommendation.status === 'pending' || recommendation.status === 'rejected') && (
                                              <button 
                                                type="button" 
                                                onClick={() => handleDeleteRecommendationFile(file.id, recommendation.id)} 
                                                disabled={downloading === file.id} 
                                                className="btn-delete-file"
                                                title="Hapus file"
                                              >
                                                {downloading === file.id ? '⏳' : '🗑️'}
                                              </button>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {isAdmin && recommendation.status === 'submitted' && (
                                <div className="admin-actions">
                                  <button 
                                    type="button" 
                                    className="btn-success" 
                                    onClick={() => handleApproveRecommendation(recommendation.id)}
                                  >
                                    Setujui Rekomendasi
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn-danger" 
                                    onClick={() => handleRejectRecommendation(recommendation.id)}
                                  >
                                    Tolak Rekomendasi Ini Saja
                                  </button>
                                </div>
                              )}

                              {isOwner && !isAdmin && (recommendation.status === 'pending' || recommendation.status === 'rejected') && (
                                <div className="recommendation-response-form">
                                  {recommendation.status === 'rejected' && (
                                    <div className="rejection-notice">
                                      <p className="rejection-text">❌ Rekomendasi ini ditolak dan perlu diperbaiki</p>
                                      {recommendation.admin_notes && (
                                        <div className="admin-notes">
                                          <p><strong>Catatan Admin:</strong> {recommendation.admin_notes}</p>
                                        </div>
                                      )}
                                      <p className="revision-instruction">Hanya rekomendasi ini yang perlu diperbaiki. Rekomendasi lain yang sudah disetujui tidak perlu diubah. Silakan perbaiki penjelasan dan upload file bukti yang lebih lengkap, kemudian kirim ulang untuk review.</p>
                                    </div>
                                  )}
                                  <label>Penjelasan Rekomendasi Anda:</label>
                                  <textarea
                                    placeholder={recommendation.status === 'rejected' ? 
                                      "Perbaiki penjelasan tindak lanjut berdasarkan feedback admin..." : 
                                      "Jelaskan tindak lanjut yang telah dilakukan untuk rekomendasi ini..."
                                    }
                                    value={recommendationResponses[recommendation.id] || ''}
                                    onChange={(e) => setRecommendationResponses({ 
                                      ...recommendationResponses, 
                                      [recommendation.id]: e.target.value 
                                    })}
                                    rows={3}
                                  />
                                  <label>Upload File Bukti (PDF, bisa multiple files) <span className="required">*Wajib</span>:</label>
                                  <input 
                                    type="file" 
                                    accept=".pdf" 
                                    multiple
                                    onChange={(e) => handleRecommendationFileUpload(recommendation.id, e)} 
                                    disabled={uploadingRecommendationFile === recommendation.id} 
                                  />
                                  {uploadingRecommendationFile === recommendation.id && <span className="uploading-status">Uploading...</span>}
                                  
                                  {recommendation.files && recommendation.files.length > 0 ? (
                                    <div className="uploaded-files">
                                      <strong>✅ File yang sudah diupload:</strong>
                                      <ul>
                                        {recommendation.files.map(file => (
                                          <li key={file.id} className="file-item">
                                            <button 
                                              type="button" 
                                              onClick={() => handleDownloadRecommendationFile(file.id, file.original_name)} 
                                              disabled={downloading === file.id} 
                                              className="btn-link"
                                            >
                                              {downloading === file.id ? 'Downloading...' : file.original_name}
                                            </button>
                                            <button 
                                              type="button" 
                                              onClick={() => handleDeleteRecommendationFile(file.id, recommendation.id)} 
                                              disabled={downloading === file.id} 
                                              className="btn-delete-file"
                                              title="Hapus file"
                                            >
                                              {downloading === file.id ? '⏳' : '🗑️'}
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div className="file-requirement-notice">
                                      <p className="warning-text">⚠️ Anda harus upload minimal 1 file bukti sebelum dapat mengirim penjelasan</p>
                                    </div>
                                  )}
                                  
                                  <button 
                                    type="button" 
                                    className={`btn-primary btn-auto ${(!recommendation.files || recommendation.files.length === 0) ? 'btn-disabled' : ''}`}
                                    onClick={() => handleSubmitRecommendationResponse(recommendation.id)} 
                                    disabled={submittingRecommendation === recommendation.id || !recommendation.files || recommendation.files.length === 0}
                                    title={(!recommendation.files || recommendation.files.length === 0) ? 'Upload file bukti terlebih dahulu' : ''}
                                  >
                                    {submittingRecommendation === recommendation.id ? 'Mengirim...' : 'Kirim Penjelasan'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rekomendasi-list">
                      {item.rekomendasi.split('\n\n').map((rekomendasi, index) => (
                        <div key={index} className="rekomendasi-item">
                          <span className="rekomendasi-number">{index + 1}.</span>
                          <p>{rekomendasi}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {item.tindak_lanjut && (
                  <div className="followup-field">
                    <strong>Tindak Lanjut yang Diharapkan:</strong>
                    <p>{item.tindak_lanjut}</p>
                  </div>
                )}
              </div>

              {item.opd_response && (
                <div className="followup-user-response">
                  <p><strong>Penjelasan OPD:</strong> {item.opd_response}</p>
                  {followupFiles[item.id] && followupFiles[item.id].length > 0 && (
                    <div className="uploaded-files">
                      <strong>File Bukti:</strong>
                      <ul>
                        {followupFiles[item.id].map(file => (
                          <li key={file.id}>
                            <button type="button" onClick={() => handleDownloadFollowupFile(file.id, file.original_name)} disabled={downloading === file.id} className="btn-link">
                              {downloading === file.id ? 'Downloading...' : file.original_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {item.admin_notes && (
                <div className="admin-notes">
                  <p><strong>Catatan Admin:</strong> {item.admin_notes}</p>
                </div>
              )}

              {isAdmin && item.status === 'completed' && (
                <div className="admin-actions">
                  <button type="button" className="btn-success" onClick={() => handleApproveFollowupItem(item.id)}>Setujui Tindak Lanjut</button>
                  <button type="button" className="btn-danger" onClick={() => handleRejectFollowupItem(item.id)}>Tolak & Minta Dikerjakan Ulang</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {report.status === 'needs_revision' && revisionItems.length > 0 && (
        <div className="revision-items-section">
          <h3>Poin-poin yang Perlu Direvisi</h3>
          {revisionItems.map((item) => (
            <div key={item.id} className="revision-item">
              <div className="revision-item-header">
                <h4>Poin {item.item_number}</h4>
                <span className={`badge badge-${item.status}`}>{getRevisionStatusLabel(item.status)}</span>
              </div>
              <p><strong>Yang harus direvisi:</strong> {item.description}</p>
              {item.admin_notes && <p className="admin-notes"><strong>Catatan Admin:</strong> {item.admin_notes}</p>}

              {isOwner && !isAdmin && item.status === 'pending' && (
                <div className="revision-response-form">
                  <label>Penjelasan Revisi Anda:</label>
                  <textarea
                    placeholder="Jelaskan apa yang sudah Anda perbaiki..."
                    value={revisionResponses[item.id] || ''}
                    onChange={(e) => setRevisionResponses({ ...revisionResponses, [item.id]: e.target.value })}
                    rows={3}
                  />
                  <label>Upload File Bukti (PDF):</label>
                  <input type="file" accept=".pdf" onChange={(e) => handleRevisionFileUpload(item.id, e)} disabled={uploadingRevisionFile === item.id} />
                  {uploadingRevisionFile === item.id && <span>Uploading...</span>}
                  {revisionFiles[item.id] && revisionFiles[item.id].length > 0 && (
                    <div className="uploaded-files">
                      <strong>File yang sudah diupload:</strong>
                      <ul>
                        {revisionFiles[item.id].map(file => (
                          <li key={file.id}>
                            <button type="button" onClick={() => handleDownloadRevisionFile(file.id, file.original_name)} disabled={downloading === file.id} className="btn-link">
                              {downloading === file.id ? 'Downloading...' : file.original_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button type="button" className="btn-primary btn-auto" onClick={() => handleSubmitRevisionResponse(item.id)} disabled={submittingRevision === item.id}>
                    {submittingRevision === item.id ? 'Mengirim...' : 'Kirim Revisi'}
                  </button>
                </div>
              )}

              {item.user_response && (
                <div className="user-response">
                  <p><strong>Penjelasan User:</strong> {item.user_response}</p>
                  {revisionFiles[item.id] && revisionFiles[item.id].length > 0 && (
                    <div className="uploaded-files">
                      <strong>File Bukti:</strong>
                      <ul>
                        {revisionFiles[item.id].map(file => (
                          <li key={file.id}>
                            <button type="button" onClick={() => handleDownloadRevisionFile(file.id, file.original_name)} disabled={downloading === file.id} className="btn-link">
                              {downloading === file.id ? 'Downloading...' : file.original_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {isAdmin && item.status === 'completed' && (
                <div className="admin-actions">
                  <button type="button" className="btn-success" onClick={() => handleApproveRevisionItem(item.id)}>Setujui Revisi Ini</button>
                  <button type="button" className="btn-danger" onClick={() => handleRejectRevisionItem(item.id)}>Tolak & Minta Dikerjakan Ulang</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && report.status === 'approved' && (
        <div className="success-notice">
          <p>Laporan Anda telah disetujui!</p>
        </div>
      )}

      {report.status === 'rejected' && (
        <div className="rejected-notice">
          <p><strong>Laporan ditolak</strong></p>
          {report.rejection_notes && <p><strong>Alasan:</strong> {report.rejection_notes}</p>}
          {isOwner && (
            <div className="resubmit-section">
              <p>Silakan perbaiki laporan Anda dengan menambah/mengganti file bukti, lalu kirim ulang.</p>
              <button type="button" className="btn-primary btn-auto" onClick={handleResubmit} disabled={resubmitting}>
                {resubmitting ? 'Mengirim...' : 'Kirim Ulang untuk Review'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
