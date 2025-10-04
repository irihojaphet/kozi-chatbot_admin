const { pool } = require('../core/db/connection');
const logger = require('../core/utils/logger');
const OpenAI = require('openai');
const KoziApiService = require('../services/koziApiService');
const EmailService = require('../services/emailService');

class chatController {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize services
    this.koziApi = new KoziApiService();
    this.emailService = new EmailService();
    
    // Admin bot system prompt (keep existing)
    this.systemPrompt = `YOU ARE KOZI ADMIN AI, THE OFFICIAL VIRTUAL ASSISTANT FOR PLATFORM ADMINISTRATORS OF KOZI.RW.
YOUR ROLE IS TO SUPPORT PLATFORM MANAGEMENT, IMPROVE EFFICIENCY, AND AUTOMATE ADMIN WORKFLOWS.
YOU SERVE ONLY ADMIN USERS — NOT JOB SEEKERS OR EMPLOYERS.

CORE FUNCTIONS:
1. PAYMENT REMINDERS - Track salary schedules and notify admins
2. DATABASE MANAGEMENT - Help filter, search, and query worker/employer data  
3. GMAIL AI SUPPORT - Categorize emails and draft professional replies
4. PLATFORM ANALYTICS - Generate reports and insights
5. PROFILE COMPLETION TRACKING - Monitor and send reminders for incomplete profiles

STYLE: Professional, precise, supportive. Use tables, bullet points, numbered steps.
ALWAYS be action-oriented and suggest next steps.`;
  }

  async initialize() {
    try {
      logger.info('Initializing chat controller with real-time services...');
      
      // Verify Kozi API connection
      const apiHealthy = await this.koziApi.healthCheck();
      if (!apiHealthy) {
        logger.warn('Kozi API health check failed - will use fallback data');
      }
      
      // Verify email service
      await this.emailService.verifyConnection();
      
      logger.info('chatController initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize chatController', { error: error.message });
      throw error;
    }
  }

  // ... keep existing startSession and sendMessage methods ...

  async processAdminMessage(message, sessionId, userId) {
    const msg = message.toLowerCase();
    
    try {
      // Payment reminders (UPDATED WITH REAL API)
      if (msg.includes('payment') || msg.includes('salary') || msg.includes('payroll') || msg.includes('reminder')) {
        return await this.handlePaymentQuery(message);
      }
      
      // Database queries (UPDATED WITH REAL API)
      if (msg.includes('database') || msg.includes('query') || msg.includes('worker') || 
          msg.includes('employee') || msg.includes('job seeker') || msg.includes('filter') ||
          msg.includes('profile')) {
        return await this.handleDatabaseQuery(message);
      }
      
      // Profile completion reminders (NEW FEATURE)
      if (msg.includes('incomplete') || msg.includes('profile completion') || 
          msg.includes('send reminder') || msg.includes('email reminder')) {
        return await this.handleProfileReminders(message);
      }
      
      // Email processing (keep existing)
      if (msg.includes('email') || msg.includes('gmail') || msg.includes('categorize') || 
          msg.includes('draft') || msg.includes('reply')) {
        return await this.handleEmailQuery(message);
      }
      
      // Analytics (keep existing)
      if (msg.includes('analytics') || msg.includes('report') || msg.includes('insight') || 
          msg.includes('dashboard') || msg.includes('metric')) {
        return await this.handleAnalyticsQuery(message);
      }
      
      // Default admin processing with OpenAI
      return await this.generateAdminResponse(message, sessionId);
      
    } catch (error) {
      logger.error('Error in admin message processing', { error: error.message });
      return {
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        type: 'text'
      };
    }
  }

  /**
   * UPDATED: Handle payment queries with real-time API data
   */
  async handlePaymentQuery(message) {
    try {
      logger.info('Fetching real-time payroll data...');
      
      // Fetch real payroll data from Kozi API
      const payrollData = await this.koziApi.getPayrollData(true);
      
      if (!payrollData || payrollData.length === 0) {
        return {
          message: `Payroll Status Update

No payroll records found in the system.

Suggested Actions:
- Verify API connection
- Check payroll system status
- Contact technical support if issue persists

Would you like me to help with something else?`,
          type: 'payment_reminder'
        };
      }

      // Analyze payroll data
      const pendingPayments = payrollData.filter(p => p.status === 'pending');
      const upcomingPayments = pendingPayments.filter(p => {
        const dueDate = new Date(p.due_date);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 30;
      });

      // Format response
      let response = `Payroll Summary (Real-Time Data)

📊 OVERVIEW:
- Total Payroll Records: ${payrollData.length}
- Pending Payments: ${pendingPayments.length}
- Upcoming (Next 30 days): ${upcomingPayments.length}

`;

      if (upcomingPayments.length > 0) {
        response += `⏰ UPCOMING PAYMENTS:\n\n`;
        
        upcomingPayments.slice(0, 5).forEach((payment, index) => {
          const dueDate = new Date(payment.due_date);
          const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
          
          response += `${index + 1}. Period: ${payment.period}
   Amount: RWF ${payment.amount?.toLocaleString() || 'N/A'}
   Due Date: ${dueDate.toLocaleDateString()}
   Days Remaining: ${daysUntil} days
   Status: ${payment.status}

`;
        });

        response += `✅ SUGGESTED ACTIONS:
1. Review payment schedules
2. Verify employee bank details
3. Prepare payment batch files
4. Send payment notifications
5. Generate payroll reports

Would you like me to:
- Send email notifications to employees?
- Generate detailed payroll report?
- Filter by specific criteria?`;
      } else {
        response += `✅ All payments are up to date!

No urgent payments due in the next 30 days.

SUGGESTED ACTIONS:
- Review historical payment data
- Plan for next payment cycle
- Generate financial reports

Would you like me to help with anything else?`;
      }

      return {
        message: response,
        type: 'payment_reminder'
      };
      
    } catch (error) {
      logger.error('Error handling payment query with real API', { error: error.message });
      
      // Fallback to local database if API fails
      return this.handlePaymentQueryFallback();
    }
  }

  /**
   * UPDATED: Handle database queries with real-time API data
   */
  async handleDatabaseQuery(message) {
    try {
      logger.info('Fetching real-time job seeker data...');
      
      // Fetch real job seeker data from Kozi API
      const jobSeekers = await this.koziApi.getAllJobSeekers(true);
      
      if (!jobSeekers || jobSeekers.length === 0) {
        return {
          message: `Database Query Result

No job seeker records found in the system.

This could mean:
- API connection issue
- Database is empty
- Access permissions problem

Please check the system status or contact technical support.`,
          type: 'database_query'
        };
      }
      // Analyze job seeker data
      const stats = this.analyzeJobSeekerData(jobSeekers);
      
      // Format response
      let response = `Database Query Results (Real-Time Data)

📊 JOB SEEKER OVERVIEW:
- Total Registered: ${stats.total}
- Active Profiles: ${stats.active}
- Inactive Profiles: ${stats.inactive}
- Profile Completion Rate: ${stats.avgCompletion}%

📍 LOCATION DISTRIBUTION:
${stats.locationBreakdown.slice(0, 5).map((loc, idx) => 
  `${idx + 1}. ${loc.location}: ${loc.count} job seekers (${loc.percentage}%)`
).join('\n')}

📋 PROFILE STATUS:
- Complete Profiles (100%): ${stats.completeProfiles}
- Incomplete Profiles: ${stats.incompleteProfiles}
- Recently Updated (7 days): ${stats.recentlyUpdated}

💼 TOP JOB CATEGORIES:
${stats.categoryBreakdown.slice(0, 5).map((cat, idx) => 
  `${idx + 1}. ${cat.category}: ${cat.count} job seekers`
).join('\n')}

✅ SUGGESTED ACTIONS:
1. Send reminders to incomplete profiles (${stats.incompleteProfiles} users)
2. Generate detailed analytics report
3. Filter by specific criteria (location, category, status)
4. Export data for external analysis
5. Review user engagement trends

Would you like me to:
- Send profile completion reminders?
- Show detailed breakdown for specific location?
- Filter by job category or experience level?
- Generate export report?`;

      return {
        message: response,
        type: 'database_query'
      };
      
    } catch (error) {
      logger.error('Error handling database query with real API', { error: error.message });
      
      // Fallback to local database if API fails
      return this.handleDatabaseQueryFallback();
    }
  }

  /**
   * NEW: Handle profile completion reminders
   */
  async handleProfileReminders(message) {
    try {
      logger.info('Fetching incomplete profiles for reminder campaign...');
      
      // Fetch incomplete profiles from Kozi API
      const incompleteProfiles = await this.koziApi.getIncompleteProfiles(true);
      
      if (!incompleteProfiles || incompleteProfiles.length === 0) {
        return {
          message: `Profile Completion Status

🎉 Great news! All user profiles are complete!

No reminders needed at this time.

SUGGESTED ACTIONS:
- Review profile quality metrics
- Monitor new registrations
- Generate completion rate report

Would you like me to show overall profile statistics?`,
          type: 'email_summary'
        };
      }

      // Check if user wants to send emails
      const shouldSendEmails = message.toLowerCase().includes('send') || 
                               message.toLowerCase().includes('email');

      if (shouldSendEmails) {
        // Send reminder emails
        logger.info('Sending profile completion reminder emails...', { 
          count: incompleteProfiles.length 
        });

        const emailResults = [];
        let successCount = 0;
        let failCount = 0;

        // Send emails in batches to avoid overwhelming the email server
        const batchSize = 10;
        for (let i = 0; i < incompleteProfiles.length; i += batchSize) {
          const batch = incompleteProfiles.slice(i, i + batchSize);
          
          for (const profile of batch) {
            try {
              const result = await this.emailService.sendProfileCompletionReminder({
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
              
              emailResults.push(result);

              // Small delay between emails
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              logger.error('Failed to send reminder email', { 
                email: profile.email, 
                error: error.message 
              });
              failCount++;
            }
          }

          // Longer delay between batches
          if (i + batchSize < incompleteProfiles.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        return {
          message: `✉️ Profile Completion Reminder Campaign

📤 EMAILS SENT:
- Total Recipients: ${incompleteProfiles.length}
- Successfully Sent: ${successCount}
- Failed: ${failCount}
- Success Rate: ${Math.round((successCount / incompleteProfiles.length) * 100)}%

📊 TARGET BREAKDOWN:
${this.getProfileCompletionBreakdown(incompleteProfiles)}

✅ CAMPAIGN COMPLETED

Next Steps:
- Monitor email open rates
- Track profile completion improvements
- Follow up with non-responders in 7 days

Would you like me to:
- Show detailed sending report?
- Schedule follow-up campaign?
- Generate analytics dashboard?`,
          type: 'email_summary'
        };

      } else {
        // Just show statistics
        return {
          message: `Profile Completion Analysis

📊 INCOMPLETE PROFILES SUMMARY:
- Total Incomplete: ${incompleteProfiles.length}
- Avg Completion: ${Math.round(
            incompleteProfiles.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / 
            incompleteProfiles.length
          )}%

📋 BREAKDOWN BY COMPLETION:
${this.getProfileCompletionBreakdown(incompleteProfiles)}

📍 TOP LOCATIONS WITH INCOMPLETE PROFILES:
${this.getLocationBreakdown(incompleteProfiles)}

⚠️ COMMON MISSING FIELDS:
${this.getMissingFieldsAnalysis(incompleteProfiles)}

✅ SUGGESTED ACTIONS:
1. Send email reminders to all ${incompleteProfiles.length} users
2. Target users with <50% completion first
3. Offer incentives for profile completion
4. Provide step-by-step completion guide
5. Schedule follow-up reminders

Would you like me to:
- Send reminder emails now?
- Show detailed user list?
- Filter by completion percentage?
- Generate export report?`,
          type: 'email_summary'
        };
      }
      
    } catch (error) {
      logger.error('Error handling profile reminders', { error: error.message });
      return {
        message: 'Sorry, I encountered an error processing profile reminder request. Please try again.',
        type: 'text'
      };
    }
  }

  // ... keep existing handleEmailQuery and handleAnalyticsQuery methods ...

  /**
   * Helper: Analyze job seeker data
   */
  analyzeJobSeekerData(jobSeekers) {
    const total = jobSeekers.length;
    const active = jobSeekers.filter(js => js.status === 'active' || js.is_active).length;
    const inactive = total - active;
    
    // Calculate average completion
    const totalCompletion = jobSeekers.reduce((sum, js) => 
      sum + (js.profile_completion || js.completion_percentage || 0), 0
    );
    const avgCompletion = Math.round(totalCompletion / total);
    
    // Location breakdown
    const locationMap = new Map();
    jobSeekers.forEach(js => {
      const loc = js.location || 'Unknown';
      locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
    });
    const locationBreakdown = Array.from(locationMap.entries())
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    // Profile completion stats
    const completeProfiles = jobSeekers.filter(js => 
      (js.profile_completion || js.completion_percentage || 0) === 100
    ).length;
    const incompleteProfiles = total - completeProfiles;
    
    // Recently updated (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyUpdated = jobSeekers.filter(js => {
      const updatedDate = new Date(js.updated_at || js.last_updated);
      return updatedDate >= sevenDaysAgo;
    }).length;
    
    // Category breakdown
    const categoryMap = new Map();
    jobSeekers.forEach(js => {
      const cat = js.job_category || js.category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      total,
      active,
      inactive,
      avgCompletion,
      locationBreakdown,
      completeProfiles,
      incompleteProfiles,
      recentlyUpdated,
      categoryBreakdown
    };
  }

  /**
   * Helper: Get profile completion breakdown
   */
  getProfileCompletionBreakdown(profiles) {
    const ranges = [
      { min: 0, max: 25, label: '0-25%' },
      { min: 26, max: 50, label: '26-50%' },
      { min: 51, max: 75, label: '51-75%' },
      { min: 76, max: 99, label: '76-99%' }
    ];
    
    const breakdown = ranges.map(range => {
      const count = profiles.filter(p => {
        const completion = p.completion_percentage || p.profile_completion || 0;
        return completion >= range.min && completion <= range.max;
      }).length;
      
      return `- ${range.label}: ${count} users (${Math.round((count / profiles.length) * 100)}%)`;
    }).join('\n');
    
    return breakdown;
  }

  /**
   * Helper: Get location breakdown
   */
  getLocationBreakdown(profiles) {
    const locationMap = new Map();
    profiles.forEach(p => {
      const loc = p.location || 'Unknown';
      locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
    });
    
    const breakdown = Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, idx) => `${idx + 1}. ${item.location}: ${item.count} users`)
      .join('\n');
    
    return breakdown;
  }

  /**
   * Helper: Get missing fields analysis
   */
  getMissingFieldsAnalysis(profiles) {
    const fieldMap = new Map();
    
    profiles.forEach(p => {
      const missing = p.missing_fields || [];
      missing.forEach(field => {
        fieldMap.set(field, (fieldMap.get(field) || 0) + 1);
      });
    });
    
    const breakdown = Array.from(fieldMap.entries())
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, idx) => `${idx + 1}. ${item.field}: Missing in ${item.count} profiles`)
      .join('\n');
    
    return breakdown || 'No specific missing fields data available';
  }

  /**
   * Fallback methods for when API is unavailable
   */
  async handlePaymentQueryFallback() {
    logger.warn('Using fallback payment data from local database');
    
    try {
      const [paymentSchedules] = await pool.execute(`
        SELECT * FROM payment_schedules 
        WHERE status = 'pending' 
        ORDER BY due_date ASC 
        LIMIT 5
      `);
      
      if (paymentSchedules.length === 0) {
        return {
          message: `Payment Status Update (Local Data)

⚠️ Note: Using cached data. Real-time API unavailable.

No pending salary payments found.

Suggested Actions:
- Check API connection
- Review completed payments
- Contact technical support`,
          type: 'payment_reminder'
        };
      }
      
      const nextPayment = paymentSchedules[0];
      const daysUntilDue = Math.ceil((new Date(nextPayment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        message: `Payment Reminder (Local Data)

⚠️ Note: Using cached data. Real-time API unavailable.

Upcoming Salary Payment:
- Period: ${nextPayment.payment_period}
- Due Date: ${new Date(nextPayment.due_date).toLocaleDateString()}
- Days Remaining: ${daysUntilDue} days
- Employees: ${nextPayment.employee_count}
- Total Amount: RWF ${nextPayment.total_amount.toLocaleString()}

Suggested Actions:
1. Restore API connection for real-time data
2. Generate payment report
3. Verify bank account details`,
        type: 'payment_reminder'
      };
      
    } catch (error) {
      logger.error('Fallback payment query also failed', { error: error.message });
      return {
        message: 'Unable to retrieve payment information. Please check system status.',
        type: 'text'
      };
    }
  }

  async handleDatabaseQueryFallback() {
    logger.warn('Using fallback database data');
    
    try {
      const [employeeStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_employees,
          SUM(CASE WHEN employment_status = 'active' THEN 1 ELSE 0 END) as active_employees,
          COUNT(DISTINCT location) as locations
        FROM platform_employees
      `);
      
      const emp = employeeStats[0];
      
      return {
        message: `Database Summary (Local Data)

⚠️ Note: Using cached data. Real-time API unavailable.

Employee Overview:
- Total Employees: ${emp.total_employees}
- Active: ${emp.active_employees}
- Locations: ${emp.locations}

Suggested Actions:
1. Restore API connection for real-time data
2. Contact technical support
3. Check system status`,
        type: 'database_query'
      };
      
    } catch (error) {
      logger.error('Fallback database query also failed', { error: error.message });
      return {
        message: 'Unable to retrieve database information. Please check system status.',
        type: 'text'
      };
    }
  }

  // ... keep all other existing methods (validateAdminUser, createAdminSession, etc.) ...
}

module.exports = chatController;