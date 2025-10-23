-- Migration v5.1.0: Fix Function Search Path Mutable
-- This migration corrects the search_path for sum_expenses_in_month function
-- to prevent security warnings and ensure proper schema isolation

-- Drop the existing function
DROP FUNCTION IF EXISTS public.sum_expenses_in_month(uuid, text);

-- Recreate with fixed search_path
CREATE OR REPLACE FUNCTION public.sum_expenses_in_month(p_user_id uuid, p_month text)
RETURNS TABLE(sum numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM expenses
  WHERE user_id = p_user_id
    AND to_char(date, 'YYYY-MM') = p_month;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sum_expenses_in_month(uuid, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.sum_expenses_in_month IS 
'Calcula soma de despesas de um usuário em um mês específico (YYYY-MM). 
SECURITY DEFINER com search_path fixo para prevenir vulnerabilidades de path injection.
Retorna 0 se não houver despesas no período.';