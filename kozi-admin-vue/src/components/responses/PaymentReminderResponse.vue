<template>
  <div class="payment-response">
    <!-- Header -->
    <div class="response-header">
      <i class="fas fa-money-bill-wave"></i>
      <h3>Payroll Status Update</h3>
    </div>

    <!-- Overview Stats -->
    <div class="overview-section">
      <h4><i class="fas fa-chart-bar"></i> Overview</h4>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ overview.total }}</div>
          <div class="stat-label">Total Records</div>
        </div>
        <div class="stat-card urgent" v-if="overview.urgent > 0">
          <div class="stat-number">{{ overview.urgent }}</div>
          <div class="stat-label">Urgent (2 days)</div>
        </div>
        <div class="stat-card upcoming">
          <div class="stat-number">{{ overview.upcoming }}</div>
          <div class="stat-label">Upcoming (30 days)</div>
        </div>
        <div class="stat-card overdue" v-if="overview.overdue > 0">
          <div class="stat-number">{{ overview.overdue }}</div>
          <div class="stat-label">Overdue</div>
        </div>
        <div class="stat-card amount">
          <div class="stat-number">{{ overview.totalAmount }}</div>
          <div class="stat-label">Total Amount</div>
        </div>
      </div>
    </div>

    <!-- Urgent Payments -->
    <div v-if="urgentPayments.length > 0" class="urgent-section">
      <h4><i class="fas fa-exclamation-triangle"></i> Urgent - Due in 2 Days</h4>
      <div class="payment-list urgent-list">
        <div 
          v-for="(payment, index) in urgentPayments" 
          :key="index"
          class="payment-item urgent-item"
        >
          <div class="payment-header">
            <div class="payment-period">{{ payment.period }}</div>
            <div class="payment-amount">{{ payment.amount }}</div>
          </div>
          <div class="payment-details">
            <span class="payment-due">Due: {{ payment.dueDate }} ({{ payment.daysUntil }} days)</span>
            <span class="payment-status">{{ payment.status }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Payments -->
    <div v-if="upcomingPayments.length > 0" class="upcoming-section">
      <h4><i class="fas fa-calendar-alt"></i> Upcoming Payments (Next 30 Days)</h4>
      <div class="payment-list">
        <div 
          v-for="(payment, index) in upcomingPayments" 
          :key="index"
          class="payment-item"
        >
          <div class="payment-header">
            <div class="payment-period">{{ payment.period }}</div>
            <div class="payment-amount">{{ payment.amount }}</div>
          </div>
          <div class="payment-details">
            <span class="payment-due">Due: {{ payment.dueDate }} ({{ payment.daysUntil }} days)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Overdue Section -->
    <div v-if="overview.overdue > 0" class="overdue-section">
      <div class="alert-card overdue">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>{{ overview.overdue }} Overdue Payments</strong>
          <p>These payments require immediate attention</p>
        </div>
      </div>
    </div>

    <!-- Suggested Actions -->
    <div class="actions-section">
      <h4><i class="fas fa-tasks"></i> Suggested Actions</h4>
      <div class="action-list">
        <div class="action-item" v-for="(action, index) in suggestedActions" :key="index">
          <span class="action-number">{{ index + 1 }}</span>
          <span class="action-text">{{ action }}</span>
        </div>
      </div>
    </div>

    <!-- Next Steps -->
    <div v-if="nextSteps.length > 0" class="nextsteps-section">
      <h4><i class="fas fa-lightbulb"></i> Would you like me to:</h4>
      <div class="nextsteps-list">
        <div 
          v-for="(step, index) in nextSteps" 
          :key="index"
          class="nextstep-item"
        >
          <i class="fas fa-arrow-right"></i>
          <span>{{ step }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: {
    type: String,
    required: true
  }
})

// Parse payment content
const parseContent = (content) => {
  const lines = content.split('\n').filter(line => line.trim())
  
  const overview = {
    total: 0,
    urgent: 0,
    upcoming: 0,
    overdue: 0,
    totalAmount: ''
  }
  
  const urgentPayments = []
  const upcomingPayments = []
  const suggestedActions = []
  const nextSteps = []
  
  let currentSection = ''
  
  lines.forEach(line => {
    line = line.trim()
    
    // Parse overview table
    if (line.includes('Total Records')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) overview.total = parseInt(match[1])
    }
    if (line.includes('Urgent (2 days)')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) overview.urgent = parseInt(match[1])
    }
    if (line.includes('Upcoming (30 days)')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) overview.upcoming = parseInt(match[1])
    }
    if (line.includes('Overdue')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) overview.overdue = parseInt(match[1])
    }
    if (line.includes('Total Amount')) {
      const match = line.match(/│\s*(RWF[\s\d,]+)\s*│/)
      if (match) overview.totalAmount = match[1].trim()
    }
    
    // Section detection
    if (line.includes('URGENT - DUE IN 2 DAYS')) {
      currentSection = 'urgent'
    } else if (line.includes('UPCOMING PAYMENTS')) {
      currentSection = 'upcoming'
    } else if (line.includes('SUGGESTED ACTIONS')) {
      currentSection = 'actions'
    } else if (line.includes('Would you like me to')) {
      currentSection = 'nextsteps'
    }
    
    // Parse urgent payments
    if (currentSection === 'urgent' && /^\d+\.\s*Period:/.test(line)) {
      const payment = {}
      const periodMatch = line.match(/Period:\s*(.+)/)
      if (periodMatch) payment.period = periodMatch[1]
      urgentPayments.push(payment)
    }
    if (currentSection === 'urgent' && line.includes('Amount:')) {
      const match = line.match(/Amount:\s*(.+)/)
      if (match && urgentPayments.length > 0) {
        urgentPayments[urgentPayments.length - 1].amount = match[1]
      }
    }
    if (currentSection === 'urgent' && line.includes('Due:')) {
      const match = line.match(/Due:\s*([^(]+)\((\d+)\s*days?\)/)
      if (match && urgentPayments.length > 0) {
        const payment = urgentPayments[urgentPayments.length - 1]
        payment.dueDate = match[1].trim()
        payment.daysUntil = parseInt(match[2])
      }
    }
    if (currentSection === 'urgent' && line.includes('Status:')) {
      const match = line.match(/Status:\s*(.+)/)
      if (match && urgentPayments.length > 0) {
        urgentPayments[urgentPayments.length - 1].status = match[1]
      }
    }
    
    // Parse upcoming payments
    if (currentSection === 'upcoming' && /^\d+\.\s*\w+/.test(line)) {
      const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)/)
      if (match) {
        upcomingPayments.push({
          period: match[1],
          amount: match[2]
        })
      }
    }
    if (currentSection === 'upcoming' && line.includes('Due:') && upcomingPayments.length > 0) {
      const match = line.match(/Due:\s*([^(]+)\((\d+)\s*days?\)/)
      if (match) {
        const payment = upcomingPayments[upcomingPayments.length - 1]
        payment.dueDate = match[1].trim()
        payment.daysUntil = parseInt(match[2])
      }
    }
    
    // Parse actions
    if (currentSection === 'actions' && /^\d+\./.test(line)) {
      const action = line.replace(/^\d+\.\s*/, '')
      suggestedActions.push(action)
    }
    
    // Parse next steps
    if (currentSection === 'nextsteps' && line.startsWith('•')) {
      const step = line.substring(1).trim()
      nextSteps.push(step)
    }
  })
  
  return { overview, urgentPayments, upcomingPayments, suggestedActions, nextSteps }
}

const parsedData = computed(() => parseContent(props.content))
const overview = computed(() => parsedData.value.overview)
const urgentPayments = computed(() => parsedData.value.urgentPayments)
const upcomingPayments = computed(() => parsedData.value.upcomingPayments)
const suggestedActions = computed(() => parsedData.value.suggestedActions)
const nextSteps = computed(() => parsedData.value.nextSteps)
</script>

<style scoped>
.payment-response {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

.response-header {
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.response-header i {
  font-size: 1.25rem;
}

.response-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.overview-section,
.urgent-section,
.upcoming-section,
.actions-section,
.nextsteps-section {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.overview-section:last-child,
.urgent-section:last-child,
.upcoming-section:last-child,
.actions-section:last-child,
.nextsteps-section:last-child {
  border-bottom: none;
}

h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-card.urgent {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-card.upcoming {
  background: #eff6ff;
  border-color: #dbeafe;
}

.stat-card.overdue {
  background: #fffbeb;
  border-color: #fed7aa;
}

.stat-card.amount {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.stat-card.urgent .stat-number {
  color: #dc2626;
}

.stat-card.upcoming .stat-number {
  color: #2563eb;
}

.stat-card.overdue .stat-number {
  color: #d97706;
}

.stat-card.amount .stat-number {
  color: #16a34a;
  font-size: 1.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
}

.payment-list {
  space-y: 1rem;
}

.payment-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.payment-item.urgent-item {
  background: #fef2f2;
  border-color: #fecaca;
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.payment-period {
  font-weight: 600;
  color: #1e293b;
}

.payment-amount {
  font-weight: 700;
  color: #16a34a;
  font-size: 1.125rem;
}

.urgent-item .payment-amount {
  color: #dc2626;
}

.payment-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.payment-due {
  color: #64748b;
}

.payment-status {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.overdue-section {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.alert-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
}

.alert-card.overdue {
  background: #fffbeb;
  border: 1px solid #fed7aa;
  color: #92400e;
}

.alert-card i {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-card strong {
  display: block;
  margin-bottom: 0.25rem;
}

.alert-card p {
  margin: 0;
  font-size: 0.875rem;
}

.action-list {
  space-y: 0.5rem;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f1f5f9;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.action-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #64748b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 1px;
}

.action-text {
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.4;
}

.nextsteps-list {
  space-y: 0.75rem;
}

.nextstep-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  color: #1e40af;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.nextstep-item i {
  color: #3b82f6;
  flex-shrink: 0;
}

/* Dark mode */
body.dark .payment-response {
  background: #1f2937;
  border-color: #374151;
}

body.dark .stat-card {
  background: #374151;
  border-color: #4b5563;
}

body.dark .stat-number {
  color: #f9fafb;
}

body.dark .payment-item {
  background: #374151;
  border-color: #4b5563;
}

body.dark .action-item {
  background: #374151;
}

body.dark .nextstep-item {
  background: #374151;
  border-color: #4b5563;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .payment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .payment-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>