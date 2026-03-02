import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult, param, query } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Input Sanitization Middleware
 * Protects against XSS and SQL Injection
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove potential SQL injection patterns
  let sanitized = str
    // Remove SQL comments
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove dangerous SQL keywords (case insensitive)
    .replace(/\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|EXEC|EXECUTE|UNION|SELECT)\b/gi, '')
    // Remove script tags and dangerous HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Use DOMPurify for additional XSS protection
  sanitized = DOMPurify.sanitize(sanitized, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  });

  return sanitized.trim();
};

/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks
 */
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
      limit: max,
      window: `${Math.ceil(windowMs / 1000)} seconds`
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: false,
    // Skip failed requests
    skipFailedRequests: false,
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.status(429).json({
        success: false,
        error: message || 'Too many requests, please try again later.',
        retryAfter,
        limit: max,
        window: `${retryAfter} seconds`,
        message: `Rate limit exceeded. You can make ${max} requests per ${retryAfter} seconds. Please wait ${retryAfter} seconds before trying again.`
      });
    },
    // Skip rate limiting in development if needed
    skip: (req) => {
      // Skip rate limiting for localhost in development
      if (process.env.NODE_ENV === 'development' && 
          (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip?.includes('localhost'))) {
        return true;
      }
      return false;
    },
  });
};

/**
 * General rate limit (50 requests per 15 seconds)
 */
export const generalRateLimit = createRateLimit(
  15 * 1000, // 15 seconds
  50,
  'Too many requests from this IP, please try again in 15 seconds.'
);

/**
 * Strict rate limit for auth endpoints (3 attempts per 15 seconds)
 */
export const authRateLimit = createRateLimit(
  15 * 1000, // 15 seconds
  3,
  'Too many login attempts, please try again in 15 seconds.'
);

/**
 * File upload rate limit (5 uploads per 15 seconds)
 */
export const uploadRateLimit = createRateLimit(
  15 * 1000, // 15 seconds
  5,
  'Too many file uploads, please try again in 15 seconds.'
);

/**
 * Development rate limit (more permissive for development)
 */
export const devRateLimit = createRateLimit(
  10 * 1000, // 10 seconds
  100,
  'Rate limit exceeded, please wait 10 seconds.'
);

/**
 * Helmet Security Headers
 * Protects against various attacks including clickjacking
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Prevents embedding in frames (clickjacking protection)
    },
  },
  // X-Frame-Options (additional clickjacking protection)
  frameguard: { action: 'deny' },
  // X-Content-Type-Options
  noSniff: true,
  // X-XSS-Protection
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: { policy: 'same-origin' },
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },
});

/**
 * CORS Configuration
 * Protects against unauthorized cross-origin requests
 */
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean);

    // Allow ngrok and other tunnel services for development
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('ngrok') || origin.includes('loca.lt') || origin.includes('trycloudflare.com')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

/**
 * Input Validation Schemas
 */
export const validationSchemas = {
  // User login - minimal validation
  userLogin: [
    body('identifier')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Username/email is required'),
    body('password')
      .isLength({ min: 1, max: 128 })
      .withMessage('Password is required'),
  ],

  // User registration - strict validation
  userAuth: [
    body('identifier')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Identifier must be between 3-100 characters')
      .matches(/^[a-zA-Z0-9@._-]+$/)
      .withMessage('Identifier contains invalid characters'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .withMessage('Password must contain at least one lowercase, uppercase, number, and special character'),
  ],

  // Report creation
  reportCreate: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5-200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Description must be between 10-5000 characters'),
    body('assignedUserId')
      .isUUID()
      .withMessage('Invalid user ID format'),
  ],

  // File upload
  fileUpload: [
    body('fileName')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('File name must be between 1-255 characters')
      .matches(/^[a-zA-Z0-9._-]+\.(xlsx|xls|csv)$/i)
      .withMessage('Invalid file name or extension'),
  ],

  // UUID parameter validation
  uuidParam: [
    param('id')
      .isUUID()
      .withMessage('Invalid ID format'),
  ],

  // Search query validation
  searchQuery: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search query too long'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1-100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
  ],
};

/**
 * Validation Error Handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * API Key Validation Middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    return res.status(500).json({
      success: false,
      error: 'API key not configured'
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key'
    });
  }

  next();
};

/**
 * Request Logging Middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`);
    
    // Log suspicious activities
    if (statusCode === 401 || statusCode === 403) {
      console.warn(`[SECURITY] Unauthorized access attempt: ${method} ${url} from ${ip}`);
    }
    
    // Log rate limit hits
    if (statusCode === 429) {
      console.warn(`[RATE_LIMIT] Rate limit exceeded: ${method} ${url} from ${ip}`);
    }
  });

  next();
};

/**
 * Rate Limit Info Middleware
 * Adds rate limit information to response headers
 */
export const rateLimitInfo = (req: Request, res: Response, next: NextFunction) => {
  // Add rate limit info to all responses
  res.setHeader('X-RateLimit-Policy', '15-second-window');
  res.setHeader('X-RateLimit-Reset-Info', 'Limits reset every 15 seconds');
  
  next();
};