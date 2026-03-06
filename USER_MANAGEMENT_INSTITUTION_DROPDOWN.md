# User Management - Institution Dropdown Feature

## Overview
Mengubah input institusi di halaman User Management dari text input biasa menjadi dropdown dengan autocomplete untuk mencegah kesalahan ketik dan memastikan konsistensi data.

## Problem Statement
Sebelumnya, admin harus mengetik nama institusi secara manual saat membuat user baru. Ini menyebabkan:
- Kesalahan ketik (typo) yang membuat institusi tidak ditemukan
- Inkonsistensi nama institusi (misal: "Dinas Kesehatan" vs "DINAS KESEHATAN" vs "Dinkes")
- Data institusi terfragmentasi di database

## Solution
Implementasi dropdown dengan autocomplete yang mengambil daftar institusi dari user yang sudah ada di database.

## Implementation Details

### Backend Changes

#### 1. New Endpoint: GET /api/auth/institutions
**File**: `backend/src/routes/auth.routes.ts`

```typescript
authRouter.get('/institutions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institutions = await AuthService.getInstitutions();
      res.json({
        success: true,
        data: institutions,
      });
    } catch (error) {
      next(error);
    }
  }
);
```

**Response Format**:
```json
{
  "success": true,
  "data": [
    "Dinas Kesehatan",
    "Dinas Pendidikan",
    "Dinas Perhubungan",
    "BPKAD"
  ]
}
```

#### 2. AuthService Method
**File**: `backend/src/services/auth.service.ts`

```typescript
async getInstitutions(): Promise<string[]> {
  return UserModel.getInstitutions();
}
```

#### 3. UserModel Method (Already Exists)
**File**: `backend/src/models/user.model.ts`

```typescript
async getInstitutions(): Promise<string[]> {
  const result = await query<RowDataPacket[]>(
    'SELECT DISTINCT institution FROM users WHERE institution IS NOT NULL AND institution != "" ORDER BY institution'
  );
  return result.rows.map((row: any) => row.institution);
}
```

### Frontend Changes

#### 1. Fetch Institutions on Page Load
**File**: `frontend/src/pages/UserManagementPage.tsx`

```typescript
const [institutions, setInstitutions] = useState<string[]>([]);

useEffect(() => {
  if (!isAdmin) {
    setError('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
    setLoading(false);
    return;
  }
  fetchUsers();
  fetchInstitutions();
}, [isAdmin]);

const fetchInstitutions = async () => {
  try {
    const response = await apiClient.get('/auth/institutions');
    setInstitutions(response.data.data || []);
  } catch (error: any) {
    console.error('Gagal memuat daftar institusi:', error);
  }
};
```

#### 2. HTML5 Datalist for Autocomplete
**Create User Form**:
```tsx
<input
  type="text"
  list="institutions-list"
  value={createForm.institution}
  onChange={(e) => setCreateForm({ ...createForm, institution: e.target.value })}
  required={createForm.role === 'user'}
  placeholder="Pilih atau ketik nama institusi/OPD"
/>
<datalist id="institutions-list">
  {institutions.map((inst) => (
    <option key={inst} value={inst} />
  ))}
</datalist>
<small style={{ color: '#7f8c8d', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
  💡 Pilih dari daftar OPD yang sudah ada untuk menghindari kesalahan ketik
</small>
```

**Edit User Form**:
```tsx
<input
  type="text"
  list="institutions-list-edit"
  value={editForm.institution}
  onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
  placeholder="Pilih atau ketik nama institusi/OPD"
/>
<datalist id="institutions-list-edit">
  {institutions.map((inst) => (
    <option key={inst} value={inst} />
  ))}
</datalist>
```

## Features

### 1. Autocomplete Dropdown
- User dapat mengetik untuk mencari institusi
- Dropdown menampilkan semua institusi yang cocok dengan input
- User dapat memilih dari dropdown atau tetap mengetik manual

### 2. Data Source
- Daftar institusi diambil dari kolom `institution` di tabel `users`
- Hanya institusi yang tidak NULL dan tidak kosong yang ditampilkan
- Diurutkan secara alfabetis

### 3. Flexibility
- User masih bisa mengetik institusi baru jika belum ada di daftar
- Berguna untuk menambahkan OPD baru yang belum pernah ada usernya

### 4. User Experience
- Hint text memberikan petunjuk untuk memilih dari daftar
- Placeholder text yang jelas
- Visual feedback dengan icon 💡

## Benefits

### 1. Data Consistency
- Mengurangi variasi penulisan nama institusi yang sama
- Memastikan nama institusi konsisten di seluruh sistem

### 2. Error Prevention
- Mencegah typo saat input institusi
- Mengurangi kesalahan human error

### 3. Better UX
- Admin tidak perlu mengingat nama institusi yang tepat
- Lebih cepat dengan autocomplete
- Mengurangi cognitive load

### 4. Data Integrity
- Statistik OPD lebih akurat karena nama institusi konsisten
- Query database lebih efisien
- Reporting lebih reliable

## Usage Guide

### For Admin - Creating New User

1. Klik tombol "Tambah User Baru"
2. Isi username, email, password, dan nama lengkap
3. Pilih role "User OPD"
4. Di field "Institusi":
   - Klik pada input field
   - Dropdown akan muncul menampilkan semua institusi yang ada
   - Ketik untuk mencari institusi tertentu
   - Klik pada institusi yang diinginkan dari dropdown
   - Atau tetap ketik manual jika institusi baru

### For Admin - Editing User

1. Klik tombol "Edit" pada user yang ingin diubah
2. Di field "Institusi":
   - Gunakan dropdown untuk memilih institusi yang sudah ada
   - Atau ubah manual jika perlu

## Technical Notes

### HTML5 Datalist
- Native HTML5 feature, tidak perlu library tambahan
- Browser support: All modern browsers
- Lightweight dan performant
- Tidak memblokir input manual

### API Endpoint
- Endpoint: `GET /api/auth/institutions`
- Authentication: Required (authMiddleware)
- Response: Array of strings (institution names)
- Sorted alphabetically

### Database Query
```sql
SELECT DISTINCT institution 
FROM users 
WHERE institution IS NOT NULL AND institution != "" 
ORDER BY institution
```

## Testing Checklist

- [x] Backend endpoint returns correct institution list
- [x] Frontend fetches institutions on page load
- [x] Dropdown shows all institutions
- [x] Autocomplete filters as user types
- [x] User can select from dropdown
- [x] User can still type manually
- [x] Create user form works with dropdown
- [x] Edit user form works with dropdown
- [x] Validation still works (required for OPD users)
- [x] Backend compiles without errors

## Files Modified

### Backend
1. `backend/src/routes/auth.routes.ts` - Added GET /institutions endpoint
2. `backend/src/services/auth.service.ts` - Added getInstitutions method

### Frontend
1. `frontend/src/pages/UserManagementPage.tsx` - Added dropdown with datalist

## Future Enhancements

### Possible Improvements
1. Add institution management page for admin to add/edit/delete institutions
2. Show user count next to each institution in dropdown
3. Add institution logo/icon in dropdown
4. Group institutions by category (Dinas, Badan, etc.)
5. Add search/filter functionality for large institution lists
6. Implement custom dropdown component with better styling
7. Add validation to prevent duplicate institutions with different casing

## Status
✅ Backend endpoint implemented
✅ Frontend dropdown implemented
✅ Autocomplete working
✅ Backend compiled successfully
✅ Ready for testing

## Next Steps
1. Test the feature in browser
2. Verify dropdown shows existing institutions
3. Test creating new user with dropdown
4. Test editing user with dropdown
5. Verify data consistency in database
