-- Adicionar coluna ref_month em notifications se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'ref_month'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN ref_month TEXT;
  END IF;
END $$;

-- Criar índice único para evitar notificações duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_goal_80 
ON public.notifications(user_id, type, ref_month) 
WHERE type = 'GOAL_80';

-- Criar função para somar despesas de um mês
CREATE OR REPLACE FUNCTION public.sum_expenses_in_month(p_user_id uuid, p_month text)
RETURNS TABLE (sum numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM expenses
  WHERE user_id = p_user_id
    AND to_char(date, 'YYYY-MM') = p_month
$$;