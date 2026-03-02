import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../styles/TargetSelectionComponent.css';

interface TargetSelectionComponentProps {
  onTargetSelected: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

interface OPD {
  id: string;
  name: string;
  institution: string;
  email: string;
}

export default function TargetSelectionComponent({
  onTargetSelected,
  onError,
  onBack
}: TargetSelectionComponentProps) {
  const [opdList, setOpdList] = useState<OPD[]>([]);
  const [selectedOPD, setSelectedOPD] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOPDList();
  }, []);

  const fetchOPDList = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching OPD list from API...');
      console.log('🔗 API Base URL:', 'http://localhost:3000/api');
      
      // Check if token exists
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token preview:', token ? token.substring(0, 50) + '...' : 'No token');
      
      const response = await apiClient.get('/auth/users');
      console.log('📡 API Response:', response);
      console.log('📋 Response data:', response.data);
      console.log('📋 Response status:', response.status);
      
      if (!response.data || !response.data.success) {
        console.error('❌ API response not successful:', response.data);
        onError('API response tidak valid');
        return;
      }
      
      // Filter only users with role='opd' (OPD users)
      const allUsers = response.data.data || [];
      console.log('👥 All users:', allUsers);
      console.log('👥 All users count:', allUsers.length);
      
      const opdUsers = allUsers.filter((user: any) => user.role === 'opd');
      console.log('🏢 OPD users:', opdUsers);
      console.log('🏢 OPD users count:', opdUsers.length);
      
      if (opdUsers.length === 0) {
        console.warn('⚠️ No OPD users found');
        onError('Tidak ada OPD yang tersedia. Pastikan ada user dengan role "user" di sistem.');
        return;
      }
      
      console.log('✅ Setting OPD list:', opdUsers);
      setOpdList(opdUsers);
      setIsLoading(false);
      console.log('✅ OPD list set successfully');
      
    } catch (error: any) {
      setIsLoading(false);
      console.error('❌ Error fetching OPD list:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error response status:', error.response?.status);
      
      let errorMessage = 'Gagal load daftar OPD';
      if (error.response?.status === 401) {
        errorMessage = 'Anda tidak memiliki akses. Silakan login sebagai admin.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Akses ditolak. Hanya admin yang dapat mengakses fitur ini.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = `Network error: ${error.message}`;
      }
      
      console.error('❌ Final error message:', errorMessage);
      onError(errorMessage);
    }
  };

  const handleContinue = () => {
    if (!selectedOPD) {
      onError('Silakan pilih OPD tujuan terlebih dahulu');
      return;
    }

    const selectedOPDData = opdList.find(opd => opd.id === selectedOPD);
    if (!selectedOPDData) {
      onError('OPD yang dipilih tidak valid');
      return;
    }

    onTargetSelected({
      targetOPD: selectedOPDData,
      selectedOPDId: selectedOPD
    });
  };

  if (isLoading) {
    return <div className="loading">Loading OPD list...</div>;
  }

  return (
    <div className="target-selection-component">
      <h2>Pilih Target OPD</h2>
      <p className="selection-description">
        Pilih OPD yang akan menerima seluruh temuan dari file audit yang akan di-import.
      </p>

      <div className="opd-selection">
        <label htmlFor="opd-select" className="selection-label">
          Target OPD <span className="required">*</span>
        </label>
        <select
          id="opd-select"
          value={selectedOPD}
          onChange={(e) => setSelectedOPD(e.target.value)}
          className="opd-select"
        >
          <option value="">-- Pilih OPD --</option>
          {opdList.map((opd) => (
            <option key={opd.id} value={opd.id}>
              {opd.institution || 'Institusi tidak diset'} - {opd.name}
            </option>
          ))}
        </select>
      </div>

      {selectedOPD && (
        <div className="selected-opd-info">
          <h4>OPD Terpilih:</h4>
          <div className="opd-details">
            <p><strong>Institusi:</strong> {opdList.find(opd => opd.id === selectedOPD)?.institution || 'Institusi tidak diset'}</p>
            <p><strong>PIC:</strong> {opdList.find(opd => opd.id === selectedOPD)?.name}</p>
            <p><strong>Email:</strong> {opdList.find(opd => opd.id === selectedOPD)?.email}</p>
          </div>
        </div>
      )}

      <div className="selection-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Kembali
        </button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!selectedOPD}
        >
          Lanjut ke Upload File →
        </button>
      </div>
    </div>
  );
}