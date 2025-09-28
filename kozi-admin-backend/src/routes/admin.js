const express = require('express');
const db = require('../core/db/connection');
const logger = require('../core/utils/logger');

const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const { user_id } = req.body || req.query;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      });
    }
    
    const [adminUser] = await db.execute(
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

// GET /api/admin/payment-reminders - Get payment schedules and reminders
router.get('/payment-reminders', authenticateAdmin, async (req, res) => {
  try {
    const [paymentSchedules] = await db.execute(`
      SELECT schedule_id, employee_count, total_amount, currency, due_date, 
             payment_period, status, reminder_sent, created_at,
             DATEDIFF(due_date, CURRENT_DATE) as days_until_due
      FROM payment_schedules 
      WHERE status IN ('pending', 'processing')
      ORDER BY due_date ASC 
      LIMIT 10
    `);
    
    const [overduePayments] = await db.execute(`
      SELECT COUNT(*) as overdue_count, SUM(total_amount) as overdue_amount
      FROM payment_schedules 
      WHERE due_date < CURRENT_DATE AND status = 'pending'
    `);
    
    res.json({
      success: true,
      data: {
        upcoming_payments: paymentSchedules,
        overdue_summary: overduePayments[0],
        total_pending: paymentSchedules.length
      }
    });
    
  } catch (error) {
    logger.error('Error fetching payment reminders', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment reminders'
    });
  }
});

// POST /api/admin/database/query - Query platform database
router.post('/database/query', authenticateAdmin, async (req, res) => {
  try {
    const { query_type, filters = {} } = req.body;
    
    let result = {};
    
    switch (query_type) {
      case 'employees':
        result = await queryEmployees(filters);
        break;
      case 'employers':
        result = await queryEmployers(filters);
        break;
      case 'overview':
        result = await getOverviewStats();
        break;
      default:
        result = await getOverviewStats();
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Error processing database query', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to process database query'
    });
  }
});

// POST /api/admin/gmail/process - Process and categorize emails
router.post('/gmail/process', authenticateAdmin, async (req, res) => {
  try {
    const { action = 'summary' } = req.body;
    
    if (action === 'summary') {
      const [emailSummary] = await db.execute(`
        SELECT 
          email_category,
          priority,
          processing_status,
          COUNT(*) as count
        FROM email_processing 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY email_category, priority, processing_status
        ORDER BY priority DESC, count DESC
      `);
      
      const [priorityBreakdown] = await db.execute(`
        SELECT priority, COUNT(*) as count
        FROM email_processing 
        WHERE processing_status = 'pending'
        GROUP BY priority
      `);
      
      res.json({
        success: true,
        data: {
          summary: emailSummary,
          priority_breakdown: priorityBreakdown,
          action: 'summary_generated'
        }
      });
    } else if (action === 'draft_replies') {
      const [pendingEmails] = await db.execute(`
        SELECT email_id, email_subject, sender_email, email_category, priority, content_summary
        FROM email_processing 
        WHERE processing_status = 'pending' AND priority IN ('high', 'medium')
        ORDER BY priority DESC, created_at ASC
        LIMIT 10
      `);
      
      res.json({
        success: true,
        data: {
          pending_emails: pendingEmails,
          action: 'drafts_ready'
        }
      });
    }
    
  } catch (error) {
    logger.error('Error processing Gmail request', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to process Gmail request'
    });
  }
});

// GET /api/admin/analytics - Get platform analytics
router.get('/analytics', authenticateAdmin, async (req, res) => {
  try {
    const { period = 'monthly', metric_type = 'all' } = req.query;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const [analytics] = await db.execute(`
      SELECT metric_name, metric_value, metric_type, category
      FROM platform_analytics 
      WHERE period_type = ? AND period_value = ?
      ORDER BY category, metric_name
    `, [period, currentMonth]);
    
    const [trends] = await db.execute(`
      SELECT metric_name, metric_value, period_value
      FROM platform_analytics 
      WHERE period_type = ? AND metric_name IN ('total_active_users', 'job_applications', 'successful_hires')
      ORDER BY period_value DESC
      LIMIT 12
    `, [period]);
    
    res.json({
      success: true,
      data: {
        current_metrics: analytics,
        trends: trends,
        period: period,
        last_updated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// GET /api/admin/dashboard - Get admin dashboard data
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const dashboardData = await getDashboardData();
    
    res.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error) {
    logger.error('Error fetching dashboard data', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Helper functions
async function queryEmployees(filters) {
  let whereClause = 'WHERE employment_status = "active"';
  let params = [];
  
  if (filters.location) {
    whereClause += ' AND location = ?';
    params.push(filters.location);
  }
  
  if (filters.department) {
    whereClause += ' AND department = ?';
    params.push(filters.department);
  }
  
  const [employees] = await db.execute(`
    SELECT employee_id, full_name, email, location, department, position, hire_date
    FROM platform_employees 
    ${whereClause}
    ORDER BY hire_date DESC
    LIMIT 50
  `, params);
  
  const [stats] = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT location) as locations,
      COUNT(DISTINCT department) as departments
    FROM platform_employees 
    ${whereClause}
  `, params);
  
  return {
    employees: employees,
    statistics: stats[0],
    filters_applied: filters
  };
}

async function queryEmployers(filters) {
  let whereClause = 'WHERE 1=1';
  let params = [];
  
  if (filters.verification_status) {
    whereClause += ' AND verification_status = ?';
    params.push(filters.verification_status);
  }
  
  if (filters.industry) {
    whereClause += ' AND industry = ?';
    params.push(filters.industry);
  }
  
  const [employers] = await db.execute(`
    SELECT employer_id, company_name, email, location, industry, 
           verification_status, job_postings_count, created_at
    FROM platform_employers 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 50
  `, params);
  
  const [stats] = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(job_postings_count) as total_jobs,
      COUNT(DISTINCT industry) as industries
    FROM platform_employers 
    ${whereClause}
  `, params);
  
  return {
    employers: employers,
    statistics: stats[0],
    filters_applied: filters
  };
}

async function getOverviewStats() {
  const [employeeStats] = await db.execute(`
    SELECT 
      COUNT(*) as total_employees,
      SUM(CASE WHEN employment_status = 'active' THEN 1 ELSE 0 END) as active_employees,
      COUNT(DISTINCT location) as employee_locations
    FROM platform_employees
  `);
  
  const [employerStats] = await db.execute(`
    SELECT 
      COUNT(*) as total_employers,
      SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified_employers,
      SUM(job_postings_count) as total_job_postings
    FROM platform_employers
  `);
  
  return {
    employees: employeeStats[0],
    employers: employerStats[0]
  };
}

async function getDashboardData() {
  const overview = await getOverviewStats();
  
  const [recentActivity] = await db.execute(`
    SELECT COUNT(*) as admin_sessions_today
    FROM chat_sessions 
    WHERE bot_type = 'admin' AND DATE(created_at) = CURRENT_DATE
  `);
  
  const [pendingTasks] = await db.execute(`
    SELECT 
      (SELECT COUNT(*) FROM payment_schedules WHERE status = 'pending' AND due_date <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)) as upcoming_payments,
      (SELECT COUNT(*) FROM platform_employers WHERE verification_status = 'pending') as pending_verifications,
      (SELECT COUNT(*) FROM email_processing WHERE processing_status = 'pending' AND priority = 'high') as high_priority_emails
  `);
  
  return {
    overview: overview,
    activity: recentActivity[0],
    pending_tasks: pendingTasks[0],
    last_updated: new Date().toISOString()
  };
}

module.exports = router;