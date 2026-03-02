import * as fc from 'fast-check';

/**
 * Feature: evaluation-reporting
 * Property 9: Approval locks editing
 * Property 10: Rejection requires note
 * Property 11: Rejection allows resubmission
 * Property 12: Admin action records audit trail
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5
 */

// Types
type FollowUpStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

interface FollowUp {
  id: string;
  status: FollowUpStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  admin_notes: string | null;
}

// Pure function for edit permission
function canEdit(status: FollowUpStatus): boolean {
  return status === 'pending_approval' || status === 'rejected';
}

// Mock approval store
class MockApprovalStore {
  private followUps: Map<string, FollowUp> = new Map();

  create(id: string, status: FollowUpStatus = 'pending_approval'): FollowUp {
    const followUp: FollowUp = {
      id,
      status,
      reviewed_by: null,
      reviewed_at: null,
      admin_notes: null,
    };
    this.followUps.set(id, followUp);
    return followUp;
  }

  approve(id: string, adminId: string, notes?: string): FollowUp {
    const followUp = this.followUps.get(id);
    if (!followUp) {
      throw new Error('Follow-up not found');
    }

    if (followUp.status !== 'pending_approval') {
      throw new Error('Follow-up is not pending approval');
    }

    const updated: FollowUp = {
      ...followUp,
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date(),
      admin_notes: notes || null,
    };

    this.followUps.set(id, updated);
    return updated;
  }

  reject(id: string, adminId: string, notes: string): FollowUp {
    if (!notes || notes.trim().length === 0) {
      throw new Error('Catatan penolakan wajib diisi');
    }

    const followUp = this.followUps.get(id);
    if (!followUp) {
      throw new Error('Follow-up not found');
    }

    if (followUp.status !== 'pending_approval') {
      throw new Error('Follow-up is not pending approval');
    }

    const updated: FollowUp = {
      ...followUp,
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date(),
      admin_notes: notes,
    };

    this.followUps.set(id, updated);
    return updated;
  }

  get(id: string): FollowUp | undefined {
    return this.followUps.get(id);
  }

  clear(): void {
    this.followUps.clear();
  }
}

// Generators
const followUpIdArbitrary = fc.uuid();
const adminIdArbitrary = fc.uuid();
const notesArbitrary = fc.string({ minLength: 1, maxLength: 500 });
const emptyNotesArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t'),
  fc.constant('\n')
);

describe('Approval Properties', () => {
  let store: MockApprovalStore;

  beforeEach(() => {
    store = new MockApprovalStore();
  });

  /**
   * Property 9: Approval locks editing
   * For any follow-up that is approved, the status should change to "approved"
   * and subsequent calls to canEdit should return false.
   */
  it('Property 9: Approval locks editing', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, adminIdArbitrary, (id, adminId) => {
        // Create pending follow-up
        store.create(id, 'pending_approval');

        // Approve it
        const approved = store.approve(id, adminId);

        // Status must be approved
        expect(approved.status).toBe('approved');

        // canEdit must return false
        expect(canEdit(approved.status)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Rejection requires note
   * For any rejection attempt without a note (empty or null),
   * the rejection should fail and the follow-up status should remain unchanged.
   */
  it('Property 10: Rejection requires note', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, adminIdArbitrary, emptyNotesArbitrary, (id, adminId, emptyNote) => {
        // Create pending follow-up
        const initial = store.create(id, 'pending_approval');

        // Attempt to reject without note
        expect(() => {
          store.reject(id, adminId, emptyNote);
        }).toThrow('Catatan penolakan wajib diisi');

        // Status should remain unchanged
        const current = store.get(id);
        expect(current?.status).toBe('pending_approval');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Rejection allows resubmission
   * For any rejected follow-up, the user should be able to resubmit
   * (canEdit should return true for rejected status).
   */
  it('Property 11: Rejection allows resubmission', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, adminIdArbitrary, notesArbitrary, (id, adminId, notes) => {
        // Create pending follow-up
        store.create(id, 'pending_approval');

        // Reject it
        const rejected = store.reject(id, adminId, notes);

        // Status must be rejected
        expect(rejected.status).toBe('rejected');

        // canEdit must return true (allows resubmission)
        expect(canEdit(rejected.status)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Admin action records audit trail
   * For any admin action (approve or reject), the follow-up should have
   * reviewed_by set to the admin's userId and reviewed_at set to a valid timestamp.
   */
  it('Property 12: Admin action records audit trail - Approve', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, adminIdArbitrary, fc.option(notesArbitrary), (id, adminId, notes) => {
        store.create(id, 'pending_approval');

        const approved = store.approve(id, adminId, notes || undefined);

        // Audit trail must be recorded
        expect(approved.reviewed_by).toBe(adminId);
        expect(approved.reviewed_at).toBeInstanceOf(Date);
        expect(approved.reviewed_at!.getTime()).toBeLessThanOrEqual(Date.now());

        // Notes should be preserved if provided
        if (notes) {
          expect(approved.admin_notes).toBe(notes);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 12: Admin action records audit trail - Reject', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, adminIdArbitrary, notesArbitrary, (id, adminId, notes) => {
        store.create(id, 'pending_approval');

        const rejected = store.reject(id, adminId, notes);

        // Audit trail must be recorded
        expect(rejected.reviewed_by).toBe(adminId);
        expect(rejected.reviewed_at).toBeInstanceOf(Date);
        expect(rejected.reviewed_at!.getTime()).toBeLessThanOrEqual(Date.now());
        expect(rejected.admin_notes).toBe(notes);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional: Rejection with valid note succeeds
   * For any valid rejection note, rejection should succeed.
   */
  it('Rejection with valid note succeeds', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, adminIdArbitrary, notesArbitrary, (id, adminId, notes) => {
        store.create(id, 'pending_approval');

        // Should not throw
        expect(() => {
          store.reject(id, adminId, notes);
        }).not.toThrow();

        const rejected = store.get(id);
        expect(rejected?.status).toBe('rejected');
        expect(rejected?.admin_notes).toBe(notes);
      }),
      { numRuns: 100 }
    );
  });
});
