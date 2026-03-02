import { useState } from 'react';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';

interface Props {
  matrixItem: any;
  assignmentId: string;
  onEvidenceUploaded: () => void;
}

export function MatrixEvidenceUploadComponent({ matrixItem, assignmentId, onEvidenceUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tindak Lanjut');
  const [priority, setPriority] = useState('medium');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        notify.error('File terlalu besar. Maksimal 10MB');
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        notify.error('Tipe file tidak didukung. Gunakan PDF, gambar, atau dokumen Office');
        return;
      }
      
      setSelectedFile(file);
      setDescription(`Evidence untuk: ${matrixItem.temuan}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      notify.warning('Pilih file terlebih dahulu');
      return;
    }

    if (!description.trim()) {
      notify.warning('Deskripsi wajib diisi');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('evidence', selectedFile);
      formData.append('assignmentId', assignmentId);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('priority', priority);

      const response = await apiClient.post(`/matrix/item/${matrixItem.id}/evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        notify.success('Evidence berhasil diupload');
        setSelectedFile(null);
        setDescription('');
        onEvidenceUploaded();
        
        // Reset file input
        const fileInput = document.getElementById(`file-input-${matrixItem.id}`) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        notify.error(response.data.error || 'Gagal mengupload evidence');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      notify.error(error.response?.data?.error || 'Gagal mengupload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setDescription('');
    const fileInput = document.getElementById(`file-input-${matrixItem.id}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="matrix-evidence-upload">
      <div className="upload-section">
        <h4>📎 Upload Evidence</h4>
        <p className="upload-hint">
          Upload file bukti tindak lanjut untuk item: <strong>{matrixItem.temuan}</strong>
        </p>
        
        <div className="file-input-section">
          <input
            id={`file-input-${matrixItem.id}`}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            className="file-input"
          />
          <label htmlFor={`file-input-${matrixItem.id}`} className="file-input-label">
            {selectedFile ? (
              <span>📄 {selectedFile.name}</span>
            ) : (
              <span>📁 Pilih File Evidence</span>
            )}
          </label>
        </div>

        {selectedFile && (
          <div className="upload-form">
            <div className="form-group">
              <label>Deskripsi:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan evidence yang diupload..."
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Kategori:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="Tindak Lanjut">Tindak Lanjut</option>
                  <option value="Dokumen">Dokumen</option>
                  <option value="Foto">Foto</option>
                  <option value="Laporan">Laporan</option>
                  <option value="Surat">Surat</option>
                </select>
              </div>

              <div className="form-group">
                <label>Prioritas:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="form-select"
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                </select>
              </div>
            </div>

            <div className="upload-actions">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-upload"
              >
                {uploading ? '⏳ Mengupload...' : '📤 Upload Evidence'}
              </button>
              <button
                onClick={handleCancel}
                disabled={uploading}
                className="btn-cancel"
              >
                ❌ Batal
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="upload-info">
        <h5>ℹ️ Informasi Upload:</h5>
        <ul>
          <li>Maksimal ukuran file: 10MB</li>
          <li>Format yang didukung: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX</li>
          <li>File akan otomatis dikirim untuk review Inspektorat</li>
          <li>Pastikan file berisi bukti tindak lanjut yang jelas</li>
        </ul>
      </div>
    </div>
  );
}