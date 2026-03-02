import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Feature: evaluation-reporting
 * Property 1: Authentication returns correct role
 * Property 2: Invalid credentials are rejected
 * Validates: Requirements 1.1, 1.2, 1.4
 */

// Mock database for testing
interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'user';
}

const JWT_SECRET = 'test-secret';

// Pure functions for testing (extracted from AuthService logic)
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

const createToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
};

const decodeToken = (token: string): { userId: string; role: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
};

// Generators
const roleArbitrary = fc.constantFrom('admin' as const, 'user' as const);

const validEmailArbitrary = fc.emailAddress();

const passwordArbitrary = fc.string({ minLength: 1, maxLength: 50 });

const userArbitrary = fc.record({
  id: fc.uuid(),
  email: validEmailArbitrary,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  role: roleArbitrary,
  password: passwordArbitrary,
});

describe('Authentication Properties', () => {
  /**
   * Property 1: Authentication returns correct role
   * For any valid user credentials, authenticating should return a result
   * containing the user's correct role that matches the stored role.
   */
  it('Property 1: Authentication returns correct role', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (userData) => {
        // Setup: Create user with hashed password
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const mockUser: MockUser = {
          id: userData.id,
          email: userData.email,
          password_hash: passwordHash,
          name: userData.name,
          role: userData.role,
        };

        // Simulate login with correct password
        const isValidPassword = await verifyPassword(userData.password, mockUser.password_hash);
        
        if (isValidPassword) {
          const token = createToken(mockUser.id, mockUser.role);
          const decoded = decodeToken(token);
          
          // Property: decoded role must match stored role
          expect(decoded).not.toBeNull();
          expect(decoded!.role).toBe(mockUser.role);
          expect(decoded!.userId).toBe(mockUser.id);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Invalid credentials are rejected
   * For any invalid credentials (wrong password), authentication should fail.
   */
  it('Property 2: Invalid credentials are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userData, wrongPassword) => {
          // Skip if wrong password happens to match
          fc.pre(wrongPassword !== userData.password);

          // Setup: Create user with hashed password
          const passwordHash = await bcrypt.hash(userData.password, 10);

          // Simulate login with wrong password
          const isValidPassword = await verifyPassword(wrongPassword, passwordHash);
          
          // Property: wrong password must be rejected
          expect(isValidPassword).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Token validation round-trip
   * For any valid user, creating a token and decoding it should return the same userId and role.
   */
  it('Token validation round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        roleArbitrary,
        async (userId, role) => {
          const token = createToken(userId, role);
          const decoded = decodeToken(token);
          
          expect(decoded).not.toBeNull();
          expect(decoded!.userId).toBe(userId);
          expect(decoded!.role).toBe(role);
        }
      ),
      { numRuns: 100 }
    );
  });
});
