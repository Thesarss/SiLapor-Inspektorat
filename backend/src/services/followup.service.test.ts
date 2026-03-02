import * as fc from 'fast-check';

/**
 * Feature: evaluation-reporting
 * Property 5: Follow-up submission changes status
 * Property 6: Empty follow-up is rejected
 * Validates: Requirements 3.2, 3.4
 */

// Types
type ReportStatus = 'pending' | 'in_progress' | 'approved' | 'rejected';
type FollowUpStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

interface Report {
  id: string;
  status: ReportStatus;
}

interface FollowUp {
  id: string;
  report_id: string;
  content: string;
  status: FollowUpStatus;
}

// Mock store
class MockFollowUpStore {
  private followUps: FollowUp[] = [];
  private reports: Map<string, Report> = new Map();

  addReport(report: Report): void {
    this.reports.set(report.id, report);
  }

  createFollowUp(reportId: string, content: string): { followUp: FollowUp; report: Report } | null {
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Tindak lanjut tidak boleh kosong');
    }

    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const followUp: FollowUp = {
      id: `followup-${Date.now()}-${Math.random()}`,
      report_id: reportId,
      content,
      status: 'pending_approval',
    };

    this.followUps.push(followUp);

    // Update report status
    report.status = 'in_progress';

    return { followUp, report };
  }

  clear(): void {
    this.followUps = [];
    this.reports.clear();
  }
}

// Generators
const reportIdArbitrary = fc.uuid();
const validContentArbitrary = fc.string({ minLength: 1, maxLength: 5000 });
const whitespaceArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\t'),
  fc.constant('\n\n'),
  fc.constant('  \t  \n  ')
);

describe('Follow-Up Properties', () => {
  let store: MockFollowUpStore;

  beforeEach(() => {
    store = new MockFollowUpStore();
  });

  /**
   * Property 5: Follow-up submission changes status
   * For any valid follow-up content, submitting it should change the report status
   * to "in_progress" and follow-up status to "pending_approval".
   */
  it('Property 5: Follow-up submission changes status', () => {
    fc.assert(
      fc.property(reportIdArbitrary, validContentArbitrary, (reportId, content) => {
        // Setup: Create a pending report
        const report: Report = { id: reportId, status: 'pending' };
        store.addReport(report);

        // Submit follow-up
        const result = store.createFollowUp(reportId, content);

        expect(result).not.toBeNull();
        expect(result!.followUp.status).toBe('pending_approval');
        expect(result!.report.status).toBe('in_progress');
        expect(result!.followUp.content).toBe(content);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Empty follow-up is rejected
   * For any string composed entirely of whitespace or empty string,
   * submitting it as follow-up content should be rejected.
   */
  it('Property 6: Empty follow-up is rejected', () => {
    fc.assert(
      fc.property(reportIdArbitrary, whitespaceArbitrary, (reportId, emptyContent) => {
        // Setup: Create a pending report
        const report: Report = { id: reportId, status: 'pending' };
        store.addReport(report);

        // Attempt to submit empty follow-up
        expect(() => {
          store.createFollowUp(reportId, emptyContent);
        }).toThrow('Tindak lanjut tidak boleh kosong');

        // Report status should remain unchanged
        expect(report.status).toBe('pending');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional: Content preservation
   * For any valid content, the stored follow-up should preserve the exact content.
   */
  it('Content is preserved exactly', () => {
    fc.assert(
      fc.property(
        reportIdArbitrary,
        fc.string({ minLength: 1, maxLength: 1000 }),
        (reportId, content) => {
          const report: Report = { id: reportId, status: 'pending' };
          store.addReport(report);

          const result = store.createFollowUp(reportId, content);

          expect(result!.followUp.content).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });
});
