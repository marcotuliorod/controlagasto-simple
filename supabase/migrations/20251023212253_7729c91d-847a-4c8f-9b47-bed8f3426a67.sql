-- Adicionar índices compostos para melhorar performance de queries

-- Índice composto para expenses (user_id, date) - otimiza queries de período
CREATE INDEX IF NOT EXISTS idx_expenses_user_date 
ON public.expenses(user_id, date DESC);

-- Índice para monthly_goals (user_id, month) - otimiza busca de metas
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_month 
ON public.monthly_goals(user_id, month);

-- Índice para notifications (user_id, read, created_at) - otimiza busca de notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON public.notifications(user_id, read, created_at DESC);

-- Índice para chat_messages (conversation_id, created_at) - otimiza busca de mensagens
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
ON public.chat_messages(conversation_id, created_at);

-- Índice para category_goals (user_id, month) - otimiza busca de metas por categoria
CREATE INDEX IF NOT EXISTS idx_category_goals_user_month 
ON public.category_goals(user_id, month);