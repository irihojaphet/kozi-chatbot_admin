# Kozi Admin Chatbot System

An intelligent administrative assistant chatbot for the Kozi platform that helps administrators manage payments, query databases, process emails, and analyze platform analytics.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Architecture & Algorithms](#architecture--algorithms)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)

---

## Overview

The Kozi Admin Chatbot is a full-stack application consisting of:
- **Backend**: Node.js/Express API with MySQL database
- **Frontend**: Vue.js 3 with Composition API
- **AI Integration**: OpenAI GPT-4 for natural language processing
- **Vector Database**: For RAG (Retrieval-Augmented Generation) with admin knowledge base

This system automates administrative workflows including payment reminders, database queries, email categorization, and analytics reporting.

---

## Features

### Core Functionality

1. **Payment Management**
   - Track pending salary payments
   - Calculate days until due dates
   - Generate payment reports
   - Send payment notifications

2. **Database Queries**
   - Employee statistics and filtering
   - Employer verification status
   - Location-based analytics
   - Department breakdowns

3. **Email Processing**
   - Categorize emails by type and priority
   - Track pending emails and draft replies
   - Auto-process routine inquiries
   - Flag high-priority items

4. **Platform Analytics**
   - Monthly metrics dashboard
   - Performance indicators
   - Sector analysis
   - Growth trends

5. **Natural Language Interface**
   - Conversational AI using OpenAI GPT-4
   - Context-aware responses
   - Multi-turn conversations
   - Session management

---

## Project Structure

```
kozi-chatbot_admin/
│
├── kozi-admin-backend/          # Backend Node.js application
│   ├── config/
│   │   ├── constants.js         # Application constants
│   │   └── environment.js       # Environment configuration
│   │
│   ├── controllers/
│   │   ├── chatController.js    # Chat logic and AI handlers
│   │   └── profileController.js # User profile management
│   │
│   ├── core/
│   │   ├── db/
│   │   │   ├── connection.js    # MySQL connection pool
│   │   │   └── models/          # Database models
│   │   ├── utils/
│   │   │   └── logger.js        # Winston logger configuration
│   │   └── services/
│   │       ├── ragService.js    # RAG implementation
│   │       └── vectorService.js # Vector database operations
│   │
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── requestMiddleware.js # Request logging & validation
│   │
│   ├── routes/
│   │   ├── chat.js              # Chat endpoints
│   │   └── profile.js           # Profile endpoints
│   │
│   ├── data/
│   │   ├── knowledge/           # Knowledge base documents
│   │   └── admin_vectors/       # Vector embeddings storage
│   │
│   └── server.js                # Application entry point
│
└── kozi-chat-vue/               # Frontend Vue.js application
    ├── src/
    │   ├── components/
    │   │   ├── ChatArea.vue     # Main chat interface
    │   │   ├── ChatInput.vue    # Message input component
    │   │   └── Sidebar.vue      # Navigation sidebar
    │   │
    │   ├── composables/
    │   │   └── useKoziChat.js   # Chat state management
    │   │
    │   ├── services/
    │   │   └── api.js           # API client
    │   │
    │   ├── stores/
    │   │   └── counter.js       # Pinia store
    │   │
    │   └── App.vue              # Root component
    │
    └── index.html               # Entry HTML
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 8.0 with mysql2/promise driver
- **AI/ML**: OpenAI GPT-4o-mini
- **Vector DB**: Custom vector store implementation
- **Logging**: Winston
- **Environment**: dotenv

### Frontend
- **Framework**: Vue.js 3 (Composition API)
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Styling**: CSS3 with custom variables
- **Build Tool**: Vite

### Database
- **Primary DB**: MySQL (user profiles, sessions, messages)
- **Vector Store**: File-based vector embeddings for RAG

---

## Architecture & Algorithms

### 1. Connection Pool Pattern

The application uses MySQL connection pooling for efficient database access:

```javascript
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

**Benefits:**
- Reuses connections instead of creating new ones
- Handles concurrent requests efficiently
- Automatic connection management
- Prevents connection exhaustion

### 2. RAG (Retrieval-Augmented Generation)

The chatbot uses RAG to enhance responses with domain-specific knowledge:

**Algorithm Flow:**
1. User query received
2. Query converted to vector embedding
3. Similarity search in vector store
4. Top-k relevant documents retrieved
5. Documents + query sent to GPT-4
6. AI generates contextually-aware response

**Implementation:**
```javascript
// Vector similarity search
const relevantDocs = await vectorStore.similaritySearch(query, k=5);

// Augment prompt with retrieved context
const context = relevantDocs.map(doc => doc.content).join('\n');
const augmentedPrompt = `Context: ${context}\n\nQuery: ${query}`;

// Generate response
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: augmentedPrompt }
  ]
});
```

### 3. Session Management

Each chat session maintains conversation context:

**Session Lifecycle:**
1. User authenticates → Admin validation
2. Session created with unique ID: `admin_${timestamp}_${userId}`
3. Messages stored with session_id reference
4. Session remains active until explicitly ended
5. History retrieved for context continuity

### 4. Message Classification

Messages are categorized using keyword detection and intent classification:

```javascript
const msg = message.toLowerCase();

if (msg.includes('payment') || msg.includes('salary')) {
  return handlePaymentQuery();
}
else if (msg.includes('database') || msg.includes('query')) {
  return handleDatabaseQuery();
}
else if (msg.includes('email')) {
  return handleEmailQuery();
}
else if (msg.includes('analytics')) {
  return handleAnalyticsQuery();
}
else {
  return generateAdminResponse(); // Use AI for general queries
}
```

### 5. Database Query Optimization

Complex aggregations are pre-computed for performance:

```sql
-- Employee statistics with conditional aggregation
SELECT 
  COUNT(*) as total_employees,
  SUM(CASE WHEN employment_status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN employment_status = 'pending' THEN 1 ELSE 0 END) as pending,
  COUNT(DISTINCT location) as locations
FROM platform_employees;
```

**Optimization Techniques:**
- Conditional aggregation with CASE
- Indexed columns for faster lookups
- LIMIT clauses to reduce result sets
- Connection pooling for concurrent queries

---

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MySQL 8.0+
- npm or yarn
- OpenAI API key

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/kozi-chatbot-admin.git
cd kozi-chatbot-admin/kozi-admin-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the backend root:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=kozi_admin_db

# Server Configuration
PORT=3002
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
CHAT_MODEL=gpt-4o-mini

# CORS
CORS_ORIGIN=http://localhost:5174
```

4. **Set up the database**
```bash
mysql -u root -p < database/schema.sql
```

5. **Initialize knowledge base**

The knowledge base will auto-load on server start from `/data/knowledge/` directory.

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../kozi-chat-vue
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API endpoint**

Update `src/services/api.js` if needed:
```javascript
const API_BASE_URL = 'http://localhost:3002/api';
```

---

## Running the Application

### Start Backend Server

```bash
cd kozi-admin-backend
npm start
```

Server will run on: `http://localhost:3002`

**Expected output:**
```
✅ Database connected successfully
info: Loading Kozi Admin knowledge base...
info: Admin server initialized successfully
info: Kozi Admin Bot Server running on port 3002
```

### Start Frontend Development Server

```bash
cd kozi-chat-vue
npm run dev
```

Frontend will run on: `http://localhost:5174`

### Access the Application

Open your browser and navigate to: `http://localhost:5174`

**Default admin login:**
- Email: `admin@kozi.rw`
- User Type: `admin`

---

## API Endpoints

### Chat Endpoints

#### Start Chat Session
```http
POST /api/chat/start
Content-Type: application/json

{
  "user_id": "admin_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "admin_1234567890_admin_001",
    "message": "Hello Admin! I'm your Kozi Assistant..."
  }
}
```

#### Send Message
```http
POST /api/chat/message
Content-Type: application/json

{
  "session_id": "admin_1234567890_admin_001",
  "user_id": "admin_001",
  "message": "Show me payment reminders"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Payment Reminder Alert\n\nUpcoming Salary Payment..."
  }
}
```

#### Get Chat History
```http
GET /api/chat/history/:session_id
```

#### End Session
```http
POST /api/chat/end
Content-Type: application/json

{
  "session_id": "admin_1234567890_admin_001"
}
```

### Profile Endpoints

#### Get User by Email
```http
GET /api/profile/user/:email
```

#### Create Admin User
```http
POST /api/profile/user
Content-Type: application/json

{
  "email": "newadmin@kozi.rw",
  "full_name": "New Admin",
  "department": "IT",
  "role": "System Administrator"
}
```

#### Update Profile
```http
PUT /api/profile/:user_id
Content-Type: application/json

{
  "full_name": "Updated Name",
  "department": "Operations"
}
```

---

## Database Schema

### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  user_type ENUM('admin', 'super_admin') DEFAULT 'admin',
  full_name VARCHAR(255),
  department VARCHAR(100),
  role VARCHAR(100),
  permissions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### chat_sessions
```sql
CREATE TABLE chat_sessions (
  session_id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  bot_type VARCHAR(50) DEFAULT 'admin',
  session_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  sender ENUM('admin', 'assistant') NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id),
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL server host | `localhost` |
| `DB_PORT` | MySQL server port | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_NAME` | Database name | `kozi_admin_db` |
| `PORT` | Backend server port | `3002` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `CHAT_MODEL` | OpenAI model | `gpt-4o-mini` |
| `CORS_ORIGIN` | Frontend URL | `http://localhost:5174` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging level | `info` |

---

## Key Algorithms Explained

### 1. Vector Similarity Search

The system uses cosine similarity to find relevant documents:

```
similarity(A, B) = (A · B) / (||A|| × ||B||)
```

Where:
- A = query embedding vector
- B = document embedding vector
- · = dot product
- ||x|| = vector magnitude

### 2. Payment Date Calculation

Days until payment due:
```javascript
const daysUntilDue = Math.ceil(
  (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)
);
```

### 3. Conditional Aggregation

SQL pattern for grouped statistics:
```sql
SUM(CASE WHEN condition THEN 1 ELSE 0 END) as count
```

This efficiently counts matching rows in a single query pass.

---

## Development Tips

### Adding New Admin Features

1. Create handler method in `chatController.js`
2. Add keyword detection in `processAdminMessage()`
3. Define database queries if needed
4. Format response without special characters
5. Test with frontend

### Extending the Knowledge Base

1. Add documents to `/data/knowledge/`
2. Documents auto-load on server restart
3. Supported formats: JSON, Markdown, PDF
4. Vector embeddings generated automatically

### Debugging

Enable detailed logging:
```javascript
// In logger.js
level: 'debug'  // instead of 'info'
```

Check logs for:
- Database connection issues
- OpenAI API errors
- Vector store operations
- Request/response flow

---

## License

This project is proprietary software for Kozi platform administration.

---

## Support

For issues or questions:
- Email: admin@kozi.rw
- Documentation: Internal wiki
- Repository: GitHub Issues

---

## Contributors

- Development Team @ Kozi
- AI Integration: OpenAI GPT-4
- Vector Database: Custom implementation