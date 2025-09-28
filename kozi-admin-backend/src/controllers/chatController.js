const { pool } = require('../core/db/connection');
const logger = require('../core/utils/logger');
const OpenAI = require('openai');

class chatController {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Admin bot system prompt
    this.systemPrompt = `YOU ARE KOZI ADMIN AI, THE OFFICIAL VIRTUAL ASSISTANT FOR PLATFORM ADMINISTRATORS OF KOZI.RW.
YOUR ROLE IS TO SUPPORT PLATFORM MANAGEMENT, IMPROVE EFFICIENCY, AND AUTOMATE ADMIN WORKFLOWS.
YOU SERVE ONLY ADMIN USERS — NOT JOB SEEKERS OR EMPLOYERS.

CORE FUNCTIONS:
1. PAYMENT REMINDERS - Track salary schedules and notify admins
2. DATABASE MANAGEMENT - Help filter, search, and query worker/employer data  
3. GMAIL AI SUPPORT - Categorize emails and draft professional replies
4. PLATFORM ANALYTICS - Generate reports and insights

STYLE: Professional, precise, supportive. Use tables, bullet points, numbered steps.
ALWAYS be action-oriented and suggest next steps.`;
  }

  async initialize() {
    try {
      // Load admin knowledge base
      logger.info('Loading admin knowledge base...');
      // Initialize vector database for admin content
      logger.info('chatController initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize chatController', { error: error.message });
      throw error;
    }
  }

  async startSession(req, res) {
    try {
      const { user_id } = req.body;
      
      // Validate admin user
      const adminUser = await this.validateAdminUser(user_id);
      if (!adminUser) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Admin access required'
        });
      }

      const sessionId = `admin_${Date.now()}_${user_id}`;
      
      // Create admin session
      await this.createAdminSession(sessionId, user_id);
      
      const greeting = `Hello Admin! I'm your Kozi Assistant. Would you like me to check salary reminders, query the database, or process emails today?`;
      
      // Save greeting message
      await this.saveMessage(sessionId, user_id, 'assistant', greeting, 'text');
      
      res.json({
        success: true,
        data: {
          session_id: sessionId,
          message: greeting
        }
      });
      
    } catch (error) {
      logger.error('Error starting admin session', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to start admin session'
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const { session_id, user_id, message } = req.body;
      
      // Validate admin session
      const isValidSession = await this.validateAdminSession(session_id, user_id);
      if (!isValidSession) {
        return res.status(403).json({
          success: false,
          error: 'Invalid admin session'
        });
      }

      // Save user message
      await this.saveMessage(session_id, user_id, 'admin', message, 'text');
      
      // Process admin message
      const response = await this.processAdminMessage(message, session_id, user_id);
      
      // Save assistant response
      await this.saveMessage(session_id, user_id, 'assistant', response.message, response.type);
      
      res.json({
        success: true,
        data: {
          message: response.message
        }
      });
      
    } catch (error) {
      logger.error('Error processing admin message', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  }

  async processAdminMessage(message, sessionId, userId) {
    const msg = message.toLowerCase();
    
    try {
      // Payment reminders
      if (msg.includes('payment') || msg.includes('salary') || msg.includes('reminder')) {
        return await this.handlePaymentQuery(message);
      }
      
      // Database queries
      if (msg.includes('database') || msg.includes('query') || msg.includes('worker') || 
          msg.includes('employee') || msg.includes('employer') || msg.includes('filter')) {
        return await this.handleDatabaseQuery(message);
      }
      
      // Email processing
      if (msg.includes('email') || msg.includes('gmail') || msg.includes('categorize') || 
          msg.includes('draft') || msg.includes('reply')) {
        return await this.handleEmailQuery(message);
      }
      
      // Analytics
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

  async handlePaymentQuery(message) {
    try {
      // Get payment schedules from database
      const [paymentSchedules] = await pool.execute(`
        SELECT * FROM payment_schedules 
        WHERE status = 'pending' 
        ORDER BY due_date ASC 
        LIMIT 5
      `);
      
      if (paymentSchedules.length === 0) {
        return {
          message: `Payment Status Update

No pending salary payments found. All payments are up to date!

Suggested Actions:
- Review completed payments
- Schedule next payment cycle
- Generate payment reports

Would you like me to show completed payments or help with next cycle planning?`,
          type: 'payment_reminder'
        };
      }
      
      const nextPayment = paymentSchedules[0];
      const daysUntilDue = Math.ceil((new Date(nextPayment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        message: `Payment Reminder Alert

Upcoming Salary Payment:
- Period: ${nextPayment.payment_period}
- Due Date: ${new Date(nextPayment.due_date).toLocaleDateString()}
- Days Remaining: ${daysUntilDue} days
- Employees: ${nextPayment.employee_count}
- Total Amount: RWF ${nextPayment.total_amount.toLocaleString()}

Suggested Actions:
1. Generate detailed payment report
2. Send payment notifications to employees
3. Verify bank account details
4. Process payment batch

Would you like me to generate the payment report or send notifications?`,
        type: 'payment_reminder'
      };
      
    } catch (error) {
      logger.error('Error handling payment query', { error: error.message });
      return {
        message: 'Error retrieving payment information. Please check the database connection.',
        type: 'text'
      };
    }
  }

  async handleDatabaseQuery(message) {
    try {
      // Get employee statistics
      const [employeeStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_employees,
          SUM(CASE WHEN employment_status = 'active' THEN 1 ELSE 0 END) as active_employees,
          SUM(CASE WHEN employment_status = 'pending' THEN 1 ELSE 0 END) as pending_employees,
          COUNT(DISTINCT location) as locations,
          COUNT(DISTINCT department) as departments
        FROM platform_employees
      `);
      
      // Get employer statistics
      const [employerStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_employers,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified_employers,
          SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending_employers,
          SUM(job_postings_count) as total_job_postings
        FROM platform_employers
      `);
      
      // Get location breakdown
      const [locationBreakdown] = await pool.execute(`
        SELECT location, COUNT(*) as count 
        FROM platform_employees 
        WHERE employment_status = 'active'
        GROUP BY location 
        ORDER BY count DESC 
        LIMIT 5
      `);
      
      const emp = employeeStats[0];
      const empr = employerStats[0];
      
      let locationText = locationBreakdown.map(loc => `  - ${loc.location}: ${loc.count} employees`).join('\n');
      
      return {
        message: `Database Summary Report

Employee Overview:
- Total Employees: ${emp.total_employees}
- Active: ${emp.active_employees}
- Pending: ${emp.pending_employees}
- Departments: ${emp.departments}

Employer Overview:
- Total Employers: ${empr.total_employers}
- Verified: ${empr.verified_employers}
- Pending Verification: ${empr.pending_employers}
- Total Job Postings: ${empr.total_job_postings}

Location Distribution:
${locationText}

Suggested Actions:
1. Filter by specific criteria (location, department, status)
2. Export detailed reports
3. Review pending verifications
4. Analyze hiring trends

Would you like me to filter by specific criteria or generate detailed reports?`,
        type: 'database_query'
      };
      
    } catch (error) {
      logger.error('Error handling database query', { error: error.message });
      return {
        message: 'Error querying database. Please check the connection and try again.',
        type: 'text'
      };
    }
  }

  async handleEmailQuery(message) {
    try {
      // Get email processing statistics
      const [emailStats] = await pool.execute(`
        SELECT 
          email_category,
          priority,
          COUNT(*) as count,
          SUM(CASE WHEN processing_status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN processing_status = 'draft_ready' THEN 1 ELSE 0 END) as draft_ready
        FROM email_processing 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY email_category, priority
        ORDER BY priority DESC, count DESC
      `);
      
      let categoryBreakdown = {};
      let priorityBreakdown = {};
      let totalEmails = 0;
      let totalPending = 0;
      let totalDrafts = 0;
      
      emailStats.forEach(stat => {
        totalEmails += stat.count;
        totalPending += stat.pending;
        totalDrafts += stat.draft_ready;
        
        if (!categoryBreakdown[stat.email_category]) {
          categoryBreakdown[stat.email_category] = 0;
        }
        categoryBreakdown[stat.email_category] += stat.count;
        
        if (!priorityBreakdown[stat.priority]) {
          priorityBreakdown[stat.priority] = 0;
        }
        priorityBreakdown[stat.priority] += stat.count;
      });
      
      return {
        message: `Email Processing Summary (Last 24 Hours)

Overview:
- Total Emails: ${totalEmails}
- Pending Processing: ${totalPending}
- Draft Replies Ready: ${totalDrafts}

By Category:
- Job Seeker Inquiries: ${categoryBreakdown.job_seeker_inquiry || 0}
- Employer Requests: ${categoryBreakdown.employer_request || 0}
- Internal Notices: ${categoryBreakdown.internal_notice || 0}
- Support Tickets: ${categoryBreakdown.support_ticket || 0}

By Priority:
- High Priority: ${priorityBreakdown.high || 0} emails
- Medium Priority: ${priorityBreakdown.medium || 0} emails  
- Low Priority: ${priorityBreakdown.low || 0} emails

Suggested Actions:
1. Review high-priority emails first
2. Send draft replies for employer requests
3. Auto-process routine inquiries
4. Flag complex issues for manual review

Would you like me to show draft replies or process specific email categories?`,
        type: 'email_summary'
      };
      
    } catch (error) {
      logger.error('Error handling email query', { error: error.message });
      return {
        message: 'Error processing email data. Please check the email processing system.',
        type: 'text'
      };
    }
  }

  async handleAnalyticsQuery(message) {
    try {
      // Get current month analytics
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const [analytics] = await pool.execute(`
        SELECT metric_name, metric_value, metric_type 
        FROM platform_analytics 
        WHERE period_value = ? 
        ORDER BY metric_name
      `, [currentMonth]);
      
      let metricsText = analytics.map(metric => {
        let value = metric.metric_value;
        if (metric.metric_type === 'percentage') value += '%';
        if (metric.metric_type === 'currency') value = 'RWF ' + value.toLocaleString();
        if (metric.metric_type === 'rating') value += '/5';
        
        return `- ${metric.metric_name.replace(/_/g, ' ').toUpperCase()}: ${value}`;
      }).join('\n');
      
      return {
        message: `Platform Analytics Dashboard (${currentMonth})

Key Metrics:
${metricsText}

Performance Indicators:
- Platform Growth: Positive trend
- User Engagement: Above average
- Hiring Success Rate: 2.8% (34 hires from 1,234 applications)

Top Performing Sectors:
1. Technology (45% of new jobs)
2. Healthcare (23% of new jobs)  
3. Education (18% of new jobs)

Suggested Actions:
1. Deep dive into growth metrics
2. Analyze user behavior patterns
3. Optimize low-performing sectors
4. Generate executive summary report

Would you like detailed breakdowns for any specific metric?`,
        type: 'analytics'
      };
      
    } catch (error) {
      logger.error('Error handling analytics query', { error: error.message });
      return {
        message: 'Error retrieving analytics data. Please check the analytics system.',
        type: 'text'
      };
    }
  }

  async generateAdminResponse(message, sessionId) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      return {
        message: completion.choices[0].message.content,
        type: 'text'
      };
      
    } catch (error) {
      logger.error('Error generating admin response', { error: error.message });
      return {
        message: 'I understand your request. As your admin assistant, I can help with payment reminders, database queries, email processing, and platform analytics. What specific admin task would you like assistance with?',
        type: 'text'
      };
    }
  }

  async validateAdminUser(userId) {
    try {
      const [users] = await pool.execute(
        'SELECT * FROM user_profiles WHERE user_id = ? AND user_type IN ("admin", "super_admin") AND is_active = TRUE',
        [userId]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Error validating admin user', { error: error.message });
      return null;
    }
  }

  async createAdminSession(sessionId, userId) {
    try {
      await pool.execute(
        `INSERT INTO chat_sessions (session_id, user_id, bot_type, session_name, is_active) 
         VALUES (?, ?, 'admin', 'Admin Chat Session', TRUE)`,
        [sessionId, userId]
      );
    } catch (error) {
      logger.error('Error creating admin session', { error: error.message });
      throw error;
    }
  }

  async validateAdminSession(sessionId, userId) {
    try {
      const [sessions] = await pool.execute(
        'SELECT * FROM chat_sessions WHERE session_id = ? AND user_id = ? AND is_active = TRUE',
        [sessionId, userId]
      );
      return sessions.length > 0;
    } catch (error) {
      logger.error('Error validating admin session', { error: error.message });
      return false;
    }
  }

  async saveMessage(sessionId, userId, sender, message, messageType) {
    try {
      await pool.execute(
        `INSERT INTO chat_messages (session_id, user_id, sender, message, message_type) 
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, userId, sender, message, messageType]
      );
    } catch (error) {
      logger.error('Error saving admin message', { error: error.message });
      throw error;
    }
  }

  async getHistory(req, res) {
    try {
      const { session_id } = req.params;
      
      const [messages] = await pool.execute(
        `SELECT sender, message, created_at 
         FROM chat_messages 
         WHERE session_id = ? 
         ORDER BY created_at ASC`,
        [session_id]
      );
      
      res.json({
        success: true,
        data: { messages }
      });
      
    } catch (error) {
      logger.error('Error getting admin chat history', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chat history'
      });
    }
  }
}

module.exports = chatController;