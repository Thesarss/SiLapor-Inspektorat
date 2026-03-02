import React, { useState, useRef } from 'react';
import apiClient from '../api/client';
import { notify } from '../utils/notifications';
import '../styles/FileUploadComponent.css';

interface FileUploadComponentProps {
  targetData?: {
    targetOPD: {
      id: string;
      name: string;
      institution: string;
      email: string;
    };
    selectedOPDId: string;
  };
  onUploadComplete: (data: any) => void;
  onError: (error: string) => void;
}

const FileUploadComponent = React.memo(function FileUploadComponent({
  targetData,
  onUploadComplete,
  onError
}: FileUploadComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useFixedFormat, setUseFixedFormat] = useState(true); // Default to fixed format
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
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      notify.error('Format File Tidak Valid', 'Format file harus Excel (.xlsx, .xls) atau CSV (.csv)');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      notify.error('File Terlalu Besar', 'Ukuran file maksimal 10MB');
      return;
    }

    // Set selected file instead of immediately uploading
    setSelectedFile(file);
    notify.info('File Dipilih', `File "${file.name}" siap untuk diupload`);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Show upload start notification
    notify.info('Memulai Upload', `Mengupload file "${selectedFile.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Choose endpoint based on format option
      const endpoint = useFixedFormat ? '/imports/upload-fixed-format' : '/imports/upload';

      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
          
          // Update progress notification every 25%
          if (progress % 25 === 0 && progress > 0 && progress < 100) {
            notify.info('Upload Progress', `Mengupload "${selectedFile.name}": ${progress}%`);
          }
        }
      });

      setIsUploading(false);
      setSelectedFile(null);
      
      // Show success notification
      notify.uploadSuccess(selectedFile.name);
      
      // Add format info to response data
      const responseData = {
        ...response.data,
        useFixedFormat,
        formatMessage: response.data.message
      };
      
      onUploadComplete(responseData);
    } catch (error: any) {
      setIsUploading(false);
      const errorMessage = error.response?.data?.error || 'Gagal mengupload file';
      
      // Show error notification
      notify.uploadError(selectedFile.name, errorMessage);
      
      onError(errorMessage);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    notify.info('File Dihapus', 'File yang dipilih telah dihapus dari antrian upload');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-component">
      {targetData && (
        <div className="target-info">
          <h3>Target OPD</h3>
          <div className="target-details">
            <p><strong>Institusi:</strong> {targetData.targetOPD.institution}</p>
            <p><strong>PIC:</strong> {targetData.targetOPD.name}</p>
            <p><strong>Email:</strong> {targetData.targetOPD.email}</p>
          </div>
        </div>
      )}
      
      <div className="upload-section">
        <h2>Upload File Data Audit</h2>
        <p className="upload-description">
          Upload file Excel atau CSV yang berisi data audit findings. File akan diproses dan dikonversi menjadi laporan.
        </p>

        {/* Format Selection */}
        <div className="format-selection">
          <h3>Mode Pembacaan File</h3>
          <div className="format-options">
            <label className={`format-option ${useFixedFormat ? 'checked' : ''}`}>
              <input
                type="radio"
                name="format"
                checked={useFixedFormat}
                onChange={() => setUseFixedFormat(true)}
                disabled={isUploading}
              />
              <div className="option-content">
                <strong>Format Tetap (Otomatis)</strong>
                <p>Sistem akan otomatis mendeteksi dan memetakan kolom berdasarkan format standar yang sudah dikenal. Cocok untuk file dengan format yang konsisten.</p>
              </div>
            </label>
            <label className={`format-option ${!useFixedFormat ? 'checked' : ''}`}>
              <input
                type="radio"
                name="format"
                checked={!useFixedFormat}
                onChange={() => setUseFixedFormat(false)}
                disabled={isUploading}
              />
              <div className="option-content">
                <strong>Format Manual</strong>
                <p>Anda akan diminta untuk memetakan kolom secara manual. Cocok untuk file dengan format yang berbeda atau tidak standar.</p>
              </div>
            </label>
          </div>
        </div>

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
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            disabled={isUploading}
            style={{ display: 'none' }}
          />

          {!selectedFile && !isUploading ? (
            <>
              <div className="upload-icon">📁</div>
              <h3>Drag & drop file di sini</h3>
              <p>atau klik untuk memilih file</p>
              <p className="file-info">Format: Excel (.xlsx, .xls) atau CSV (.csv)</p>
              <p className="file-info">Ukuran maksimal: 10MB</p>
            </>
          ) : selectedFile && !isUploading ? (
            <div className="file-preview">
              <div className="file-icon">📄</div>
              <div className="file-details">
                <h4>{selectedFile.name}</h4>
                <p className="file-size">{formatFileSize(selectedFile.size)}</p>
                <p className="file-type">{selectedFile.type || 'File Excel/CSV'}</p>
              </div>
              <div className="file-actions">
                <button 
                  className="btn-upload" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                >
                  Upload File
                </button>
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
            <>
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p>{uploadProgress}%</p>
                <p className="uploading-text">Mengupload {selectedFile?.name}...</p>
              </div>
            </>
          )}
        </div>

        <div className="upload-tips">
          <h4>Tips:</h4>
          {useFixedFormat ? (
            <ul>
              <li>Format tetap akan membaca header dari baris ke-5</li>
              <li>Sistem akan otomatis mendeteksi kolom: Temuan, Rekomendasi, Institusi, dll.</li>
              <li>Pastikan file menggunakan format standar yang sudah dikenal sistem</li>
              <li>Jika deteksi gagal, sistem akan fallback ke mode manual</li>
            </ul>
          ) : (
            <ul>
              <li>Pastikan file memiliki header di baris pertama</li>
              <li>Kolom yang diperlukan: Temuan, Rekomendasi, Institusi Tujuan</li>
              <li>Kolom opsional: Nomor LHP, Tanggal LHP, Penyebab</li>
              <li>Hindari kolom kosong atau data yang tidak lengkap</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
});

export default FileUploadComponent;
