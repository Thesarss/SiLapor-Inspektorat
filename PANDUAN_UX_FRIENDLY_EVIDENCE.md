# Panduan UX Friendly - Satu Form Upload Evidence

## ✅ Perubahan yang Dilakukan

### Sebelumnya (Membingungkan):
- ❌ Ada 2 form upload evidence terpisah
- ❌ Form 1: Submit tindak lanjut + evidence (opsional)
- ❌ Form 2: Upload evidence terpisah (butuh assignmentId manual)
- ❌ User bingung harus pakai yang mana

### Sekarang (UX Friendly):
- ✅ Hanya 1 form: Submit tindak lanjut + evidence sekaligus
- ✅ Evidence otomatis tersimpan ke `evidence_files` table dengan tracking lengkap
- ✅ Tidak perlu assignmentId manual (otomatis terdeteksi)
- ✅ Progress ter-update otomatis
- ✅ Bisa di-review oleh inspektorat

## 🎯 Endpoint Utama (RECOMMENDED)

### POST /api/matrix/item/:itemId/submit

**Fungsi:** Submit tindak lanjut + upload evidence sekaligus

**Form Data:**
- `tindakLanjut` (string) - WAJIB - Tindak lanjut yang dilakukan
- `evidence` (file) - OPSIONAL - File bukti (PDF, JPG, PNG, DOC, DOCX)
- `description` (string) - OPSIONAL - Deskripsi evidence (default: auto dari tindakLanjut)
- `category` (string) - OPSIONAL - Kategori evidence (default: "Dokumen")
- `priority` (string) - OPSIONAL - Priority: low, medium, high (default: "medium")

**Keuntungan:**
- ✅ Tidak perlu assignmentId (otomatis terdeteksi dari itemId + userId)
- ✅ Evidence tersimpan ke `evidence_files` dengan tracking lengkap
- ✅ Progress assignment ter-update otomatis
- ✅ Bisa di-review inspektorat
- ✅ Support multiple evidence per item (upload lagi dengan endpoint yang sama)

## 📝 Contoh Implementasi Frontend

### React/TypeScript Example

```typescript
interface SubmitTindakLanjutData {
  tindakLanjut: string;
  evidence?: File;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

const submitTindakLanjut = async (
  itemId: string, 
  data: SubmitTindakLanjutData
): Promise<{ success: boolean; message: string; data?: any }> => {
  const formData = new FormData();
  
  // Tindak lanjut (WAJIB)
  formData.append('tindakLanjut', data.tindakLanjut);
  
  // Evidence (OPSIONAL)
  if (data.evidence) {
    formData.append('evidence', data.evidence);
    
    // Optional metadata untuk evidence
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.priority) {
      formData.append('priority', data.priority);
    }
  }

  try {
    const response = await fetch(`/api/matrix/item/${itemId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Submit berhasil!');
      console.log('Has evidence:', result.data.hasEvidence);
      console.log('Evidence ID:', result.data.evidenceId);
      return result;
    } else {
      console.error('❌ Submit gagal:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

// Cara pakai:
// 1. Submit tindak lanjut TANPA evidence
await submitTindakLanjut('item-id-123', {
  tindakLanjut: 'Sudah melakukan perbaikan sistem'
});

// 2. Submit tindak lanjut DENGAN evidence
const file = document.getElementById('fileInput').files[0];
await submitTindakLanjut('item-id-123', {
  tindakLanjut: 'Sudah melakukan perbaikan sistem',
  evidence: file,
  description: 'Bukti screenshot sistem yang sudah diperbaiki',
  category: 'Foto/Gambar',
  priority: 'high'
});
```

### Form Component Example

```tsx
import React, { useState } from 'react';

interface TindakLanjutFormProps {
  itemId: string;
  onSuccess: () => void;
}

const TindakLanjutForm: React.FC<TindakLanjutFormProps> = ({ itemId, onSuccess }) => {
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Dokumen');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tindakLanjut.trim()) {
      alert('Tindak lanjut wajib diisi!');
      return;
    }

    setLoading(true);
    
    try {
      await submitTindakLanjut(itemId, {
        tindakLanjut,
        evidence: evidence || undefined,
        description: description || undefined,
        category,
        priority
      });
      
      alert('Tindak lanjut berhasil disubmit!');
      onSuccess();
    } catch (error) {
      alert('Gagal submit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tindak Lanjut (WAJIB) */}
      <div>
        <label className="block font-medium mb-2">
          Tindak Lanjut <span className="text-red-500">*</span>
        </label>
        <textarea
          value={tindakLanjut}
          onChange={(e) => setTindakLanjut(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
          placeholder="Jelaskan tindak lanjut yang sudah dilakukan..."
          required
        />
      </div>

      {/* Evidence (OPSIONAL) */}
      <div>
        <label className="block font-medium mb-2">
          Bukti/Evidence (Opsional)
        </label>
        <input
          type="file"
          onChange={(e) => setEvidence(e.target.files?.[0] || null)}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="w-full"
        />
        <p className="text-sm text-gray-500 mt-1">
          Format: PDF, JPG, PNG, DOC, DOCX. Maksimal 10MB.
        </p>
      </div>

      {/* Metadata Evidence (hanya tampil jika ada file) */}
      {evidence && (
        <>
          <div>
            <label className="block font-medium mb-2">
              Deskripsi Evidence
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Deskripsi singkat tentang evidence..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="Dokumen">Dokumen</option>
                <option value="Foto/Gambar">Foto/Gambar</option>
                <option value="Laporan">Laporan</option>
                <option value="Sertifikat">Sertifikat</option>
                <option value="Data Teknis">Data Teknis</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full border rounded p-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-500 text-white py-3 rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Submitting...' : '✓ Submit Tindak Lanjut'}
      </button>
    </form>
  );
};

export default TindakLanjutForm;
```

## 🔄 Upload Evidence Tambahan

Jika user ingin upload evidence tambahan setelah submit tindak lanjut:

```typescript
// Gunakan endpoint yang sama, tapi hanya kirim evidence
const uploadAdditionalEvidence = async (itemId: string, file: File) => {
  const formData = new FormData();
  
  // Tindak lanjut bisa diisi dengan placeholder jika sudah pernah submit
  formData.append('tindakLanjut', 'Evidence tambahan');
  formData.append('evidence', file);
  formData.append('description', 'Evidence tambahan untuk item ini');

  const response = await fetch(`/api/matrix/item/${itemId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

**ATAU** gunakan endpoint deprecated (masih berfungsi):

```typescript
// Endpoint lama masih bisa dipakai untuk upload evidence tambahan
const uploadAdditionalEvidence = async (itemId: string, file: File) => {
  const formData = new FormData();
  formData.append('evidence', file);
  // assignmentId tidak wajib lagi, akan auto-detect

  const response = await fetch(`/api/matrix/item/${itemId}/evidence`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

## 📊 Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Tindak lanjut dan bukti berhasil disubmit",
  "data": {
    "itemId": "item-id-123",
    "hasEvidence": true,
    "evidenceId": "evidence-id-456",
    "status": "submitted"
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Tindak lanjut wajib diisi"
}
```

## 🎨 UI/UX Recommendations

### 1. Single Form Layout
```
┌─────────────────────────────────────────┐
│ Submit Tindak Lanjut                    │
├─────────────────────────────────────────┤
│                                         │
│ Tindak Lanjut *                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Textarea untuk tindak lanjut]      │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Bukti/Evidence (Opsional)               │
│ ┌─────────────────────────────────────┐ │
│ │ [Choose File] No file chosen        │ │
│ └─────────────────────────────────────┘ │
│ Format: PDF, JPG, PNG, DOC, DOCX       │
│ Maksimal 10MB                           │
│                                         │
│ [Metadata evidence - tampil jika ada]   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   ✓ Submit Tindak Lanjut           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2. Progressive Disclosure
- Metadata evidence (deskripsi, kategori, priority) hanya tampil jika user memilih file
- Ini membuat form lebih simple dan tidak overwhelming

### 3. Clear Feedback
```typescript
// Show loading state
<button disabled={loading}>
  {loading ? 'Submitting...' : '✓ Submit Tindak Lanjut'}
</button>

// Show success message
if (result.success) {
  toast.success(result.message);
  // Redirect atau refresh data
}

// Show error message
if (!result.success) {
  toast.error(result.error);
}
```

### 4. Validation
```typescript
// Client-side validation
const validate = () => {
  if (!tindakLanjut.trim()) {
    return 'Tindak lanjut wajib diisi';
  }
  
  if (evidence && evidence.size > 10 * 1024 * 1024) {
    return 'File maksimal 10MB';
  }
  
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 
                        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (evidence && !allowedTypes.includes(evidence.type)) {
    return 'Format file tidak didukung';
  }
  
  return null;
};
```

## ⚠️ Migration Guide untuk Frontend

### Jika Anda sudah pakai endpoint lama:

**Sebelum:**
```typescript
// Form 1: Submit tindak lanjut
await fetch(`/api/matrix/item/${itemId}/submit`, {
  method: 'POST',
  body: formData // hanya tindakLanjut
});

// Form 2: Upload evidence terpisah
await fetch(`/api/matrix/item/${itemId}/evidence`, {
  method: 'POST',
  body: formData // evidence + assignmentId (WAJIB!)
});
```

**Sesudah:**
```typescript
// Satu form untuk keduanya
await fetch(`/api/matrix/item/${itemId}/submit`, {
  method: 'POST',
  body: formData // tindakLanjut + evidence (opsional)
});
```

### Breaking Changes:
- ❌ Endpoint `/item/:itemId/evidence` masih berfungsi tapi DEPRECATED
- ✅ Gunakan `/item/:itemId/submit` untuk semua submit
- ✅ assignmentId tidak perlu lagi (auto-detect)

## 🚀 Benefits

1. **Lebih Simple** - Hanya 1 form, 1 endpoint
2. **Lebih Cepat** - Submit tindak lanjut + evidence sekaligus
3. **Lebih Aman** - assignmentId auto-detect, tidak perlu manual
4. **Lebih Lengkap** - Evidence tersimpan dengan tracking lengkap
5. **Lebih Fleksibel** - Evidence opsional, bisa upload nanti

## 📝 Catatan Penting

1. **Tindak lanjut WAJIB**, evidence OPSIONAL
2. **assignmentId auto-detect** dari itemId + userId
3. **Evidence tersimpan ke `evidence_files`** dengan tracking lengkap
4. **Progress ter-update otomatis** setelah submit
5. **Bisa upload multiple evidence** dengan submit ulang
6. **Inspektorat bisa review** evidence yang diupload

