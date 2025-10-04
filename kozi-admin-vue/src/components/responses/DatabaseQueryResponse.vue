<template>
  <div class="database-response">
    <!-- Header -->
    <div class="response-header">
      <i class="fas fa-database"></i>
      <h3>Database Query Results</h3>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.total.toLocaleString() }}</div>
          <div class="stat-label">Total Job Seekers</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon active">
          <i class="fas fa-user-check"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.active.toLocaleString() }}</div>
          <div class="stat-label">Active Profiles</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon inactive">
          <i class="fas fa-user-times"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.inactive.toLocaleString() }}</div>
          <div class="stat-label">Inactive Profiles</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon completion">
          <i class="fas fa-chart-pie"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.completion }}%</div>
          <div class="stat-label">Avg Completion</div>
          <div class="completion-bar">
            <div class="completion-fill" :style="{ width: stats.completion + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Locations and Categories -->
    <div class="data-grid">
      <!-- Top Locations -->
      <div class="data-section">
        <h4><i class="fas fa-map-marker-alt"></i> Top Locations</h4>
        <div class="data-list">
          <div 
            v-for="(location, index) in locations" 
            :key="index"
            class="data-item"
          >
            <div class="data-rank">{{ index + 1 }}</div>
            <div class="data-info">
              <div class="data-name">{{ location.name }}</div>
              <div class="data-meta">{{ location.count.toLocaleString() }} users ({{ location.percentage }}%)</div>
            </div>
            <div class="data-bar">
              <div class="data-fill" :style="{ width: location.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Categories -->
      <div class="data-section">
        <h4><i class="fas fa-briefcase"></i> Top Categories</h4>
        <div class="data-list">
          <div 
            v-for="(category, index) in categories" 
            :key="index"
            class="data-item"
          >
            <div class="data-rank">{{ index + 1 }}</div>
            <div class="data-info">
              <div class="data-name">{{ category.name }}</div>
              <div class="data-meta">{{ category.count.toLocaleString() }} users</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Insights -->
    <div v-if="insight" class="insight-section">
      <h4><i class="fas fa-lightbulb"></i> Insights</h4>
      <div class="insight-card">
        {{ insight }}
      </div>
    </div>

    <!-- Next Steps -->
    <div class="actions-section">
      <h4><i class="fas fa-tasks"></i> Suggested Actions</h4>
      <div class="action-list">
        <div class="action-item" v-for="(action, index) in nextSteps" :key="index">
          <span class="action-number">{{ index + 1 }}</span>
          <span class="action-text">{{ action }}</span>
        </div>
      </div>
    </div>

    <!-- Follow-up Question -->
    <div v-if="followUp" class="followup-section">
      <div class="followup-card">
        <i class="fas fa-question-circle"></i>
        <span>{{ followUp }}</span>
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

// Parse the content to extract structured data
const parseContent = (content) => {
  const lines = content.split('\n').filter(line => line.trim())
  
  const stats = {
    total: 0,
    active: 0,
    inactive: 0,
    completion: 0
  }
  
  const locations = []
  const categories = []
  let insight = ''
  const nextSteps = []
  let followUp = ''
  
  let currentSection = ''
  
  lines.forEach(line => {
    line = line.trim()
    
    // Parse stats from table format
    if (line.includes('Total Job Seekers')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) stats.total = parseInt(match[1])
    }
    if (line.includes('Active Profiles')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) stats.active = parseInt(match[1])
    }
    if (line.includes('Inactive Profiles')) {
      const match = line.match(/│\s*(\d+)\s*│/)
      if (match) stats.inactive = parseInt(match[1])
    }
    if (line.includes('Avg Completion')) {
      const match = line.match(/│\s*(\d+)%\s*│/)
      if (match) stats.completion = parseInt(match[1])
    }
    
    // Section headers
    if (line.includes('TOP LOCATIONS')) {
      currentSection = 'locations'
    } else if (line.includes('TOP CATEGORIES')) {
      currentSection = 'categories'
    } else if (line.includes('INSIGHTS')) {
      currentSection = 'insights'
    } else if (line.includes('NEXT STEPS') || line.includes('SUGGESTED ACTIONS')) {
      currentSection = 'actions'
    }
    
    // Parse locations
    if (currentSection === 'locations' && /^\d+\./.test(line)) {
      const match = line.match(/^(\d+)\.\s*([^:]+):\s*(\d+)\s*\((\d+)%\)/)
      if (match) {
        locations.push({
          name: match[2],
          count: parseInt(match[3]),
          percentage: parseInt(match[4])
        })
      }
    }
    
    // Parse categories
    if (currentSection === 'categories' && /^\d+\./.test(line)) {
      const match = line.match(/^(\d+)\.\s*([^:]+):\s*(\d+)/)
      if (match) {
        categories.push({
          name: match[2],
          count: parseInt(match[3])
        })
      }
    }
    
    // Parse insights
    if (currentSection === 'insights' && line.startsWith('•')) {
      insight = line.substring(1).trim()
    }
    
    // Parse actions
    if (currentSection === 'actions' && /^\d+\./.test(line)) {
      const action = line.replace(/^\d+\.\s*/, '')
      nextSteps.push(action)
    }
    
    // Parse follow-up question
    if (line.includes('Would you like me to')) {
      followUp = line
    }
  })
  
  return { stats, locations, categories, insight, nextSteps, followUp }
}

const parsedData = computed(() => parseContent(props.content))
const stats = computed(() => parsedData.value.stats)
const locations = computed(() => parsedData.value.locations)
const categories = computed(() => parsedData.value.categories)
const insight = computed(() => parsedData.value.insight)
const nextSteps = computed(() => parsedData.value.nextSteps)
const followUp = computed(() => parsedData.value.followUp)
</script>

<style scoped>
.database-response {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

.response-header {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  color: #64748b;
}

.stat-icon.active {
  background: #dcfce7;
  color: #16a34a;
}

.stat-icon.inactive {
  background: #fee2e2;
  color: #dc2626;
}

.stat-icon.completion {
  background: #ddd6fe;
  color: #7c3aed;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.completion-bar {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.completion-fill {
  height: 100%;
  background: linear-gradient(90deg, #16a34a, #22c55e);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding: 0 1.5rem 1.5rem;
}

.data-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.data-section h4 i {
  color: #6b7280;
}

.data-list {
  space-y: 0.75rem;
}

.data-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.data-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.data-info {
  flex: 1;
}

.data-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 0.875rem;
}

.data-meta {
  font-size: 0.75rem;
  color: #64748b;
}

.data-bar {
  width: 60px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.data-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.insight-section,
.actions-section {
  padding: 0 1.5rem 1.5rem;
}

.insight-section h4,
.actions-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.insight-card {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 1rem;
  color: #92400e;
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

.followup-section {
  padding: 0 1.5rem 1.5rem;
}

.followup-card {
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #1e40af;
  font-size: 0.875rem;
}

.followup-card i {
  color: #3b82f6;
  flex-shrink: 0;
}

/* Dark mode */
body.dark .database-response {
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

body.dark .data-item {
  background: #374151;
}

body.dark .data-name {
  color: #f9fafb;
}

body.dark .action-item {
  background: #374151;
}

body.dark .action-text {
  color: #d1d5db;
}

@media (max-width: 768px) {
  .data-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>