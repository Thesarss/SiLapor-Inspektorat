import * as fc from 'fast-check';

/**
 * Feature: evaluation-reporting
 * Property 13: File validation accepts only valid PDFs
 * Property 14: Uploaded files have unique names
 * Property 15: Files are associated with follow-up
 * Validates: Requirements 6.1, 6.2, 6.3
 */

// Types
interface FileUpload {
  originalname: string;
  mimetype: string;
  size: number;
}

interface EvidenceFile {
  id: string;
  follow_up_id: string;
  original_name: string;
  stored_name: string;
  file_size: number;
}

// Constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Pure validation function
function validateFile(file: FileUpload): { valid: boolean; error?: string } {
  if (file.mimetype !== 'application/pdf') {
    return { valid: false, error: 'Hanya file PDF yang diperbolehkan' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Ukuran file maksimal 100MB' };
  }

  return { valid: true };
}

// Mock file store
class MockFileStore {
  private files: EvidenceFile[] = [];
  private usedNames: Set<string> = new Set();

  upload(followUpId: string, file: FileUpload): EvidenceFile {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique stored name
    let storedName: string;
    do {
      storedName = `${Date.now()}-${Math.random()}.pdf`;
    } while (this.usedNames.has(storedName));

    this.usedNames.add(storedName);

    const evidenceFile: EvidenceFile = {
      id: `file-${Date.now()}-${Math.random()}`,
      follow_up_id: followUpId,
      original_name: file.originalname,
      stored_name: storedName,
      file_size: file.size,
    };

    this.files.push(evidenceFile);
    return evidenceFile;
  }

  findByFollowUpId(followUpId: string): EvidenceFile[] {
    return this.files.filter((f) => f.follow_up_id === followUpId);
  }

  getAllStoredNames(): string[] {
    return this.files.map((f) => f.stored_name);
  }

  clear(): void {
    this.files = [];
    this.usedNames.clear();
  }
}

// Generators
const followUpIdArbitrary = fc.uuid();
const filenameArbitrary = fc.string({ minLength: 1, maxLength: 100 }).map((s) => `${s}.pdf`);
const validPdfArbitrary = fc.record({
  originalname: filenameArbitrary,
  mimetype: fc.constant('application/pdf'),
  size: fc.integer({ min: 1, max: MAX_FILE_SIZE }),
});

const invalidMimetypeArbitrary = fc.record({
  originalname: fc.string({ minLength: 1, maxLength: 100 }),
  mimetype: fc.constantFrom('image/jpeg', 'text/plain', 'application/zip', 'video/mp4'),
  size: fc.integer({ min: 1, max: MAX_FILE_SIZE }),
});

const oversizedFileArbitrary = fc.record({
  originalname: filenameArbitrary,
  mimetype: fc.constant('application/pdf'),
  size: fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 2 }),
});

describe('File Upload Properties', () => {
  let store: MockFileStore;

  beforeEach(() => {
    store = new MockFileStore();
  });

  /**
   * Property 13: File validation accepts only valid PDFs
   * For any file upload, the validation should pass if and only if
   * the file has PDF mime type and size is less than or equal to 100MB.
   */
  it('Property 13: Valid PDFs are accepted', () => {
    fc.assert(
      fc.property(validPdfArbitrary, (file) => {
        const result = validateFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13: Non-PDF files are rejected', () => {
    fc.assert(
      fc.property(invalidMimetypeArbitrary, (file) => {
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Hanya file PDF yang diperbolehkan');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13: Oversized files are rejected', () => {
    fc.assert(
      fc.property(oversizedFileArbitrary, (file) => {
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Ukuran file maksimal 100MB');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Uploaded files have unique names
   * For any two file uploads (even with same original filename),
   * the stored filenames should be different.
   */
  it('Property 14: Uploaded files have unique names', () => {
    fc.assert(
      fc.property(
        followUpIdArbitrary,
        fc.array(validPdfArbitrary, { minLength: 2, maxLength: 20 }),
        (followUpId, files) => {
          // Upload all files
          files.forEach((file) => store.upload(followUpId, file));

          // Get all stored names
          const storedNames = store.getAllStoredNames();

          // All stored names must be unique
          const uniqueNames = new Set(storedNames);
          expect(uniqueNames.size).toBe(storedNames.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Files are associated with follow-up
   * For any uploaded file, querying files by follow-up ID
   * should include that file in the results.
   */
  it('Property 15: Files are associated with follow-up', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, validPdfArbitrary, (followUpId, file) => {
        // Upload file
        const uploaded = store.upload(followUpId, file);

        // Query files by follow-up ID
        const files = store.findByFollowUpId(followUpId);

        // Uploaded file must be in results
        const found = files.find((f) => f.id === uploaded.id);
        expect(found).toBeDefined();
        expect(found?.follow_up_id).toBe(followUpId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional: Multiple files for same follow-up
   * For any follow-up with multiple files, all files should be retrievable.
   */
  it('Multiple files for same follow-up are all retrievable', () => {
    fc.assert(
      fc.property(
        followUpIdArbitrary,
        fc.array(validPdfArbitrary, { minLength: 1, maxLength: 10 }),
        (followUpId, files) => {
          // Upload all files
          const uploaded = files.map((file) => store.upload(followUpId, file));

          // Query files
          const retrieved = store.findByFollowUpId(followUpId);

          // Count must match
          expect(retrieved.length).toBe(uploaded.length);

          // All uploaded files must be present
          uploaded.forEach((up) => {
            const found = retrieved.find((r) => r.id === up.id);
            expect(found).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
