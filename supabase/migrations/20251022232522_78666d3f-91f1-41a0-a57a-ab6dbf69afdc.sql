-- Habilitar realtime para a tabela expenses
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Adicionar expenses à publicação de realtime (se não estiver já)
-- A publicação supabase_realtime já existe por padrão no Supabase
DO $$
BEGIN
  -- Verificar se a tabela já está na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
END $$;