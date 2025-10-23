-- Criar tabela audit_logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity TEXT NOT NULL CHECK (entity IN ('expense', 'category', 'account', 'goal')),
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_audit_user_entity ON public.audit_logs(user_id, entity, created_at DESC);
CREATE INDEX idx_audit_entity_id ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created_at ON public.audit_logs(created_at DESC);

-- RLS policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Função para criar audit log
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity,
    entity_id,
    before_data,
    after_data
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity,
    p_entity_id,
    p_before_data,
    p_after_data
  );
END;
$$;

-- Trigger para expenses
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
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'expense',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'expense',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER expenses_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.audit_expenses();

-- Trigger para categories
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
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'category',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'category',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER categories_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.audit_categories();

-- Trigger para accounts
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
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'account',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'account',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER accounts_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.audit_accounts();

-- Trigger para category_goals
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
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE',
      'goal',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE',
      'goal',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER category_goals_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.category_goals
FOR EACH ROW EXECUTE FUNCTION public.audit_category_goals();