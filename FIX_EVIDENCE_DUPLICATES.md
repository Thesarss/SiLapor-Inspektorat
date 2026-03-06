# Fix Evidence Database Duplicates

## Problem Statement
Saat membuka halaman Database Evidence, terdapat banyak data duplikat yang ditampilkan. Ini disebabkan oleh:

1. **View `matrix_evidence_tracking`** menggunakan JOIN dengan `matrix_assignments` yang bisa menghasilkan multiple rows jika satu matrix_report memiliki multiple assignments
2. **Query `searchEvidence`** tidak menggunakan DISTINCT, sehingga bisa mengembalikan duplicate rows

## Root Cause Analysis

### 1. Database View Issue
**File**: `backend/src/database/migrations/023_integrate_evidence_matrix.sql`

```sql
CREATE OR REPLACE VIEW matrix_evidence_tracking AS
SELECT 
    mi.id as matrix_item_id,
    ...
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id  -- ❌ This causes duplicates!
JOIN users u ON ma.assigned_to = u.id
```

**Problem**: Jika satu `matrix_report` memiliki 3 assignments, maka setiap `matrix_item` akan muncul 3 kali.

### 2. Service Query Issue
**File**: `backend/src/services/evidence.service.ts`

```typescript
const mainQuery = `
  SELECT 
    ef.*,  -- ❌ No DISTINCT, returns all duplicate rows
    u1.name as uploaded_by_name,
    ...
  FROM evidence_files ef
  LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
  ...
`;
```

**Problem**: Query tidak menggunakan DISTINCT untuk menghilangkan duplicate rows.

## Solution Implemented

### 1. Fix Database View
**File**: `backend/src/database/migrations/026_fix_evidence_duplicates.sql`

```sql
CREATE OR REPLACE VIEW matrix_evidence_tracking AS
SELECT DISTINCT  -- ✅ Added DISTINCT
    mi.id as matrix_item_id,
    mi.matrix_report_id,
    mi.item_number,
    mi.temuan,
    mi.penyebab,
    mi.rekomendasi,
    mi.tindak_lanjut,
    mi.status as item_status,
    mi.submitted_at,
    mi.reviewed_at,
    mr.title as matrix_title,
    mr.target_opd,
    -- ✅ Use subquery to get first assigned user instead of JOIN
    (SELECT ma.assigned_to FROM matrix_assignments ma 
     WHERE ma.matrix_report_id = mr.id LIMIT 1) as opd_user_id,
    (SELECT u.name FROM matrix_assignments ma 
     JOIN users u ON ma.assigned_to = u.id
     WHERE ma.matrix_report_id = mr.id LIMIT 1) as opd_user_name,
    (SELECT u.institution FROM matrix_assignments ma 
     JOIN users u ON ma.assigned_to = u.id
     WHERE ma.matrix_report_id = mr.id LIMIT 1) as opd_institution,
    -- Evidence information (unchanged)
    COALESCE(
        (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        0
    ) as evidence_count,
    ...
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
-- ✅ Removed JOIN with matrix_assignments to avoid duplicates
ORDER BY mr.created_at DESC, mi.item_number ASC;
```

**Changes**:
- Added `DISTINCT` to SELECT
- Removed `JOIN matrix_assignments` and `JOIN users`
- Used subqueries to get assignment info (only first assignment)
- This ensures one row per matrix_item regardless of number of assignments

### 2. Fix Service Query
**File**: `backend/src/services/evidence.service.ts`

```typescript
// Count query - Use DISTINCT to avoid counting duplicates
const countQuery = `SELECT COUNT(DISTINCT ef.id) as total ${baseQuery} ${whereClause}`;

// Main query - Use DISTINCT to avoid duplicate rows
const mainQuery = `
  SELECT DISTINCT  -- ✅ Added DISTINCT
    ef.id,
    ef.matrix_item_id,
    ef.original_filename as evidence_filename,
    ef.file_size as evidence_file_size,
    ef.file_path as evidence_file_path,
    ef.status,
    ef.uploaded_at,
    ef.reviewed_at,
    ef.review_notes,
    u1.name as uploaded_by_name,
    u1.institution as uploader_institution,
    u2.name as reviewed_by_name,
    mi.item_number,
    mi.temuan,
    mi.penyebab,
    mi.rekomendasi,
    mi.tindak_lanjut,
    mr.id as matrix_report_id,
    mr.title as matrix_title,
    mr.target_opd
  ${baseQuery}
  ${whereClause}
  ORDER BY ef.${sortBy} ${sortOrder}
  LIMIT ? OFFSET ?
`;
```

**Changes**:
- Added `DISTINCT` to both COUNT and SELECT queries
- Explicitly select only needed columns instead of `ef.*`
- This ensures no duplicate evidence records are returned

## Implementation Steps

### Step 1: Run Database Migration
```bash
cd backend
run-fix-evidence-duplicates.bat
```

Or manually:
```bash
mysql -h localhost -u root -p evaluation_reporting < src/database/migrations/026_fix_evidence_duplicates.sql
```

### Step 2: Restart Backend
The TypeScript code has been updated and compiled. Restart the backend server:
```bash
cd backend
npm start
```

### Step 3: Test Evidence Database
1. Open browser and navigate to Evidence Database page
2. Verify that duplicate entries are no longer shown
3. Check that all evidence files are displayed correctly
4. Test search and filter functionality

## Technical Details

### Why DISTINCT Works
- `DISTINCT` removes duplicate rows from result set
- Based on ALL selected columns
- If any column differs, row is considered unique
- Performance impact is minimal for small-medium datasets

### Why Subqueries Instead of JOIN
**Before (with JOIN)**:
```
matrix_report_1 → assignment_1 → user_1
                → assignment_2 → user_2
                → assignment_3 → user_3

Result: 3 rows for each matrix_item (duplicates!)
```

**After (with subquery)**:
```
matrix_report_1 → (SELECT first assignment) → user_1

Result: 1 row per matrix_item (no duplicates!)
```

### Performance Considerations
- Subqueries are executed once per row
- For small number of assignments per matrix, performance is acceptable
- Alternative: Use GROUP BY with aggregate functions
- Current solution prioritizes correctness over micro-optimization

## Testing Checklist

- [x] Database migration created
- [x] Backend service updated with DISTINCT
- [x] Backend compiled successfully
- [x] Migration script created
- [ ] Run migration on database
- [ ] Restart backend server
- [ ] Test evidence database page
- [ ] Verify no duplicates shown
- [ ] Test search functionality
- [ ] Test filter functionality
- [ ] Test pagination
- [ ] Test download functionality

## Files Modified

### Backend
1. `backend/src/services/evidence.service.ts` - Added DISTINCT to queries
2. `backend/src/database/migrations/026_fix_evidence_duplicates.sql` - New migration
3. `backend/run-fix-evidence-duplicates.bat` - Migration script

### Documentation
1. `FIX_EVIDENCE_DUPLICATES.md` - This file

## Verification Queries

### Check for Duplicates (Before Fix)
```sql
-- Count evidence per matrix_item
SELECT 
    matrix_item_id,
    COUNT(*) as count
FROM matrix_evidence_tracking
GROUP BY matrix_item_id
HAVING count > 1;
```

### Verify Fix (After Migration)
```sql
-- Should return 0 rows (no duplicates)
SELECT 
    matrix_item_id,
    COUNT(*) as count
FROM matrix_evidence_tracking
GROUP BY matrix_item_id
HAVING count > 1;

-- Check total rows
SELECT COUNT(*) FROM matrix_evidence_tracking;

-- Should match
SELECT COUNT(DISTINCT id) FROM matrix_items;
```

## Rollback Plan

If issues occur, rollback to previous view:
```sql
DROP VIEW IF EXISTS matrix_evidence_tracking;

-- Restore original view from migration 023
CREATE OR REPLACE VIEW matrix_evidence_tracking AS
SELECT 
    mi.id as matrix_item_id,
    ...
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
JOIN users u ON ma.assigned_to = u.id;
```

## Future Improvements

### 1. Add Unique Index
```sql
-- Ensure one evidence file per matrix_item (if business logic allows)
ALTER TABLE evidence_files 
ADD UNIQUE INDEX idx_unique_evidence_per_item (matrix_item_id, original_filename);
```

### 2. Optimize View with Materialized View
```sql
-- For better performance on large datasets
CREATE TABLE matrix_evidence_tracking_cache AS
SELECT * FROM matrix_evidence_tracking;

-- Refresh periodically
TRUNCATE matrix_evidence_tracking_cache;
INSERT INTO matrix_evidence_tracking_cache SELECT * FROM matrix_evidence_tracking;
```

### 3. Add Evidence Deduplication
```typescript
// Check for duplicate files before upload
const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const duplicate = await query(
  'SELECT id FROM evidence_files WHERE file_hash = ? AND matrix_item_id = ?',
  [fileHash, matrixItemId]
);
```

## Status
✅ Database migration created
✅ Backend service updated
✅ Backend compiled successfully
✅ Migration script created
⏳ Waiting for migration execution
⏳ Waiting for testing

## Next Steps
1. Run migration: `cd backend && run-fix-evidence-duplicates.bat`
2. Restart backend server
3. Test evidence database page
4. Verify duplicates are removed
5. Monitor for any issues
