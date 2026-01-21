-- =========================================
-- GAMIFICATION: Progressive Menu Unlock System
-- =========================================

-- 1. Add gamification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS bypass_unlock_requirements BOOLEAN DEFAULT false;

-- 2. Create unlock_requirements table
CREATE TABLE public.unlock_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_key TEXT UNIQUE NOT NULL,
  unlock_level INTEGER NOT NULL DEFAULT 1,
  required_educational_category TEXT,
  required_educational_count INTEGER,
  required_quiz_category TEXT,
  required_quiz_score INTEGER,
  required_days_active INTEGER,
  required_expense_count INTEGER,
  unlock_message TEXT,
  unlock_celebration TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unlock_requirements ENABLE ROW LEVEL SECURITY;

-- Everyone can read unlock requirements (public data)
CREATE POLICY "Anyone can view unlock requirements"
  ON public.unlock_requirements
  FOR SELECT
  USING (true);

-- 3. Create user_unlocks table
CREATE TABLE public.user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  menu_item_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  unlock_method TEXT,
  unlock_details JSONB DEFAULT '{}',
  UNIQUE(user_id, menu_item_key)
);

CREATE INDEX idx_user_unlocks_user ON public.user_unlocks(user_id);

-- Enable RLS
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocks"
  ON public.user_unlocks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocks"
  ON public.user_unlocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  rarity TEXT DEFAULT 'common',
  unlock_condition JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON public.achievements
  FOR SELECT
  USING (true);

-- 5. Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =========================================
-- SEED DATA: Unlock Requirements
-- =========================================

INSERT INTO public.unlock_requirements (menu_item_key, unlock_level, required_educational_category, required_educational_count, required_quiz_category, required_quiz_score, required_expense_count, unlock_message, unlock_celebration) VALUES
-- Level 1: Always unlocked (no entry needed, handled by code)

-- Level 2: Budget & Planning
('reports', 2, 'orcamento', 2, NULL, NULL, NULL, 'Complete 2 artigos sobre "Orçamento" para desbloquear', '🎉 Relatórios desbloqueados! Agora você pode analisar seus gastos.'),
('financial-health', 2, 'investimentos', 1, NULL, NULL, NULL, 'Complete 1 artigo sobre "Investimentos" para desbloquear', '🎉 Saúde Financeira desbloqueada!'),

-- Level 3: Multi-Account & Advanced Tracking
('accounts', 3, 'poupanca', 1, NULL, NULL, 5, 'Complete 1 artigo sobre "Poupança" ou registre 5 despesas', '🎉 Contas desbloqueadas! Organize suas finanças.'),
('recurring-expenses', 3, NULL, NULL, 'orcamento', 60, NULL, 'Alcance 60% no Quiz de Orçamento para desbloquear', '🎉 Despesas Recorrentes desbloqueadas!'),

-- Level 4: Analysis & Insights
('chat', 4, 'investimentos', 2, NULL, NULL, 10, 'Complete 2 artigos de "Investimentos" e registre 10 despesas', '🎉 Chat IA desbloqueado! Converse sobre finanças.'),
('simulator', 4, 'investimentos', 3, 'investimentos', 70, NULL, 'Complete 3 artigos sobre "Investimentos" ou 70% no Quiz', '🎉 Simulador desbloqueado! Projete seu futuro.'),

-- Level 5: Automation & Export
('scheduled-exports', 5, NULL, NULL, NULL, NULL, 20, 'Registre pelo menos 20 despesas para desbloquear', '🎉 Exportações Agendadas desbloqueadas!'),
('import-transactions', 5, 'orcamento', 3, 'orcamento', 70, NULL, 'Complete 3 artigos de Orçamento ou 70% no Quiz', '🎉 Importação de Extrato desbloqueada!'),
('audit-logs', 5, NULL, NULL, NULL, NULL, 30, 'Registre 30 despesas para acessar o histórico de auditoria', '🎉 Audit Logs desbloqueados!');

-- =========================================
-- SEED DATA: Achievements
-- =========================================

INSERT INTO public.achievements (key, name, description, icon, rarity, unlock_condition) VALUES
('first-steps', 'Primeiros Passos', 'Desbloqueou sua primeira funcionalidade', '🎯', 'common', '{"type": "unlock_count", "count": 1}'),
('student', 'Estudante', 'Completou 5 artigos educacionais', '📚', 'common', '{"type": "education_count", "count": 5}'),
('scholar', 'Especialista', 'Alcançou 100% em algum quiz', '🧠', 'rare', '{"type": "quiz_perfect_score"}'),
('power-user', 'Power User', 'Desbloqueou todas as funcionalidades', '🚀', 'legendary', '{"type": "unlock_all"}'),
('expense-tracker', 'Rastreador', 'Registrou 50 despesas', '💸', 'common', '{"type": "expense_count", "count": 50}'),
('budget-master', 'Mestre do Orçamento', 'Usou o app por 30 dias', '💰', 'epic', '{"type": "days_active", "days": 30}'),
('quiz-champion', 'Campeão de Quiz', 'Completou 10 quizzes', '🏆', 'rare', '{"type": "quiz_count", "count": 10}'),
('learner', 'Aprendiz', 'Completou 10 artigos educacionais', '🎓', 'rare', '{"type": "education_count", "count": 10}');