# 🔧 Fix 500 Error - Matrix Review

## 🐛 Error yang Terjadi

```
POST http://localhost:3000/api/matrix/item/ebb37055-73ae-43cd-a3f9-8dbba6842d8e
500 (Internal Server Error)
```

Error ini terjadi saat mencoba approve/reject matrix item.

---

## 🔍 Kemungkinan Penyebab

1. ❌ Table `matrix_items` tidak ada
2. ❌ Column structure tidak sesuai
3. ❌ Database connection error
4. ❌ Foreign key constraint error
5. ❌ Item ID tidak ditemukan

---

## 🚀 LANGKAH PERBAIKAN

### Step 1: Diagnose Database

Jalankan script diagnostic:

```bash
node fix-matrix-review-issue.js
```

Script ini akan:
- ✅ Cek apakah table `matrix_items` ada
- ✅ Cek struktur table
- ✅ Cek sample data
- ✅ Test UPDATE query
- ✅ Cek foreign key constraints

---

### Step 2: Restart Backend dengan Logging

Backend sudah ditambahkan logging untuk debug. Restart backend:

```bash
cd backend
npm run dev
```

Sekarang backend akan menampilkan log detail saat approve/reject:
- 🔍 Request details (itemId, status, user)
- ✅ Item found confirmation
- ✅ Update result
- ❌ Error details (jika ada)

---

### Step 3: Test Approve/Reject Lagi

1. Login sebagai inspektorat
2. Buka halaman Review
3. Klik approve/reject pada matrix item
4. **Perhatikan backend console** untuk melihat log detail

---

## 📊 Interpretasi Log Backend

### ✅ Success Log:
```
🔍 Matrix Review Request: { itemId: 'xxx', status: 'approved', ... }
✅ Matrix item found: { id: 'xxx', status: 'pending', ... }
✅ Update result: { affectedRows: 1 }
```

### ❌ Error Log - Item Not Found:
```
🔍 Matrix Review Request: { itemId: 'xxx', status: 'approved', ... }
❌ Matrix item not found: xxx
```
**Solusi**: Item ID tidak ada di database. Cek dengan query:
```sql
SELECT * FROM matrix_items WHERE id = 'xxx';
```

### ❌ Error Log - Permission Denied:
```
🔍 Matrix Review Request: { itemId: 'xxx', status: 'approved', ... }
❌ Permission denied: opd
```
**Solusi**: User bukan inspektorat. Cek role user di database.

### ❌ Error Log - Database Error:
```
🔍 Matrix Review Request: { itemId: 'xxx', status: 'approved', ... }
✅ Matrix item found: { ... }
❌ Matrix review error: Error: ER_NO_SUCH_TABLE: Table 'matrix_items' doesn't exist
```
**Solusi**: Run migration:
```bash
cd backend
node run-matrix-migration.bat
```

---

## 🔧 Manual Database Check

### Check Table Exists:
```sql
SHOW TABLES LIKE 'matrix_items';
```

### Check Table Structure:
```sql
DESCRIBE matrix_items;
```

Expected columns:
- `id` VARCHAR(36)
- `status` ENUM('pending', 'submitted', 'approved', 'rejected')
- `reviewed_by` VARCHAR(36)
- `review_notes` TEXT
- `reviewed_at` TIMESTAMP

### Check Sample Data:
```sql
SELECT id, status, reviewed_by, reviewed_at 
FROM matrix_items 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test UPDATE Query:
```sql
UPDATE matrix_items
SET status = 'approved', reviewed_by = 'test-user-id', review_notes = 'Test', reviewed_at = NOW()
WHERE id = 'your-item-id';
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Table Doesn't Exist
**Error**: `Table 'matrix_items' doesn't exist`

**Solution**:
```bash
cd backend
# Run matrix migration
mysql -u root -p inspektorat_db < src/database/migrations/019_create_matrix_audit_system_fixed.sql
```

### Issue 2: Column Missing
**Error**: `Unknown column 'reviewed_by' in 'field list'`

**Solution**:
```sql
ALTER TABLE matrix_items 
ADD COLUMN reviewed_by VARCHAR(36) AFTER status,
ADD COLUMN review_notes TEXT AFTER reviewed_by,
ADD COLUMN reviewed_at TIMESTAMP NULL AFTER review_notes;
```

### Issue 3: Foreign Key Constraint
**Error**: `Cannot add or update a child row: a foreign key constraint fails`

**Solution**: User ID tidak ada di table `users`. Cek:
```sql
SELECT id, username, role FROM users WHERE role = 'inspektorat';
```

### Issue 4: Item Not Found
**Error**: 404 or no affected rows

**Solution**: Item ID tidak ada. Cek:
```sql
SELECT * FROM matrix_items WHERE id = 'your-item-id';
```

---

## 🧪 Test Endpoint Directly

Gunakan script test:

```bash
# Edit test-matrix-review.js first:
# 1. Set TOKEN from your login
# 2. Set testItemId from database

node test-matrix-review.js
```

Atau test dengan curl:

```bash
# Get token first by login
TOKEN="your-token-here"
ITEM_ID="ebb37055-73ae-43cd-a3f9-8dbba6842d8e"

curl -X POST "http://localhost:3000/api/matrix/item/$ITEM_ID/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","reviewNotes":"Test approval"}'
```

---

## 📝 Checklist Debugging

Copy dan isi hasil check:

```
## Debugging Checklist

### Database
- [ ] XAMPP MySQL running
- [ ] Database 'inspektorat_db' exists
- [ ] Table 'matrix_items' exists
- [ ] All required columns exist
- [ ] Sample data exists

### Backend
- [ ] Backend running on port 3000
- [ ] No TypeScript compilation errors
- [ ] Logs appear in console
- [ ] Can see request details in log

### Frontend
- [ ] Logged in as inspektorat user
- [ ] Can see matrix items in list
- [ ] Approve button clickable
- [ ] Network tab shows request sent

### Error Details
Backend console output:
___________________________

Browser console output:
___________________________

Network tab response:
___________________________
```

---

## 🎯 Expected Behavior

### When Approve Works:
1. Click "✅ Setujui" button
2. Backend log shows:
   ```
   🔍 Matrix Review Request: { ... }
   ✅ Matrix item found: { ... }
   ✅ Update result: { affectedRows: 1 }
   ```
3. Frontend shows success notification
4. Item status changes to "approved"

### When Reject Works:
1. Click "❌ Tolak" button
2. Enter rejection notes
3. Backend log shows same as approve
4. Item status changes to "rejected"
5. Notes saved in database

---

## 🆘 If Still Not Working

Provide this information:

1. **Backend Console Output** (full log dari saat request)
2. **Browser Console Error** (F12 → Console)
3. **Network Tab Response** (F12 → Network → Click failed request → Response)
4. **Database Query Results**:
   ```sql
   SELECT * FROM matrix_items WHERE id = 'your-item-id';
   SELECT id, username, role FROM users WHERE role = 'inspektorat';
   ```
5. **Diagnostic Script Output**:
   ```bash
   node fix-matrix-review-issue.js
   ```

---

## 💡 Quick Fix Commands

```bash
# 1. Diagnose
node fix-matrix-review-issue.js

# 2. Check database
mysql -u root -p
USE inspektorat_db;
SHOW TABLES LIKE 'matrix_items';
DESCRIBE matrix_items;
SELECT * FROM matrix_items LIMIT 5;

# 3. Restart backend
cd backend
npm run dev

# 4. Watch backend console while testing
# (Keep terminal visible)

# 5. Test approve/reject in browser
# (Watch both browser and backend console)
```

---

**Status**: Backend updated with detailed logging. Run diagnostic script and restart backend to see detailed error messages.
