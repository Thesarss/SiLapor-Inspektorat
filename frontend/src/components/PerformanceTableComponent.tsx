import '../styles/PerformanceTableComponent.css';

interface OPDPerformance {
  opd_name: string;
  institution: string;
  total_assignments: number;
  total_items: number;
  completed_items: number;
  submitted_items: number;
  pending_items: number;
  completion_rate: number;
  avg_response_time: number;
}

interface InspektoratPerformance {
  inspektorat_name: string;
  total_matrix_uploaded: number;
  total_items_uploaded: number;
  total_reviews_done: number;
  avg_review_time: number;
  approval_rate?: number;
}

interface PerformanceTableProps {
  type: 'opd' | 'inspektorat';
  data: OPDPerformance[] | InspektoratPerformance[];
  onRefresh: () => void;
}

export function PerformanceTableComponent({ type, data, onRefresh }: PerformanceTableProps) {
  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getCompletionStatus = (rate: number) => {
    if (rate >= 80) return '✅ Sangat Baik';
    if (rate >= 50) return '⚠️ Cukup';
    return '❌ Perlu Ditingkatkan';
  };

  if (type === 'opd') {
    const opdData = data as OPDPerformance[];
    
    return (
      <div className="performance-table-container">
        <div className="table-header-section">
          <h2>🏢 Performa OPD</h2>
          <button className="btn-refresh" onClick={onRefresh}>
            🔄 Refresh
          </button>
        </div>

        {opdData.length === 0 ? (
          <div className="empty-state">
            <p>📭 Belum ada data performa OPD</p>
          </div>
        ) : (
          <div className="performance-table-wrapper">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama OPD</th>
                  <th>Institusi</th>
                  <th>Total Assignment</th>
                  <th>Total Item</th>
                  <th>Selesai</th>
                  <th>Disubmit</th>
                  <th>Pending</th>
                  <th>Tingkat Penyelesaian</th>
                  <th>Rata-rata Waktu Respon (hari)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {opdData.map((opd, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="opd-name">{opd.opd_name}</td>
                    <td>{opd.institution}</td>
                    <td>{opd.total_assignments}</td>
                    <td>{opd.total_items}</td>
                    <td className="completed">{opd.completed_items}</td>
                    <td className="submitted">{opd.submitted_items}</td>
                    <td className="pending">{opd.pending_items}</td>
                    <td>
                      <div className="completion-rate">
                        <div 
                          className="rate-bar"
                          style={{ 
                            width: `${opd.completion_rate}%`,
                            backgroundColor: getCompletionColor(opd.completion_rate)
                          }}
                        />
                        <span className="rate-text">{opd.completion_rate}%</span>
                      </div>
                    </td>
                    <td>{opd.avg_response_time ? opd.avg_response_time.toFixed(1) : '0.0'}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ color: getCompletionColor(opd.completion_rate) }}
                      >
                        {getCompletionStatus(opd.completion_rate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-summary">
          <p>Total OPD: <strong>{opdData.length}</strong></p>
          <p>
            Rata-rata Penyelesaian: <strong>
              {opdData.length > 0 
                ? (opdData.reduce((sum, opd) => sum + opd.completion_rate, 0) / opdData.length).toFixed(2)
                : 0}%
            </strong>
          </p>
        </div>
      </div>
    );
  }

  // Inspektorat performance
  const inspektoratData = data as InspektoratPerformance[];
  
  return (
    <div className="performance-table-container">
      <div className="table-header-section">
        <h2>👔 Performa Inspektorat</h2>
        <button className="btn-refresh" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {inspektoratData.length === 0 ? (
        <div className="empty-state">
          <p>📭 Belum ada data performa Inspektorat</p>
        </div>
      ) : (
        <div className="performance-table-wrapper">
          <table className="performance-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Inspektorat</th>
                <th>Total Matrix Diupload</th>
                <th>Total Item Diupload</th>
                <th>Total Review Selesai</th>
                <th>Rata-rata Waktu Review (hari)</th>
              </tr>
            </thead>
            <tbody>
              {inspektoratData.map((inspektorat, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="inspektorat-name">{inspektorat.inspektorat_name}</td>
                  <td>{inspektorat.total_matrix_uploaded}</td>
                  <td>{inspektorat.total_items_uploaded}</td>
                  <td className="completed">{inspektorat.total_reviews_done}</td>
                  <td>{inspektorat.avg_review_time ? inspektorat.avg_review_time.toFixed(1) : '0.0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-summary">
        <p>Total Inspektorat: <strong>{inspektoratData.length}</strong></p>
        <p>
          Total Matrix: <strong>
            {inspektoratData.reduce((sum, insp) => sum + insp.total_matrix_uploaded, 0)}
          </strong>
        </p>
        <p>
          Total Review: <strong>
            {inspektoratData.reduce((sum, insp) => sum + insp.total_reviews_done, 0)}
          </strong>
        </p>
      </div>
    </div>
  );
}
