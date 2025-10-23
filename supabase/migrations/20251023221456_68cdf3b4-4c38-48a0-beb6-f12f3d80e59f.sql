-- Criar tabela accounts (contas/carteiras/cartões)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wallet', 'checking', 'savings', 'credit_card', 'debit_card', 'investment')),
  last4 TEXT,
  initial_balance NUMERIC(14,2) DEFAULT 0,
  icon TEXT DEFAULT '💳',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_active ON public.accounts(user_id, is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts" 
ON public.accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" 
ON public.accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER set_accounts_updated_at 
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Adicionar account_id em expenses (nullable para retrocompatibilidade)
ALTER TABLE public.expenses ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
CREATE INDEX idx_expenses_account ON public.expenses(account_id);

-- Função para criar contas padrão para novos usuários
CREATE OR REPLACE FUNCTION public.create_default_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar 2 contas padrão
  INSERT INTO public.accounts (user_id, name, type, icon, color) VALUES
    (NEW.id, 'Dinheiro', 'wallet', '💵', '#10b981'),
    (NEW.id, 'Conta Corrente', 'checking', '🏦', '#3b82f6');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar contas ao criar usuário
CREATE TRIGGER create_default_accounts_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_default_accounts();