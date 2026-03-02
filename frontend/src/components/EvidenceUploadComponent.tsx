import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../styles/EvidenceUploadComponent.css';

interface EvidenceUploadProps {
  matrixItemId: string;
  onUploadSuccess?: (evidence: any) => void;
  onClose?: () => void;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  description: string;
  color: string;
}

export function EvidenceUploadComponent({ matrixItemId, onUploadSuccess, onClose }: EvidenceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setLoading(true);
      const [categoriesRes, tagsRes] = await Promise.all([
        apiClient.get('/evidence/meta/categories'),
        apiClient.get('/evidence/meta/tags')
      ]);

      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data);
        if (categoriesRes.data.data.length > 0) {
          setCategory(categoriesRes.data.data[0].name);
        }
      }

      if (tagsRes.data.success) {
        setTags(tagsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      alert('Pilih file evidence terlebih dahulu');
      return;
    }

    if (!description.trim()) {
      alert('Deskripsi wajib diisi');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('evidence', file);
      formData.append('matrix_item_id', matrixItemId);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('tags', JSON.stringify(selectedTags));

      const response = await apiClient.post('/evidence/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('✅ Evidence berhasil diupload!');
        
        // Reset form
        setFile(null);
        setDescription('');
        setPriority('medium');
        setSelectedTags([]);
        
        // Reset file input
        const fileInput = document.getElementById('evidence-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        if (onUploadSuccess) {
          onUploadSuccess(response.data.data);
        }
      } else {
        alert(`❌ Upload gagal: ${response.data.error}`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`❌ Upload gagal: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="evidence-upload-component">
        <div className="loading">Memuat form upload...</div>
      </div>
    );
  }

  return (
    <div className="evidence-upload-component">
      <div className="upload-header">
        <h3>📎 Upload Evidence</h3>
        {onClose && (
          <button className="btn-close" onClick={onClose}>✕</button>
        )}
      </div>

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label htmlFor="evidence-file">File Evidence *</label>
          <input
            id="evidence-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            required
          />
          {file && (
            <div className="file-info">
              <span className="file-name">📄 {file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
            </div>
          )}
          <p className="help-text">
            Format yang didukung: PDF, gambar (JPG, PNG), dokumen (DOC, DOCX), spreadsheet (XLS, XLSX). 
            Maksimal 10MB.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="description">Deskripsi Evidence *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan isi dan tujuan file evidence ini..."
            rows={4}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Kategori</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Prioritas</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <option value="low">🟢 Rendah</option>
              <option value="medium">🔵 Sedang</option>
              <option value="high">🟡 Tinggi</option>
              <option value="critical">🔴 Kritis</option>
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="form-group">
            <label>Tags (Opsional)</label>
            <div className="tags-container">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-button ${selectedTags.includes(tag.name) ? 'selected' : ''}`}
                  style={{
                    borderColor: tag.color,
                    backgroundColor: selectedTags.includes(tag.name) ? tag.color : 'transparent',
                    color: selectedTags.includes(tag.name) ? 'white' : tag.color
                  }}
                  onClick={() => handleTagToggle(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          {onClose && (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={uploading || !file}
          >
            {uploading ? '⏳ Mengupload...' : '📤 Upload Evidence'}
          </button>
        </div>
      </form>
    </div>
  );
}