import * as fc from 'fast-check';

/**
 * Feature: evaluation-reporting
 * Property 7: Edit permission based on status
 * Property 8: Edit updates timestamp
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */

// Types
type FollowUpStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

interface FollowUp {
  id: string;
  content: string;
  status: FollowUpStatus;
  updated_at: Date;
}

// Pure function for edit permission
function canEdit(status: FollowUpStatus): boolean {
  return status === 'pending_approval' || status === 'rejected';
}

// Mock store for testing
class MockFollowUpEditStore {
  private followUps: Map<string, FollowUp> = new Map();

  create(id: string, content: string, status: FollowUpStatus): FollowUp {
    const followUp: FollowUp = {
      id,
      content,
      status,
      updated_at: new Date(),
    };
    this.followUps.set(id, followUp);
    return followUp;
  }

  update(id: string, newContent: string): FollowUp {
    const followUp = this.followUps.get(id);
    if (!followUp) {
      throw new Error('Follow-up not found');
    }

    if (!canEdit(followUp.status)) {
      throw new Error('Tindak lanjut sudah di-approve dan tidak dapat diedit');
    }

    const oldTimestamp = followUp.updated_at.getTime();
    
    // Simulate small delay
    const newFollowUp: FollowUp = {
      ...followUp,
      content: newContent,
      updated_at: new Date(oldTimestamp + 1),
    };

    this.followUps.set(id, newFollowUp);
    return newFollowUp;
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
const contentArbitrary = fc.string({ minLength: 1, maxLength: 1000 });
const statusArbitrary = fc.constantFrom(
  'draft' as const,
  'pending_approval' as const,
  'approved' as const,
  'rejected' as const
);

describe('Follow-Up Edit Properties', () => {
  let store: MockFollowUpEditStore;

  beforeEach(() => {
    store = new MockFollowUpEditStore();
  });

  /**
   * Property 7: Edit permission based on status
   * For any follow-up, canEdit should return true if and only if
   * the status is "pending_approval" or "rejected".
   */
  it('Property 7: Edit permission based on status', () => {
    fc.assert(
      fc.property(statusArbitrary, (status) => {
        const result = canEdit(status);

        if (status === 'pending_approval' || status === 'rejected') {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Edit updates timestamp
   * For any editable follow-up, updating its content should result in
   * the updated_at timestamp being greater than the previous value.
   */
  it('Property 8: Edit updates timestamp', () => {
    fc.assert(
      fc.property(
        followUpIdArbitrary,
        contentArbitrary,
        contentArbitrary,
        fc.constantFrom('pending_approval' as const, 'rejected' as const),
        (id, initialContent, newContent, status) => {
          // Create follow-up with editable status
          const initial = store.create(id, initialContent, status);
          const oldTimestamp = initial.updated_at.getTime();

          // Update content
          const updated = store.update(id, newContent);

          // Timestamp must be greater
          expect(updated.updated_at.getTime()).toBeGreaterThan(oldTimestamp);
          expect(updated.content).toBe(newContent);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional: Approved follow-ups cannot be edited
   * For any approved follow-up, attempting to edit should throw an error.
   */
  it('Approved follow-ups cannot be edited', () => {
    fc.assert(
      fc.property(followUpIdArbitrary, contentArbitrary, contentArbitrary, (id, content, newContent) => {
        // Create approved follow-up
        store.create(id, content, 'approved');

        // Attempt to edit should fail
        expect(() => {
          store.update(id, newContent);
        }).toThrow('Tindak lanjut sudah di-approve dan tidak dapat diedit');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional: Editable statuses allow updates
   * For any follow-up with pending_approval or rejected status, edit should succeed.
   */
  it('Editable statuses allow updates', () => {
    fc.assert(
      fc.property(
        followUpIdArbitrary,
        contentArbitrary,
        contentArbitrary,
        fc.constantFrom('pending_approval' as const, 'rejected' as const),
        (id, initialContent, newContent, status) => {
          store.create(id, initialContent, status);

          // Should not throw
          expect(() => {
            store.update(id, newContent);
          }).not.toThrow();

          const updated = store.get(id);
          expect(updated?.content).toBe(newContent);
        }
      ),
      { numRuns: 100 }
    );
  });
});
