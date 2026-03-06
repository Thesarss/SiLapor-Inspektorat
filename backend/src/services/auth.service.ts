import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { SessionService } from './session.service';
import { UserModel } from '../models/user.model';
import { AuthResult, User, UserRole } from '../types';

// JWT Configuration with validation
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
}

// Token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

export const AuthService = {
  async login(identifier: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      // Rate limiting check (implement with Redis in production)
      const loginAttempts = await this.getLoginAttempts(identifier);
      if (loginAttempts >= 5) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
        };
      }

      // Support login with username or email
      const user = await UserModel.findByEmailOrUsername(identifier);
      
      if (!user) {
        await this.recordFailedLogin(identifier, ipAddress, userAgent);
        return {
          success: false,
          error: 'Invalid username/email or password',
        };
      }

      // Check if account is active
      if (user.status === 'inactive') {
        return {
          success: false,
          error: 'Account has been deactivated',
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        await this.recordFailedLogin(identifier, ipAddress, userAgent);
        return {
          success: false,
          error: 'Invalid username/email or password',
        };
      }

      // Generate secure tokens
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.role);
      
      // Store refresh token
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
      refreshTokens.set(refreshToken, {
        userId: user.id,
        expiresAt: refreshTokenExpiry
      });

      // Clear failed login attempts
      await this.clearFailedLogins(identifier);

      // Log successful login
      await this.recordSuccessfulLogin(user.id, ipAddress, userAgent);

      const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        token: accessToken,
        refreshToken,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Check if refresh token exists and is valid
      const tokenData = refreshTokens.get(refreshToken);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        refreshTokens.delete(refreshToken);
        return null;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET as string, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER || 'silapor-api',
        audience: process.env.JWT_AUDIENCE || 'silapor-client',
      }) as any;

      // Check if user still exists
      const user = await UserModel.findById(decoded.userId);
      if (!user || user.status === 'inactive') {
        refreshTokens.delete(refreshToken);
        return null;
      }

      // Generate new tokens
      const newTokens = this.generateTokens(user.id, user.role);
      
      // Remove old refresh token and store new one
      refreshTokens.delete(refreshToken);
      const newRefreshTokenExpiry = new Date();
      newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7);
      refreshTokens.set(newTokens.refreshToken, {
        userId: user.id,
        expiresAt: newRefreshTokenExpiry
      });

      return newTokens;
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  },

  async logout(token: string, refreshToken?: string): Promise<void> {
    // Blacklist access token
    if (token) {
      tokenBlacklist.add(token);
    }

    // Remove refresh token
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }
  },

  async validateToken(token: string): Promise<User | null> {
    try {
      // Check if token is blacklisted
      if (tokenBlacklist.has(token)) {
        return null;
      }

      const decoded = jwt.verify(token, JWT_SECRET as string, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER || 'silapor-api',
        audience: process.env.JWT_AUDIENCE || 'silapor-client',
      }) as { userId: string; role: string; iat: number };
      
      const user = await UserModel.findById(decoded.userId);
      
      if (!user || user.status === 'inactive') {
        return null;
      }

      // Check if password was changed after token was issued
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      if (user.password_changed_at && user.password_changed_at > tokenIssuedAt) {
        return null;
      }

      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      return null;
    }
  },

  generateTokens(userId: string, role: string): { accessToken: string; refreshToken: string } {
    const payload = {
      userId,
      role,
      jti: crypto.randomUUID(), // Unique token ID
    };

    // Use type assertion to bypass TypeScript issues with jwt library
    const accessToken = jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: process.env.JWT_ISSUER || 'silapor-api',
      audience: process.env.JWT_AUDIENCE || 'silapor-client',
    } as any);

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as string, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: process.env.JWT_ISSUER || 'silapor-api',
      audience: process.env.JWT_AUDIENCE || 'silapor-client',
    } as any);

    return { accessToken, refreshToken };
  },

  async hashPassword(password: string): Promise<string> {
    // Use higher cost factor for better security
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  },

  async validatePasswordStrength(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'admin', 'user', 'test'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password contains common words');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Login attempt tracking (implement with Redis in production)
  async getLoginAttempts(identifier: string): Promise<number> {
    // Simplified implementation - use Redis in production
    return 0;
  },

  async recordFailedLogin(identifier: string, ipAddress?: string, userAgent?: string): Promise<void> {
    console.warn(`[SECURITY] Failed login attempt for ${identifier} from ${ipAddress} - ${userAgent}`);
    // Implement proper logging and rate limiting
  },

  async clearFailedLogins(identifier: string): Promise<void> {
    // Clear failed login attempts
  },

  async recordSuccessfulLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    console.log(`[AUTH] Successful login for user ${userId} from ${ipAddress}`);
    // Update last login timestamp
  },

  // User management methods (existing)
  async getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
    const users = await UserModel.findAll();
    return users.map(({ password_hash, ...user }) => user);
  },

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    institution?: string;
  }): Promise<Omit<User, 'password_hash'>> {
    // Validate password strength
    const passwordValidation = await this.validatePasswordStrength(userData.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if username already exists
    const existingUsername = await UserModel.checkUsernameExists(userData.username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await UserModel.checkEmailExists(userData.email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const passwordHash = await this.hashPassword(userData.password);
    
    const user = await UserModel.create({
      username: userData.username,
      email: userData.email,
      passwordHash,
      name: userData.name,
      role: userData.role,
      institution: userData.institution
    });

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateUser(id: string, userData: {
    username?: string;
    email?: string;
    name?: string;
    institution?: string;
  }): Promise<Omit<User, 'password_hash'> | null> {
    // Check if username already exists (if updating username)
    if (userData.username) {
      const existingUser = await UserModel.findByUsername(userData.username);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Username already exists');
      }
    }

    // Check if email already exists (if updating email)
    if (userData.email) {
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already exists');
      }
    }

    const user = await UserModel.updateUser(id, userData);
    if (!user) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password strength
      const passwordValidation = await this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);
      
      // Update password and set password_changed_at
      await UserModel.updatePassword(userId, newPasswordHash);

      // Invalidate all existing tokens for this user
      this.invalidateUserTokens(userId);

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  },

  invalidateUserTokens(userId: string): void {
    // Remove all refresh tokens for this user
    for (const [token, data] of refreshTokens.entries()) {
      if (data.userId === userId) {
        refreshTokens.delete(token);
      }
    }
    // Note: Access tokens will be invalidated by password_changed_at check
  },

  async deleteUser(id: string): Promise<boolean> {
    // Invalidate all tokens for this user
    this.invalidateUserTokens(id);
    return UserModel.deleteUser(id);
  },

  // Cleanup expired tokens (run periodically)
  cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of refreshTokens.entries()) {
      if (data.expiresAt < now) {
        refreshTokens.delete(token);
      }
    }

    // Clean up blacklisted tokens (simplified - use proper TTL in production)
    if (tokenBlacklist.size > 10000) {
      tokenBlacklist.clear();
    }
  },

  // Additional methods for bulk user operations
  async register(userData: {
    username: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    institution?: string;
  }): Promise<Omit<User, 'password_hash'>> {
    return this.createUser(userData);
  },

  async getUserById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await UserModel.findById(id);
    if (!user) return null;
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = await this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(userId, hashedPassword);
  },

  async getInstitutionSummary(): Promise<any[]> {
    const institutions = await UserModel.getInstitutions();
    const summary = [];

    for (const institution of institutions) {
      const users = await UserModel.findAll();
      const institutionUsers = users.filter(u => u.institution === institution);
      
      summary.push({
        name: institution,
        userCount: institutionUsers.length,
        roles: {
          super_admin: institutionUsers.filter(u => u.role === 'super_admin').length,
          inspektorat: institutionUsers.filter(u => u.role === 'inspektorat').length,
          opd: institutionUsers.filter(u => u.role === 'opd').length
        }
      });
    }

    return summary;
  },

  async getInstitutions(): Promise<string[]> {
    return UserModel.getInstitutions();
  }
};