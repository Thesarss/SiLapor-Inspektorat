import React, { useState, useRef } from 'react';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import '../styles/MatrixUploadComponent.css';

interface MatrixUploadComponentProps {
  institutions: string[];
  onUploadComplete: (data: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const MatrixUploadComponent = React.memo(function MatrixUploadComponent({
  institutions,
  onUploadComplete,
  onError,
  onCancel
}: MatrixUploadComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetOPD: '',
    useAutoMapping: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      notify.error('Format File Tidak Valid', 'Format file harus Excel (.xlsx, .xls)');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      notify.error('File Terlalu Besar', 'Ukuran file maksimal 10MB');
      return;
    }

    setSelectedFile(file);
    notify.info('File Dipilih', `File "${file.name}" siap untuk diupload`);
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.title || !formData.targetOPD) {
      notify.error('Data Tidak Lengkap', 'Semua field wajib diisi');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    notify.info('Memulai Upload', `Mengupload matrix "${formData.title}"...`);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('targetOPD', formData.targetOPD);
      uploadFormData.append('useAutoMapping', formData.useAutoMapping.toString());

      const endpoint = formData.useAutoMapping ? '/matrix/upload-auto' : '/matrix/upload';

      const response = await apiClient.post(endpoint, uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
          
          if (progress % 25 === 0 && progress > 0 && progress < 100) {
            notify.info('Upload Progress', `Mengupload "${selectedFile.name}": ${progress}%`);
          }
        }
      });

      setIsUploading(false);
      
      notify.success(`Matrix berhasil diupload dan diproses`);
      
      onUploadComplete(response.data);
    } catch (error: any) {
      setIsUploading(false);
      
      let errorMessage = error.response?.data?.error || 'Gagal mengupload matrix';
      const errorDetails = error.response?.data?.details;
      
      // If there are specific errors from parsing, show them
      if (errorDetails?.errors && errorDetails.errors.length > 0) {
        errorMessage = errorDetails.errors[0]; // Show first error
        console.error('📋 Parse errors:', errorDetails.errors);
        console.error('📋 Detected headers:', errorDetails.detectedHeaders);
      }
      
      notify.error('Upload Gagal', errorMessage);
      onError(errorMessage);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    notify.info('File Dihapus', 'File yang dipilih telah dihapus');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="matrix-upload-component">
      <div className="upload-header">
        <h2>📤 Upload Matrix Audit</h2>
        <button className="btn-close" onClick={onCancel}>✕</button>
      </div>

      <div className="upload-form">
        <div className="form-section">
          <h3>Informasi Matrix</h3>
          
          <div className="form-group">
            <label>Judul Matrix *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Matrix Audit Keuangan Q1 2024"
              disabled={isUploading}
              required
            />
          </div>

          <div className="form-group">
            <label>Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi singkat tentang matrix audit ini..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          <div className="form-group">
            <label>Target OPD *</label>
            <select
              value={formData.targetOPD}
              onChange={(e) => setFormData({ ...formData, targetOPD: e.target.value })}
              disabled={isUploading}
              required
            >
              <option value="">-- Pilih OPD --</option>
              {institutions.map((institution) => (
                <option key={institution} value={institution}>{institution}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Mode Pembacaan File</h3>
          
          <div className="mapping-options">
            <label className={`mapping-option ${formData.useAutoMapping ? 'checked' : ''}`}>
              <input
                type="radio"
                name="mapping"
                checked={formData.useAutoMapping}
                onChange={() => setFormData({ ...formData, useAutoMapping: true })}
                disabled={isUploading}
              />
              <div className="option-content">
                <strong>🔍 Deteksi Otomatis (Direkomendasikan)</strong>
                <p>Sistem akan mencari dan mendeteksi kolom dengan header "Temuan", "Penyebab", dan "Rekomendasi" secara otomatis. Header bisa di baris manapun. Cocok untuk file dengan header yang jelas.</p>
              </div>
            </label>
            
            <label className={`mapping-option ${!formData.useAutoMapping ? 'checked' : ''}`}>
              <input
                type="radio"
                name="mapping"
                checked={!formData.useAutoMapping}
                onChange={() => setFormData({ ...formData, useAutoMapping: false })}
                disabled={isUploading}
              />
              <div className="option-content">
                <strong>📋 Urutan Kolom Sederhana</strong>
                <p>Sistem akan membaca kolom berurutan: Kolom 1 = Temuan, Kolom 2 = Penyebab, Kolom 3 = Rekomendasi. Tidak perlu header. Cocok untuk file Excel sederhana tanpa header atau dengan format berbeda.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>File Excel</h3>
          
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />

            {!selectedFile && !isUploading ? (
              <>
                <div className="upload-icon">📊</div>
                <h4>Drag & drop file Excel di sini</h4>
                <p>atau klik untuk memilih file</p>
                <p className="file-info">Format: Excel (.xlsx, .xls)</p>
                <p className="file-info">Ukuran maksimal: 10MB</p>
              </>
            ) : selectedFile && !isUploading ? (
              <div className="file-preview">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <h4>{selectedFile.name}</h4>
                  <p className="file-size">{formatFileSize(selectedFile.size)}</p>
                  <p className="file-type">File Excel Matrix</p>
                </div>
                <div className="file-actions">
                  <button 
                    className="btn-remove" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p>{uploadProgress}%</p>
                <p className="uploading-text">Mengupload dan memproses matrix...</p>
              </div>
            )}
          </div>

          <div className="upload-tips">
            <h4>💡 Tips untuk Matrix Excel:</h4>
            {formData.useAutoMapping ? (
              <ul>
                <li>✅ Pastikan file memiliki header dengan nama: <strong>Temuan</strong>, <strong>Penyebab</strong>, <strong>Rekomendasi</strong></li>
                <li>✅ Header bisa berada di baris manapun (baris 1, 2, 3, dst), sistem akan mendeteksi otomatis</li>
                <li>✅ Kolom tambahan seperti "No", "Keterangan" akan diabaikan</li>
                <li>✅ Baris kosong akan dilewati secara otomatis</li>
                <li>✅ Jika ada beberapa rekomendasi untuk 1 temuan, kosongkan kolom temuan di baris berikutnya</li>
              </ul>
            ) : (
              <ul>
                <li>📋 File akan dibaca berurutan: <strong>Kolom 1 = Temuan</strong>, <strong>Kolom 2 = Penyebab</strong>, <strong>Kolom 3 = Rekomendasi</strong></li>
                <li>📋 Tidak perlu header, atau header akan diabaikan (baris pertama di-skip)</li>
                <li>📋 Cocok untuk file Excel sederhana tanpa header yang jelas</li>
                <li>📋 Baris kosong akan dilewati secara otomatis</li>
                <li>📋 Jika ada beberapa rekomendasi untuk 1 temuan, kosongkan kolom 1 di baris berikutnya</li>
              </ul>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onCancel}
            disabled={isUploading}
          >
            Batal
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || !formData.title || !formData.targetOPD}
          >
            {isUploading ? '⏳ Memproses...' : '📤 Upload Matrix'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default MatrixUploadComponent;