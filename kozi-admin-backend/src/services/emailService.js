const nodemailer = require('nodemailer');
const logger = require('../core/utils/logger');
const env = require('../config/environment');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST || 'server360.web-hosting.com',
      port: parseInt(env.EMAIL_PORT) || 465,
      secure: env.EMAIL_SECURE !== 'false', // true for 465, false for other ports
      auth: {
        user: env.EMAIL_USER || 'no-reply@kozi.rw',
        pass: env.EMAIL_PASSWORD
      }
    });

    this.from = {
      name: env.EMAIL_FROM_NAME || 'Kozi Platform',
      address: env.EMAIL_FROM || 'no-reply@kozi.rw'
    };

    // Verify connection on initialization
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error: error.message });
      return false;
    }
  }

  /**
   * Send profile completion reminder
   */
  async sendProfileCompletionReminder(recipient) {
    const { email, full_name, completion_percentage, missing_fields } = recipient;

    const subject = '⚡ Complete Your Kozi Profile Today!';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .progress-bar { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
    .progress-fill { background: linear-gradient(90deg, #10b981, #059669); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; transition: width 0.3s; }
    .missing-items { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .missing-item { padding: 10px; margin: 5px 0; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 5px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 You're Almost There!</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${full_name || 'there'}</strong>,</p>
      
      <p>Your Kozi profile is <strong>${completion_percentage}%</strong> complete. Just a few more steps to unlock all opportunities!</p>
      
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${completion_percentage}%">
          ${completion_percentage}%
        </div>
      </div>
      
      <div class="missing-items">
        <h3>📋 Complete these to reach 100%:</h3>
        ${missing_fields.map(field => `
          <div class="missing-item">
            ✅ ${field}
          </div>
        `).join('')}
      </div>
      
      <p><strong>Why complete your profile?</strong></p>
      <ul>
        <li>🎯 Get matched with better job opportunities</li>
        <li>⚡ Stand out to employers</li>
        <li>💼 Increase your chances of getting hired</li>
        <li>🌟 Access exclusive features</li>
      </ul>
      
      <center>
        <a href="https://kozi.rw/profile" class="cta-button">
          Complete My Profile Now
        </a>
      </center>
      
      <p>Need help? Reply to this email or contact us at <strong>support@kozi.rw</strong></p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Kozi Platform. All rights reserved.</p>
      <p>Kigali-Kacyiru, KG 647 St | +250 788 719 678</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Hi ${full_name || 'there'},

Your Kozi profile is ${completion_percentage}% complete.

Complete these items to reach 100%:
${missing_fields.map(field => `- ${field}`).join('\n')}

Why complete your profile?
- Get matched with better job opportunities
- Stand out to employers
- Increase your chances of getting hired

Complete your profile now: https://kozi.rw/profile

Need help? Contact us at support@kozi.rw

© ${new Date().getFullYear()} Kozi Platform
Kigali-Kacyiru, KG 647 St | +250 788 719 678
    `;

    return this.sendEmail({
      to: email,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * Send payroll notification
   */
  async sendPayrollNotification(recipient, payrollData) {
    const { email, full_name } = recipient;
    const { amount, period, due_date, status } = payrollData;

    const subject = `💰 Payroll Update: ${period}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .payroll-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .amount { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .status-pending { background: #fef3c7; color: #f59e0b; }
    .status-processing { background: #dbeafe; color: #3b82f6; }
    .status-completed { background: #d1fae5; color: #10b981; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Payroll Notification</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${full_name || 'there'}</strong>,</p>
      
      <p>Here's your payroll information for <strong>${period}</strong>:</p>
      
      <div class="payroll-card">
        <div class="amount">RWF ${amount.toLocaleString()}</div>
        
        <div class="info-row">
          <span>Period:</span>
          <strong>${period}</strong>
        </div>
        
        <div class="info-row">
          <span>Due Date:</span>
          <strong>${new Date(due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        </div>
        
        <div class="info-row">
          <span>Status:</span>
          <span class="status-badge status-${status.toLowerCase()}">${status}</span>
        </div>
      </div>
      
      <p>If you have any questions about your payroll, please contact our finance team at <strong>finance@kozi.rw</strong></p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Kozi Platform. All rights reserved.</p>
      <p>Kigali-Kacyiru, KG 647 St | +250 788 719 678</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Hi ${full_name || 'there'},

Payroll information for ${period}:

Amount: RWF ${amount.toLocaleString()}
Period: ${period}
Due Date: ${new Date(due_date).toLocaleDateString()}
Status: ${status}

Questions? Contact finance@kozi.rw

© ${new Date().getFullYear()} Kozi Platform
    `;

    return this.sendEmail({
      to: email,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * Generic send email method
   */
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: this.from,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', { 
        to, 
        subject, 
        messageId: info.messageId 
      });

      return {
        success: true,
        messageId: info.messageId,
        recipient: to
      };
    } catch (error) {
      logger.error('Email send failed', { 
        to, 
        subject, 
        error: error.message 
      });

      return {
        success: false,
        error: error.message,
        recipient: to
      };
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(recipients, emailData, delayMs = 1000) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          to: recipient.email,
          ...emailData
        });
        results.push(result);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        logger.error('Bulk email error', { 
          recipient: recipient.email, 
          error: error.message 
        });
        results.push({
          success: false,
          error: error.message,
          recipient: recipient.email
        });
      }
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = EmailService;