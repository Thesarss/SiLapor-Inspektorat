import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UserProfileService } from '../services/user-profile.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// GET /api/profile - Get current user profile
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id; // Changed from userId to id
    const profile = await UserProfileService.getProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile - Update profile
router.put('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id; // Changed from userId to id
    const { name, email, department, position } = req.body;

    // Filter out undefined values
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;

    const updatedProfile = await UserProfileService.updateProfile(userId, updateData);

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/profile/change-password - Change password
router.post('/change-password', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id; // Changed from userId to id
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password and confirmation do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long',
      });
    }

    const result = await UserProfileService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

// POST /api/profile/photo - Upload profile photo
router.post('/photo', authMiddleware, upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id; // Changed from userId to id

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const result = await UserProfileService.uploadProfilePhoto(userId, req.file);

    res.json({
      success: true,
      data: result,
      message: 'Profile photo uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/profile/photo - Delete profile photo
router.delete('/photo', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id; // Changed from userId to id
    const result = await UserProfileService.deleteProfilePhoto(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/profile/photo/:userId - Get user profile photo
router.get('/photo/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const photo = await UserProfileService.getProfilePhoto(userId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Profile photo not found',
      });
    }

    // Send file
    res.sendFile(photo.filePath);
  } catch (error) {
    next(error);
  }
});

export default router;
