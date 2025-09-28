const express = require('express');
const path = require('path');

// Load environment configuration
const env = require('./src/config/environment');

// Import utilities and middleware
const logger = require('./src/core/utils/logger');
const { testConnection } = require('./src/core/db/connection');
const setupMiddleware = require('./src/core/middleware/requestMiddleware');
const { errorHandler, notFoundHandler } = require('./src/core/middleware/errorHandler');

// Import routes
const apiRoutes = require('./src/routes');

class KoziAdminServer {
  constructor() {
    this.app = express();
    this.port = env.PORT || 3002; // Different port for admin
  }

  async initialize() {
    try {
      // Setup middleware
      setupMiddleware(this.app);
      
      // Test database connection
      const dbConnected = await testConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Load admin knowledge base
      logger.info('Loading Kozi Admin knowledge base...');
      const KnowledgeLoader = require('./src/services/knowledgeLoader');
      const knowledgeLoader = new KnowledgeLoader();
      await knowledgeLoader.loadKoziKnowledge(); // Use existing method name
      logger.info('Admin knowledge base loaded successfully');

      // Setup routes
      this.setupRoutes();
      
      // Setup error handling (must be last)
      this.setupErrorHandling();
      
      logger.info('Admin server initialized successfully');
    } catch (error) {
      logger.error('Admin server initialization failed', { error: error.message });
      throw error;
    }
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Kozi Admin Bot API',
        version: '1.0.0',
        status: 'running',
        bot_type: 'admin',
        endpoints: {
          health: '/api/health',
          chat: '/api/chat',
          profile: '/api/profile',
          admin: '/api/admin'
        },
        demo: '/demo'
      });
    });

    // Admin dashboard route
    this.app.get('/admin', (req, res) => {
      res.json({
        message: 'Kozi Admin Dashboard',
        bot_type: 'admin',
        features: [
          'Payment Reminders',
          'Database Management', 
          'Email Processing',
          'Platform Analytics'
        ]
      });
    });

    // Demo frontend route (if needed)
    this.app.get('/demo', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      await this.initialize();
      
      this.server = this.app.listen(this.port, () => {
        logger.info(`Kozi Admin Bot Server running on port ${this.port}`, {
          environment: env.NODE_ENV,
          port: this.port,
          bot_type: 'admin',
          endpoints: {
            api: `http://localhost:${this.port}/api`,
            health: `http://localhost:${this.port}/api/health`,
            admin: `http://localhost:${this.port}/admin`,
            demo: `http://localhost:${this.port}/demo`
          }
        });
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start admin server', { error: error.message });
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = (signal) => {
      logger.info(`Received ${signal}. Shutting down admin server gracefully...`);
      
      if (this.server) {
        this.server.close(() => {
          logger.info('Admin server closed successfully');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new KoziAdminServer();
  server.start();
}

module.exports = KoziAdminServer;