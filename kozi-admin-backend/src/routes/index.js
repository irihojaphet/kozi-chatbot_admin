const express = require('express');
const chatRoutes = require('./chat');
const profileRoutes = require('./profile');
const healthRoutes = require('./health');
const adminRoutes = require('./admin'); // New admin-specific routes

const router = express.Router();

// Mount route modules
router.use('/chat', chatRoutes);
router.use('/profile', profileRoutes);
router.use('/health', healthRoutes);
router.use('/admin', adminRoutes); // Admin-specific endpoints

// Root API endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Kozi Admin Bot API',
    version: '1.0.0',
    bot_type: 'admin',
    endpoints: {
      chat: '/api/chat',
      profile: '/api/profile',
      health: '/api/health',
      admin: '/api/admin'
    }
  });
});

module.exports = router;