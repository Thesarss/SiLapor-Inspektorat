# 🧪 Complete Feature Testing Guide

## ✅ Compilation Status: PASSED
Backend TypeScript compiles without errors.

## 🚀 STEP 1: Restart Backend Server

### Stop Current Server
Press `Ctrl+C` in your backend terminal

### Start Fresh
```bash
cd backend
npm run dev
```

**Expected Output**:
```
[15:XX:XX] Starting compilation in watch mode...
[15:XX:XX] Found 0 errors. Watching for file changes.
Server running on port 3000
🔧 Development mode: Using relaxed rate limiting (100 req/10s)
```

---

## 🧪 STEP 2: Test Each Feature

### Test 1: ✅ Inspektorat Approve/Reject Recommendations

#### Prerequisites:
- Backend running on port 3000
- Frontend running on port 5173
- Logged in as inspektorat user

#### Test Steps:
1. **Navigate to Review Page**
   - Go to: `http://localhost:5173/approvals`
   - Should see list of pending recommendations

2. **Test Approve**
   - Find a recommendation with status "submitted"
   - Click "✅ Setujui" button
   - **Expected Result**: 
     - Success notification appears
     - Item disappears from list or status changes
     - Backend console shows: `✅ Report {id} auto-completed` (if all approved)

3. **Test Reject**
   - Find another recommendation
   - Click "❌ Tolak" button
   - Enter rejection notes (required)
   - Click "❌ Konfirmasi Tolak"
   - **Expected Result**:
     - Success notification appears
     - Item status changes to "rejected"
     - Backend console shows: `📝 Report {id} marked as needs_revision`

#### Debugging:
If it fails, check:
```bash
# Backend console - should NOT show:
# - 403 Forbidden
# - TypeScript compilation errors
# - "Hanya Inspektorat yang dapat..."

# Browser console (F12) - check Network tab:
# - Request URL: http://localhost:3000/api/followup-recommendations/recommendations/{id}/approve
# - Status: 200 OK (not 403 or 404)
# - Response: { success: true, message: "..." }
```

---

### Test 2: 📊 Inspektorat Matrix Upload

#### Prerequisites:
- Logged in as inspektorat user
- Have an Excel file with columns: Temuan, Penyebab, Rekomendasi

#### Test Steps:
1. **Navigate to Matrix Page**
   - Go to: `http://localhost:5173/matrix`
   - Should see "Upload Matrix" button

2. **Upload Excel File**
   - Click "Upload Matrix" or drag & drop Excel file
   - **Expected Result**:
     - File upload progress shown
     - Success notification
     - Matrix items appear in list

3. **Verify Data**
   - Check if items are parsed correctly
   - Verify Temuan, Penyebab, Rekomendasi columns

#### Debugging:
```bash
# Check backend console:
# Should show: "📊 Parsed X rows from Excel file"

# Check database:
SELECT * FROM matrix_items ORDER BY created_at DESC LIMIT 5;

# Browser console - Network tab:
# POST http://localhost:3000/api/matrix/upload-auto
# Status: 200 OK
```

---

### Test 3: 📎 OPD Evidence Upload

#### Prerequisites:
- Logged in as OPD user
- Have a PDF or image file ready
- Know a matrix_item_id to attach evidence to

#### Test Steps:
1. **Navigate to Evidence Page**
   - Go to: `http://localhost:5173/evidence`
   - Or go to Matrix Progress page

2. **Upload Evidence**
   - Select a matrix item
   - Click "Upload Evidence"
   - Choose file (PDF, JPG, PNG, DOC, XLS)
   - Fill in description and category
   - Click "Upload"
   - **Expected Result**:
     - Success notification
     - File appears in evidence list
     - Database record created

3. **Verify Database**
   ```sql
   SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT 5;
   ```

#### Debugging:
```bash
# Backend console should show:
# "📎 Evidence uploaded: {filename}"

# Check uploads folder:
ls backend/uploads/evidence/

# Browser console - Network tab:
# POST http://localhost:3000/api/evidence/upload
# Status: 200 OK
# Response: { success: true, data: {...} }
```

---

### Test 4: 🔍 Review System - Individual Recommendations

#### Verify Correct Behavior:
1. **Navigate to Approvals Page**
   - Should see INDIVIDUAL recommendations, not whole reports
   - Each card should show:
     - Recommendation text
     - Related item (Temuan/Penyebab/Rekomendasi)
     - Approve/Reject buttons for EACH recommendation

2. **Test Individual Approval**
   - Approve ONE recommendation
   - Other recommendations in same report should remain pending
   - Report only completes when ALL recommendations approved

3. **Test Individual Rejection**
   - Reject ONE recommendation
   - Only that specific recommendation needs revision
   - User can fix and resubmit just that one

---

## 📊 Expected Results Summary

| Feature | Expected Behavior | Status |
|---------|------------------|--------|
| Approve Recommendation | Success notification, item approved | ✅ Should work |
| Reject Recommendation | Success notification, needs revision | ✅ Should work |
| Matrix Upload | Excel parsed, items created | ✅ Should work |
| Evidence Upload | File saved, database record | ⚠️ Needs testing |
| Individual Review | One recommendation at a time | ✅ Already correct |

---

## 🐛 Common Issues & Solutions

### Issue 1: 403 Forbidden on Approve/Reject
**Cause**: Old compiled code or cache
**Solution**:
```bash
# Stop backend
# Delete dist folder
rm -rf backend/dist
# Restart backend
cd backend && npm run dev
```

### Issue 2: Matrix Upload Button Does Nothing
**Cause**: Frontend not connected to backend
**Solution**:
- Check backend is running on port 3000
- Check frontend .env.development: `VITE_API_URL=http://localhost:3000/api`
- Clear browser cache (Ctrl+Shift+Delete)

### Issue 3: Evidence Upload "Not Saved to Database"
**Cause**: Missing matrix_item_id or database connection
**Solution**:
```bash
# Check database connection
mysql -u root -p

# Verify table exists
SHOW TABLES LIKE 'evidence_files';

# Check recent uploads
SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT 5;
```

### Issue 4: TypeScript Compilation Error
**Cause**: Invalid role checks
**Solution**: Already fixed! Run verification:
```bash
node verify-backend-compilation.js
```

---

## 🎯 Success Criteria

### ✅ All Tests Pass When:
1. Inspektorat can approve recommendations → Success notification
2. Inspektorat can reject recommendations → Success notification + notes saved
3. Inspektorat can upload matrix Excel → Items parsed and saved
4. OPD can upload evidence → File saved + database record
5. Review shows individual recommendations → Not whole reports
6. No TypeScript compilation errors → Backend starts cleanly
7. No 403 Forbidden errors → Permissions correct

---

## 📝 Test Results Template

Copy this and fill in your results:

```
## Test Results - [Date/Time]

### Test 1: Approve/Reject
- [ ] Approve works: ___________
- [ ] Reject works: ___________
- [ ] Notes saved: ___________
- [ ] Errors: ___________

### Test 2: Matrix Upload
- [ ] Upload works: ___________
- [ ] Items parsed: ___________
- [ ] Database saved: ___________
- [ ] Errors: ___________

### Test 3: Evidence Upload
- [ ] Upload works: ___________
- [ ] File saved: ___________
- [ ] Database record: ___________
- [ ] Errors: ___________

### Test 4: Individual Review
- [ ] Shows individual items: ___________
- [ ] Can approve one: ___________
- [ ] Can reject one: ___________
- [ ] Errors: ___________

### Overall Status
- [ ] All tests passed
- [ ] Some tests failed (list below)
- [ ] Need help with: ___________
```

---

## 🆘 If Tests Fail

### Provide This Information:
1. **Which test failed?**
2. **Backend console output** (copy full error)
3. **Browser console errors** (F12 → Console tab)
4. **Network tab response** (F12 → Network → Click failed request → Response)
5. **Database query results** (if applicable)

### Quick Diagnostic Commands:
```bash
# Check backend compilation
node verify-backend-compilation.js

# Check backend is running
curl http://localhost:3000/health

# Check database connection
mysql -u root -p -e "SELECT 1"

# Check user roles
mysql -u root -p -e "SELECT id, username, role FROM users"
```

---

## 🎉 Success!

If all tests pass:
1. ✅ System is fully functional
2. ✅ All 4 issues resolved
3. ✅ Ready for production use

**Next Steps**: Continue using the system normally. All features should work as expected.
