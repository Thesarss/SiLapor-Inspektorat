import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export function CreateReportPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Hanya file PDF yang diperbolehkan');
    } else {
      setError('');
    }
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Judul dan deskripsi wajib diisi');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const reportRes = await apiClient.post('/reports/user', {
        title,
        description
      });
      
      const reportId = reportRes.data.data.id;

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await apiClient.post(`/files/upload/report/${reportId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      navigate('/my-reports');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal membuat laporan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-report">
      <h1>📝 Buat Laporan Baru</h1>
      
      <div className="info-box info-blue">
        <span className="info-icon">💡</span>
        <div>
          <strong>Petunjuk Pengisian</strong>
          <p>Isi judul dan deskripsi laporan dengan jelas. Lampirkan file bukti dalam format PDF untuk memperkuat laporan Anda.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">📌 Judul Laporan</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Contoh: Laporan Evaluasi Kegiatan Workshop"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">📋 Deskripsi / Tindak Lanjut</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            placeholder="Jelaskan secara detail isi laporan atau tindak lanjut yang telah dilakukan..."
          />
        </div>
        
        <div className="form-group">
          <label>📎 File Bukti (PDF)</label>
          <div className="file-dropzone">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-dropzone-label">
              <div className="file-dropzone-icon">📄</div>
              <p className="file-dropzone-text">Klik untuk memilih file PDF</p>
              <p className="file-dropzone-hint">atau drag & drop file ke sini</p>
            </label>
          </div>
          
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((file, index) => (
                <li key={index}>
                  <span>📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button type="button" className="btn-delete" onClick={() => removeFile(index)}>
                    ✕ Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Mengirim...' : '🚀 Kirim Laporan'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/my-reports')}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
