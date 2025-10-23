-- Fase 1: Adicionar suporte a ciclo de faturamento personalizado

-- 1.1 Adicionar coluna billing_cycle_day à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN billing_cycle_day integer DEFAULT 1 
CHECK (billing_cycle_day BETWEEN 1 AND 28);

COMMENT ON COLUMN public.profiles.billing_cycle_day IS 
'Dia do mês em que o ciclo de faturamento do usuário começa (1-28). Default 1 = início do mês.';

-- 1.2 Criar função para calcular período de faturamento baseado no ciclo do usuário
CREATE OR REPLACE FUNCTION public.get_billing_period(
  p_user_id uuid, 
  p_reference_date date
) 
RETURNS TABLE(start_date date, end_date date) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_cycle_day integer;
  v_start_date date;
  v_end_date date;
  v_ref_day integer;
BEGIN
  -- Buscar dia do ciclo do usuário (default 1)
  SELECT COALESCE(billing_cycle_day, 1) 
  INTO v_cycle_day 
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Se não encontrou usuário, usar dia 1
  IF v_cycle_day IS NULL THEN
    v_cycle_day := 1;
  END IF;
  
  -- Extrair dia da data de referência
  v_ref_day := EXTRACT(DAY FROM p_reference_date)::integer;
  
  -- Calcular início do período
  IF v_ref_day >= v_cycle_day THEN
    -- Estamos após o dia do ciclo, então o ciclo começou neste mês
    v_start_date := date_trunc('month', p_reference_date)::date + (v_cycle_day - 1);
  ELSE
    -- Estamos antes do dia do ciclo, então o ciclo começou no mês anterior
    v_start_date := (date_trunc('month', p_reference_date) - interval '1 month')::date + (v_cycle_day - 1);
  END IF;
  
  -- Calcular fim do período (mesmo dia do próximo mês)
  v_end_date := (v_start_date + interval '1 month')::date;
  
  RETURN QUERY SELECT v_start_date, v_end_date;
END;
$$;

COMMENT ON FUNCTION public.get_billing_period(uuid, date) IS 
'Calcula o período de faturamento (start_date, end_date) para um usuário baseado no seu billing_cycle_day configurado.';