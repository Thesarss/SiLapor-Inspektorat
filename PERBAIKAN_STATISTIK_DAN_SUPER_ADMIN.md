# Perbaikan Statistik OPD dan Dashboard Super Admin

## 🎯 Masalah yang Diperbaiki

### 1. Error Statistik OPD 222% ❌ → ✅
**Masalah:** Completion rate OPD menunjukkan 222% (tidak masuk akal)

**Penyebab:** 
- Query di `opd-statistics.service.ts` melakukan JOIN yang menyebabkan double counting
- Matrix items dihitung berkali-kali karena JOIN dengan `matrix_assignments` tanpa filter yang tepat
- Setiap OPD user di institusi yang sama menyebabkan duplikasi data

**Solusi:**
```typescript
// SEBELUM (SALAH):
JOIN matrix_items mi ON mi.matrix_report_id = ma.matrix_report_id
WHERE u.institution = ?

// SESUDAH (BENAR):
JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
JOIN matrix_items mi ON mi.matrix_report_id = mr.id
WHERE u.institution = ? AND mr.target_opd = ?
```

**Hasil:** Completion rate sekarang akurat (0-100%)

---

## 🆕 Fitur Baru: Dashboard Super Admin

### Endpoint Baru

#### 1. **GET /api/dashboard/super-admin**
Dashboard komprehensif untuk Super Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalReports": 6,
      "totalMatrix": 2,
      "totalOPDs": 3,
      "totalInspektorat": 2,
      "totalRecommendations": 150,
      "totalMatrixItems": 42,
      "overallCompletionRate": 65
    },
    "opdPerformance": [
      {
        "institution": "Dinas Kesehatan",
        "opdName": "Dinas Kesehatan",
        "totalRecommendations": 50,
        "approvedRecommendations": 40,
        "completionRate": 80,
        "rank": 1,
        "lastActivity": "2024-03-10T10:30:00.000Z"
      }
    ],
    "inspektoratPerformance": [
      {
        "inspektoratName": "Inspektorat 1",
        "totalMatrixUploaded": 2,
        "totalReviewsDone": 12,
        "avgReviewTime": 24.5,
        "totalReportsAssigned": 3
      }
    ],
    "systemHealth": {
      "activeOPDs": 2,
      "activeInspektorat": 2,
      "pendingReviews": 5,
      "overdueItems": 1
    }
  }
}
```

**Penjelasan Data:**
- **overview**: Statistik keseluruhan sistem
  - `totalReports`: Total laporan audit
  - `totalMatrix`: Total matrix yang diupload
  - `totalOPDs`: Jumlah OPD unik
  - `totalInspektorat`: Jumlah Inspektorat
  - `totalRecommendations`: Total rekomendasi (sistem lama)
  - `totalMatrixItems`: Total item matrix (sistem baru)
  - `overallCompletionRate`: Tingkat penyelesaian keseluruhan (%)

- **opdPerformance**: Ranking performa OPD
  - Diurutkan berdasarkan `completionRate` (tertinggi ke terendah)
  - Menampilkan total rekomendasi dan yang sudah approved
  - `lastActivity`: Aktivitas terakhir OPD

- **inspektoratPerformance**: Performa Inspektorat
  - `totalMatrixUploaded`: Jumlah matrix yang diupload
  - `totalReviewsDone`: Jumlah review yang sudah dilakukan
  - `avgReviewTime`: Rata-rata waktu review (dalam jam)
  - `totalReportsAssigned`: Total laporan yang ditugaskan

- **systemHealth**: Kesehatan sistem
  - `activeOPDs`: OPD yang aktif dalam 30 hari terakhir
  - `activeInspektorat`: Inspektorat yang aktif dalam 30 hari terakhir
  - `pendingReviews`: Item yang menunggu review
  - `overdueItems`: Assignment yang melewati deadline

---

#### 2. **GET /api/dashboard/super-admin/monthly-trend**
Trend bulanan untuk chart

**Query Parameters:**
- `months` (optional): Jumlah bulan ke belakang (default: 6)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "total_submissions": 25,
      "approved_count": 20,
      "pending_count": 3,
      "rejected_count": 2
    },
    {
      "month": "2024-02",
      "total_submissions": 30,
      "approved_count": 25,
      "pending_count": 4,
      "rejected_count": 1
    }
  ]
}
```

**Kegunaan:** Untuk membuat line chart atau bar chart trend submission dan approval

---

#### 3. **GET /api/dashboard/super-admin/top-opds**
Top 5 OPD dengan performa terbaik

**Query Parameters:**
- `limit` (optional): Jumlah OPD yang ditampilkan (default: 5)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "institution": "Dinas Kesehatan",
      "completionRate": 85,
      "totalRecommendations": 50,
      "approvedRecommendations": 42,
      "rank": 1
    },
    {
      "institution": "Dinas Pendidikan",
      "completionRate": 78,
      "totalRecommendations": 45,
      "approvedRecommendations": 35,
      "rank": 2
    }
  ]
}
```

---

#### 4. **GET /api/dashboard/super-admin/recent-activities**
Aktivitas terbaru di sistem

**Query Parameters:**
- `limit` (optional): Jumlah aktivitas yang ditampilkan (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "activity_type": "matrix_submission",
      "user_name": "OPD Kesehatan",
      "institution": "Dinas Kesehatan",
      "description": "Temuan: Kurangnya APD di Puskesmas",
      "activity_date": "2024-03-10T14:30:00.000Z"
    },
    {
      "activity_type": "matrix_review",
      "user_name": "Inspektorat 1",
      "institution": "Inspektorat",
      "description": "Review: Temuan: Kurangnya APD di Puskesmas",
      "activity_date": "2024-03-10T15:00:00.000Z"
    }
  ]
}
```

**Activity Types:**
- `matrix_submission`: OPD submit tindak lanjut
- `matrix_review`: Inspektorat review submission

---

## 📊 Cara Menggunakan di Frontend

### 1. Fetch Dashboard Super Admin
```typescript
const fetchSuperAdminDashboard = async () => {
  const response = await fetch('/api/dashboard/super-admin', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.success) {
    // Display overview
    console.log('Total OPDs:', data.data.overview.totalOPDs);
    console.log('Overall Completion:', data.data.overview.overallCompletionRate + '%');
    
    // Display OPD ranking
    data.data.opdPerformance.forEach(opd => {
      console.log(`#${opd.rank} ${opd.institution}: ${opd.completionRate}%`);
    });
    
    // Display Inspektorat performance
    data.data.inspektoratPerformance.forEach(insp => {
      console.log(`${insp.inspektoratName}: ${insp.totalReviewsDone} reviews`);
    });
  }
};
```

### 2. Fetch Monthly Trend untuk Chart
```typescript
const fetchMonthlyTrend = async () => {
  const response = await fetch('/api/dashboard/super-admin/monthly-trend?months=6', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.success) {
    // Use with Chart.js or Recharts
    const labels = data.data.map(d => d.month);
    const approved = data.data.map(d => d.approved_count);
    const pending = data.data.map(d => d.pending_count);
    
    // Create chart...
  }
};
```

### 3. Display Top OPDs
```typescript
const fetchTopOPDs = async () => {
  const response = await fetch('/api/dashboard/super-admin/top-opds?limit=5', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.success) {
    return data.data; // Array of top OPDs
  }
};
```

---

## 🔐 Authorization

Semua endpoint Super Admin memerlukan:
1. **Authentication**: Bearer token di header
2. **Authorization**: User role harus `super_admin`

Jika user bukan super admin, akan mendapat response:
```json
{
  "success": false,
  "error": "Hanya Super Admin yang dapat mengakses endpoint ini"
}
```

---

## 📁 File yang Dimodifikasi

### Backend
1. **backend/src/services/opd-statistics.service.ts**
   - Fixed double counting di query matrix statistics
   - Menambahkan filter `target_opd` untuk akurasi

2. **backend/src/services/super-admin-dashboard.service.ts** (BARU)
   - Service lengkap untuk dashboard super admin
   - Methods: getDashboard, getMonthlyTrend, getTopPerformingOPDs, getRecentActivities

3. **backend/src/routes/dashboard.routes.ts**
   - Menambahkan 4 endpoint baru untuk super admin
   - `/api/dashboard/super-admin`
   - `/api/dashboard/super-admin/monthly-trend`
   - `/api/dashboard/super-admin/top-opds`
   - `/api/dashboard/super-admin/recent-activities`

---

## ✅ Testing

### Test OPD Statistics (Harus < 100%)
```bash
# Login sebagai OPD
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"opd1","password":"password123"}'

# Get OPD statistics
curl http://localhost:3000/api/opd-statistics/my \
  -H "Authorization: Bearer YOUR_TOKEN"

# Cek completionRate harus 0-100%
```

### Test Super Admin Dashboard
```bash
# Login sebagai Super Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get super admin dashboard
curl http://localhost:3000/api/dashboard/super-admin \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get monthly trend
curl http://localhost:3000/api/dashboard/super-admin/monthly-trend?months=6 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get top OPDs
curl http://localhost:3000/api/dashboard/super-admin/top-opds?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get recent activities
curl http://localhost:3000/api/dashboard/super-admin/recent-activities?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Rekomendasi UI untuk Frontend

### Dashboard Super Admin Layout
```
┌─────────────────────────────────────────────────────────┐
│  OVERVIEW CARDS                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │  6   │ │  2   │ │  3   │ │  2   │ │ 192  │ │ 65%  ││
│  │Reports│ │Matrix│ │ OPDs │ │Insp. │ │Items │ │Done  ││
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘│
├─────────────────────────────────────────────────────────┤
│  MONTHLY TREND CHART                                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │  📊 Line Chart: Submissions & Approvals per Month  ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  OPD PERFORMANCE RANKING          │  INSPEKTORAT PERF. │
│  ┌──────────────────────────────┐ │ ┌─────────────────┐│
│  │ #1 Dinas Kesehatan    85% ✅ │ │ │ Insp. 1: 12 rev ││
│  │ #2 Dinas Pendidikan   78% ✅ │ │ │ Insp. 2: 8 rev  ││
│  │ #3 Dinas Sosial       65% ⚠️ │ │ │ Avg: 24.5 hours ││
│  └──────────────────────────────┘ │ └─────────────────┘│
├─────────────────────────────────────────────────────────┤
│  SYSTEM HEALTH                    │  RECENT ACTIVITIES │
│  ┌──────────────────────────────┐ │ ┌─────────────────┐│
│  │ Active OPDs: 2/3             │ │ │ • OPD submit... ││
│  │ Active Insp: 2/2             │ │ │ • Insp review...││
│  │ Pending Reviews: 5           │ │ │ • OPD submit... ││
│  │ Overdue Items: 1 ⚠️          │ │ │ • Insp review...││
│  └──────────────────────────────┘ │ └─────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Summary

### Perbaikan
✅ Error statistik OPD 222% sudah diperbaiki
✅ Completion rate sekarang akurat (0-100%)
✅ Query matrix statistics sudah dioptimasi

### Fitur Baru
✅ Dashboard Super Admin komprehensif
✅ Statistik keseluruhan sistem
✅ Ranking performa OPD
✅ Performa Inspektorat (reviews, response time)
✅ System health indicators
✅ Monthly trend untuk chart
✅ Top performing OPDs
✅ Recent activities feed

### Next Steps untuk Frontend
1. Buat halaman dashboard super admin
2. Implementasi chart untuk monthly trend
3. Tampilkan ranking OPD dengan visual yang menarik
4. Tambahkan real-time updates untuk recent activities
5. Implementasi filter dan date range picker

---

**Status:** ✅ SELESAI - Backend siap digunakan, tinggal implementasi frontend
