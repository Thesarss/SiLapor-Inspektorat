import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../styles/ImportHistoryComponent.css';

interface ImportHistoryComponentProps {
  onReset: () => void;
  onError: (error: string) => void;
}

export default function ImportHistoryComponent({
  onReset,
  onError
}: ImportHistoryComponentProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/imports/history');
      setHistory(response.data.history || []);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      const errorMessage = error.response?.data?.error || 'Gagal load history';
      onError(errorMessage);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading history...</div>;
  }

  return (
    <div className="import-history-component">
      <h2>History Import</h2>
      {history.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada history import</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item: any) => (
            <div key={item.id} className="history-item">
              <div className="history-header">
                <div className="history-info">
                  <h4>{item.adminName}</h4>
                  <p className="history-date">
                    {new Date(item.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="history-stats">
                  <span className="stat success">✓ {item.successCount}</span>
                  <span className="stat error">✗ {item.failureCount}</span>
                  <span className="stat duplicate">⚠ {item.duplicateCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="history-actions">
        <button className="btn btn-primary" onClick={onReset}>
          Import Baru
        </button>
      </div>
    </div>
  );
}
