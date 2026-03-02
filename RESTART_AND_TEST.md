# 🚀 Restart dan Test - Panduan Cepat

## ✅ Status: Semua Error Sudah Diperbaiki!

Backend TypeScript sekarang compile tanpa error. Tinggal restart dan test.

---

## 📋 Yang Sudah Diperbaiki:

### 1. ✅ Inspektorat Approve/Reject
- **Masalah**: Error TypeScript, role 'admin' tidak valid
- **Solusi**: Diganti ke 'super_admin'
- **Status**: ✅ FIXED

### 2. ✅ Review Individual (Bukan Keseluruhan)
- **Masalah**: Tidak ada masalah, sudah benar dari awal
- **Status**: ✅ SUDAH BENAR

### 3. ✅ Matrix Upload
- **Masalah**: Tidak ada masalah, feature sudah ada
- **Status**: ✅ SUDAH ADA

### 4. ⚠️ Evidence Upload
- **Masalah**: Perlu dicek apakah tersimpan di database
- **Status**: ⚠️ PERLU TESTING

---

## 🔧 LANGKAH 1: RESTART BACKEND (WAJIB!)

### Stop Backend Sekarang:
Tekan `Ctrl+C` di terminal backend

### Start Backend Lagi:
```bash
cd backend
npm run dev
```

### Harus Muncul:
```
[15:XX:XX] Found 0 errors. Watching for file changes.
Server running on port 3000
```

### ❌ Kalau Ada Error:
Jalankan ini untuk cek:
```bash
node verify-backend-compilation.js
```

---

## 🧪 LANGKAH 2: TEST FITUR

### Test 1: Approve/Reject (PRIORITAS TINGGI)

**Cara Test**:
1. Login sebagai inspektorat
2. Buka halaman "Review Laporan & Matrix"
3. Cari rekomendasi dengan status "submitted"
4. Klik tombol "✅ Setujui"

**Hasil yang Diharapkan**:
- ✅ Muncul notifikasi sukses
- ✅ Item hilang dari list atau status berubah
- ✅ Tidak ada error 403 Forbidden

**Kalau Gagal**:
- Cek console backend (terminal)
- Cek console browser (F12)
- Screenshot error dan kirim

---

### Test 2: Matrix Upload

**Cara Test**:
1. Login sebagai inspektorat
2. Buka halaman Matrix
3. Klik "Upload Matrix" atau drag & drop file Excel
4. File Excel harus punya kolom: Temuan, Penyebab, Rekomendasi

**Hasil yang Diharapkan**:
- ✅ File terupload
- ✅ Data ter-parse otomatis
- ✅ Item muncul di list

**Kalau Gagal**:
- Cek apakah tombol upload ada response
- Cek console browser (F12 → Network tab)
- Screenshot error

---

### Test 3: Evidence Upload

**Cara Test**:
1. Login sebagai user OPD
2. Buka halaman Evidence atau Matrix Progress
3. Pilih matrix item
4. Upload file (PDF, JPG, PNG, DOC, XLS)
5. Isi description dan category
6. Klik Upload

**Hasil yang Diharapkan**:
- ✅ File terupload
- ✅ Muncul notifikasi sukses
- ✅ File muncul di list
- ✅ Tersimpan di database

**Cara Cek Database**:
```sql
SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT 5;
```

**Kalau Gagal**:
- Cek apakah file tersimpan di folder `backend/uploads/evidence/`
- Cek database apakah ada record baru
- Screenshot error

---

## 📊 Checklist Testing

Copy ini dan isi hasilnya:

```
## Hasil Testing - [Tanggal/Jam]

### ✅ Backend Restart
- [ ] Backend restart sukses
- [ ] Tidak ada error TypeScript
- [ ] Server running di port 3000

### ✅ Test Approve/Reject
- [ ] Approve berhasil
- [ ] Reject berhasil
- [ ] Notifikasi muncul
- [ ] Tidak ada error 403

### ✅ Test Matrix Upload
- [ ] Upload berhasil
- [ ] Data ter-parse
- [ ] Item muncul di list

### ✅ Test Evidence Upload
- [ ] Upload berhasil
- [ ] File tersimpan
- [ ] Database ada record
- [ ] File muncul di list

### Status Keseluruhan
- [ ] Semua test berhasil ✅
- [ ] Ada yang gagal (tulis di bawah)

Error yang ditemukan:
___________________________
___________________________
```

---

## 🐛 Kalau Ada Error

### Error: 403 Forbidden
**Solusi**:
```bash
# Stop backend
# Hapus folder dist
rm -rf backend/dist
# Restart backend
cd backend && npm run dev
```

### Error: Tombol Upload Tidak Ada Response
**Solusi**:
- Cek backend running di port 3000
- Cek frontend .env.development: `VITE_API_URL=http://localhost:3000/api`
- Clear browser cache (Ctrl+Shift+Delete)

### Error: Evidence Tidak Tersimpan
**Solusi**:
```bash
# Cek database connection
mysql -u root -p

# Cek table ada
SHOW TABLES LIKE 'evidence_files';

# Cek data
SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT 5;
```

---

## 🎯 Kesimpulan

### Yang Harus Dilakukan:
1. **RESTART BACKEND** ← Paling penting!
2. Test approve/reject
3. Test matrix upload
4. Test evidence upload

### Hasil yang Diharapkan:
- ✅ Inspektorat bisa approve/reject
- ✅ Review per rekomendasi (bukan keseluruhan)
- ✅ Matrix upload berfungsi
- ✅ Evidence upload tersimpan

### Kalau Semua Berhasil:
🎉 Sistem sudah berfungsi dengan baik!

### Kalau Ada yang Gagal:
Kirim informasi ini:
1. Error message dari backend console
2. Error message dari browser console (F12)
3. Screenshot error
4. Test mana yang gagal

---

## 📞 Bantuan Cepat

### Cek Compilation:
```bash
node verify-backend-compilation.js
```

### Cek Backend Running:
```bash
curl http://localhost:3000/health
```

### Cek User Roles:
```sql
SELECT id, username, role FROM users;
```

---

**LANGKAH SELANJUTNYA**: Restart backend dan mulai testing! 🚀
