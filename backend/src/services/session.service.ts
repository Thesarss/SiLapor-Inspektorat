import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  is_active: boolean;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
}

export interface SessionInfo {
  sessionId: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  lastActivity: Date;
  isActive: boolean;
}

export const SessionService = {
  /**
   * Create a new session for user
   */
  async createSession(
    userId: string, 
    sessionToken: string, 
    deviceInfo: string,
    ipAddress: string,
    userAgent: string,
    expiresInHours: number = 24
  ): Promise<UserSession> {
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Check if user has reached max concurrent sessions
    await this.enforceSessionLimit(userId);

    await query(
      `INSERT INTO user_sessions 
       (id, user_id, session_token, device_info, ip_address, user_agent, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, sessionToken, deviceInfo, ipAddress, userAgent, expiresAt]
    );

    // Update user last login info
    await query(
      `UPDATE users 
       SET last_login_at = NOW(), last_login_ip = ?, login_count = login_count + 1 
       WHERE id = ?`,
      [ipAddress, userId]
    );

    const result = await query<(UserSession & RowDataPacket)[]>(
      'SELECT * FROM user_sessions WHERE id = ?',
      [sessionId]
    );

    return result.rows[0];
  },

  /**
   * Enforce session limit per user
   */
  async enforceSessionLimit(userId: string): Promise<void> {
    // Get user's max concurrent sessions
    const userResult = await query<RowDataPacket[]>(
      'SELECT max_concurrent_sessions FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const maxSessions = userResult.rows[0].max_concurrent_sessions || 2;

    // Get active sessions count
    const sessionResult = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW()',
      [userId]
    );

    const activeSessionCount = sessionResult.rows[0].count;

    // If at limit, deactivate oldest session
    if (activeSessionCount >= maxSessions) {
      await query(
        `UPDATE user_sessions 
         SET is_active = FALSE 
         WHERE user_id = ? AND is_active = TRUE 
         ORDER BY last_activity ASC 
         LIMIT 1`,
        [userId]
      );
    }
  },

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    await query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ? AND is_active = TRUE',
      [sessionToken]
    );
  },

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    const result = await query<(UserSession & RowDataPacket)[]>(
      `SELECT id, device_info, ip_address, location, last_activity, is_active 
       FROM user_sessions 
       WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW() 
       ORDER BY last_activity DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      sessionId: row.id,
      deviceInfo: row.device_info || 'Unknown Device',
      ipAddress: row.ip_address || '',
      location: row.location,
      lastActivity: row.last_activity,
      isActive: row.is_active
    }));
  },

  /**
   * Terminate specific session
   */
  async terminateSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await query(
      'UPDATE user_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    return result.rowCount > 0;
  },

  /**
   * Terminate all user sessions except current
   */
  async terminateOtherSessions(userId: string, currentSessionToken: string): Promise<number> {
    const result = await query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND session_token != ? AND is_active = TRUE',
      [userId, currentSessionToken]
    );

    return result.rowCount;
  },

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string): Promise<UserSession | null> {
    const result = await query<(UserSession & RowDataPacket)[]>(
      `SELECT * FROM user_sessions 
       WHERE session_token = ? AND is_active = TRUE AND expires_at > NOW()`,
      [sessionToken]
    );

    if (result.rows.length === 0) return null;

    // Update last activity
    await this.updateSessionActivity(sessionToken);

    return result.rows[0];
  },

  /**
   * Get session statistics for admin
   */
  async getSessionStatistics(): Promise<{
    totalActiveSessions: number;
    sessionsByRole: { role: string; count: number }[];
    recentLogins: { username: string; last_login_at: Date; ip_address: string }[];
  }> {
    // Total active sessions
    const totalResult = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM user_sessions WHERE is_active = TRUE AND expires_at > NOW()'
    );

    // Sessions by role
    const roleResult = await query<RowDataPacket[]>(
      `SELECT u.role, COUNT(s.id) as count 
       FROM users u 
       LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = TRUE AND s.expires_at > NOW()
       GROUP BY u.role`
    );

    // Recent logins
    const recentResult = await query<RowDataPacket[]>(
      `SELECT username, last_login_at, last_login_ip as ip_address 
       FROM users 
       WHERE last_login_at IS NOT NULL 
       ORDER BY last_login_at DESC 
       LIMIT 10`
    );

    return {
      totalActiveSessions: totalResult.rows[0].count,
      sessionsByRole: roleResult.rows.map(row => ({
        role: row.role,
        count: row.count
      })),
      recentLogins: recentResult.rows.map(row => ({
        username: row.username,
        last_login_at: row.last_login_at,
        ip_address: row.ip_address
      }))
    };
  },

  /**
   * Log user activity
   */
  async logActivity(
    userId: string,
    sessionId: string | null,
    action: string,
    resource?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const activityId = uuidv4();
    
    await query(
      `INSERT INTO user_activity_log 
       (id, user_id, session_id, action, resource, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [activityId, userId, sessionId, action, resource, ipAddress, userAgent]
    );
  },

  /**
   * Get user activity history
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<any[]> {
    const result = await query<RowDataPacket[]>(
      `SELECT action, resource, ip_address, created_at 
       FROM user_activity_log 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    return result.rows;
  },

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Mark expired sessions as inactive
    await query(
      'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE'
    );

    // Delete old inactive sessions (older than 7 days)
    const result = await query(
      'DELETE FROM user_sessions WHERE is_active = FALSE AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    return result.rowCount;
  }
};