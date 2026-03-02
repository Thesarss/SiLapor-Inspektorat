# 🔧 Fix Matrix Upload 400 Error

## Problem
Matrix upload returns `400 Bad Request` but no detailed error logs appear in backend console.

## Root Cause
The backend code has been updated with extensive logging, but the changes are not being reflected because:
1. **Backend not restarted** - `ts-node-dev` should auto-restart but may not have detected changes
2. **Cached compilation** - TypeScript compilation cache may be stale
3. **Multiple processes** - Old backend process may still be running

## Solution Steps

### Step 1: Stop All Backend Processes
```bash
# Windows PowerShell
Get-Process node | Stop-Process -Force

# Or manually close all Node.js processes in Task Manager
```

### Step 2: Clear Compilation Cache (Optional)
```bash
cd backend
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
```

### Step 3: Restart Backend with Fresh Start
```bash
cd backend
npm run dev
```

### Step 4: Verify Backend is Running
```bash
# Run from project root
node verify-backend-running.js
```

Expected output:
```
✅ Backend is running
✅ Matrix API is accessible
✅ Institutions endpoint working
```

### Step 5: Test Matrix Upload
1. Open frontend in browser
2. Navigate to Matrix page
3. Click "Upload Matrix"
4. Fill in form and select Excel file
5. Click "Upload Matrix" button
6. **Watch backend console** for detailed logs

## What to Look For in Backend Console

### Successful Request Flow:
```
🚀 UPLOAD-AUTO ENDPOINT HIT - Before multer
   User: [username] | Role: inspektorat
   Content-Type: multipart/form-data; boundary=...
   Body keys: []

📦 Multer middleware callback
✅ Multer processed successfully, calling next()

🔍 Matrix upload request:
   user: [username]
   role: inspektorat
   file: { originalname: '...', size: ..., mimetype: '...' }
   body: { title: '...', targetOPD: '...', ... }

📋 Form data: { title: '...', description: '...', targetOPD: '...', useAutoMapping: 'true' }
```

### Error Scenarios:

#### 1. Permission Denied
```
❌ Permission denied: opd
```
**Fix**: User must have `inspektorat` or `super_admin` role

#### 2. No File Uploaded
```
❌ No file uploaded
```
**Fix**: Ensure file is selected and form data includes `file` field

#### 3. Missing Required Fields
```
❌ Missing required fields: { title: false, targetOPD: false }
```
**Fix**: Ensure `title` and `targetOPD` are filled in form

#### 4. Multer Error
```
❌ Multer error: [error message]
   Error type: [error type]
```
**Fix**: Check file size (<10MB), file type (.xlsx, .xls), and upload directory permissions

#### 5. File Validation Failed
```
❌ File validation failed: [error message]
```
**Fix**: Ensure file is valid Excel format and not corrupted

#### 6. Parse Error
```
❌ Parse error: [error message]
```
**Fix**: Ensure Excel file has proper headers (Temuan, Penyebab, Rekomendasi)

## Common Issues

### Issue 1: No Logs Appearing
**Symptom**: Backend console shows only `POST /api/matrix/upload-auto - 400 - 800ms`

**Cause**: Backend not running latest code

**Fix**:
1. Stop all Node.js processes
2. Restart backend with `npm run dev`
3. Verify with `node verify-backend-running.js`

### Issue 2: ECONNREFUSED
**Symptom**: Frontend cannot connect to backend

**Cause**: Backend not running or wrong port

**Fix**:
1. Start backend: `cd backend && npm run dev`
2. Verify port 3000 is available
3. Check `frontend/.env.development` has correct API URL

### Issue 3: 403 Forbidden
**Symptom**: Upload returns 403 error

**Cause**: User doesn't have permission

**Fix**:
1. Login with inspektorat account
2. Verify user role in database
3. Check `users` table: `SELECT * FROM users WHERE username = 'inspektorat1'`

### Issue 4: File Not Detected
**Symptom**: Backend logs show `file: 'NO FILE'`

**Cause**: Form data not properly formatted

**Fix**:
1. Ensure `Content-Type: multipart/form-data` header
2. Verify file input has `name="file"` attribute
3. Check FormData append: `formData.append('file', fileObject)`

## Testing Matrix Upload

### Test File Requirements
Create an Excel file with these columns:
- **Temuan** (Finding) - Required
- **Penyebab** (Cause) - Optional
- **Rekomendasi** (Recommendation) - Required

Example:
| Temuan | Penyebab | Rekomendasi |
|--------|----------|-------------|
| Laporan keuangan tidak lengkap | Kurangnya SDM | Tambah personel |
| Data tidak akurat | Sistem manual | Implementasi sistem digital |

### Test Script
```bash
# Run from project root
node backend/test-matrix-upload.js
```

This will:
1. Login as inspektorat user
2. Upload test matrix file
3. Show detailed request/response
4. Display any errors

## Verification Checklist

- [ ] Backend is running (`npm run dev`)
- [ ] Backend console shows startup messages
- [ ] Health endpoint responds (`http://localhost:3000/health`)
- [ ] Login works (test with inspektorat1/password123)
- [ ] Matrix test endpoint works (`/api/matrix/test`)
- [ ] Institutions endpoint works (`/api/matrix/institutions`)
- [ ] Upload endpoint shows detailed logs when accessed
- [ ] Frontend can connect to backend
- [ ] Test file is valid Excel format
- [ ] Form data includes all required fields

## Next Steps After Fix

Once the 400 error is resolved and detailed logs appear:

1. **Identify the specific error** from backend logs
2. **Fix the root cause** based on error message
3. **Test again** with same file
4. **Verify success** - should see matrix created in database

## Database Verification

After successful upload, verify in database:
```sql
-- Check matrix reports
SELECT * FROM matrix_reports ORDER BY created_at DESC LIMIT 1;

-- Check matrix items
SELECT * FROM matrix_items WHERE matrix_report_id = '[report_id]';

-- Check assignments
SELECT * FROM matrix_assignments WHERE matrix_report_id = '[report_id]';
```

## Support

If issue persists after following all steps:
1. Capture full backend console output
2. Capture frontend network tab (request/response)
3. Check database connection
4. Verify all migrations have run
5. Check file system permissions for uploads directory
