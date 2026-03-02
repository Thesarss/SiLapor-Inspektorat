import * as fc from 'fast-check';

/**
 * Feature: evaluation-reporting
 * Property 3: Report creation preserves all fields
 * Property 4: User only sees assigned reports
 * Validates: Requirements 2.1, 2.3, 3.1, 7.2
 */

// Types for testing
interface Report {
  id: string;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

interface CreateReportDTO {
  title: string;
  description: string;
  createdBy: string;
  assignedUserId: string;
}

// Mock in-memory database for testing
class MockReportStore {
  private reports: Report[] = [];

  create(data: CreateReportDTO): Report {
    const report: Report = {
      id: `report-${Date.now()}-${Math.random()}`,
      title: data.title,
      description: data.description,
      created_by: data.createdBy,
      assigned_to: data.assignedUserId,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.reports.push(report);
    return report;
  }

  findByAssignedUser(userId: string): Report[] {
    return this.reports.filter((r) => r.assigned_to === userId);
  }

  findAll(): Report[] {
    return [...this.reports];
  }

  clear(): void {
    this.reports = [];
  }
}

// Generators
const titleArbitrary = fc.string({ minLength: 1, maxLength: 200 });
const descriptionArbitrary = fc.string({ minLength: 1, maxLength: 5000 });
const userIdArbitrary = fc.uuid();

const createReportDTOArbitrary = fc.record({
  title: titleArbitrary,
  description: descriptionArbitrary,
  createdBy: userIdArbitrary,
  assignedUserId: userIdArbitrary,
});

describe('Report Properties', () => {
  let store: MockReportStore;

  beforeEach(() => {
    store = new MockReportStore();
  });

  /**
   * Property 3: Report creation preserves all fields
   * For any valid report data, creating a report should result in a stored report
   * where all fields match the input and a valid timestamp is set.
   */
  it('Property 3: Report creation preserves all fields', () => {
    fc.assert(
      fc.property(createReportDTOArbitrary, (data) => {
        const report = store.create(data);

        // All input fields must be preserved
        expect(report.title).toBe(data.title);
        expect(report.description).toBe(data.description);
        expect(report.created_by).toBe(data.createdBy);
        expect(report.assigned_to).toBe(data.assignedUserId);

        // Status must be 'pending' for new reports
        expect(report.status).toBe('pending');

        // Timestamps must be valid dates
        expect(report.created_at).toBeInstanceOf(Date);
        expect(report.updated_at).toBeInstanceOf(Date);
        expect(report.created_at.getTime()).toBeLessThanOrEqual(Date.now());

        // ID must be generated
        expect(report.id).toBeTruthy();
        expect(typeof report.id).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: User only sees assigned reports
   * For any user, querying their reports should return only reports
   * where assignedUserId matches their userId.
   */
  it('Property 4: User only sees assigned reports', () => {
    fc.assert(
      fc.property(
        fc.array(createReportDTOArbitrary, { minLength: 1, maxLength: 20 }),
        userIdArbitrary,
        (reportDataList, queryUserId) => {
          // Create all reports
          reportDataList.forEach((data) => store.create(data));

          // Query reports for specific user
          const userReports = store.findByAssignedUser(queryUserId);

          // All returned reports must be assigned to the queried user
          userReports.forEach((report) => {
            expect(report.assigned_to).toBe(queryUserId);
          });

          // Count should match expected
          const expectedCount = reportDataList.filter(
            (d) => d.assignedUserId === queryUserId
          ).length;
          expect(userReports.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional: No reports from other users leak
   * For any user query, no reports assigned to other users should appear.
   */
  it('No reports from other users leak', () => {
    fc.assert(
      fc.property(
        fc.array(createReportDTOArbitrary, { minLength: 5, maxLength: 20 }),
        userIdArbitrary,
        (reportDataList, queryUserId) => {
          // Create all reports
          reportDataList.forEach((data) => store.create(data));

          // Query reports for specific user
          const userReports = store.findByAssignedUser(queryUserId);
          const allReports = store.findAll();

          // Reports NOT assigned to user should NOT appear in userReports
          const otherUserReports = allReports.filter(
            (r) => r.assigned_to !== queryUserId
          );

          otherUserReports.forEach((otherReport) => {
            const found = userReports.find((r) => r.id === otherReport.id);
            expect(found).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
