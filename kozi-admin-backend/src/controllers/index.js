// src/controllers/index.js
const ChatController = require('./chatController'); // Should be AdminChatController
const ProfileController = require('./profileController'); // Should be AdminProfileController

module.exports = {
  ChatController,
  ProfileController
};