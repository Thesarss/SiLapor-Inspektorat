import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { MatrixEvidenceUploadComponent } from '../components/MatrixEvidenceUploadComponent';
import { MatrixItemsTreeView } from '../components/MatrixItemsTreeView';
import '../styles/MatrixWorkPage.css';

interface MatrixItem {
  id: string;
  item_number: number;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  evidence_filename?: string;
  evidence_file_path?: string;
  evidence_submitted?: boolean;
  evidence_count?: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  review_notes?: string;
  reviewed_at?: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  status: string;
}

export function MatrixWorkPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MatrixItem | null>(null);
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssignmentItems();
  }, [assignmentId]);

  const loadAssignmentItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/matrix/assignment/${assignmentId}/items`);
      
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
    setTindakLanjut(item.tindak_lanjut || '');
    setEvidenceFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEvidenceFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    if (!tindakLanjut.trim()) {
      alert('Tindak lanjut wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('tindakLanjut', tindakLanjut);
      if (evidenceFile) {
        formData.append('evidence', evidenceFile);
      }

      const response = await apiClient.post(
        `/matrix/item/${selectedItem.id}/submit`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        alert('✅ Tindak lanjut berhasil disubmit');
        setSelectedItem(null);
        setTindakLanjut('');
        setEvidenceFile(null);
        loadAssignmentItems();
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(`❌ Gagal submit: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmitting(false);
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
      alert('Gagal download evidence');
    }
  };

  const getProgressPercentage = () => {
    if (items.length === 0) return 0;
    const completedItems = items.filter(item => item.status !== 'pending').length;
    return Math.round((completedItems / items.length) * 100);
  };

  if (loading) {
    return <div className="loading">Memuat data matrix...</div>;
  }

  if (error) {
    return (
      <div className="matrix-work-page">
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
    <div className="matrix-work-page">
      <div className="page-header">
        <button onClick={() => navigate('/matrix')} className="btn-back">
          ← Kembali
        </button>
        <div className="header-info">
          <h1>📋 {assignment?.title}</h1>
          {assignment?.description && <p className="description">{assignment.description}</p>}
          <div className="progress-info">
            <span className="progress-text">Progress: {getProgressPercentage()}%</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="work-container">
        <MatrixItemsTreeView
          items={items}
          selectedItem={selectedItem}
          onSelectItem={handleSelectItem}
        />

        <div className="item-detail">
          {selectedItem ? (
            <>
              <div className="detail-header">
                <h2>Item #{selectedItem.item_number}</h2>
                <span className={`status-badge ${selectedItem.status}`}>
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

                {selectedItem.status === 'pending' ? (
                  <div className="work-sections">
                    <form onSubmit={handleSubmit} className="tindak-lanjut-form">
                      <h3>📝 Isi Tindak Lanjut</h3>
                      <p className="form-instruction">
                        Jelaskan tindak lanjut yang telah atau akan dilakukan untuk mengatasi temuan audit ini.
                      </p>
                      
                      <div className="form-group">
                        <label>Tindak Lanjut *</label>
                        <textarea
                          value={tindakLanjut}
                          onChange={(e) => setTindakLanjut(e.target.value)}
                          placeholder="Contoh: Telah dilakukan perbaikan sistem dengan cara... Bukti terlampir berupa screenshot sistem yang telah diperbaiki."
                          rows={6}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Bukti/Evidence (Opsional)</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={handleFileChange}
                        />
                        {evidenceFile && (
                          <p className="file-info">📄 {evidenceFile.name}</p>
                        )}
                        <p className="help-text">
                          Upload bukti pendukung seperti foto, dokumen, atau screenshot. 
                          Format yang didukung: PDF, gambar (JPG, PNG), atau dokumen Word. Maksimal 10MB.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="btn-submit"
                        disabled={submitting}
                      >
                        {submitting ? '⏳ Mengirim...' : '✅ Submit Tindak Lanjut'}
                      </button>
                    </form>

                    <div className="evidence-upload-section">
                      <MatrixEvidenceUploadComponent
                        matrixItem={selectedItem}
                        assignmentId={assignmentId!}
                        onEvidenceUploaded={loadAssignmentItems}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="submitted-info">
                    <div className="detail-section">
                      <h3>📝 Tindak Lanjut yang Disubmit</h3>
                      <p>{selectedItem.tindak_lanjut}</p>
                    </div>

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

                    {selectedItem.status === 'rejected' && selectedItem.review_notes && (
                      <div className="detail-section rejected">
                        <h3>❌ Catatan Penolakan</h3>
                        <p>{selectedItem.review_notes}</p>
                        <div className="revision-note">
                          <p><strong>Perlu Revisi:</strong></p>
                          <p>Silakan perbaiki tindak lanjut sesuai catatan di atas dan submit ulang.</p>
                          <button 
                            className="btn-revise"
                            onClick={() => {
                              // Reset to pending state for revision
                              setSelectedItem({...selectedItem, status: 'pending'});
                            }}
                          >
                            🔄 Revisi Tindak Lanjut
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedItem.status === 'approved' && (
                      <div className="detail-section approved">
                        <h3>✅ Tindak Lanjut Disetujui</h3>
                        <p>Tindak lanjut Anda telah disetujui oleh Inspektorat.</p>
                        {selectedItem.review_notes && (
                          <div className="review-notes">
                            <strong>Catatan Reviewer:</strong>
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
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">👈</div>
                <h3>Pilih Item Temuan</h3>
                <p>Pilih salah satu item temuan dari daftar di sebelah kiri untuk melihat detail dan mengisi tindak lanjut.</p>
                <div className="instruction-list">
                  <h4>Yang perlu Anda lakukan:</h4>
                  <ul>
                    <li>📖 Baca temuan, penyebab, dan rekomendasi</li>
                    <li>📝 Isi tindak lanjut yang telah/akan dilakukan</li>
                    <li>📎 Upload bukti pendukung (opsional)</li>
                    <li>✅ Submit untuk review Inspektorat</li>
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