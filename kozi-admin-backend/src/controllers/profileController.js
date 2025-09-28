const { pool } = require('../core/db/connection'); // Use pool instead of db
const logger = require('../core/utils/logger');
const crypto = require('crypto');

class profileController {
  
  async createUser(req, res) {
    try {
      const { email, user_type = 'admin', full_name, department, role } = req.body;
      
      // Validate required fields
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }
      
      // Check if user already exists
      const [existingUser] = await pool.execute(
        'SELECT user_id FROM user_profiles WHERE email = ?',
        [email]
      );
      
      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Admin user already exists'
        });
      }
      
      // Generate unique user ID
      const userId = `admin_${crypto.randomUUID()}`;
      
      // Insert new admin user
      await pool.execute(
        `INSERT INTO user_profiles (user_id, email, user_type, full_name, department, role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [userId, email, user_type, full_name || null, department || null, role || null]
      );
      
      // Fetch the created user
      const [newUser] = await pool.execute(
        'SELECT user_id, email, user_type, full_name, department, role, created_at FROM user_profiles WHERE user_id = ?',
        [userId]
      );
      
      logger.info('Admin user created successfully', { userId, email });
      
      res.status(201).json({
        success: true,
        data: newUser[0]
      });
      
    } catch (error) {
      logger.error('Error creating admin user', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to create admin user'
      });
    }
  }

  async getUserByEmail(req, res) {
    try {
      const { email } = req.params;
      
      const [users] = await pool.execute(
        `SELECT user_id, email, user_type, full_name, department, role, 
                created_at, last_login, is_active 
         FROM user_profiles 
         WHERE email = ? AND user_type IN ('admin', 'super_admin')`,
        [email]
      );
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Admin user not found'
        });
      }
      
      // Update last login
      await pool.execute(
        'UPDATE user_profiles SET last_login = NOW() WHERE email = ?',
        [email]
      );
      
      res.json({
        success: true,
        data: users[0]
      });
      
    } catch (error) {
      logger.error('Error fetching admin user by email', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin user'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const { user_id } = req.params;
      
      const [users] = await pool.execute(
        `SELECT user_id, email, user_type, full_name, department, role, 
                permissions, created_at, last_login, is_active 
         FROM user_profiles 
         WHERE user_id = ? AND user_type IN ('admin', 'super_admin')`,
        [user_id]
      );
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Admin profile not found'
        });
      }
      
      res.json({
        success: true,
        data: users[0]
      });
      
    } catch (error) {
      logger.error('Error fetching admin profile', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { user_id } = req.params;
      const { full_name, department, role, permissions } = req.body;
      
      // Check if user exists
      const [existingUser] = await pool.execute(
        'SELECT user_id FROM user_profiles WHERE user_id = ? AND user_type IN ("admin", "super_admin")',
        [user_id]
      );
      
      if (existingUser.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Admin user not found'
        });
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      
      if (full_name !== undefined) {
        updates.push('full_name = ?');
        values.push(full_name);
      }
      
      if (department !== undefined) {
        updates.push('department = ?');
        values.push(department);
      }
      
      if (role !== undefined) {
        updates.push('role = ?');
        values.push(role);
      }
      
      if (permissions !== undefined) {
        updates.push('permissions = ?');
        values.push(JSON.stringify(permissions));
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }
      
      updates.push('updated_at = NOW()');
      values.push(user_id);
      
      // Execute update
      await pool.execute(
        `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
      
      // Fetch updated profile
      const [updatedUser] = await pool.execute(
        `SELECT user_id, email, user_type, full_name, department, role, 
                permissions, updated_at 
         FROM user_profiles 
         WHERE user_id = ?`,
        [user_id]
      );
      
      logger.info('Admin profile updated successfully', { user_id });
      
      res.json({
        success: true,
        data: updatedUser[0]
      });
      
    } catch (error) {
      logger.error('Error updating admin profile', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to update admin profile'
      });
    }
  }

  async uploadDocument(req, res) {
    // Placeholder for document upload functionality
    res.json({
      success: true,
      message: 'Document upload not implemented for admin users'
    });
  }

  async getGuidance(req, res) {
    // Admin-specific guidance
    res.json({
      success: true,
      data: {
        message: 'Admin profile guidance',
        steps: [
          'Complete your admin profile information',
          'Set your department and role',
          'Configure admin permissions',
          'Review platform management tools'
        ]
      }
    });
  }
}

module.exports = profileController;