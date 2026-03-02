# 🔧 Langkah Perbaikan Final - Matrix Upload Error 400

## Masalah Saat Ini

❌ Upload dari frontend masih error 400  
✅ Test script berhasil (diagnose-matrix-upload.js)  
❌ Backend console TIDAK menampilkan log detail

**Kesimpulan:** Backend yang digunakan frontend BELUM di-restart dengan kode terbaru.

---

## Solusi: 3 Langkah Sederhana

### LANGKAH 1: Force Restart Backend

**Jalankan file ini:**
```bash
force-restart-backend.bat
```

**Atau manual:**
1. Buka Task Manager (Ctrl + Shift + Esc)
2. Tab "Details" atau "Processes"
3. Cari SEMUA proses "Node.js" atau "node.exe"
4. Klik kanan → End Task untuk SETIAP proses Node.js
5. Pastikan TIDAK ADA lagi Node.js yang berjalan

Kemudian:
```bash
cd backend
npm run dev
```

**Tunggu sampai muncul:**
```
Server running on port 3000
```

**JANGAN TUTUP terminal backend ini!**

---

### LANGKAH 2: Verifikasi Backend

Buka terminal BARU (jangan tutup backend), jalankan:
```bash
node verify-backend-running.js
```

**Harus muncul:**
```
✅ Backend is running
✅ Matrix API is accessible
✅ Institutions endpoint working
```

Jika ada error, backend belum start dengan benar. Ulangi Langkah 1.

---

### LANGKAH 3: Test Upload dari Frontend

1. **Buka browser** (Chrome/Edge)
2. **Tekan Ctrl + Shift + Delete** → Clear cache → Clear data
3. **Refresh halaman** (Ctrl + F5)
4. **Login:**
   - Username: `inspektorat1`
   - Password: `password123`
5. **Buka halaman Matrix**
6. **Klik "Upload Matrix"**
7. **Isi form:**
   - Title: "Test Matrix Upload"
   - Target OPD: Pilih "Dinas Pendidikan"
   - File: Pilih file Excel dengan kolom Temuan, Penyebab, Rekomendasi
8. **Klik "Upload Matrix"**

---

## Yang Harus Terjadi

### Di Backend Console (Terminal Backend)

**Saat Anda klik "Upload Matrix", HARUS muncul log seperti ini:**

```
🚀 UPLOAD-AUTO ENDPOINT HIT - Before multer
   User: Inspektorat User 1 | Role: inspektorat
   Content-Type: multipart/form-data; boundary=...
   Body keys: []

📦 Multer middleware callback
✅ Multer processed successfully, calling next()

🔍 Matrix upload request:
   user: Inspektorat User 1
   role: inspektorat
   file: { originalname: 'matrix.xlsx', size: 12345, ... }
   body: { title: 'Test Matrix Upload', targetOPD: 'Dinas Pendidikan', ... }

📋 Form data: { 
  title: 'Test Matrix Upload', 
  targetOPD: 'Dinas Pendidikan', 
  useAutoMapping: 'true' 
}
```

**Jika TIDAK muncul log ini sama sekali:**
→ Backend belum restart dengan benar
→ Ulangi Langkah 1 (force restart)

**Jika muncul log tapi ada error:**
→ Bagus! Sekarang kita bisa lihat error spesifiknya
→ Baca error message dan fix sesuai error

---

## Kemungkinan Error dan Solusi

### Error 1: Tidak Ada Log Sama Sekali
```
POST /api/matrix/upload-auto - 400 - 800ms
(tidak ada log 🚀 📦 ❌)
```

**Penyebab:** Backend belum restart  
**Solusi:** Ulangi Langkah 1 (force restart)

---

### Error 2: Permission Denied
```
❌ Permission denied: opd
```

**Penyebab:** Login dengan akun OPD, bukan inspektorat  
**Solusi:** Logout → Login dengan `inspektorat1`

---

### Error 3: File Tidak Ditemukan
```
❌ No file uploaded
```

**Penyebab:** File tidak ter-attach di form  
**Solusi:** 
- Pastikan file sudah dipilih (ada nama file di form)
- Coba pilih file lagi
- Coba file Excel yang berbeda

---

### Error 4: Missing Required Fields
```
❌ Missing required fields: { title: false, targetOPD: false }
```

**Penyebab:** Form tidak lengkap  
**Solusi:** Isi semua field wajib (Title dan Target OPD)

---

### Error 5: Parse Error
```
❌ Tidak dapat mendeteksi kolom Temuan dan Rekomendasi
```

**Penyebab:** Format Excel tidak sesuai  
**Solusi:** Pastikan Excel punya kolom:
- **Temuan** (wajib)
- **Penyebab** (opsional)
- **Rekomendasi** (wajib)

Contoh format yang benar:

| Temuan | Penyebab | Rekomendasi |
|--------|----------|-------------|
| Laporan tidak lengkap | Kurang SDM | Tambah personel |
| Data tidak akurat | Sistem manual | Implementasi digital |

---

### Error 6: File Too Large
```
❌ File terlalu besar. Maksimal 10MB
```

**Penyebab:** File > 10MB  
**Solusi:** Compress file atau split menjadi beberapa matrix

---

## Checklist Verifikasi

Sebelum upload, pastikan:

- [ ] Backend sudah di-restart (force-restart-backend.bat)
- [ ] Backend console menampilkan "Server running on port 3000"
- [ ] Verify script berhasil (node verify-backend-running.js)
- [ ] Browser cache sudah di-clear
- [ ] Login sebagai inspektorat1 (bukan OPD)
- [ ] File Excel sudah dipilih
- [ ] Form Title dan Target OPD sudah diisi
- [ ] File Excel punya kolom Temuan dan Rekomendasi
- [ ] Backend console terminal masih terbuka dan visible

---

## Troubleshooting Lanjutan

### Backend Tidak Bisa Start

**Error:** Port 3000 already in use

**Solusi:**
```bash
# Cek proses di port 3000
netstat -ano | findstr :3000

# Kill proses tersebut (ganti PID dengan nomor yang muncul)
taskkill /F /PID [PID]

# Restart backend
cd backend
npm run dev
```

---

### Backend Start Tapi Crash

**Error:** Database connection error

**Solusi:**
1. Pastikan XAMPP MySQL running
2. Cek database `evaluation_reporting` exists
3. Cek credentials di `backend/.env`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=evaluation_reporting
   ```

---

### Log Muncul Tapi Upload Tetap Gagal

**Bagus!** Sekarang kita bisa lihat error spesifiknya.

**Langkah:**
1. Screenshot backend console output
2. Baca error message yang muncul
3. Fix sesuai error message
4. Test lagi

---

## Test Cepat

Setelah restart backend, test dengan script:

```bash
# Test 1: Verify backend
node verify-backend-running.js

# Test 2: Diagnose upload
node diagnose-matrix-upload.js

# Test 3: Check latest matrix
node check-latest-matrix.js
```

Semua harus berhasil ✅

---

## Bantuan Tambahan

Jika masih stuck setelah mengikuti semua langkah:

1. **Jalankan:**
   ```bash
   node check-backend-logs.js
   ```

2. **Screenshot:**
   - Backend console output
   - Frontend browser console (F12)
   - Frontend Network tab (request/response)

3. **Share:**
   - Screenshot di atas
   - Error message yang muncul
   - Langkah yang sudah dilakukan

---

## Kesimpulan

Masalah utama adalah **backend belum restart**. Setelah restart:

1. ✅ Log detail akan muncul di backend console
2. ✅ Error spesifik akan terlihat jelas
3. ✅ Bisa fix sesuai error message yang muncul

**Kunci sukses:** Pastikan backend console menampilkan log 🚀 📦 saat upload!
