# 🚀 Quick Setup Guide - Enhanced Matrix Audit System

## 📋 Fitur Baru yang Ditambahkan

1. **🌐 Tunneling Support** - Akses dari luar localhost dengan ngrok
2. **📎 Evidence Database** - OPD bisa upload file evidence ke database
3. **🔍 Advanced Search & Filter** - Inspektorat bisa search dan filter evidence
4. **📊 Super Admin Performance Dashboard** - Monitor sistem dan kinerja user

## 🛠️ Setup Steps

### Step 1: Run Database Migration
```bash
cd backend
./run-evidence-migration.bat
```

### Step 2: Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Step 3: Setup Ngrok Tunneling (Optional)
```bash
# Run the setup script
./setup-ngrok.bat

# Or manually:
# Terminal 3 - Backend tunnel
ngrok http 3000

# Terminal 4 - Frontend tunnel
ngrok http 5173

# Update environment variables
node update-env-for-ngrok.js
```

## 🧪 Testing Guide

### Test 1: Evidence Upload (OPD User)
1. **Login sebagai OPD:** `pendidikan_staff1` / `password123`
2. **Go to Matrix page** dan klik "Mulai Kerjakan" pada assignment
3. **Pilih item temuan** dan isi tindak lanjut
4. **Upload evidence** dengan fitur baru:
   - Pilih file (PDF, gambar, dokumen)
   - Isi deskripsi
   - Pilih kategori dan prioritas
   - Tambah tags (opsional)
   - Submit

### Test 2: Evidence Database & Search (Inspektorat)
1. **Login sebagai Inspektorat:** `inspektorat_kepala` / `password123`
2. **Go to Evidence Database** (menu baru)
3. **Test search features:**
   - Search by filename, description, temuan
   - Filter by category, status, priority
   - Filter by date range
   - Sort by different criteria
4. **Review evidence:**
   - Click "Review" pada evidence pending
   - Approve atau reject dengan catatan

### Test 3: Super Admin Performance Dashboard
1. **Login sebagai Super Admin:** `admin` / `password123`
2. **Go to Performance Dashboard** (menu baru)
3. **View system metrics:**
   - System health (CPU, memory, response time)
   - User activity statistics
   - Evidence statistics
   - Matrix audit statistics
4. **View activity logs:**
   - User login/logout activities
   - Upload activities
   - Search activities
   - Review activities

## 🌐 Ngrok Access

Setelah setup ngrok, sistem bisa diakses dari:
- **Frontend:** https://your-frontend-url.ngrok.io
- **Backend API:** https://your-backend-url.ngrok.io/api

## 📊 New API Endpoints

### Evidence Management
```
POST /api/evidence/upload - Upload evidence file
GET /api/evidence/search - Search evidence with filters
GET /api/evidence/:id - Get evidence by ID
GET /api/evidence/:id/download - Download evidence file
PUT /api/evidence/:id/review - Review evidence (Inspektorat)
GET /api/evidence/meta/categories - Get evidence categories
GET /api/evidence/meta/tags - Get evidence tags
```

### Performance Monitoring (Super Admin Only)
```
GET /api/performance/dashboard - Get performance dashboard
GET /api/performance/activity-logs - Get user activity logs
GET /api/performance/metrics-history - Get system metrics history
POST /api/performance/record-metrics - Record system metrics
GET /api/performance/system-health - Get system health
```

## 🎯 Key Features

### Evidence System
- **File Upload:** PDF, images, documents (max 10MB)
- **Categorization:** 6 predefined categories with icons
- **Tagging:** Flexible tagging system
- **Priority Levels:** Low, Medium, High, Critical
- **Review Workflow:** Pending → Approved/Rejected
- **Duplicate Detection:** SHA-256 hash checking
- **Full-text Search:** Search in filename, description, content

### Search & Filter
- **Text Search:** Filename, description, temuan, rekomendasi
- **Category Filter:** By evidence category
- **Status Filter:** Pending, approved, rejected, archived
- **Priority Filter:** By priority level
- **File Type Filter:** By file extension
- **Date Range Filter:** Upload date range
- **Sorting:** Multiple sort criteria
- **Pagination:** Efficient data loading

### Performance Dashboard
- **System Health:** CPU, memory, disk usage
- **Response Time:** API response time monitoring
- **User Activity:** Login, upload, search, review activities
- **Evidence Statistics:** By status, category, size
- **Matrix Statistics:** Reports, assignments, items count
- **Activity Trends:** 7-day activity trends
- **Real-time Metrics:** Auto-updating system metrics

## 🔐 Role-based Access

### OPD Users
- Upload evidence for their matrix items
- View their own evidence
- Download their evidence files

### Inspektorat Users  
- View all evidence in database
- Advanced search and filtering
- Review and approve/reject evidence
- Download any evidence files

### Super Admin Users
- All Inspektorat permissions
- Performance dashboard access
- System metrics monitoring
- User activity logs
- System health monitoring

## 🚀 Ready to Test!

Sistem sekarang memiliki:
1. ✅ **Tunneling support** untuk akses eksternal
2. ✅ **Evidence database** dengan upload dan search
3. ✅ **Advanced filtering** untuk Inspektorat
4. ✅ **Performance monitoring** untuk Super Admin

Silakan test semua fitur dan beri feedback!