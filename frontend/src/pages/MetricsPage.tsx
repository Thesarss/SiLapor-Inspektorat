import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import { Metric, FindingsCategory } from '../types';
import { notify } from '../utils/notifications';

export function MetricsPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [categories, setCategories] = useState<FindingsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [findingNumber, setFindingNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchMetrics();
  }, [reportId]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/metrics/categories');
      setCategories(response.data.data || []);
      if (response.data.data?.length > 0) {
        setCategoryId(response.data.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await apiClient.get(`/metrics/report/${reportId}/grouped`);
      const grouped = response.data.data || [];
      const allMetrics: Metric[] = [];
      for (const group of grouped) {
        allMetrics.push(...group.metrics);
      }
      setMetrics(allMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Tipe file tidak didukung. Gunakan PDF, Excel, CSV, atau gambar.');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || !file) {
      setError('Judul, kategori, dan file wajib diisi');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('reportId', reportId!);
      formData.append('categoryId', categoryId);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('findingNumber', findingNumber);
      formData.append('severity', severity);
      formData.append('file', file);

      await apiClient.post('/metrics/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFindingNumber('');
      setSeverity('medium');
      setFile(null);

      // Refresh metrics
      fetchMetrics();
      notify.success('Metrik berhasil ditambahkan ke laporan');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Gagal menambahkan metrik');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    notify.confirm(
      'Konfirmasi Hapus Metrik',
      'Yakin ingin menghapus metrik ini? Tindakan ini tidak dapat dibatalkan.',
      async () => {
        try {
          await apiClient.delete(`/metrics/${metricId}`);
          fetchMetrics();
          notify.success('Metrik berhasil dihapus dari laporan');
        } catch (error) {
          console.error('Failed to delete metric:', error);
          notify.error('Gagal menghapus metrik');
        }
      }
    );
  };

  const handleUpdateStatus = async (metricId: string, newStatus: string) => {
    try {
      await apiClient.put(`/metrics/${metricId}/status`, { status: newStatus });
      fetchMetrics();
    } catch (error) {
      console.error('Failed to update status:', error);
      setError('Gagal mengubah status');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#7f1d1d',
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      low: 'Rendah',
      medium: 'Sedang',
      high: 'Tinggi',
      critical: 'Kritis',
    };
    return labels[severity] || severity;
  };

  if (loading) return <div className="loading">Memuat metrik...</div>;

  return (
    <div className="metrics-page">
      <h1>📊 Manajemen Metrik & Temuan</h1>

      <div className="metrics-container">
        {/* Upload Form */}
        <div className="metrics-upload-section">
          <h2>📤 Tambah Metrik Baru</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="metrics-form">
            <div className="form-group">
              <label>📌 Judul Metrik</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Temuan Keamanan Data"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>🏷️ Kategori</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>⚠️ Tingkat Keparahan</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                  <option value="critical">Kritis</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>🔢 Nomor Temuan (Opsional)</label>
                <input
                  type="text"
                  value={findingNumber}
                  onChange={(e) => setFindingNumber(e.target.value)}
                  placeholder="Contoh: TEM-001"
                />
              </div>
            </div>

            <div className="form-group">
              <label>📝 Deskripsi</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan detail metrik atau temuan..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>📎 File (PDF, Excel, CSV, atau Gambar)</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif"
                required
              />
              {file && <p className="file-info">✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>}
            </div>

            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? '⏳ Mengunggah...' : '🚀 Tambah Metrik'}
            </button>
          </form>
        </div>

        {/* Metrics List */}
        <div className="metrics-list-section">
          <h2>📋 Daftar Metrik</h2>

          {metrics.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>Belum ada metrik untuk laporan ini</p>
            </div>
          ) : (
            <div className="metrics-grid">
              {metrics.map((metric) => (
                <div key={metric.id} className="metric-card">
                  <div className="metric-header">
                    <div className="metric-title-section">
                      <span className="metric-icon">{metric.icon || '📋'}</span>
                      <div>
                        <h3>{metric.title}</h3>
                        <p className="metric-category">{metric.category_name}</p>
                      </div>
                    </div>
                    <span
                      className="metric-severity"
                      style={{ backgroundColor: getSeverityColor(metric.severity) }}
                    >
                      {getSeverityLabel(metric.severity)}
                    </span>
                  </div>

                  {metric.finding_number && (
                    <p className="metric-number">🔢 {metric.finding_number}</p>
                  )}

                  {metric.description && (
                    <p className="metric-description">{metric.description}</p>
                  )}

                  <div className="metric-footer">
                    <select
                      value={metric.status}
                      onChange={(e) => handleUpdateStatus(metric.id, e.target.value)}
                      className="metric-status-select"
                    >
                      <option value="open">Terbuka</option>
                      <option value="in_progress">Sedang Dikerjakan</option>
                      <option value="resolved">Terselesaikan</option>
                      <option value="closed">Ditutup</option>
                    </select>

                    {metric.file_name && (
                      <a
                        href={`/api/metrics/${metric.id}/download`}
                        className="btn-link"
                        download
                      >
                        📥 Download
                      </a>
                    )}

                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteMetric(metric.id)}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
