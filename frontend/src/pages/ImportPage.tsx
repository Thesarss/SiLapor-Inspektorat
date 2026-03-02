import { useState } from 'react';
import TargetSelectionComponent from '../components/TargetSelectionComponent';
import FileUploadComponent from '../components/FileUploadComponent';
import PreviewMappingComponent from '../components/PreviewMappingComponent';
import ValidationResultsComponent from '../components/ValidationResultComponent';
import ImportExecutionComponent from '../components/ImportExecutionComponent';
import ImportHistoryComponent from '../components/ImportHistoryComponent';
import '../styles/ImportPage.css';

type ImportStep = 'target' | 'upload' | 'preview' | 'validation' | 'execution' | 'history';

interface TargetData {
  targetOPD: {
    id: string;
    name: string;
    institution: string;
    email: string;
  };
  selectedOPDId: string;
}

interface UploadData {
  uploadId: string;
  fileName: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  preview: {
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  };
}

interface MappingData {
  mapping: Record<string, string>;
  suggestedMapping: Record<string, string>;
  availableFields: string[];
  requiredFields: string[];
}

interface ValidationData {
  validationReport: {
    totalRows: number;
    validRows: number;
    invalidRows: Array<{ rowNumber: number; errors: string[] }>;
    duplicateRows: Array<{ rowNumber: number; nomorLHP: string; existingReportId: string }>;
  };
  canProceed: boolean;
}

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('target');
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [mappingData, setMappingData] = useState<MappingData | null>(null);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [error, setError] = useState<string>('');

  const handleTargetSelected = (data: TargetData) => {
    setTargetData(data);
    setCurrentStep('upload');
    setError('');
  };

  const handleUploadComplete = (data: UploadData) => {
    setUploadData(data);
    setCurrentStep('preview');
    setError('');
  };

  const handleMappingComplete = (data: MappingData) => {
    setMappingData(data);
    setCurrentStep('validation');
    setError('');
  };

  const handleValidationComplete = (data: ValidationData) => {
    setValidationData(data);
    if (data.canProceed) {
      setCurrentStep('execution');
    }
    setError('');
  };

  const handleExecutionComplete = () => {
    setCurrentStep('history');
    setError('');
  };

  const handleReset = () => {
    setCurrentStep('target');
    setTargetData(null);
    setUploadData(null);
    setMappingData(null);
    setValidationData(null);
    setError('');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="import-page">
      <div className="import-container">
        <h1>Import Data Audit</h1>

        <div className="progress-indicator">
          <div className={`step ${currentStep === 'target' ? 'active' : targetData ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Target OPD</span>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${currentStep === 'upload' ? 'active' : uploadData ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Upload</span>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${currentStep === 'preview' ? 'active' : mappingData ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Preview & Mapping</span>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${currentStep === 'validation' ? 'active' : validationData ? 'completed' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Validation</span>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${currentStep === 'execution' ? 'active' : currentStep === 'history' ? 'completed' : ''}`}>
            <span className="step-number">5</span>
            <span className="step-label">Execution</span>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${currentStep === 'history' ? 'active' : ''}`}>
            <span className="step-number">6</span>
            <span className="step-label">History</span>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button className="close-btn" onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="step-content">
          {currentStep === 'target' && (
            <TargetSelectionComponent
              onTargetSelected={handleTargetSelected}
              onError={handleError}
              onBack={() => setCurrentStep('target')}
            />
          )}

          {currentStep === 'upload' && targetData && (
            <FileUploadComponent
              targetData={targetData}
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          )}

          {currentStep === 'preview' && uploadData && (
            <PreviewMappingComponent
              uploadData={uploadData}
              onMappingComplete={handleMappingComplete}
              onError={handleError}
              onBack={() => setCurrentStep('upload')}
            />
          )}

          {currentStep === 'validation' && uploadData && mappingData && (
            <ValidationResultsComponent
              uploadData={uploadData}
              mappingData={mappingData}
              onValidationComplete={handleValidationComplete}
              onError={handleError}
              onBack={() => setCurrentStep('preview')}
            />
          )}

          {currentStep === 'execution' && uploadData && mappingData && validationData && targetData && (
            <ImportExecutionComponent
              uploadData={uploadData}
              mappingData={mappingData}
              validationData={validationData}
              targetData={targetData}
              onExecutionComplete={handleExecutionComplete}
              onError={handleError}
              onBack={() => setCurrentStep('validation')}
            />
          )}

          {currentStep === 'history' && (
            <ImportHistoryComponent
              onReset={handleReset}
              onError={handleError}
            />
          )}
        </div>

        <div className="action-buttons">
          {currentStep !== 'target' && currentStep !== 'history' && (
            <button className="btn btn-secondary" onClick={() => {
              if (currentStep === 'upload') setCurrentStep('target');
              else if (currentStep === 'preview') setCurrentStep('upload');
              else if (currentStep === 'validation') setCurrentStep('preview');
              else if (currentStep === 'execution') setCurrentStep('validation');
            }}>
              ← Kembali
            </button>
          )}
          {currentStep === 'history' && (
            <button className="btn btn-primary" onClick={handleReset}>
              Import Baru
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
