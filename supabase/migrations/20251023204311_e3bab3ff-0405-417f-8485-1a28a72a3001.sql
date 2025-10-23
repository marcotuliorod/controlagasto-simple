-- Create financial_health_scores table
CREATE TABLE public.financial_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  budget_adherence_score INTEGER NOT NULL DEFAULT 0,
  quiz_performance_score INTEGER NOT NULL DEFAULT 0,
  consistency_score INTEGER NOT NULL DEFAULT 0,
  savings_score INTEGER NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.financial_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scores"
ON public.financial_health_scores
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores"
ON public.financial_health_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores"
ON public.financial_health_scores
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_financial_health_scores_user_month 
ON public.financial_health_scores(user_id, month DESC);

-- Create function to calculate financial health score
CREATE OR REPLACE FUNCTION public.calculate_financial_health_score(
  p_user_id UUID,
  p_month TEXT
)
RETURNS TABLE(
  total_score INTEGER,
  budget_score INTEGER,
  quiz_score INTEGER,
  consistency_score INTEGER,
  savings_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_expenses NUMERIC;
  v_monthly_goal NUMERIC;
  v_budget_adherence INTEGER := 0;
  v_quiz_performance INTEGER := 0;
  v_consistency INTEGER := 0;
  v_savings INTEGER := 0;
  v_total INTEGER := 0;
  v_expense_count INTEGER;
  v_quiz_correct_count INTEGER;
  v_quiz_total_count INTEGER;
BEGIN
  -- Calculate budget adherence (40 points max)
  SELECT COALESCE(SUM(e.amount), 0), COALESCE(mg.total_limit, 0)
  INTO v_total_expenses, v_monthly_goal
  FROM expenses e
  LEFT JOIN monthly_goals mg ON mg.user_id = e.user_id AND mg.month = p_month
  WHERE e.user_id = p_user_id 
    AND to_char(e.date, 'YYYY-MM') = p_month
  GROUP BY mg.total_limit;

  IF v_monthly_goal > 0 THEN
    IF v_total_expenses <= v_monthly_goal THEN
      v_budget_adherence := 40;
    ELSIF v_total_expenses <= v_monthly_goal * 1.1 THEN
      v_budget_adherence := 30;
    ELSIF v_total_expenses <= v_monthly_goal * 1.2 THEN
      v_budget_adherence := 20;
    ELSIF v_total_expenses <= v_monthly_goal * 1.3 THEN
      v_budget_adherence := 10;
    ELSE
      v_budget_adherence := 0;
    END IF;
  END IF;

  -- Calculate quiz performance (20 points max)
  SELECT 
    COUNT(*) FILTER (WHERE is_correct = true),
    COUNT(*)
  INTO v_quiz_correct_count, v_quiz_total_count
  FROM quiz_responses
  WHERE user_id = p_user_id;

  IF v_quiz_total_count > 0 THEN
    v_quiz_performance := LEAST(20, ROUND((v_quiz_correct_count::NUMERIC / v_quiz_total_count) * 20));
  END IF;

  -- Calculate consistency (20 points max)
  SELECT COUNT(DISTINCT DATE_TRUNC('day', date))
  INTO v_expense_count
  FROM expenses
  WHERE user_id = p_user_id
    AND to_char(date, 'YYYY-MM') = p_month;

  IF v_expense_count >= 20 THEN
    v_consistency := 20;
  ELSIF v_expense_count >= 15 THEN
    v_consistency := 15;
  ELSIF v_expense_count >= 10 THEN
    v_consistency := 10;
  ELSIF v_expense_count >= 5 THEN
    v_consistency := 5;
  END IF;

  -- Calculate savings potential (20 points max)
  IF v_monthly_goal > 0 AND v_total_expenses < v_monthly_goal THEN
    v_savings := LEAST(20, ROUND(((v_monthly_goal - v_total_expenses) / v_monthly_goal) * 20));
  END IF;

  -- Calculate total
  v_total := v_budget_adherence + v_quiz_performance + v_consistency + v_savings;

  RETURN QUERY SELECT v_total, v_budget_adherence, v_quiz_performance, v_consistency, v_savings;
END;
$$;