-- File 1: database/migrations/001_user_profiles.sql
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_type ENUM('admin', 'super_admin') DEFAULT 'admin',
    full_name VARCHAR(255),
    department VARCHAR(100),
    role VARCHAR(100),
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- File 2: database/migrations/002_chat_sessions.sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(150) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    bot_type VARCHAR(50) DEFAULT 'admin',
    session_name VARCHAR(255),
    context_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_user_sessions (user_id),
    INDEX idx_bot_type (bot_type)
);

-- File 3: database/migrations/003_chat_messages.sql
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(150) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    sender ENUM('admin', 'assistant') NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'payment_reminder', 'database_query', 'email_summary', 'analytics') DEFAULT 'text',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_messages (session_id),
    INDEX idx_user_messages (user_id),
    INDEX idx_message_type (message_type)
);

-- File 4: database/migrations/004_payment_schedules.sql
CREATE TABLE IF NOT EXISTS payment_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_count INT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    due_date DATE NOT NULL,
    payment_period VARCHAR(50) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'overdue') DEFAULT 'pending',
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
);

-- File 5: database/migrations/005_platform_employees.sql
CREATE TABLE IF NOT EXISTS platform_employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(100),
    department VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(12,2),
    hire_date DATE,
    employment_status ENUM('active', 'inactive', 'pending', 'terminated') DEFAULT 'active',
    skills JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (location),
    INDEX idx_department (department),
    INDEX idx_status (employment_status)
);

-- File 6: database/migrations/006_platform_employers.sql
CREATE TABLE IF NOT EXISTS platform_employers (
    employer_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(100),
    industry VARCHAR(100),
    company_size ENUM('startup', 'small', 'medium', 'large') DEFAULT 'small',
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    job_postings_count INT DEFAULT 0,
    active_jobs_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (location),
    INDEX idx_industry (industry),
    INDEX idx_verification_status (verification_status)
);

-- File 7: database/migrations/007_email_processing.sql
CREATE TABLE IF NOT EXISTS email_processing (
    email_id INT AUTO_INCREMENT PRIMARY KEY,
    email_subject VARCHAR(500),
    sender_email VARCHAR(255) NOT NULL,
    email_category ENUM('job_seeker_inquiry', 'employer_request', 'internal_notice', 'support_ticket', 'other') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    content_summary TEXT,
    suggested_reply TEXT,
    processing_status ENUM('pending', 'draft_ready', 'replied', 'flagged') DEFAULT 'pending',
    processed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_category (email_category),
    INDEX idx_priority (priority),
    INDEX idx_status (processing_status)
);

-- File 8: database/migrations/008_platform_analytics.sql
CREATE TABLE IF NOT EXISTS platform_analytics (
    analytics_id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,2) NOT NULL,
    metric_type ENUM('count', 'percentage', 'currency', 'rating') DEFAULT 'count',
    period_type ENUM('daily', 'weekly', 'monthly', 'yearly') DEFAULT 'monthly',
    period_value VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    metadata JSON,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metric (metric_name),
    INDEX idx_period (period_type, period_value),
    INDEX idx_category (category)
);

-- File 9: database/migrations/009_sample_data.sql
INSERT IGNORE INTO user_profiles (user_id, email, user_type, full_name, department, role) VALUES
('admin_001', 'admin@kozi.rw', 'admin', 'System Administrator', 'IT', 'Platform Admin'),
('admin_002', 'hr@kozi.rw', 'admin', 'HR Manager', 'Human Resources', 'HR Admin');

INSERT IGNORE INTO payment_schedules (employee_count, total_amount, due_date, payment_period, status) VALUES
(156, 45200000.00, '2024-09-30', 'September 2024', 'pending'),
(143, 42800000.00, '2024-10-31', 'October 2024', 'pending');

INSERT IGNORE INTO platform_employees (user_id, email, full_name, location, department, position, employment_status) VALUES
('emp_001', 'john@kozi.rw', 'John Uwimana', 'Kigali', 'Engineering', 'Software Developer', 'active'),
('emp_002', 'mary@kozi.rw', 'Mary Mukamana', 'Huye', 'Marketing', 'Marketing Specialist', 'active'),
('emp_003', 'david@kozi.rw', 'David Nshimiyimana', 'Musanze', 'Sales', 'Sales Representative', 'active');

INSERT IGNORE INTO platform_employers (company_name, email, location, industry, verification_status, job_postings_count) VALUES
('Tech Rwanda Ltd', 'hr@techrwanda.com', 'Kigali', 'Technology', 'verified', 5),
('Health Solutions', 'contact@healthsolutions.rw', 'Kigali', 'Healthcare', 'pending', 2),
('Edu Connect', 'info@educonnect.rw', 'Huye', 'Education', 'verified', 3);

INSERT IGNORE INTO platform_analytics (metric_name, metric_value, metric_type, period_type, period_value, category) VALUES
('total_active_users', 2847, 'count', 'monthly', '2024-09', 'users'),
('job_applications', 1234, 'count', 'monthly', '2024-09', 'applications'),
('successful_hires', 34, 'count', 'monthly', '2024-09', 'hiring'),
('user_growth_rate', 12.5, 'percentage', 'monthly', '2024-09', 'growth'),
('employer_satisfaction', 4.2, 'rating', 'monthly', '2024-09', 'satisfaction');