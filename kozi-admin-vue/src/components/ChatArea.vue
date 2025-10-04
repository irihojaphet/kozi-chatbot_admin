<template>
  <div class="chat-messages">
    <!-- Welcome Screen -->
    <div v-if="showWelcomeScreen" class="welcome-screen">
      <div class="welcome-content">
        <h1>Hello Admin! What would you like to manage today?</h1>
        <p>I'm here to help with payment schedules, database queries, and email management</p>

        <div class="suggestion-cards">
          <div
            v-for="(suggestion, index) in adminSuggestionCards"
            :key="index"
            class="suggestion-card"
            @click="handleSuggestionClick(suggestion.msg)"
          >
            <i :class="suggestion.icon"></i>
            <span>{{ suggestion.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Messages -->
    <template v-if="!showWelcomeScreen">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`"
      >
        <div class="message-content">
          <!-- User messages: plain text -->
          <div v-if="message.sender === 'user'">
            {{ message.text }}
          </div>
          
          <!-- Bot messages: enhanced rendering based on type -->
          <div v-else class="admin-response">
            <DatabaseQueryResponse 
              v-if="message.type === 'database_query'"
              :content="message.text"
            />
            <PaymentReminderResponse 
              v-else-if="message.type === 'payment_reminder'"
              :content="message.text"
            />
            <EmailSummaryResponse 
              v-else-if="message.type === 'email_summary'"
              :content="message.text"
            />
            <AnalyticsResponse 
              v-else-if="message.type === 'analytics'"
              :content="message.text"
            />
            <!-- Default formatted text for other types -->
            <div v-else class="formatted-text" v-html="formatText(message.text)"></div>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="message bot-message">
        <div class="message-content loading-message">
          <div class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
          <span class="loading-text">Kozi Admin is thinking...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error && !loading" class="message bot-message">
        <div class="message-content error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div class="error-text">
            <strong>Oops! Something went wrong.</strong>
            <p>{{ error }}</p>
            <button class="retry-button" @click="handleRetry">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import DatabaseQueryResponse from './responses/DatabaseQueryResponse.vue'
import PaymentReminderResponse from './responses/PaymentReminderResponse.vue'
import EmailSummaryResponse from './responses/EmailSummaryResponse.vue'
import AnalyticsResponse from './responses/AnalyticsResponse.vue'

// Define props
defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  showWelcomeScreen: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

// Define events
const emit = defineEmits(['suggestion-click', 'retry'])

// Admin-specific suggestion cards
const adminSuggestionCards = [
  { 
    icon: "fas fa-money-bill-wave", 
    text: "Payment Reminders", 
    msg: "Check upcoming salary payment schedules" 
  },
  { 
    icon: "fas fa-database", 
    text: "Database Query", 
    msg: "Search and filter worker/employer data" 
  },
  { 
    icon: "fas fa-envelope", 
    text: "Gmail Support", 
    msg: "Categorize and draft email replies" 
  },
  { 
    icon: "fas fa-chart-bar", 
    text: "Platform Analytics", 
    msg: "Generate admin reports and insights" 
  }
]

// Format plain text with basic HTML
const formatText = (text) => {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

// Handle suggestion click
const handleSuggestionClick = (message) => {
  emit('suggestion-click', message)
}

// Handle retry after error
const handleRetry = () => {
  emit('retry')
}
</script>

<style scoped>
/* Admin Response Styling */
.admin-response {
  max-width: 100%;
}

/* Formatted Text Fallback */
.formatted-text {
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  color: var(--gray-800);
}

body.dark .formatted-text {
  color: var(--gray-200);
}

/* Existing styles remain the same... */
.loading-message {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--gray-50) !important;
  border: 1px solid var(--gray-200) !important;
  animation: fadeIn 0.3s ease;
}

.typing-indicator {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-600);
  animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.loading-text {
  color: var(--gray-600);
  font-size: var(--font-size-sm);
  font-style: italic;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-message {
  background: rgba(239, 68, 68, 0.05) !important;
  border: 1px solid rgba(239, 68, 68, 0.2) !important;
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  animation: fadeIn 0.3s ease;
}

.error-message i.fa-exclamation-triangle {
  color: var(--error);
  font-size: var(--font-size-xl);
  flex-shrink: 0;
  margin-top: var(--space-1);
}

.error-text {
  flex: 1;
}

.error-text strong {
  color: var(--error);
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-base);
}

.error-text p {
  color: var(--gray-700);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-sm);
}

.retry-button {
  background: var(--error);
  color: white;
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: all var(--transition-fast);
}

.retry-button:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

body.dark .loading-message {
  background: #1a1a1a !important;
  border-color: #2a2a2a !important;
}

body.dark .loading-text {
  color: #888888;
}

body.dark .error-message {
  background: rgba(239, 68, 68, 0.1) !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
}

body.dark .error-text p {
  color: #cccccc;
}
</style>