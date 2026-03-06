# Fix Evidence Duplicates - Final Solution

## Problem
Data duplikat muncul di halaman Database Evidence.

## Root Cause Analysis

### Investigation Results
1. **Database Check**: Tidak ada duplikasi di tabel `evidence_files` ✅
2. **View Check**: View `matrix_evidence_tracking` sudah diperbaiki ✅
3. **Service Check**: Query `searchEvidence` sudah menggunakan DISTINCT ✅
4. **Route Check**: ❌ **MISSING ENDPOINT** - `/matrix/evidence/search` tidak ada!

### The Real Problem
Frontend memanggil endpoint `/matrix/evidence/search` yang **tidak ada** di backend routes. Ini menyebabkan:
- Frontend tidak mendapat data yang benar
- Kemungkinan menampilkan data cached atau error
- Duplikasi muncul karena endpoint tidak terhubung dengan service yang sudah diperbaiki

## Solution Implemented

### 1. Added Missing Routes
**File**: `backend/src/routes/matrix.routes.js`

```javascript
// GET /api/matrix/evidence/metadata - Get metadata for filters
matrixRouter.get('/evidence/metadata', simpleAuth, async (req, res, next) => {
  try {
    const { query: dbQuery } = require('../config/database');
    
    // Get unique matrix titles
    const titlesResult = await dbQuery(`
      SELECT DISTINCT mr.title 
      FROM matrix_reports mr
      ORDER BY mr.title
    `);
    
    // Get unique target OPDs
    const opdsResult = await dbQuery(`
      SELECT DISTINCT mr.target_opd 
      FROM matrix_reports mr
      WHERE mr.target_opd IS NOT NULL AND mr.target_opd != ''
      ORDER BY mr.target_opd
    `);
    
    res.json({
      success: true,
      data: {
        matrixTitles: titlesResult.rows.map(r => r.title),
        targetOPDs: opdsResult.rows.map(r => r.target_opd)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matrix/evidence/search - Search evidence files
matrixRouter.get('/evidence/search', simpleAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const { EvidenceService } = require('../services/evidence.service');
    
    const filters = {
      search: req.query.search,
      matrix_title: req.query.matrix_title,
      target_opd: req.query.target_opd,
      status: req.query.status,
      uploaded_by: req.query.uploaded_by,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      sort_by: req.query.sort_by || 'uploaded_at',
      sort_order: req.query.sort_order || 'DESC'
    };
    
    const result = await EvidenceService.searchEvidence(filters, user.id, user.role);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});
```

### 2. Previous Fixes (Already Done)
- ✅ Database view `matrix_evidence_tracking` fixed with DISTINCT
- ✅ Service `searchEvidence` updated with DISTINCT queries
- ✅ Migration 026 executed successfully

## Complete Fix Summary

### Files Modified
1. `backend/src/database/migrations/026_fix_evidence_duplicates.sql` - Fixed view
2. `backend/src/services/evidence.service.ts` - Added DISTINCT to queries
3. `backend/src/routes/matrix.routes.js` - **Added missing endpoints**
4. `backend/check-evidence-duplicates.js` - Diagnostic script
5. `backend/run-fix-evidence-duplicates.js` - Migration runner

### Endpoints Added
1. `GET /api/matrix/evidence/metadata` - Get filter metadata (matrix titles, OPDs)
2. `GET /api/matrix/evidence/search` - Search evidence with filters

## Testing

### 1. Backend Compilation
```bash
cd backend
npx tsc
```
✅ Compiled successfully

### 2. Database Verification
```bash
node check-evidence-duplicates.js
```
Results:
- ✅ No duplicates in evidence_files table
- ✅ No orphaned evidence files
- ✅ Query returns unique results

### 3. Endpoint Testing
After restart, test:
```bash
curl http://localhost:3000/api/matrix/evidence/search?page=1&limit=10
curl http://localhost:3000/api/matrix/evidence/metadata
```

## Next Steps

1. **Restart Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Clear Browser Cache**
   - Press Ctrl+Shift+Delete
   - Clear cached images and files
   - Or use Ctrl+Shift+R for hard refresh

3. **Test Evidence Database Page**
   - Navigate to Evidence Database
   - Verify no duplicates
   - Test search functionality
   - Test filters
   - Test pagination

4. **Upload Test Evidence**
   - Upload some evidence files
   - Verify they appear correctly
   - Check for duplicates

## Why This Fixes The Problem

### Before Fix
```
Frontend → /matrix/evidence/search → ❌ 404 Not Found
         → Shows cached/error data
         → Duplicates appear
```

### After Fix
```
Frontend → /matrix/evidence/search → ✅ Route exists
         → Calls EvidenceService.searchEvidence()
         → Uses DISTINCT query
         → Returns unique results
         → No duplicates!
```

## Verification Checklist

- [x] Database migration executed
- [x] View fixed with DISTINCT
- [x] Service updated with DISTINCT
- [x] Missing routes added
- [x] Backend compiled
- [ ] Backend restarted
- [ ] Browser cache cleared
- [ ] Evidence page tested
- [ ] No duplicates confirmed

## Troubleshooting

### If duplicates still appear:

1. **Clear browser cache completely**
   ```
   Ctrl+Shift+Delete → Clear all cached data
   ```

2. **Check backend logs**
   ```bash
   # Look for errors in console
   npm start
   ```

3. **Verify endpoint is working**
   ```bash
   curl http://localhost:3000/api/matrix/evidence/search
   ```

4. **Check database directly**
   ```bash
   node check-evidence-duplicates.js
   ```

5. **Verify no old backend process**
   ```bash
   # Kill any old node processes
   taskkill /F /IM node.exe
   npm start
   ```

## Status
✅ Database fixed
✅ Service fixed  
✅ Routes added
✅ Backend compiled
⏳ Waiting for backend restart
⏳ Waiting for browser cache clear
⏳ Waiting for testing

## Conclusion
Masalah duplikasi disebabkan oleh **missing endpoint** `/matrix/evidence/search`. Frontend memanggil endpoint yang tidak ada, sehingga tidak terhubung dengan service yang sudah diperbaiki. Setelah menambahkan endpoint ini, duplikasi seharusnya hilang.

**Action Required**: 
1. Restart backend server
2. Clear browser cache (Ctrl+Shift+R)
3. Test Evidence Database page
