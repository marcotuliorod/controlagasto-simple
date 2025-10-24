-- Fix audit log error during signup by passing user_id explicitly to triggers

-- 1. Update create_audit_log function to accept optional p_user_id parameter
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use p_user_id if provided, otherwise fallback to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- If still NULL, skip creating audit log
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity,
    entity_id,
    before_data,
    after_data
  ) VALUES (
    v_user_id,
    p_action,
    p_entity,
    p_entity_id,
    p_before_data,
    p_after_data
  );
END;
$$;

-- 2. Update audit_accounts trigger to pass user_id explicitly
CREATE OR REPLACE FUNCTION public.audit_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'CREATE',
      'account',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'account',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'account',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      OLD.user_id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Update audit_expenses trigger to pass user_id explicitly
CREATE OR REPLACE FUNCTION public.audit_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'CREATE',
      'expense',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'expense',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'expense',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      OLD.user_id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Update audit_categories trigger to pass user_id explicitly
CREATE OR REPLACE FUNCTION public.audit_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'CREATE',
      'category',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'category',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'category',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      OLD.user_id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 5. Update audit_category_goals trigger to pass user_id explicitly
CREATE OR REPLACE FUNCTION public.audit_category_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'CREATE',
      'goal',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'goal',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'goal',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      OLD.user_id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;