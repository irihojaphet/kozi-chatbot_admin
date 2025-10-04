// src/services/api.js - Admin version
const ADMIN_CONFIG = {
  // Use admin-specific endpoints
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
  demoUser: { email: 'admin@kozi.rw', user_type: 'admin' } // Changed to admin user
};

export async function getOrCreateDemoUser() {
  try {
    // Try GET first
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/profile/user/${ADMIN_CONFIG.demoUser.email}`);
    if (r.ok) {
      const data = await r.json();
      return data.data;
    }
    
    // Create if doesn't exist
    const c = await fetch(`${ADMIN_CONFIG.baseURL}/profile/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN_CONFIG.demoUser)
    });
    
    if (!c.ok) {
      throw new Error(`Failed to create admin user: ${c.status}`);
    }
    
    const created = await c.json();
    return created.data;
  } catch (error) {
    console.error('Error with admin user:', error);
    throw error;
  }
}

export async function startSession(user_id) {
  try {
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id,
        bot_type: 'admin' // Specify this is admin bot
      })
    });
    
    if (!r.ok) {
      throw new Error(`Failed to start admin session: ${r.status}`);
    }
    
    return r.json();
  } catch (error) {
    console.error('Error starting admin session:', error);
    throw error;
  }
}

export async function sendChatMessage(session_id, user_id, message) {
  try {
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        session_id, 
        user_id, 
        message,
        bot_type: 'admin' // Specify this is admin bot
      })
    });
    
    if (!r.ok) {
      throw new Error(`Failed to send admin message: ${r.status}`);
    }
    
    return r.json();
  } catch (error) {
    console.error('Error sending admin message:', error);
    throw error;
  }
}

export async function getChatHistory(session_id) {
  try {
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/chat/history/${session_id}`);
    
    if (!r.ok) {
      throw new Error(`Failed to get admin history: ${r.status}`);
    }
    
    return r.json();
  } catch (error) {
    console.error('Error getting admin chat history:', error);
    throw error;
  }
}

// Admin-specific API functions (for future use)
export async function getPaymentReminders() {
  try {
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/admin/payment-reminders`);
    if (!r.ok) throw new Error(`Failed to get payment reminders: ${r.status}`);
    return r.json();
  } catch (error) {
    console.error('Error getting payment reminders:', error);
    throw error;
  }
}

export async function queryDatabase(query) {
  try {
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/admin/database/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!r.ok) throw new Error(`Failed to query database: ${r.status}`);
    return r.json();
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

export async function processEmails() {
  try {
    const r = await fetch(`${ADMIN_CONFIG.baseURL}/admin/gmail/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`Failed to process emails: ${r.status}`);
    return r.json();
  } catch (error) {
    console.error('Error processing emails:', error);
    throw error;
  }
}
// Add to your existing api.js
export async function getJobSeekers(useCache = true) {
  const r = await fetch(`${ADMIN_CONFIG.baseURL}/admin/job-seekers?use_cache=${useCache}`);
  if (!r.ok) throw new Error(`Failed to get job seekers: ${r.status}`);
  return r.json();
}

export async function getJobs(useCache = true, status = null, category = null) {
  let url = `${ADMIN_CONFIG.baseURL}/admin/jobs?use_cache=${useCache}`;
  if (status) url += `&status=${status}`;
  if (category) url += `&category=${category}`;
  
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to get jobs: ${r.status}`);
  return r.json();
}

export async function getDashboardStats(useCache = true) {
  const r = await fetch(`${ADMIN_CONFIG.baseURL}/admin/dashboard-stats?use_cache=${useCache}`);
  if (!r.ok) throw new Error(`Failed to get dashboard stats: ${r.status}`);
  return r.json();
}