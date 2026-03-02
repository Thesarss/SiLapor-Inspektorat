import { useState } from 'react';
import apiClient from '../api/client';
import '../styles/ImportExecutionComponent.css';

interface ImportExecutionComponentProps {
  uploadData: any;
  mappingData: any;
  validationData: any;
  targetData: {
    targetOPD: {
      id: string;
      name: string;
      institution: string;
      email: string;
    };
    selectedOPDId: string;
  };
  onExecutionComplete: () => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export default function ImportExecutionComponent({
  uploadData,
  mappingData,
  validationData,
  targetData,
  onExecutionComplete,
  onError,
  onBack
}: ImportExecutionComponentProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const handleExecuteImport = async () => {
    try {
      setIsExecuting(true);
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await apiClient.post('/imports/execute', {
        uploadId: uploadData.uploadId,
        mapping: mappingData.mapping,
        fileName: uploadData.fileName,
        targetOPD: targetData.targetOPD
      });

      clearInterval(progressInterval);
      setProgress(100);
      setExecutionResult(response.data);
      setIsExecuting(false);
    } catch (error: any) {
      setIsExecuting(false);
      const errorMessage = error.response?.data?.error || 'Gagal execute import';
      onError(errorMessage);
    }
  };

  if (executionResult) {
    return (
      <div className="import-execution-component">
        <div className="execution-result">
          <h2>✓ Import Selesai</h2>

          <div className="result-summary">
            <div className="result-card success">
              <div className="result-value">{executionResult.summary.successCount}</div>
              <div className="result-label">Laporan Berhasil Dibuat</div>
            </div>
            <div className="result-card error">
              <div className="result-value">{executionResult.summary.failureCount}</div>
              <div className="result-label">Gagal</div>
            </div>
            <div className="result-card duplicate">
              <div className="result-value">{executionResult.summary.duplicateCount}</div>
              <div className="result-label">Duplikat</div>
            </div>
          </div>

          {executionResult.failedRows.length > 0 && (
            <div className="failed-rows-section">
              <h3>Baris yang Gagal ({executionResult.failedRows.length})</h3>
              <div className="failed-rows-list">
                {executionResult.failedRows.map((failed: any, idx: number) => (
                  <div key={idx} className="failed-row">
                    <span className="row-number">Baris {failed.rowNumber}</span>
                    <span className="reason">{failed.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="execution-actions">
            <button className="btn btn-primary" onClick={onExecutionComplete}>
              Lihat History →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="import-execution-component">
      <div className="target-info-section">
        <h3>Target OPD</h3>
        <div className="target-details">
          <p><strong>Institusi:</strong> {targetData.targetOPD.institution}</p>
          <p><strong>PIC:</strong> {targetData.targetOPD.name}</p>
        </div>
      </div>
      
      <div className="execution-section">
        <h2>Eksekusi Import</h2>
        <p className="execution-description">
          Siap untuk mengimport {validationData.validationReport.validRows} baris data valid.
        </p>

        <div className="execution-details">
          <div className="detail-item">
            <span className="detail-label">Total Baris:</span>
            <span className="detail-value">{validationData.validationReport.totalRows}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Baris Valid:</span>
            <span className="detail-value">{validationData.validationReport.validRows}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Baris Invalid:</span>
            <span className="detail-value">{validationData.validationReport.invalidRows.length}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Baris Duplikat:</span>
            <span className="detail-value">{validationData.validationReport.duplicateRows.length}</span>
          </div>
        </div>

        {!isExecuting && (
          <div className="execution-actions">
            <button className="btn btn-secondary" onClick={onBack}>
              ← Kembali
            </button>
            <button className="btn btn-primary" onClick={handleExecuteImport}>
              Mulai Import
            </button>
          </div>
        )}

        {isExecuting && (
          <div className="execution-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">Sedang mengimport data... {progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
