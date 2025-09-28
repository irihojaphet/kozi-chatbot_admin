const express = require('express');
const { ProfileController } = require('../controllers');
const logger = require('../core/utils/logger');

const router = express.Router();
const profileController = new ProfileController();

// POST /api/profile/user - Create new user
router.post('/user', async (req, res) => {
  try {
    logger.info('Admin profile creation request', { 
      email: req.body.email, 
      user_type: req.body.user_type 
    });
    await profileController.createUser(req, res);
  } catch (error) {
    logger.error('Error in admin profile user creation', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    res.status(500).json({ 
      success: false, 
      error: `Profile creation failed: ${error.message}` 
    });
  }
});

// GET /api/profile/user/:email - Get user by email
router.get('/user/:email', async (req, res) => {
  try {
    logger.info('Admin profile lookup request', { email: req.params.email });
    await profileController.getUserByEmail(req, res);
  } catch (error) {
    logger.error('Error in admin profile lookup by email', { 
      error: error.message, 
      stack: error.stack,
      email: req.params.email 
    });
    res.status(500).json({ 
      success: false, 
      error: `Profile lookup failed: ${error.message}` 
    });
  }
});

// GET /api/profile/:user_id - Get user profile
router.get('/:user_id', async (req, res) => {
  try {
    logger.info('Admin profile get request', { user_id: req.params.user_id });
    await profileController.getProfile(req, res);
  } catch (error) {
    logger.error('Error getting admin profile', { 
      error: error.message, 
      stack: error.stack,
      user_id: req.params.user_id 
    });
    res.status(500).json({ 
      success: false, 
      error: `Get profile failed: ${error.message}` 
    });
  }
});

// PUT /api/profile/:user_id - Update user profile
router.put('/:user_id', async (req, res) => {
  try {
    logger.info('Admin profile update request', { user_id: req.params.user_id });
    await profileController.updateProfile(req, res);
  } catch (error) {
    logger.error('Error updating admin profile', { 
      error: error.message, 
      stack: error.stack,
      user_id: req.params.user_id 
    });
    res.status(500).json({ 
      success: false, 
      error: `Profile update failed: ${error.message}` 
    });
  }
});

// POST /api/profile/:user_id/document - Upload document
router.post('/:user_id/document', async (req, res) => {
  try {
    logger.info('Admin document upload request', { user_id: req.params.user_id });
    await profileController.uploadDocument(req, res);
  } catch (error) {
    logger.error('Error in admin document upload', { 
      error: error.message, 
      stack: error.stack,
      user_id: req.params.user_id 
    });
    res.status(500).json({ 
      success: false, 
      error: `Document upload failed: ${error.message}` 
    });
  }
});

// GET /api/profile/:user_id/guidance - Get profile completion guidance
router.get('/:user_id/guidance', async (req, res) => {
  try {
    logger.info('Admin guidance request', { user_id: req.params.user_id });
    await profileController.getGuidance(req, res);
  } catch (error) {
    logger.error('Error getting admin guidance', { 
      error: error.message, 
      stack: error.stack,
      user_id: req.params.user_id 
    });
    res.status(500).json({ 
      success: false, 
      error: `Guidance request failed: ${error.message}` 
    });
  }
});

module.exports = router;