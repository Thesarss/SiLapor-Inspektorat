import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../styles/PreviewMappingComponent.css';

interface PreviewMappingComponentProps {
  uploadData: any;
  onMappingComplete: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export default function PreviewMappingComponent({
  uploadData,
  onMappingComplete,
  onError,
  onBack
}: PreviewMappingComponentProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [suggestedMapping, setSuggestedMapping] = useState<Record<string, string>>({});
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Use auto-mapping from upload response if available
    if (uploadData.autoMapping) {
      setSuggestedMapping(uploadData.autoMapping);
      setAvailableFields(uploadData.availableFields || []);
      setRequiredFields(uploadData.requiredFields || []);
      setMapping(uploadData.autoMapping);
      setIsLoading(false);
    } else {
      getSuggestedMapping();
    }
  }, []);

  const getSuggestedMapping = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/imports/suggest-mapping', {
        headers: uploadData.preview.headers
      });

      setSuggestedMapping(response.data.suggestedMapping);
      setAvailableFields(response.data.availableFields);
      setRequiredFields(response.data.requiredFields);
      setMapping(response.data.suggestedMapping);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      const errorMessage = error.response?.data?.error || 'Gagal get suggested mapping';
      onError(errorMessage);
    }
  };

  const handleMappingChange = (systemField: string, fileColumn: string) => {
    setMapping({
      ...mapping,
      [systemField]: fileColumn
    });
  };

  const handleValidateMapping = async () => {
    try {
      const response = await apiClient.post('/imports/validate-mapping', {
        mapping
      });

      if (response.data.valid) {
        setValidationErrors([]);
        onMappingComplete({
          mapping,
          suggestedMapping,
          availableFields,
          requiredFields
        });
      }
    } catch (error: any) {
      const errors = error.response?.data?.errors || [error.response?.data?.error || 'Gagal validasi mapping'];
      setValidationErrors(errors);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="preview-mapping-component">
      {/* Format Info */}
      {uploadData.formatMessage && (
        <div className={`format-info ${uploadData.isFixedFormat ? 'success' : 'warning'}`}>
          <div className="format-icon">
            {uploadData.isFixedFormat ? '✅' : '⚠️'}
          </div>
          <div className="format-content">
            <h3>{uploadData.isFixedFormat ? 'Format Tetap Terdeteksi' : 'Menggunakan Format Manual'}</h3>
            <p>{uploadData.formatMessage}</p>
            {uploadData.formatValidation && (
              <p className="format-details">
                Confidence: {uploadData.formatValidation.confidence}% | 
                Fields terdeteksi: {uploadData.formatValidation.detectedFields.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <h2>Preview Data</h2>
        <div className="preview-table">
          <table>
            <thead>
              <tr>
                {uploadData.preview.headers.map((header: string) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploadData.preview.rows.slice(0, 5).map((row: any, idx: number) => (
                <tr key={idx}>
                  {uploadData.preview.headers.map((header: string) => (
                    <td key={`${idx}-${header}`}>{row[header]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="preview-info">Menampilkan 5 baris pertama dari {uploadData.preview.totalRows} total baris</p>
        </div>
      </div>

      <div className="section">
        <h2>Column Mapping</h2>
        <p className="mapping-description">
          Cocokkan kolom file dengan field sistem. Field yang ditandai dengan * adalah wajib diisi.
        </p>

        <div className="mapping-grid">
          {availableFields.map((systemField) => (
            <div key={systemField} className="mapping-row">
              <label className="system-field">
                {systemField}
                {requiredFields.includes(systemField) && <span className="required">*</span>}
              </label>
              <select
                value={mapping[systemField] || ''}
                onChange={(e) => handleMappingChange(systemField, e.target.value)}
                className="file-column-select"
              >
                <option value="">-- Pilih Kolom --</option>
                {uploadData.preview.headers.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            <h4>Errors:</h4>
            <ul>
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mapping-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Kembali
          </button>
          <button className="btn btn-primary" onClick={handleValidateMapping}>
            Lanjut ke Validasi →
          </button>
        </div>
      </div>
    </div>
  );
}
