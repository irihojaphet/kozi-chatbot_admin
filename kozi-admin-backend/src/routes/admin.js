const express = require('express');
const { pool } = require('../core/db/connection');
const logger = require('../core/utils/logger');
const KoziApiService = require('../services/koziApiService');
const EmailService = require('../services/emailService');

const router = express.Router();

// Initialize services
const koziApi = new KoziApiService();
const emailService = new EmailService();

// Admin authentication middleware (keep existing)
const authenticateAdmin = async (req, res, next) => {
  try {
    const { user_id } = req.body || req.query;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      });
    }
    
    const [adminUser] = await pool.execute(
      'SELECT user_id, user_type FROM user_profiles WHERE user_id = ? AND user_type IN ("admin", "super_admin") AND is_active = TRUE',
      [user_id]
    );
    
    if (adminUser.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required'
      });
    }
    
    req.adminUser = adminUser[0];
    next();
  } catch (error) {
    logger.error('Admin authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// NEW: Get real-time job seekers data
router.get('/job-seekers', authenticateAdmin, async (req, res) => {
  try {
    const { use_cache = 'true' } = req.query;
    const useCache = use_cache === 'true';
    
    logger.info('Fetching job seekers data', { useCache });
    
    const jobSeekers = await koziApi.getAllJobSeekers(useCache);
    
    res.json({
      success: true,
      data: {
        job_seekers: jobSeekers,
        total: jobSeekers?.length || 0,
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching job seekers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job seekers data',
      details: error.message
    });
  }
});

// NEW: Get incomplete profiles
router.get('/incomplete-profiles', authenticateAdmin, async (req, res) => {
  try {
    const { use_cache = 'true' } = req.query;
    const useCache = use_cache === 'true';
    
    logger.info('Fetching incomplete profiles', { useCache });
    
    const incompleteProfiles = await koziApi.getIncompleteProfiles(useCache);
    
    res.json({
      success: true,
      data: {
        incomplete_profiles: incompleteProfiles,
        total: incompleteProfiles?.length || 0,
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching incomplete profiles', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incomplete profiles',
      details: error.message
    });
  }
});

// NEW: Get payroll data with real-time API
router.get('/payroll', authenticateAdmin, async (req, res) => {
  try {
    const { use_cache = 'true' } = req.query;
    const useCache = use_cache === 'true';
    
    logger.info('Fetching payroll data', { useCache });
    
    const payrollData = await koziApi.getPayrollData(useCache);
    
    // Analyze payroll data
    const analysis = analyzePayrollData(payrollData);
    
    res.json({
      success: true,
      data: {
        payroll_records: payrollData,
        analysis,
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching payroll data', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll data',
      details: error.message
    });
  }
});

// NEW: Send profile completion reminders
router.post('/send-profile-reminders', authenticateAdmin, async (req, res) => {
  try {
    const { target_users = 'all', batch_size = 10 } = req.body;
    
    logger.info('Starting profile reminder campaign', { target_users, batch_size });
    
    // Fetch incomplete profiles
    const incompleteProfiles = await koziApi.getIncompleteProfiles(false);
    
    if (!incompleteProfiles || incompleteProfiles.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No incomplete profiles found',
          total: 0,
          sent: 0
        }
      });
    }

    // Filter target users if specified
    let targetProfiles = incompleteProfiles;
    if (target_users !== 'all') {
      // Add filtering logic here (e.g., by completion percentage)
      targetProfiles = incompleteProfiles.filter(p => 
        (p.completion_percentage || 0) < 50
      );
    }

    // Send reminder emails
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetProfiles.length; i += batch_size) {
      const batch = targetProfiles.slice(i, i + batch_size);
      
      for (const profile of batch) {
        try {
          const result = await emailService.sendProfileCompletionReminder({
            email: profile.email,
            full_name: profile.full_name || profile.name,
            completion_percentage: profile.completion_percentage || 0,
            missing_fields: profile.missing_fields || []
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          results.push(result);

          // Delay between emails
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.error('Failed to send reminder', { 
            email: profile.email, 
            error: error.message 
          });
          failCount++;
        }
      }

      // Delay between batches
      if (i + batch_size < targetProfiles.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    res.json({
      success: true,
      data: {
        total_targeted: targetProfiles.length,
        successfully_sent: successCount,
        failed: failCount,
        success_rate: Math.round((successCount / targetProfiles.length) * 100),
        results: results.slice(0, 10) // Return first 10 for review
      }
    });
    
  } catch (error) {
    logger.error('Error sending profile reminders', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send profile reminders',
      details: error.message
    });
  }
});

// NEW: Send payroll notifications
router.post('/send-payroll-notifications', authenticateAdmin, async (req, res) => {
  try {
    const { payroll_id, batch_size = 10 } = req.body;
    
    if (!payroll_id) {
      return res.status(400).json({
        success: false,
        error: 'payroll_id is required'
      });
    }

    logger.info('Sending payroll notifications', { payroll_id, batch_size });
    
    // Fetch payroll data
    const payrollData = await koziApi.getPayrollData(false);
    const targetPayroll = payrollData.find(p => p.id === payroll_id);
    
    if (!targetPayroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    // Fetch affected employees
    const jobSeekers = await koziApi.getAllJobSeekers(false);
    const targetEmployees = jobSeekers.filter(js => 
      targetPayroll.employee_ids?.includes(js.id)
    );

    // Send notifications
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetEmployees.length; i += batch_size) {
      const batch = targetEmployees.slice(i, i + batch_size);
      
      for (const employee of batch) {
        try {
          const result = await emailService.sendPayrollNotification(
            {
              email: employee.email,
              full_name: employee.full_name || employee.name
            },
            {
              amount: targetPayroll.amount,
              period: targetPayroll.period,
              due_date: targetPayroll.due_date,
              status: targetPayroll.status
            }
          );

          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          results.push(result);

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.error('Failed to send payroll notification', { 
            email: employee.email, 
            error: error.message 
          });
          failCount++;
        }
      }

      if (i + batch_size < targetEmployees.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    res.json({
      success: true,
      data: {
        payroll_period: targetPayroll.period,
        total_targeted: targetEmployees.length,
        successfully_sent: successCount,
        failed: failCount,
        success_rate: Math.round((successCount / targetEmployees.length) * 100)
      }
    });
    
  } catch (error) {
    logger.error('Error sending payroll notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send payroll notifications',
      details: error.message
    });
  }
});

// NEW: Clear API cache
router.post('/clear-cache', authenticateAdmin, async (req, res) => {
  try {
    const { endpoint = null } = req.body;
    
    koziApi.clearCache(endpoint);
    
    res.json({
      success: true,
      data: {
        message: endpoint ? `Cache cleared for ${endpoint}` : 'All cache cleared',
        endpoint: endpoint || 'all'
      }
    });
    
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// NEW: System health check
router.get('/health', authenticateAdmin, async (req, res) => {
  try {
    const koziApiHealthy = await koziApi.healthCheck();
    const emailHealthy = await emailService.verifyConnection();
    
    res.json({
      success: true,
      data: {
        kozi_api: koziApiHealthy ? 'healthy' : 'unhealthy',
        email_service: emailHealthy ? 'healthy' : 'unhealthy',
        database: 'healthy', // Assumed if we got here
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Helper function
function analyzePayrollData(payrollData) {
  if (!payrollData || payrollData.length === 0) {
    return null;
  }

  const total = payrollData.length;
  const pending = payrollData.filter(p => p.status === 'pending').length;
  const processing = payrollData.filter(p => p.status === 'processing').length;
  const completed = payrollData.filter(p => p.status === 'completed').length;
  
  const totalAmount = payrollData.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingAmount = payrollData
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    total_records: total,
    by_status: {
      pending,
      processing,
      completed
    },
    total_amount: totalAmount,
    pending_amount: pendingAmount,
    completion_rate: Math.round((completed / total) * 100)
  };
}
// Add these to your existing /src/routes/admin.js

// NEW: Get all jobs data
router.get('/jobs', authenticateAdmin, async (req, res) => {
  try {
    const { use_cache = 'true', status, category } = req.query;
    const useCache = use_cache === 'true';
    
    logger.info('Fetching jobs data', { useCache, status, category });
    
    let jobs = await koziApi.getAllJobs(useCache);
    
    // Apply filters if requested
    if (status) {
      jobs = jobs.filter(job => 
        job.status && job.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (category) {
      jobs = jobs.filter(job => 
        job.category && job.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    res.json({
      success: true,
      data: {
        jobs: jobs,
        total: jobs?.length || 0,
        filters: { status, category },
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching jobs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs data',
      details: error.message
    });
  }
});

// NEW: Get dashboard stats (efficient single endpoint for overview)
router.get('/dashboard-stats', authenticateAdmin, async (req, res) => {
  try {
    const { use_cache = 'true' } = req.query;
    const useCache = use_cache === 'true';
    
    logger.info('Fetching dashboard stats', { useCache });
    
    // Fetch all data concurrently for efficiency
    const [jobSeekers, jobs, incompleteProfiles, payrollData] = await Promise.all([
      koziApi.getAllJobSeekers(useCache),
      koziApi.getAllJobs(useCache),
      koziApi.getIncompleteProfiles(useCache).catch(() => []),
      koziApi.getPayrollData(useCache).catch(() => [])
    ]);

    const stats = {
      job_seekers: {
        total: jobSeekers?.length || 0,
        incomplete: incompleteProfiles?.length || 0,
        completion_rate: jobSeekers?.length > 0 ? 
          Math.round(((jobSeekers.length - (incompleteProfiles?.length || 0)) / jobSeekers.length) * 100) : 0
      },
      jobs: {
        total: jobs?.length || 0,
        active: jobs?.filter(job => job.status === 'active').length || 0,
        inactive: jobs?.filter(job => job.status !== 'active').length || 0
      },
      payroll: analyzePayrollData(payrollData),
      system: {
        cache_enabled: useCache,
        last_updated: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Error fetching dashboard stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      details: error.message
    });
  }
});
module.exports = router;