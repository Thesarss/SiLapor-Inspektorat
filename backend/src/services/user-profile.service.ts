import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export const UserProfileService = {
  async getProfile(userId: string) {
    const { query } = await import('../config/database');
    
    try {
      console.log('Getting profile for userId:', userId);
      
      const result = await query(
        `SELECT id, username, email, name, institution, role, department, position, 
                profile_photo, profile_photo_filename, created_at, updated_at, last_login_at
         FROM users 
         WHERE id = ?`,
        [userId]
      );

      console.log('Query result:', result);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in getProfile:', error);
      throw error;
    }
  },

  async updateProfile(userId: string, data: {
    name?: string;
    email?: string;
    department?: string;
    position?: string;
  }) {
    const { query } = await import('../config/database');
    
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined && data.name !== null) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.email !== undefined && data.email !== null) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.department !== undefined && data.department !== null) {
      updates.push('department = ?');
      values.push(data.department === '' ? null : data.department);
    }
    if (data.position !== undefined && data.position !== null) {
      updates.push('position = ?');
      values.push(data.position === '' ? null : data.position);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getProfile(userId);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const { query } = await import('../config/database');
    
    // Verify current password
    const result = await query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      `UPDATE users 
       SET password = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [hashedPassword, userId]
    );

    return { success: true, message: 'Password changed successfully' };
  },

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const { query } = await import('../config/database');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads/profile-photos');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `profile-${userId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Get old photo to delete
    const oldPhotoResult = await query(
      'SELECT profile_photo FROM users WHERE id = ?',
      [userId]
    );

    const oldPhoto = oldPhotoResult.rows[0]?.profile_photo;

    // Update database
    await query(
      `UPDATE users 
       SET profile_photo = ?, 
           profile_photo_filename = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [filePath, file.originalname, userId]
    );

    // Delete old photo if exists
    if (oldPhoto) {
      try {
        await fs.unlink(oldPhoto);
      } catch (error) {
        console.log('Could not delete old profile photo:', error);
      }
    }

    return {
      success: true,
      profile_photo: filePath,
      profile_photo_filename: file.originalname
    };
  },

  async deleteProfilePhoto(userId: string) {
    const { query } = await import('../config/database');
    
    // Get current photo
    const result = await query(
      'SELECT profile_photo FROM users WHERE id = ?',
      [userId]
    );

    const photo = result.rows[0]?.profile_photo;

    // Update database
    await query(
      `UPDATE users 
       SET profile_photo = NULL, 
           profile_photo_filename = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userId]
    );

    // Delete file
    if (photo) {
      try {
        await fs.unlink(photo);
      } catch (error) {
        console.log('Could not delete profile photo file:', error);
      }
    }

    return { success: true, message: 'Profile photo deleted' };
  },

  async getProfilePhoto(userId: string) {
    const { query } = await import('../config/database');
    
    const result = await query(
      'SELECT profile_photo, profile_photo_filename FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].profile_photo) {
      return null;
    }

    return {
      filePath: result.rows[0].profile_photo,
      filename: result.rows[0].profile_photo_filename
    };
  }
};
