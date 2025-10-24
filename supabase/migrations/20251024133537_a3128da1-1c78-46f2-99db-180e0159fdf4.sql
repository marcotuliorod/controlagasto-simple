-- Add database indexes for performance optimization
-- Sprint 6: Performance improvements

-- Index for expenses queries by user and date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_expenses_user_date 
ON expenses (user_id, date DESC)
WHERE user_id IS NOT NULL;

-- Index for category goals queries by user and month
CREATE INDEX IF NOT EXISTS idx_category_goals_user_month 
ON category_goals (user_id, month)
WHERE user_id IS NOT NULL;

-- Index for audit logs by user and timestamp (for audit log viewing)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp 
ON audit_logs (user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Index for notifications by user and read status (for unread notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications (user_id, read, created_at DESC)
WHERE user_id IS NOT NULL;

-- Index for expenses by category (for category-based reports)
CREATE INDEX IF NOT EXISTS idx_expenses_category 
ON expenses (category_id, date DESC)
WHERE category_id IS NOT NULL;

-- Index for expenses by account (for account-based reports)
CREATE INDEX IF NOT EXISTS idx_expenses_account 
ON expenses (account_id, date DESC)
WHERE account_id IS NOT NULL;

-- Composite index for expenses filtering (category + payment method)
CREATE INDEX IF NOT EXISTS idx_expenses_filters 
ON expenses (user_id, category_id, payment_method, date DESC)
WHERE user_id IS NOT NULL;

-- Index for chat messages by conversation (for chat history)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
ON chat_messages (conversation_id, created_at DESC)
WHERE conversation_id IS NOT NULL;