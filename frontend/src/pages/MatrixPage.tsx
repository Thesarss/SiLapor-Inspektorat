import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import MatrixUploadComponent from '../components/MatrixUploadComponent';
import '../styles/MatrixPage.css';

interface MatrixReport {
  id: string;
  title: string;
  description?: string;
  target_opd: string;
  original_filename: string;
  status: 'draft' | 'active' | 'completed';
  total_items: number;
  completed_items: number;
  created_at: string;
}

interface MatrixAssignment {
  id: string;
  matrix_report_id: string;
  title: string;
  description?: string;
  original_filename: string;
  total_items: number;
  completed_items: number;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_at: string;
  assigned_by_name: string;
}

export function MatrixPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<MatrixReport[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assignments, setAssignments] = useState<MatrixAssignment[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (user?.role === 'inspektorat' || user?.role === 'super_admin') {
        await Promise.all([loadReports(), loadInstitutions()]);
      } else {
        await loadAssignments();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    const response = await apiClient.get('/matrix/reports');
    if (response.data.success) setReports(response.data.data);
  };

  const loadInstitutions = async () => {
    const response = await apiClient.get('/matrix/institutions');
    if (response.data.success) setInstitutions(response.data.data);
  };

  const loadAssignments = async () => {
    const response = await apiClient.get('/matrix/assignments');
    if (response.data.success) setAssignments(response.data.data);
  };

  const handleFileChange = () => {
    // This function is no longer needed with the new upload component
  };

  const handleUpload = async () => {
    // This function is no longer needed with the new upload component
  };

  const handleUploadComplete = (data: any) => {
    console.log('Upload completed:', data);
    setShowUploadForm(false);
    loadReports(); // Reload reports after successful upload
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Error is already handled by the upload component
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: '📝 Draft', active: '🔄 Active', completed: '✅ Completed',
      pending: '⏳ Pending', in_progress: '🔄 In Progress'
    };
    return badges[status as keyof typeof badges] || status;
  };

  if (loading) return <div className="loading">Memuat data matrix...</div>;
  if (error) return (
    <div className="matrix-page">
      <div className="error-message">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={loadData} className="btn-retry">🔄 Coba Lagi</button>
      </div>
    </div>
  );

  return (
    <div className="matrix-page">
      <div className="page-header">
        <h1>📊 Matrix Audit System</h1>
        <p className="page-description">
          {user?.role === 'inspektorat' || user?.role === 'super_admin' 
            ? 'Upload dan kelola matrix audit untuk OPD'
            : 'Lihat dan kerjakan matrix audit yang ditugaskan'}
        </p>
      </div>
      {(user?.role === 'inspektorat' || user?.role === 'super_admin') && (
        <div className="inspektorat-section">
          <div className="section-header">
            <h2>📋 Matrix Reports</h2>
            <button className="btn-primary" onClick={() => setShowUploadForm(true)}>
              ➕ Upload Matrix Baru
            </button>
          </div>
          {showUploadForm && (
            <MatrixUploadComponent
              institutions={institutions}
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
              onCancel={() => setShowUploadForm(false)}
            />
          )}
          <div className="reports-grid">
            {reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>Belum Ada Matrix</h3>
                <p>Upload matrix audit pertama Anda untuk memulai</p>
                <button className="btn-primary" onClick={() => setShowUploadForm(true)}>➕ Upload Matrix</button>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="report-card">
                  <div className="card-header">
                    <h3>{report.title}</h3>
                    <span className={`status-badge ${report.status}`}>{getStatusBadge(report.status)}</span>
                  </div>
                  <div className="card-content">
                    <p className="target-opd">🏢 Target: {report.target_opd}</p>
                    {report.description && <p className="description">{report.description}</p>}
                    <div className="progress-info">
                      <div className="progress-text">
                        Progress: {report.completed_items}/{report.total_items} items 
                        ({getProgressPercentage(report.completed_items, report.total_items)}%)
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${getProgressPercentage(report.completed_items, report.total_items)}%` 
                        }}></div>
                      </div>
                    </div>
                    <div className="card-meta">
                      <span>📄 {report.original_filename}</span>
                      <span>📅 {new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => navigate(`/matrix/detail/${report.id}`)}
                    >
                      👁️ Lihat Detail
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={() => navigate(`/matrix/progress/${report.id}`)}
                    >
                      📊 View Progress
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {user?.role === 'opd' && (
        <div className="opd-section">
          <div className="section-header">
            <h2>📋 Matrix Assignments</h2>
            <p>Matrix audit yang ditugaskan kepada Anda</p>
          </div>
          <div className="assignments-grid">
            {assignments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>Belum Ada Penugasan</h3>
                <p>Anda belum memiliki matrix audit yang perlu dikerjakan</p>
                <p className="help-text">
                  Penugasan akan muncul di sini setelah Inspektorat mengupload matrix dan menugaskannya ke institusi Anda.
                </p>
              </div>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="assignment-card">
                  <div className="card-header">
                    <h3>{assignment.title}</h3>
                    <span className={`status-badge ${assignment.status}`}>{getStatusBadge(assignment.status)}</span>
                  </div>
                  <div className="card-content">
                    {assignment.description && <p className="description">{assignment.description}</p>}
                    <div className="progress-info">
                      <div className="progress-text">
                        Progress: {assignment.completed_items}/{assignment.total_items} items 
                        ({getProgressPercentage(assignment.completed_items, assignment.total_items)}%)
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${getProgressPercentage(assignment.completed_items, assignment.total_items)}%` 
                        }}></div>
                      </div>
                    </div>
                    <div className="card-meta">
                      <span>👤 Dari: {assignment.assigned_by_name}</span>
                      <span>📅 {new Date(assignment.assigned_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button className="btn-primary" onClick={() => navigate(`/matrix/work/${assignment.id}`)}>
                      {assignment.status === 'pending' ? '🚀 Mulai Kerjakan' : '📝 Lanjut Kerjakan'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
