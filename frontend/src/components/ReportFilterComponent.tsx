import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/ReportFilterComponent.css';

interface FilterProps {
  onFilterChange: (filters: ReportFilters) => void;
  currentFilters: ReportFilters;
}

export interface ReportFilters {
  year?: string;
  institution?: string;
  status?: string;
  search?: string;
}

interface Institution {
  name: string;
  count: number;
}

const ReportFilterComponent = React.memo(function ReportFilterComponent({ onFilterChange, currentFilters }: FilterProps) {
  const { isAdmin } = useAuth();
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableInstitutions, setAvailableInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      
      // Fetch available years and institutions
      const response = await apiClient.get('/reports/filter-options');
      
      setAvailableYears(response.data.data.years || []);
      setAvailableInstitutions(response.data.data.institutions || []);
      
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    const newFilters = {
      ...currentFilters,
      [key]: value === '' ? undefined : value
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(currentFilters).some(value => value !== undefined && value !== '');

  if (loading) {
    return <div className="filter-loading">Loading filter options...</div>;
  }

  return (
    <div className="report-filter-component">
      <div className="filter-header">
        <h3>📊 Filter Laporan</h3>
        {hasActiveFilters && (
          <button 
            type="button" 
            className="btn-clear-filters"
            onClick={clearFilters}
          >
            🗑️ Hapus Filter
          </button>
        )}
      </div>

      <div className={`filter-controls ${!isAdmin ? 'non-admin' : ''}`}>
        <div className="filter-group">
          <label htmlFor="search-filter">Pencarian:</label>
          <input
            id="search-filter"
            type="text"
            value={currentFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
            placeholder="Cari judul laporan, deskripsi, atau nomor LHP..."
          />
        </div>

        <div className="filter-group">
          <label htmlFor="year-filter">Tahun:</label>
          <select
            id="year-filter"
            value={currentFilters.year || ''}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="filter-select"
          >
            <option value="">Semua Tahun</option>
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* OPD Filter - Only show for admin users */}
        {isAdmin && (
          <div className="filter-group">
            <label htmlFor="institution-filter">OPD:</label>
            <select
              id="institution-filter"
              value={currentFilters.institution || ''}
              onChange={(e) => handleFilterChange('institution', e.target.value)}
              className="filter-select"
            >
              <option value="">Semua OPD</option>
              {availableInstitutions.map(inst => (
                <option key={inst.name} value={inst.name}>
                  {inst.name} ({inst.count} laporan)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={currentFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Review</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="needs_revision">Perlu Revisi</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <span className="active-filters-label">Filter aktif:</span>
          {currentFilters.search && (
            <span className="filter-tag">
              Pencarian: {currentFilters.search}
              <button onClick={() => handleFilterChange('search', '')}>×</button>
            </span>
          )}
          {currentFilters.year && (
            <span className="filter-tag">
              Tahun: {currentFilters.year}
              <button onClick={() => handleFilterChange('year', '')}>×</button>
            </span>
          )}
          {isAdmin && currentFilters.institution && (
            <span className="filter-tag">
              OPD: {currentFilters.institution}
              <button onClick={() => handleFilterChange('institution', '')}>×</button>
            </span>
          )}
          {currentFilters.status && (
            <span className="filter-tag">
              Status: {currentFilters.status}
              <button onClick={() => handleFilterChange('status', '')}>×</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default ReportFilterComponent;