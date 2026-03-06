import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { 
  validationSchemas, 
  handleValidationErrors 
} from '../middleware/security.middleware';
import { canManageUsers } from '../utils/role-helpers';
import { body } from 'express-validator';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', 
  validationSchemas.userLogin,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await AuthService.login(identifier, password, ipAddress, userAgent);

      if (!result.success) {
        return res.status(401).json(result);
      }

      // Set secure HTTP-only cookie for refresh token
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }

      // Don't send refresh token in response body
      const { refreshToken, ...responseData } = result;
      res.json(responseData);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const refreshToken = req.cookies.refreshToken;

    if (token) {
      await AuthService.logout(token, refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// POST /api/auth/refresh - Refresh access token
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided'
      });
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    if (!tokens) {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token: tokens.accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/institutions - Get list of institutions from existing users
authRouter.get('/institutions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institutions = await AuthService.getInstitutions();
      res.json({
        success: true,
        data: institutions,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/users - Get all users (for admin to assign reports)
authRouter.get('/users', 
  authMiddleware, 
  validationSchemas.searchQuery,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 GET /api/auth/users - Request received');
      console.log('User:', (req as any).user);
      
      const users = await AuthService.getAllUsers();
      console.log('📋 Users found:', users.length);
      console.log('Users with institution:', users.filter(u => u.institution).length);
      
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('❌ Error in /api/auth/users:', error);
      next(error);
    }
  }
);

// POST /api/auth/users - Create new user (admin only)
authRouter.post('/users', 
  authMiddleware,
  [
    ...validationSchemas.userAuth,
    // Additional validation for user creation
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2-100 characters'),
    body('role')
      .isIn(['admin', 'user'])
      .withMessage('Role must be admin or user'),
    body('institution')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Institution must be between 2-200 characters'),
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      
      if (!canManageUsers(userRole!)) {
        return res.status(403).json({
          success: false,
          error: 'Hanya super admin yang dapat membuat user baru'
        });
      }

      const { username, email, password, name, role, institution } = req.body;

      if (role === 'user' && !institution) {
        return res.status(400).json({
          success: false,
          error: 'Institusi wajib diisi untuk user OPD'
        });
      }

      const user = await AuthService.createUser({
        username,
        email,
        password,
        name,
        role,
        institution: role === 'user' ? institution : undefined
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User berhasil dibuat'
      });
    } catch (error: any) {
      if (error.message.includes('Password validation failed')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Username already exists' || error.message === 'Email already exists') {
        return res.status(400).json({
          success: false,
          error: error.message === 'Username already exists' ? 'Username sudah digunakan' : 'Email sudah digunakan'
        });
      }
      next(error);
    }
  }
);

// PUT /api/auth/users/:id - Update user (admin only)
authRouter.put('/users/:id', 
  authMiddleware,
  validationSchemas.uuidParam,
  [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3-50 characters')
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('Username contains invalid characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2-100 characters'),
    body('institution')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Institution must be between 2-200 characters'),
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      
      if (!canManageUsers(userRole!)) {
        return res.status(403).json({
          success: false,
          error: 'Hanya super admin yang dapat mengubah data user'
        });
      }

      const { id } = req.params;
      const { username, email, name, institution } = req.body;

      const user = await AuthService.updateUser(id, {
        username,
        email,
        name,
        institution
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'User berhasil diperbarui'
      });
    } catch (error: any) {
      if (error.message === 'Username already exists' || error.message === 'Email already exists') {
        return res.status(400).json({
          success: false,
          error: error.message === 'Username already exists' ? 'Username sudah digunakan' : 'Email sudah digunakan'
        });
      }
      next(error);
    }
  }
);

// DELETE /api/auth/users/:id - Delete user (admin only)
authRouter.delete('/users/:id', 
  authMiddleware,
  validationSchemas.uuidParam,
  handleValidationErrors,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      
      if (!canManageUsers(userRole!)) {
        return res.status(403).json({
          success: false,
          error: 'Hanya super admin yang dapat menghapus user'
        });
      }

      const { id } = req.params;
      const success = await AuthService.deleteUser(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'User tidak ditemukan atau tidak dapat dihapus'
        });
      }

      res.json({
        success: true,
        message: 'User berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/change-password - Change password
authRouter.post('/change-password',
  authMiddleware,
  [
    body('currentPassword')
      .isLength({ min: 1 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .withMessage('New password must contain at least one lowercase, uppercase, number, and special character'),
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Password berhasil diubah'
      });
    } catch (error) {
      next(error);
    }
  }
);
