import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../styles/ValidationResultsComponent.css';

interface ValidationResultsComponentProps {
  uploadData: any;
  mappingData: any;
  onValidationComplete: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export default function ValidationResultsComponent({
  uploadData,
  mappingData,
  onValidationComplete,
  onError,
  onBack
}: ValidationResultsComponentProps) {
  const [validationReport, setValidationReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvalidRows, setShowInvalidRows] = useState(false);
  const [showDuplicateRows, setShowDuplicateRows] = useState(false);

  useEffect(() => {
    validateData();
  }, []);

  const validateData = async () => {
    try {
      setIsLoading(true);
      const mappedRows = uploadData.preview.rows.map((row: any) => {
        const mappedRow: any = {};
        for (const [systemField, fileColumn] of Object.entries(mappingData.mapping)) {
          mappedRow[systemField] = row[fileColumn as string];
        }
        return mappedRow;
      });

      const response = await apiClient.post('/imports/validate-data', {
        rows: mappedRows
      });

      setValidationReport(response.data.validationReport);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      const errorMessage = error.response?.data?.error || 'Gagal validasi data';
      onError(errorMessage);
    }
  };

  const handleProceed = () => {
    if (validationReport && validationReport.invalidRows.length === 0) {
      onValidationComplete({
        validationReport,
        canProceed: true
      });
    }
  };

  if (isLoading) {
    return <div className="loading">Validating data...</div>;
  }

  if (!validationReport) {
    return <div className="error">Gagal load validation report</div>;
  }

  const canProceed = validationReport.invalidRows.length === 0;

  return (
    <div className="validation-results-component">
      <h2>Hasil Validasi Data</h2>

      <div className="validation-summary">
        <div className="summary-card total">
          <div className="summary-value">{validationReport.totalRows}</div>
          <div className="summary-label">Total Baris</div>
        </div>
        <div className="summary-card valid">
          <div className="summary-value">{validationReport.validRows}</div>
          <div className="summary-label">Valid</div>
        </div>
        <div className="summary-card invalid">
          <div className="summary-value">{validationReport.invalidRows.length}</div>
          <div className="summary-label">Invalid</div>
        </div>
        <div className="summary-card duplicate">
          <div className="summary-value">{validationReport.duplicateRows.length}</div>
          <div className="summary-label">Duplikat</div>
        </div>
      </div>

      {validationReport.invalidRows.length > 0 && (
        <div className="validation-section">
          <div className="section-header" onClick={() => setShowInvalidRows(!showInvalidRows)}>
            <h3>❌ Baris Invalid ({validationReport.invalidRows.length})</h3>
            <span className="toggle-icon">{showInvalidRows ? '▼' : '▶'}</span>
          </div>
          {showInvalidRows && (
            <div className="invalid-rows-list">
              {validationReport.invalidRows.map((item: any, idx: number) => (
                <div key={idx} className="invalid-row">
                  <div className="row-number">Baris {item.rowNumber}</div>
                  <ul className="error-list">
                    {item.errors.map((error: string, errorIdx: number) => (
                      <li key={errorIdx}>{error}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {validationReport.duplicateRows.length > 0 && (
        <div className="validation-section">
          <div className="section-header" onClick={() => setShowDuplicateRows(!showDuplicateRows)}>
            <h3>⚠️ Baris Duplikat ({validationReport.duplicateRows.length})</h3>
            <span className="toggle-icon">{showDuplicateRows ? '▼' : '▶'}</span>
          </div>
          {showDuplicateRows && (
            <div className="duplicate-rows-list">
              {validationReport.duplicateRows.map((item: any, idx: number) => (
                <div key={idx} className="duplicate-row">
                  <div className="row-info">
                    <span className="row-number">Baris {item.rowNumber}</span>
                    <span className="nomor-lhp">Nomor LHP: {item.nomorLHP}</span>
                  </div>
                  <div className="duplicate-note">
                    Laporan dengan Nomor LHP ini sudah ada dalam sistem (ID: {item.existingReportId})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canProceed && (
        <div className="success-message">
          ✓ Semua data valid dan siap untuk di-import
        </div>
      )}

      {!canProceed && (
        <div className="warning-message">
          ⚠️ Ada baris yang tidak valid. Silakan perbaiki data dan coba lagi.
        </div>
      )}

      <div className="validation-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Kembali
        </button>
        <button
          className="btn btn-primary"
          onClick={handleProceed}
          disabled={!canProceed}
        >
          Lanjut ke Import →
        </button>
      </div>
    </div>
  );
}