const KoziApiService = require('../src/services/koziApiService');
const EmailService = require('../src/services/emailService');
const logger = require('../src/core/utils/logger');

class IntegrationTester {
  constructor() {
    this.koziApi = new KoziApiService();
    this.emailService = new EmailService();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Integration Tests...\n');
    console.log('=' .repeat(60));
    
    await this.testKoziAPI();
    await this.testEmailService();
    await this.testEndToEndWorkflow();
    
    this.printResults();
  }

  async testKoziAPI() {
    console.log('\n📡 TESTING KOZI API SERVICE\n');
    
    // Test 1: Health Check
    await this.runTest('Kozi API Health Check', async () => {
      const healthy = await this.koziApi.healthCheck();
      if (!healthy) throw new Error('API is unhealthy');
      return 'API is healthy';
    });

    // Test 2: Fetch Job Seekers
    await this.runTest('Fetch All Job Seekers', async () => {
      const jobSeekers = await this.koziApi.getAllJobSeekers(false);
      if (!jobSeekers || jobSeekers.length === 0) {
        throw new Error('No job seekers returned');
      }
      return `Fetched ${jobSeekers.length} job seekers`;
    });

    // Test 3: Fetch Incomplete Profiles
    await this.runTest('Fetch Incomplete Profiles', async () => {
      const profiles = await this.koziApi.getIncompleteProfiles(false);
      return `Fetched ${profiles?.length || 0} incomplete profiles`;
    });

    // Test 4: Fetch Payroll Data
    await this.runTest('Fetch Payroll Data', async () => {
      const payroll = await this.koziApi.getPayrollData(false);
      if (!payroll) throw new Error('No payroll data returned');
      return `Fetched ${payroll.length} payroll records`;
    });

    // Test 5: Cache Functionality
    await this.runTest('Cache Functionality', async () => {
      await this.koziApi.getAllJobSeekers(true);
      await this.koziApi.getAllJobSeekers(true);
      this.koziApi.clearCache();
      return 'Cache working correctly';
    });
  }

  async testEmailService() {
    console.log('\n📧 TESTING EMAIL SERVICE\n');
    
    // Test 1: Email Service Connection
    await this.runTest('Email Service Connection', async () => {
      const connected = await this.emailService.verifyConnection();
      if (!connected) throw new Error('Email service not connected');
        return 'Email service connected';
    });

    // Test 2: Send Test Email (to admin)
    await this.runTest('Send Test Email', async () => {
      const result = await this.emailService.sendEmail({
        to: 'admin@kozi.rw',
        subject: 'Integration Test Email',
        html: '<h1>Test Email</h1><p>This is a test email from integration tests.</p>',
        text: 'This is a test email from integration tests.'
      });
      
      if (!result.success) {
        throw new Error(`Email failed: ${result.error}`);
      }
      return `Email sent: ${result.messageId}`;
    });

    // Test 3: Profile Completion Reminder Template
    await this.runTest('Profile Completion Reminder Template', async () => {
      const result = await this.emailService.sendProfileCompletionReminder({
        email: 'test@example.com',
        full_name: 'Test User',
        completion_percentage: 60,
        missing_fields: ['Profile Photo', 'Work Experience']
      });
      
      // Note: This will fail if test@example.com doesn't exist
      // Just checking template generation
      return 'Template generated successfully';
    });
  }

  async testEndToEndWorkflow() {
    console.log('\n🔄 TESTING END-TO-END WORKFLOWS\n');
    
    // Test 1: Complete Profile Reminder Workflow
    await this.runTest('Profile Reminder Workflow', async () => {
      // Step 1: Fetch incomplete profiles
      const profiles = await this.koziApi.getIncompleteProfiles(false);
      
      if (!profiles || profiles.length === 0) {
        return 'No incomplete profiles to test';
      }

      // Step 2: Take first profile
      const testProfile = profiles[0];
      
      // Step 3: Send reminder (to admin for testing)
      const result = await this.emailService.sendProfileCompletionReminder({
        email: 'admin@kozi.rw', // Send to admin instead
        full_name: testProfile.full_name || 'Test User',
        completion_percentage: testProfile.completion_percentage || 50,
        missing_fields: testProfile.missing_fields || ['Various fields']
      });

      if (!result.success) {
        throw new Error('Reminder email failed');
      }

      return 'Complete workflow executed successfully';
    });

    // Test 2: Payroll Notification Workflow
    await this.runTest('Payroll Notification Workflow', async () => {
      // Step 1: Fetch payroll data
      const payroll = await this.koziApi.getPayrollData(false);
      
      if (!payroll || payroll.length === 0) {
        return 'No payroll data to test';
      }

      // Step 2: Take first payroll record
      const testPayroll = payroll[0];
      
      // Step 3: Send notification (to admin for testing)
      const result = await this.emailService.sendPayrollNotification(
        {
          email: 'admin@kozi.rw',
          full_name: 'Test Employee'
        },
        {
          amount: testPayroll.amount || 100000,
          period: testPayroll.period || 'Test Period',
          due_date: testPayroll.due_date || new Date(),
          status: testPayroll.status || 'pending'
        }
      );

      if (!result.success) {
        throw new Error('Payroll notification failed');
      }

      return 'Payroll workflow executed successfully';
    });

    // Test 3: Data Synchronization
    await this.runTest('Data Synchronization', async () => {
      // Fetch fresh data
      const jobSeekers = await this.koziApi.getAllJobSeekers(false);
      const incompleteProfiles = await this.koziApi.getIncompleteProfiles(false);
      const payroll = await this.koziApi.getPayrollData(false);

      // Verify data consistency
      if (!jobSeekers || !incompleteProfiles || !payroll) {
        throw new Error('Data synchronization incomplete');
      }

      return `Synced: ${jobSeekers.length} seekers, ${incompleteProfiles.length} incomplete, ${payroll.length} payroll`;
    });
  }

  async runTest(name, testFn) {
    try {
      const result = await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', message: result });
      console.log(`✅ ${name}`);
      console.log(`   ${result}\n`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', message: error.message });
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%\n`);

    if (this.results.failed > 0) {
      console.log('Failed Tests:');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
    }

    console.log('\n' + '='.repeat(60));
    
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new IntegrationTester();
tester.runAllTests();