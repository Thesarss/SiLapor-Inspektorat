# 🔍 Debugging Guide - Matrix Progress & Review Issues

## ✅ Status Check

### **Backend API Status:**
- ✅ Database has correct data (2 matrix assignments with progress)
- ✅ API `/api/matrix/progress` returns correct data
- ✅ Login system working properly
- ✅ Matrix review endpoints functional

### **Issues to Fix:**

## 1. 🔧 Matrix Progress Page Not Showing Data

**Problem**: Frontend Matrix Progress page shows no data despite API returning data.

**Debug Steps:**
1. Open browser Developer Tools (F12)
2. Go to Matrix Progress page
3. Check Console tab for errors
4. Check Network tab for API calls

**Expected API Call:**
```
GET /api/matrix/progress
Authorization: Bearer [token]
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "matrix_title": "Matrix Audit Kepegawaian 2024",
      "progress_percentage": "100.00",
      "opd_user_name": "Staff Laporan Pendidikan",
      // ... more fields
    }
  ]
}
```

## 2. 🔧 Review Laporan - Individual Review

**Problem**: Need to review items one by one with progress tracking.

**Solution Implemented:**
- ✅ Added "Review Items" button in Matrix Progress
- ✅ Created MatrixReviewPage for detailed review
- ✅ Updated ApprovalsPage with link to matrix review
- ✅ Individual item review with approve/reject

## 3. 🎯 Testing Instructions

### **Test Matrix Progress:**
1. Login as Inspektorat: `kepala.inspektorat@tanjungpinang.go.id` / `password123`
2. Click "Matrix Progress" menu
3. Should see 2 assignments:
   - Matrix Audit Kepegawaian 2024 (100% complete)
   - Matrix Audit Keuangan Q1 2024 (33.33% complete)
4. Click "Review Items" button

### **Test Individual Review:**
1. From Matrix Progress, click "Review Items"
2. Should see list of matrix items on left
3. Click item to see details on right
4. For submitted items, should see:
   - Temuan, Penyebab, Rekomendasi
   - Tindak Lanjut from OPD
   - Evidence files (if any)
   - Review form (Approve/Reject)

### **Test Review Laporan:**
1. Go to "Review Laporan & Matrix" menu
2. Should see individual items for review
3. Matrix items should have "Review Matrix Items" link
4. Can approve/reject individual items

## 4. 🔍 Common Issues & Solutions

### **Matrix Progress Shows Empty:**
- Check browser console for JavaScript errors
- Check Network tab for failed API calls
- Verify user is logged in as Inspektorat
- Check if token is valid

### **Review Items Not Working:**
- Verify assignment_id in URL is correct
- Check if user has permission (Inspektorat role)
- Verify matrix items exist in database

### **Individual Review Not Saving:**
- Check API endpoints are responding
- Verify review notes are provided for rejections
- Check database for updated status

## 5. 📊 Database Verification

**Check Data Exists:**
```sql
-- Check matrix assignments
SELECT ma.*, mr.title, u.name as opd_name 
FROM matrix_assignments ma
JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
JOIN users u ON ma.assigned_to = u.id;

-- Check matrix items with status
SELECT mi.*, mr.title 
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
WHERE mi.status = 'submitted';

-- Check progress view
SELECT * FROM matrix_progress_view;
```

## 6. 🚀 Quick Fix Commands

**If Matrix Progress still empty, run:**
```bash
cd backend
node debug-matrix-progress.js
node test-matrix-progress-api.js
```

**If need more test data:**
```bash
cd backend
node create-test-evidence.js
```

## 7. 📱 Expected User Experience

### **For Inspektorat:**
1. **Dashboard** → See overview
2. **Matrix Progress** → See all OPD assignments with progress bars
3. **Click "Review Items"** → See detailed matrix items
4. **Select Item** → See full details like OPD sees
5. **Review** → Approve/Reject with notes
6. **Track Progress** → See completion percentage

### **For OPD:**
1. **Matrix Tugas** → See assignments
2. **Work on Items** → Fill tindak lanjut, upload evidence
3. **Submit** → Send for review
4. **Check Status** → See approved/rejected status

---

**Status**: Backend working ✅, Frontend debugging needed 🔧
**Next**: Check browser console and network calls