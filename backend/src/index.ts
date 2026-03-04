import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth.routes';
import { reportRouter } from './routes/report.routes';
import { followUpRouter } from './routes/followup.routes';
import { followupItemRouter } from './routes/followup-item.routes';
import followupRecommendationRouter from './routes/followup-recommendation.routes';
import { fileRouter } from './routes/file.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import revisionRouter from './routes/revision.routes';
import { metricsRouter } from './routes/metrics.routes';
import importRouter from './routes/import.routes';
import opdStatisticsRouter from './routes/opd-statistics.routes';
import { matrixAuditRouter } from './routes/matrix-audit.routes';
import { evidenceRouter } from './routes/evidence.routes';
import { performanceRouter } from './routes/performance.routes';
import userProfileRouter from './routes/user-profile.routes';
import { errorHandler } from './middleware/error.middleware';
import { 
  securityHeaders, 
  corsOptions, 
  generalRateLimit, 
  authRateLimit, 
  uploadRateLimit,
  devRateLimit,
  sanitizeInput,
  requestLogger,
  rateLimitInfo
} from './middleware/security.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// SERVE STATIC FILES FIRST - BEFORE ANY MIDDLEWARE
const frontendPath = path.join(__dirname, '../../frontend/dist');
console.log('🎯 Frontend path:', frontendPath);

// Serve assets with specific route (highest priority)
app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
  maxAge: '1h',
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    console.log('📁 Serving asset:', filePath);
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// Serve all static files
app.use(express.static(frontendPath, {
  maxAge: '1h',
  etag: false,
  lastModified: false
}));

// Security Middleware (applied after static files)
app.use(requestLogger);
app.use(rateLimitInfo);
app.use(securityHeaders);
app.use(cors(corsOptions));

// Apply appropriate rate limiting based on environment
if (process.env.NODE_ENV === 'development') {
  app.use(devRateLimit);
  console.log('🔧 Development mode: Using relaxed rate limiting (100 req/10s)');
} else {
  app.use(generalRateLimit);
  console.log('🔒 Production mode: Using standard rate limiting (50 req/15s)');
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

// Routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRouter);
app.use('/api/profile', userProfileRouter);
app.use('/api/reports', reportRouter);
app.use('/api/follow-ups', followUpRouter);
app.use('/api/followup-items', followupItemRouter);
app.use('/api/followup-recommendations', followupRecommendationRouter);
app.use('/api/files', uploadRateLimit, fileRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/revisions', revisionRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/imports', uploadRateLimit, importRouter);
app.use('/api/opd-statistics', opdStatisticsRouter);
app.use('/api/matrix', matrixAuditRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/performance', performanceRouter);

// Health check (before static files)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'connected' // TODO: Add actual database health check
  });
});

// Rate limit status check
app.get('/api/rate-limit-status', (req, res) => {
  const isDev = process.env.NODE_ENV === 'development';
  res.json({
    environment: process.env.NODE_ENV || 'production',
    rateLimits: {
      general: {
        requests: isDev ? 100 : 50,
        window: isDev ? '10 seconds' : '15 seconds',
        type: 'general'
      },
      auth: {
        requests: 3,
        window: '15 seconds',
        type: 'authentication'
      },
      upload: {
        requests: 5,
        window: '15 seconds',
        type: 'file upload'
      }
    },
    message: isDev 
      ? 'Development mode: Relaxed rate limiting active'
      : 'Production mode: Standard rate limiting active'
  });
});

// Error handler (before catch-all route)
app.use(errorHandler);

// Serve frontend for all non-API routes (catch-all route - must be last)
app.get('*', (req, res) => {
  // Skip API routes and health check
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const frontendIndexPath = path.join(__dirname, '../../frontend/dist', 'index.html');
  res.sendFile(frontendIndexPath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
