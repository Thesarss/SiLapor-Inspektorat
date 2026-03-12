# Perbaikan Evidence Upload dan Statistik Inspektorat

## ✅ Masalah yang Diperbaiki

### 1. Statistik Inspektorat Tidak Sinkron
**Masalah:** Inspektorat1 dan Inspektorat2 melihat statistik yang berbeda

**Penyebab:** Fungsi `getInspektoratAnalytics()` hanya menampilkan laporan yang di-assign ke user inspektorat tertentu

**Solusi:** Diubah agar SEMUA akun inspektorat melihat statistik yang sama (semua laporan dari semua OPD)

**File yang diubah:**
- `backend/src/services/dashboard.service.ts`

**Perubahan:**
```typescript
// SEBELUM (SALAH):
const assignedReports = await ReportModel.findAll({ assignedUserId: userId });

// SESUDAH (BENAR):
const allReports = await ReportModel.findAll({});
```

Sekarang semua inspektorat melihat:
- Total laporan dari SEMUA OPD
- Status pending, approved, rejected dari SEMUA laporan
- Jumlah OPD aktif yang sudah submit laporan
- Laporan bulanan dari SEMUA OPD

### 2. Upload Evidence Ada 2 Tempat dan Data Tidak Tersimpan
**Masalah:** Ada 2 endpoint upload evidence yang berbeda dan membingungkan

**Endpoint yang tersedia:**

#### A. Upload Evidence ke Matrix Item (RECOMMENDED)
**Endpoint:** `POST /api/matrix/item/:itemId/evidence`

**Cara pakai:**
```javascript
const formData = new FormData();
formData.append('evidence', file);
formData.append('assignmentId', assignmentId); // WAJIB!
formData.append('description', 'Deskripsi evidence');
formData.append('category', 'Dokumen');
formData.append('priority', 'medium');

fetch(`/api/matrix/item/${itemId}/evidence`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Menyimpan ke:** `evidence_files` table
**Fitur:**
- ✅ Tracking lengkap (uploaded_by, reviewed_by, status)
- ✅ Kategori dan priority
- ✅ Review oleh inspektorat
- ✅ Update progress assignment otomatis
- ✅ Searchable content

#### B. Submit Tindak Lanjut dengan Evidence (LEGACY)
**Endpoint:** `POST /api/matrix/item/:itemId/submit`

**Cara pakai:**
```javascript
const formData = new FormData();
formData.append('evidence', file); // Optional
formData.append('tindakLanjut', 'Tindak lanjut yang dilakukan');

fetch(`/api/matrix/item/${itemId}/submit`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Menyimpan ke:** `matrix_items` table (kolom `evidence_file_path`, `evidence_filename`)
**Fitur:**
- ✅ Submit tindak lanjut + evidence sekaligus
- ❌ Tidak ada tracking detail
- ❌ Tidak bisa di-review terpisah
- ❌ Tidak ada kategori/priority

## 🎯 Rekomendasi Penggunaan

### Untuk OPD:
1. **Upload Evidence:** Gunakan endpoint `/api/matrix/item/:itemId/evidence`
   - Lebih lengkap tracking-nya
   - Bisa upload multiple evidence per item
   - Bisa di-review oleh inspektorat

2. **Submit Tindak Lanjut:** Gunakan endpoint `/api/matrix/item/:itemId/submit`
   - Hanya untuk submit tindak lanjut text
   - Evidence optional (lebih baik upload terpisah)

### Untuk Inspektorat:
1. **Lihat Statistik:** Semua inspektorat melihat data yang sama
2. **Review Evidence:** Gunakan endpoint `/api/evidence/:id/review`
3. **Monitor Progress:** Gunakan endpoint `/api/matrix/progress`

## 📊 Statistik OPD vs Inspektorat

### Statistik OPD (Per Institution)
**Endpoint:** `GET /api/dashboard/user`

Menampilkan:
- Laporan yang dibuat oleh OPD tersebut
- Matrix items yang di-assign ke OPD tersebut
- Evidence yang diupload oleh OPD tersebut
- Progress tindak lanjut OPD tersebut

### Statistik Inspektorat (Semua OPD)
**Endpoint:** `GET /api/dashboard/inspektorat-analytics`

Menampilkan:
- SEMUA laporan dari SEMUA OPD
- SEMUA matrix items dari SEMUA OPD
- SEMUA evidence dari SEMUA OPD
- Progress keseluruhan sistem

## 🔧 Cara Test

### 1. Test Statistik Inspektorat
```bash
# Login sebagai inspektorat1
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"inspektorat1","password":"password123"}'

# Ambil token dari response, lalu:
curl -X GET http://localhost:3000/api/dashboard/inspektorat-analytics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Login sebagai inspektorat2 dan cek lagi
# Hasilnya harus SAMA!
```

### 2. Test Upload Evidence
```bash
# Login sebagai OPD (user1)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user1","password":"password123"}'

# Upload evidence
curl -X POST http://localhost:3000/api/matrix/item/ITEM_ID/evidence \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "evidence=@test.pdf" \
  -F "assignmentId=ASSIGNMENT_ID" \
  -F "description=Test evidence upload" \
  -F "category=Dokumen"

# Cek di database
mysql -u root evaluation_reporting -e "SELECT * FROM evidence_files ORDER BY uploaded_at DESC LIMIT 1;"
```

## 📝 Catatan Penting

1. **assignmentId WAJIB** saat upload evidence via `/api/matrix/item/:itemId/evidence`
2. Semua inspektorat melihat statistik yang SAMA (monitoring semua OPD)
3. OPD hanya melihat statistik mereka sendiri
4. Evidence disimpan di `evidence_files` table untuk tracking lengkap
5. Progress assignment di-update otomatis saat evidence diupload

## 🚀 Next Steps

1. ✅ Restart backend untuk apply perubahan
2. ✅ Test login inspektorat1 dan inspektorat2 - statistik harus sama
3. ✅ Test upload evidence dari OPD - data harus masuk ke `evidence_files`
4. ✅ Test review evidence dari inspektorat
5. ✅ Verifikasi progress assignment ter-update otomatis

