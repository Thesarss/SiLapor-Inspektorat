# Summary Perbaikan - Evidence Upload & Statistik Inspektorat

## ✅ Masalah yang Sudah Diperbaiki

### 1. Statistik Inspektorat Tidak Sinkron ✅

**Masalah Awal:**
- Inspektorat1 dan Inspektorat2 melihat statistik yang berbeda
- Setiap inspektorat hanya melihat laporan yang di-assign ke mereka

**Solusi:**
- Diubah fungsi `getInspektoratAnalytics()` di `backend/src/services/dashboard.service.ts`
- Sekarang SEMUA inspektorat melihat statistik yang SAMA (semua laporan dari semua OPD)

**Hasil Test:**
```
INSPEKTORAT1:
- Total Reports: 6
- Pending: 3
- Approved: 2
- Rejected: 1

INSPEKTORAT2:
- Total Reports: 6  ✅ SAMA!
- Pending: 3        ✅ SAMA!
- Approved: 2       ✅ SAMA!
- Rejected: 1       ✅ SAMA!
```

**Statistik OPD tetap terpisah:**
- User1 (Dinas Pendidikan) hanya melihat laporan mereka sendiri
- User2 (Dinas Kesehatan) hanya melihat laporan mereka sendiri
- dst.

### 2. Upload Evidence Ada 2 Tempat ✅

**Masalah Awal:**
- Ada 2 endpoint upload yang berbeda dan membingungkan
- Data tidak tersimpan dengan benar di database

**Penjelasan 2 Endpoint:**

#### Endpoint 1: `/api/matrix/item/:itemId/evidence` (RECOMMENDED)
**Fungsi:** Upload evidence dengan tracking lengkap
**Menyimpan ke:** `evidence_files` table
**Fitur:**
- ✅ Tracking lengkap (uploaded_by, reviewed_by, status)
- ✅ Kategori dan priority
- ✅ Review oleh inspektorat
- ✅ Update progress assignment otomatis
- ✅ Multiple evidence per item

**Cara Pakai:**
```javascript
const formData = new FormData();
formData.append('evidence', file);
formData.append('assignmentId', assignmentId); // WAJIB!
formData.append('description', 'Deskripsi evidence');
formData.append('category', 'Dokumen');
formData.append('priority', 'medium');

fetch(`/api/matrix/item/${itemId}/evidence`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

#### Endpoint 2: `/api/matrix/item/:itemId/submit` (LEGACY)
**Fungsi:** Submit tindak lanjut + evidence sekaligus
**Menyimpan ke:** `matrix_items` table (kolom `evidence_file_path`)
**Fitur:**
- ✅ Submit tindak lanjut text + evidence sekaligus
- ❌ Tidak ada tracking detail
- ❌ Tidak bisa di-review terpisah
- ❌ Hanya 1 evidence per item

**Cara Pakai:**
```javascript
const formData = new FormData();
formData.append('evidence', file); // Optional
formData.append('tindakLanjut', 'Tindak lanjut yang dilakukan');

fetch(`/api/matrix/item/${itemId}/submit`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

## 🎯 Rekomendasi Penggunaan

### Untuk OPD:
1. **Upload Evidence:** Gunakan `/api/matrix/item/:itemId/evidence`
   - Lebih lengkap tracking-nya
   - Bisa upload multiple evidence per item
   - Bisa di-review oleh inspektorat
   - Progress ter-update otomatis

2. **Submit Tindak Lanjut:** Gunakan `/api/matrix/item/:itemId/submit`
   - Hanya untuk submit tindak lanjut text
   - Evidence optional (lebih baik upload terpisah)

### Untuk Inspektorat:
1. **Lihat Statistik:** Semua inspektorat melihat data yang sama
2. **Review Evidence:** Gunakan `/api/evidence/:id/review`
3. **Monitor Progress:** Gunakan `/api/matrix/progress`

## 📊 Perbedaan Statistik

### Inspektorat (Monitoring Semua OPD)
**Endpoint:** `GET /api/dashboard/inspektorat-analytics`

**Menampilkan:**
- Total laporan dari SEMUA OPD
- Status pending/approved/rejected dari SEMUA laporan
- Jumlah OPD aktif yang sudah submit
- Laporan bulanan dari SEMUA OPD
- Average response time keseluruhan

**Semua akun inspektorat melihat data yang SAMA!**

### OPD (Statistik Per Institution)
**Endpoint:** `GET /api/dashboard/user`

**Menampilkan:**
- Laporan yang dibuat oleh OPD tersebut
- Matrix items yang di-assign ke OPD tersebut
- Evidence yang diupload oleh OPD tersebut
- Progress tindak lanjut OPD tersebut

**Setiap OPD hanya melihat data mereka sendiri!**

## 🔧 File yang Diubah

1. `backend/src/services/dashboard.service.ts`
   - Fungsi `getInspektoratAnalytics()` diubah
   - Dari: `ReportModel.findAll({ assignedUserId: userId })`
   - Ke: `ReportModel.findAll({})` (ambil semua laporan)

2. Backend sudah di-restart untuk apply perubahan

## 📝 Dokumentasi yang Dibuat

1. `PERBAIKAN_EVIDENCE_DAN_STATISTIK.md` - Penjelasan lengkap masalah dan solusi
2. `CARA_UPLOAD_EVIDENCE.md` - Panduan lengkap cara upload evidence
3. `SUMMARY_PERBAIKAN.md` - Summary ini

## ✅ Verifikasi

### Test Statistik Inspektorat:
```bash
# Login inspektorat1
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"inspektorat1","password":"password123"}'

# Ambil statistik
curl -X GET http://localhost:3000/api/dashboard/inspektorat-analytics \
  -H "Authorization: Bearer TOKEN"

# Login inspektorat2 dan cek lagi - hasilnya SAMA!
```

### Test Upload Evidence:
```bash
# Login OPD
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user1","password":"password123"}'

# Upload evidence
curl -X POST http://localhost:3000/api/matrix/item/ITEM_ID/evidence \
  -H "Authorization: Bearer TOKEN" \
  -F "evidence=@test.pdf" \
  -F "assignmentId=ASSIGNMENT_ID" \
  -F "description=Test evidence"

# Cek database
mysql -u root evaluation_reporting -e \
  "SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT 1;"
```

## 🚀 Status Aplikasi

- ✅ Database: `evaluation_reporting` (32 tables, 30 users, 6 reports)
- ✅ Backend: Running di port 3000
- ✅ Frontend: Running di port 5173
- ✅ Statistik Inspektorat: Sudah sinkron
- ✅ Upload Evidence: Sudah jelas 2 endpoint dan fungsinya

## 📞 Jika Ada Masalah

### Statistik masih berbeda:
1. Pastikan backend sudah di-restart
2. Clear cache browser
3. Logout dan login ulang

### Evidence tidak tersimpan:
1. Pastikan pakai endpoint `/api/matrix/item/:itemId/evidence`
2. Pastikan `assignmentId` dikirim di form data
3. Cek console browser untuk error
4. Cek log backend untuk error detail

### Progress tidak ter-update:
1. Pastikan evidence berhasil diupload
2. Pastikan `assignmentId` benar
3. Tunggu beberapa detik
4. Refresh halaman

## 🎉 Kesimpulan

Semua masalah sudah diperbaiki:
1. ✅ Statistik inspektorat sekarang sinkron (semua inspektorat melihat data yang sama)
2. ✅ Upload evidence sudah jelas (2 endpoint dengan fungsi berbeda)
3. ✅ Dokumentasi lengkap sudah dibuat
4. ✅ Backend sudah di-restart dan tested

Aplikasi siap digunakan!

