# 🔧 Solusi Error 400 pada Matrix Upload

## Masalah yang Terjadi

Saat upload matrix, muncul error:
```
POST /api/matrix/upload-auto - 400 - 800ms
```

Tetapi tidak ada log detail yang muncul di console backend. Ini berarti **backend belum menggunakan kode terbaru** yang sudah diperbaiki dengan logging lengkap.

## Penyebab

Backend perlu di-restart agar kode terbaru (dengan logging detail) bisa berjalan. Meskipun `ts-node-dev` seharusnya auto-restart, kadang perlu restart manual.

## Solusi Langkah demi Langkah

### Langkah 1: Restart Backend

**Cara Termudah:**
```bash
# Jalankan file batch ini
restart-backend.bat
```

**Cara Manual:**
1. Tutup semua proses Node.js (Task Manager → cari "Node.js" → End Task)
2. Buka terminal baru
3. Jalankan:
```bash
cd backend
npm run dev
```

### Langkah 2: Verifikasi Backend Berjalan

```bash
# Jalankan dari folder root project
node verify-backend-running.js
```

**Output yang diharapkan:**
```
✅ Backend is running
✅ Matrix API is accessible
✅ Institutions endpoint working
```

Jika ada error, backend belum berjalan dengan benar.

### Langkah 3: Diagnose Upload Issue

```bash
# Jalankan dari folder root project
node diagnose-matrix-upload.js
```

Script ini akan:
1. ✅ Cek backend health
2. ✅ Test login
3. ✅ Cek permissions
4. ✅ Cek institutions
5. ✅ Buat test file Excel
6. ✅ Test upload matrix
7. ✅ Tampilkan error detail jika ada

### Langkah 4: Test Upload dari Frontend

1. Buka browser → http://localhost:5173
2. Login dengan akun inspektorat
3. Buka halaman Matrix
4. Klik "Upload Matrix"
5. Isi form:
   - **Title**: Contoh "Matrix Audit Q1 2024"
   - **Target OPD**: Pilih dari dropdown
   - **File**: Pilih file Excel
6. Klik "Upload Matrix"

### Langkah 5: Lihat Log di Backend Console

**Sekarang harus muncul log detail seperti ini:**

```
🚀 UPLOAD-AUTO ENDPOINT HIT - Before multer
   User: Inspektorat User | Role: inspektorat
   Content-Type: multipart/form-data; boundary=...
   Body keys: []

📦 Multer middleware callback
✅ Multer processed successfully, calling next()

🔍 Matrix upload request:
   user: Inspektorat User
   role: inspektorat
   file: { originalname: 'matrix.xlsx', size: 12345, mimetype: '...' }
   body: { title: '...', targetOPD: '...', ... }

📋 Form data: { title: '...', description: '...', targetOPD: '...', useAutoMapping: 'true' }
```

**Jika ada error, akan muncul:**
```
❌ [Error message yang spesifik]
```

## Kemungkinan Error dan Solusinya

### Error 1: Permission Denied
```
❌ Permission denied: opd
```
**Solusi:** Login dengan akun inspektorat, bukan OPD

### Error 2: No File Uploaded
```
❌ No file uploaded
```
**Solusi:** Pastikan file sudah dipilih sebelum klik upload

### Error 3: Missing Required Fields
```
❌ Missing required fields: { title: false, targetOPD: false }
```
**Solusi:** Isi semua field wajib (Title dan Target OPD)

### Error 4: File Validation Failed
```
❌ File validation failed: Format file harus Excel
```
**Solusi:** 
- Gunakan file Excel (.xlsx atau .xls)
- Ukuran maksimal 10MB
- File tidak corrupt

### Error 5: Parse Error
```
❌ Tidak dapat mendeteksi kolom Temuan dan Rekomendasi
```
**Solusi:** Pastikan Excel punya kolom dengan nama:
- **Temuan** (atau Finding, Audit Finding, Kondisi, Permasalahan)
- **Penyebab** (atau Sebab, Cause, Root Cause) - opsional
- **Rekomendasi** (atau Recommendation, Saran, Usulan)

## Format File Excel yang Benar

Buat file Excel dengan struktur seperti ini:

| Temuan | Penyebab | Rekomendasi |
|--------|----------|-------------|
| Laporan keuangan tidak lengkap | Kurangnya SDM | Tambah personel akuntansi |
| Data tidak akurat | Sistem manual | Implementasi sistem digital |
| Dokumentasi kurang lengkap | Tidak ada SOP | Buat SOP dokumentasi |

**Catatan:**
- Header bisa di baris manapun (sistem akan deteksi otomatis)
- Kolom tambahan seperti "No", "Keterangan" akan diabaikan
- Baris kosong akan dilewati otomatis
- Minimal harus ada kolom **Temuan** dan **Rekomendasi**

## Troubleshooting

### Masalah: Log Tidak Muncul di Backend Console

**Gejala:** Backend console hanya menampilkan:
```
POST /api/matrix/upload-auto - 400 - 800ms
```

**Penyebab:** Backend belum menggunakan kode terbaru

**Solusi:**
1. Tutup SEMUA proses Node.js
2. Restart backend dengan `restart-backend.bat`
3. Tunggu sampai muncul "Server running on port 3000"
4. Test lagi

### Masalah: Backend Tidak Bisa Start

**Gejala:** Error saat `npm run dev`

**Solusi:**
1. Cek apakah port 3000 sudah dipakai:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Jika ada, kill process tersebut
3. Cek file `.env` di folder backend
4. Pastikan database MySQL berjalan (XAMPP)

### Masalah: ECONNREFUSED

**Gejala:** Frontend tidak bisa connect ke backend

**Solusi:**
1. Pastikan backend berjalan di port 3000
2. Cek `frontend/.env.development`:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```
3. Restart frontend jika perlu

### Masalah: Database Error

**Gejala:** Error saat insert ke database

**Solusi:**
1. Pastikan XAMPP MySQL berjalan
2. Cek database `evaluation_reporting` ada
3. Jalankan migrations:
   ```bash
   cd backend
   npm run migrate
   ```

## Verifikasi Setelah Upload Berhasil

Cek di database:

```sql
-- Cek matrix reports
SELECT * FROM matrix_reports ORDER BY created_at DESC LIMIT 1;

-- Cek matrix items
SELECT * FROM matrix_items 
WHERE matrix_report_id = '[report_id_dari_query_atas]';

-- Cek assignments
SELECT * FROM matrix_assignments 
WHERE matrix_report_id = '[report_id_dari_query_atas]';
```

## File Bantuan

Saya sudah membuat beberapa file untuk membantu:

1. **restart-backend.bat** - Restart backend dengan mudah
2. **verify-backend-running.js** - Cek apakah backend berjalan
3. **diagnose-matrix-upload.js** - Diagnose lengkap upload issue
4. **FIX_MATRIX_UPLOAD_400_ERROR.md** - Dokumentasi lengkap (English)
5. **QUICK_FIX_MATRIX_UPLOAD.txt** - Quick reference

## Kesimpulan

Masalah utama adalah **backend perlu di-restart** agar kode terbaru dengan logging detail bisa berjalan. Setelah restart:

1. ✅ Log detail akan muncul di backend console
2. ✅ Error spesifik akan terlihat jelas
3. ✅ Bisa fix sesuai error message yang muncul

**Langkah paling penting:**
```bash
# 1. Restart backend
restart-backend.bat

# 2. Verifikasi
node verify-backend-running.js

# 3. Diagnose
node diagnose-matrix-upload.js

# 4. Test dari frontend
# Lihat backend console untuk log detail
```

Jika masih ada masalah setelah restart, error message yang spesifik akan muncul di backend console dan bisa kita fix sesuai error tersebut.
