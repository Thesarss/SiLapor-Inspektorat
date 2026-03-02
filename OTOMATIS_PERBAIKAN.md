# 🤖 Otomatis Perbaikan - Matrix Issues

## Cara Pakai (Super Mudah!)

### Langkah 1: Jalankan Script Otomatis

```bash
auto-fix-everything.bat
```

**Script ini akan otomatis:**
1. ✅ Fix database (institution mismatch, create OPD user, create assignments)
2. ✅ Kill semua Node.js processes
3. ✅ Start backend di window baru
4. ✅ Verify backend running

### Langkah 2: Start Frontend

Di terminal baru:
```bash
cd frontend
npm run dev
```

### Langkah 3: Test di Browser

1. Clear cache: `Ctrl + Shift + Delete`
2. Refresh: `Ctrl + F5`
3. Login dan test

---

## Yang Dilakukan Script Otomatis

### 1. Database Fix (`auto-fix-database.js`)

**Cek Matrix Report:**
- Ambil matrix report terbaru
- Cek target OPD

**Fix Institution Mismatch:**
- Cari OPD users dengan institution yang match
- Jika tidak match (case-sensitive), fix otomatis
- Contoh: "dinas pendidikan" → "Dinas Pendidikan"

**Create OPD User (jika perlu):**
- Jika tidak ada user OPD sama sekali
- Create user baru dengan:
  - Username: `opd_[institution]` (lowercase, underscore)
  - Password: `password123`
  - Institution: sesuai target OPD

**Create Assignments:**
- Create assignment untuk semua OPD users
- Link matrix report dengan OPD users

### 2. Backend Restart

**Kill Processes:**
- Stop semua Node.js yang running
- Bersihkan port 3000

**Start Backend:**
- Start di window terpisah
- Bisa monitor log langsung

### 3. Verification

**Cek Backend:**
- Test health endpoint
- Test matrix API
- Pastikan semua berjalan

---

## Hasil yang Diharapkan

### Console Output

```
╔══════════════════════════════════════════════════════════════╗
║  AUTO FIX EVERYTHING - Matrix Issues                        ║
╚══════════════════════════════════════════════════════════════╝

Step 1: Fixing database issues...
========================================
🔧 Auto Fix Database

✅ Connected to database

📋 Step 1: Checking matrix report...
   Report: "asdjsadj"
   Target: "Dinas Pendidikan"

📋 Step 2: Checking institution match...
   Found 0 OPD users

   🔧 Creating OPD user...

   ✅ Created OPD user
      Username: opd_dinas_pendidikan
      Password: password123

📋 Step 3: Creating assignments...
   ✅ Created for User OPD Dinas Pendidikan

📋 Step 4: Verification...
   ✅ Total assignments: 1

   1. User OPD Dinas Pendidikan (opd_dinas_pendidikan)
      Institution: Dinas Pendidikan

✅ Database fix complete!

   ✅ Database fixed

Step 2: Killing all Node.js processes...
========================================
   ✅ Processes killed

Step 3: Starting backend...
========================================
   ✅ Backend started

Step 4: Verifying backend...
========================================
✅ Backend is running
✅ Matrix API is accessible

╔══════════════════════════════════════════════════════════════╗
║  ✅ AUTO FIX COMPLETE                                        ║
╚══════════════════════════════════════════════════════════════╝
```

### Di Browser

**Login sebagai OPD:**
- Username: `opd_dinas_pendidikan` (atau yang muncul di console)
- Password: `password123`
- Buka halaman Matrix
- Assignment harus muncul!

**Login sebagai Inspektorat:**
- Username: `inspektorat1`
- Password: `password123`
- Tombol "View Progress" dan "Lihat Detail" harus bisa diklik

---

## Troubleshooting

### Error: "Cannot find module 'bcrypt'"

**Solusi:**
```bash
cd backend
npm install
cd ..
auto-fix-everything.bat
```

### Error: "Cannot find module 'uuid'"

**Solusi:**
```bash
cd backend
npm install
cd ..
auto-fix-everything.bat
```

### Error: "Database connection failed"

**Solusi:**
1. Pastikan XAMPP MySQL running
2. Cek credentials di `backend/.env`
3. Cek database `evaluation_reporting` exists

### Backend Window Tidak Muncul

**Solusi:**
Manual start:
```bash
cd backend
npm run dev
```

### Frontend Error

**Solusi:**
```bash
cd frontend
npm install
npm run dev
```

---

## Manual Steps (Jika Script Gagal)

### 1. Fix Database Manual

```bash
node auto-fix-database.js
```

### 2. Restart Backend Manual

```bash
cd backend
npm run dev
```

### 3. Start Frontend Manual

```bash
cd frontend
npm run dev
```

---

## Verifikasi Hasil

### Cek Database

```sql
-- Cek matrix report
SELECT id, title, target_opd FROM matrix_reports ORDER BY created_at DESC LIMIT 1;

-- Cek OPD users
SELECT id, name, username, institution FROM users WHERE role = 'opd';

-- Cek assignments
SELECT ma.id, u.name, u.institution, ma.status
FROM matrix_assignments ma
JOIN users u ON ma.assigned_to = u.id
ORDER BY ma.created_at DESC LIMIT 5;
```

### Test Login OPD

1. Buka browser
2. Login dengan username yang muncul di console
3. Password: `password123`
4. Buka halaman Matrix
5. Assignment harus muncul

### Test Tombol Inspektorat

1. Login sebagai `inspektorat1`
2. Buka halaman Matrix
3. Klik "View Progress" → Harus bisa
4. Klik "Lihat Detail" → Harus bisa

---

## File yang Dibuat

1. **auto-fix-everything.bat** - Script utama (jalankan ini)
2. **auto-fix-database.js** - Fix database otomatis
3. **OTOMATIS_PERBAIKAN.md** - Dokumentasi ini

---

## Summary

**Sebelum:**
- ❌ Assignment tidak muncul di OPD
- ❌ Tombol tidak bisa diklik
- ❌ Institution mismatch
- ❌ Tidak ada OPD user

**Sesudah (setelah jalankan script):**
- ✅ Assignment muncul di OPD
- ✅ Tombol bisa diklik
- ✅ Institution match
- ✅ OPD user ter-create otomatis
- ✅ Assignments ter-create otomatis
- ✅ Backend running
- ✅ Siap digunakan!

**Cara Pakai:**
```bash
# 1. Jalankan script
auto-fix-everything.bat

# 2. Start frontend (di terminal baru)
cd frontend
npm run dev

# 3. Test di browser
# - Clear cache (Ctrl + Shift + Delete)
# - Refresh (Ctrl + F5)
# - Login dan test
```

Semua otomatis! 🎉
