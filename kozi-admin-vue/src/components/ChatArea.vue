<template>
  <div class="chat-messages">
    <!-- Welcome Screen (when no messages) -->
    <div v-if="messages.length === 0" class="welcome-screen">
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
    <div
      v-else
      v-for="(message, index) in messages"
      :key="index"
      :class="`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`"
    >
      <div class="message-content">
        <!-- User messages: plain text -->
        <div v-if="message.sender === 'user'">
          {{ message.text }}
        </div>
        
        <!-- Bot messages: formatted HTML -->
        <div
          v-else
          class="formatted-content"
          v-html="message.text"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Define props (equivalent to React props)
defineProps({
  messages: {
    type: Array,
    default: () => []
  }
})

// Define events that this component can emit
const emit = defineEmits(['suggestion-click'])

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

// Handle suggestion click (emit event to parent)
const handleSuggestionClick = (message) => {
  emit('suggestion-click', message)
}
</script>

<style scoped>
/* Component-specific styles can go here if needed */
/* Most styles will come from the global dashboard.css */
</style>