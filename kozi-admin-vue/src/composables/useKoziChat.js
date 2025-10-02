// src/composables/useKoziChat.js
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getOrCreateDemoUser, startSession, sendChatMessage, getChatHistory } from '../services/api'

export function useKoziChat() {
  // Reactive state (equivalent to React useState)
  const currentUser = ref(null)
  const currentSession = ref(null)
  const messages = ref([])
  const history = ref([])
  const chatStarted = ref(false)
  const loading = ref(false)
  const error = ref(null)
  const currentChatTitle = ref('New Chat')
  const showWelcomeScreen = ref(true)
  const lastFailedMessage = ref(null) // NEW: For retry functionality

  // Load history from localStorage on mount
  onMounted(() => {
    const savedHistory = localStorage.getItem('kozi-chat-history')
    if (savedHistory) {
      try {
        history.value = JSON.parse(savedHistory)
      } catch (e) {
        console.warn('Failed to load chat history:', e)
      }
    }
    initializeUser()
    loadSavedTheme()
  })

  // Watch history changes and save to localStorage (equivalent to React useEffect)
  watch(history, (newHistory) => {
    if (newHistory.length > 0) {
      localStorage.setItem('kozi-chat-history', JSON.stringify(newHistory))
    }
  }, { deep: true })

  // Watch messages to hide welcome screen when conversation progresses
  watch(messages, (newMessages) => {
    // Hide welcome screen only when there's actual conversation (more than just greeting)
    if (newMessages.length > 1) {
      showWelcomeScreen.value = false
    }
  }, { deep: true })

  // Initialize user
  const initializeUser = async () => {
    try {
      loading.value = true
      const user = await getOrCreateDemoUser()
      currentUser.value = user
      console.log('User initialized:', user)
    } catch (e) {
      console.error('Failed to initialize user:', e)
      error.value = 'Failed to initialize. Please refresh the page.'
      messages.value = [{ 
        sender: 'assistant', 
        text: 'Sorry, I had trouble connecting. Please refresh the page and try again.' 
      }]
    } finally {
      loading.value = false
    }
  }

  // Helper functions
  const addBotMessage = (text) => {
    messages.value.push({ sender: 'assistant', text: formatMessage(text) })
  }

  const addUserMessage = (text) => {
    messages.value.push({ sender: 'user', text })
  }

  // Generate smart title from first user message
  const generateChatTitle = (firstMessage) => {
    if (!firstMessage) return 'New Chat'
    
    let title = firstMessage.trim()
    title = title.replace(/^(how|what|when|where|why|can|could|would|should|tell me|help me)\s+/i, '')
    title = title.charAt(0).toUpperCase() + title.slice(1)
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }
    
    return title || 'New Chat'
  }

  // Save current chat to history
  const saveCurrentChatToHistory = () => {
    if (!currentSession.value || messages.value.length === 0) return

    const firstUserMessage = messages.value.find(m => m.sender === 'user')?.text
    const finalTitle = firstUserMessage ? generateChatTitle(firstUserMessage) : currentChatTitle.value
    
    // Get last message and use it as is (clean for history display)
    const lastMessage = messages.value[messages.value.length - 1]
    let cleanLastMessage = ''
    
    if (lastMessage) {
      if (lastMessage.sender === 'user') {
        cleanLastMessage = lastMessage.text
      } else {
        cleanLastMessage = stripHtmlAndFormat(lastMessage.text)
      }
    }
    
    const chatEntry = {
      sessionId: currentSession.value,
      title: finalTitle,
      date: new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      timestamp: Date.now(),
      messageCount: messages.value.length,
      lastMessage: cleanLastMessage.substring(0, 100)
    }

    // Remove any existing entry with same sessionId and add new entry at the beginning
    const filtered = history.value.filter(item => item.sessionId !== currentSession.value)
    history.value = [chatEntry, ...filtered].slice(0, 50) // Keep only last 50 chats
  }

  // Start new chat - UPDATED to show welcome screen
  const startNewChat = async () => {
    if (!currentUser.value) {
      console.warn('No user available for new chat')
      return
    }

    // Save current chat to history before starting new one
    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }

    // Reset chat state
    messages.value = []
    currentSession.value = null
    chatStarted.value = false
    error.value = null
    lastFailedMessage.value = null
    currentChatTitle.value = 'New Chat'
    showWelcomeScreen.value = true // SHOW welcome screen on new chat
    loading.value = true

    try {
      const data = await startSession(currentUser.value.user_id)
      console.log('Session started:', data)
      
      if (data?.success && data?.data) {
        currentSession.value = data.data.session_id
        chatStarted.value = true
        
        // Add greeting but keep welcome screen visible
        if (data.data.message) {
          addBotMessage(data.data.message)
        }
      } else {
        throw new Error('Invalid session response')
      }
    } catch (e) {
      console.error('Failed to start session:', e)
      error.value = 'Failed to start chat session. Please try again.'
      addBotMessage('Sorry, I had trouble starting our chat. Please try again.')
    } finally {
      loading.value = false
    }
  }

  // Send message - UPDATED with better error handling
  const sendMessage = async (text) => {
    if (!text.trim() || !currentUser.value || loading.value) {
      return
    }

    console.log('Sending message:', text)
    
    // Store the message in case we need to retry
    lastFailedMessage.value = text

    // Hide welcome screen when user sends a message
    showWelcomeScreen.value = false

    // Auto-start chat if needed
    if (!chatStarted.value || !currentSession.value) {
      console.log('Auto-starting chat session...')
      try {
        loading.value = true
        const data = await startSession(currentUser.value.user_id)
        
        if (data?.success && data?.data) {
          currentSession.value = data.data.session_id
          chatStarted.value = true
          
          if (data.data.message) {
            addBotMessage(data.data.message)
          }
        } else {
          throw new Error('Failed to start session')
        }
      } catch (e) {
        console.error('Auto-start failed:', e)
        error.value = 'Failed to start chat session. Please try again.'
        loading.value = false
        return
      }
    }

    // Add user message to UI immediately
    addUserMessage(text)
    
    // Update chat title if this is the first message
    if (messages.value.length === 1 || (messages.value.length === 2 && messages.value[0].sender === 'assistant')) {
      const newTitle = generateChatTitle(text)
      currentChatTitle.value = newTitle
    }

    loading.value = true
    error.value = null

    try {
      const sessionId = currentSession.value || (await startSession(currentUser.value.user_id)).data?.session_id
      const resp = await sendChatMessage(sessionId, currentUser.value.user_id, text)
      console.log('Message response:', resp)
      
      if (resp?.success && resp?.data) {
        addBotMessage(resp.data.message || 'I received your message.')
        lastFailedMessage.value = null // Clear on success
      } else {
        throw new Error('Invalid message response')
      }
    } catch (e) {
      console.error('Failed to send message:', e)
      
      // More specific error messages
      if (e.message.includes('network') || e.message.includes('fetch')) {
        error.value = 'Network error. Please check your connection and try again.'
      } else if (e.message.includes('timeout')) {
        error.value = 'Request timed out. The server might be busy, please try again.'
      } else {
        error.value = 'Unable to get response from Kozi Admin. Please try again.'
      }
      
      // Don't clear lastFailedMessage - we need it for retry
    } finally {
      loading.value = false
    }
  }

  // Send suggestion (same as send message)
  const sendSuggestion = async (text) => {
    await sendMessage(text)
  }

  // Retry last failed message - NEW
  const retryLastMessage = async () => {
    if (!lastFailedMessage.value) {
      console.warn('No failed message to retry')
      return
    }

    console.log('Retrying last message:', lastFailedMessage.value)
    
    // Remove the last user message (the failed one) from UI
    if (messages.value.length > 0 && messages.value[messages.value.length - 1].sender === 'user') {
      messages.value.pop()
    }
    
    // Clear error
    error.value = null
    
    // Store message to retry
    const messageToRetry = lastFailedMessage.value
    
    // Retry sending
    await sendMessage(messageToRetry)
  }

  // Load chat history
  const loadChatHistory = async (historyItem) => {
    if (!historyItem.sessionId) return
    
    // Save current chat before loading new one
    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }
    
    // Hide welcome screen when loading history
    showWelcomeScreen.value = false
    
    // Clear error state
    error.value = null
    lastFailedMessage.value = null
    
    loading.value = true
    try {
      const data = await getChatHistory(historyItem.sessionId)
      console.log('Loaded history:', data)
      
      if (data?.success && data?.data?.messages) {
        const msgs = data.data.messages.map(m => ({
          sender: m.sender === 'user' ? 'user' : 'assistant',
          text: formatMessage(m.message || m.text || '')
        }))
        messages.value = msgs
        currentSession.value = historyItem.sessionId
        currentChatTitle.value = historyItem.title
        chatStarted.value = true
      } else {
        // If backend history fails, show local history info
        messages.value = [
          { sender: 'assistant', text: `Loaded chat: ${historyItem.title}` },
          { sender: 'assistant', text: 'Previous messages from this session are not available.' }
        ]
        currentChatTitle.value = historyItem.title
      }
    } catch (e) {
      console.error('Failed to load history:', e)
      error.value = 'Failed to load chat history.'
      addBotMessage('Failed to load chat history. Please try again.')
    } finally {
      loading.value = false
    }
  }

  // Delete history item
  const deleteHistoryItem = (sessionId) => {
    history.value = history.value.filter(item => item.sessionId !== sessionId)
  }

  // Clear all history
  const clearAllHistory = () => {
    history.value = []
    localStorage.removeItem('kozi-chat-history')
  }

  // Toggle theme
  const toggleTheme = () => {
    document.body.classList.toggle('dark')
    // Save theme preference
    const isDark = document.body.classList.contains('dark')
    localStorage.setItem('kozi-theme', isDark ? 'dark' : 'light')
  }

  // Load saved theme on mount
  const loadSavedTheme = () => {
    const savedTheme = localStorage.getItem('kozi-theme')
    if (savedTheme === 'dark') {
      document.body.classList.add('dark')
    }
  }

  // Auto-save current chat when component unmounts or page closes
  const handleBeforeUnload = () => {
    if (currentSession.value && messages.value.length > 0) {
      saveCurrentChatToHistory()
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    handleBeforeUnload() // Save on unmount
  })

  // Return reactive state and actions (similar to React hook return)
  return {
    // State
    currentUser: computed(() => currentUser.value),
    currentSession: computed(() => currentSession.value),
    messages: computed(() => messages.value),
    history: computed(() => history.value),
    chatStarted: computed(() => chatStarted.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentChatTitle: computed(() => currentChatTitle.value),
    showWelcomeScreen: computed(() => showWelcomeScreen.value),
    lastFailedMessage: computed(() => lastFailedMessage.value), // NEW
    
    // Actions
    startNewChat,
    sendMessage,
    sendSuggestion,
    loadChatHistory,
    deleteHistoryItem,
    clearAllHistory,
    toggleTheme,
    retryLastMessage // NEW
  }
}

// Utility functions
function stripHtmlAndFormat(text = '') {
  if (!text) return ''
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '')
  
  // Remove markdown formatting
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1') // Bold
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1') // Italic
  cleaned = cleaned.replace(/#{1,6}\s*(.+)/g, '$1') // Headers
  cleaned = cleaned.replace(/^\d+\.\s*/gm, '') // Numbered lists
  cleaned = cleaned.replace(/^[-•]\s*/gm, '') // Bullet points
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

function formatMessage(message = '') {
  if (!message) return ''
  
  let formatted = String(message)
  
  // Remove unwanted markdown characters at the start of lines
  formatted = formatted.replace(/^[#*><]+\s*/gm, '')
  
  // Handle numbered lists
  formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="numbered-item"><span class="number">$1.</span>$2</div>')
  
  // Handle bullet points
  formatted = formatted.replace(/^\s*[-•]\s+(.+)$/gm, '<div class="bullet-item">$1</div>')
  
  // Handle bold text
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Handle section headers
  formatted = formatted.replace(/^(.+):$/gm, '<div class="section-header">$1</div>')
  
  // Convert line breaks
  formatted = formatted.replace(/\n\n/g, '</p><p>')
  formatted = formatted.replace(/\n/g, '<br>')
  
  // Wrap in paragraph tags if not already wrapped
  if (!formatted.includes('<div') && !formatted.includes('<p>')) {
    formatted = `<p>${formatted}</p>`
  }
  
  return formatted
}