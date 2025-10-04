// src/routes/kozi.js
const express = require('express');
const KoziController = require('../controllers/koziController');
const logger = require('../core/utils/logger');

const router = express.Router();
const koziController = new KoziController();

// Middleware for request logging and timing
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    logger.info('Response sent', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`
    });
    return originalJson.call(this, data);
  };

  next();
};

// Apply middleware to all routes
router.use(requestLogger);

/* ======================== HEALTH & STATUS ======================== */

/**
 * @route   GET /api/kozi/health
 * @desc    Check API health status
 * @access  Public
 */
router.get('/health', async (req, res) => {
  await koziController.healthCheck(req, res);
});

/**
 * @route   GET /api/kozi/test-response-times
 * @desc    Test API response times
 * @access  Public
 */
router.get('/test-response-times', async (req, res) => {
  await koziController.testResponseTimes(req, res);
});

/**
 * @route   GET /api/kozi/stats
 * @desc    Get comprehensive statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  await koziController.getStats(req, res);
});

/* ======================== JOB SEEKERS ======================== */

/**
 * @route   GET /api/kozi/job-seekers
 * @desc    Get all job seekers
 * @access  Public
 * @query   {boolean} useCache - Use cached data (default: true)
 * @query   {number} limit - Limit number of results
 * @query   {number} offset - Offset for pagination
 */
router.get('/job-seekers', async (req, res) => {
  await koziController.getAllJobSeekers(req, res);
});

/**
 * @route   GET /api/kozi/incomplete-profiles
 * @desc    Get job seekers with incomplete profiles
 * @access  Public
 * @query   {boolean} useCache - Use cached data (default: true)
 */
router.get('/incomplete-profiles', async (req, res) => {
  await koziController.getIncompleteProfiles(req, res);
});

/* ======================== JOBS ======================== */

/**
 * @route   GET /api/kozi/jobs
 * @desc    Get all jobs
 * @access  Public
 * @query   {boolean} useCache - Use cached data (default: true)
 * @query   {string} status - Filter by job status
 * @query   {string} category - Filter by job category
 */
router.get('/jobs', async (req, res) => {
  await koziController.getAllJobs(req, res);
});

/* ======================== PAYROLL ======================== */

/**
 * @route   GET /api/kozi/payroll
 * @desc    Get payroll data
 * @access  Public
 * @query   {boolean} useCache - Use cached data (default: true)
 */
router.get('/payroll', async (req, res) => {
  await koziController.getPayrollData(req, res);
});

/* ======================== CACHE MANAGEMENT ======================== */

/**
 * @route   POST /api/kozi/cache/clear
 * @desc    Clear cache for specific endpoint or all cache
 * @access  Public
 * @body    {string} endpoint - Specific endpoint to clear (optional)
 */
router.post('/cache/clear', async (req, res) => {
  await koziController.clearCache(req, res);
});

/* ======================== ERROR HANDLING ======================== */

// 404 handler for unmatched routes
router.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Global error handler for this router
router.use((error, req, res, next) => {
  logger.error('Unhandled route error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;