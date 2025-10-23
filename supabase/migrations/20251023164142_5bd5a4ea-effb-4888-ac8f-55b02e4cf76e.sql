-- Migration v5.2.0: Profile & Goals Management
-- Create RPC for batch upsert of monthly goals and ensure unique constraint

-- Create unique index for monthly_goals (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_monthly_goals_user_month 
ON public.monthly_goals (user_id, month);

-- Create RPC function for batch upsert of monthly goals
CREATE OR REPLACE FUNCTION public.upsert_monthly_goals(
  p_user_id uuid, 
  p_months text[], 
  p_limit numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  month_str text;
BEGIN
  -- Validate that the user_id matches the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot upsert goals for other users';
  END IF;

  -- Upsert each month
  FOREACH month_str IN ARRAY p_months LOOP
    INSERT INTO public.monthly_goals (user_id, month, total_limit)
    VALUES (p_user_id, month_str, p_limit)
    ON CONFLICT (user_id, month) 
    DO UPDATE SET total_limit = EXCLUDED.total_limit;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_monthly_goals(uuid, text[], numeric) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.upsert_monthly_goals IS 
'Batch upsert function for monthly goals. Inserts or updates multiple months at once.
SECURITY DEFINER with fixed search_path and auth validation.';