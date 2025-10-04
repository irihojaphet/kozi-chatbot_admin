<template>
  <div class="email-response">
    <div class="response-header">
      <i class="fas fa-envelope"></i>
      <h3>Email Processing</h3>
    </div>
    <div class="content-section">
      <div class="formatted-text" v-html="formattedContent"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, required: true }
})

const formattedContent = computed(() => {
  return props.content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
})
</script>

<style scoped>
.email-response {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.response-header {
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.content-section {
  padding: 1.5rem;
}

.formatted-text {
  line-height: 1.6;
  color: #374151;
}
</style>