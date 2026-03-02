# 📤 Panduan Upload Matrix Audit

## 🎯 Dua Mode Upload

Sistem sekarang memiliki 2 mode upload yang jelas dan berbeda:

### 1️⃣ Mode "Deteksi Otomatis" (Direkomendasikan)

**Kapan menggunakan:**
- File Excel memiliki header yang jelas
- Header menggunakan kata: "Temuan", "Penyebab", "Rekomendasi"
- Ada kolom tambahan (No, Keterangan, dll)

**Cara kerja:**
- Sistem akan mencari header di baris manapun (baris 1, 2, 3, dst)
- Mendeteksi kolom berdasarkan nama header
- Kolom lain akan diabaikan

**Contoh file yang cocok:**
```
| No | Temuan | Penyebab | Rekomendasi | Keterangan |
|----|--------|----------|-------------|------------|
| 1  | ...    | ...      | ...         | ...        |
```

**Tips:**
- ✅ Pastikan ada header: Temuan, Penyebab, Rekomendasi
- ✅ Header bisa di baris manapun
- ✅ Kolom tambahan akan diabaikan
- ✅ Baris kosong akan di-skip

---

### 2️⃣ Mode "Urutan Kolom Sederhana"

**Kapan menggunakan:**
- File Excel tanpa header
- Header menggunakan istilah berbeda (Finding, Cause, Recommendation)
- File sangat sederhana (3 kolom saja)

**Cara kerja:**
- Sistem membaca kolom berurutan: Kolom 1 = Temuan, Kolom 2 = Penyebab, Kolom 3 = Rekomendasi
- Baris pertama dianggap header dan di-skip
- Tidak ada deteksi header

**Contoh file yang cocok:**
```
| Finding | Cause | Recommendation |
|---------|-------|----------------|
| ...     | ...   | ...            |
```

Atau tanpa header:
```
| Temuan 1 | Penyebab 1 | Rekomendasi 1 |
| Temuan 2 | Penyebab 2 | Rekomendasi 2 |
```

**Tips:**
- ✅ Kolom 1 = Temuan, Kolom 2 = Penyebab, Kolom 3 = Rekomendasi
- ✅ Tidak perlu header (baris pertama di-skip)
- ✅ Baris kosong akan di-skip

---

## 🔄 Multiple Recommendations per Temuan

Kedua mode support multiple recommendations untuk 1 temuan:

**Cara:**
1. Tulis temuan di baris pertama
2. Kosongkan kolom temuan di baris berikutnya
3. Isi rekomendasi berbeda di baris berikutnya

**Contoh:**
```
| Temuan | Penyebab | Rekomendasi |
|--------|----------|-------------|
| Temuan A | Penyebab A | Rekomendasi 1 |
|          |            | Rekomendasi 2 |
|          |            | Rekomendasi 3 |
| Temuan B | Penyebab B | Rekomendasi 4 |
```

Sistem akan otomatis menggunakan "Temuan A" untuk rekomendasi 1, 2, dan 3.

---

## ❌ Troubleshooting

### Error: "Tidak dapat mendeteksi kolom Temuan dan Rekomendasi"
**Solusi:**
- Gunakan mode "Urutan Kolom Sederhana"
- Atau pastikan header menggunakan kata "Temuan" dan "Rekomendasi"

### Error: "Kolom Temuan tidak boleh kosong"
**Penyebab:** Ada baris dengan rekomendasi tapi tidak ada temuan sebelumnya
**Solusi:** Pastikan setiap rekomendasi memiliki temuan (atau temuan di baris sebelumnya)

### Error: "Kolom Rekomendasi tidak boleh kosong"
**Penyebab:** Ada baris dengan temuan tapi tidak ada rekomendasi
**Solusi:** Setiap temuan harus memiliki minimal 1 rekomendasi

---

## 📊 Perbandingan Mode

| Fitur | Deteksi Otomatis | Urutan Kolom Sederhana |
|-------|------------------|------------------------|
| Deteksi Header | ✅ Ya | ❌ Tidak |
| Fleksibel Kolom | ✅ Ya | ❌ Tidak (harus 1,2,3) |
| Kolom Tambahan | ✅ Diabaikan | ❌ Tidak support |
| Header Berbeda | ❌ Harus standar | ✅ Tidak masalah |
| Tanpa Header | ❌ Error | ✅ Bisa |

---

## 🚀 Langkah Upload

1. **Pilih Mode Upload**
   - Deteksi Otomatis (jika ada header standar)
   - Urutan Kolom Sederhana (jika tidak ada header atau header berbeda)

2. **Isi Form**
   - Judul Matrix
   - Deskripsi (opsional)
   - Target OPD

3. **Upload File**
   - Drag & drop atau klik untuk pilih file
   - Format: .xlsx atau .xls
   - Maksimal: 10MB

4. **Klik Upload Matrix**
   - Sistem akan memproses file
   - Jika berhasil, matrix akan muncul di daftar
   - Jika error, baca pesan error dan perbaiki file

---

## 💡 Tips Umum

1. **Gunakan template Excel yang konsisten**
2. **Hindari merge cells di area data**
3. **Pastikan tidak ada baris kosong di tengah data**
4. **Gunakan format text untuk semua kolom**
5. **Test dengan file kecil dulu (5-10 baris)**

---

## 📞 Bantuan

Jika masih ada masalah:
1. Cek format file Excel
2. Coba mode upload yang berbeda
3. Lihat pesan error untuk detail
4. Hubungi admin sistem
