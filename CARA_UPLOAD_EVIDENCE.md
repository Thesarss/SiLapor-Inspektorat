# Cara Upload Evidence - Panduan Lengkap

## 🎯 Untuk OPD: Upload Evidence Matrix Item

### Langkah 1: Dapatkan Assignment ID dan Item ID

Pertama, Anda perlu tahu:
1. **Matrix Item ID** - ID dari item matrix yang akan diupload evidence-nya
2. **Assignment ID** - ID assignment yang diberikan inspektorat ke OPD Anda

Cara mendapatkan Assignment ID:
```javascript
// GET /api/matrix/assignments/my-assignments
// Response akan berisi list assignment dengan ID-nya
```

### Langkah 2: Upload Evidence

**Endpoint:** `POST /api/matrix/item/:itemId/evidence`

**Form Data yang diperlukan:**
- `evidence` (file) - WAJIB - File evidence (PDF, JPG, PNG, DOC, DOCX)
- `assignmentId` (string) - WAJIB - ID assignment dari inspektorat
- `description` (string) - Optional - Deskripsi evidence
- `category` (string) - Optional - Kategori (default: "Dokumen")
- `priority` (string) - Optional - Priority: low, medium, high (default: "medium")

**Contoh Code (JavaScript/React):**
```javascript
const uploadEvidence = async (itemId, assignmentId, file, description) => {
  const formData = new FormData();
  formData.append('evidence', file);
  formData.append('assignmentId', assignmentId); // WAJIB!
  formData.append('description', description || 'Evidence untuk tindak lanjut');
  formData.append('category', 'Dokumen');
  formData.append('priority', 'medium');

  try {
    const response = await fetch(`/api/matrix/item/${itemId}/evidence`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Evidence berhasil diupload!');
      console.log('Evidence ID:', result.data.id);
      return result.data;
    } else {
      console.error('❌ Upload gagal:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

// Cara pakai:
const file = document.getElementById('fileInput').files[0];
await uploadEvidence('item-id-123', 'assignment-id-456', file, 'Bukti pelaksanaan kegiatan');
```

**Contoh Code (cURL):**
```bash
curl -X POST http://localhost:3000/api/matrix/item/ITEM_ID/evidence \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "evidence=@/path/to/file.pdf" \
  -F "assignmentId=ASSIGNMENT_ID" \
  -F "description=Bukti pelaksanaan kegiatan" \
  -F "category=Dokumen" \
  -F "priority=medium"
```

### Langkah 3: Verifikasi Upload

Setelah upload, data akan tersimpan di database `evidence_files`:

```sql
SELECT 
  id,
  matrix_item_id,
  original_filename,
  status,
  uploaded_at,
  uploaded_by
FROM evidence_files
WHERE matrix_item_id = 'ITEM_ID'
ORDER BY uploaded_at DESC;
```

Status evidence:
- `pending` - Baru diupload, belum disubmit
- `submitted` - Sudah disubmit, menunggu review inspektorat
- `approved` - Disetujui inspektorat
- `rejected` - Ditolak inspektorat

### Langkah 4: Cek Progress

Progress assignment akan otomatis ter-update setelah evidence diupload:

```javascript
// GET /api/matrix/assignments/:assignmentId
const response = await fetch(`/api/matrix/assignments/${assignmentId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const assignment = await response.json();
console.log('Progress:', assignment.data.progress_percentage + '%');
console.log('Items with evidence:', assignment.data.items_with_evidence);
console.log('Total items:', assignment.data.total_items);
```

## 🔍 Untuk Inspektorat: Review Evidence

### Langkah 1: Lihat Semua Evidence

**Endpoint:** `GET /api/evidence/search`

```javascript
const response = await fetch('/api/evidence/search?status=submitted', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log('Evidence yang perlu direview:', result.data.evidence);
```

### Langkah 2: Review Evidence

**Endpoint:** `PUT /api/evidence/:id/review`

```javascript
const reviewEvidence = async (evidenceId, status, reviewNotes) => {
  const response = await fetch(`/api/evidence/${evidenceId}/review`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: status, // 'approved' atau 'rejected'
      review_notes: reviewNotes
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Evidence berhasil direview!');
  } else {
    console.error('❌ Review gagal:', result.error);
  }
};

// Cara pakai:
await reviewEvidence('evidence-id-123', 'approved', 'Evidence lengkap dan sesuai');
// atau
await reviewEvidence('evidence-id-456', 'rejected', 'Evidence kurang jelas, mohon upload ulang');
```

### Langkah 3: Download Evidence

**Endpoint:** `GET /api/evidence/:id/download`

```javascript
const downloadEvidence = async (evidenceId) => {
  const response = await fetch(`/api/evidence/${evidenceId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evidence.pdf'; // Nama file akan otomatis dari server
  a.click();
};
```

## ⚠️ Troubleshooting

### Error: "Assignment ID wajib diisi"
**Solusi:** Pastikan Anda mengirim `assignmentId` di form data

### Error: "Matrix item tidak ditemukan atau Anda tidak memiliki akses"
**Solusi:** 
1. Pastikan item ID benar
2. Pastikan assignment ID benar dan di-assign ke user Anda
3. Pastikan Anda login sebagai OPD yang benar

### Error: "File evidence tidak ditemukan"
**Solusi:** Pastikan field name di form adalah `evidence` (bukan `file` atau nama lain)

### Data tidak masuk ke database
**Solusi:**
1. Cek apakah endpoint yang dipakai benar: `/api/matrix/item/:itemId/evidence`
2. Pastikan `assignmentId` dikirim
3. Cek console browser untuk error
4. Cek log backend untuk error detail

### Progress tidak ter-update
**Solusi:**
1. Pastikan evidence berhasil diupload (cek di `evidence_files` table)
2. Pastikan `assignmentId` benar
3. Tunggu beberapa detik, progress di-update async
4. Refresh halaman

## 📊 Monitoring Progress

### Untuk OPD:
```javascript
// Lihat progress assignment Anda
GET /api/matrix/assignments/my-assignments

// Response:
{
  "success": true,
  "data": [
    {
      "id": "assignment-id",
      "matrix_report_id": "report-id",
      "total_items": 10,
      "items_with_evidence": 7,
      "progress_percentage": 70.00,
      "status": "in_progress"
    }
  ]
}
```

### Untuk Inspektorat:
```javascript
// Lihat progress semua OPD
GET /api/matrix/progress

// Response:
{
  "success": true,
  "data": [
    {
      "opd_name": "Dinas Pendidikan",
      "total_items": 10,
      "items_with_evidence": 7,
      "progress_percentage": 70.00,
      "last_activity": "2026-03-12T10:30:00Z"
    }
  ]
}
```

## 📝 Catatan Penting

1. **assignmentId WAJIB** - Tanpa ini, evidence tidak akan tersimpan dengan benar
2. **File size max 10MB** - File lebih besar akan ditolak
3. **Format file yang diperbolehkan:** PDF, JPG, JPEG, PNG, DOC, DOCX
4. **Multiple evidence per item** - Anda bisa upload lebih dari 1 evidence per matrix item
5. **Status otomatis "submitted"** - Evidence langsung berstatus submitted setelah upload
6. **Progress otomatis ter-update** - Tidak perlu manual update progress

## 🚀 Best Practices

1. **Upload evidence segera** setelah tindak lanjut selesai
2. **Beri deskripsi jelas** agar inspektorat mudah review
3. **Gunakan kategori yang sesuai** (Dokumen, Foto, Laporan, dll)
4. **Set priority** sesuai urgensi (high untuk yang urgent)
5. **Cek progress** secara berkala untuk memastikan semua item sudah ada evidence-nya

