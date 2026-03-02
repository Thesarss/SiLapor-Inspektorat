# Format Excel untuk Matrix Temuan Audit

## 📋 Struktur File Excel

File Excel yang diupload harus memiliki format sebagai berikut:

### Kolom yang Diperlukan:

| Kolom | Nama Field | Deskripsi | Wajib |
|-------|-----------|-----------|-------|
| A (Kolom 1) | **Temuan** | Deskripsi temuan audit | ✅ Ya |
| B (Kolom 2) | **Penyebab** | Penyebab dari temuan | ✅ Ya |
| C (Kolom 3) | **Rekomendasi** | Rekomendasi tindak lanjut | ✅ Ya |

---

## 📝 Contoh Format Excel

### Baris 1 (Header - Opsional):
```
| Temuan | Penyebab | Rekomendasi |
```

### Baris 2 dan seterusnya (Data):
```
| Temuan                                    | Penyebab                              | Rekomendasi                           |
|-------------------------------------------|---------------------------------------|---------------------------------------|
| Keterlambatan pelaporan keuangan Q1 2024 | Kurangnya koordinasi antar divisi     | Membuat sistem reminder otomatis      |
| Dokumen tidak lengkap pada arsip         | Belum ada SOP pengarsipan yang jelas  | Menyusun SOP pengarsipan dokumen      |
| Anggaran tidak sesuai realisasi          | Perencanaan kurang detail             | Melakukan review anggaran berkala     |
```

---

## ✅ Aturan Format

1. **Baris Header**: 
   - Baris pertama akan diabaikan (dianggap sebagai header)
   - Mulai membaca data dari baris ke-2

2. **Minimal Kolom**: 
   - File harus memiliki minimal 3 kolom (A, B, C)
   - Kolom tambahan akan diabaikan

3. **Baris Kosong**: 
   - Baris yang tidak memiliki data di ketiga kolom akan diabaikan
   - Sistem hanya memproses baris yang lengkap

4. **Format File**:
   - Ekstensi: `.xlsx` atau `.xls`
   - Ukuran maksimal: 10 MB
   - Sheet: Hanya sheet pertama yang akan dibaca

---

## 🎯 Contoh Template Excel

### Template Sederhana:

```excel
Sheet1:
┌─────────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│ Temuan                              │ Penyebab                        │ Rekomendasi                     │
├─────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────────┤
│ Keterlambatan pelaporan             │ Kurang koordinasi               │ Buat sistem reminder            │
│ Dokumen tidak lengkap               │ Belum ada SOP                   │ Susun SOP pengarsipan           │
│ Anggaran tidak sesuai               │ Perencanaan kurang detail       │ Review anggaran berkala         │
└─────────────────────────────────────┴─────────────────────────────────┴─────────────────────────────────┘
```

---

## 🚀 Cara Upload

1. **Login sebagai Inspektorat**
2. **Buka halaman Matrix** (menu Matrix)
3. **Klik tombol "Upload Matrix Excel"**
4. **Isi form upload**:
   - Judul Matrix: Nama/judul untuk matrix ini
   - Deskripsi: Penjelasan singkat (opsional)
   - Target OPD: Pilih institusi OPD yang akan ditugaskan
   - File Excel: Pilih file Excel dengan format yang sesuai
5. **Klik "Upload Matrix"**
6. **Sistem akan**:
   - Membaca dan memvalidasi file Excel
   - Membuat laporan matrix baru
   - Membuat item untuk setiap baris temuan
   - Menugaskan ke semua user OPD dari institusi target
   - Menampilkan pesan sukses dengan jumlah item

---

## ⚠️ Catatan Penting

1. **Validasi Data**:
   - Pastikan semua kolom terisi dengan lengkap
   - Hindari baris kosong di tengah data
   - Gunakan teks yang jelas dan deskriptif

2. **Ukuran File**:
   - Maksimal 10 MB per file
   - Jika file terlalu besar, pertimbangkan untuk membagi menjadi beberapa file

3. **Encoding**:
   - Gunakan encoding UTF-8 untuk karakter Indonesia
   - Hindari karakter khusus yang tidak standar

4. **Backup**:
   - Simpan file Excel asli sebagai backup
   - File yang diupload akan disimpan di server

---

## 📞 Troubleshooting

### Error: "File Excel tidak berisi data yang valid"
- **Penyebab**: File tidak memiliki minimal 3 kolom atau semua baris kosong
- **Solusi**: Pastikan file memiliki kolom Temuan, Penyebab, dan Rekomendasi dengan data

### Error: "Hanya file Excel (.xlsx, .xls) yang diperbolehkan"
- **Penyebab**: Format file bukan Excel
- **Solusi**: Simpan file dalam format .xlsx atau .xls

### Error: "File terlalu besar"
- **Penyebab**: Ukuran file melebihi 10 MB
- **Solusi**: Kurangi jumlah baris atau kompres file

---

## 📊 Setelah Upload

Setelah berhasil upload, sistem akan:

1. ✅ Membuat laporan matrix baru
2. ✅ Membuat item temuan untuk setiap baris
3. ✅ Menugaskan ke user OPD yang sesuai
4. ✅ Mengirim notifikasi ke OPD (jika fitur notifikasi aktif)
5. ✅ Menampilkan di dashboard Inspektorat

OPD dapat:
- 📋 Melihat temuan yang ditugaskan
- 📝 Mengisi tindak lanjut untuk setiap item
- 📎 Upload bukti/evidence
- 🔄 Submit untuk review Inspektorat

---

**Dibuat**: 19 Februari 2026  
**Versi**: 1.0


---

## 🔄 Multiple Recommendations per Temuan (NEW!)

Sistem sekarang mendukung **multiple recommendations** untuk satu temuan!

### Cara Penggunaan:

**Contoh Excel:**
```
| Temuan                              | Penyebab                    | Rekomendasi                        |
|-------------------------------------|-----------------------------|------------------------------------|
| Belum ada koordinasi antar divisi   | Kurang komunikasi internal  | 1. Membuat SOP koordinasi          |
|                                     |                             | 2. Mengadakan rapat rutin bulanan  |
|                                     |                             | 3. Membentuk tim koordinasi        |
```

### Penjelasan:
- **Row 1:** Isi temuan, penyebab, dan rekomendasi pertama
- **Row 2-3:** **Kosongkan kolom Temuan dan Penyebab**, isi hanya Rekomendasi
- Sistem akan otomatis menggunakan temuan dan penyebab dari row sebelumnya

### Hasil yang Dihasilkan:
- ✅ 3 matrix items dengan temuan yang sama
- ✅ Masing-masing punya rekomendasi berbeda
- ✅ Penyebab sama untuk semua rekomendasi

### Contoh Nyata dari Screenshot:

```
Row 7:
- Temuan: "Belum terdapat pejabat yang ditunjuk secara resmi..."
- Penyebab: "Kurangnya koordinasi, pemahaman dan evaluasi..."
- Rekomendasi: "Mengevaluasi memorandum ADN..."

Row 9: (Row 8 kosong, di-skip)
- Temuan: (KOSONG - gunakan dari row 7)
- Penyebab: (KOSONG - gunakan dari row 7)
- Rekomendasi: "Membantu tegoran tertulis kepada Dinas..."

Hasil: 2 matrix items dengan temuan sama, rekomendasi berbeda
```

---

## 📌 Catatan Penting

### Nomor sebagai ID
**Penting:** Jika ada kolom nomor di awal (sebelum Temuan), nomor tersebut hanya sebagai ID/referensi.
- Sistem fokus pada **teks/konten**, bukan nomor
- Nomor tidak mempengaruhi parsing
- Yang penting adalah isi dari kolom Temuan, Penyebab, dan Rekomendasi

### Tips:
1. Gunakan fitur multiple recommendations untuk temuan yang memiliki beberapa rekomendasi
2. Pastikan rekomendasi pertama ada di row yang sama dengan temuan
3. Rekomendasi berikutnya bisa di row terpisah dengan temuan kosong
4. Sistem akan otomatis mendeteksi dan menggabungkan

---

## ⚠️ Error yang Mungkin Terjadi

1. **"Kolom Temuan tidak boleh kosong"**
   - Terjadi jika row pertama dari suatu temuan tidak memiliki teks temuan
   - Solusi: Pastikan temuan diisi di row pertama

2. **"Kolom Rekomendasi tidak boleh kosong"**
   - Terjadi jika ada row dengan temuan tapi tidak ada rekomendasi
   - Solusi: Isi rekomendasi untuk setiap row

3. **"Menggunakan temuan dari baris sebelumnya"**
   - Ini adalah WARNING, bukan error
   - Menandakan sistem berhasil mendeteksi multiple recommendations
   - Tidak perlu diperbaiki, ini adalah fitur yang bekerja dengan benar
