# Panduan Integrasi Frontend - Super Admin Dashboard

## 📋 Overview

Panduan ini menjelaskan cara mengintegrasikan Super Admin Dashboard ke frontend React/TypeScript.

## 🔧 Setup

### 1. Install Dependencies (jika belum ada)
```bash
npm install recharts  # untuk charts
# atau
npm install chart.js react-chartjs-2  # alternatif
```

### 2. Buat Types/Interfaces

```typescript
// src/types/super-admin.types.ts

export interface SuperAdminOverview {
  totalReports: number;
  totalMatrix: number;
  totalOPDs: number;
  totalInspektorat: number;
  totalRecommendations: number;
  totalMatrixItems: number;
  overallCompletionRate: number;
}

export interface OPDPerformance {
  institution: string;
  opdName: string;
  totalRecommendations: number;
  approvedRecommendations: number;
  completionRate: number;
  rank: number;
  lastActivity: string | null;
}

export interface InspektoratPerformance {
  inspektoratName: string;
  totalMatrixUploaded: number;
  totalReviewsDone: number;
  avgReviewTime: number;
  totalReportsAssigned: number;
}

export interface SystemHealth {
  activeOPDs: number;
  activeInspektorat: number;
  pendingReviews: number;
  overdueItems: number;
}

export interface SuperAdminDashboard {
  overview: SuperAdminOverview;
  opdPerformance: OPDPerformance[];
  inspektoratPerformance: InspektoratPerformance[];
  systemHealth: SystemHealth;
}

export interface MonthlyTrendData {
  month: string;
  total_submissions: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
}

export interface RecentActivity {
  activity_type: 'matrix_submission' | 'matrix_review';
  user_name: string;
  institution: string;
  description: string;
  activity_date: string;
}
```

## 🌐 API Service

```typescript
// src/services/super-admin.service.ts

import { apiClient } from './api-client'; // Your axios/fetch wrapper

export class SuperAdminService {
  static async getDashboard(): Promise<SuperAdminDashboard> {
    const response = await apiClient.get('/api/dashboard/super-admin');
    return response.data.data;
  }

  static async getMonthlyTrend(months: number = 6): Promise<MonthlyTrendData[]> {
    const response = await apiClient.get(`/api/dashboard/super-admin/monthly-trend?months=${months}`);
    return response.data.data;
  }

  static async getTopOPDs(limit: number = 5): Promise<OPDPerformance[]> {
    const response = await apiClient.get(`/api/dashboard/super-admin/top-opds?limit=${limit}`);
    return response.data.data;
  }

  static async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    const response = await apiClient.get(`/api/dashboard/super-admin/recent-activities?limit=${limit}`);
    return response.data.data;
  }
}
```

## 🎨 React Components

### 1. Main Dashboard Page

```typescript
// src/pages/SuperAdminDashboard.tsx

import React, { useEffect, useState } from 'react';
import { SuperAdminService } from '../services/super-admin.service';
import { SuperAdminDashboard } from '../types/super-admin.types';
import OverviewCards from '../components/super-admin/OverviewCards';
import MonthlyTrendChart from '../components/super-admin/MonthlyTrendChart';
import OPDRankingTable from '../components/super-admin/OPDRankingTable';
import InspektoratPerformanceTable from '../components/super-admin/InspektoratPerformanceTable';
import SystemHealthIndicators from '../components/super-admin/SystemHealthIndicators';
import RecentActivitiesFeed from '../components/super-admin/RecentActivitiesFeed';

const SuperAdminDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await SuperAdminService.getDashboard();
      setDashboard(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Memuat dashboard...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!dashboard) {
    return <div>Tidak ada data</div>;
  }

  return (
    <div className="super-admin-dashboard">
      <h1>Dashboard Super Admin</h1>
      
      {/* Overview Cards */}
      <OverviewCards overview={dashboard.overview} />
      
      {/* Monthly Trend Chart */}
      <div className="section">
        <h2>Trend Bulanan</h2>
        <MonthlyTrendChart />
      </div>
      
      <div className="grid-2-columns">
        {/* OPD Performance */}
        <div className="section">
          <h2>Performa OPD</h2>
          <OPDRankingTable opdPerformance={dashboard.opdPerformance} />
        </div>
        
        {/* Inspektorat Performance */}
        <div className="section">
          <h2>Performa Inspektorat</h2>
          <InspektoratPerformanceTable 
            inspektoratPerformance={dashboard.inspektoratPerformance} 
          />
        </div>
      </div>
      
      <div className="grid-2-columns">
        {/* System Health */}
        <div className="section">
          <h2>Kesehatan Sistem</h2>
          <SystemHealthIndicators 
            systemHealth={dashboard.systemHealth}
            totalOPDs={dashboard.overview.totalOPDs}
            totalInspektorat={dashboard.overview.totalInspektorat}
          />
        </div>
        
        {/* Recent Activities */}
        <div className="section">
          <h2>Aktivitas Terbaru</h2>
          <RecentActivitiesFeed />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;
```

### 2. Overview Cards Component

```typescript
// src/components/super-admin/OverviewCards.tsx

import React from 'react';
import { SuperAdminOverview } from '../../types/super-admin.types';

interface Props {
  overview: SuperAdminOverview;
}

const OverviewCards: React.FC<Props> = ({ overview }) => {
  const cards = [
    {
      title: 'Total Laporan',
      value: overview.totalReports,
      icon: '📄',
      color: 'blue'
    },
    {
      title: 'Total Matrix',
      value: overview.totalMatrix,
      icon: '📊',
      color: 'green'
    },
    {
      title: 'Total OPD',
      value: overview.totalOPDs,
      icon: '🏢',
      color: 'purple'
    },
    {
      title: 'Total Inspektorat',
      value: overview.totalInspektorat,
      icon: '👥',
      color: 'orange'
    },
    {
      title: 'Total Item',
      value: overview.totalRecommendations + overview.totalMatrixItems,
      icon: '📋',
      color: 'teal'
    },
    {
      title: 'Completion Rate',
      value: `${overview.overallCompletionRate}%`,
      icon: '✅',
      color: overview.overallCompletionRate >= 70 ? 'green' : 
             overview.overallCompletionRate >= 50 ? 'yellow' : 'red'
    }
  ];

  return (
    <div className="overview-cards">
      {cards.map((card, index) => (
        <div key={index} className={`card card-${card.color}`}>
          <div className="card-icon">{card.icon}</div>
          <div className="card-content">
            <div className="card-title">{card.title}</div>
            <div className="card-value">{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OverviewCards;
```

### 3. Monthly Trend Chart Component

```typescript
// src/components/super-admin/MonthlyTrendChart.tsx

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SuperAdminService } from '../../services/super-admin.service';
import { MonthlyTrendData } from '../../types/super-admin.types';

const MonthlyTrendChart: React.FC = () => {
  const [data, setData] = useState<MonthlyTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const trendData = await SuperAdminService.getMonthlyTrend(6);
      setData(trendData);
    } catch (error) {
      console.error('Failed to load monthly trend:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading chart...</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="total_submissions" 
          stroke="#8884d8" 
          name="Total Submissions"
        />
        <Line 
          type="monotone" 
          dataKey="approved_count" 
          stroke="#82ca9d" 
          name="Approved"
        />
        <Line 
          type="monotone" 
          dataKey="pending_count" 
          stroke="#ffc658" 
          name="Pending"
        />
        <Line 
          type="monotone" 
          dataKey="rejected_count" 
          stroke="#ff7c7c" 
          name="Rejected"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlyTrendChart;
```

### 4. OPD Ranking Table Component

```typescript
// src/components/super-admin/OPDRankingTable.tsx

import React from 'react';
import { OPDPerformance } from '../../types/super-admin.types';

interface Props {
  opdPerformance: OPDPerformance[];
}

const OPDRankingTable: React.FC<Props> = ({ opdPerformance }) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="opd-ranking-table">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>OPD</th>
            <th>Total</th>
            <th>Approved</th>
            <th>Completion</th>
          </tr>
        </thead>
        <tbody>
          {opdPerformance.map((opd) => (
            <tr key={opd.institution}>
              <td className="rank-cell">{getRankBadge(opd.rank)}</td>
              <td>{opd.institution}</td>
              <td>{opd.totalRecommendations}</td>
              <td>{opd.approvedRecommendations}</td>
              <td>
                <div className="completion-cell">
                  <span className={getCompletionColor(opd.completionRate)}>
                    {opd.completionRate}%
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${opd.completionRate}%` }}
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OPDRankingTable;
```

### 5. System Health Indicators Component

```typescript
// src/components/super-admin/SystemHealthIndicators.tsx

import React from 'react';
import { SystemHealth } from '../../types/super-admin.types';

interface Props {
  systemHealth: SystemHealth;
  totalOPDs: number;
  totalInspektorat: number;
}

const SystemHealthIndicators: React.FC<Props> = ({ 
  systemHealth, 
  totalOPDs, 
  totalInspektorat 
}) => {
  const indicators = [
    {
      label: 'Active OPDs',
      value: `${systemHealth.activeOPDs}/${totalOPDs}`,
      percentage: (systemHealth.activeOPDs / totalOPDs) * 100,
      icon: '🏢',
      status: systemHealth.activeOPDs >= totalOPDs * 0.7 ? 'good' : 'warning'
    },
    {
      label: 'Active Inspektorat',
      value: `${systemHealth.activeInspektorat}/${totalInspektorat}`,
      percentage: (systemHealth.activeInspektorat / totalInspektorat) * 100,
      icon: '👥',
      status: systemHealth.activeInspektorat >= totalInspektorat * 0.7 ? 'good' : 'warning'
    },
    {
      label: 'Pending Reviews',
      value: systemHealth.pendingReviews,
      icon: '⏳',
      status: systemHealth.pendingReviews <= 10 ? 'good' : 
              systemHealth.pendingReviews <= 20 ? 'warning' : 'danger'
    },
    {
      label: 'Overdue Items',
      value: systemHealth.overdueItems,
      icon: '⚠️',
      status: systemHealth.overdueItems === 0 ? 'good' : 'danger'
    }
  ];

  return (
    <div className="system-health-indicators">
      {indicators.map((indicator, index) => (
        <div key={index} className={`indicator indicator-${indicator.status}`}>
          <div className="indicator-icon">{indicator.icon}</div>
          <div className="indicator-content">
            <div className="indicator-label">{indicator.label}</div>
            <div className="indicator-value">{indicator.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemHealthIndicators;
```

### 6. Recent Activities Feed Component

```typescript
// src/components/super-admin/RecentActivitiesFeed.tsx

import React, { useEffect, useState } from 'react';
import { SuperAdminService } from '../../services/super-admin.service';
import { RecentActivity } from '../../types/super-admin.types';

const RecentActivitiesFeed: React.FC = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const data = await SuperAdminService.getRecentActivities(10);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    return type === 'matrix_submission' ? '📤' : '✅';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} jam yang lalu`;
    return date.toLocaleDateString('id-ID');
  };

  if (loading) {
    return <div>Loading activities...</div>;
  }

  return (
    <div className="recent-activities-feed">
      {activities.map((activity, index) => (
        <div key={index} className="activity-item">
          <div className="activity-icon">
            {getActivityIcon(activity.activity_type)}
          </div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-user">{activity.user_name}</span>
              <span className="activity-institution">({activity.institution})</span>
            </div>
            <div className="activity-description">
              {activity.description.substring(0, 80)}
              {activity.description.length > 80 && '...'}
            </div>
            <div className="activity-time">
              {formatDate(activity.activity_date)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivitiesFeed;
```

## 🎨 CSS Styling (Example)

```css
/* src/styles/super-admin-dashboard.css */

.super-admin-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.card-icon {
  font-size: 2.5rem;
}

.card-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
}

.card-value {
  font-size: 1.8rem;
  font-weight: bold;
}

.grid-2-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.opd-ranking-table table {
  width: 100%;
  border-collapse: collapse;
}

.opd-ranking-table th,
.opd-ranking-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 5px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
}

.activity-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.5rem;
}

.activity-time {
  font-size: 0.85rem;
  color: #999;
  margin-top: 5px;
}
```

## 🚀 Routing

```typescript
// src/App.tsx atau routes configuration

import SuperAdminDashboardPage from './pages/SuperAdminDashboard';

// Add to your routes
{
  path: '/super-admin/dashboard',
  element: <SuperAdminDashboardPage />,
  // Add auth guard for super_admin role
}
```

## ✅ Checklist Implementasi

- [ ] Install dependencies (recharts)
- [ ] Buat types/interfaces
- [ ] Buat API service
- [ ] Buat main dashboard page
- [ ] Buat overview cards component
- [ ] Buat monthly trend chart component
- [ ] Buat OPD ranking table component
- [ ] Buat inspektorat performance table component
- [ ] Buat system health indicators component
- [ ] Buat recent activities feed component
- [ ] Tambahkan CSS styling
- [ ] Setup routing
- [ ] Test dengan backend running
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add auto-refresh untuk real-time data

---

**Note:** Sesuaikan dengan struktur project dan styling framework yang Anda gunakan (Tailwind, Material-UI, dll).
