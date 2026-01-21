-- Create import_sessions table
CREATE TABLE public.import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'ofx', 'pdf')),
  file_hash TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_transactions INTEGER DEFAULT 0,
  imported_transactions INTEGER DEFAULT 0,
  skipped_duplicates INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create import_mappings table
CREATE TABLE public.import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bank_name)
);

-- Add import_session_id to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS import_session_id UUID REFERENCES public.import_sessions(id) ON DELETE SET NULL;

-- Enable RLS on import_sessions
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_sessions
CREATE POLICY "Users can view their own import sessions"
ON public.import_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import sessions"
ON public.import_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import sessions"
ON public.import_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import sessions"
ON public.import_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on import_mappings
ALTER TABLE public.import_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_mappings
CREATE POLICY "Users can view their own import mappings"
ON public.import_mappings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import mappings"
ON public.import_mappings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import mappings"
ON public.import_mappings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import mappings"
ON public.import_mappings FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on import_mappings
CREATE TRIGGER update_import_mappings_updated_at
BEFORE UPDATE ON public.import_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_import_sessions_user_id ON public.import_sessions(user_id);
CREATE INDEX idx_import_mappings_user_id ON public.import_mappings(user_id);
CREATE INDEX idx_expenses_import_session_id ON public.expenses(import_session_id) WHERE import_session_id IS NOT NULL;