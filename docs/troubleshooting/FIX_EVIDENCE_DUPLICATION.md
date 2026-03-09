# Fix: Evidence Duplication (2 Files Showing as 10)

## 🐛 Problem

**Reported Issue**: OPD mengupload 2 evidence files, tapi Inspektorat melihat 10 evidence di database.

### Symptoms:
- OPD upload 2 files
- Inspektorat Evidence Database shows 10 files
- Files appear to be duplicated 5x

## 🔍 Root Cause Analysis

### The Problem:
Query di endpoint `/api/matrix/evidence/search` menggunakan JOIN dengan `matrix_assignments` table:

```sql
-- WRONG QUERY (OLD):
SELECT ...
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id  -- ❌ CAUSES DUPLICATION!
JOIN users u ON ma.assigned_to = u.id
WHERE mi.evidence_filename IS NOT NULL
```

### Why It Causes Duplication:
1. Setiap matrix memiliki **5 assignments** (5 OPD users)
2. Query JOIN dengan `matrix_assignments` menyebabkan setiap evidence muncul **5 kali**
3. 2 evidence files × 5 assignments = **10 rows** returned

### Example:
```
Matrix: SMP 6
Assignments: 5 (Kepala, Sekretaris, Staff 1, Staff 2, User)
Evidence uploaded: 2 files

Query result:
- File 1 appears 5 times (once per assignment)
- File 2 appears 5 times (once per assignment)
Total: 10 rows (but only 2 actual files!)
```

## ✅ Solution

### Changed Query to Use `evidence_files` Table Directly:

```sql
-- CORRECT QUERY (NEW):
SELECT 
  ef.id,
  ef.original_filename as evidence_filename,
  ef.file_size as evidence_file_size,
  ef.file_path as evidence_file_path,
  ef.status,
  ef.uploaded_at,
  u.name as uploaded_by_name,
  u.institution as uploader_institution,
  mi.temuan,
  mi.rekomendasi,
  mr.title as matrix_title,
  mr.target_opd
FROM evidence_files ef                              -- ✅ Query from evidence_files
JOIN users u ON ef.uploaded_by = u.id
LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
-- NO JOIN with matrix_assignments!                 -- ✅ No duplication!
WHERE ...
```

### Key Changes:
1. ✅ Query FROM `evidence_files` instead of `matrix_items`
2. ✅ Removed JOIN with `matrix_assignments`
3. ✅ Use LEFT JOIN for matrix_items and matrix_reports
4. ✅ Each evidence file appears exactly once

## 📝 Files Modified

### Backend:
- `backend/src/routes/matrix-audit.routes.ts`
  - Fixed `/api/matrix/evidence/search` endpoint
  - Changed query to use `evidence_files` table
  - Removed `matrix_assignments` JOIN

## 🧪 Testing

### Before Fix:
```
OPD uploads: 2 files
Inspektorat sees: 10 files (5x duplication)
Database has: 2 files (correct)
```

### After Fix:
```
OPD uploads: 2 files
Inspektorat sees: 2 files ✅
Database has: 2 files ✅
```

### Test Steps:
1. **Upload Evidence** (as OPD):
   - Login as OPD user
   - Go to Matrix Work
   - Upload 2 evidence files

2. **Check Evidence Database** (as Inspektorat):
   - Login as Inspektorat
   - Go to Evidence Database
   - Should see exactly 2 files (not 10)

3. **Verify Count**:
   ```bash
   node backend/investigate-evidence-duplication.js
   ```
   Should show:
   - Total evidence files: 2
   - View showing: 2 rows
   - No duplication

## 🚀 Deployment

### 1. Compile Backend:
```bash
cd backend
npm run build
```

### 2. Restart Backend:
```bash
npm start
```

### 3. Clear Browser Cache:
- Press **Ctrl + Shift + R**

### 4. Test:
- Upload evidence as OPD
- Check as Inspektorat
- Verify count is correct

## 📊 Impact

### Before:
- ❌ Evidence count multiplied by number of assignments
- ❌ Confusing for Inspektorat
- ❌ Incorrect statistics
- ❌ Pagination broken (showing 10 instead of 2)

### After:
- ✅ Correct evidence count
- ✅ Clear for Inspektorat
- ✅ Accurate statistics
- ✅ Pagination works correctly

## ⚠️ Related Issues

This fix also affects:
- Evidence search results
- Evidence pagination
- Evidence statistics
- Matrix progress tracking (indirectly)

## 🔗 Related Documentation

- [Evidence System](../../user-guide/features/EVIDENCE_SYSTEM.md)
- [Matrix System](../../user-guide/features/MATRIX_AUTO_UPLOAD_GUIDE.md)
- [Database Schema](../../backend/src/database/migrations/023_integrate_evidence_matrix.sql)

## 📞 Support

If evidence duplication still occurs after this fix:

1. **Check database**:
   ```bash
   node backend/investigate-evidence-duplication.js
   ```

2. **Verify backend version**:
   - Check that compiled code in `backend/dist/` is up to date
   - Run `npm run build` to recompile

3. **Clear all caches**:
   - Browser cache (Ctrl+Shift+R)
   - Backend restart
   - Frontend restart

---

**Fixed Date**: 2026-03-09
**Status**: ✅ Fixed and Tested
**Impact**: High - Affects all evidence viewing by Inspektorat
